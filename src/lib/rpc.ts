/** Файл: src/lib/rpc.ts
 *  Назначение: обёртки приложенческого уровня над RPC-клиентом для общих сценариев.
 *  Использование: импортируйте функции из этого модуля для получения текущего пользователя и др.
 */
import { rpc } from '@shared/api/rpcClient'

export type CurUser = {
  id: number | string
  login: string
  fullname?: string
  target?: string
  [k: string]: unknown
}

export async function getCurUserInfo(): Promise<CurUser> {
  const data = await rpc<{ result: CurUser }>('data/getCurUserInfo', [])
  return (data as any)?.result ?? (data as any)
}
