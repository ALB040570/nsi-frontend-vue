import type {
  LocationQueryRaw,
  NavigationGuardNext,
  RouteLocationNormalized,
  Router,
} from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import { DEFAULT_REDIRECT_PATH, resolveSafeRedirect } from './safeRedirect'

export const LOGIN_ROUTE_NAME = 'login'

export type AuthGuard = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext,
) => void

function isLoginRoute(to: RouteLocationNormalized) {
  return to.name === LOGIN_ROUTE_NAME || to.path === '/login'
}

function buildRedirectFallback(router: Router, to: RouteLocationNormalized): string {
  const fallbackQuery: LocationQueryRaw = { ...to.query }
  delete fallbackQuery.redirect

  try {
    const fallbackLocation = router.resolve({ path: to.path, query: fallbackQuery })
    return fallbackLocation.fullPath || to.path || DEFAULT_REDIRECT_PATH
  } catch (error) {
    return to.path || DEFAULT_REDIRECT_PATH
  }
}

export function createAuthGuard(router: Router): AuthGuard {
  return (to, from, next) => {
    const authStore = useAuthStore()
    const requiresAuth = Boolean(to.meta.requiresAuth)

    if (requiresAuth && !authStore.isAuthenticated) {
      const fallback = buildRedirectFallback(router, to)
      const safeRedirect = resolveSafeRedirect(router, to.query.redirect, fallback)

      next({ name: LOGIN_ROUTE_NAME, query: { redirect: safeRedirect } })
      return
    }

    if (authStore.isAuthenticated && isLoginRoute(to)) {
      let safeRedirect = resolveSafeRedirect(router, to.query.redirect, DEFAULT_REDIRECT_PATH)
      const resolvedRedirect = router.resolve(safeRedirect)

      if (isLoginRoute(resolvedRedirect)) {
        safeRedirect = DEFAULT_REDIRECT_PATH
      }

      next(safeRedirect)
      return
    }

    next()
  }
}
