/** Файл: src/entities/component/api/repository.ts
 *  Назначение: RPC-доступ к справочнику компонентов и создание новых компонентов.
 *  Использование: вызывать из фич (селект) и сценариев CRUD объектов.
 */
import { rpc } from '@shared/api'
import { extractRecords, firstRecord, toOptionalString } from '@shared/lib'
import type { Component } from '../model/types'
import type { ComponentRecord, ComponentSaveRecord } from '../model/dto'

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
