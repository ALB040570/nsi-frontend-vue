/** Файл: src/main.ts
 *  Назначение: точка входа приложения Vue, подключает плагины и монтирует App.
 *  Использование: выполняется Vite при старте и в продакшн-сборке.
 */
import './assets/main.css'
import './assets/styles/service360.css'

import { createApp, h } from 'vue'
import { createPinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import {
  NConfigProvider,
  NDialogProvider,
  NLoadingBarProvider,
  NMessageProvider,
  NNotificationProvider,
  createDiscreteApi,
  dateRuRU,
  ruRU,
} from 'naive-ui'
import type { ConfigProviderProps, GlobalThemeOverrides } from 'naive-ui'

import App from './App.vue'
import router from './router'

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#006d77',
    primaryColorHover: '#338f94',
    primaryColorPressed: '#00565d',
    primaryColorSuppl: '#338f94',
    infoColor: '#4ecdc4',
    successColor: '#3b9d78',
    warningColor: '#e2b100',
    errorColor: '#d64550',
  },
}

const configProviderProps: ConfigProviderProps = {
  locale: ruRU,
  dateLocale: dateRuRU,
  themeOverrides,
}

const discreteApis = createDiscreteApi(['message', 'notification', 'dialog', 'loadingBar'], {
  configProviderProps,
})

const app = createApp({
  setup() {
    return () =>
      h(NConfigProvider, configProviderProps, {
        default: () =>
          h(NLoadingBarProvider, null, {
            default: () =>
              h(NDialogProvider, null, {
                default: () =>
                  h(NNotificationProvider, null, {
                    default: () => h(NMessageProvider, null, { default: () => h(App) }),
                  }),
              }),
          }),
      })
  },
})

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
})

const messageKey = Symbol('naive-message')
const notificationKey = Symbol('naive-notification')
const dialogKey = Symbol('naive-dialog')
const loadingBarKey = Symbol('naive-loading-bar')

app.provide(messageKey, discreteApis.message)
app.provide(notificationKey, discreteApis.notification)
app.provide(dialogKey, discreteApis.dialog)
app.provide(loadingBarKey, discreteApis.loadingBar)

app.use(createPinia())
app.use(VueQueryPlugin, { queryClient })
app.use(router)

app.mount('#app')
