import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { useSessionStore } from '../stores/session.store'
import type { Hotel } from '@/features/hotels/domain/hotel.model'

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
      return s.estado === 'PROGRAMADA' && new Date(s.fechaHoraInicio) < now
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
      return s.citaVenta.estado === 'PROGRAMADA' && new Date(s.citaVenta.fechaHoraCita) < now
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
