import { callRpc } from './api'

export type CurUser = {
  id: number | string
  login: string
  fullname?: string
  target?: string
  [k: string]: unknown
}

export async function getCurUserInfo(): Promise<CurUser> {
  const data = await callRpc<{ result: CurUser }>('data/getCurUserInfo', [])
  return (data as any)?.result ?? (data as any)
}
