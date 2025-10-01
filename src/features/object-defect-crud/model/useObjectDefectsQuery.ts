import { useQuery } from '@tanstack/vue-query'
import { fetchObjectDefectsSnapshot } from '@entities/object-defect'

export function useObjectDefectsQuery() {
  return useQuery({ queryKey: ['object-defects'], queryFn: fetchObjectDefectsSnapshot })
}
