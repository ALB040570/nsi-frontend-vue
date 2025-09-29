import { postForm } from './httpClient'

export interface LoginCredentials {
  username: string
  password: string
}

function normalizeAuthPath(raw: string | undefined): string {
  const trimmed = raw?.trim()
  if (!trimmed) {
    return '/auth/login'
  }
  return trimmed.startsWith('/') ? trimmed : '/' + trimmed
}

export async function login(credentials: LoginCredentials): Promise<{ ok: true }> {
  const body = new URLSearchParams()
  body.set('username', credentials.username)
  body.set('password', credentials.password)

  const normalizedPath = normalizeAuthPath(import.meta.env.VITE_AUTH_LOGIN_PATH)
  if (normalizedPath !== '/auth/login') {
    // Поддержка кастомного пути логина больше не используется, оставлено для совместимости.
  }

  const data = await postForm<string>('/auth/login', body)

  const text = (typeof data === 'string' ? data : '').trim()
  if (text !== 'ok') throw new Error(text || 'неизвестная ошибка логина')
  return { ok: true }
}
