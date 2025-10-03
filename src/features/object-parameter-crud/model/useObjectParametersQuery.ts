/** Файл: src/features/object-parameter-crud/model/useObjectParametersQuery.ts
 *  Назначение: vue-query запрос для загрузки и подготовки справочника параметров обслуживаемых объектов.
 *  Использование: подключайте хук на страницах/в виджетах, чтобы получать снапшот и лукапы директорий.
 */
import { useQuery } from '@tanstack/vue-query'
import { fetchObjectParametersSnapshot } from '@entities/object-parameter'
import type { ObjectParametersSnapshot } from '@entities/object-parameter'
import {
  createDirectoryLookup,
  sortByNameRu,
  sortParameters,
  type DirectoryLookup,
} from './directories'

type UnitOption = ObjectParametersSnapshot['unitOptions'][number]
type GroupOption = ObjectParametersSnapshot['groupOptions'][number]

export interface ObjectParametersQueryData extends ObjectParametersSnapshot {
  unitLookup: DirectoryLookup<UnitOption>
  groupLookup: DirectoryLookup<GroupOption>
}

export function useObjectParametersQuery() {
  return useQuery({
    queryKey: ['object-parameters'],
    queryFn: fetchObjectParametersSnapshot,
    select: (snapshot): ObjectParametersQueryData => {
      const sortedUnits = sortByNameRu(snapshot.unitOptions)
      const sortedGroups = sortByNameRu(snapshot.groupOptions)

      return {
        ...snapshot,
        items: sortParameters(snapshot.items),
        unitOptions: sortedUnits,
        groupOptions: sortedGroups,
        unitLookup: createDirectoryLookup(sortedUnits),
        groupLookup: createDirectoryLookup(sortedGroups),
      }
    },
  })
}
