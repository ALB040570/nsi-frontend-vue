import { get } from '@shared/api'

export interface NsiCoverage {
  sources: { total: number; withIssuerDateExec: number }
  types: { total: number; withShape: number; withComponents: number }
  components: { total: number; withParams: number; withDefects: number }
  params: { total: number; withUnitsAndBounds: number }
  defects: { total: number; withCategoryAndComponent: number }
  works: { total: number; withTypePeriodSource: number }
}

export interface WithPartialFlag {
  partial?: boolean
}

export type DiagnosticSeverity = 'info' | 'warning' | 'critical'

export interface DiagnosticItem {
  code: string
  title: string
  count: number
  severity: DiagnosticSeverity
  linkQuery: Record<string, string>
  target: 'sources' | 'types' | 'components' | 'params' | 'defects' | 'works'
}

export interface ActivityItem {
  id: string
  title: string
  actor: string
  ts: string
  target: 'sources' | 'types' | 'components' | 'params' | 'defects' | 'works'
  targetId: string
}

export interface RelationsCounts {
  sources: number
  types: number
  components: number
  params: number
  defects: number
  works: number
}

export type NsiCoverageResponse = NsiCoverage & WithPartialFlag

export interface DiagnosticsResponse extends WithPartialFlag {
  items: DiagnosticItem[]
}

export interface ActivityResponse extends WithPartialFlag {
  items: ActivityItem[]
}

export type RelationsCountsResponse = RelationsCounts & WithPartialFlag

export type NsiSearchResultType = DiagnosticItem['target']

export interface NsiSearchResult {
  id: string
  title: string
  extra?: string | null
  type: NsiSearchResultType
}

function normalizeCoverageResponse(input: NsiCoverageResponse | NsiCoverage): NsiCoverageResponse {
  return { ...input, partial: 'partial' in input ? input.partial ?? undefined : undefined }
}

function normalizeDiagnosticsResponse(
  input: DiagnosticsResponse | DiagnosticItem[],
): DiagnosticsResponse {
  if (Array.isArray(input)) {
    return { items: input }
  }
  return { items: input.items ?? [], partial: input.partial ?? undefined }
}

function normalizeActivityResponse(input: ActivityResponse | ActivityItem[]): ActivityResponse {
  if (Array.isArray(input)) {
    return { items: input }
  }
  return { items: input.items ?? [], partial: input.partial ?? undefined }
}

function normalizeRelationsResponse(
  input: RelationsCountsResponse | RelationsCounts,
): RelationsCountsResponse {
  return { ...input, partial: 'partial' in input ? input.partial ?? undefined : undefined }
}

export async function fetchNsiCoverage() {
  const response = await get<NsiCoverageResponse | NsiCoverage>('/nsi/dashboard/coverage')
  return normalizeCoverageResponse(response)
}

export async function fetchNsiDiagnostics() {
  const response = await get<DiagnosticsResponse | DiagnosticItem[]>('/nsi/dashboard/diagnostics')
  return normalizeDiagnosticsResponse(response)
}

export async function fetchNsiActivity(limit = 7) {
  const response = await get<ActivityResponse | ActivityItem[]>('/nsi/dashboard/activity', { params: { limit } })
  return normalizeActivityResponse(response)
}

export async function fetchNsiRelationsCounts() {
  const response = await get<RelationsCountsResponse | RelationsCounts>('/nsi/dashboard/relations-counts')
  return normalizeRelationsResponse(response)
}

export async function searchNsi(query: string) {
  return get<NsiSearchResult[]>('/nsi/search', { params: { q: query } })
}
