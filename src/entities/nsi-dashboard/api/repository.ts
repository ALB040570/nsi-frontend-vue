import { get } from '@shared/api/httpClient'
import { rpc } from '@shared/api'
import { extractRecords, normalizeText, toOptionalString } from '@shared/lib'
import { fetchSources } from '@entities/source'
import { fetchObjectTypesSnapshot } from '@entities/object-type'
import { fetchComponentsSnapshot } from '@entities/component'
import { fetchObjectParametersSnapshot } from '@entities/object-parameter'
import { fetchObjectDefectsSnapshot } from '@entities/object-defect'
import {
  normalizeActivityResponse,
  normalizeCoverageResponse,
  normalizeDiagnosticsResponse,
  normalizeRelationsResponse,
} from '../model/normalize'
import type {
  ActivityResponse,
  DiagnosticsResponse,
  NsiCoverage,
  NsiCoverageResponse,
  NsiSearchResult,
  RelationsCounts,
  RelationsCountsResponse,
} from '../model/types'

export async function fetchNsiCoverage() {
  const response = await get<NsiCoverageResponse | NsiCoverage>('/nsi/dashboard/coverage')
  return normalizeCoverageResponse(response)
}

export async function fetchNsiDiagnostics() {
  const response = await get<DiagnosticsResponse | DiagnosticsResponse['items']>(
    '/nsi/dashboard/diagnostics',
  )
  return normalizeDiagnosticsResponse(response)
}

export async function fetchNsiActivity(limit = 7) {
  const response = await get<ActivityResponse | ActivityResponse['items']>('/nsi/dashboard/activity', {
    params: { limit },
  })
  return normalizeActivityResponse(response)
}

export async function fetchNsiRelationsCounts() {
  const response = await get<RelationsCountsResponse | RelationsCounts>(
    '/nsi/dashboard/relations-counts',
  )
  return normalizeRelationsResponse(response)
}

// Fallback search across existing NSI repositories, when /nsi/search is unavailable
async function aggregateNsiSearch(query: string): Promise<NsiSearchResult[]> {
  const q = normalizeText(query)
  if (!q) return []

  type RawWorkRecord = { obj?: number | string | null; name?: string | null; fullName?: string | null }

  const tasks = await Promise.allSettled([
    // sources
    (async () => {
      const list = await fetchSources().catch(() => [])
      return list
        .filter((s) => {
          const hay = [s.name, s.DocumentNumber, s.DocumentAuthor, s.DocumentStartDate, s.DocumentEndDate]
            .map((v) => normalizeText((v as string | null) ?? ''))
          return hay.some((v) => v && v.includes(q))
        })
        .slice(0, 20)
        .map<NsiSearchResult>((s) => ({
          id: String(s.id),
          title: s.name,
          extra: s.DocumentNumber || undefined,
          type: 'sources',
        }))
    })(),
    // object types
    (async () => {
      const snap = await fetchObjectTypesSnapshot().catch(() => ({ items: [] as Array<{ id: string; name: string; geometry?: string | null }> }))
      return snap.items
        .filter((t) => normalizeText(t.name).includes(q))
        .slice(0, 20)
        .map<NsiSearchResult>((t) => ({
          id: t.id,
          title: t.name,
          extra: (t as { geometry?: string | null }).geometry ?? undefined,
          type: 'types',
        }))
    })(),
    // components
    (async () => {
      const snap = await fetchComponentsSnapshot().catch(() => ({ items: [] as Array<{ id: string; name: string }> }))
      return snap.items
        .filter((c) => normalizeText(c.name).includes(q))
        .slice(0, 20)
        .map<NsiSearchResult>((c) => ({ id: c.id, title: c.name, type: 'components' }))
    })(),
    // parameters
    (async () => {
      const snap = await fetchObjectParametersSnapshot().catch(() => ({ items: [] as Array<{ id: string; name: string; code?: string | null; unitName?: string | null; componentName?: string | null }> }))
      return snap.items
        .filter((p) => {
          const hay = [p.name, p.code, p.unitName, p.componentName].map((v) => normalizeText((v as string | null) ?? ''))
          return hay.some((v) => v && v.includes(q))
        })
        .slice(0, 20)
        .map<NsiSearchResult>((p) => ({
          id: p.id,
          title: p.name,
          extra: p.code ?? p.unitName ?? p.componentName ?? undefined,
          type: 'params',
        }))
    })(),
    // defects
    (async () => {
      const snap = await fetchObjectDefectsSnapshot().catch(() => ({ items: [] as Array<{ id: string; name: string; index?: string | null; categoryName?: string | null; componentName?: string | null }> }))
      return snap.items
        .filter((d) => {
          const hay = [d.name, d.index, d.categoryName, d.componentName].map((v) => normalizeText((v as string | null) ?? ''))
          return hay.some((v) => v && v.includes(q))
        })
        .slice(0, 20)
        .map<NsiSearchResult>((d) => ({
          id: d.id,
          title: d.name,
          extra: d.categoryName ?? d.index ?? d.componentName ?? undefined,
          type: 'defects',
        }))
    })(),
    // works
    (async () => {
      try {
        const payload = await rpc('data/loadProcessCharts', [0])
        const records = extractRecords<RawWorkRecord>(payload)
        return records
          .map((r) => ({ id: toOptionalString(r.obj), name: toOptionalString(r.name), fullName: toOptionalString(r.fullName) }))
          .filter((r) => r.id && (normalizeText(r.name).includes(q) || normalizeText(r.fullName).includes(q)))
          .slice(0, 20)
          .map<NsiSearchResult>((r) => ({ id: r.id as string, title: (r.name || r.fullName || r.id) as string, extra: r.fullName ?? undefined, type: 'works' }))
      } catch {
        return [] as NsiSearchResult[]
      }
    })(),
  ])

  const merged: NsiSearchResult[] = []
  for (const t of tasks) {
    if (t.status === 'fulfilled') merged.push(...t.value)
  }

  // Limit total results for dropdown responsiveness
  return merged.slice(0, 50)
}

export async function searchNsi(query: string) {
  try {
    const resp = await get<unknown>('/nsi/search', { params: { q: query } })
    // Validate server response; fallback if HTML/text or unexpected shape
    if (typeof resp === 'string') {
      if (import.meta.env.DEV) console.debug('[nsi-search] invalid HTML response, using fallback')
      return aggregateNsiSearch(query)
    }
    if (Array.isArray(resp)) {
      return resp as NsiSearchResult[]
    }
    if (resp && typeof resp === 'object') {
      const obj = resp as Record<string, unknown>
      const candidates =
        (Array.isArray(obj.items) && (obj.items as unknown[])) ||
        (Array.isArray(obj.records) && (obj.records as unknown[])) ||
        (Array.isArray(obj.data) && (obj.data as unknown[])) ||
        (obj.result &&
          ((Array.isArray(obj.result)
            ? (obj.result as unknown[])
            : Array.isArray((obj.result as { items?: unknown[] }).items)
              ? (((obj.result as { items?: unknown[] }).items as unknown[]))
              : null))) ||
        (obj.payload && Array.isArray((obj.payload as { items?: unknown[] }).items)
          ? (((obj.payload as { items?: unknown[] }).items as unknown[]))
          : null)

      if (Array.isArray(candidates)) {
        return candidates as NsiSearchResult[]
      }
    }
    if (import.meta.env.DEV) console.debug('[nsi-search] unexpected payload shape, using fallback')
    return aggregateNsiSearch(query)
  } catch (error) {
    if (import.meta.env.DEV) console.debug('[nsi-search] request failed, using fallback', error)
    // Fallback to client-side aggregation
    return aggregateNsiSearch(query)
  }
}
