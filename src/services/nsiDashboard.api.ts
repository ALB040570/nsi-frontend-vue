import { get } from '@shared/api'

export interface NsiCoverage {
  sources: { total: number; withIssuerDateExec: number }
  types: { total: number; withShape: number; withComponents: number }
  components: { total: number; withParams: number; withDefects: number }
  params: { total: number; withUnitsAndBounds: number }
  defects: { total: number; withCategoryAndComponent: number }
  works: { total: number; withTypePeriodSource: number }
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

export type NsiSearchResultType = DiagnosticItem['target']

export interface NsiSearchResult {
  id: string
  title: string
  extra?: string | null
  type: NsiSearchResultType
}

export async function fetchNsiCoverage() {
  return get<NsiCoverage>('/nsi/dashboard/coverage')
}

export async function fetchNsiDiagnostics() {
  return get<DiagnosticItem[]>('/nsi/dashboard/diagnostics')
}

export async function fetchNsiActivity(limit = 7) {
  return get<ActivityItem[]>('/nsi/dashboard/activity', { params: { limit } })
}

export async function fetchNsiRelationsCounts() {
  return get<RelationsCounts>('/nsi/dashboard/relations-counts')
}

export async function searchNsi(query: string) {
  return get<NsiSearchResult[]>('/nsi/search', { params: { q: query } })
}
