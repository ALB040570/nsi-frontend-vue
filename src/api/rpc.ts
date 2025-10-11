import { rpc } from '@shared/api'
import { extractRecords, firstRecord } from '@shared/lib'

export interface DepartmentRecord {
  id: number
  name: string
}

export interface SourceCollectionRecord {
  id: number
  name: string
  DocumentNumber: string
  DocumentApprovalDate: string | null
  DocumentAuthor: string | null
  DocumentStartDate: string | null
  DocumentEndDate: string | null
  idDocumentNumber?: number | null
  idDocumentApprovalDate?: number | null
  idDocumentAuthor?: number | null
  idDocumentStartDate?: number | null
  idDocumentEndDate?: number | null
}

type RawSourceCollectionRecord = Partial<SourceCollectionRecord> & { id?: number; name?: string }

export interface SourceFileRecord {
  id?: number | string
  name?: string
  fileName?: string
  FileName?: string
  title?: string
  url?: string
  href?: string
  link?: string
  path?: string
  FilePath?: string
  [key: string]: unknown
}

export interface SourceDetailsResult {
  departmentIds: number[]
  files: SourceFileRecord[]
}

export interface SaveSourceCollectionInsPayload {
  accessLevel: number
  name: string
  DocumentNumber: string
  DocumentApprovalDate: string
  DocumentAuthor: string
  DocumentStartDate: string | null
  DocumentEndDate: string | null
}

export interface SaveSourceCollectionUpdPayload {
  accessLevel: number
  id: number
  cls: number
  name: string
  idDocumentNumber: number | null
  DocumentNumber: string
  idDocumentApprovalDate: number | null
  DocumentApprovalDate: string
  idDocumentAuthor: number | null
  DocumentAuthor: string
  idDocumentStartDate: number | null
  DocumentStartDate: string | null
  idDocumentEndDate: number | null
  DocumentEndDate: string | null
}

export async function loadDepartments(): Promise<DepartmentRecord[]> {
  const response = await rpc<unknown>('data/loadDepartments', ['Typ_Location', 'Prop_LocationMulti'])
  const records = extractRecords<DepartmentRecord>(response)
  return records
    .filter((item): item is DepartmentRecord => typeof item?.id === 'number' && typeof item?.name === 'string')
    .map((item) => ({ id: item.id, name: item.name }))
}

export async function loadSourceCollections(): Promise<SourceCollectionRecord[]> {
  const response = await rpc<unknown>('data/loadSourceCollections', [0])
  const records = extractRecords<RawSourceCollectionRecord>(response)

  return records
    .filter((item): item is RawSourceCollectionRecord & { id: number; name: string } => {
      return typeof item?.id === 'number' && typeof item?.name === 'string'
    })
    .map((item) => ({
      id: item.id,
      name: item.name,
      DocumentNumber: item.DocumentNumber ?? '',
      DocumentApprovalDate: item.DocumentApprovalDate ?? null,
      DocumentAuthor: item.DocumentAuthor ?? null,
      DocumentStartDate: item.DocumentStartDate ?? null,
      DocumentEndDate: item.DocumentEndDate ?? null,
      idDocumentNumber: item.idDocumentNumber ?? null,
      idDocumentApprovalDate: item.idDocumentApprovalDate ?? null,
      idDocumentAuthor: item.idDocumentAuthor ?? null,
      idDocumentStartDate: item.idDocumentStartDate ?? null,
      idDocumentEndDate: item.idDocumentEndDate ?? null,
    }))
}

function parseDepartmentIds(input: unknown): number[] {
  if (typeof input !== 'string') return []
  return input
    .split(',')
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((id) => Number.isFinite(id))
}

function extractFileRecords(source: unknown): SourceFileRecord[] {
  if (!source || typeof source !== 'object') return []

  const recordsCandidate = (source as { records?: unknown }).records
  if (Array.isArray(recordsCandidate)) {
    return recordsCandidate.filter((item): item is SourceFileRecord => typeof item === 'object' && item !== null)
  }

  return []
}

export async function loadDepartmentsWithFile(sourceId: number): Promise<SourceDetailsResult> {
  const normalizedId = Number(sourceId)
  if (!Number.isFinite(normalizedId)) {
    return { departmentIds: [], files: [] }
  }

  const response = await rpc<unknown>('data/loadDepartmentsWithFile', [normalizedId])

  if (response && typeof response === 'object') {
    const departments = parseDepartmentIds((response as Record<string, unknown>).departments)
    const files = extractFileRecords((response as Record<string, unknown>).files)

    return {
      departmentIds: departments,
      files,
    }
  }

  return { departmentIds: [], files: [] }
}

export async function saveSourceCollectionIns(payload: SaveSourceCollectionInsPayload): Promise<SourceCollectionRecord> {
  const response = await rpc<unknown>('data/saveSourceCollections', ['ins', payload])

  const record = firstRecord<SourceCollectionRecord>(response)
  if (record && typeof record.id === 'number') {
    return record
  }

  if (response && typeof response === 'object') {
    const direct = response as Record<string, unknown>
    if (typeof direct.id === 'number') {
      return direct as SourceCollectionRecord
    }

    const result = (direct['result'] ?? null) as Record<string, unknown> | null
    if (result && typeof result.id === 'number') {
      return result as SourceCollectionRecord
    }
  }

  throw new Error('Не удалось сохранить документ: отсутствует идентификатор')
}

export async function saveSourceCollectionUpd(payload: SaveSourceCollectionUpdPayload): Promise<SourceCollectionRecord> {
  const response = await rpc<SourceCollectionRecord | { result: SourceCollectionRecord }>(
    'data/saveSourceCollections',
    ['upd', payload],
  )

  const normalized =
    response && typeof response === 'object' && 'result' in response
      ? (response.result as SourceCollectionRecord)
      : (response as SourceCollectionRecord)

  return normalized
}

export async function saveDepartment(sourceId: number, ids: number[]): Promise<void> {
  await rpc('data/saveDepartment', [
    {
      isObj: 1,
      metamodel: 'dtj',
      model: 'nsidata',
      obj: sourceId,
      ids,
    },
  ])
}

export async function deleteSourceCollection(id: number): Promise<void> {
  await rpc('data/deleteOwnerWithProperties', [id, 1])
}
