import { get } from '@shared/api/httpClient'
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

export async function searchNsi(query: string) {
  return get<NsiSearchResult[]>('/nsi/search', { params: { q: query } })
}
