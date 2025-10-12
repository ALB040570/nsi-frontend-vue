import type {
  ActivityResponse,
  DiagnosticsResponse,
  NsiCoverage,
  NsiCoverageResponse,
  RelationsCounts,
  RelationsCountsResponse,
} from './types'

export function normalizeCoverageResponse(input: NsiCoverageResponse | NsiCoverage): NsiCoverageResponse {
  return { ...input, partial: 'partial' in input ? input.partial ?? undefined : undefined }
}

export function normalizeDiagnosticsResponse(
  input: DiagnosticsResponse | DiagnosticsResponse['items'],
): DiagnosticsResponse {
  if (Array.isArray(input)) {
    return { items: input }
  }
  return { items: input.items ?? [], partial: input.partial ?? undefined }
}

export function normalizeActivityResponse(input: ActivityResponse | ActivityResponse['items']): ActivityResponse {
  if (Array.isArray(input)) {
    return { items: input }
  }
  return { items: input.items ?? [], partial: input.partial ?? undefined }
}

export function normalizeRelationsResponse(
  input: RelationsCountsResponse | RelationsCounts,
): RelationsCountsResponse {
  return { ...input, partial: 'partial' in input ? input.partial ?? undefined : undefined }
}
