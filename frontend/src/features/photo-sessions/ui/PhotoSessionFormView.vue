<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, type Component } from 'vue'
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
import {
  User,
  Message,
  Phone,
  Check,
  ArrowLeft,
  Close,
  Edit,
} from '@element-plus/icons-vue'
import { Building2, PlaneTakeoff, Users, Baby, UserX, Camera, Calendar } from '@lucide/vue'
import { ElMessage } from 'element-plus'
import { IosDatepicker } from 'vue-ios-style-datepicker'
import { getUserInitials, getUserBgColor } from '@/features/users/utils/user-avatar'

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
  if (!formData.value.fechaHoraInicio) return 'Sin fecha seleccionada'
  try {
    const parts = formData.value.fechaHoraInicio.split('T')
    const datePart = parts[0]
    const timePart = parts[1]
    if (!datePart) return 'Sin fecha seleccionada'
    const dateNumbers = datePart.split('-').map((n) => parseInt(n, 10))
    if (dateNumbers.length < 3) return formData.value.fechaHoraInicio

    const year = dateNumbers[0] ?? 2026
    const month = dateNumbers[1] ?? 1
    const day = dateNumbers[2] ?? 1
    const d = new Date(year, month - 1, day)

    const weekday = d.toLocaleDateString('es-ES', { weekday: 'long' })
    const monthName = d.toLocaleDateString('es-ES', { month: 'long' })
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

const sessionId = computed(() => route.params.id as string | undefined)
const isEditing = computed(() => !!sessionId.value)
const loadedSession = ref<SesionFotografica | null>(null)

const fechaHoraCitaVenta = ref('')
const conflictsCitaVenta = ref<ConflictoCitaVenta[]>([])

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
  if (!fechaHoraCitaVenta.value) return 'Sin cita de venta'
  try {
    const parts = fechaHoraCitaVenta.value.split('T')
    const datePart = parts[0]
    const timePart = parts[1]
    if (!datePart) return 'Sin cita de venta'
    const dateNumbers = datePart.split('-').map((n) => parseInt(n, 10))
    if (dateNumbers.length < 3) return fechaHoraCitaVenta.value

    const year = dateNumbers[0] ?? 2026
    const month = dateNumbers[1] ?? 1
    const day = dateNumbers[2] ?? 1
    const d = new Date(year, month - 1, day)

    const weekday = d.toLocaleDateString('es-ES', { weekday: 'long' })
    const monthName = d.toLocaleDateString('es-ES', { month: 'long' })
    const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1)

    const timeFormatted = timePart ? timePart.substring(0, 5) : '11:00'
    return `${capitalizedWeekday}, ${day} ${monthName} ${year}, ${timeFormatted}`
  } catch {
    return fechaHoraCitaVenta.value
  }
})

const formattedSelectedCheckoutDate = computed(() => {
  if (!formData.value.fechaSalida) return 'Sin fecha de checkout'
  try {
    const dateNumbers = formData.value.fechaSalida.split('-').map((n) => parseInt(n, 10))
    if (dateNumbers.length < 3) return formData.value.fechaSalida

    const year = dateNumbers[0] ?? 2026
    const month = dateNumbers[1] ?? 1
    const day = dateNumbers[2] ?? 1
    const d = new Date(year, month - 1, day)

    const weekday = d.toLocaleDateString('es-ES', { weekday: 'long' })
    const monthName = d.toLocaleDateString('es-ES', { month: 'long' })
    const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1)

    return `${capitalizedWeekday}, ${day} ${monthName} ${year}`
  } catch {
    return formData.value.fechaSalida
  }
})

const estadoSesionOptions: {
  value: EstadoSesion
  label: string
  color: string
  icon: Component
}[] = [
  { value: 'PROGRAMADA', label: 'PROGRAMADA', color: '#409eff', icon: Calendar },
  { value: 'COMPLETADA', label: 'COMPLETADA', color: '#67c23a', icon: Check },
  { value: 'CANCELADA', label: 'CANCELADA', color: '#f56c6c', icon: Close },
  { value: 'NO_SHOW', label: 'NO VINO', color: '#e6a23c', icon: UserX },
]

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

const activeScheduleAccordion = ref<string>('sesion')

const alertOverdue = computed(() => {
  if (!isEditing.value || !loadedSession.value) return false
  const s = loadedSession.value
  return s.estado === 'PROGRAMADA' && new Date(s.fechaHoraInicio) < new Date()
})

// Role-based edit lock (only locks if session was already saved in DB with status other than PROGRAMADA)
const isReadOnly = computed(() => {
  if (!isEditing.value || !loadedSession.value) return false
  if (loadedSession.value.estado === 'PROGRAMADA') return false
  const role = currentUser.value?.roleCode?.toUpperCase() || ''
  return !['SUPERVISOR', 'GERENTE', 'ADMIN', 'SUPERUSUARIO'].includes(role)
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

const defaultConceptos = [
  'Cumpleaños',
  'Foto familiar',
  'Pedida de matrimonio',
  'Revelación de género',
  'Otro',
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

interface HotelDisponibilidad {
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
      label: `Ausente${motivo}`,
      tagClass: 'tag-busy',
      disabled: true,
    }
  }

  // 3. Si el fotógrafo ya tiene otra sesión asignada en esa franja horaria
  if (pAvail?.ocupado) {
    return {
      status: 'occupied',
      label: 'Ocupado en este horario',
      tagClass: 'tag-busy',
      disabled: true,
    }
  }

  // 4. Si se alcanzó el tope de sesiones del hotel y no está ya seleccionado
  if (isTopeAlcanzado.value && !isCurrentlySelected) {
    return {
      status: 'quota_full',
      label: 'No disponible (Tope alcanzado)',
      tagClass: 'tag-busy',
      disabled: true,
    }
  }

  // 5. Si está asignado / seleccionado para esta sesión y está disponible
  if (isCurrentlySelected) {
    return {
      status: 'assigned',
      label: 'Asignado a esta sesión',
      tagClass: 'tag-assigned',
      disabled: false,
    }
  }

  // 6. Si está libre
  return {
    status: 'available',
    label: 'Disponible',
    tagClass: 'tag-available',
    disabled: false,
  }
}

// Current user context
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

// Photographers list for assignment (filtered by selected hotel)
const photographers = computed(() => {
  const selectedHotelId = Number(formData.value.hotelId)
  if (!selectedHotelId) return []

  return userStore.usersWithProfile.filter((u) => {
    const perfilCode =
      u.perfil?.code?.toUpperCase() || profileStore.getProfileById(u.profileId)?.code?.toUpperCase()
    const isFotografo = perfilCode === 'FOTOGRAFO'
    if (!isFotografo) return false
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
  return p ? `${p.nombre} ${p.apellidos}`.trim() : 'El fotógrafo'
})

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
  if (!selectedHotel.value) return 'Sin hotel'
  return selectedHotel.value.nombre
})

const summaryFormattedDate = computed(() => {
  if (!formData.value.fechaHoraInicio) return 'Sin fecha'
  try {
    const datePart = formData.value.fechaHoraInicio.split('T')[0]
    if (!datePart) return 'Sin fecha'
    const parts = datePart.split('-').map(Number)
    const year = parts[0] ?? 2026
    const month = parts[1] ?? 1
    const day = parts[2] ?? 1
    const d = new Date(year, month - 1, day)
    const weekday = d.toLocaleDateString('es-ES', { weekday: 'long' })
    const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1)
    const monthName = d.toLocaleDateString('es-ES', { month: 'long' })
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

  if (total === 0) return '0 personas'
  if (adultos > 0 && ninos > 0) {
    return `${total} (${adultos} ad., ${ninos} ${ninos === 1 ? 'niño' : 'niños'})`
  }
  if (ninos > 0) {
    return `${ninos} ${ninos === 1 ? 'niño' : 'niños'}`
  }
  return `${adultos} ${adultos === 1 ? 'adulto' : 'adultos'}`
})

const summaryClienteNombre = computed(() => {
  return formData.value.clienteNombre?.trim() || 'Sin especificar'
})

const summaryMotivo = computed(() => {
  return formData.value.concepto?.trim() || 'Sin especificar'
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

function getFotografoCellClassName(cellDate: Date): string {
  const classes: string[] = []
  const cellIso = formatDateIso(cellDate)

  // 1. Ausencias del fotógrafo seleccionado
  if (formData.value.fotografoId && fotografoAusencias.value.length) {
    for (const reg of fotografoAusencias.value) {
      if (cellIso >= reg.fechaInicio && cellIso <= reg.fechaFin) {
        let baseClass = ''
        if (reg.motivo === 'BAJA') baseClass = 'cell-highlight-baja'
        else if (reg.motivo === 'VACACIONES') baseClass = 'cell-highlight-vacaciones'
        else if (reg.motivo === 'PERMISO') baseClass = 'cell-highlight-permiso'
        else baseClass = 'cell-highlight-otro'

        const isStart = cellIso === reg.fechaInicio
        const isEnd = cellIso === reg.fechaFin
        const isMonday = cellDate.getDay() === 1
        const isSunday = cellDate.getDay() === 0

        let posClass = ''
        if ((isStart || isMonday) && (isEnd || isSunday)) {
          posClass = 'cell-range-single'
        } else if (isStart || isMonday) {
          posClass = 'cell-range-start'
        } else if (isEnd || isSunday) {
          posClass = 'cell-range-end'
        } else {
          posClass = 'cell-range-middle'
        }

        classes.push(`${baseClass} ${posClass}`)
        break
      }
    }
  }

  // 2. Conteo de sesiones activas del hotel en este día (Badge rojo)
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

// Mobile detection state
const isMobile = ref(false)

function checkMobile() {
  isMobile.value = window.innerWidth <= 768
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

onMounted(async () => {
  checkMobile()
  window.addEventListener('resize', checkMobile)

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
        roleCode === 'SUPERUSUARIO' || roleCode === 'ADMIN' || roleCode === 'CONTABLE'
      const allowedHotelIds = new Set(userHotels.value.map((h) => Number(h.id)))

      if (
        !isGlobalAccess &&
        userHotels.value.length > 0 &&
        !allowedHotelIds.has(Number(existing.hotelId))
      ) {
        ElMessage.error('No tienes acceso a las sesiones fotográficas de este hotel')
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
      ElMessage.error('Sesión fotográfica no encontrada')
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

    // Prefill photographer (current user if photographer and assigned to selected hotel)
    const isPhotographer = currentUser.value?.roleCode?.toUpperCase() === 'FOTOGRAFO'
    if (isPhotographer && currentUser.value) {
      const isAssigned = currentUser.value.hotelIds?.some(
        (hId) => Number(hId) === Number(formData.value.hotelId),
      )
      if (isAssigned) {
        formData.value.fotografoId = currentUser.value.id
      }
    }

    // Prefill start date/time only if explicitly provided with time in route query (e.g. from calendar slot click)
    const queryStart = route.query.start ? String(route.query.start) : ''
    if (queryStart && queryStart.includes('T') && queryStart.length >= 16) {
      formData.value.fechaHoraInicio = queryStart.slice(0, 16)
    } else {
      formData.value.fechaHoraInicio = ''
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

function handleGoBack() {
  router.push('/agenda')
}

async function handleSaveSession() {
  if (!formData.value.clienteNombre.trim()) {
    ElMessage.warning('El nombre del cliente es obligatorio')
    return
  }

  if (!formData.value.hotelId) {
    ElMessage.warning('Debes seleccionar un hotel')
    return
  }

  if (!formData.value.fechaHoraInicio) {
    ElMessage.warning('Debes seleccionar la fecha y hora de inicio')
    return
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (!isEditing.value && new Date(formData.value.fechaHoraInicio) < today) {
    ElMessage.error('No se pueden crear sesiones fotográficas en fechas anteriores al día actual')
    return
  }

  if (!isEditing.value && fechaHoraCitaVenta.value && new Date(fechaHoraCitaVenta.value) < today) {
    ElMessage.error('No se pueden crear citas de venta en fechas anteriores al día actual')
    return
  }

  if (conflictsCitaVenta.value.length > 0) {
    ElMessage.warning('Atención: Hay conflictos de horario con otras citas de venta')
  }

  if (formData.value.estado === 'PROGRAMADA' && isTopeAlcanzado.value) {
    ElMessage.error(
      'Tope alcanzado: no se pueden agendar más sesiones a esta misma hora en este hotel.',
    )
    return
  }

  if (
    formData.value.estado === 'PROGRAMADA' &&
    isFotografoAusente.value &&
    ausenciaFotografoActual.value
  ) {
    ElMessage.error(
      `${selectedPhotographerName.value} no está disponible en la fecha seleccionada (${ausenciaFotografoActual.value.motivo}).`,
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
      ElMessage.success('Sesión fotográfica actualizada correctamente')
    } else {
      const created = await sessionStore.addSession({
        ...formData.value,
        creadorId: currentUser.value?.id,
      })
      savedSessionId = created.id
      ElMessage.success('Sesión fotográfica agendada correctamente')
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
    const msg = err instanceof Error ? err.message : 'Error al guardar la sesión'
    ElMessage.error(msg)
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="session-form-container">
    <!-- Header con botón redondo Volver, Título y Subtítulo -->
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" circle class="back-btn" @click="handleGoBack" />
        <div class="header-titles">
          <h1 class="page-title">
            {{ isEditing ? 'Editar Sesión Fotográfica' : 'Nueva Sesión Fotográfica' }}
          </h1>
        </div>
      </div>
    </div>

    <!-- Banner de Alertas -->
    <div v-if="alertOverdue || alertNoSaleAppointment || alertSaleNoShow" class="alerts-container">
      <el-alert
        v-if="alertOverdue"
        type="warning"
        show-icon
        :closable="false"
        class="form-alert-banner"
      >
        <template #title>
          Sesión Vencida — Esta sesión estaba programada para la fecha elegida y ya ha pasado. Por
          favor actualiza su estado.
        </template>
      </el-alert>

      <el-alert
        v-if="alertNoSaleAppointment"
        type="info"
        show-icon
        :closable="false"
        class="form-alert-banner"
      >
        <template #title>
          Sin Cita de Venta — Esta sesión está completada pero aún no tiene una cita de venta
          programada.
        </template>
        <template #default>
          <div style="margin-top: 0.5rem">
            <el-button
              type="primary"
              size="small"
              @click="router.push(`/ventas/nueva?sesionId=${loadedSession?.id}`)"
            >
              Agendar Cita de Venta
            </el-button>
          </div>
        </template>
      </el-alert>

      <el-alert
        v-if="alertSaleNoShow"
        type="error"
        show-icon
        :closable="false"
        class="form-alert-banner"
      >
        <template #title>
          No Show en Venta — El cliente no se presentó a la cita de venta. Puedes reprogramarla.
        </template>
        <template #default>
          <div style="margin-top: 0.5rem">
            <el-button
              type="danger"
              size="small"
              @click="router.push(`/ventas/${loadedSession?.citaVenta?.id}/editar`)"
            >
              Reprogramar Cita de Venta
            </el-button>
          </div>
        </template>
      </el-alert>
    </div>

    <!-- Read-only lock banner -->
    <el-alert v-if="isReadOnly" type="warning" :closable="false" show-icon class="lock-banner">
      Esta sesión no está en estado programada. Para editarla contacta con tu supervisor o gerente
      de area.
    </el-alert>

    <!-- Layout de 2 Columnas -->
    <div class="session-form-layout">
      <!-- Columna Izquierda: Formulario Principal -->
      <div class="form-main-col">
        <el-form
          :model="formData"
          label-position="top"
          size="large"
          :disabled="isReadOnly"
          class="session-form"
        >
          <!-- Tarjeta 1: Información del Cliente -->
          <el-card class="form-card client-info-card" shadow="never">
            <div class="card-section-header">
              <el-icon class="card-section-icon"><User /></el-icon>
              <h2 class="card-section-title">Información del Cliente</h2>
            </div>

            <div class="client-info-fields">
              <!-- Fila 1: Nombre del Cliente (ancho completo) -->
              <el-form-item label="Nombre del Cliente" required>
                <el-input
                  v-model="formData.clienteNombre"
                  size="large"
                  placeholder="Ej. Familia López / Pareja Smith"
                  :prefix-icon="User"
                />
              </el-form-item>

              <!-- Fila 2: Hotel y Nº de Habitación -->
              <div class="form-row-2">
                <el-form-item label="Hotel" required>
                  <el-select
                    v-model="formData.hotelId"
                    size="large"
                    style="width: 100%"
                    placeholder="Selecciona hotel"
                  >
                    <el-option
                      v-for="hotel in userHotels"
                      :key="hotel.id"
                      :label="hotel.nombre"
                      :value="hotel.id"
                    />
                  </el-select>
                </el-form-item>

                <el-form-item label="Nº de Habitación">
                  <el-input
                    v-model="formData.numeroHabitacion"
                    size="large"
                    placeholder="Ej. 304B / Villa 12"
                    :prefix-icon="Building2"
                  />
                </el-form-item>
              </div>

              <!-- Fila 3: Email y Teléfono -->
              <div class="form-row-2">
                <el-form-item label="Email del Cliente">
                  <el-input
                    v-model="formData.clienteEmail"
                    size="large"
                    placeholder="cliente@ejemplo.com"
                    :prefix-icon="Message"
                  />
                </el-form-item>

                <el-form-item label="Teléfono del Cliente">
                  <el-input
                    v-model="formData.clienteTelefono"
                    size="large"
                    placeholder="+34 600 000 000"
                    :prefix-icon="Phone"
                  />
                </el-form-item>
              </div>

              <!-- Fila 4: Participantes (Adultos y Niños) -->
              <div class="form-row-pax">
                <el-form-item>
                  <template #label>
                    <span class="pax-item-label">
                      <el-icon class="pax-label-icon"><Users /></el-icon>
                      <span>Adultos</span>
                    </span>
                  </template>
                  <el-input-number
                    v-model="formData.numAdultos"
                    size="large"
                    :min="0"
                    :max="99"
                    :step="1"
                    class="pax-input-number"
                  />
                </el-form-item>

                <el-form-item>
                  <template #label>
                    <span class="pax-item-label">
                      <el-icon class="pax-label-icon"><Baby /></el-icon>
                      <span>Niños</span>
                    </span>
                  </template>
                  <el-input-number
                    v-model="formData.numNinos"
                    size="large"
                    :min="0"
                    :max="99"
                    :step="1"
                    class="pax-input-number"
                  />
                </el-form-item>
              </div>
            </div>
          </el-card>

          <!-- TARJETA: Acordeón de Fechas y Planificación -->
          <el-card class="form-card schedule-card" shadow="never">
            <el-collapse v-model="activeScheduleAccordion" accordion class="schedule-accordion">
              <!-- Acordeón 1: Fecha y Hora de la Sesión -->
              <el-collapse-item name="sesion">
                <template #title>
                  <div class="accordion-header-title">
                    <div class="card-header-title-group">
                      <el-icon class="card-section-icon"><Camera :size="18" /></el-icon>
                      <h2 class="card-section-title">Fecha y Hora de la Sesión</h2>
                    </div>
                    <div class="header-datetime-preview">
                      <el-tag
                        :type="sessionStateTagType"
                        effect="light"
                        round
                        size="large"
                        class="header-datetime-tag"
                      >
                        {{ formattedSelectedSessionDateTime }}
                      </el-tag>
                    </div>
                  </div>
                </template>

                <div class="accordion-item-body">
                  <!-- Grid Principal: Calendario (Izq) + Horario y Fotógrafo (Der) -->
                  <div class="schedule-main-grid">
                    <!-- Columna Izquierda: Calendario -->
                    <div class="schedule-calendar-col">
                      <div class="calendar-panel-box">
                        <div v-if="isMobile" class="ios-datepicker-container">
                          <IosDatepicker
                            v-model="mobileDateValue"
                            mode="datetime"
                            locale="es"
                            :use24-hour="true"
                            confirm-text="Confirmar"
                            cancel-text="Cancelar"
                          />
                        </div>
                        <div v-else class="desktop-picker-panel-wrapper inline-calendar-picker">
                          <el-date-picker-panel
                            :border="false"
                            v-model="selectedDateOnly"
                            type="date"
                            value-format="YYYY-MM-DD"
                            date-format="YYYY-MM-DD"
                            :disabled-date="disabledPastDates"
                            :cell-class-name="getFotografoCellClassName"
                            @panel-change="handlePanelChange"
                          />
                        </div>
                      </div>

                      <!-- Contenedor unificado de Avisos e Información bajo el Calendario -->
                      <div class="calendar-info-boxes">
                        <!-- 1. Leyenda de colores de ausencias del fotógrafo seleccionado -->
                        <div
                          v-if="formData.fotografoId && hasAusenciasInVisibleMonth"
                          class="fotografo-absence-legend uniform-box"
                        >
                          <span class="legend-label">
                            Ausencias de {{ selectedPhotographerName }}:
                          </span>
                          <div class="calendar-legend">
                            <div class="legend-item">
                              <span class="legend-dot dot-baja"></span>
                              <span>Baja Médica</span>
                            </div>
                            <div class="legend-item">
                              <span class="legend-dot dot-vacaciones"></span>
                              <span>Vacaciones</span>
                            </div>
                            <div class="legend-item">
                              <span class="legend-dot dot-permiso"></span>
                              <span>Permiso</span>
                            </div>
                            <div class="legend-item">
                              <span class="legend-dot dot-otro"></span>
                              <span>Otro</span>
                            </div>
                          </div>
                        </div>

                        <!-- 2. Alerta de Bloqueo por Ausencia Individual del Fotógrafo -->
                        <el-alert
                          v-if="
                            formData.fechaHoraInicio &&
                            isFotografoAusente &&
                            ausenciaFotografoActual
                          "
                          type="error"
                          show-icon
                          :closable="false"
                          class="fotografo-absence-alert uniform-box"
                        >
                          <template #title>
                            <span>
                              <strong>{{ selectedPhotographerName }}</strong>
                              tiene una ausencia registrada (
                              <strong>{{ ausenciaFotografoActual.motivo }}</strong>
                              ) en la fecha seleccionada. No es posible asignarlo a esta sesión.
                            </span>
                          </template>
                        </el-alert>

                        <!-- 3. Indicador de Disponibilidad y Cupo del Hotel -->
                        <div
                          v-if="formData.fechaHoraInicio && disponibilidadHotel"
                          class="disponibilidad-indicator-card uniform-box"
                          :class="{ 'quota-full': isTopeAlcanzado }"
                        >
                          <div class="disponibilidad-header">
                            <div class="disponibilidad-title">
                              <span
                                class="status-indicator-dot"
                                :class="isTopeAlcanzado ? 'dot-danger' : 'dot-success'"
                              ></span>
                              <span>Sesiones disponibiles:</span>
                            </div>
                            <div class="disponibilidad-badge">
                              <el-tag
                                :type="isTopeAlcanzado ? 'danger' : 'success'"
                                effect="light"
                                size="small"
                                round
                              >
                                {{
                                  isTopeAlcanzado
                                    ? 'Tope alcanzado'
                                    : `${disponibilidadHotel.cupoLibre} ${
                                        disponibilidadHotel.cupoLibre === 1
                                          ? 'sesión libre'
                                          : 'sesiones libres'
                                      }`
                                }}
                              </el-tag>
                            </div>
                          </div>
                          <div class="disponibilidad-details">
                            <span class="detail-item">
                              <strong>{{ disponibilidadHotel.disponibles }}</strong>
                              / {{ disponibilidadHotel.totalFotografos }} fotógrafos activos
                            </span>
                            <span class="detail-separator">•</span>
                            <span class="detail-item">
                              <strong>{{ disponibilidadHotel.sesionesSimultaneas }}</strong>
                              sesiones a esta hora
                            </span>
                          </div>

                          <!-- Alerta de Bloqueo si no hay cupo -->
                          <el-alert
                            v-if="isTopeAlcanzado"
                            type="error"
                            show-icon
                            :closable="false"
                            class="quota-alert"
                          >
                            <template #title>
                              <span v-if="disponibilidadHotel.disponibles === 0">
                                No hay fotógrafos disponibles en este hotel para la fecha
                                seleccionada (todos ausentes o sin fotógrafos asignados).
                              </span>
                              <span v-else>
                                Tope de {{ disponibilidadHotel.disponibles }} sesiones simultáneas
                                alcanzado para esta hora.
                              </span>
                            </template>
                          </el-alert>
                        </div>
                      </div>
                    </div>

                    <!-- Columna Derecha: Selección de Horario y Fotógrafo -->
                    <div class="schedule-details-col">
                      <!-- 1. SELECCIONA HORARIO -->
                      <div class="schedule-section-block">
                        <div class="schedule-subheading">
                          <span class="step-badge">1</span>
                          <span>SELECCIONA HORARIO</span>
                        </div>
                        <div class="time-slots-grid">
                          <button
                            v-for="time in timeSlots"
                            :key="time"
                            type="button"
                            class="time-slot-btn"
                            :class="{ active: selectedTimeOnly === time }"
                            @click="selectTimeSlot(time)"
                          >
                            {{ time }}
                          </button>
                        </div>
                      </div>

                      <!-- 2. FOTÓGRAFO DISPONIBLE -->
                      <div class="schedule-section-block">
                        <div class="schedule-subheading">
                          <span class="step-badge">2</span>
                          <span>FOTÓGRAFO DISPONIBLE</span>
                        </div>

                        <div v-if="photographers.length === 0" class="empty-photographers-msg">
                          <span v-if="!formData.hotelId">
                            Selecciona un hotel primero para consultar disponibilidad.
                          </span>
                          <span v-else>No hay fotógrafos activos en este hotel.</span>
                        </div>

                        <div v-else class="photographers-card-list">
                          <div
                            v-for="photographer in photographers"
                            :key="photographer.id"
                            class="photographer-selection-card"
                            :class="{
                              selected: String(formData.fotografoId) === String(photographer.id),
                              disabled: getPhotographerStatus(photographer.id).disabled,
                            }"
                            @click="
                              !getPhotographerStatus(photographer.id).disabled &&
                              selectPhotographerCard(photographer.id)
                            "
                          >
                            <div class="photographer-card-info">
                              <el-avatar
                                :src="photographer.imagen || undefined"
                                :size="36"
                                :style="{
                                  backgroundColor: getUserBgColor(photographer.color),
                                  color: '#ffffff',
                                  fontWeight: '700',
                                  fontSize: '13px',
                                }"
                                class="photographer-avatar-preview"
                              >
                                {{ getUserInitials(photographer.nombre, photographer.apellidos) }}
                              </el-avatar>
                              <div class="photographer-text-meta">
                                <span class="photographer-card-name">
                                  {{ photographer.nombre }} {{ photographer.apellidos }}
                                </span>
                                <span
                                  class="photographer-card-tag"
                                  :class="getPhotographerStatus(photographer.id).tagClass"
                                >
                                  {{ getPhotographerStatus(photographer.id).label }}
                                </span>
                              </div>
                            </div>

                            <div class="photographer-card-action">
                              <el-button
                                size="small"
                                :type="
                                  String(formData.fotografoId) === String(photographer.id)
                                    ? 'primary'
                                    : 'default'
                                "
                                :disabled="getPhotographerStatus(photographer.id).disabled"
                                round
                              >
                                {{
                                  String(formData.fotografoId) === String(photographer.id)
                                    ? 'Seleccionado'
                                    : 'Seleccionar'
                                }}
                              </el-button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </el-collapse-item>

              <!-- Acordeón 2: Fecha/Hora Cita de Ventas -->
              <el-collapse-item name="cita-venta">
                <template #title>
                  <div class="accordion-header-title">
                    <div class="card-header-title-group">
                      <el-icon class="card-section-icon"><Calendar :size="18" /></el-icon>
                      <el-button
                        v-if="loadedSession?.citaVenta?.id"
                        text
                        type="primary"
                        class="calendar-label-btn"
                        @click.stop="router.push(`/ventas/${loadedSession?.citaVenta?.id}/editar`)"
                      >
                        <h2 class="card-section-title">Fecha/Hora Cita de Ventas</h2>
                      </el-button>
                      <h2 v-else class="card-section-title">Fecha/Hora Cita de Ventas</h2>
                    </div>
                    <div class="header-datetime-preview">
                      <el-tag
                        type="primary"
                        effect="light"
                        round
                        size="large"
                        class="header-datetime-tag"
                      >
                        {{ formattedSelectedCitaVentaDateTime }}
                      </el-tag>
                    </div>
                  </div>
                </template>

                <div class="accordion-item-body">
                  <div class="schedule-main-grid">
                    <!-- Columna Izquierda: Calendario Cita de Ventas -->
                    <div class="schedule-calendar-col">
                      <div class="calendar-panel-box">
                        <div v-if="isMobile" class="ios-datepicker-container">
                          <IosDatepicker
                            v-model="mobileCitaVentaValue"
                            mode="datetime"
                            locale="es"
                            :use24-hour="true"
                            confirm-text="Confirmar"
                            cancel-text="Cancelar"
                          />
                        </div>
                        <div v-else class="desktop-picker-panel-wrapper inline-calendar-picker">
                          <el-date-picker-panel
                            :border="false"
                            v-model="selectedCitaVentaDateOnly"
                            type="date"
                            value-format="YYYY-MM-DD"
                            date-format="YYYY-MM-DD"
                            :disabled-date="disabledPastDates"
                            :cell-class-name="getCitaVentaCellClassName"
                          />
                        </div>
                      </div>

                      <!-- Alerta de conflictos de Cita de Venta -->
                      <div
                        v-if="conflictsCitaVenta.length > 0"
                        class="conflict-alert-box uniform-box"
                      >
                        <el-alert type="warning" show-icon :closable="false">
                          <template #title>
                            <span>
                              <strong>{{ conflictsCitaVenta.length }}</strong>
                              cita(s) de venta en el mismo hotel en esta franja (±1h)
                            </span>
                          </template>
                        </el-alert>
                      </div>
                    </div>

                    <!-- Columna Derecha: Selección de Horario de Cita de Ventas -->
                    <div class="schedule-details-col">
                      <div class="schedule-section-block">
                        <div class="schedule-subheading">
                          <span class="step-badge">1</span>
                          <span>SELECCIONA HORARIO DE VENTA</span>
                        </div>
                        <div class="time-slots-grid">
                          <button
                            v-for="time in timeSlots"
                            :key="`cita-${time}`"
                            type="button"
                            class="time-slot-btn"
                            :class="{ active: selectedCitaVentaTimeOnly === time }"
                            @click="selectCitaVentaTimeSlot(time)"
                          >
                            {{ time }}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </el-collapse-item>

              <!-- Acordeón 3: Fecha de Checkout -->
              <el-collapse-item name="checkout">
                <template #title>
                  <div class="accordion-header-title">
                    <div class="card-header-title-group">
                      <el-icon class="card-section-icon">
                        <PlaneTakeoff :size="18" />
                      </el-icon>
                      <h2 class="card-section-title">Fecha de Checkout</h2>
                    </div>
                    <div class="header-datetime-preview">
                      <el-tag
                        type="primary"
                        effect="light"
                        round
                        size="large"
                        class="header-datetime-tag"
                      >
                        {{ formattedSelectedCheckoutDate }}
                      </el-tag>
                    </div>
                  </div>
                </template>

                <div class="accordion-item-body">
                  <div class="checkout-calendar-grid">
                    <div class="schedule-calendar-col checkout-calendar-box">
                      <div class="calendar-panel-box">
                        <div v-if="isMobile" class="ios-datepicker-container">
                          <IosDatepicker v-model="mobileFechaSalidaValue" mode="date" locale="es" />
                        </div>
                        <div v-else class="desktop-picker-panel-wrapper inline-calendar-picker">
                          <el-date-picker-panel
                            :border="false"
                            v-model="formData.fechaSalida"
                            type="date"
                            value-format="YYYY-MM-DD"
                            date-format="YYYY-MM-DD"
                            :disabled-date="disabledPastDates"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </el-collapse-item>
            </el-collapse>
          </el-card>

          <!-- Tarjeta 3: Detalles de la Sesión -->
          <el-card class="form-card details-card" shadow="never">
            <div class="card-section-header">
              <el-icon class="card-section-icon"><Edit /></el-icon>
              <h2 class="card-section-title">Detalles de la Sesión</h2>
            </div>

            <div class="details-fields">
              <!-- Concepto / Motivo de la Sesión -->
              <el-form-item label="Concepto / Motivo de la Sesión">
                <el-select
                  v-model="formData.concepto"
                  size="large"
                  filterable
                  allow-create
                  default-first-option
                  placeholder="Selecciona o escribe un concepto personalizado"
                  style="width: 100%"
                  clearable
                >
                  <el-option
                    v-for="item in defaultConceptos"
                    :key="item"
                    :label="item"
                    :value="item"
                  />
                </el-select>
              </el-form-item>

              <!-- Notas Adicionales -->
              <el-form-item label="Notas Adicionales">
                <el-input
                  v-model="formData.notas"
                  size="large"
                  type="textarea"
                  :rows="3"
                  placeholder="Ej. Fotos en la playa al atardecer, vestidos de blanco."
                />
              </el-form-item>
            </div>
          </el-card>

          <!-- Botones de Acción (Fuera de la tarjeta, abajo al final) -->
          <div class="form-actions">
            <el-button
              type="primary"
              :size="isMobile ? 'large' : 'default'"
              :icon="Check"
              :loading="isSaving"
              :disabled="isReadOnly || isTopeAlcanzado || isFotografoAusente"
              @click="handleSaveSession"
            >
              {{ isEditing ? 'Guardar Cambios' : 'Agendar Sesión' }}
            </el-button>
            <el-button :size="isMobile ? 'large' : 'default'" :icon="Close" @click="handleGoBack">
              Cancelar
            </el-button>
          </div>
        </el-form>
      </div>

      <!-- Columna Derecha: Sidebar con Información de la Sesión y Estado -->
      <div class="form-sidebar-col">
        <!-- 1. Tarjeta Resumen / Info de la Sesión -->
        <div class="appointment-summary-card" :style="appointmentSummaryCardStyle">
          <div class="summary-photographer-row">
            <el-avatar
              :src="selectedPhotographer?.imagen || undefined"
              :size="42"
              :style="{
                backgroundColor: selectedPhotographer?.color
                  ? getUserBgColor(selectedPhotographer.color)
                  : 'rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '14px',
                border: '2px solid rgba(255, 255, 255, 0.4)',
              }"
              class="summary-avatar"
            >
              {{
                selectedPhotographer
                  ? getUserInitials(selectedPhotographer.nombre, selectedPhotographer.apellidos)
                  : '?'
              }}
            </el-avatar>
            <div class="summary-photographer-meta">
              <span class="summary-photographer-label">FOTÓGRAFO ASIGNADO</span>
              <span class="summary-photographer-name">
                {{ selectedPhotographerName || 'Sin asignar' }}
              </span>
            </div>
          </div>

          <div class="summary-details-list">
            <div class="summary-detail-row">
              <span class="summary-detail-key">Cliente:</span>
              <span class="summary-detail-val">{{ summaryClienteNombre }}</span>
            </div>
            <div class="summary-detail-row">
              <span class="summary-detail-key">Fecha:</span>
              <span class="summary-detail-val">{{ summaryFormattedDate }}</span>
            </div>
            <div class="summary-detail-row">
              <span class="summary-detail-key">Hora:</span>
              <span class="summary-detail-val">{{ selectedTimeOnly || '10:00' }}</span>
            </div>
            <div class="summary-detail-row">
              <span class="summary-detail-key">Hotel:</span>
              <span class="summary-detail-val">{{ selectedHotelDisplayName }}</span>
            </div>
            <div class="summary-detail-row">
              <span class="summary-detail-key">Personas:</span>
              <span class="summary-detail-val">{{ summaryPersonas }}</span>
            </div>
            <div class="summary-detail-row">
              <span class="summary-detail-key">Motivo:</span>
              <span class="summary-detail-val">{{ summaryMotivo }}</span>
            </div>
          </div>
        </div>

        <!-- 2. Tarjeta de Estado de Sesión -->
        <el-card class="status-card" shadow="never">
          <div class="status-card-header">
            <span class="status-card-title">ESTADO DE SESIÓN</span>
          </div>
          <div class="status-grid">
            <button
              v-for="opt in estadoSesionOptions"
              :key="opt.value"
              type="button"
              class="status-grid-btn"
              :class="[
                `status-grid-btn--${opt.value.toLowerCase()}`,
                { 'is-active': formData.estado === opt.value },
              ]"
              :disabled="isReadOnly"
              @click="formData.estado = opt.value"
            >
              <el-icon class="status-grid-icon"><component :is="opt.icon" /></el-icon>
              <span>{{ opt.label }}</span>
            </button>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.session-form-container {
  padding: 1.5rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-btn {
  font-size: 1.1rem;
  background-color: var(--toolbar-bg, #ffffff);
  border: 1px solid var(--toolbar-border, #e2e8f0);
  color: var(--heading-color, #0f172a);
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.back-btn:hover {
  background-color: var(--el-fill-color-light, #f1f5f9);
  border-color: var(--el-color-primary, #3b82f6);
  color: var(--el-color-primary, #3b82f6);
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.page-title {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
  margin: 0;
  line-height: 1.25;
}

.lock-banner {
  margin-bottom: 1.25rem;
}

.alerts-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.form-alert-banner {
  border-radius: var(--el-border-radius-base, 6px);
}

.session-form-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 1.5rem;
}

.form-main-col {
  min-width: 0;
}

.form-sidebar-col {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: sticky;
  top: 1rem;
  height: fit-content;
  z-index: 10;
}

.form-card {
  border-radius: 12px;
  border: 1px solid var(--toolbar-border, #e2e8f0);
}

.client-info-card,
.schedule-card,
.date-info-card {
  margin-bottom: 1.5rem;
}

.card-header-with-date {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.card-header-title-group {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.header-datetime-preview {
  display: flex;
  align-items: center;
}

.header-datetime-text {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--el-color-primary, #3b82f6);
}

/* Schedule Card Layout */
.schedule-card-body {
  display: flex;
  flex-direction: column;
  gap: 2.25rem;
}

.schedule-main-grid {
  display: grid;
  grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
  gap: 1.75rem;
  align-items: start;
}

@media (max-width: 768px) {
  .schedule-main-grid {
    grid-template-columns: 1fr;
  }
}

.schedule-calendar-col {
  border: 1px solid var(--toolbar-border, #e2e8f0);
  border-radius: 10px;
  background: var(--toolbar-bg, #ffffff);
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.calendar-panel-box {
  display: flex;
  justify-content: center;
  width: 100%;
}

.inline-calendar-picker {
  width: 100%;
}

.inline-calendar-picker :deep(.el-picker-panel) {
  border: none;
  box-shadow: none;
  background: transparent;
  width: 100%;
}

.schedule-details-col {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.schedule-section-block {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.schedule-subheading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: var(--heading-color, #0f172a);
  text-transform: uppercase;
}

.step-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--el-color-primary, #3b82f6);
  color: #ffffff;
  font-size: 0.68rem;
  font-weight: 700;
}

/* Time slots pills grid */
.time-slots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(62px, 1fr));
  gap: 0.45rem;
}

.time-slot-btn {
  padding: 0.5rem 0.4rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--heading-color, #0f172a);
  background: var(--el-fill-color-light, #f8fafc);
  border: 1px solid var(--toolbar-border, #e2e8f0);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
}

.time-slot-btn:hover {
  border-color: var(--el-color-primary, #3b82f6);
  background: rgba(59, 130, 246, 0.08);
  color: var(--el-color-primary, #3b82f6);
}

.time-slot-btn.active {
  background: var(--el-color-primary, #3b82f6);
  border-color: var(--el-color-primary, #3b82f6);
  color: #ffffff;
  font-weight: 700;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.35);
}

/* Photographers card list */
.photographers-card-list {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.photographer-selection-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: var(--toolbar-bg, #ffffff);
  border: 1px solid var(--toolbar-border, #e2e8f0);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.photographer-selection-card:hover {
  border-color: var(--el-color-primary, #3b82f6);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.photographer-selection-card.selected {
  border-color: var(--el-color-primary, #3b82f6);
  background: rgba(59, 130, 246, 0.04);
  box-shadow: 0 0 0 1px var(--el-color-primary, #3b82f6);
}

.photographer-selection-card.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: var(--el-fill-color-light, #f8fafc);
  border-color: var(--toolbar-border, #e2e8f0);
}

.photographer-selection-card.disabled:hover {
  transform: none;
  box-shadow: none;
  border-color: var(--toolbar-border, #e2e8f0);
}

.photographer-card-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.photographer-text-meta {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.photographer-card-name {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
}

.photographer-card-tag {
  font-size: 0.72rem;
  font-weight: 600;
}

.photographer-card-tag.tag-assigned {
  color: var(--el-color-primary, #3b82f6);
}

.photographer-card-tag.tag-busy {
  color: #f56c6c;
}

.photographer-card-tag.tag-available {
  color: #10b981;
}

.header-datetime-tag {
  font-weight: 600;
  font-size: 0.88rem;
  padding: 0.35rem 0.85rem;
}

.empty-photographers-msg {
  font-size: 0.85rem;
  color: var(--nav-link-color, #64748b);
  padding: 0.75rem;
  background: var(--el-fill-color-light, #f8fafc);
  border-radius: 8px;
}

.schedule-section-divider {
  margin: 1.75rem 0 1.5rem 0;
  border-color: var(--toolbar-border, #e2e8f0);
}

.schedule-sub-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Accordion Styles for Schedule Card */
.schedule-card :deep(.el-card__body) {
  padding: 0.25rem 1.25rem;
}

.schedule-accordion {
  border: none;
}

.schedule-accordion :deep(.el-collapse-item__header) {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
  padding: 0.85rem 0;
  height: auto;
  min-height: 56px;
  border-bottom: 1px solid var(--toolbar-border, #e2e8f0);
  background: transparent;
}

.schedule-accordion :deep(.el-collapse-item:last-child .el-collapse-item__header) {
  border-bottom: none;
}

.schedule-accordion :deep(.el-collapse-item.is-active:last-child .el-collapse-item__header) {
  border-bottom: 1px solid var(--toolbar-border, #e2e8f0);
}

.schedule-accordion :deep(.el-collapse-item__wrap) {
  border-bottom: 1px solid var(--toolbar-border, #e2e8f0);
  background: transparent;
}

.schedule-accordion :deep(.el-collapse-item:last-child .el-collapse-item__wrap) {
  border-bottom: none;
}

.schedule-accordion :deep(.el-collapse-item__content) {
  padding: 1.25rem 0 1.5rem 0;
  color: var(--el-text-color-primary);
}

.accordion-header-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding-right: 0.85rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.accordion-item-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.checkout-calendar-grid {
  display: grid;
  grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
  gap: 1.75rem;
  align-items: start;
}

@media (max-width: 768px) {
  .checkout-calendar-grid {
    grid-template-columns: 1fr;
  }
}

.checkout-calendar-box {
  width: 100%;
}

.clear-date-btn {
  font-size: 0.78rem;
  padding: 0 4px;
}

.conflict-alert-box {
  margin-top: 0.5rem;
}

.card-section-header {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--toolbar-border, #e2e8f0);
}

.card-section-icon {
  font-size: 1.15rem;
  color: var(--el-color-primary, #3b82f6);
}

.card-section-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
  margin: 0;
}

.client-info-fields,
.date-info-fields,
.details-fields {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-row-pax {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
}

.pax-item-label {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-weight: 600;
}

.pax-label-icon {
  font-size: 1.05rem;
  color: var(--el-text-color-secondary, #64748b);
}

.pax-input-number {
  width: 140px !important;
}

.status-card {
  border-radius: 12px;
  border: 1px solid var(--toolbar-border, #e2e8f0);
  background: var(--toolbar-bg, #ffffff);
}

.status-card :deep(.el-card__body) {
  padding: 1.25rem;
}

.status-card-header {
  margin-bottom: 0.85rem;
}

.status-card-title {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--nav-link-color, #64748b);
  text-transform: uppercase;
}

.status-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
}

.status-grid-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0.65rem 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid var(--toolbar-border, #e2e8f0);
  background: var(--toolbar-bg, #ffffff);
  color: var(--nav-link-color, #64748b);
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.status-grid-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.status-grid-btn:hover:not(:disabled):not(.is-active) {
  border-color: var(--el-color-primary-light-5, #93c5fd);
  color: var(--el-color-primary, #3b82f6);
  background: var(--el-color-primary-light-9, #eff6ff);
}

.status-grid-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

/* Colores personalizados por estado */
.status-grid-btn--programada.is-active {
  background-color: #409eff !important;
  border-color: #409eff !important;
  color: #ffffff !important;
  box-shadow: 0 2px 4px rgba(64, 158, 255, 0.25);
}

.status-grid-btn--completada.is-active {
  background-color: #67c23a !important;
  border-color: #67c23a !important;
  color: #ffffff !important;
  box-shadow: 0 2px 4px rgba(103, 194, 58, 0.25);
}

.status-grid-btn--cancelada.is-active {
  background-color: #f56c6c !important;
  border-color: #f56c6c !important;
  color: #ffffff !important;
  box-shadow: 0 2px 4px rgba(245, 108, 108, 0.25);
}

.status-grid-btn--no_show.is-active {
  background-color: #e6a23c !important;
  border-color: #e6a23c !important;
  color: #ffffff !important;
  box-shadow: 0 2px 4px rgba(230, 162, 60, 0.25);
}

/* Hover sin activar usando el color del estado */
.status-grid-btn--programada:not(.is-active):hover {
  color: #409eff !important;
  border-color: #409eff !important;
}
.status-grid-btn--completada:not(.is-active):hover {
  color: #67c23a !important;
  border-color: #67c23a !important;
}
.status-grid-btn--cancelada:not(.is-active):hover {
  color: #f56c6c !important;
  border-color: #f56c6c !important;
}
.status-grid-btn--no_show:not(.is-active):hover {
  color: #e6a23c !important;
  border-color: #e6a23c !important;
}

/* Dark mode overrides */
html.dark .back-btn {
  background-color: var(--toolbar-bg, #1d1e1f);
  border-color: var(--toolbar-border, #363637);
  color: var(--heading-color, #ffffff);
}

html.dark .status-card {
  border-color: var(--toolbar-border, #363637);
  background: var(--toolbar-bg, #1d1e1f);
}

html.dark .status-grid-btn {
  background: var(--toolbar-bg, #1d1e1f);
  border-color: var(--toolbar-border, #363637);
  color: var(--nav-link-color, #a1a1aa);
}

html.dark .status-grid-btn:hover:not(:disabled):not(.is-active) {
  border-color: #3b82f6;
  color: #60a5fa;
  background: rgba(59, 130, 246, 0.1);
}

/* Appointment Summary Card in Sidebar */
.appointment-summary-card {
  background-color: var(--el-color-primary, #2563eb);
  border-radius: 12px;
  padding: 1.25rem 1.35rem;
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
  transition:
    background 0.3s ease,
    background-color 0.3s ease,
    box-shadow 0.3s ease;
}

.summary-photographer-row {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.summary-avatar {
  flex-shrink: 0;
}

.summary-photographer-meta {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.summary-photographer-label {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.75);
  text-transform: uppercase;
}

.summary-photographer-name {
  font-size: 1.05rem;
  font-weight: 700;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.summary-details-list {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding-top: 0.85rem;
  border-top: 1px solid rgba(255, 255, 255, 0.18);
}

.summary-detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.88rem;
}

.summary-detail-key {
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

.summary-detail-val {
  color: #ffffff;
  font-weight: 700;
}

.session-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-row-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1rem;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.calendar-label-icon {
  font-size: 1.05rem;
}
/*
.calendar-label-icon.icon-camera {
  color: #3b82f6;
}

.calendar-label-icon.icon-money {
  color: #10b981;
}

.calendar-label-icon.icon-checkout {
  color: #f59e0b;
}
*/
.calendar-label-icon.icon-camera,
.calendar-label-icon.icon-money,
.calendar-label-icon.icon-checkout {
  color: var(--el-input-icon-color, var(--el-text-color-placeholder));
}
.desktop-picker-panel-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.desktop-picker-panel-wrapper :deep(.el-picker-panel) {
  border-radius: 8px;
}

.calendar-info-boxes {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
  margin-top: 0.75rem;
}

.uniform-box {
  width: 100% !important;
  box-sizing: border-box !important;
  margin: 0 !important;
}

.fotografo-absence-legend {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.75rem 1rem;
  background: var(--el-fill-color-light, #f8fafc);
  border: 1px solid var(--el-border-color-lighter, #e2e8f0);
  border-radius: 8px;
}

.fotografo-absence-alert {
  border-radius: 8px !important;
  padding: 0.75rem 1rem !important;
}

.disponibilidad-indicator-card {
  background: var(--el-fill-color-light, #f8fafc);
  border: 1px solid var(--el-border-color-lighter, #e2e8f0);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: all 0.2s ease;
}

.disponibilidad-indicator-card.quota-full {
  background: rgba(239, 68, 68, 0.05);
  border-color: rgba(239, 68, 68, 0.3);
}

.disponibilidad-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.disponibilidad-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--heading-color, #0f172a);
}

.status-indicator-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot-success {
  background-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
}

.dot-danger {
  background-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
}

.disponibilidad-details {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--el-text-color-regular, #64748b);
}

.detail-separator {
  color: var(--el-border-color, #cbd5e1);
}

.quota-alert {
  margin-top: 0.25rem;
}

.legend-label {
  font-weight: 600;
  color: var(--el-text-color-regular, #475569);
}

.calendar-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
  font-size: 0.825rem;
  color: var(--el-text-color-secondary, #64748b);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 4px;
  display: inline-block;
  flex-shrink: 0;
}

.dot-baja {
  background-color: #f87171;
}

.dot-vacaciones {
  background-color: #60a5fa;
}

.dot-permiso {
  background-color: #fbbf24;
}

.dot-otro {
  background-color: #94a3b8;
}

.select-prefix-avatar {
  margin-right: 4px;
  flex-shrink: 0;
}

.photographer-option-item {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
}

.photographer-avatar {
  flex-shrink: 0;
}

.photographer-option-name {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.calendar-item-label {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-weight: 600;
}

.calendar-label-btn {
  padding: 0 !important;
  font-weight: 600 !important;
  font-size: inherit !important;
  height: auto !important;
}

.conflict-inline-warning {
  font-size: 0.78rem;
  color: var(--el-color-warning-dark-2, #b45309);
  margin-top: 0.35rem;
  line-height: 1.25;
}

.ios-datepicker-container {
  width: 100%;
  display: flex;
  justify-content: center;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid var(--toolbar-border, #e2e8f0);
  background-color: var(--el-fill-color-blank, #ffffff);
}
:deep(.ios-selector-option) {
  color: unset !important;
}
.ios-datepicker-container :deep(.ios-datepicker__actions) {
  display: none !important;
}

@media (max-width: 992px) {
  .session-form-container {
    padding: 1rem;
  }

  .session-form-layout {
    grid-template-columns: 1fr;
  }

  .form-sidebar-col {
    position: static;
  }
}

@media (max-width: 768px) {
  .form-row-2,
  .form-row-3 {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .absence-legend {
    justify-content: flex-start;
  }

  .calendar-with-legend {
    margin-left: 0 !important;
  }

  .form-actions {
    flex-direction: column-reverse;
    gap: 0.75rem;
  }

  .form-actions .el-button {
    width: 100%;
    margin-left: 0 !important;
  }
}
</style>

<style>
/* Global CSS for DatePickerPanel highlighted absence cells in PhotoSessionFormView */
.el-date-table td.cell-highlight-baja .el-date-table-cell {
  background-color: rgba(239, 68, 68, 0.18) !important;
  color: #b91c1c !important;
  font-weight: 700;
}

.el-date-table td.cell-highlight-vacaciones .el-date-table-cell {
  background-color: rgba(59, 130, 246, 0.18) !important;
  color: #1d4ed8 !important;
  font-weight: 700;
}

.el-date-table td.cell-highlight-permiso .el-date-table-cell {
  background-color: rgba(245, 158, 11, 0.2) !important;
  color: #b45309 !important;
  font-weight: 700;
}

.el-date-table td.cell-highlight-otro .el-date-table-cell {
  background-color: rgba(148, 163, 184, 0.2) !important;
  color: #334155 !important;
  font-weight: 700;
}

/* Bordes redondeados solo al principio y al final del rango de ausencia */
.el-date-table td.cell-range-start .el-date-table-cell {
  border-top-left-radius: 14px !important;
  border-bottom-left-radius: 14px !important;
  border-top-right-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
}

.el-date-table td.cell-range-end .el-date-table-cell {
  border-top-right-radius: 14px !important;
  border-bottom-right-radius: 14px !important;
  border-top-left-radius: 0 !important;
  border-bottom-left-radius: 0 !important;
}

.el-date-table td.cell-range-middle .el-date-table-cell {
  border-radius: 0 !important;
}

.el-date-table td.cell-range-single .el-date-table-cell {
  border-radius: 14px !important;
}

html.dark .el-date-table td.cell-highlight-baja .el-date-table-cell {
  background-color: rgba(239, 68, 68, 0.35) !important;
  color: #fca5a5 !important;
}

html.dark .el-date-table td.cell-highlight-vacaciones .el-date-table-cell {
  background-color: rgba(59, 130, 246, 0.35) !important;
  color: #93c5fd !important;
}

html.dark .el-date-table td.cell-highlight-permiso .el-date-table-cell {
  background-color: rgba(245, 158, 11, 0.35) !important;
  color: #fde68a !important;
}

/* Badge indicador de número de sesiones en DatePicker (pseudo-elemento ::after) */
.el-date-table td[class*='has-sessions-'] .el-date-table-cell::after {
  position: absolute;
  top: 1px;
  right: 2px;
  min-width: 15px;
  height: 15px;
  padding: 0 3px;
  border-radius: 999px;
  background-color: #ef4444;
  color: #ffffff;
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 15px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  z-index: 4;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  pointer-events: none;
  box-sizing: border-box;
}

.el-date-table td.has-sessions-1 .el-date-table-cell::after {
  content: '1';
}
.el-date-table td.has-sessions-2 .el-date-table-cell::after {
  content: '2';
}
.el-date-table td.has-sessions-3 .el-date-table-cell::after {
  content: '3';
}
.el-date-table td.has-sessions-4 .el-date-table-cell::after {
  content: '4';
}
.el-date-table td.has-sessions-5 .el-date-table-cell::after {
  content: '5';
}
.el-date-table td.has-sessions-6 .el-date-table-cell::after {
  content: '6';
}
.el-date-table td.has-sessions-7 .el-date-table-cell::after {
  content: '7';
}
.el-date-table td.has-sessions-8 .el-date-table-cell::after {
  content: '8';
}
.el-date-table td.has-sessions-9 .el-date-table-cell::after {
  content: '9';
}
.el-date-table td.has-sessions-10 .el-date-table-cell::after {
  content: '10';
}
.el-date-table td.has-sessions-11 .el-date-table-cell::after {
  content: '11';
}
.el-date-table td.has-sessions-12 .el-date-table-cell::after {
  content: '12';
}
.el-date-table td.has-sessions-13 .el-date-table-cell::after {
  content: '13';
}
.el-date-table td.has-sessions-14 .el-date-table-cell::after {
  content: '14';
}
.el-date-table td.has-sessions-15 .el-date-table-cell::after {
  content: '15';
}
.el-date-table td.has-sessions-16 .el-date-table-cell::after {
  content: '16';
}
.el-date-table td.has-sessions-17 .el-date-table-cell::after {
  content: '17';
}
.el-date-table td.has-sessions-18 .el-date-table-cell::after {
  content: '18';
}
.el-date-table td.has-sessions-19 .el-date-table-cell::after {
  content: '19';
}
.el-date-table td.has-sessions-20 .el-date-table-cell::after {
  content: '20';
}
.el-date-table td.has-sessions-21 .el-date-table-cell::after {
  content: '21';
}
.el-date-table td.has-sessions-22 .el-date-table-cell::after {
  content: '22';
}
.el-date-table td.has-sessions-23 .el-date-table-cell::after {
  content: '23';
}
.el-date-table td.has-sessions-24 .el-date-table-cell::after {
  content: '24';
}
.el-date-table td.has-sessions-25 .el-date-table-cell::after {
  content: '25';
}
.el-date-table td.has-sessions-26 .el-date-table-cell::after {
  content: '26';
}
.el-date-table td.has-sessions-27 .el-date-table-cell::after {
  content: '27';
}
.el-date-table td.has-sessions-28 .el-date-table-cell::after {
  content: '28';
}
.el-date-table td.has-sessions-29 .el-date-table-cell::after {
  content: '29';
}
.el-date-table td.has-sessions-30 .el-date-table-cell::after {
  content: '30';
}
.el-date-table td.has-sessions-plus .el-date-table-cell::after {
  content: '30+';
}
</style>
