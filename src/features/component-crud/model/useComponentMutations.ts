/** Файл: src/features/component-crud/model/useComponentMutations.ts
 *  Назначение: содержит мутации vue-query для CRUD операций с компонентами.
 *  Использование: подключайте хук на страницах для вызова create/update/delete.
 */
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import {
  createComponentEntry,
  updateComponentEntry,
  deleteComponentEntry,
  type CreateComponentPayload,
  type UpdateComponentPayload,
  type LoadedComponentWithRelations,
  type ComponentsSnapshot,
} from '@entities/component'

export function useComponentMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['components'] })

  const create = useMutation({
    mutationFn: (payload: CreateComponentPayload) => createComponentEntry(payload),
    onSuccess: (created: LoadedComponentWithRelations) => {
      const prev = qc.getQueryData<ComponentsSnapshot>(['components'])
      if (prev) {
        const items = [created, ...prev.items]
        qc.setQueryData<ComponentsSnapshot>(['components'], {
          ...prev,
          items: items.sort((a, b) => a.name.localeCompare(b.name, 'ru')),
        })
      } else {
        invalidate()
      }
    },
  })

  const update = useMutation({
    mutationFn: (payload: UpdateComponentPayload) => updateComponentEntry(payload),
    onSuccess: () => invalidate(),
  })

  const remove = useMutation({
    mutationFn: (id: number | string) => deleteComponentEntry(id),
    onSuccess: () => invalidate(),
  })

  return { create, update, remove }
}
