/** Файл: src/entities/object-parameter/api/repository.ts
 *  Назначение: адаптер RPC-методов для справочника параметров обслуживаемых объектов.
 *  Использование: импортируйте функции в фичах и страницах для загрузки и мутаций данных.
 */
import { rpc } from '@shared/api'

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

type ParameterMutationPayload = Omit<LoadedObjectParameter, 'id'> & { id?: string }

const STRING_TRUE = new Set(['1', 'true', 'yes', 'y'])

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
  const name = pickString(record, ['name', 'parameterName', 'parameter_name', 'title']) ?? `Параметр ${index + 1}`
  const code = pickString(record, ['code', 'parameterCode', 'mnemo', 'mnemonic'])
  const valueType =
    pickString(record, ['valueType', 'value_type', 'type']) ?? pickString(record, ['dataType', 'data_type']) ?? 'string'
  const unitId =
    pickString(record, ['unitId', 'unit_id', 'measureId', 'measure_id']) ?? pickString(record, ['unit', 'measure'])
  const sourceId =
    pickString(record, ['sourceId', 'source_id', 'collectionId', 'collection_id']) ??
    pickString(record, ['collection', 'source'])
  const minValue = pickNumber(record, ['minValue', 'min_value', 'min'])
  const maxValue = pickNumber(record, ['maxValue', 'max_value', 'max'])
  const isRequired = pickBoolean(record, ['isRequired', 'required', 'is_required', 'mandatory'])
  const note = pickString(record, ['note', 'comment', 'description', 'remark'])

  const unitName =
    (unitId ? directories.units[unitId]?.name : null) ??
    pickString(record, ['unitName', 'unit_name', 'measureName', 'measure_name'])
  const sourceName =
    (sourceId ? directories.sources[sourceId]?.name : null) ??
    pickString(record, ['sourceName', 'source_name', 'collectionName', 'collection_name'])

  return {
    id,
    name,
    code: code ?? null,
    valueType,
    unitId: unitId ?? null,
    sourceId: sourceId ?? null,
    minValue,
    maxValue,
    isRequired,
    note: note ?? null,
    unitName: unitName ?? null,
    sourceName: sourceName ?? null,
  }
}

export async function fetchObjectParametersSnapshot(): Promise<ObjectParametersSnapshot> {
  const [measureResponse, collectionResponse, parametersResponse] = await Promise.all([
    rpc<RpcDirectoryItem[]>('data/loadMeasure'),
    rpc<RpcDirectoryItem[]>('data/loadCollections'),
    rpc<RpcParameterItem[]>('data/loadParameters'),
  ])

  const unitOptions = (Array.isArray(measureResponse) ? measureResponse : []).map((item, index) =>
    toDirectoryOption(item, `unit-${index}`, ['id', 'measureId', 'measure_id', 'unitId', 'unit_id'], [
      'name',
      'shortName',
      'short_name',
      'fullName',
      'full_name',
      'caption',
      'title',
    ]),
  )

  const sourceOptions = (Array.isArray(collectionResponse) ? collectionResponse : []).map((item, index) =>
    toDirectoryOption(item, `source-${index}`, ['id', 'collectionId', 'collection_id', 'sourceId', 'source_id'], [
      'name',
      'caption',
      'title',
      'description',
    ]),
  )

  const unitDirectory = createDirectoryLookup(unitOptions)
  const sourceDirectory = createDirectoryLookup(sourceOptions)

  const items = (Array.isArray(parametersResponse) ? parametersResponse : []).map((item, index) =>
    mapParameter(item, index, { units: unitDirectory, sources: sourceDirectory }),
  )

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
    minValue: payload.minValue ?? null,
    maxValue: payload.maxValue ?? null,
    isRequired: Boolean(payload.isRequired),
    note: payload.note ?? null,
    unitName: payload.unitName ?? null,
    sourceName: payload.sourceName ?? null,
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
