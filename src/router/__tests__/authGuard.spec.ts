import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createMemoryHistory,
  createRouter,
  type NavigationGuardNext,
  type RouteLocationNormalized,
} from 'vue-router'
import { setActivePinia, createPinia } from 'pinia'

import { createAuthGuard, LOGIN_ROUTE_NAME } from '@/router/authGuard'
import { useAuthStore } from '@/stores/auth'

const DummyComponent = { template: '<div />' }

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: DummyComponent },
      { path: '/login', name: LOGIN_ROUTE_NAME, component: DummyComponent },
      {
        path: '/protected',
        name: 'protected',
        component: DummyComponent,
        meta: { requiresAuth: true },
      },
    ],
  })
}

describe('auth navigation guard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('prevents external redirects when navigating away from login after authentication', () => {
    const router = createTestRouter()
    const guard = createAuthGuard(router)
    const authStore = useAuthStore()
    authStore.login()

    const next = vi.fn() as unknown as NavigationGuardNext
    const to = router.resolve({ name: LOGIN_ROUTE_NAME, query: { redirect: 'https://example.com' } })

    guard(to as RouteLocationNormalized, router.resolve('/') as RouteLocationNormalized, next)

    expect(next).toHaveBeenCalledWith('/')
  })

  it('falls back to home when redirect points back to login', () => {
    const router = createTestRouter()
    const guard = createAuthGuard(router)
    const authStore = useAuthStore()
    authStore.login()

    const next = vi.fn() as unknown as NavigationGuardNext
    const to = router.resolve({ name: LOGIN_ROUTE_NAME, query: { redirect: '/login' } })

    guard(to as RouteLocationNormalized, router.resolve('/') as RouteLocationNormalized, next)

    expect(next).toHaveBeenCalledWith('/')
  })

  it('sanitizes redirect query when sending unauthenticated users to login', () => {
    const router = createTestRouter()
    const guard = createAuthGuard(router)
    const authStore = useAuthStore()
    authStore.logout()

    const next = vi.fn() as unknown as NavigationGuardNext
    const to = router.resolve({ name: 'protected', query: { redirect: 'https://example.com' } })

    guard(to as RouteLocationNormalized, router.resolve('/') as RouteLocationNormalized, next)

    expect(next).toHaveBeenCalledWith({
      name: LOGIN_ROUTE_NAME,
      query: { redirect: '/protected' },
    })
  })
})
