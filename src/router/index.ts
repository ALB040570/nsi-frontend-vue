import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const Home = () => import('../components/HelloWorld.vue')
const ObjectTypesPage = () => import('../pages/nsi/ObjectTypesPage.vue')
const LoginPage = () => import('../pages/auth/LoginPage.vue')

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: LoginPage },
    // { path: '/', name: 'home', component: Home, meta: { requiresAuth: true } },
    { path: '/', name: 'home', component: Home, props: { msg: 'Service 360' } },
    {
      path: '/nsi/object-types',
      name: 'object-types',
      component: ObjectTypesPage,
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
  const auth = useAuthStore()

  if (to.name === 'login') {
    const fromQuery = normalizeRedirect(to.query?.redirect)
    if (fromQuery) {
      auth.setRedirectPath(fromQuery)
    }

    if (auth.isAuthenticated) {
      const target = auth.consumeRedirectPath() ?? '/'
      return { path: target }
    }

    return true
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    // const target = normalizeRedirect(to.fullPath) ?? '/'
    // auth.setRedirectPath(target)

    // const query = target && target !== '/' ? { redirect: target } : undefined

    // return { name: 'login', query }
    return true
  }

  return true
})

export default router
