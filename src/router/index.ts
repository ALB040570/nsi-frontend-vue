// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'

import { createAuthGuard } from './authGuard'

// временно используем существующий компонент, чтобы увидеть, что роутер работает
const Home = () => import('../components/HelloWorld.vue')
const ObjectTypesPage = () => import('../pages/nsi/ObjectTypesPage.vue')
const LoginPage = () => import('../pages/auth/LoginPage.vue')

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: Home },
    // сюда позже добавим страницы НСИ: /nsi/object-types и т.д.
    { path: '/nsi/object-types', name: 'object-types', component: ObjectTypesPage, meta: { requiresAuth: true } },
    { path: '/login', name: 'login', component: LoginPage },
  ],
})

router.beforeEach(createAuthGuard(router))

export default router
