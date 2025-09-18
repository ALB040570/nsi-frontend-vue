import axios from 'axios'

const ABSOLUTE_URL_PATTERN = /^([a-z][a-z\d+\-.]*:)?\/\//i

function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '')
}

function ensureLeadingSlash(value: string): string {
  if (!value.startsWith('/')) {
    return `/${value}`
  }
  return value
}

function normalizeRelativeBase(value: string | undefined | null): string {
  const trimmed = value?.trim()
  if (!trimmed) {
    return '/api'
  }

  const withoutTrailing = stripTrailingSlashes(trimmed)
  if (!withoutTrailing) {
    return '/'
  }

  return ensureLeadingSlash(withoutTrailing)
}

function resolveBaseURL(): string {
  const rawBase = import.meta.env.VITE_API_BASE
  const devProxyBase = normalizeRelativeBase(import.meta.env.VITE_API_DEV_PROXY_BASE)

  if (!rawBase) {
    return devProxyBase
  }

  const trimmedBase = rawBase.trim()
  if (!trimmedBase) {
    return devProxyBase
  }

  if (ABSOLUTE_URL_PATTERN.test(trimmedBase)) {
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      try {
        const target = new URL(trimmedBase)
        if (target.origin !== window.location.origin) {
          return devProxyBase
        }
      } catch {
        return devProxyBase
      }
    }

    return stripTrailingSlashes(trimmedBase)
  }

  return normalizeRelativeBase(trimmedBase)
}

const baseURL = resolveBaseURL()
const rpcPath = import.meta.env.VITE_RPC_PATH ?? ''

export const api = axios.create({
  baseURL,
})

type RpcPayload<TParams> = {
  method: string
  params?: TParams
}

type RpcError = { message?: string } | string | null | undefined

type RpcEnvelope<TResult> =
  | { result: TResult; error?: undefined }
  | { result?: undefined; error: RpcError }
  | TResult

export async function callRpc<TResult, TParams = Record<string, unknown>>(
  method: string,
  params?: TParams,
): Promise<TResult> {
  const payload: RpcPayload<TParams> = { method, params }
  const { data } = await api.post<RpcEnvelope<TResult>>(rpcPath, payload)

  if (data && typeof data === 'object') {
    if ('error' in data && data.error) {
      const message =
        typeof data.error === 'string'
          ? data.error
          : data.error?.message ?? `RPC ${method} failed`
      throw new Error(message)
    }

    if ('result' in data) {
      return (data.result ?? undefined) as TResult
    }
  }

  return data as TResult
}
