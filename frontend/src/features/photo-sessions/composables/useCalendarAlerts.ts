import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { useSessionStore } from '../stores/session.store'
import type { Hotel } from '@/features/hotels/domain/hotel.model'
import { parseLocalDate } from '@/shared/date-utils'

export function useCalendarAlerts(
  userHotels: Ref<Hotel[]> | ComputedRef<Hotel[]>,
  selectedHotelIds: Ref<number[]>,
) {
  const sessionStore = useSessionStore()
  const activeAlertPanels = ref<string[]>([])

  const overdueSessions = computed(() => {
    const allowedHotelIds = new Set(userHotels.value.map((h) => Number(h.id)))
    const now = new Date()
    return sessionStore.sessions.filter((s) => {
      if (!allowedHotelIds.has(Number(s.hotelId))) return false
      if (
        selectedHotelIds.value.length > 0 &&
        !selectedHotelIds.value.includes(Number(s.hotelId))
      ) {
        return false
      }
      if (s.estado !== 'PROGRAMADA' || !s.fechaHoraInicio) return false
      const sDate = parseLocalDate(s.fechaHoraInicio)
      return Boolean(sDate && sDate < now)
    })
  })

  const missingSaleSessions = computed(() => {
    const allowedHotelIds = new Set(userHotels.value.map((h) => Number(h.id)))
    const ESTADOS_NO_PERMITIDOS = ['CANCELADA', 'NO_SHOW']
    return sessionStore.sessions.filter((s) => {
      if (!allowedHotelIds.has(Number(s.hotelId))) return false
      if (
        selectedHotelIds.value.length > 0 &&
        !selectedHotelIds.value.includes(Number(s.hotelId))
      ) {
        return false
      }
      return !ESTADOS_NO_PERMITIDOS.includes(s.estado) && !s.citaVenta
    })
  })

  const overdueSales = computed(() => {
    const allowedHotelIds = new Set(userHotels.value.map((h) => Number(h.id)))
    const now = new Date()
    return sessionStore.sessions.filter((s) => {
      if (!allowedHotelIds.has(Number(s.hotelId))) return false
      if (
        selectedHotelIds.value.length > 0 &&
        !selectedHotelIds.value.includes(Number(s.hotelId))
      ) {
        return false
      }
      if (!s.citaVenta) return false
      if (s.citaVenta.estado !== 'PROGRAMADA' || !s.citaVenta.fechaHoraCita) return false
      const cDate = parseLocalDate(s.citaVenta.fechaHoraCita)
      return Boolean(cDate && cDate < now)
    })
  })

  const totalAlertsCount = computed(() => {
    return (
      overdueSessions.value.length +
      missingSaleSessions.value.length +
      overdueSales.value.length
    )
  })

  return {
    activeAlertPanels,
    overdueSessions,
    missingSaleSessions,
    overdueSales,
    totalAlertsCount,
  }
}
