import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000'

export const api = axios.create({
  baseURL,
})

export interface JsonRpcResponse<TResult> {
  result: TResult
  error?: unknown
}

export async function callRpc<TResult = unknown>(
  method: string,
  params?: unknown[],
): Promise<TResult> {
  const { data } = await api.post<JsonRpcResponse<TResult>>('', {
    method,
    params,
  })

  if (data.error !== undefined && data.error !== null) {
    throw data.error
  }

  return data.result
}
