import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import ElementPlus from 'element-plus'
import ru from 'element-plus/es/locale/lang/ru'
import 'element-plus/dist/index.css'
import './assets/theme.css'
import './assets/styles/service360.css' // наши глобальные стили

import App from './App.vue'
import router from './router' // роутер нужен для наших страниц

const app = createApp(App)
// Pinia (глобальное хранилище)
app.use(createPinia())

// Vue Query (работа с серверными данными)
const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
})
app.use(VueQueryPlugin, { queryClient })

// Element Plus (UI-компоненты)
app.use(ElementPlus, { locale: ru })

// Router (навигация)
app.use(router)

app.mount('#app')
