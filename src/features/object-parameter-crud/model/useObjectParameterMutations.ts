/** Файл: src/features/object-parameter-crud/model/useObjectParameterMutations.ts
 *  Назначение: vue-query мутации создания, обновления и удаления параметров обслуживаемых объектов.
 *  Использование: подключайте хук в формах для выполнения операций и инвалидации кэша справочника.
 */
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import {
  createParameter,
  deleteParameter,
  updateParameter,
  type ObjectParameter,
} from '@entities/object-parameter'

export type CreateObjectParameterPayload = Omit<ObjectParameter, 'id'> & { id?: string }
export type UpdateObjectParameterPayload = ObjectParameter

export interface RemoveObjectParameterPayload {
  id: string
}

export function useObjectParameterMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['object-parameters'] })

  const create = useMutation({
    mutationFn: (payload: CreateObjectParameterPayload) => createParameter(payload),
    onSuccess: () => invalidate(),
  })

  const update = useMutation({
    mutationFn: (payload: UpdateObjectParameterPayload) => updateParameter(payload),
    onSuccess: () => invalidate(),
  })

  const remove = useMutation({
    mutationFn: ({ id }: RemoveObjectParameterPayload) => deleteParameter(id),
    onSuccess: () => invalidate(),
  })

  return { create, update, remove }
}
