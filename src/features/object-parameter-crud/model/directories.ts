/** Файл: src/features/object-parameter-crud/model/directories.ts
 *  Назначение: вспомогательные утилиты для работы с директориями параметров обслуживаемых объектов.
 *  Использование: импортируйте генераторы lookup и сортировок в хуках и компонентах фичи.
 */
import type { LoadedObjectParameter } from '@entities/object-parameter'

export type DirectoryOption = { id: string; name: string }

export type DirectoryLookup<Option extends DirectoryOption = DirectoryOption> = Record<string, Option>

export function createDirectoryLookup<Option extends DirectoryOption>(
  options: Option[],
): DirectoryLookup<Option> {
  return options.reduce<DirectoryLookup<Option>>((acc, option) => {
    acc[String(option.id)] = option
    return acc
  }, {})
}

export function sortByNameRu<Option extends { name: string }>(options: Option[]): Option[] {
  return [...options].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
}

export function sortParameters(
  items: LoadedObjectParameter[],
  options?: { groupFirst?: boolean },
): LoadedObjectParameter[] {
  const groupFirst = options?.groupFirst ?? true
  const sorted = [...items]

  sorted.sort((a, b) => {
    if (groupFirst) {
      const groupA = a.groupName ?? ''
      const groupB = b.groupName ?? ''
      const groupCompare = groupA.localeCompare(groupB, 'ru')
      if (groupCompare !== 0) return groupCompare
    }

    return a.name.localeCompare(b.name, 'ru')
  })

  return sorted
}
