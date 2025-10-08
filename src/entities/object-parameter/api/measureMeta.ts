/** Файл: src/entities/object-parameter/api/measureMeta.ts
 *  Назначение: создание единицы измерения через Meta API и включение её в список допустимых значений свойства.
 *  Использование: вызывайте createMeasureAndSelect(name) из фич/страниц.
 */
import { metaRpc } from '@shared/api'
import type { ParameterMeasureOption } from '../model/types'

interface MetaInsertMeasureRecord {
  id: number
  cod: string
  accessLevel: number
  kFromBase: number
  name: string
  fullName: string
}

interface MetaInsertMeasureResult {
  records: MetaInsertMeasureRecord[]
}

interface MetaPropRecord {
  id: number
  cod: string
  name: string
  fullName: string
  checked?: boolean
  children?: unknown
  leaf?: boolean
  level?: number
}

interface MetaPropLoadResult {
  records: MetaPropRecord[]
}

const MEASURE_REF_PROP_ID = 1105

export async function insertMeasure(name: string): Promise<MetaInsertMeasureRecord> {
  const payload = {
    rec: {
      id: 0,
      cod: '',
      accessLevel: 1,
      kFromBase: 1,
      name,
      fullName: name,
      cmt: null,
      parent: null,
    },
  }

  const result = await metaRpc<MetaInsertMeasureResult, [typeof payload]>('measure/insert', [payload])
  const record = result.records?.[0]
  if (!record) throw new Error('Meta API: не вернулся созданный объект measure')
  return record
}

export async function loadMeasurePropValues(): Promise<MetaPropRecord[]> {
  const result = await metaRpc<MetaPropLoadResult, [number]>('prop/loadPropValForUpd', [MEASURE_REF_PROP_ID])
  return Array.isArray(result.records) ? result.records : []
}

export async function saveMeasurePropSelected(records: MetaPropRecord[]): Promise<void> {
  await metaRpc<unknown, [number, MetaPropRecord[]]>('prop/savePropRefVal', [MEASURE_REF_PROP_ID, records])
}

/**
 * Создаёт единицу измерения и отмечает её выбранной в справочном свойстве (prop 1105).
 * Возвращает опцию для UI и фич.
 */
export async function createMeasureAndSelect(name: string): Promise<ParameterMeasureOption> {
  const created = await insertMeasure(name)
  const all = await loadMeasurePropValues()

  // Оставляем только отмеченные и добавляем новую
  const selected = all.filter((item) => item.checked)
  const createdEntry = all.find((item) => Number(item.id) === Number(created.id))
  if (createdEntry) {
    selected.push({ ...createdEntry, checked: true })
  } else {
    // запасной вариант, если список не вернул новую запись
    selected.push({ id: created.id, cod: created.cod, name: created.name, fullName: created.fullName, checked: true, leaf: true, level: 0, children: null })
  }

  await saveMeasurePropSelected(selected)

  // Для текущей UI-модели id и pv приравниваем к созданному id
  return { id: Number(created.id), pv: Number(created.id), name: created.name }
}
