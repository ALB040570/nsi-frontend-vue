/** Файл: src/entities/object-defect/model/types.ts
 *  Назначение: доменные типы и структуры снапшота для сущности «Дефект обслуживаемого объекта».
 *  Использование: импортируйте в репозитории, фичах и страницах при работе со справочником дефектов.
 */

export interface DefectDirectoryOption {
  id: string
  name: string
  code?: string | null
  description?: string | null
}

export interface ObjectDefectForm {
  code: string
  name: string
  categoryId: string | null
  statusId: string | null
  severityId: string | null
  description: string | null
}

export interface ObjectDefect {
  id: string
  code: string
  name: string
  categoryId: string | null
  statusId: string | null
  severityId: string | null
}

export interface LoadedObjectDefect extends ObjectDefect {
  categoryName: string | null
  statusName: string | null
  severityName: string | null
  description: string | null
  createdAt: string | null
  updatedAt: string | null
}

export interface ObjectDefectsSnapshot {
  items: LoadedObjectDefect[]
  categories: DefectDirectoryOption[]
  statuses: DefectDirectoryOption[]
  severities: DefectDirectoryOption[]
}

export type CreateObjectDefectPayload = ObjectDefectForm

export interface UpdateObjectDefectPayload extends Partial<ObjectDefectForm> {
  id: string
}
