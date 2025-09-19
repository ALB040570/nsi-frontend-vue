import { api } from './api'

export interface LoginCredentials {
  username: string
  password: string
}

export async function login(credentials: LoginCredentials): Promise<{ ok: true }> {
  const body = new URLSearchParams()
  body.set('username', credentials.username)
  body.set('password', credentials.password)

  const { data } = await api.post<string>(
    import.meta.env.VITE_AUTH_LOGIN_PATH || '/auth/login',
    body,
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      responseType: 'text',
      transformResponse: (v) => v,
    },
  )

  const text = (typeof data === 'string' ? data : '').trim().toLowerCase()
  if (text !== 'ok') throw new Error(text || '?? ??????? ????????? ????')
  return { ok: true }
}
