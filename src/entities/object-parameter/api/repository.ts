/** Файл: src/entities/object-parameter/api/repository.ts
 *  Назначение: адаптер RPC-методов для справочника параметров обслуживаемых объектов.
 *  Использование: импортируйте функции в фичах и страницах для загрузки и мутаций данных.
 */
import { rpc } from '@shared/api'
import { normalizeText } from '@shared/lib'

import type {
  DirectoryLookup,
  DirectoryOption,
  LoadedObjectParameter,
  ObjectParametersSnapshot,
} from '../model/types'

interface RpcDirectoryItem {
  [key: string]: unknown
}

interface RpcParameterItem {
  [key: string]: unknown
}

interface RpcParamsComponentRecord {
  [key: string]: unknown
}

type ParameterMutationPayload = Omit<LoadedObjectParameter, 'id'> & { id?: string }

const STRING_TRUE = new Set(['1', 'true', 'yes', 'y'])
const COMPONENT_SEPARATOR = '<=>'

function buildParamUnitKey(name: string | null | undefined, unit: string | null | undefined): string | null {
  const normalizedName = normalizeText(name ?? '')
  if (!normalizedName) return null
  const normalizedUnit = normalizeText(unit ?? '')
  return `${normalizedName}|${normalizedUnit}`
}

function parseParamsComponentName(value: unknown): {
  parameterName: string | null
  unitName: string | null
  componentName: string | null
} | null {
  if (typeof value !== 'string') return null
  const raw = value.trim()
  if (!raw) return null

  const separatorIndex = raw.indexOf(COMPONENT_SEPARATOR)
  if (separatorIndex === -1) return null

  const left = raw.slice(0, separatorIndex).trim()
  const right = raw.slice(separatorIndex + COMPONENT_SEPARATOR.length).trim()

  if (!left) return null

  const commaIndex = left.lastIndexOf(',')
  let parameterName = left
  let unitName: string | null = null

  if (commaIndex !== -1) {
    parameterName = left.slice(0, commaIndex).trim()
    unitName = left.slice(commaIndex + 1).trim()
  }

  return {
    parameterName: parameterName || null,
    unitName: unitName || null,
    componentName: right || null,
  }
}

function extractArray<T = unknown>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>

    for (const key of ['records', 'items', 'data', 'rows', 'result']) {
      const nested = record[key]
      if (Array.isArray(nested)) return nested as T[]
    }

    for (const nestedValue of Object.values(record)) {
      if (Array.isArray(nestedValue)) return nestedValue as T[]
    }
  }

  return []
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

function pickString(source: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const raw = source[key]

    if (typeof raw === 'string') {
      const trimmed = raw.trim()
      if (trimmed) return trimmed
    }

    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return String(raw)
    }
  }

  return null
}

function pickNumber(source: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const raw = source[key]

    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return raw
    }

    if (typeof raw === 'string') {
      const normalized = raw.replace(',', '.').trim()
      if (!normalized) continue
      const value = Number(normalized)
      if (!Number.isNaN(value)) return value
    }
  }

  return null
}

function pickBoolean(source: Record<string, unknown>, keys: string[]): boolean {
  for (const key of keys) {
    const raw = source[key]

    if (typeof raw === 'boolean') return raw
    if (typeof raw === 'number') return raw !== 0
    if (typeof raw === 'string') {
      const normalized = raw.trim().toLowerCase()
      if (!normalized) continue
      if (STRING_TRUE.has(normalized)) return true
      if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'n') {
        return false
      }
    }
  }

  return false
}

function toDirectoryOption(
  item: RpcDirectoryItem,
  fallbackId: string,
  idKeys: string[],
  nameKeys: string[],
): DirectoryOption {
  const record = asRecord(item)
  const id = pickString(record, idKeys) ?? fallbackId
  const name = pickString(record, nameKeys)

  return { id, name: name ?? id }
}

function createDirectoryLookup(options: DirectoryOption[]): DirectoryLookup {
  return options.reduce<DirectoryLookup>((acc, option) => {
    acc[String(option.id)] = option
    return acc
  }, {})
}

function mapParameter(
  item: RpcParameterItem,
  index: number,
  directories: { units: DirectoryLookup; sources: DirectoryLookup },
): LoadedObjectParameter {
  const record = asRecord(item)
  const id = pickString(record, ['id', 'parameterId', 'parameter_id']) ?? `parameter-${index}`
  const name =
    pickString(record, ['name', 'parameterName', 'parameter_name', 'title', 'ParamsName', 'paramsName']) ??
    `Параметр ${index + 1}`
  const code = pickString(record, ['code', 'parameterCode', 'mnemo', 'mnemonic'])
  const valueType =
    pickString(record, ['valueType', 'value_type', 'type']) ?? pickString(record, ['dataType', 'data_type']) ?? 'string'
  const unitId =
    pickString(record, ['unitId', 'unit_id', 'measureId', 'measure_id', 'pvParamsMeasure']) ??
    pickString(record, ['unit', 'measure'])
  const sourceId =
    pickString(record, [
      'objCollections',
      'objCollection',
      'sourceId',
      'source_id',
      'collectionId',
      'collection_id',
      'pvCollections',
    ]) ??
    pickString(record, ['collection', 'source'])
  const minValue = pickNumber(record, ['minValue', 'min_value', 'min'])
  const maxValue = pickNumber(record, ['maxValue', 'max_value', 'max'])
  const isRequired = pickBoolean(record, ['isRequired', 'required', 'is_required', 'mandatory'])
  const note = pickString(record, ['note', 'comment', 'description', 'remark', 'ParamsComment'])
  const description = pickString(record, ['ParamsDescription', 'description', 'parameterDescription'])

  const unitName =
    (unitId ? directories.units[unitId]?.name : null) ??
    pickString(record, [
      'unitName',
      'unit_name',
      'measureName',
      'measure_name',
      'pvParamsMeasureName',
      'ParamsMeasureName',
    ])
  const sourceName =
    (sourceId ? directories.sources[sourceId]?.name : null) ??
    pickString(record, [
      'sourceName',
      'source_name',
      'collectionName',
      'collection_name',
      'idCollectionsName',
      'objCollectionName',
      'ParamsCollectionName',
    ])

  return {
    id,
    name,
    code: code ?? null,
    valueType,
    unitId: unitId ?? null,
    sourceId: sourceId ?? null,
    componentId: null,
    minValue,
    maxValue,
    normValue: null,
    isRequired,
    note: note ?? null,
    description: description ?? null,
    unitName: unitName ?? null,
    sourceName: sourceName ?? null,
    componentName: null,
  }
}

export async function fetchObjectParametersSnapshot(): Promise<ObjectParametersSnapshot> {
  const [measureResponse, collectionResponse, parametersResponse] = await Promise.all([
    rpc<RpcDirectoryItem[]>('data/loadMeasure', ['Prop_ParamsMeasure']),
    rpc<RpcDirectoryItem[]>('data/loadCollections', ['Cls_Collections', 'Prop_Collections']),
    rpc<RpcParameterItem[]>('data/loadParameters', [0]),
  ])

  const relTypeId = await rpc<number>('data/getIdRelTyp', ['RT_ParamsComponent']).catch(() => null)
  if (relTypeId !== null) {
    await rpc('data/loadRelObjMember', [0]).catch(() => null)
  }
  const paramsComponentResponse = relTypeId !== null ? await rpc<unknown>('data/loadParamsComponent', [relTypeId]).catch(() => null) : null

  const unitItems = extractArray<RpcDirectoryItem>(measureResponse)
  const sourceItems = extractArray<RpcDirectoryItem>(collectionResponse)
  const parameterItems = extractArray<RpcParameterItem>(parametersResponse)
  const componentItems = extractArray<RpcParamsComponentRecord>(paramsComponentResponse)

  const unitOptions = unitItems.map((item, index) =>
    toDirectoryOption(item, `unit-${index}`, ['pv', 'id', 'measureId', 'measure_id', 'unitId', 'unit_id'], [
      'name',
      'shortName',
      'short_name',
      'fullName',
      'full_name',
      'caption',
      'title',
      'ParamsMeasureName',
    ]),
  )

  const sourceOptions = sourceItems.map((item, index) =>
    toDirectoryOption(item, `source-${index}`, ['id', 'collectionId', 'collection_id', 'sourceId', 'source_id', 'pv'], [
      'name',
      'caption',
      'title',
      'description',
      'ParamsCollectionName',
    ]),
  )

  const unitDirectory = createDirectoryLookup(unitOptions)
  const sourceDirectory = createDirectoryLookup(sourceOptions)

  const items = parameterItems.map((item, index) =>
    mapParameter(item, index, { units: unitDirectory, sources: sourceDirectory }),
  )

  if (componentItems.length) {
    const byKey = new Map<string, LoadedObjectParameter>()
    const byName = new Map<string, LoadedObjectParameter>()
    for (const item of items) {
      const key = buildParamUnitKey(item.name, item.unitName)
      if (key) byKey.set(key, item)
      const nameKey = normalizeText(item.name)
      if (nameKey) byName.set(nameKey, item)
    }

    for (const rawItem of componentItems) {
      const record = asRecord(rawItem)
      const parsed = parseParamsComponentName(record.name)
      if (!parsed) continue
      const key = buildParamUnitKey(parsed.parameterName, parsed.unitName)
      let target: LoadedObjectParameter | undefined
      if (key) target = byKey.get(key)
      if (!target) {
        const nameKey = normalizeText(parsed.parameterName)
        if (nameKey) target = byName.get(nameKey)
      }
      if (!target) continue

      const componentId = pickString(record, ['componentId', 'idComponent', 'component_id', 'id'])
      if (componentId) target.componentId = componentId

      if (parsed.componentName) target.componentName = parsed.componentName

      const limitMin = pickNumber(record, ['ParamsLimitMin', 'limitMin', 'minValue'])
      if (limitMin !== null) target.minValue = limitMin

      const limitMax = pickNumber(record, ['ParamsLimitMax', 'limitMax', 'maxValue'])
      if (limitMax !== null) target.maxValue = limitMax

      const limitNorm = pickNumber(record, ['ParamsLimitNorm', 'limitNorm', 'normValue'])
      if (limitNorm !== null) target.normValue = limitNorm

      const comment = pickString(record, ['cmt', 'comment', 'note'])
      if (comment) target.note = comment
    }
  }

  return { items, unitDirectory, sourceDirectory }
}

function normalizeMutationPayload(payload: ParameterMutationPayload & { id: string }): LoadedObjectParameter {
  return {
    id: payload.id,
    name: payload.name,
    code: payload.code ?? null,
    valueType: payload.valueType,
    unitId: payload.unitId ?? null,
    sourceId: payload.sourceId ?? null,
    componentId: payload.componentId ?? null,
    minValue: payload.minValue ?? null,
    maxValue: payload.maxValue ?? null,
    normValue: payload.normValue ?? null,
    isRequired: Boolean(payload.isRequired),
    note: payload.note ?? null,
    description: payload.description ?? null,
    unitName: payload.unitName ?? null,
    sourceName: payload.sourceName ?? null,
    componentName: payload.componentName ?? null,
  }
}

export async function createParameter(payload: ParameterMutationPayload): Promise<LoadedObjectParameter> {
  const id = payload.id ?? String(Date.now())
  return Promise.resolve(normalizeMutationPayload({ ...payload, id }))
}

export async function updateParameter(payload: ParameterMutationPayload & { id: string }): Promise<LoadedObjectParameter> {
  return Promise.resolve(normalizeMutationPayload(payload))
}

export async function deleteParameter(id: string): Promise<void> {
  void id
  return Promise.resolve()
}
