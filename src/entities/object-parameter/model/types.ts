/** Файл: src/entities/object-parameter/model/types.ts
 *  Назначение: доменные типы для работы со справочником параметров обслуживаемых объектов.
 *  Использование: импортируйте в репозитории, фичах и страницах при работе с параметрами.
 */

export interface ObjectParameter {
  id: string
  name: string
  code: string | null
  valueType: string
  unitId: string | null
  groupId: string | null
  minValue: number | null
  maxValue: number | null
  isRequired: boolean
  note: string | null
}

export interface LoadedObjectParameter extends ObjectParameter {
  unitName: string | null
  groupName: string | null
}

export interface ObjectParametersSnapshot {
  items: LoadedObjectParameter[]
  unitOptions: Array<{ id: string; name: string }>
  groupOptions: Array<{ id: string; name: string }>
}
