/** Файл: src/shared/api/rpcClient.ts
 *  Назначение: централизованный клиент RPC-запросов поверх httpClient.
 *  Использование: вызывайте rpc() вместо прямого доступа к axios-инстансу.
 *  Дополнительно: безопасно ходит на сервер (поддержка, повтор, обработка URL), оставляет контроль на стороне axios-инстанса.
 */
import { api } from './httpClient'

const rawRpcPath = (import.meta.env.VITE_RPC_PATH || '/rpc').trim()
export const rpcPath = rawRpcPath || '/rpc'

interface RpcPayload<TParams> {
  method: string
  params?: TParams
}

type RpcError = { message?: string } | string | null | undefined

type RpcEnvelope<TResult> =
  | { result: TResult; error?: undefined }
  | { result?: undefined; error: RpcError }
  | TResult

export async function rpc<T = unknown, TParams = unknown>(
  method: string,
  params?: TParams,
): Promise<T> {
  const payload: RpcPayload<TParams> = { method, params }
  const path = rpcPath.startsWith('/') ? rpcPath : `/${rpcPath}`
  const { data } = await api.post<RpcEnvelope<T>>(path, payload)

  if (data && typeof data === 'object') {
    if ('error' in data && data.error) {
      const message =
        typeof data.error === 'string'
          ? data.error
          : (data.error?.message ?? `RPC ${method} failed`)
      throw new Error(message)
    }

    if ('result' in data) {
      return (data.result ?? undefined) as T
    }
  }

  return data as T
}
