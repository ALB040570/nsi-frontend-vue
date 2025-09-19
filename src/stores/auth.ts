import { defineStore } from 'pinia'
import { login as apiLogin, type LoginCredentials } from '@/lib/auth'
import { getCurUserInfo, type CurUser } from '@/lib/rpc'
import { parseTargets, can as canUtil, canAny as canAnyUtil } from '@/lib/permissions'

function sanitizeRedirect(path: unknown): string | null {
  if (typeof path !== 'string') return null
  if (!path.startsWith('/')) return null
  if (path.startsWith('//')) return null
  if (path === '/login') return null
  return path
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as CurUser | null,
    permissions: new Set<string>() as Set<string>,
    isAuthenticating: false,
    error: null as string | null,
    redirectPath: null as string | null,
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.user),
  },

  actions: {
    setRedirectPath(p: string | null) {
      this.redirectPath = sanitizeRedirect(p)
    },

    consumeRedirectPath() {
      const p = this.redirectPath
      this.redirectPath = null
      return p
    },

    clearError() {
      this.error = null
    },

    async login(dto: LoginCredentials) {
      this.isAuthenticating = true
      this.error = null

      try {
        const payload: LoginCredentials = {
          username: dto.username.trim(),
          password: dto.password,
        }

        await apiLogin(payload)
        await this.fetchMe()
        return { ok: true as const }
      } catch (e: any) {
        this.error = e?.message ?? '?????? ?????'
        throw e
      } finally {
        this.isAuthenticating = false
      }
    },

    async fetchMe() {
      const me = await getCurUserInfo()
      this.user = me
      this.permissions = parseTargets(me.target)
    },

    async logout() {
      // ??? ??????? /auth/logout ????? ??? ???
      this.user = null
      this.permissions = new Set<string>()
      this.redirectPath = null
      this.error = null
    },

    can(p: string) {
      return canUtil(this.permissions, p)
    },

    canAny(list: string[]) {
      return canAnyUtil(this.permissions, list)
    },
  },
})
