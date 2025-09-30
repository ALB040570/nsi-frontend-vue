import { api } from './httpClient'

function resolveRpcUrl(raw: string | undefined): string {
  const trimmed = raw?.trim()
  if (!trimmed) {
    return '/api'
  }

  const normalized = trimmed.startsWith('/') ? trimmed : '/' + trimmed
  const lower = normalized.toLowerCase()
  if (lower === '/api') {
    return '/api'
  }

  if (lower.startsWith('/api/')) {
    return '/api' + normalized.slice(4)
  }

  return normalized
}

const RPC_URL = resolveRpcUrl(import.meta.env.VITE_RPC_PATH)

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
  if (!error) return 'RPC ' + method + ' failed'
  if (typeof error === 'string') return error
  return error.message || 'RPC ' + method + ' failed'
}

export async function rpc<T = unknown, TParams = unknown>(
  method: string,
  params?: TParams,
): Promise<T> {
  const payload: RpcPayload<TParams> = { method, params }
  const endpoint = RPC_URL.startsWith('/api') ? RPC_URL : `/api${RPC_URL}`
  const { data } = await api.post<RpcEnvelope<T>>(endpoint, payload)

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