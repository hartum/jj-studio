import { ref, computed, onMounted, watch, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLocale } from '@/i18n/useLocale'
import { useSaleStore } from '../stores/sale.store'
import { useSessionStore } from '@/features/photo-sessions/stores/session.store'
import { useHotelStore } from '@/features/hotels/stores/hotel.store'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useUserStore } from '@/features/users/stores/user.store'
import { useProfileStore } from '@/features/users/stores/profile.store'
import {
  type CitaVenta,
  type UpdateCitaVentaPayload,
  type ConflictoCitaVenta,
  type EstadoCitaVenta,
} from '../domain/sale.model'
import { Calendar, Check, Close } from '@element-plus/icons-vue'
import { UserX } from '@lucide/vue'
import { ElMessage } from 'element-plus'

export interface FormPagoItem {
  metodoPago: string
  importeUsd: number | null
}

export interface SaleAppointmentFormData {
  sesionId: number | null
  hotelId: number
  vendedorId: string | null
  fechaHoraCita: string
  estado: EstadoCitaVenta
  numFotosVendidas: number | null
  totalVentaUsd: number | null
  modoCobro: string | null
  pagos: FormPagoItem[]
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

export interface VendedorDisponibilidadItem {
  id: string
  nombre: string
  roleCode: string
  disponible: boolean
  isAusente: boolean
  motivoAusencia: string | null
  ocupado: boolean
  motivoOcupado: string | null
}

export interface VendedoresDisponibilidadResponse {
  hotelId: number
  fechaHora: string
  totalVendedores: number
  disponibles: number
  ausentes: number
  ocupados: number
  vendedores: VendedorDisponibilidadItem[]
}

export function useSaleAppointmentForm() {
  const { t, locale } = useLocale()
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
    modoCobro: null,
    pagos: [{ metodoPago: 'tarjeta', importeUsd: null }],
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

  // Lock due to assigned photographer/seller:
  // Once a session/appointment has an assigned photographer or seller, only the
  // assigned photographer, assigned seller, supervisor, gerente, admin, and superusuario can edit it.
  const isLockedByPhotographer = computed(() => {
    if (!isEditing.value || !loadedCita.value) return false
    if (loadedCita.value.estado !== 'PROGRAMADA') return false
    const fotografoId = loadedCita.value.fotografoId || sessionInfo.value.fotografoId
    const vendedorId = loadedCita.value.vendedorId || formData.value.vendedorId
    if (!fotografoId && !vendedorId) return false
    const role = currentUser.value?.roleCode?.toUpperCase() || ''
    const currentUserId = currentUser.value?.id
    const isAssignedFotografo = Boolean(
      fotografoId && String(fotografoId) === String(currentUserId),
    )
    const isAssignedVendedor = Boolean(
      vendedorId && String(vendedorId) === String(currentUserId),
    )
    const isPrivileged = ['SUPERVISOR', 'GERENTE', 'ADMIN', 'SUPERUSUARIO'].includes(role)
    return !isAssignedFotografo && !isAssignedVendedor && !isPrivileged
  })

  // Role-based edit lock
  const isReadOnly = computed(() => {
    if (!isEditing.value || !loadedCita.value) return false
    const role = currentUser.value?.roleCode?.toUpperCase() || ''

    // 1. If state is not PROGRAMADA (COMPLETADA, CANCELADA, NO_SHOW): only GERENTE, ADMIN, SUPERUSUARIO
    if (loadedCita.value.estado !== 'PROGRAMADA') {
      return !['GERENTE', 'ADMIN', 'SUPERUSUARIO'].includes(role)
    }

    // 2. If state is PROGRAMADA and associated session has an assigned photographer:
    if (isLockedByPhotographer.value) {
      return true
    }

    if (role === 'CONTABLE') return true

    return false
  })

  // Available completed sessions without a sales appointment (for session selector)
  const ESTADOS_NO_PERMITIDOS = ['CANCELADA', 'NO_SHOW'] as const

  const availableSessions = computed(() => {
    const allowedHotelIds = new Set(userHotels.value.map((h) => Number(h.id)))
    const role = currentUser.value?.roleCode?.toUpperCase() || ''
    const currentUserId = currentUser.value?.id

    return sessionStore.sessions.filter((s) => {
      if (!allowedHotelIds.has(Number(s.hotelId))) return false
      if ((ESTADOS_NO_PERMITIDOS as readonly string[]).includes(s.estado)) return false
      if (s.citaVenta && s.citaVenta.id) return false
      // Si el usuario es FOTOGRAFO, solo puede ver y seleccionar sus propias sesiones
      if (role === 'FOTOGRAFO') {
        if (!s.fotografoId || String(s.fotografoId) !== String(currentUserId)) {
          return false
        }
      }
      return true
    })
  })

  // Count of sessions in allowed hotels without sales appointment that do not meet all criteria
  const excludedSessionsCount = computed(() => {
    const allowedHotelIds = new Set(userHotels.value.map((h) => Number(h.id)))
    const role = currentUser.value?.roleCode?.toUpperCase() || ''
    const currentUserId = currentUser.value?.id

    return sessionStore.sessions.filter((s) => {
      if (!allowedHotelIds.has(Number(s.hotelId))) return false
      if (s.citaVenta && s.citaVenta.id) return false
      if (
        role === 'FOTOGRAFO' &&
        (!s.fotografoId || String(s.fotografoId) !== String(currentUserId))
      ) {
        return false
      }
      return (ESTADOS_NO_PERMITIDOS as readonly string[]).includes(s.estado)
    }).length
  })

  // Photographer name and avatar for display
  const photographerUser = computed(() => {
    if (!sessionInfo.value.fotografoId) return null
    return (
      userStore.users.find((u) => String(u.id) === String(sessionInfo.value.fotografoId)) || null
    )
  })

  const photographerName = computed(() => {
    if (!sessionInfo.value.fotografoId) return t('sales.summary.unassigned')
    const user = photographerUser.value
    return user ? `${user.nombre} ${user.apellidos}` : t('sales.summary.unknown')
  })

  // Sellers list for assignment (filtered by hotel: Agendador, Fotógrafo, and Supervisor)
  const sellers = computed(() => {
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
        const perfil = u.perfil || profileStore.getProfileById(u.profileId)
        const perfilCode = perfil?.code?.toUpperCase() || ''
        return {
          id: u.id,
          nombre: u.nombre,
          apellidos: u.apellidos,
          color: u.color,
          imagen: u.imagen,
          perfilNombre: perfil?.name || perfil?.code || t('sales.steps.seller'),
          roleCode: perfilCode,
          isFotografo: perfilCode === 'FOTOGRAFO',
        }
      })
  })

  const selectedSeller = computed(() => {
    if (!formData.value.vendedorId) return null
    return sellers.value.find((s) => String(s.id) === String(formData.value.vendedorId)) || null
  })

  const timeSlots = [
    '00:00',
    '01:00',
    '02:00',
    '03:00',
    '04:00',
    '05:00',
    '06:00',
    '07:00',
    '08:00',
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
    '18:00',
    '19:00',
    '20:00',
    '21:00',
    '22:00',
    '23:00',
  ]

  const rawDate = ref('')
  const rawTime = ref('')

  const selectTimeSlot = (time: string) => {
    if (isReadOnly.value) return
    selectedTimeOnly.value = time
  }

  const selectedDateOnly = computed({
    get: () => {
      if (rawDate.value) return rawDate.value
      if (!formData.value.fechaHoraCita) return ''
      return formData.value.fechaHoraCita.split('T')[0] || ''
    },
    set: (val: string) => {
      rawDate.value = val || ''
      if (val && selectedTimeOnly.value) {
        formData.value.fechaHoraCita = `${val}T${selectedTimeOnly.value}`
      } else {
        formData.value.fechaHoraCita = ''
      }
    },
  })

  const selectedTimeOnly = computed({
    get: () => {
      if (rawTime.value) return rawTime.value
      if (!formData.value.fechaHoraCita) return ''
      const parts = formData.value.fechaHoraCita.split('T')
      return parts[1] ? parts[1].substring(0, 5) : ''
    },
    set: (val: string) => {
      rawTime.value = val || ''
      if (selectedDateOnly.value && val) {
        formData.value.fechaHoraCita = `${selectedDateOnly.value}T${val}`
      } else {
        formData.value.fechaHoraCita = ''
      }
    },
  })

  const MAX_PAGOS = 4

  const totalCalculado = computed(() => {
    const pList = formData.value.pagos || []
    const sum = pList.reduce((acc, p) => acc + (Number(p.importeUsd) || 0), 0)
    return Math.round(sum * 100) / 100
  })

  const canAddPago = computed(() => {
    return (formData.value.pagos || []).length < MAX_PAGOS
  })

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

  watch(
    totalCalculado,
    (val) => {
      formData.value.totalVentaUsd = val > 0 ? val : null
    },
    { immediate: true },
  )

  const isSubmitDisabled = computed(() => {
    if (isReadOnly.value) return true
    if (!formData.value.sesionId) return true
    if (!selectedDateOnly.value || !selectedTimeOnly.value) return true
    if (formData.value.estado === 'COMPLETADA') {
      if (!formData.value.vendedorId) return true
      if (formData.value.numFotosVendidas == null) return true
      if (!pagosValidos.value) return true
    }
    return false
  })

  // Disponibilidad de vendedores
  const vendedoresDisponibilidad = ref<VendedoresDisponibilidadResponse | null>(null)
  const isCheckingVendedoresDisponibilidad = ref(false)

  async function checkDisponibilidadVendedores() {
    const hotelId = Number(formData.value.hotelId)
    const datePart = selectedDateOnly.value
    const timePart = selectedTimeOnly.value
    if (!hotelId || !datePart || !timePart) {
      vendedoresDisponibilidad.value = null
      return
    }

    const fechaStr = `${datePart}T${timePart}`
    isCheckingVendedoresDisponibilidad.value = true
    try {
      const excludeId = isEditing.value && citaId.value ? citaId.value : ''
      const url = `/api/hoteles/${hotelId}/vendedores-disponibilidad?fecha=${encodeURIComponent(fechaStr)}${excludeId ? `&excludeCitaId=${excludeId}` : ''}`
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      })
      if (res.ok) {
        vendedoresDisponibilidad.value = await res.json()

        // Si el vendedor seleccionado no está disponible (ausente u ocupado), deseleccionarlo
        if (formData.value.vendedorId) {
          const currentV = vendedoresDisponibilidad.value?.vendedores?.find(
            (v) => String(v.id) === String(formData.value.vendedorId),
          )
          if (currentV && (currentV.isAusente || currentV.ocupado)) {
            formData.value.vendedorId = null
          }
        }
      } else {
        vendedoresDisponibilidad.value = null
      }
    } catch (err) {
      console.warn('Error al verificar disponibilidad de vendedores:', err)
      vendedoresDisponibilidad.value = null
    } finally {
      isCheckingVendedoresDisponibilidad.value = false
    }
  }

  watch(
    [() => formData.value.hotelId, () => selectedDateOnly.value, () => selectedTimeOnly.value],
    () => {
      checkDisponibilidadVendedores()
    },
    { immediate: true },
  )

  function getSellerStatus(sellerId: string | number) {
    const sIdStr = String(sellerId)
    const isCurrentlySelected = String(formData.value.vendedorId) === sIdStr

    if (!selectedDateOnly.value || !selectedTimeOnly.value) {
      return {
        status: 'pending',
        label: t('sales.sellerPicker.statusChooseDateTime'),
        tagClass: 'tag-pending',
        disabled: false,
      }
    }

    const sAvail = vendedoresDisponibilidad.value?.vendedores?.find((v) => String(v.id) === sIdStr)

    if (!sAvail) {
      return {
        status: 'available',
        label: t('sales.sellerPicker.statusAvailable'),
        tagClass: 'tag-available',
        disabled: false,
      }
    }

    if (sAvail.isAusente || sAvail.motivoAusencia) {
      const motivo = sAvail.motivoAusencia ? ` (${sAvail.motivoAusencia})` : ''
      return {
        status: 'absent',
        label: t('sales.sellerPicker.statusAbsent', { motivo }),
        tagClass: 'tag-busy',
        disabled: true,
      }
    }

    if (sAvail.ocupado) {
      const motivo = sAvail.motivoOcupado ? ` (${sAvail.motivoOcupado})` : ' (Ocupado)'
      return {
        status: 'occupied',
        label: t('sales.sellerPicker.statusOccupied', { motivo }),
        tagClass: 'tag-busy',
        disabled: true,
      }
    }

    if (isCurrentlySelected) {
      return {
        status: 'assigned',
        label: t('sales.sellerPicker.statusAssigned'),
        tagClass: 'tag-available',
        disabled: false,
      }
    }

    return {
      status: 'available',
      label: t('sales.sellerPicker.statusAvailable'),
      tagClass: 'tag-available',
      disabled: false,
    }
  }

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
    return t('sales.summary.paxFormat', {
      adults: sessionInfo.value.numAdultos,
      children: sessionInfo.value.numNinos,
    })
  })

  function formatDateTime(dateStr?: string | null): string {
    if (!dateStr) return '-'
    return dateStr.replace('T', ' ').slice(0, 16)
  }

  const estadoOptions = computed<
    { value: EstadoCitaVenta; label: string; color: string; icon: Component }[]
  >(() => [
    { value: 'PROGRAMADA', label: t('sales.status.scheduled'), color: '#409eff', icon: Calendar },
    { value: 'NO_SHOW', label: t('sales.status.noShow'), color: '#e6a23c', icon: UserX },
    { value: 'CANCELADA', label: t('sales.status.cancelled'), color: '#f56c6c', icon: Close },
    { value: 'COMPLETADA', label: t('sales.status.completed'), color: '#67c23a', icon: Check },
  ])

  const modoCobroOptions = computed(() => [
    { value: 'tarjeta', label: t('sales.paymentMethods.card') },
    { value: 'cargo habitacion', label: t('sales.paymentMethods.roomCharge') },
    { value: 'Paypal', label: t('sales.paymentMethods.paypal') },
    { value: 'efectivo', label: t('sales.paymentMethods.cash') },
  ])

  function formatDateIso(d: Date | string | unknown): string {
    if (!d) return ''
    if (typeof d === 'string') return d.slice(0, 10)
    if (d instanceof Date) {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    const anyDate =
      (d as { date?: Date; dayjs?: { format?: (fmt: string) => string } })?.date ||
      (d as { dayjs?: { format?: (fmt: string) => string } })?.dayjs
    if (anyDate && anyDate instanceof Date) {
      const year = anyDate.getFullYear()
      const month = String(anyDate.getMonth() + 1).padStart(2, '0')
      const day = String(anyDate.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    if (anyDate && typeof (anyDate as { format?: (fmt: string) => string }).format === 'function') {
      return (anyDate as { format: (fmt: string) => string }).format('YYYY-MM-DD')
    }
    return ''
  }

  // Mapa de conteo de citas de venta por fecha ISO (YYYY-MM-DD) para el hotel actual o todos los hoteles del usuario
  const salesCountByDate = computed<Record<string, number>>(() => {
    const counts: Record<string, number> = {}
    const currentHotelId = formData.value.hotelId ? Number(formData.value.hotelId) : null
    const allowedHotelIds = new Set(userHotels.value.map((h) => Number(h.id)))
    const currentCitaId = citaId.value

    for (const c of saleStore.citasVenta) {
      if (c.estado === 'CANCELADA') continue
      if (currentCitaId && c.id === currentCitaId) continue
      if (currentHotelId) {
        if (Number(c.hotelId) !== currentHotelId) continue
      } else if (allowedHotelIds.size > 0 && !allowedHotelIds.has(Number(c.hotelId))) {
        continue
      }
      if (!c.fechaHoraCita) continue
      const dateKey = String(c.fechaHoraCita).slice(0, 10)
      if (dateKey) {
        counts[dateKey] = (counts[dateKey] || 0) + 1
      }
    }
    return counts
  })

  function getCitaVentaCellClassName(cellDate: Date): string {
    const cellIso = formatDateIso(cellDate)
    const count = salesCountByDate.value[cellIso] || 0
    if (count > 0) {
      if (count <= 30) {
        return `has-sessions-${count}`
      }
      return 'has-sessions-plus'
    }
    return ''
  }

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
    },
  )

  // Load session info when sesionId changes
  watch(
    () => formData.value.sesionId,
    (newVal) => {
      if (!newVal) {
        formData.value.hotelId = 0
        sessionInfo.value = {
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
        }
        return
      }
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
          const role = currentUser.value.roleCode?.toUpperCase() || ''
          const isSellerRole = ['AGENDADOR', 'SUPERVISOR'].includes(role)
          if (
            isSellerRole &&
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
      saleStore.fetchCitasVenta(),
    ])

    if (isEditing.value && citaId.value) {
      const existing = await saleStore.fetchCitaVenta(citaId.value)
      if (existing) {
        loadedCita.value = existing
        const allowedHotelIds = new Set(userHotels.value.map((h) => Number(h.id)))
        if (!allowedHotelIds.has(Number(existing.hotelId))) {
          ElMessage.error(t('sales.toasts.noAccessHotel'))
          handleGoBack()
          return
        }

        const loadedPagos: FormPagoItem[] =
          existing.pagos && existing.pagos.length > 0
            ? existing.pagos.map((p) => ({
                metodoPago: p.metodoPago,
                importeUsd: p.importeUsd,
              }))
            : existing.modoCobro
              ? [{ metodoPago: existing.modoCobro, importeUsd: existing.totalVentaUsd ?? null }]
              : [{ metodoPago: 'tarjeta', importeUsd: null }]

        formData.value = {
          sesionId: existing.sesionId,
          hotelId: existing.hotelId,
          vendedorId: existing.vendedorId || null,
          fechaHoraCita: existing.fechaHoraCita,
          estado: existing.estado,
          numFotosVendidas: existing.numFotosVendidas ?? null,
          totalVentaUsd: existing.totalVentaUsd ?? null,
          modoCobro: existing.modoCobro || null,
          pagos: loadedPagos,
          notas: existing.notas || '',
        }
        if (existing.fechaHoraCita) {
          const parts = existing.fechaHoraCita.split('T')
          rawDate.value = parts[0] || ''
          rawTime.value = parts[1] ? parts[1].substring(0, 5) : ''
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
        ElMessage.error(t('sales.toasts.appointmentNotFound'))
        handleGoBack()
        return
      }
    } else {
      // Creating new: check for sesionId query param
      const querySesionId = route.query.sesionId ? Number(route.query.sesionId) : null
      if (querySesionId) {
        const targetSession = sessionStore.sessions.find((s) => s.id === querySesionId)
        const role = currentUser.value?.roleCode?.toUpperCase() || ''
        const currentUserId = currentUser.value?.id
        if (
          role === 'FOTOGRAFO' &&
          targetSession &&
          (!targetSession.fotografoId || String(targetSession.fotografoId) !== String(currentUserId))
        ) {
          ElMessage.error(t('sales.toasts.photographerOwnSessionsOnly'))
        } else {
          formData.value.sesionId = querySesionId
        }
      }
    }
  })

  function handleGoBack() {
    router.push('/agenda')
  }

  async function handleSave() {
    if (isReadOnly.value) return

    if (!formData.value.sesionId) {
      ElMessage.warning(t('sales.toasts.sessionRequired'))
      return
    }

    if (!isEditing.value) {
      const role = currentUser.value?.roleCode?.toUpperCase() || ''
      const currentUserId = currentUser.value?.id
      if (role === 'FOTOGRAFO') {
        const targetSession = sessionStore.sessions.find((s) => s.id === Number(formData.value.sesionId))
        if (
          targetSession &&
          (!targetSession.fotografoId || String(targetSession.fotografoId) !== String(currentUserId))
        ) {
          ElMessage.error(t('sales.toasts.photographerOwnSessionsOnly'))
          return
        }
      }
    }
    if (!formData.value.fechaHoraCita) {
      ElMessage.warning(t('sales.toasts.dateTimeRequired'))
      return
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (!isEditing.value && new Date(formData.value.fechaHoraCita) < today) {
      ElMessage.error(t('sales.toasts.pastDateError'))
      return
    }

    if (formData.value.estado === 'COMPLETADA') {
      if (!formData.value.sesionId) {
        ElMessage.warning(t('sales.toasts.completeSessionRequired'))
        return
      }
      if (!formData.value.vendedorId) {
        ElMessage.warning(t('sales.toasts.completeSellerRequired'))
        return
      }
      if (formData.value.numFotosVendidas == null) {
        ElMessage.warning(t('sales.toasts.completeAmountsRequired'))
        return
      }
      if (!pagosValidos.value) {
        ElMessage.warning(t('sales.form.paymentValidationFailed'))
        return
      }
    }

    const cleanPagos = (formData.value.pagos || [])
      .filter((p) => p.metodoPago && p.importeUsd != null && Number(p.importeUsd) > 0)
      .map((p) => ({
        metodoPago: p.metodoPago,
        importeUsd: Number(p.importeUsd),
      }))

    isSaving.value = true
    try {
      if (isEditing.value && citaId.value) {
        const payload: UpdateCitaVentaPayload = {
          vendedorId: formData.value.vendedorId || null,
          fechaHoraCita: formData.value.fechaHoraCita,
          estado: formData.value.estado,
          numFotosVendidas: formData.value.numFotosVendidas,
          totalVentaUsd: totalCalculado.value > 0 ? totalCalculado.value : null,
          pagos: cleanPagos,
          notas: formData.value.notas ? formData.value.notas.trim() : null,
        }
        const result = await saleStore.updateCitaVenta(citaId.value, payload)
        if (result.conflictos && result.conflictos.length > 0) {
          ElMessage.warning(
            t('sales.toasts.appointmentUpdatedWithConflicts', { count: result.conflictos.length }),
          )
        } else {
          ElMessage.success(t('sales.toasts.appointmentUpdated'))
        }
      } else {
        const result = await saleStore.addCitaVenta({
          sesionId: formData.value.sesionId,
          hotelId: formData.value.hotelId,
          vendedorId: formData.value.vendedorId || null,
          fechaHoraCita: formData.value.fechaHoraCita,
          estado: formData.value.estado,
          numFotosVendidas: formData.value.numFotosVendidas,
          totalVentaUsd: totalCalculado.value > 0 ? totalCalculado.value : null,
          pagos: cleanPagos,
          notas: formData.value.notas ? formData.value.notas.trim() : null,
        })
        if (result.conflictos && result.conflictos.length > 0) {
          ElMessage.warning(
            t('sales.toasts.appointmentCreatedWithConflicts', { count: result.conflictos.length }),
          )
        } else {
          ElMessage.success(t('sales.toasts.appointmentCreated'))
        }
      }
      await Promise.all([sessionStore.fetchSessions(), saleStore.fetchCitasVenta()])
      handleGoBack()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('sales.toasts.saveError')
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
    isLockedByPhotographer,
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
    vendedoresDisponibilidad,
    isCheckingVendedoresDisponibilidad,
    checkDisponibilidadVendedores,
    getSellerStatus,
    paxDisplay,
    estadoOptions,
    modoCobroOptions,
    totalCalculado,
    MAX_PAGOS,
    canAddPago,
    addPago,
    removePago,
    pagosValidos,
    isSubmitDisabled,
    selectedDateOnly,
    selectedTimeOnly,
    timeSlots,
    selectTimeSlot,
    salesCountByDate,
    getCitaVentaCellClassName,
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
    locale,
  }
}

export type SaleAppointmentFormContext = ReturnType<typeof useSaleAppointmentForm>
