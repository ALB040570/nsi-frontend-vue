/** Файл: src/shared/api/httpClient.ts
 *  Назначение: централизованный HTTP-клиент (axios-инстанс + обёртки для REST и форм).
 *  Использование: импортируйте api/get/post/... вместо прямого обращения к axios.
 */
import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig } from 'axios'

export const api: AxiosInstance = axios.create({
  baseURL: '/',
  withCredentials: true,
})

export async function get<T>(url: string, config?: AxiosRequestConfig) {
  const { data } = await api.get<T>(url, config)
  return data
}

export async function post<T, P = unknown>(url: string, payload?: P, config?: AxiosRequestConfig) {
  const { data } = await api.post<T>(url, payload, config)
  return data
}

export async function put<T, P = unknown>(url: string, payload?: P, config?: AxiosRequestConfig) {
  const { data } = await api.put<T>(url, payload, config)
  return data
}

export async function del<T>(url: string, config?: AxiosRequestConfig) {
  const { data } = await api.delete<T>(url, config)
  return data
}

export async function postForm<T>(
  url: string,
  body: URLSearchParams | FormData,
  config?: AxiosRequestConfig,
) {
  const requestConfig: AxiosRequestConfig = {
    ...config,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(config?.headers ?? {}),
    },
  }
  const { data } = await api.post<T>(url, body, requestConfig)
  return data
}
