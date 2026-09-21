import { ref, computed, watch, onMounted, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '../stores/session.store'
import { useSaleStore } from '@/features/sales/stores/sale.store'
import { useHotelStore } from '@/features/hotels/stores/hotel.store'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useUserStore } from '@/features/users/stores/user.store'
import { useProfileStore } from '@/features/users/stores/profile.store'
import { useCalendarioLaboralStore } from '@/features/users/stores/calendario-laboral.store'
import type { CreateSesionPayload, EstadoSesion, SesionFotografica } from '../domain/session.model'
import type { ConflictoCitaVenta } from '@/features/sales/domain/sale.model'
import type { CalendarioLaboralFotografo } from '@/features/users/domain/calendario-laboral.model'
import { Check, Close } from '@element-plus/icons-vue'
import { UserX, Calendar } from '@lucide/vue'
import { ElMessage } from 'element-plus'
import { getUserInitials, getUserBgColor } from '@/features/users/utils/user-avatar'
import { useLocale } from '@/i18n/useLocale'

export interface HotelDisponibilidad {
  hotelId: number
  fechaHora: string
  totalFotografos: number
  ausentes: number
  disponibles: number
  sesionesSimultaneas: number
  cupoLibre: number
  topeAlcanzado: boolean
  fotografos: {
    id: string
    nombre: string
    disponible: boolean
    isAusente?: boolean
    motivoAusencia: string | null
    ocupado?: boolean
  }[]
}

export function usePhotoSessionForm() {
  const { t, locale } = useLocale()
  const route = useRoute()
  const router = useRouter()
  const sessionStore = useSessionStore()
  const saleStore = useSaleStore()
  const hotelStore = useHotelStore()
  const authStore = useAuthStore()
  const userStore = useUserStore()
  const profileStore = useProfileStore()
  const calendarioLaboralStore = useCalendarioLaboralStore()

  // Horarios de 00:00 a 23:00 para la selección de franja
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

  const formData = ref<CreateSesionPayload>({
    hotelId: 0,
    fotografoId: '',
    clienteNombre: '',
    numeroHabitacion: '',
    clienteEmail: '',
    clienteTelefono: '',
    numAdultos: 2,
    numNinos: 0,
    fechaHoraInicio: '',
    fechaSalida: '',
    concepto: '',
    estado: 'PROGRAMADA',
    notas: '',
  })

  const sessionId = computed(() => route.params.id as string | undefined)
  const isEditing = computed(() => !!sessionId.value)
  const loadedSession = ref<SesionFotografica | null>(null)

  const fechaHoraCitaVenta = ref('')
  const conflictsCitaVenta = ref<ConflictoCitaVenta[]>([])

  const selectedDateOnly = computed({
    get: () => {
      if (!formData.value.fechaHoraInicio) return ''
      return formData.value.fechaHoraInicio.split('T')[0] || ''
    },
    set: (val: string) => {
      const currentTime = selectedTimeOnly.value || '10:00'
      formData.value.fechaHoraInicio = val ? `${val}T${currentTime}` : ''
    },
  })

  const selectedTimeOnly = computed({
    get: () => {
      if (!formData.value.fechaHoraInicio) return ''
      const parts = formData.value.fechaHoraInicio.split('T')
      return parts[1] ? parts[1].substring(0, 5) : ''
    },
    set: (val: string) => {
      const currentDate = selectedDateOnly.value || new Date().toISOString().split('T')[0]
      formData.value.fechaHoraInicio = `${currentDate}T${val}`
    },
  })

  const formattedSelectedSessionDateTime = computed(() => {
    if (!formData.value.fechaHoraInicio) return t('sessions.summary.noDateSelected')
    try {
      const parts = formData.value.fechaHoraInicio.split('T')
      const datePart = parts[0]
      const timePart = parts[1]
      if (!datePart) return t('sessions.summary.noDateSelected')
      const dateNumbers = datePart.split('-').map((n) => parseInt(n, 10))
      if (dateNumbers.length < 3) return formData.value.fechaHoraInicio

      const year = dateNumbers[0] ?? 2026
      const month = dateNumbers[1] ?? 1
      const day = dateNumbers[2] ?? 1
      const d = new Date(year, month - 1, day)

      const loc = locale.value === 'en' ? 'en-US' : 'es-ES'
      const weekday = d.toLocaleDateString(loc, { weekday: 'long' })
      const monthName = d.toLocaleDateString(loc, { month: 'long' })
      const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1)

      const timeFormatted = timePart ? timePart.substring(0, 5) : '10:00'
      return `${capitalizedWeekday}, ${day} ${monthName} ${year}, ${timeFormatted}`
    } catch {
      return formData.value.fechaHoraInicio
    }
  })

  const selectTimeSlot = (time: string) => {
    selectedTimeOnly.value = time
  }

  const selectPhotographerCard = (id: string | number) => {
    const status = getPhotographerStatus(id)
    if (status.disabled) return

    if (String(formData.value.fotografoId) === String(id)) {
      formData.value.fotografoId = ''
    } else {
      formData.value.fotografoId = String(id)
    }
  }

  const selectedCitaVentaDateOnly = computed({
    get: () => {
      if (!fechaHoraCitaVenta.value) return ''
      return fechaHoraCitaVenta.value.split('T')[0] || ''
    },
    set: (val: string) => {
      const currentTime = selectedCitaVentaTimeOnly.value || '11:00'
      fechaHoraCitaVenta.value = val ? `${val}T${currentTime}` : ''
    },
  })

  const selectedCitaVentaTimeOnly = computed({
    get: () => {
      if (!fechaHoraCitaVenta.value) return ''
      const parts = fechaHoraCitaVenta.value.split('T')
      return parts[1] ? parts[1].substring(0, 5) : ''
    },
    set: (val: string) => {
      const currentDate = selectedCitaVentaDateOnly.value || new Date().toISOString().split('T')[0]
      fechaHoraCitaVenta.value = `${currentDate}T${val}`
    },
  })

  const selectCitaVentaTimeSlot = (time: string) => {
    selectedCitaVentaTimeOnly.value = time
  }

  const formattedSelectedCitaVentaDateTime = computed(() => {
    if (!fechaHoraCitaVenta.value) return t('sessions.summary.noSaleAppointment')
    try {
      const parts = fechaHoraCitaVenta.value.split('T')
      const datePart = parts[0]
      const timePart = parts[1]
      if (!datePart) return t('sessions.summary.noSaleAppointment')
      const dateNumbers = datePart.split('-').map((n) => parseInt(n, 10))
      if (dateNumbers.length < 3) return fechaHoraCitaVenta.value

      const year = dateNumbers[0] ?? 2026
      const month = dateNumbers[1] ?? 1
      const day = dateNumbers[2] ?? 1
      const d = new Date(year, month - 1, day)

      const loc = locale.value === 'en' ? 'en-US' : 'es-ES'
      const weekday = d.toLocaleDateString(loc, { weekday: 'long' })
      const monthName = d.toLocaleDateString(loc, { month: 'long' })
      const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1)

      const timeFormatted = timePart ? timePart.substring(0, 5) : '11:00'
      return `${capitalizedWeekday}, ${day} ${monthName} ${year}, ${timeFormatted}`
    } catch {
      return fechaHoraCitaVenta.value
    }
  })

  const formattedSelectedCheckoutDate = computed(() => {
    if (!formData.value.fechaSalida) return t('sessions.summary.noCheckoutDate')
    try {
      const dateNumbers = formData.value.fechaSalida.split('-').map((n) => parseInt(n, 10))
      if (dateNumbers.length < 3) return formData.value.fechaSalida

      const year = dateNumbers[0] ?? 2026
      const month = dateNumbers[1] ?? 1
      const day = dateNumbers[2] ?? 1
      const d = new Date(year, month - 1, day)

      const loc = locale.value === 'en' ? 'en-US' : 'es-ES'
      const weekday = d.toLocaleDateString(loc, { weekday: 'long' })
      const monthName = d.toLocaleDateString(loc, { month: 'long' })
      const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1)

      return `${capitalizedWeekday}, ${day} ${monthName} ${year}`
    } catch {
      return formData.value.fechaSalida
    }
  })

  const estadoSesionOptions = computed<{
    value: EstadoSesion
    label: string
    color: string
    icon: Component
  }[]>(() => [
    { value: 'PROGRAMADA', label: t('sessions.status.scheduled'), color: '#409eff', icon: Calendar },
    { value: 'COMPLETADA', label: t('sessions.status.completed'), color: '#67c23a', icon: Check },
    { value: 'CANCELADA', label: t('sessions.status.cancelled'), color: '#f56c6c', icon: Close },
    { value: 'NO_SHOW', label: t('sessions.status.noShow'), color: '#e6a23c', icon: UserX },
  ])

  const sessionStateTagType = computed<'' | 'primary' | 'success' | 'warning' | 'danger' | 'info'>(
    () => {
      switch (formData.value.estado) {
        case 'PROGRAMADA':
          return 'primary'
        case 'COMPLETADA':
          return 'success'
        case 'CANCELADA':
          return 'danger'
        case 'NO_SHOW':
          return 'warning'
        default:
          return 'primary'
      }
    },
  )

  const activeScheduleAccordion = ref<string>('')

  const alertOverdue = computed(() => {
    if (!isEditing.value || !loadedSession.value) return false
    const s = loadedSession.value
    return s.estado === 'PROGRAMADA' && new Date(s.fechaHoraInicio) < new Date()
  })

  const currentUser = computed(() => authStore.user)

  // Lock due to assigned photographer:
  // Once a session has an assigned photographer, only the assigned photographer,
  // supervisor, gerente, admin, and superusuario can edit it.
  const isLockedByPhotographer = computed(() => {
    if (!isEditing.value || !loadedSession.value) return false
    if (loadedSession.value.estado !== 'PROGRAMADA') return false
    if (!loadedSession.value.fotografoId) return false
    const role = currentUser.value?.roleCode?.toUpperCase() || ''
    const currentUserId = currentUser.value?.id
    const isAssignedFotografo = String(loadedSession.value.fotografoId) === String(currentUserId)
    const isPrivileged = ['SUPERVISOR', 'GERENTE', 'ADMIN', 'SUPERUSUARIO'].includes(role)
    return !isAssignedFotografo && !isPrivileged
  })

  // Role-based edit lock
  const isReadOnly = computed(() => {
    if (!isEditing.value || !loadedSession.value) return false
    const role = currentUser.value?.roleCode?.toUpperCase() || ''

    // 1. If session in DB is not PROGRAMADA (COMPLETADA, CANCELADA, NO_SHOW):
    // Only GERENTE, ADMIN, SUPERUSUARIO can edit
    if (loadedSession.value.estado !== 'PROGRAMADA') {
      return !['GERENTE', 'ADMIN', 'SUPERUSUARIO'].includes(role)
    }

    // 2. If session in DB is PROGRAMADA and already has an assigned photographer:
    // Only assigned photographer, supervisor, gerente, admin, superusuario can edit
    if (isLockedByPhotographer.value) {
      return true
    }

    if (role === 'CONTABLE') return true

    return false
  })

  const alertNoSaleAppointment = computed(() => {
    if (!isEditing.value || !loadedSession.value) return false
    const s = loadedSession.value
    return s.estado === 'COMPLETADA' && !s.citaVenta
  })

  const alertSaleNoShow = computed(() => {
    if (!isEditing.value || !loadedSession.value) return false
    const s = loadedSession.value
    return s.citaVenta?.estado === 'NO_SHOW'
  })

  const isSaving = ref(false)

  const defaultConceptos = computed(() => [
    t('sessions.concepts.birthday'),
    t('sessions.concepts.familyPhoto'),
    t('sessions.concepts.marriageProposal'),
    t('sessions.concepts.genderReveal'),
    t('sessions.concepts.other'),
  ])

  // Watch sales appointment date for conflict check
  watch(
    () => fechaHoraCitaVenta.value,
    async (newVal) => {
      if (!newVal || !formData.value.hotelId) {
        conflictsCitaVenta.value = []
        return
      }
      const existingCitaId = loadedSession.value?.citaVenta?.id
      conflictsCitaVenta.value = await saleStore.checkConflictos(
        formData.value.hotelId,
        newVal,
        existingCitaId,
      )
    },
  )

  const disponibilidadHotel = ref<HotelDisponibilidad | null>(null)
  const isCheckingDisponibilidad = ref(false)

  async function checkDisponibilidad() {
    const hotelId = Number(formData.value.hotelId)
    const fecha = formData.value.fechaHoraInicio?.trim()
    if (!hotelId || !fecha || fecha.length < 10) {
      disponibilidadHotel.value = null
      return
    }

    isCheckingDisponibilidad.value = true
    try {
      const excludeId = isEditing.value && sessionId.value ? sessionId.value : ''
      const url = `/api/hoteles/${hotelId}/disponibilidad?fecha=${encodeURIComponent(fecha)}${excludeId ? `&excludeSessionId=${excludeId}` : ''}`
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      })
      if (res.ok) {
        disponibilidadHotel.value = await res.json()

        // Si el fotógrafo actualmente seleccionado no está disponible (ocupado o ausente), deseleccionarlo
        if (formData.value.fotografoId) {
          const currentP = disponibilidadHotel.value?.fotografos?.find(
            (f) => String(f.id) === String(formData.value.fotografoId),
          )
          if (currentP && (currentP.ocupado || currentP.isAusente || currentP.motivoAusencia)) {
            formData.value.fotografoId = ''
          }
        }
      } else {
        disponibilidadHotel.value = null
      }
    } catch (err) {
      console.warn('Error al verificar disponibilidad:', err)
      disponibilidadHotel.value = null
    } finally {
      isCheckingDisponibilidad.value = false
    }
  }

  watch(
    [() => formData.value.hotelId, () => formData.value.fechaHoraInicio],
    () => {
      checkDisponibilidad()
    },
    { immediate: true },
  )

  const isTopeAlcanzado = computed(() => {
    if (formData.value.estado !== 'PROGRAMADA') return false
    if (!formData.value.fechaHoraInicio?.trim()) return false
    if (!disponibilidadHotel.value) return false
    return disponibilidadHotel.value.topeAlcanzado || disponibilidadHotel.value.disponibles === 0
  })

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

  // Auto-seleccionar hotel si el usuario solo tiene 1 hotel asignado o si no hay hotel seleccionado
  watch(
    () => userHotels.value,
    (hotels) => {
      if (!isEditing.value && hotels.length === 1 && hotels[0] && !formData.value.hotelId) {
        formData.value.hotelId = hotels[0].id
      }
    },
    { immediate: true },
  )

  // Photographers list for assignment (filtered by selected hotel, including SUPERVISOR)
  const photographers = computed(() => {
    const selectedHotelId = Number(formData.value.hotelId)
    if (!selectedHotelId) return []

    return userStore.usersWithProfile.filter((u) => {
      const perfilCode =
        u.perfil?.code?.toUpperCase() ||
        profileStore.getProfileById(u.profileId)?.code?.toUpperCase()
      const isFotografoOrSupervisor = perfilCode === 'FOTOGRAFO' || perfilCode === 'SUPERVISOR'
      if (!isFotografoOrSupervisor) return false
      const assignedHotelIds = u.hotelIds || []
      return assignedHotelIds.some((hId) => Number(hId) === selectedHotelId)
    })
  })

  // Reset photographer selection when hotel changes if selected photographer is not in the new hotel
  watch(
    () => formData.value.hotelId,
    () => {
      if (!formData.value.fotografoId) return
      const isAvailable = photographers.value.some(
        (p) => String(p.id) === String(formData.value.fotografoId),
      )
      if (!isAvailable) {
        formData.value.fotografoId = ''
      }
    },
  )

  // Ausencias laborales del fotógrafo seleccionado
  const fotografoAusencias = ref<CalendarioLaboralFotografo[]>([])

  watch(
    () => formData.value.fotografoId,
    async (newFotografoId) => {
      if (!newFotografoId) {
        fotografoAusencias.value = []
        return
      }
      try {
        await calendarioLaboralStore.fetchRegistros(newFotografoId)
        fotografoAusencias.value = [...calendarioLaboralStore.registros]
      } catch (err) {
        console.warn('Error al obtener ausencias del fotógrafo:', err)
        fotografoAusencias.value = []
      }
    },
    { immediate: true },
  )

  const selectedPhotographer = computed(() => {
    if (!formData.value.fotografoId) return null
    return (
      photographers.value.find((x) => String(x.id) === String(formData.value.fotografoId)) || null
    )
  })

  const selectedPhotographerName = computed(() => {
    if (!formData.value.fotografoId) return ''
    const p = selectedPhotographer.value
    return p ? `${p.nombre} ${p.apellidos}`.trim() : t('sessions.summary.thePhotographer')
  })

  // Obtener estado individual y disponibilidad para cada fotógrafo
  function getPhotographerStatus(photographerId: string | number) {
    const pIdStr = String(photographerId)
    const isCurrentlySelected = String(formData.value.fotografoId) === pIdStr

    // 1. Buscar detalle en disponibilidadHotel
    const pAvail = disponibilidadHotel.value?.fotografos?.find((f) => String(f.id) === pIdStr)

    // 2. Si el fotógrafo tiene ausencia registrada
    if (pAvail?.isAusente || pAvail?.motivoAusencia) {
      const motivo = pAvail.motivoAusencia ? ` (${pAvail.motivoAusencia})` : ''
      return {
        status: 'absent',
        label: `${t('sessions.photographerStatus.absent')}${motivo}`,
        tagClass: 'tag-busy',
        disabled: true,
      }
    }

    // 3. Si el fotógrafo ya tiene otra sesión asignada en esa franja horaria
    if (pAvail?.ocupado) {
      return {
        status: 'occupied',
        label: t('sessions.photographerStatus.occupied'),
        tagClass: 'tag-busy',
        disabled: true,
      }
    }

    // 4. Si se alcanzó el tope de sesiones del hotel y no está ya seleccionado
    if (isTopeAlcanzado.value && !isCurrentlySelected) {
      return {
        status: 'quota_full',
        label: t('sessions.photographerStatus.quotaFull'),
        tagClass: 'tag-busy',
        disabled: true,
      }
    }

    // 5. Si está asignado / seleccionado para esta sesión y está disponible
    if (isCurrentlySelected) {
      return {
        status: 'assigned',
        label: t('sessions.photographerStatus.assigned'),
        tagClass: 'tag-assigned',
        disabled: false,
      }
    }

    // 6. Si está libre
    return {
      status: 'available',
      label: t('sessions.photographerStatus.available'),
      tagClass: 'tag-available',
      disabled: false,
    }
  }

  const ausenciaFotografoActual = computed<CalendarioLaboralFotografo | null>(() => {
    const fotografoId = formData.value.fotografoId
    const fecha = formData.value.fechaHoraInicio?.trim()
    if (!fotografoId || !fecha || fecha.length < 10) return null
    const dateStr = fecha.slice(0, 10)

    const match = fotografoAusencias.value.find(
      (a) => dateStr >= a.fechaInicio && dateStr <= a.fechaFin,
    )
    return match || null
  })

  const isFotografoAusente = computed(() => {
    if (formData.value.estado !== 'PROGRAMADA') return false
    if (!formData.value.fechaHoraInicio?.trim()) return false
    return !!ausenciaFotografoActual.value
  })

  const selectedHotel = computed(() => {
    if (!formData.value.hotelId) return null
    return hotelStore.hotels.find((h) => Number(h.id) === Number(formData.value.hotelId)) || null
  })

  const selectedHotelDisplayName = computed(() => {
    if (!selectedHotel.value) return t('sessions.summary.noHotel')
    return selectedHotel.value.nombre
  })

  const summaryFormattedDate = computed(() => {
    if (!formData.value.fechaHoraInicio) return t('sessions.summary.noDate')
    try {
      const datePart = formData.value.fechaHoraInicio.split('T')[0]
      if (!datePart) return t('sessions.summary.noDate')
      const parts = datePart.split('-').map(Number)
      const year = parts[0] ?? 2026
      const month = parts[1] ?? 1
      const day = parts[2] ?? 1
      const d = new Date(year, month - 1, day)
      const loc = locale.value === 'en' ? 'en-US' : 'es-ES'
      const weekday = d.toLocaleDateString(loc, { weekday: 'long' })
      const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1)
      const monthName = d.toLocaleDateString(loc, { month: 'long' })
      const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1)
      return `${capitalizedWeekday}, ${day} ${capitalizedMonth}, ${year}`
    } catch {
      return formData.value.fechaHoraInicio
    }
  })

  const appointmentSummaryCardStyle = computed(() => {
    const color = selectedPhotographer.value?.color
      ? getUserBgColor(selectedPhotographer.value.color)
      : '#2563eb'
    return {
      background: color,
      boxShadow: `0 4px 14px ${color}55`,
    }
  })

  const summaryPersonas = computed(() => {
    const adultos = Number(formData.value.numAdultos) || 0
    const ninos = Number(formData.value.numNinos) || 0
    const total = adultos + ninos

    if (total === 0) return t('sessions.summary.zeroPeople')
    if (adultos > 0 && ninos > 0) {
      const childrenLabel = ninos === 1 ? t('sessions.summary.childSingle') : t('sessions.summary.childPlural')
      return t('sessions.summary.peopleFormat', { total, adults: adultos, children: ninos, childrenLabel })
    }
    if (ninos > 0) {
      const childrenLabel = ninos === 1 ? t('sessions.summary.childSingle') : t('sessions.summary.childPlural')
      return `${ninos} ${childrenLabel}`
    }
    const adultLabel = adultos === 1 ? t('sessions.summary.adultSingle') : t('sessions.summary.adultPlural')
    return `${adultos} ${adultLabel}`
  })

  const summaryClienteNombre = computed(() => {
    return formData.value.clienteNombre?.trim() || t('sessions.summary.unspecified')
  })

  const summaryMotivo = computed(() => {
    return formData.value.concepto?.trim() || t('sessions.summary.unspecified')
  })

  // Mes visible actualmente en el panel del calendario
  const currentVisibleMonth = ref<Date>(new Date())

  function handlePanelChange(date: Date) {
    if (date && date instanceof Date && !isNaN(date.getTime())) {
      currentVisibleMonth.value = date
    }
  }

  watch(
    () => formData.value.fechaHoraInicio,
    (newVal) => {
      if (newVal && newVal.length >= 10) {
        const d = new Date(newVal)
        if (!isNaN(d.getTime())) {
          currentVisibleMonth.value = d
        }
      }
    },
  )

  const hasAusenciasInVisibleMonth = computed(() => {
    if (!formData.value.fotografoId || !fotografoAusencias.value.length) return false
    const d = currentVisibleMonth.value || new Date()
    const year = d.getFullYear()
    const month = d.getMonth() // 0-indexed
    const lastDay = new Date(year, month + 1, 0).getDate()

    const startOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const endOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    return fotografoAusencias.value.some((reg) => {
      return reg.fechaInicio <= endOfMonth && reg.fechaFin >= startOfMonth
    })
  })

  function formatDateIso(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Contador de sesiones fotográficas activas por fecha (YYYY-MM-DD)
  const sessionsCountByDate = computed<Record<string, number>>(() => {
    const counts: Record<string, number> = {}
    const currentHotelId = formData.value.hotelId ? Number(formData.value.hotelId) : null
    const allowedHotelIds = new Set(userHotels.value.map((h) => Number(h.id)))

    for (const s of sessionStore.sessions) {
      if (s.estado === 'CANCELADA') continue
      if (currentHotelId) {
        if (Number(s.hotelId) !== currentHotelId) continue
      } else if (allowedHotelIds.size > 0 && !allowedHotelIds.has(Number(s.hotelId))) {
        continue
      }
      if (!s.fechaHoraInicio) continue

      const dateStr = s.fechaHoraInicio.slice(0, 10)
      if (dateStr) {
        counts[dateStr] = (counts[dateStr] || 0) + 1
      }
    }

    return counts
  })

  function getFotografoCellClassName(cellDate: Date): string {
    const classes: string[] = []
    const cellIso = formatDateIso(cellDate)

    // Conteo de sesiones activas del hotel en este día (Badge indicador)
    const count = sessionsCountByDate.value[cellIso] || 0
    if (count > 0) {
      if (count <= 30) {
        classes.push(`has-sessions-${count}`)
      } else {
        classes.push('has-sessions-plus')
      }
    }

    return classes.join(' ')
  }

  // Contador de citas de venta activas por fecha (YYYY-MM-DD)
  const salesCountByDate = computed<Record<string, number>>(() => {
    const counts: Record<string, number> = {}
    const currentHotelId = formData.value.hotelId ? Number(formData.value.hotelId) : null
    const allowedHotelIds = new Set(userHotels.value.map((h) => Number(h.id)))

    for (const c of saleStore.citasVenta) {
      if (c.estado === 'CANCELADA') continue
      if (currentHotelId) {
        if (Number(c.hotelId) !== currentHotelId) continue
      } else if (allowedHotelIds.size > 0 && !allowedHotelIds.has(Number(c.hotelId))) {
        continue
      }
      if (!c.fechaHoraCita) continue

      const dateStr = c.fechaHoraCita.slice(0, 10)
      if (dateStr) {
        counts[dateStr] = (counts[dateStr] || 0) + 1
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

  // Computed Date object adapter for IosDatepicker (for mobile)
  const mobileDateValue = computed<Date>({
    get() {
      if (!formData.value.fechaHoraInicio) return new Date()
      const d = new Date(formData.value.fechaHoraInicio)
      return isNaN(d.getTime()) ? new Date() : d
    },
    set(val: Date | null | undefined) {
      if (val && val instanceof Date && !isNaN(val.getTime())) {
        const year = val.getFullYear()
        const month = String(val.getMonth() + 1).padStart(2, '0')
        const day = String(val.getDate()).padStart(2, '0')
        const hours = String(val.getHours()).padStart(2, '0')
        const minutes = String(val.getMinutes()).padStart(2, '0')
        formData.value.fechaHoraInicio = `${year}-${month}-${day}T${hours}:${minutes}`
      }
    },
  })

  // Computed Date object adapter for IosDatepicker (fechaSalida for mobile)
  const mobileFechaSalidaValue = computed<Date>({
    get() {
      if (!formData.value.fechaSalida) return new Date()
      const d = new Date(formData.value.fechaSalida)
      return isNaN(d.getTime()) ? new Date() : d
    },
    set(val: Date | null | undefined) {
      if (val && val instanceof Date && !isNaN(val.getTime())) {
        const year = val.getFullYear()
        const month = String(val.getMonth() + 1).padStart(2, '0')
        const day = String(val.getDate()).padStart(2, '0')
        formData.value.fechaSalida = `${year}-${month}-${day}`
      }
    },
  })

  // Computed Date object adapter for IosDatepicker (fechaHoraCitaVenta for mobile)
  const mobileCitaVentaValue = computed<Date>({
    get() {
      if (!fechaHoraCitaVenta.value) return new Date()
      const d = new Date(fechaHoraCitaVenta.value)
      return isNaN(d.getTime()) ? new Date() : d
    },
    set(val: Date | null | undefined) {
      if (val && val instanceof Date && !isNaN(val.getTime())) {
        const year = val.getFullYear()
        const month = String(val.getMonth() + 1).padStart(2, '0')
        const day = String(val.getDate()).padStart(2, '0')
        const hours = String(val.getHours()).padStart(2, '0')
        const minutes = String(val.getMinutes()).padStart(2, '0')
        fechaHoraCitaVenta.value = `${year}-${month}-${day}T${hours}:${minutes}`
      }
    },
  })

  async function loadInitialData() {
    await Promise.all([
      hotelStore.fetchHotels(),
      userStore.fetchUsers(),
      profileStore.fetchProfiles(),
      sessionStore.fetchSessions(),
      saleStore.fetchCitasVenta(),
    ])

    if (isEditing.value && sessionId.value) {
      const existing = await sessionStore.fetchSession(Number(sessionId.value))
      if (existing) {
        const roleCode = currentUser.value?.roleCode?.toUpperCase()
        const isGlobalAccess =
          roleCode === 'SUPERUSUARIO' || roleCode === 'ADMIN'
        const allowedHotelIds = new Set(userHotels.value.map((h) => Number(h.id)))

        if (
          !isGlobalAccess &&
          userHotels.value.length > 0 &&
          !allowedHotelIds.has(Number(existing.hotelId))
        ) {
          ElMessage.error(t('sessions.toasts.noAccessHotel'))
          handleGoBack()
          return
        }

        loadedSession.value = existing

        formData.value = {
          hotelId: existing.hotelId,
          fotografoId: existing.fotografoId || '',
          clienteNombre: existing.clienteNombre,
          numeroHabitacion: existing.numeroHabitacion || '',
          clienteEmail: existing.clienteEmail || '',
          clienteTelefono: existing.clienteTelefono || '',
          numAdultos: existing.numAdultos ?? 1,
          numNinos: existing.numNinos ?? 0,
          fechaHoraInicio: existing.fechaHoraInicio,
          fechaSalida: existing.fechaSalida || '',
          concepto: existing.concepto || '',
          estado: (existing.estado as EstadoSesion) || 'PROGRAMADA',
          notas: existing.notas || '',
        }

        if (existing.citaVenta) {
          fechaHoraCitaVenta.value = existing.citaVenta.fechaHoraCita || ''
        }
      } else {
        ElMessage.error(t('sessions.toasts.sessionNotFound'))
        handleGoBack()
      }
    } else {
      // Prefill hotelId from route query or default to user's first hotel
      const queryHotelId = route.query.hotelId ? Number(route.query.hotelId) : 0
      if (queryHotelId && userHotels.value.some((h) => h.id === queryHotelId)) {
        formData.value.hotelId = queryHotelId
      } else if (userHotels.value.length > 0) {
        formData.value.hotelId = userHotels.value[0]?.id ?? 0
      }

      // Prefill start date/time only if explicitly provided with time in route query (e.g. from calendar slot click)
      const queryStart = route.query.start ? String(route.query.start) : ''
      if (queryStart && queryStart.includes('T') && queryStart.length >= 16) {
        formData.value.fechaHoraInicio = queryStart.slice(0, 16)
      } else {
        formData.value.fechaHoraInicio = ''
      }
    }
  }

  onMounted(() => {
    loadInitialData()
  })

  function handleGoBack() {
    router.push('/agenda')
  }

  async function handleSaveSession() {
    if (isReadOnly.value) return

    if (!formData.value.clienteNombre.trim()) {
      ElMessage.warning(t('sessions.toasts.clientNameRequired'))
      return
    }

    if (!formData.value.hotelId) {
      ElMessage.warning(t('sessions.toasts.hotelRequired'))
      return
    }

    if (!formData.value.fechaHoraInicio) {
      ElMessage.warning(t('sessions.toasts.startDateTimeRequired'))
      return
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (!isEditing.value && new Date(formData.value.fechaHoraInicio) < today) {
      ElMessage.error(t('sessions.toasts.pastDateSessionError'))
      return
    }

    if (
      !isEditing.value &&
      fechaHoraCitaVenta.value &&
      new Date(fechaHoraCitaVenta.value) < today
    ) {
      ElMessage.error(t('sessions.toasts.pastDateSaleError'))
      return
    }

    if (conflictsCitaVenta.value.length > 0) {
      ElMessage.warning(t('sessions.toasts.saleConflictsWarning'))
    }

    if (formData.value.estado === 'PROGRAMADA' && isTopeAlcanzado.value) {
      ElMessage.error(t('sessions.toasts.quotaFullError'))
      return
    }

    if (
      formData.value.estado === 'PROGRAMADA' &&
      isFotografoAusente.value &&
      ausenciaFotografoActual.value
    ) {
      ElMessage.error(
        t('sessions.toasts.photographerAbsentError', {
          photographer: selectedPhotographerName.value,
          motivo: ausenciaFotografoActual.value.motivo,
        }),
      )
      return
    }

    isSaving.value = true
    try {
      let savedSessionId: number

      if (isEditing.value && sessionId.value) {
        savedSessionId = Number(sessionId.value)
        await sessionStore.updateSession(savedSessionId, {
          hotelId: formData.value.hotelId,
          fotografoId: formData.value.fotografoId || null,
          clienteNombre: formData.value.clienteNombre.trim(),
          clienteEmail: formData.value.clienteEmail ? formData.value.clienteEmail.trim() : null,
          clienteTelefono: formData.value.clienteTelefono
            ? formData.value.clienteTelefono.trim()
            : null,
          numeroHabitacion: formData.value.numeroHabitacion
            ? formData.value.numeroHabitacion.trim()
            : null,
          numAdultos: formData.value.numAdultos,
          numNinos: formData.value.numNinos,
          fechaSalida: formData.value.fechaSalida ? formData.value.fechaSalida : null,
          concepto: formData.value.concepto ? formData.value.concepto.trim() : null,
          fechaHoraInicio: formData.value.fechaHoraInicio,
          estado: formData.value.estado,
          notas: formData.value.notas ? formData.value.notas.trim() : null,
        })
        ElMessage.success(t('sessions.toasts.sessionUpdated'))
      } else {
        const created = await sessionStore.addSession({
          ...formData.value,
          creadorId: currentUser.value?.id,
        })
        savedSessionId = created.id
        ElMessage.success(t('sessions.toasts.sessionCreated'))
      }

      // Process Cita de Venta if fechaHoraCitaVenta is provided AND changed
      if (fechaHoraCitaVenta.value) {
        const existingCita = loadedSession.value?.citaVenta
        if (existingCita) {
          if (fechaHoraCitaVenta.value !== (existingCita.fechaHoraCita || '')) {
            await saleStore.updateCitaVenta(existingCita.id, {
              fechaHoraCita: fechaHoraCitaVenta.value,
            })
          }
        } else {
          await saleStore.addCitaVenta({
            sesionId: savedSessionId,
            hotelId: formData.value.hotelId,
            fechaHoraCita: fechaHoraCitaVenta.value,
          })
        }
      }

      await Promise.all([sessionStore.fetchSessions(), saleStore.fetchCitasVenta()])
      handleGoBack()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('sessions.toasts.saveError')
      ElMessage.error(msg)
    } finally {
      isSaving.value = false
    }
  }

  return {
    timeSlots,
    formData,
    sessionId,
    isEditing,
    loadedSession,
    fechaHoraCitaVenta,
    conflictsCitaVenta,
    selectedDateOnly,
    selectedTimeOnly,
    formattedSelectedSessionDateTime,
    selectTimeSlot,
    selectPhotographerCard,
    selectedCitaVentaDateOnly,
    selectedCitaVentaTimeOnly,
    selectCitaVentaTimeSlot,
    formattedSelectedCitaVentaDateTime,
    formattedSelectedCheckoutDate,
    estadoSesionOptions,
    sessionStateTagType,
    activeScheduleAccordion,
    alertOverdue,
    currentUser,
    isReadOnly,
    isLockedByPhotographer,
    alertNoSaleAppointment,
    alertSaleNoShow,
    isSaving,
    defaultConceptos,
    disponibilidadHotel,
    isCheckingDisponibilidad,
    checkDisponibilidad,
    isTopeAlcanzado,
    userHotels,
    photographers,
    fotografoAusencias,
    selectedPhotographer,
    selectedPhotographerName,
    getPhotographerStatus,
    ausenciaFotografoActual,
    isFotografoAusente,
    selectedHotel,
    selectedHotelDisplayName,
    summaryFormattedDate,
    appointmentSummaryCardStyle,
    summaryPersonas,
    summaryClienteNombre,
    summaryMotivo,
    currentVisibleMonth,
    handlePanelChange,
    hasAusenciasInVisibleMonth,
    formatDateIso,
    sessionsCountByDate,
    getFotografoCellClassName,
    salesCountByDate,
    getCitaVentaCellClassName,
    disabledPastDates,
    mobileDateValue,
    mobileFechaSalidaValue,
    mobileCitaVentaValue,
    handleGoBack,
    handleSaveSession,
    sessionStore,
    saleStore,
    hotelStore,
    userStore,
    profileStore,
    calendarioLaboralStore,
    authStore,
    router,
    route,
    getUserInitials,
    getUserBgColor,
  }
}

export type PhotoSessionFormContext = ReturnType<typeof usePhotoSessionForm>
