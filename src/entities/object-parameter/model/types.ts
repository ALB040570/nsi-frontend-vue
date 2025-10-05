/** Файл: src/entities/object-parameter/model/types.ts
 *  Назначение: доменные типы для работы со справочником параметров обслуживаемых объектов.
 *  Использование: импортируйте в репозитории, фичах и страницах при работе с параметрами.
 */

export type DirectoryOption = { id: string; name: string }

export type DirectoryLookup<Option extends DirectoryOption = DirectoryOption> = Record<string, Option>

export interface ObjectParameter {
  id: string
  name: string
  code: string | null
  valueType: string
  unitId: string | null
  sourceId: string | null
  componentId: string | null
  minValue: number | null
  maxValue: number | null
  normValue: number | null
  isRequired: boolean
  note: string | null
  description: string | null
}

export interface LoadedObjectParameter extends ObjectParameter {
  unitName: string | null
  sourceName: string | null
  componentName: string | null
}

export interface ObjectParametersSnapshot {
  items: LoadedObjectParameter[]
  unitDirectory: DirectoryLookup
  sourceDirectory: DirectoryLookup
}
