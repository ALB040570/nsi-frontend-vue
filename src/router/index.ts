// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'

// временно используем существующий компонент, чтобы увидеть, что роутер работает
const Home = () => import('../components/HelloWorld.vue')
const ObjectTypesPage = () => import('../pages/nsi/ObjectTypesPage.vue')

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: Home },
    // сюда позже добавим страницы НСИ: /nsi/object-types и т.д.
    { path: '/nsi/object-types', name: 'object-types', component: ObjectTypesPage },
  ],
})
