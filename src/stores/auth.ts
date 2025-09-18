import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '@/lib/api'
import {
  extractAuthErrorMessage,
  login as requestLogin,
  type AuthResponse,
  type AuthTokens,
  type AuthUser,
  type LoginCredentials,
} from '@/lib/auth'

const STORAGE_KEY = 's360-auth'

interface StoredAuthState {
  user: AuthUser
  tokens: AuthTokens
}

const isBrowser = typeof window !== 'undefined'

function sanitizeRedirect(path: unknown): string | null {
  if (typeof path !== 'string') return null
  if (!path.startsWith('/')) return null
  if (path.startsWith('//')) return null
  if (path === '/login') return null
  return path
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const tokens = ref<AuthTokens | null>(null)
  const redirectPath = ref<string | null>(null)
  const isAuthenticating = ref(false)
  const error = ref<string | null>(null)

  const accessToken = computed(() => tokens.value?.accessToken ?? null)
  const refreshToken = computed(() => tokens.value?.refreshToken ?? null)
  const isAuthenticated = computed(() => Boolean(accessToken.value && user.value))

  const applyAccessToken = (token: string | null) => {
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`
    } else {
      delete api.defaults.headers.common.Authorization
    }
  }

  const persist = () => {
    if (!isBrowser) return
    if (isAuthenticated.value && user.value && tokens.value) {
      const payload: StoredAuthState = {
        user: user.value,
        tokens: tokens.value,
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } else {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }

  const setSession = (nextUser: AuthUser | null, nextTokens: AuthTokens | null) => {
    user.value = nextUser
    tokens.value = nextTokens
    applyAccessToken(nextTokens?.accessToken ?? null)
    persist()
  }

  if (isBrowser) {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as StoredAuthState
        if (parsed?.user && parsed?.tokens?.accessToken) {
          user.value = parsed.user
          tokens.value = parsed.tokens
          applyAccessToken(parsed.tokens.accessToken)
        } else {
          window.localStorage.removeItem(STORAGE_KEY)
        }
      } catch (parseError) {
        console.warn('Не удалось восстановить сессию пользователя', parseError)
        window.localStorage.removeItem(STORAGE_KEY)
      }
    }
  }

  const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    isAuthenticating.value = true
    error.value = null

    try {
      const payload: LoginCredentials = {
        username: credentials.username.trim(),
        password: credentials.password,
      }

      const response = await requestLogin(payload)
      const { user: nextUser, tokens: nextTokens } = response

      setSession(nextUser, nextTokens)

      return response
    } catch (err) {
      const message = extractAuthErrorMessage(err)
      error.value = message
      throw new Error(message)
    } finally {
      isAuthenticating.value = false
    }
  }

  const logout = () => {
    setSession(null, null)
    redirectPath.value = null
    error.value = null
  }

  const setRedirectPath = (path: string | null) => {
    redirectPath.value = sanitizeRedirect(path)
  }

  const consumeRedirectPath = () => {
    const path = redirectPath.value
    redirectPath.value = null
    return path
  }

  const clearError = () => {
    error.value = null
  }

  return {
    user,
    tokens,
    accessToken,
    refreshToken,
    isAuthenticated,
    isAuthenticating,
    error,
    redirectPath,
    login,
    logout,
    setRedirectPath,
    consumeRedirectPath,
    clearError,
  }
})
