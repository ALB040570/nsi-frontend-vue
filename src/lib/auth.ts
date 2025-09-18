import { callRpc } from './api'

export interface LoginPayload {
  login: string
  password: string
}

export interface AuthUser {
  id: string | number
  login: string
  name?: string | null
  displayName?: string | null
  roles?: string[]
  [key: string]: unknown
}

interface LoginResponseEnvelope {
  user?: AuthUser | null
  [key: string]: unknown
}

function extractUser(payload: AuthUser | LoginResponseEnvelope | null | undefined): AuthUser {
  if (payload && typeof payload === 'object' && 'user' in payload) {
    const value = (payload as LoginResponseEnvelope).user
    if (value) return value
  }

  if (payload && typeof payload === 'object') {
    return payload as AuthUser
  }

  throw new Error('Пустой ответ авторизации')
}

const LOGIN_METHOD = 'auth/login'
const LOGOUT_METHOD = 'auth/logout'
const CURRENT_USER_METHOD = 'auth/getCurrentUser'

export async function login(credentials: LoginPayload): Promise<AuthUser> {
  const response = await callRpc<AuthUser | LoginResponseEnvelope | null, LoginPayload>(
    LOGIN_METHOD,
    credentials,
  )
  return extractUser(response)
}

export async function logout(): Promise<void> {
  await callRpc<void>(LOGOUT_METHOD)
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await callRpc<AuthUser | LoginResponseEnvelope | null>(CURRENT_USER_METHOD)
    if (!response) return null
    return extractUser(response)
  } catch (error) {
    // если сессии нет, сервер может вернуть ошибку — не считаем это критичным
    console.warn('Не удалось получить информацию о текущем пользователе', error)
    return null
  }
}
