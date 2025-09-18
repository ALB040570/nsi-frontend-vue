import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { AuthUser, LoginPayload } from '@/lib/auth'
import { getCurrentUser, login as loginRpc, logout as logoutRpc } from '@/lib/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const loginPending = ref(false)
  const sessionLoading = ref(false)
  const initialized = ref(false)
  const error = ref<string | null>(null)

  let sessionPromise: Promise<AuthUser | null> | null = null

  const isAuthenticated = computed(() => !!user.value)

  async function ensureSession(force = false): Promise<AuthUser | null> {
    if (!force && initialized.value) return user.value
    if (!force && sessionPromise) return sessionPromise

    sessionLoading.value = true
    sessionPromise = (async () => {
      try {
        const current = await getCurrentUser()
        user.value = current
        return user.value
      } catch (err) {
        user.value = null
        throw err
      } finally {
        sessionLoading.value = false
        initialized.value = true
        sessionPromise = null
      }
    })()

    try {
      return await sessionPromise
    } catch (err) {
      console.warn('Ошибка при проверке сессии', err)
      return null
    }
  }

  async function login(payload: LoginPayload): Promise<AuthUser> {
    loginPending.value = true
    error.value = null
    try {
      const result = await loginRpc(payload)
      user.value = result
      initialized.value = true
      return result
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Не удалось выполнить вход. Попробуйте ещё раз.'
      error.value = message
      throw err instanceof Error ? err : new Error(message)
    } finally {
      loginPending.value = false
    }
  }

  async function logout(): Promise<void> {
    try {
      await logoutRpc()
    } catch (err) {
      console.warn('Ошибка при выходе из системы', err)
    } finally {
      user.value = null
      initialized.value = true
    }
  }

  function setUser(next: AuthUser | null) {
    user.value = next
  }

  function clearError() {
    error.value = null
  }

  return {
    user,
    loginPending,
    sessionLoading,
    initialized,
    error,
    isAuthenticated,
    ensureSession,
    login,
    logout,
    setUser,
    clearError,
  }
})
