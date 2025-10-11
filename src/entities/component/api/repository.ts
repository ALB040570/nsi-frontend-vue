/** Файл: src/entities/component/api/repository.ts
 *  Назначение: RPC-доступ к справочнику компонентов и создание новых компонентов.
 *  Использование: вызывать из фич (селект) и сценариев CRUD объектов.
 */
import { rpc } from '@shared/api'
import { extractRecords, firstRecord, normalizeText, toOptionalString, trimmedString } from '@shared/lib'
import type {
  Component,
  ComponentDetails,
  ComponentRelation,
  ComponentsSnapshot,
  CreateComponentPayload,
  DirectoryOptionWithMeta,
  LoadedComponentWithRelations,
  UpdateComponentPayload,
} from '../model/types'
import type { ComponentRecord, ComponentSaveRecord } from '../model/dto'

interface InternalComponentRecord {
  id: number
  cls: number
  name: string
  objectTypeIds: string[]
  parameterIds: string[]
  defectIds: string[]
}

interface InternalDirectoryRecord {
  id: string
  name: string
  cls?: string | null
}

const defaultObjectTypes: InternalDirectoryRecord[] = [
  { id: '1', name: 'ЖД путь', cls: '1001' },
  { id: '2', name: 'Стрелочный перевод', cls: '1001' },
  { id: '3', name: 'Мост', cls: '1001' },
]

const defaultParameters: InternalDirectoryRecord[] = [
  { id: '101', name: 'Температура', cls: '1041' },
  { id: '102', name: 'Влажность', cls: '1041' },
  { id: '103', name: 'Длина', cls: '1041' },
]

const defaultDefects: InternalDirectoryRecord[] = [
  { id: '201', name: 'Коррозия', cls: '1061' },
  { id: '202', name: 'Трещина', cls: '1061' },
  { id: '203', name: 'Скол', cls: '1061' },
]

const memoryComponents = new Map<number, InternalComponentRecord>([
  [1, { id: 1, cls: 1027, name: 'Рельс', objectTypeIds: ['1'], parameterIds: ['101'], defectIds: ['201'] }],
  [2, { id: 2, cls: 1027, name: 'Шпала', objectTypeIds: ['1', '2'], parameterIds: ['102'], defectIds: ['202'] }],
  [3, { id: 3, cls: 1027, name: 'Опора', objectTypeIds: ['3'], parameterIds: ['103'], defectIds: [] }],
])

const memoryObjectTypes = new Map<string, InternalDirectoryRecord>(
  defaultObjectTypes.map((item) => [item.id, { ...item }]),
)

const memoryParameters = new Map<string, InternalDirectoryRecord>(
  defaultParameters.map((item) => [item.id, { ...item }]),
)

const memoryDefects = new Map<string, InternalDirectoryRecord>(
  defaultDefects.map((item) => [item.id, { ...item }]),
)

let lastComponentId = Math.max(...Array.from(memoryComponents.values()).map((item) => item.id))
let lastObjectTypeId = Math.max(...Array.from(memoryObjectTypes.keys()).map((id) => Number(id) || 0))
let lastParameterId = Math.max(...Array.from(memoryParameters.keys()).map((id) => Number(id) || 0))
let lastDefectId = Math.max(...Array.from(memoryDefects.keys()).map((id) => Number(id) || 0))

const generateId = (source: 'component' | 'objectType' | 'parameter' | 'defect'): number => {
  switch (source) {
    case 'component':
      lastComponentId += 1
      return lastComponentId
    case 'objectType':
      lastObjectTypeId += 1
      return lastObjectTypeId
    case 'parameter':
      lastParameterId += 1
      return lastParameterId
    case 'defect':
      lastDefectId += 1
      return lastDefectId
    default:
      return Date.now()
  }
}

function toDirectoryOption(record: InternalDirectoryRecord): DirectoryOptionWithMeta {
  return { id: record.id, name: record.name, cls: record.cls ?? null }
}

function ensureDirectoryRecord(
  collection: Map<string, InternalDirectoryRecord>,
  name: string,
  source: 'objectType' | 'parameter' | 'defect',
): InternalDirectoryRecord {
  const normalized = normalizeText(name)
  for (const entry of collection.values()) {
    if (normalizeText(entry.name) === normalized) return entry
  }
  const newId = String(generateId(source))
  const record = { id: newId, name: trimmedString(name) || `Новый ${source}` }
  collection.set(newId, record)
  return record
}

function mapRelations(
  ids: string[],
  directory: Map<string, InternalDirectoryRecord>,
): ComponentRelation[] {
  return ids
    .map((id) => {
      const option = directory.get(id)
      if (!option) return null
      return {
        id: option.id,
        name: option.name,
        relationId: `${option.id}-${option.name}`,
        cls: option.cls ?? null,
      }
    })
    .filter((item): item is ComponentRelation => item != null)
}

function mapComponent(record: InternalComponentRecord): LoadedComponentWithRelations {
  return {
    id: String(record.id),
    cls: String(record.cls),
    name: record.name,
    objectTypes: mapRelations(record.objectTypeIds, memoryObjectTypes),
    parameters: mapRelations(record.parameterIds, memoryParameters),
    defects: mapRelations(record.defectIds, memoryDefects),
    details: {
      id: record.id,
      cls: record.cls,
      accessLevel: 1,
    },
  }
}

function composeSnapshot(): ComponentsSnapshot {
  const items = Array.from(memoryComponents.values())
    .map(mapComponent)
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))

  const objectTypes = Array.from(memoryObjectTypes.values())
    .map(toDirectoryOption)
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  const parameters = Array.from(memoryParameters.values())
    .map(toDirectoryOption)
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  const defects = Array.from(memoryDefects.values())
    .map(toDirectoryOption)
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))

  return { items, objectTypes, parameters, defects }
}

export interface CreatedComponentPayload {
  id: number
  cls: number
  name: string
}

function toCreatedPayload(record: ComponentSaveRecord | null, fallbackName: string): CreatedComponentPayload {
  if (!record) throw new Error('Нет ответа с созданным компонентом')
  const idValue = toOptionalString(record.id ?? record.ID ?? record.number)
  if (!idValue) throw new Error('Нет идентификатора созданного компонента')
  const clsValue = toOptionalString(record.cls ?? record.CLS) ?? '1027'
  const nameValue = toOptionalString(record.name ?? record.NAME) ?? fallbackName
  return {
    id: Number(idValue),
    cls: Number(clsValue),
    name: nameValue,
  }
}

async function callCreateComponent(name: string): Promise<CreatedComponentPayload> {
  const response = await rpc<ComponentSaveRecord | { result?: ComponentSaveRecord }>('data/saveComponents', [
    'ins',
    {
      accessLevel: 1,
      cls: 1027,
      name,
    },
  ])

  const record = firstRecord<ComponentSaveRecord>(response)
  return toCreatedPayload(record, name)
}

export async function listComponents(): Promise<Component[]> {
  const response = await rpc<ComponentRecord[]>('data/loadComponents', [0])
  const raw = extractRecords<ComponentRecord>(response)
  return raw
    .map<Component | null>((item) => {
      const id = toOptionalString(item.id ?? item.ID ?? item.number)
      const name = toOptionalString(item.name ?? item.NAME)
      if (!id || !name) return null
      return { id, name }
    })
    .filter((item): item is Component => item != null)
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
}

export async function createComponent(name: string): Promise<Component> {
  const created = await callCreateComponent(name)
  return {
    id: String(created.id),
    name: created.name,
  }
}

export async function createComponentIfMissing(name: string): Promise<CreatedComponentPayload> {
  return await callCreateComponent(name)
}

export async function fetchComponentsSnapshot(): Promise<ComponentsSnapshot> {
  try {
    await rpc('data/loadComponents', [0])
  } catch {
    // Игнорируем ошибки в моковом режиме
  }
  return composeSnapshot()
}

function applyPayload(
  record: InternalComponentRecord,
  payload: CreateComponentPayload | UpdateComponentPayload,
) {
  record.name = trimmedString(payload.name) || `Компонент ${record.id}`
  record.objectTypeIds = Array.from(new Set(payload.objectTypeIds.map(String)))
  record.parameterIds = Array.from(new Set(payload.parameterIds.map(String)))
  record.defectIds = Array.from(new Set(payload.defectIds.map(String)))
}

export async function createComponentEntry(
  payload: CreateComponentPayload,
): Promise<LoadedComponentWithRelations> {
  const baseName = trimmedString(payload.name) || 'Новый компонент'
  let created: CreatedComponentPayload
  try {
    created = await callCreateComponent(baseName)
  } catch {
    const newId = generateId('component')
    created = { id: newId, cls: 1027, name: baseName }
  }

  const record: InternalComponentRecord = {
    id: Number(created.id),
    cls: Number(created.cls),
    name: created.name,
    objectTypeIds: [],
    parameterIds: [],
    defectIds: [],
  }
  applyPayload(record, payload)
  memoryComponents.set(record.id, record)
  return mapComponent(record)
}

export async function updateComponentEntry(
  payload: UpdateComponentPayload,
): Promise<LoadedComponentWithRelations> {
  const existing = memoryComponents.get(Number(payload.id))
  if (!existing) {
    const created = await createComponentEntry(payload)
    return created
  }

  try {
    await rpc('data/saveComponents', [
      'upd',
      {
        id: payload.id,
        cls: payload.cls ?? existing.cls,
        accessLevel: payload.details.accessLevel ?? 1,
        name: payload.name,
      },
    ])
  } catch {
    // ignore errors in fallback mode
  }

  applyPayload(existing, payload)
  memoryComponents.set(existing.id, existing)
  return mapComponent(existing)
}

export async function deleteComponentEntry(id: number | string): Promise<void> {
  memoryComponents.delete(Number(id))
  try {
    await rpc('data/deleteComponents', [id])
  } catch {
    // ignore fallback errors
  }
}

export async function createObjectTypeOnTheFly(name: string): Promise<DirectoryOptionWithMeta> {
  const record = ensureDirectoryRecord(memoryObjectTypes, name, 'objectType')
  return toDirectoryOption(record)
}

export async function createParameterOnTheFly(name: string): Promise<DirectoryOptionWithMeta> {
  const record = ensureDirectoryRecord(memoryParameters, name, 'parameter')
  return toDirectoryOption(record)
}

export async function createDefectOnTheFly(name: string): Promise<DirectoryOptionWithMeta> {
  const record = ensureDirectoryRecord(memoryDefects, name, 'defect')
  return toDirectoryOption(record)
}
