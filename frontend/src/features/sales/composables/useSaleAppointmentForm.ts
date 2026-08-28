import { ref, computed, onMounted, watch, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSaleStore } from '../stores/sale.store'
import { useSessionStore } from '@/features/photo-sessions/stores/session.store'
import { useHotelStore } from '@/features/hotels/stores/hotel.store'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useUserStore } from '@/features/users/stores/user.store'
import { useProfileStore } from '@/features/users/stores/profile.store'
import type { CitaVenta, UpdateCitaVentaPayload, ConflictoCitaVenta, EstadoCitaVenta } from '../domain/sale.model'
import { Calendar, Check, Close, WarnTriangleFilled } from '@element-plus/icons-vue'
import { UserX } from '@lucide/vue'
import { ElMessage } from 'element-plus'

export interface SaleAppointmentFormData {
  sesionId: number | null
  hotelId: number
  vendedorId: string | null
  fechaHoraCita: string
  estado: EstadoCitaVenta
  numFotosVendidas: number | null
  totalVentaUsd: number | null
  notas: string
}

export interface SessionContextInfo {
  clienteNombre: string
  clienteEmail: string
  clienteTelefono: string
  numeroHabitacion: string
  fotografoId: string
  numAdultos: number
  numNinos: number
  concepto: string
  fechaHoraInicio: string
  hotelNombre: string
}

export function useSaleAppointmentForm() {
  const route = useRoute()
  const router = useRouter()
  const saleStore = useSaleStore()
  const sessionStore = useSessionStore()
  const hotelStore = useHotelStore()
  const authStore = useAuthStore()
  const userStore = useUserStore()
  const profileStore = useProfileStore()

  const citaId = computed(() => (route.params.id ? Number(route.params.id) : null))
  const isEditing = computed(() => !!citaId.value)
  const isSaving = ref(false)
  const conflicts = ref<ConflictoCitaVenta[]>([])
  const loadedCita = ref<CitaVenta | null>(null)

  // Form data
  const formData = ref<SaleAppointmentFormData>({
    sesionId: null,
    hotelId: 0,
    vendedorId: null,
    fechaHoraCita: '',
    estado: 'PROGRAMADA',
    numFotosVendidas: null,
    totalVentaUsd: null,
    notas: '',
  })

  // Session info (read-only context)
  const sessionInfo = ref<SessionContextInfo>({
    clienteNombre: '',
    clienteEmail: '',
    clienteTelefono: '',
    numeroHabitacion: '',
    fotografoId: '',
    numAdultos: 1,
    numNinos: 0,
    concepto: '',
    fechaHoraInicio: '',
    hotelNombre: '',
  })

  const currentUser = computed(() => authStore.user)

  // Hotels list accessible by current user based on role matrix
  const userHotels = computed(() => {
    const user = currentUser.value
    if (!user) return hotelStore.hotels

    const roleCode = user.roleCode?.toUpperCase()
    if (roleCode === 'SUPERUSUARIO' || roleCode === 'ADMIN' || roleCode === 'CONTABLE') {
      return hotelStore.hotels
    }

    if (roleCode === 'GERENTE') {
      const areaIds = new Set(user.areaIds || [])
      return hotelStore.hotels.filter((h) => areaIds.has(h.areaId))
    }

    const userHotelIds = new Set(user.hotelIds || [])
    return hotelStore.hotels.filter((h) => userHotelIds.has(h.id))
  })

  // Role-based edit lock (only locks if the appointment was already saved in DB with status other than PROGRAMADA)
  const isReadOnly = computed(() => {
    if (!isEditing.value || !loadedCita.value) return false
    if (loadedCita.value.estado === 'PROGRAMADA') return false
    const role = currentUser.value?.roleCode?.toUpperCase() || ''
    return !['SUPERVISOR', 'GERENTE', 'ADMIN', 'SUPERUSUARIO'].includes(role)
  })

  // Available completed sessions without a sales appointment (for session selector)
  const ESTADOS_NO_PERMITIDOS = ['CANCELADA', 'NO_SHOW'] as const

  const availableSessions = computed(() => {
    const allowedHotelIds = new Set(userHotels.value.map((h) => Number(h.id)))
    return sessionStore.sessions.filter((s) => {
      if (!allowedHotelIds.has(Number(s.hotelId))) return false
      if ((ESTADOS_NO_PERMITIDOS as readonly string[]).includes(s.estado)) return false
      if (s.citaVenta && s.citaVenta.id) return false
      return true
    })
  })

  // Count of sessions in allowed hotels without sales appointment that do not meet all criteria
  const excludedSessionsCount = computed(() => {
    const allowedHotelIds = new Set(userHotels.value.map((h) => Number(h.id)))
    return sessionStore.sessions.filter((s) => {
      if (!allowedHotelIds.has(Number(s.hotelId))) return false
      if (s.citaVenta && s.citaVenta.id) return false
      return (ESTADOS_NO_PERMITIDOS as readonly string[]).includes(s.estado)
    }).length
  })

  // Photographer name and avatar for display
  const photographerUser = computed(() => {
    if (!sessionInfo.value.fotografoId) return null
    return userStore.users.find((u) => String(u.id) === String(sessionInfo.value.fotografoId)) || null
  })

  const photographerName = computed(() => {
    if (!sessionInfo.value.fotografoId) return 'Sin asignar'
    const user = photographerUser.value
    return user ? `${user.nombre} ${user.apellidos}` : 'Desconocido'
  })

  // Sellers list for assignment (filtered by hotel: only Agendador and Fotógrafo)
  const sellers = computed(() => {
    const selectedHotelId = Number(formData.value.hotelId)
    if (!selectedHotelId) return []

    return userStore.usersWithProfile
      .filter((u) => {
        if (u.status === 'Inactivo') return false
        const perfilCode =
          u.perfil?.code?.toUpperCase() ||
          profileStore.getProfileById(u.profileId)?.code?.toUpperCase()
        const allowedRoles = ['AGENDADOR', 'FOTOGRAFO']
        if (!allowedRoles.includes(perfilCode || '')) return false
        const assignedHotelIds = u.hotelIds || []
        return assignedHotelIds.some((hId) => Number(hId) === selectedHotelId)
      })
      .map((u) => {
        const perfil = u.perfil || profileStore.getProfileById(u.profileId)
        return {
          id: u.id,
          nombre: u.nombre,
          apellidos: u.apellidos,
          color: u.color,
          imagen: u.imagen,
          perfilNombre: perfil?.name || perfil?.code || 'Vendedor',
        }
      })
  })

  const selectedSeller = computed(() => {
    if (!formData.value.vendedorId) return null
    return sellers.value.find((s) => String(s.id) === String(formData.value.vendedorId)) || null
  })

  // Reset vendedor selection when hotel changes if selected vendedor is not in the new hotel
  watch(
    () => formData.value.hotelId,
    () => {
      if (!formData.value.vendedorId) return
      const isAvailable = sellers.value.some(
        (s) => String(s.id) === String(formData.value.vendedorId),
      )
      if (!isAvailable) {
        formData.value.vendedorId = null
      }
    },
  )

  // PAX display
  const paxDisplay = computed(() => {
    return `${sessionInfo.value.numAdultos}.${sessionInfo.value.numNinos} PAX`
  })

  function formatDateTime(dateStr?: string | null): string {
    if (!dateStr) return '-'
    return dateStr.replace('T', ' ').slice(0, 16)
  }

  const estadoOptions: { value: EstadoCitaVenta; label: string; color: string; icon: Component }[] = [
    { value: 'PROGRAMADA', label: 'Programada', color: '#409eff', icon: Calendar },
    { value: 'NO_SHOW', label: 'No se presentó', color: '#e6a23c', icon: UserX },
    { value: 'CANCELADA', label: 'Cancelada', color: '#f56c6c', icon: Close },
    { value: 'COMPLETADA', label: 'Completada', color: '#67c23a', icon: Check },
  ]

  function disabledPastDates(time: Date): boolean {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return time.getTime() < today.getTime()
  }

  // Conflict check on date change
  watch(
    () => formData.value.fechaHoraCita,
    async (newVal) => {
      if (!newVal || !formData.value.hotelId) {
        conflicts.value = []
        return
      }
      conflicts.value = await saleStore.checkConflictos(
        formData.value.hotelId,
        newVal,
        citaId.value ?? undefined,
      )
      if (conflicts.value.length > 0) {
        ElMessage({
          type: 'warning',
          icon: WarnTriangleFilled,
          message: `Hay ${conflicts.value.length} cita(s) de venta en el mismo hotel dentro de la franja de 1 hora`,
        })
      }
    },
  )

  // Load session info when sesionId changes
  watch(
    () => formData.value.sesionId,
    (newVal) => {
      if (!newVal) return
      const session = sessionStore.sessions.find((s) => s.id === newVal)
      if (session) {
        formData.value.hotelId = session.hotelId
        sessionInfo.value = {
          clienteNombre: session.clienteNombre,
          clienteEmail: session.clienteEmail || '',
          clienteTelefono: session.clienteTelefono || '',
          numeroHabitacion: session.numeroHabitacion || '',
          fotografoId: session.fotografoId || '',
          numAdultos: session.numAdultos ?? 1,
          numNinos: session.numNinos ?? 0,
          concepto: session.concepto || '',
          fechaHoraInicio: session.fechaHoraInicio,
          hotelNombre: hotelStore.hotels.find((h) => h.id === session.hotelId)?.nombre || '',
        }
        if (!isEditing.value && !formData.value.vendedorId && currentUser.value) {
          const isAgendador = currentUser.value.roleCode?.toUpperCase() === 'AGENDADOR'
          if (
            isAgendador &&
            currentUser.value.hotelIds?.some((hId) => Number(hId) === Number(session.hotelId))
          ) {
            formData.value.vendedorId = currentUser.value.id
          }
        }
      }
    },
  )

  onMounted(async () => {
    await Promise.all([
      hotelStore.fetchHotels(),
      userStore.fetchUsers(),
      profileStore.fetchProfiles(),
      sessionStore.fetchSessions(),
    ])

    if (isEditing.value && citaId.value) {
      const existing = await saleStore.fetchCitaVenta(citaId.value)
      if (existing) {
        loadedCita.value = existing
        const allowedHotelIds = new Set(userHotels.value.map((h) => Number(h.id)))
        if (!allowedHotelIds.has(Number(existing.hotelId))) {
          ElMessage.error('No tienes acceso a las citas de venta de este hotel')
          handleGoBack()
          return
        }

        formData.value = {
          sesionId: existing.sesionId,
          hotelId: existing.hotelId,
          vendedorId: existing.vendedorId || null,
          fechaHoraCita: existing.fechaHoraCita,
          estado: existing.estado,
          numFotosVendidas: existing.numFotosVendidas ?? null,
          totalVentaUsd: existing.totalVentaUsd ?? null,
          notas: existing.notas || '',
        }
        sessionInfo.value = {
          clienteNombre: existing.clienteNombre || '',
          clienteEmail: existing.clienteEmail || '',
          clienteTelefono: existing.clienteTelefono || '',
          numeroHabitacion: existing.numeroHabitacion || '',
          fotografoId: existing.fotografoId || '',
          numAdultos: existing.numAdultos ?? 1,
          numNinos: existing.numNinos ?? 0,
          concepto: existing.concepto || '',
          fechaHoraInicio: existing.sesionFechaHoraInicio || '',
          hotelNombre: existing.hotelNombre || '',
        }
      } else {
        ElMessage.error('Cita de venta no encontrada')
        handleGoBack()
      }
    } else {
      // Creating new: check for sesionId query param
      const querySesionId = route.query.sesionId ? Number(route.query.sesionId) : null
      if (querySesionId) {
        formData.value.sesionId = querySesionId
      }
    }
  })

  function handleGoBack() {
    router.push('/agenda')
  }

  async function handleSave() {
    if (!formData.value.sesionId) {
      ElMessage.warning('Debes seleccionar una sesión fotográfica')
      return
    }
    if (!formData.value.fechaHoraCita) {
      ElMessage.warning('Debes seleccionar la fecha y hora de la cita')
      return
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (!isEditing.value && new Date(formData.value.fechaHoraCita) < today) {
      ElMessage.error('No se pueden crear citas de venta en fechas anteriores al día actual')
      return
    }

    if (formData.value.estado === 'COMPLETADA') {
      if (formData.value.numFotosVendidas == null || formData.value.totalVentaUsd == null) {
        ElMessage.warning('Para completar la cita, indica el nº de fotos vendidas y el total en USD')
        return
      }
    }

    isSaving.value = true
    try {
      if (isEditing.value && citaId.value) {
        const payload: UpdateCitaVentaPayload = {
          vendedorId: formData.value.vendedorId || null,
          fechaHoraCita: formData.value.fechaHoraCita,
          estado: formData.value.estado,
          numFotosVendidas: formData.value.numFotosVendidas,
          totalVentaUsd: formData.value.totalVentaUsd,
          notas: formData.value.notas ? formData.value.notas.trim() : null,
        }
        const result = await saleStore.updateCitaVenta(citaId.value, payload)
        if (result.conflictos && result.conflictos.length > 0) {
          ElMessage.warning(
            `Cita actualizada, pero hay ${result.conflictos.length} cita(s) solapada(s) en el mismo hotel`,
          )
        } else {
          ElMessage.success('Cita de venta actualizada correctamente')
        }
      } else {
        const result = await saleStore.addCitaVenta({
          sesionId: formData.value.sesionId,
          hotelId: formData.value.hotelId,
          vendedorId: formData.value.vendedorId || null,
          fechaHoraCita: formData.value.fechaHoraCita,
          notas: formData.value.notas ? formData.value.notas.trim() : null,
        })
        if (result.conflictos && result.conflictos.length > 0) {
          ElMessage.warning(
            `Cita creada, pero hay ${result.conflictos.length} cita(s) solapada(s) en el mismo hotel`,
          )
        } else {
          ElMessage.success('Cita de venta agendada correctamente')
        }
      }
      await Promise.all([sessionStore.fetchSessions(), saleStore.fetchCitasVenta()])
      handleGoBack()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar la cita de venta'
      ElMessage.error(msg)
    } finally {
      isSaving.value = false
    }
  }

  return {
    citaId,
    isEditing,
    isSaving,
    isReadOnly,
    conflicts,
    loadedCita,
    formData,
    sessionInfo,
    currentUser,
    userHotels,
    availableSessions,
    excludedSessionsCount,
    photographerUser,
    photographerName,
    sellers,
    selectedSeller,
    paxDisplay,
    estadoOptions,
    disabledPastDates,
    formatDateTime,
    handleGoBack,
    handleSave,
    saleStore,
    sessionStore,
    hotelStore,
    userStore,
    profileStore,
    router,
    route,
  }
}

export type SaleAppointmentFormContext = ReturnType<typeof useSaleAppointmentForm>
