/** Файл: src/entities/object-defect/model/dto.ts
 *  Назначение: описывает структуры REST-ответов и хелперы нормализации для дефектов объектов.
 *  Использование: применять в репозиториях object-defect при маппинге ответов API.
 */
import { trimmedString } from '@shared/lib'

export interface RawObjectDefectRecord {
  id?: string | number | null
  code?: string | number | null
  name?: string | null
  categoryId?: string | number | null
  categoryName?: string | null
  statusId?: string | number | null
  statusName?: string | null
  severityId?: string | number | null
  severityName?: string | null
  description?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export interface RawDirectoryRecord {
  id?: string | number | null
  code?: string | number | null
  name?: string | null
  description?: string | null
}

export interface ObjectDefectSnapshotResponse {
  defects?: RawObjectDefectRecord[]
  categories?: RawDirectoryRecord[]
  statuses?: RawDirectoryRecord[]
  severities?: RawDirectoryRecord[]
}

export function normalizeDefectCode(value: string | number | null | undefined): string {
  const trimmed = trimmedString(value)
  if (!trimmed) return ''
  return trimmed.replace(/\s+/g, '').toUpperCase()
}

export function normalizeMultilineText(value: string | null | undefined): string {
  const trimmed = trimmedString(value)
  if (!trimmed) return ''
  return trimmed.replace(/[\r\n]+/g, '\n')
}
