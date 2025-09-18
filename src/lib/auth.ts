import type { AxiosError } from 'axios'
import { api } from './api'

export interface LoginCredentials {
  username: string
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
  if (!trimmed) return 'auth/login'
  const withoutLeadingSlashes = trimmed.replace(/^\/+/, '')
  return withoutLeadingSlashes || 'auth/login'
}

function joinWithBase(baseURL: string | undefined, path: string): string {
  const normalizedBase = baseURL?.replace(/\/+$/, '')
  if (!normalizedBase) return path
  return `${normalizedBase}/${path.replace(/^\/+/, '')}`
}

function resolveLoginPath(): string {
  const rawPath = import.meta.env.VITE_AUTH_LOGIN_PATH

  if (rawPath && ABSOLUTE_URL_PATTERN.test(rawPath)) {
    return rawPath
  }

  const baseURL = api.defaults.baseURL ?? ''
  const relativePath = normalizeRelativePath(rawPath)

  return joinWithBase(baseURL, relativePath)
}

const loginPath = resolveLoginPath()

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>(loginPath, credentials)
  return data
}

export function extractAuthErrorMessage(
  error: unknown,
  fallbackMessage = 'Не удалось выполнить вход',
): string {
  const fallback = fallbackMessage || 'Не удалось выполнить вход'

  const asAny = error as Partial<AxiosError<{ message?: string; error?: string }>> | undefined

  if (asAny?.response?.data) {
    const responseData = asAny.response.data

    if (typeof responseData === 'string' && responseData.trim()) {
      return responseData
    }

    if (typeof responseData === 'object') {
      if (responseData?.message) return responseData.message
      if (responseData?.error) return responseData.error
    }
  }

  if (asAny?.message) {
    return asAny.message
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message) {
      return message
    }
  }

  return fallback
}
