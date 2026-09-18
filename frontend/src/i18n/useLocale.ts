import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'

import epEs from 'element-plus/es/locale/lang/es'
import epEn from 'element-plus/es/locale/lang/en'

export type SupportedLocale = 'es' | 'en'

const EP_LOCALES = {
  es: epEs,
  en: epEn,
}

export const FC_LOCALES = {
  es: {
    code: 'es',
    week: { dow: 1, doy: 4 },
    buttonText: {
      prev: 'Ant',
      next: 'Sig',
      today: 'Hoy',
      month: 'Mes',
      week: 'Semana',
      day: 'Día',
      list: 'Agenda',
    },
    weekText: 'Sm',
    allDayText: 'Todo el día',
    moreLinkText: 'más',
    noEventsText: 'No hay sesiones registradas',
  },
  en: {
    code: 'en',
    week: { dow: 1, doy: 4 },
    buttonText: {
      prev: 'Prev',
      next: 'Next',
      today: 'Today',
      month: 'Month',
      week: 'Week',
      day: 'Day',
      list: 'List',
    },
    weekText: 'Wk',
    allDayText: 'All day',
    moreLinkText: 'more',
    noEventsText: 'No sessions registered',
  },
}

export function useLocale() {
  const { locale, t } = useI18n()

  const currentLocale = computed<SupportedLocale>({
    get: () => (locale.value as SupportedLocale) || 'es',
    set: (val: SupportedLocale) => {
      setLocale(val)
    },
  })

  const elementPlusLocale = computed(() => EP_LOCALES[currentLocale.value] || EP_LOCALES.es)

  const fullCalendarLocale = computed(() => FC_LOCALES[currentLocale.value] || FC_LOCALES.es)

  function setLocale(lang: SupportedLocale) {
    locale.value = lang
    localStorage.setItem('jj_locale', lang)
    dayjs.locale(lang)
  }

  // Sincronizar dayjs ante cualquier reactividad
  watch(
    locale,
    (newLang) => {
      dayjs.locale(newLang)
    },
    { immediate: true },
  )

  return {
    locale: currentLocale,
    t,
    elementPlusLocale,
    fullCalendarLocale,
    setLocale,
  }
}
