import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useHotelStore } from '@/features/hotels/stores/hotel.store'
import { useSaleStore } from '@/features/sales/stores/sale.store'

const STORAGE_KEY = 'jj_selected_hotel_id'

export function useCalendarScope() {
  const route = useRoute()
  const authStore = useAuthStore()
  const hotelStore = useHotelStore()
  const saleStore = useSaleStore()

  const selectedHotelId = ref<number | null>(null)

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

  // Current active hotel name
  const selectedHotelName = computed(() => {
    const target = hotelStore.hotels.find((h) => h.id === selectedHotelId.value)
    return target ? target.nombre : 'Todos los Hoteles'
  })

  function initSelectedHotel() {
    // 1. Si existe parámetro hotelId en la URL y es válido para el usuario, tiene máxima prioridad
    const queryHotelId = route.query.hotelId ? Number(route.query.hotelId) : null
    if (queryHotelId && userHotels.value.some((h) => Number(h.id) === queryHotelId)) {
      selectedHotelId.value = queryHotelId
      localStorage.setItem(STORAGE_KEY, String(queryHotelId))
      return
    }

    // 2. Si no hay parámetro en la URL, se restaura desde localStorage si existe y es válido
    const savedHotelIdStr = localStorage.getItem(STORAGE_KEY)
    if (savedHotelIdStr) {
      const savedHotelId = Number(savedHotelIdStr)
      if (!isNaN(savedHotelId) && userHotels.value.some((h) => Number(h.id) === savedHotelId)) {
        selectedHotelId.value = savedHotelId
        return
      }
    }

    // 3. Por defecto permanece vacío (null)
    selectedHotelId.value = null
  }

  watch(
    () => route.query.hotelId,
    () => {
      initSelectedHotel()
    },
  )

  watch(
    () => selectedHotelId.value,
    (newHotelId) => {
      if (newHotelId) {
        localStorage.setItem(STORAGE_KEY, String(newHotelId))
        saleStore.fetchCitasVenta(Number(newHotelId))
      } else {
        localStorage.removeItem(STORAGE_KEY)
        saleStore.fetchCitasVenta()
      }
    },
  )

  return {
    currentUser,
    userHotels,
    selectedHotelId,
    selectedHotelName,
    initSelectedHotel,
  }
}
