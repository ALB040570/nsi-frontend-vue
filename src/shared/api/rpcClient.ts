import { api } from './httpClient'

const DEFAULT_RPC_PATH = '/api/rpc'

function ensureApiPrefix(path: string): string {
  if (path === '/api') {
    return path
  }

  if (path.startsWith('/api/')) {
    return path
  }

  const withoutLeading = path.replace(/^\/+/, '')
  return `/api/${withoutLeading}`
}

function resolveRpcUrl(raw: string | undefined): string {
  const trimmed = raw?.trim()
  if (!trimmed) {
    return DEFAULT_RPC_PATH
  }

  const normalized = trimmed.startsWith('/') ? trimmed : '/' + trimmed
  return ensureApiPrefix(normalized)
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
  const endpoint = RPC_URL
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