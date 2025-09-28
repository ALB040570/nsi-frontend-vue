/** Файл: src/composables/useCrud.ts
 *  Назначение: универсальные CRUD-хуки поверх REST-интерфейсов.
 *  Использование: создавайте экземпляр с ключом и базовым путем, чтобы получить list/create/update/remove.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { get, post, put, del } from '@shared/api/httpClient'

type ID = string | number

export interface CrudOptions<TList = any, TItem = any> {
  // уникальный ключ для кэша и корневой путь API
  key: string[] // например ['object-types']
  basePath: string // например '/object-types'
  // опциональные мапперы (если сервер/мок возвращают разные формы)
  mapList?: (data: any) => TList[]
  mapItem?: (data: any) => TItem
}

export function useCrud<TList = any, TItem = any>(opts: CrudOptions<TList, TItem>) {
  const qc = useQueryClient()
  const list = useQuery({
    queryKey: opts.key,
    queryFn: async () => {
      const data = await get<unknown>(opts.basePath)
      return (opts.mapList ? opts.mapList(data) : data) as TList[]
    },
  })

  const create = useMutation({
    mutationFn: async (payload: Partial<TItem>) => post(opts.basePath, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: opts.key }),
  })

  const update = useMutation({
    mutationFn: async ({ id, payload }: { id: ID; payload: Partial<TItem> }) =>
      put(`${opts.basePath}/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: opts.key }),
  })

  const remove = useMutation({
    mutationFn: async (id: ID) => del(`${opts.basePath}/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: opts.key }),
  })

  return { list, create, update, remove }
}
