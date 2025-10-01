/** Файл: src/entities/object-defect/api/repository.ts
 *  Назначение: REST-доступ к справочнику дефектов объектов и сопутствующим словарям.
 *  Использование: вызывать из фич и страниц для загрузки списков, форм и выполнения CRUD.
 */
import { del, get, post, put } from '@shared/api'
import { trimmedString, toOptionalString } from '@shared/lib'
import {
  normalizeDefectCode,
  normalizeMultilineText,
  type ObjectDefectSnapshotResponse,
  type RawDirectoryRecord,
  type RawObjectDefectRecord,
} from '../model/dto'
import type {
  CreateObjectDefectPayload,
  DefectDirectoryOption,
  LoadedObjectDefect,
  ObjectDefect,
  ObjectDefectsSnapshot,
  UpdateObjectDefectPayload,
} from '../model/types'

const OBJECT_DEFECTS_BASE_PATH = '/object-defects'
const OBJECT_DEFECTS_SNAPSHOT_PATH = `${OBJECT_DEFECTS_BASE_PATH}/snapshot`
const DEFECT_CATEGORIES_PATH = '/object-defect-categories'
const DEFECT_STATUSES_PATH = '/object-defect-statuses'
const DEFECT_SEVERITIES_PATH = '/object-defect-severities'

type DirectoryMaps = {
  categories: Map<string, DefectDirectoryOption>
  statuses: Map<string, DefectDirectoryOption>
  severities: Map<string, DefectDirectoryOption>
}

function mapDirectoryRecord(record: RawDirectoryRecord): DefectDirectoryOption | null {
  const id = toOptionalString(record.id ?? record.ID ?? record.code)
  const name = trimmedString(record.name)
  if (!id) return null
  return {
    id,
    name: name || id,
    code: toOptionalString(record.code),
    description: trimmedString(record.description) || null,
  }
}

function ensureDirectoryMaps(
  categories: DefectDirectoryOption[],
  statuses: DefectDirectoryOption[],
  severities: DefectDirectoryOption[],
): DirectoryMaps {
  const categoriesMap = new Map<string, DefectDirectoryOption>()
  const statusesMap = new Map<string, DefectDirectoryOption>()
  const severitiesMap = new Map<string, DefectDirectoryOption>()

  for (const option of categories) categoriesMap.set(option.id, option)
  for (const option of statuses) statusesMap.set(option.id, option)
  for (const option of severities) severitiesMap.set(option.id, option)

  return { categories: categoriesMap, statuses: statusesMap, severities: severitiesMap }
}

function mapLoadedDefect(
  record: RawObjectDefectRecord | null | undefined,
  directories?: Partial<DirectoryMaps>,
): LoadedObjectDefect | null {
  if (!record) return null

  const id = toOptionalString(record.id ?? record.ID)
  if (!id) return null

  const code = normalizeDefectCode(record.code ?? id) || id
  const name = trimmedString(record.name) || code

  const categoryId = toOptionalString(record.categoryId ?? record.category_id)
  const statusId = toOptionalString(record.statusId ?? record.status_id)
  const severityId = toOptionalString(record.severityId ?? record.severity_id)

  const categoryName =
    trimmedString(record.categoryName ?? record.category_name) ||
    (categoryId ? directories?.categories?.get(categoryId)?.name ?? null : null)
  const statusName =
    trimmedString(record.statusName ?? record.status_name) ||
    (statusId ? directories?.statuses?.get(statusId)?.name ?? null : null)
  const severityName =
    trimmedString(record.severityName ?? record.severity_name) ||
    (severityId ? directories?.severities?.get(severityId)?.name ?? null : null)

  return {
    id,
    code,
    name,
    categoryId,
    statusId,
    severityId,
    categoryName: categoryName || null,
    statusName: statusName || null,
    severityName: severityName || null,
    description: normalizeMultilineText(record.description) || null,
    createdAt: trimmedString(record.createdAt ?? record.created_at) || null,
    updatedAt: trimmedString(record.updatedAt ?? record.updated_at) || null,
  }
}

function mapDefect(record: RawObjectDefectRecord | null | undefined): ObjectDefect | null {
  const loaded = mapLoadedDefect(record)
  if (!loaded) return null
  return {
    id: loaded.id,
    code: loaded.code,
    name: loaded.name,
    categoryId: loaded.categoryId,
    statusId: loaded.statusId,
    severityId: loaded.severityId,
  }
}

async function loadSnapshotResponse(): Promise<ObjectDefectSnapshotResponse | null> {
  try {
    return await get<ObjectDefectSnapshotResponse>(OBJECT_DEFECTS_SNAPSHOT_PATH)
  } catch {
    return null
  }
}

function toPromise<T>(value: T | undefined | null, fallback: () => Promise<T>): Promise<T> {
  return value != null ? Promise.resolve(value) : fallback()
}

export async function fetchObjectDefectsSnapshot(): Promise<ObjectDefectsSnapshot> {
  const snapshot = await loadSnapshotResponse()

  const [rawDefects, rawCategories, rawStatuses, rawSeverities] = await Promise.all([
    toPromise<RawObjectDefectRecord[]>(snapshot?.defects, () => get<RawObjectDefectRecord[]>(OBJECT_DEFECTS_BASE_PATH)),
    toPromise<RawDirectoryRecord[]>(snapshot?.categories, () => get<RawDirectoryRecord[]>(DEFECT_CATEGORIES_PATH)),
    toPromise<RawDirectoryRecord[]>(snapshot?.statuses, () => get<RawDirectoryRecord[]>(DEFECT_STATUSES_PATH)),
    toPromise<RawDirectoryRecord[]>(snapshot?.severities, () => get<RawDirectoryRecord[]>(DEFECT_SEVERITIES_PATH)),
  ])

  const categories = rawCategories
    .map(mapDirectoryRecord)
    .filter((item): item is DefectDirectoryOption => item != null)
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  const statuses = rawStatuses
    .map(mapDirectoryRecord)
    .filter((item): item is DefectDirectoryOption => item != null)
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  const severities = rawSeverities
    .map(mapDirectoryRecord)
    .filter((item): item is DefectDirectoryOption => item != null)
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))

  const directories = ensureDirectoryMaps(categories, statuses, severities)

  const items = rawDefects
    .map((record) => mapLoadedDefect(record, directories))
    .filter((item): item is LoadedObjectDefect => item != null)
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))

  return { items, categories, statuses, severities }
}

export async function listObjectDefects(): Promise<ObjectDefect[]> {
  const records = await get<RawObjectDefectRecord[]>(OBJECT_DEFECTS_BASE_PATH)
  return records.map(mapDefect).filter((item): item is ObjectDefect => item != null)
}

export async function createDefect(payload: CreateObjectDefectPayload): Promise<LoadedObjectDefect> {
  const record = await post<RawObjectDefectRecord, CreateObjectDefectPayload>(OBJECT_DEFECTS_BASE_PATH, payload)
  const mapped = mapLoadedDefect(record)
  if (!mapped) {
    throw new Error('Не удалось прочитать созданный дефект')
  }
  return mapped
}

export async function updateDefect(payload: UpdateObjectDefectPayload): Promise<LoadedObjectDefect> {
  const { id, ...rest } = payload
  const record = await put<RawObjectDefectRecord, Partial<CreateObjectDefectPayload>>(
    `${OBJECT_DEFECTS_BASE_PATH}/${id}`,
    rest,
  )
  const mapped = mapLoadedDefect(record)
  if (!mapped) {
    throw new Error('Не удалось прочитать обновлённый дефект')
  }
  return mapped
}

export async function deleteDefect(id: string | number): Promise<void> {
  await del(`${OBJECT_DEFECTS_BASE_PATH}/${id}`)
}
