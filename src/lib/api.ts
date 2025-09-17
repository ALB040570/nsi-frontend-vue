import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000'

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
  const { data } = await api.post<RpcEnvelope<TResult>>('/rpc', payload)

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
