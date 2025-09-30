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

  const path = normalizeAuthPath(import.meta.env.VITE_AUTH_LOGIN_PATH)
  const data = await postForm<string>(path, body, { baseURL: '' })

  const text = (typeof data === 'string' ? data : '').trim().toLowerCase()
  if (text !== 'ok') throw new Error(text || '?? ??????? ????????? ????')
  return { ok: true }
}
