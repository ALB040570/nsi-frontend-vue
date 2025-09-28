/** Файл: src/shared/api/httpClient.ts
 *  Назначение: централизованные обёртки над axios-клиентом для REST-запросов.
 *  Использование: импортируйте функции get/post/put/delete/postForm вместо прямого обращения к api.
 */
import type { AxiosRequestConfig } from 'axios'
import { api } from '@/lib/api'

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
  body: URLSearchParams,
  config?: AxiosRequestConfig,
) {
  const requestConfig: AxiosRequestConfig = {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    responseType: 'text',
    transformResponse: (value) => value,
    ...config,
  }
  const { data } = await api.post<T>(url, body, requestConfig)
  return data
}
