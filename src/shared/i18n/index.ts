import { createI18n } from 'vue-i18n'
import nsiRu from './nsi.ru.json'
import nsiComponentsRu from './nsi.components.ru.json'

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: 'ru',
  fallbackLocale: 'ru',
  messages: {
    ru: {
      // Namespace for NSI-specific translations (merged with overrides)
      nsi: {
        ...(nsiRu as any),
        // shallow merge on root, deep merge for objectTypes
        objectTypes: {
          ...(nsiRu as any).objectTypes,
          ...(nsiComponentsRu as any).objectTypes,
        },
      },
    },
  },
})

export type AppI18n = typeof i18n
