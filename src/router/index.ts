// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    public?: boolean
    layout?: 'auth' | 'default'
  }
}

const Home = () => import('@/components/HelloWorld.vue')
const ObjectTypesPage = () => import('@/pages/nsi/ObjectTypesPage.vue')
const LoginPage = () => import('@/pages/auth/LoginPage.vue')

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginPage,
      meta: { public: true, layout: 'auth' },
    },
    {
      path: '/',
      name: 'home',
      component: Home,
      meta: { requiresAuth: true },
    },
    {
      path: '/nsi/object-types',
      name: 'object-types',
      component: ObjectTypesPage,
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach(async (to, from) => {
  const auth = useAuthStore()

  if (!auth.initialized) {
    await auth.ensureSession()
  }

  if (to.meta.public) {
    if (to.name === 'login' && auth.isAuthenticated) {
      const redirect =
        typeof to.query.redirect === 'string' && to.query.redirect?.length
          ? to.query.redirect
          : (from.fullPath && from.fullPath !== '/login' ? from.fullPath : '/')
      return { path: redirect }
    }
    return true
  }

  if (auth.isAuthenticated) {
    return true
  }

  const redirect = to.fullPath && to.fullPath !== '/login' ? to.fullPath : undefined
  return {
    name: 'login',
    query: redirect ? { redirect } : undefined,
  }
})

export default router
