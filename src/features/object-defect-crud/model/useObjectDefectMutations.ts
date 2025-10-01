import { useMutation, useQueryClient } from '@tanstack/vue-query'
import {
  createDefect,
  deleteDefect,
  updateDefect,
  type CreateObjectDefectPayload,
  type UpdateObjectDefectPayload,
} from '@entities/object-defect'

export interface RemoveObjectDefectPayload {
  id: string | number
}

export function useObjectDefectMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['object-defects'] })

  const create = useMutation({
    mutationFn: (payload: CreateObjectDefectPayload) => createDefect(payload),
    onSuccess: () => invalidate(),
  })

  const update = useMutation({
    mutationFn: (payload: UpdateObjectDefectPayload) => updateDefect(payload),
    onSuccess: () => invalidate(),
  })

  const remove = useMutation({
    mutationFn: ({ id }: RemoveObjectDefectPayload) => deleteDefect(id),
    onSuccess: () => invalidate(),
  })

  return { create, update, remove }
}
