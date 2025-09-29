import { api } from './httpClient'

const RAW_RPC_PATH = (import.meta.env.VITE_RPC_PATH || '/api').trim()
const RPC_URL = RAW_RPC_PATH ? (RAW_RPC_PATH.startsWith('/') ? RAW_RPC_PATH : `/${RAW_RPC_PATH}`) : '/api'

interface RpcPayload<TParams> {
  method: string
  params?: TParams
}

type RpcError = { message?: string } | string | null | undefined

type RpcEnvelope<TResult> =
  | { result: TResult; error?: undefined }
  | { result?: undefined; error: RpcError }
  | TResult

function extractErrorMessage(error: RpcError, method: string): string {
  if (!error) return `RPC ${method} failed`
  if (typeof error === 'string') return error
  return error.message || `RPC ${method} failed`
}

export async function rpc<T = unknown, TParams = unknown>(
  method: string,
  params?: TParams,
): Promise<T> {
  const payload: RpcPayload<TParams> = { method, params }
  const { data } = await api.post<RpcEnvelope<T>>(RPC_URL, payload)

  if (data && typeof data === 'object') {
    if ('error' in data && data.error) {
      throw new Error(extractErrorMessage(data.error, method))
    }

    if ('result' in data) {
      return (data.result ?? undefined) as T
    }
  }

  return data as T
}
