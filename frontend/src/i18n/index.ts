import { createI18n } from 'vue-i18n'
import es from './locales/es'
import en from './locales/en'

const savedLocale = (localStorage.getItem('jj_locale') as 'es' | 'en') || 'es'

export const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'es',
  messages: {
    es,
    en,
  },
})

export default i18n
