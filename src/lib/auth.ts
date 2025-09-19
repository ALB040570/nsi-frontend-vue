import type { AxiosError } from 'axios'
import { api } from './api'

export interface LoginCredentials {
  username: string // если бек ждёт "login", маппинг ниже это учтёт
  password: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken?: string | null
  [key: string]: unknown
}

export interface AuthUser {
  id: string | number
  email?: string
  name?: string
  firstName?: string
  lastName?: string
  fullName?: string
  [key: string]: unknown
}

export interface AuthResponse {
  user: AuthUser
  tokens: AuthTokens
}

const ABSOLUTE_URL_PATTERN = /^([a-z][a-z\d+\-.]*:)?\/\//i

function normalizeRelativePath(path: string | undefined | null): string {
  const trimmed = path?.trim()
  if (!trimmed) return '/auth/login'
  const p = trimmed.replace(/\/+$/, '')
  return p.startsWith('/') ? p : `/${p}`
}

function resolveLoginPath(): string {
  const raw = import.meta.env.VITE_AUTH_LOGIN_PATH as string | undefined
  if (raw && ABSOLUTE_URL_PATTERN.test(raw)) return raw // абсолютный URL — используем как есть
  return normalizeRelativePath(raw)
}

const loginPath = resolveLoginPath()

export async function login(credentials: LoginCredentials): Promise<{ ok: true }> {
  const body = new URLSearchParams()
  body.set('username', credentials.username) // если бек ждёт "login", замени ключ
  body.set('password', credentials.password)

  const { data } = await api.post<string>(
    import.meta.env.VITE_AUTH_LOGIN_PATH || '/auth/login',
    body,
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      responseType: 'text',
      transformResponse: (v) => v, // не парсить как JSON
    },
  )

  const text = (typeof data === 'string' ? data : '').trim().toLowerCase()
  if (text !== 'ok') throw new Error(text || 'Не удалось выполнить вход')
  return { ok: true }
}

export function extractAuthErrorMessage(
  error: unknown,
  fallbackMessage = 'Не удалось выполнить вход',
): string {
  const fallback = fallbackMessage || 'Не удалось выполнить вход'
  const asAny = error as Partial<AxiosError<{ message?: string; error?: string }>> | undefined

  if (asAny?.response?.data) {
    const rd = asAny.response.data
    if (typeof rd === 'string' && rd.trim()) return rd
    if (typeof rd === 'object') {
      if (rd?.message) return rd.message
      if (rd?.error) return rd.error
    }
  }
  if ((asAny as any)?.message) return (asAny as any).message as string

  if (error && typeof error === 'object' && 'message' in error) {
    const m = (error as { message?: unknown }).message
    if (typeof m === 'string' && m) return m
  }
  return fallback
}
export { getCurUserInfo } from './rpc'
export type { CurUser } from './rpc'
