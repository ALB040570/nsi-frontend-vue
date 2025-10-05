/** Файл: src/router/index.ts
 *  Назначение: конфигурация маршрутизатора приложения и guard-аутентификации.
 *  Использование: импортируйте router или installAppRouter из @app/router.
 */
import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@features/auth'

const Home = () => import('@pages/HomePage.vue')
const ObjectTypesPage = () => import('@pages/nsi/ObjectTypesPage.vue')
const ObjectDefectsPage = () => import('@pages/nsi/ObjectDefectsPage.vue')
const ObjectParametersPage = () => import('@pages/nsi/ObjectParametersPage.vue')
const LoginPage = () => import('@pages/auth/LoginPage.vue')

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: LoginPage },
    // { path: '/', name: 'home', component: Home, meta: { requiresAuth: true } },
    { path: '/', name: 'home', component: Home },
    {
      path: '/nsi/object-types',
      name: 'object-types',
      component: ObjectTypesPage,
      // meta: { requiresAuth: true },
    },
    {
      path: '/nsi/object-defects',
      name: 'object-defects',
      component: ObjectDefectsPage,
      // meta: { requiresAuth: true },
    },
    {
      path: '/nsi/object-parameters',
      name: 'object-parameters',
      component: ObjectParametersPage,
      // meta: { requiresAuth: true },
    },
  ],
})

function normalizeRedirect(value: unknown): string | null {
  if (typeof value !== 'string') return null
  if (!value.startsWith('/')) return null
  if (value.startsWith('//')) return null
  if (value === '/login') return null
  return value
}

router.beforeEach((to) => {
  const auth = useAuth()

  if (to.name === 'login') {
    const fromQuery = normalizeRedirect(to.query?.redirect)
    if (fromQuery) {
      auth.setRedirectPath(fromQuery)
    }

    if (auth.isAuthenticated.value) {
      const target = auth.consumeRedirectPath() ?? '/'
      return { path: target }
    }

    return true
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated.value) {
    // const target = normalizeRedirect(to.fullPath) ?? '/'
    // auth.setRedirectPath(target)

    // const query = target && target !== '/' ? { redirect: target } : undefined

    // return { name: 'login', query }
    return true
  }

  return true
})

export default router
