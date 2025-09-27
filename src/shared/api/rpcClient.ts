/** Файл: src/shared/api/rpcClient.ts
 *  Назначение: единая точка вызова RPC-методов; типобезопасная обёртка поверх axios-экземпляра api.
 *  Использование: репозитории сущностей импортируют rpc() и вызывают методы бэкенда.
 */
import { api } from '@/lib/api'

type RpcRequest = { method: string; params?: unknown[]; id?: number | string }
type RpcError = { message?: string; code?: number } | string | null | undefined
type RpcResponse<T = unknown> = { result?: T; error?: RpcError }

function extractErrorMessage(error: RpcError, method: string): string {
  if (!error) return `RPC ${method} failed`
  if (typeof error === 'string') return error
  return error.message ?? `RPC ${method} failed`
}

export async function rpc<T = unknown>(method: string, params?: unknown[]): Promise<T> {
  const payload: RpcRequest = { method, params }
  const { data } = await api.post<RpcResponse<T>>('/rpc', payload)
  if (data?.error) throw new Error(extractErrorMessage(data.error, method))
  return (data?.result as T) ?? ({} as T)
}
