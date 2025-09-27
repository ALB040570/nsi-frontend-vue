/** Файл: src/entities/component/api/repository.ts
 *  Назначение: RPC-доступ к справочнику компонентов и создание новых компонентов.
 *  Использование: вызывать из фич (селект) и сценариев CRUD объектов.
 */
import { rpc } from '@shared/api/rpcClient'
import { extractRecords, firstRecord } from '@shared/lib/rpc'
import { toOptionalString } from '@shared/lib/text'
import type { Component } from '../model/types'

export async function listComponents(): Promise<Component[]> {
  const response = await rpc('data/loadComponents', [0])
  const raw = extractRecords<any>(response)
  return raw
    .map<Component | null>((item) => {
      const id = toOptionalString(item?.id ?? item?.ID ?? item?.number)
      const name = toOptionalString(item?.name ?? item?.NAME)
      if (!id || !name) return null
      return { id, name }
    })
    .filter((item): item is Component => item != null)
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
}

export async function createComponent(name: string): Promise<Component> {
  const response = await rpc('data/saveComponents', [
    'ins',
    {
      accessLevel: 1,
      cls: 1027,
      name,
    },
  ])
  const record = firstRecord<any>(response)
  const id = toOptionalString(record?.id ?? record?.ID ?? record?.number)
  if (!id) throw new Error('Нет идентификатора созданного компонента')
  return {
    id,
    name: toOptionalString(record?.name ?? record?.NAME) ?? name,
  }
}
