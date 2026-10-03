import { ref, computed, watch, onMounted, type Ref, type ComputedRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useLocale } from '@/i18n/useLocale'
import { useSaleStore } from '../stores/sale.store'
import { useHotelStore } from '@/features/hotels/stores/hotel.store'
import { useUserStore } from '@/features/users/stores/user.store'
import { useProfileStore } from '@/features/users/stores/profile.store'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { MODO_COBRO_OPTIONS } from '../domain/sale.model'
import type { Hotel } from '@/features/hotels/domain/hotel.model'

export interface DirectSaleFormData {
  hotelId: number
  vendedorId: string | null
  numFotosVendidas: number | null
  totalVentaUsd: number | null
  modoCobro: string | null
  pagos: Array<{ metodoPago: string; importeUsd: number | null }>
  notas: string
}

export interface SellerUser {
  id: string
  nombre: string
  email: string
  avatar: string | null
  color: string | null
  role: string
}

export interface DirectSaleFormContext {
  formData: Ref<DirectSaleFormData>
  isSaving: Ref<boolean>
  userHotels: ComputedRef<Hotel[]>
  selectedHotel: ComputedRef<Hotel | undefined>
  sellers: ComputedRef<SellerUser[]>
  selectedSeller: ComputedRef<SellerUser | undefined>
  modoCobroOptions: ComputedRef<Array<{ value: string; label: string }>>
  totalCalculado: ComputedRef<number>
  canAddPago: ComputedRef<boolean>
  addPago: () => void
  removePago: (index: number) => void
  isSubmitDisabled: ComputedRef<boolean>
  handleGoBack: () => void
  handleSave: () => Promise<void>
  t: (key: string, values?: Record<string, unknown>) => string
}

export const MAX_PAGOS = 4

export function useDirectSaleForm(): DirectSaleFormContext {
  const route = useRoute()
  const router = useRouter()
  const { t } = useLocale()

  const saleStore = useSaleStore()
  const hotelStore = useHotelStore()
  const userStore = useUserStore()
  const profileStore = useProfileStore()
  const authStore = useAuthStore()

  const isSaving = ref(false)

  const formData = ref<DirectSaleFormData>({
    hotelId: 0,
    vendedorId: null,
    numFotosVendidas: 1,
    totalVentaUsd: null,
    modoCobro: null,
    pagos: [{ metodoPago: 'tarjeta', importeUsd: null }],
    notas: '',
  })

  const currentUser = computed(() => authStore.user)

  // Hoteles a los que tiene acceso el usuario según matriz de roles
  const userHotels = computed(() => {
    const user = currentUser.value
    if (!user) return hotelStore.hotels

    const roleCode = user.roleCode?.toUpperCase()
    if (roleCode === 'SUPERUSUARIO' || roleCode === 'ADMIN') {
      return hotelStore.hotels
    }

    if (roleCode === 'GERENTE' || roleCode === 'CONTABLE') {
      const areaIds = new Set(user.areaIds || [])
      return hotelStore.hotels.filter((h) => areaIds.has(h.areaId))
    }

    const userHotelIds = new Set(user.hotelIds || [])
    return hotelStore.hotels.filter((h) => userHotelIds.has(h.id))
  })

  const selectedHotel = computed(() =>
    userHotels.value.find((h) => Number(h.id) === Number(formData.value.hotelId)),
  )

  // Vendedores disponibles en el hotel seleccionado (Fotógrafos, Agendadores, Supervisores)
  const sellers = computed<SellerUser[]>(() => {
    const selectedHotelId = Number(formData.value.hotelId)
    if (!selectedHotelId) return []

    return userStore.usersWithProfile
      .filter((u) => {
        if (u.status === 'Inactivo') return false
        const perfilCode =
          u.perfil?.code?.toUpperCase() ||
          profileStore.getProfileById(u.profileId)?.code?.toUpperCase()
        const allowedRoles = ['AGENDADOR', 'FOTOGRAFO', 'SUPERVISOR']
        if (!allowedRoles.includes(perfilCode || '')) return false
        const assignedHotelIds = u.hotelIds || []
        return assignedHotelIds.some((hId) => Number(hId) === selectedHotelId)
      })
      .map((u) => {
        const perfilCode =
          u.perfil?.code?.toUpperCase() ||
          profileStore.getProfileById(u.profileId)?.code?.toUpperCase() ||
          ''
        const fullName = `${u.nombre || ''} ${u.apellidos || ''}`.trim()
        return {
          id: String(u.id),
          nombre: fullName || u.nombre || 'Usuario',
          email: u.email,
          avatar: u.imagen || null,
          color: u.color || null,
          role: perfilCode,
        }
      })
  })

  const selectedSeller = computed(() =>
    sellers.value.find((s) => String(s.id) === String(formData.value.vendedorId)),
  )

  // Auto-seleccionar vendedor cuando cambia la lista de vendedores
  watch(
    sellers,
    (newList) => {
      if (newList.length === 0) {
        formData.value.vendedorId = null
        return
      }

      // Si el vendedor actual ya está en la lista, conservarlo
      const currentValid = newList.some((s) => String(s.id) === String(formData.value.vendedorId))
      if (currentValid) return

      // Priorizar el usuario actualmente logueado si es vendedor en este hotel
      const currentUserId = String(currentUser.value?.id || '')
      const isCurrentUserSeller = newList.some((s) => String(s.id) === currentUserId)
      if (isCurrentUserSeller) {
        formData.value.vendedorId = currentUserId
        return
      }

      // De lo contrario, seleccionar el primer vendedor disponible
      if (newList[0]) {
        formData.value.vendedorId = newList[0].id
      }
    },
    { immediate: true },
  )

  // Opciones de método de cobro
  const modoCobroOptions = computed(() =>
    MODO_COBRO_OPTIONS.map((opt) => ({
      value: opt.value,
      label: opt.label,
    })),
  )

  // Total calculado a partir del desglose de pagos
  const totalCalculado = computed(() => {
    const list = formData.value.pagos || []
    const sum = list.reduce((acc, p) => acc + (Number(p.importeUsd) || 0), 0)
    return Math.round(sum * 100) / 100
  })

  watch(
    totalCalculado,
    (val) => {
      formData.value.totalVentaUsd = val > 0 ? val : null
    },
    { immediate: true },
  )

  const canAddPago = computed(() => (formData.value.pagos || []).length < MAX_PAGOS)

  function addPago() {
    if (!canAddPago.value) return
    const usedMethods = new Set((formData.value.pagos || []).map((p) => p.metodoPago))
    const available = modoCobroOptions.value.find((opt) => !usedMethods.has(opt.value))
    const metodo = available ? available.value : 'tarjeta'
    formData.value.pagos.push({ metodoPago: metodo, importeUsd: null })
  }

  function removePago(index: number) {
    if ((formData.value.pagos || []).length <= 1) return
    formData.value.pagos.splice(index, 1)
  }

  const pagosValidos = computed(() => {
    const pList = formData.value.pagos || []
    if (pList.length === 0 || pList.length > MAX_PAGOS) return false
    return pList.every((p) => p.metodoPago && p.importeUsd != null && Number(p.importeUsd) > 0)
  })

  const isSubmitDisabled = computed(() => {
    if (isSaving.value) return true
    if (!formData.value.hotelId) return true
    if (!formData.value.vendedorId) return true
    if (!formData.value.numFotosVendidas || formData.value.numFotosVendidas < 1) return true
    if (!pagosValidos.value) return true
    return false
  })

  function handleGoBack() {
    router.push('/agenda')
  }

  async function handleSave() {
    if (isSubmitDisabled.value) return

    isSaving.value = true
    try {
      const payload = {
        hotelId: Number(formData.value.hotelId),
        vendedorId: String(formData.value.vendedorId),
        numFotosVendidas: Number(formData.value.numFotosVendidas),
        totalVentaUsd: totalCalculado.value,
        pagos: (formData.value.pagos || []).map((p) => ({
          metodoPago: p.metodoPago,
          importeUsd: Number(p.importeUsd) || 0,
        })),
        notas: formData.value.notas ? formData.value.notas.trim() : null,
      }

      await saleStore.addVentaDirecta(payload)
      ElMessage.success(t('sales.directSaleCreatedSuccess'))
      router.push('/agenda')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('sales.directSaleCreateError')
      ElMessage.error(message)
    } finally {
      isSaving.value = false
    }
  }

  onMounted(async () => {
    await Promise.all([
      hotelStore.fetchHotels(),
      userStore.fetchUsers(),
      profileStore.fetchProfiles(),
    ])

    // Inicializar hotel predeterminado
    const queryHotelId = route.query.hotelId ? Number(route.query.hotelId) : null
    if (queryHotelId && userHotels.value.some((h) => Number(h.id) === queryHotelId)) {
      formData.value.hotelId = queryHotelId
    } else if (userHotels.value.length > 0 && userHotels.value[0]) {
      formData.value.hotelId = Number(userHotels.value[0].id)
    }
  })

  return {
    formData,
    isSaving,
    userHotels,
    selectedHotel,
    sellers,
    selectedSeller,
    modoCobroOptions,
    totalCalculado,
    canAddPago,
    addPago,
    removePago,
    isSubmitDisabled,
    handleGoBack,
    handleSave,
    t,
  }
}
