import { createI18n } from 'vue-i18n'
import nsiRu from './nsi.ru.json'

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: 'ru',
  fallbackLocale: 'ru',
  messages: {
    ru: {
      // Namespace for NSI-specific translations
      nsi: nsiRu,
    },
  },
})

export type AppI18n = typeof i18n

