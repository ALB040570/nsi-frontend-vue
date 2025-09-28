/** Файл: features/object-type-crud/model/useObjectTypesQuery.ts
 *  Назначение: хук загрузки списка типов обслуживаемых объектов поверх репозитория.
 *  Использование: вызывайте useObjectTypesQuery() на странице для получения данных и состояния запроса.
 */
import { useQuery } from '@tanstack/vue-query'
import { listObjectTypes } from '@entities/object-type/api/repository'

export function useObjectTypesQuery() {
  return useQuery({ queryKey: ['object-types'], queryFn: listObjectTypes })
}
