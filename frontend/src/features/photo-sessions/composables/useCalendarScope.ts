import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useHotelStore } from '@/features/hotels/stores/hotel.store'

const STORAGE_KEY = 'jj_selected_hotel_ids'
const LEGACY_STORAGE_KEY = 'jj_selected_hotel_id'

export function useCalendarScope() {
  const route = useRoute()
  const authStore = useAuthStore()
  const hotelStore = useHotelStore()

  const selectedHotelIds = ref<number[]>([])

  // Current user context
  const currentUser = computed(() => authStore.user)

  // Hotels list accessible by current user based on role matrix
  const userHotels = computed(() => {
    const user = currentUser.value
    if (!user) return hotelStore.hotels

    const roleCode = user.roleCode?.toUpperCase()
    // SUPERUSUARIO, ADMIN, CONTABLE have global access to all hotels
    if (roleCode === 'SUPERUSUARIO' || roleCode === 'ADMIN' || roleCode === 'CONTABLE') {
      return hotelStore.hotels
    }

    // GERENTE has access to all hotels within their assigned area(s)
    if (roleCode === 'GERENTE') {
      const areaIds = new Set(user.areaIds || [])
      return hotelStore.hotels.filter((h) => areaIds.has(h.areaId))
    }

    // SUPERVISOR, FOTOGRAFO, AGENDADOR have access only to explicitly assigned hotels
    const userHotelIds = new Set(user.hotelIds || [])
    return hotelStore.hotels.filter((h) => userHotelIds.has(h.id))
  })

  // Current active hotel name or summary
  const selectedHotelName = computed(() => {
    if (userHotels.value.length === 1 && userHotels.value[0]) {
      return userHotels.value[0].nombre
    }

    if (selectedHotelIds.value.length === 0) {
      return 'Todos los Hoteles'
    }

    if (selectedHotelIds.value.length === 1) {
      const target = userHotels.value.find((h) => h.id === selectedHotelIds.value[0])
      return target ? target.nombre : 'Todos los Hoteles'
    }

    if (selectedHotelIds.value.length === userHotels.value.length) {
      return 'Todos los Hoteles'
    }

    const selectedNames = userHotels.value
      .filter((h) => selectedHotelIds.value.includes(h.id))
      .map((h) => h.nombre)

    if (selectedNames.length <= 2) {
      return selectedNames.join(', ')
    }

    return `${selectedNames.length} hoteles seleccionados`
  })

  function initSelectedHotel() {
    const validHotelIds = new Set(userHotels.value.map((h) => Number(h.id)))

    // 0. Si el usuario solo tiene 1 hotel asignado, se auto-selecciona ese único hotel
    if (userHotels.value.length === 1 && userHotels.value[0]) {
      selectedHotelIds.value = [userHotels.value[0].id]
      return
    }

    // 1. Si existe parámetro en la URL (hotelId o hotelIds)
    const queryParam = route.query.hotelIds || route.query.hotelId
    if (queryParam) {
      let candidateIds: number[] = []
      if (Array.isArray(queryParam)) {
        candidateIds = queryParam.map((val) => Number(val)).filter((n) => !isNaN(n))
      } else if (typeof queryParam === 'string') {
        candidateIds = queryParam
          .split(',')
          .map((val) => Number(val.trim()))
          .filter((n) => !isNaN(n))
      }
      const filtered = candidateIds.filter((id) => validHotelIds.has(id))
      if (filtered.length > 0) {
        selectedHotelIds.value = filtered
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
        return
      }
    }

    // 2. Si no hay parámetro en la URL, se restaura desde localStorage
    const savedStr = localStorage.getItem(STORAGE_KEY)
    if (savedStr) {
      try {
        const parsed = JSON.parse(savedStr)
        if (Array.isArray(parsed)) {
          const filtered = parsed.map(Number).filter((id) => validHotelIds.has(id))
          if (filtered.length > 0) {
            selectedHotelIds.value = filtered
            return
          }
        }
      } catch {
        const parsed = savedStr.split(',').map(Number).filter((id) => validHotelIds.has(id))
        if (parsed.length > 0) {
          selectedHotelIds.value = parsed
          return
        }
      }
    }

    // Soporte para migración de clave previa
    const legacySavedId = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacySavedId) {
      const numId = Number(legacySavedId)
      if (!isNaN(numId) && validHotelIds.has(numId)) {
        selectedHotelIds.value = [numId]
        localStorage.setItem(STORAGE_KEY, JSON.stringify([numId]))
        localStorage.removeItem(LEGACY_STORAGE_KEY)
        return
      }
    }

    // 3. Por defecto permanece vacío (significa todos los hoteles del usuario)
    selectedHotelIds.value = []
  }

  watch(
    () => [route.query.hotelId, route.query.hotelIds],
    () => {
      initSelectedHotel()
    },
  )

  watch(
    () => userHotels.value,
    () => {
      if (userHotels.value.length === 1 && userHotels.value[0]) {
        selectedHotelIds.value = [userHotels.value[0].id]
      } else if (selectedHotelIds.value.length > 0) {
        const validHotelIds = new Set(userHotels.value.map((h) => Number(h.id)))
        selectedHotelIds.value = selectedHotelIds.value.filter((id) => validHotelIds.has(id))
      }
    },
    { immediate: true },
  )

  watch(
    () => selectedHotelIds.value,
    (newIds) => {
      if (newIds && newIds.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newIds))
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    },
    { deep: true },
  )

  return {
    currentUser,
    userHotels,
    selectedHotelIds,
    selectedHotelName,
    initSelectedHotel,
  }
}
