<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import { useSessionStore } from '../stores/session.store'
import { useSaleStore } from '@/features/sales/stores/sale.store'
import { useHotelStore } from '@/features/hotels/stores/hotel.store'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useUserStore } from '@/features/users/stores/user.store'
import { useProfileStore } from '@/features/users/stores/profile.store'
import type { SesionFotografica } from '../domain/session.model'
import type { CitaVenta } from '@/features/sales/domain/sale.model'
import type {
  EventContentArg,
  DatesSetArg,
  EventClickArg,
  CalendarOptions,
  EventApi,
} from '@fullcalendar/core'
import {
  Plus,
  Bell,
  User,
  InfoFilled,
  Calendar,
  Delete,
  WarningFilled,
} from '@element-plus/icons-vue'
import { Building2 } from '@lucide/vue'
import { getUserInitials, getUserBgColor } from '@/features/users/utils/user-avatar'
import iconoCamara from '@/assets/icono_camara.png'
import iconoCita from '@/assets/icono_cita.png'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()
const saleStore = useSaleStore()
const hotelStore = useHotelStore()
const authStore = useAuthStore()
const userStore = useUserStore()
const profileStore = useProfileStore()

const isMobile = ref(typeof window !== 'undefined' ? window.innerWidth <= 768 : false)
const mobileDialogVisible = ref(false)
const mobileSelectedDate = ref<string>(dayjs().format('YYYY-MM-DD'))

watch(mobileSelectedDate, (newDateStr) => {
  if (newDateStr) {
    const calendarApi = calendarRef.value?.getApi()
    if (calendarApi) {
      calendarApi.gotoDate(newDateStr)
    }
  }
})

function checkMobile() {
  isMobile.value = window.innerWidth <= 768
}

// Localización en Español para FullCalendar
const esLocale = {
  code: 'es',
  week: {
    dow: 1,
    doy: 4,
  },
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
}

// State
const selectedHotelId = ref<number | null>(null)
const activeAlertPanels = ref<string[]>([])

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

// --- COMPUTED ALERTS FOR PHOTOGRAPHER PANEL ---

const overdueSessions = computed(() => {
  const allowedHotelIds = new Set(userHotels.value.map((h) => Number(h.id)))
  const now = new Date()
  return sessionStore.sessions.filter((s) => {
    if (!allowedHotelIds.has(Number(s.hotelId))) return false
    if (selectedHotelId.value && Number(s.hotelId) !== Number(selectedHotelId.value)) return false
    return s.estado === 'PROGRAMADA' && new Date(s.fechaHoraInicio) < now
  })
})

const missingSaleSessions = computed(() => {
  const allowedHotelIds = new Set(userHotels.value.map((h) => Number(h.id)))
  const ESTADOS_NO_PERMITIDOS = ['CANCELADA', 'NO_SHOW']
  return sessionStore.sessions.filter((s) => {
    if (!allowedHotelIds.has(Number(s.hotelId))) return false
    if (selectedHotelId.value && Number(s.hotelId) !== Number(selectedHotelId.value)) return false
    return !ESTADOS_NO_PERMITIDOS.includes(s.estado) && !s.citaVenta
  })
})

const overdueSales = computed(() => {
  const allowedHotelIds = new Set(userHotels.value.map((h) => Number(h.id)))
  const now = new Date()
  return sessionStore.sessions.filter((s) => {
    if (!allowedHotelIds.has(Number(s.hotelId))) return false
    if (selectedHotelId.value && Number(s.hotelId) !== Number(selectedHotelId.value)) return false
    if (!s.citaVenta) return false
    return s.citaVenta.estado === 'PROGRAMADA' && new Date(s.citaVenta.fechaHoraCita) < now
  })
})

const totalAlertsCount = computed(() => {
  return overdueSessions.value.length + missingSaleSessions.value.length + overdueSales.value.length
})

// Filtered events for FullCalendar (Photo Sessions + Sales Appointments)
const calendarEvents = computed(() => {
  const allowedHotelIds = new Set(userHotels.value.map((h) => Number(h.id)))

  // 1. Photo Session events
  const sessionList = sessionStore.sessions.filter((s) => {
    if (!allowedHotelIds.has(Number(s.hotelId))) return false
    if (selectedHotelId.value) {
      return Number(s.hotelId) === Number(selectedHotelId.value)
    }
    return true
  })

  const sessionEvents = sessionList.map((session) => {
    let color = '#94a3b8' // Gris para sesiones sin fotógrafo asignado
    let fotografoPrimerNombre = ''
    let fotografoNombre: string | null = null
    let fotografoApellidos: string | null = null
    let fotografoImagen: string | null = null
    let fotografoColor: string | null = null
    if (session.fotografoId) {
      const fotografo = userStore.users.find((u) => String(u.id) === String(session.fotografoId))
      if (fotografo) {
        fotografoNombre = fotografo.nombre || null
        fotografoApellidos = fotografo.apellidos || null
        fotografoImagen = fotografo.imagen || null
        fotografoColor = fotografo.color || null
        color = fotografo.color || '#10b981'
        fotografoPrimerNombre = (fotografo.nombre ? fotografo.nombre.split(' ')[0] : '') || ''
      }
    }

    const paxStr = `[${session.numAdultos ?? 1}.${session.numNinos ?? 0} PAX]`
    const roomStr = session.numeroHabitacion ? `Hab ${session.numeroHabitacion}` : ''
    const clienteNombre = session.clienteNombre || 'Cliente'

    return {
      id: `session-${session.id}`,
      title: clienteNombre,
      start: session.fechaHoraInicio,
      backgroundColor: color,
      borderColor: color,
      extendedProps: {
        rawSession: session,
        type: 'session',
        fotografoPrimerNombre,
        fotografoNombre,
        fotografoApellidos,
        fotografoImagen,
        fotografoColor,
        roomStr,
        clienteNombre,
        paxStr,
      },
    }
  })

  // 2. Sales Appointment events (merged from saleStore and sessionStore)
  const salesMap = new Map<
    number,
    {
      id: number
      sesionId: number
      hotelId: number
      fotografoId?: string | null
      fechaHoraCita: string
      estado: string
      clienteNombre: string
      numeroHabitacion?: string
      numAdultos?: number
      numNinos?: number
    }
  >()

  // Add from saleStore
  saleStore.citasVenta.forEach((c) => {
    const parentSession = sessionStore.sessions.find((s) => s.id === c.sesionId)
    const effectiveHotelId = parentSession ? Number(parentSession.hotelId) : Number(c.hotelId)

    salesMap.set(c.id, {
      id: c.id,
      sesionId: c.sesionId,
      hotelId: effectiveHotelId,
      fotografoId: c.fotografoId || parentSession?.fotografoId || null,
      fechaHoraCita: c.fechaHoraCita,
      estado: c.estado,
      clienteNombre: c.clienteNombre || parentSession?.clienteNombre || 'Cliente',
      numeroHabitacion: c.numeroHabitacion || parentSession?.numeroHabitacion || undefined,
      numAdultos: c.numAdultos ?? parentSession?.numAdultos,
      numNinos: c.numNinos ?? parentSession?.numNinos,
    })
  })

  // Add from embedded session citaVenta
  sessionStore.sessions.forEach((s) => {
    if (s.citaVenta && s.citaVenta.id) {
      if (!salesMap.has(s.citaVenta.id)) {
        salesMap.set(s.citaVenta.id, {
          id: s.citaVenta.id,
          sesionId: s.id,
          hotelId: Number(s.hotelId),
          fotografoId: s.fotografoId || null,
          fechaHoraCita: s.citaVenta.fechaHoraCita,
          estado: s.citaVenta.estado,
          clienteNombre: s.clienteNombre || 'Cliente',
          numeroHabitacion: s.numeroHabitacion || undefined,
          numAdultos: s.numAdultos,
          numNinos: s.numNinos,
        })
      }
    }
  })

  const salesList = Array.from(salesMap.values()).filter((c) => {
    if (!allowedHotelIds.has(Number(c.hotelId))) return false
    if (selectedHotelId.value) {
      return Number(c.hotelId) === Number(selectedHotelId.value)
    }
    return true
  })

  const salesEvents = salesList.map((sale) => {
    let fotografoId: string | null = sale.fotografoId || null
    let parentSession: SesionFotografica | undefined
    if (sale.sesionId) {
      parentSession = sessionStore.sessions.find((s) => s.id === sale.sesionId)
      if (!fotografoId && parentSession) {
        fotografoId = parentSession.fotografoId || null
      }
    }

    let color = '#94a3b8' // Gris para citas de venta sin fotógrafo asignado
    let fotografoPrimerNombre = ''
    let fotografoNombre: string | null = null
    let fotografoApellidos: string | null = null
    let fotografoImagen: string | null = null
    let fotografoColor: string | null = null
    if (fotografoId) {
      const fotografo = userStore.users.find((u) => String(u.id) === String(fotografoId))
      if (fotografo) {
        fotografoNombre = fotografo.nombre || null
        fotografoApellidos = fotografo.apellidos || null
        fotografoImagen = fotografo.imagen || null
        fotografoColor = fotografo.color || null
        color = fotografo.color || '#2563eb'
        fotografoPrimerNombre = (fotografo.nombre ? fotografo.nombre.split(' ')[0] : '') || ''
      }
    }

    const numAdultos = sale.numAdultos ?? parentSession?.numAdultos ?? 1
    const numNinos = sale.numNinos ?? parentSession?.numNinos ?? 0
    const paxStr = `[${numAdultos}.${numNinos} PAX]`
    const habitacionNum = sale.numeroHabitacion || parentSession?.numeroHabitacion
    const roomStr = habitacionNum ? `Hab ${habitacionNum}` : ''
    const clienteNombre = sale.clienteNombre || parentSession?.clienteNombre || 'Cliente'

    return {
      id: `sale-${sale.id}`,
      title: clienteNombre,
      start: sale.fechaHoraCita,
      backgroundColor: color,
      borderColor: color,
      extendedProps: {
        rawSale: sale,
        type: 'sale',
        iconType: 'money',
        fotografoPrimerNombre,
        fotografoNombre,
        fotografoApellidos,
        fotografoImagen,
        fotografoColor,
        roomStr,
        clienteNombre,
        paxStr,
      },
    }
  })

  return [...sessionEvents, ...salesEvents]
})

// Map of ISO date (YYYY-MM-DD) -> total events count for mobile picker badges
const eventsCountByDate = computed(() => {
  const map: Record<string, number> = {}
  for (const evt of calendarEvents.value) {
    if (!evt.start) continue
    const dateStr =
      typeof evt.start === 'string'
        ? evt.start.split('T')[0]
        : dayjs(evt.start).format('YYYY-MM-DD')
    if (dateStr) {
      map[dateStr] = (map[dateStr] || 0) + 1
    }
  }
  return map
})

function getEventCountForDate(dateOrDayjs: unknown): number {
  if (!dateOrDayjs) return 0
  const dateStr = dayjs(dateOrDayjs as Date | string).format('YYYY-MM-DD')
  return eventsCountByDate.value[dateStr] || 0
}

const CALENDAR_VIEW_STORAGE_KEY = 'jj_calendar_view'
const calendarRef = ref<InstanceType<typeof FullCalendar> | null>(null)

function getInitialCalendarView(): string {
  const isMobileView = typeof window !== 'undefined' && window.innerWidth <= 768
  const savedView = localStorage.getItem(CALENDAR_VIEW_STORAGE_KEY)
  const validViews = isMobileView
    ? ['timeGridDay', 'listWeek']
    : ['dayGridMonth', 'timeGridWeek', 'timeGridDay', 'listWeek']
  if (savedView && validViews.includes(savedView)) {
    return savedView
  }
  return isMobileView ? 'listWeek' : 'timeGridWeek'
}

const currentCalendarView = ref<string>(getInitialCalendarView())
const mobilePickerType = computed<'week' | 'date'>(() =>
  currentCalendarView.value === 'listWeek' ? 'week' : 'date',
)

function handleMobileViewChange(val: string | number | boolean | undefined) {
  if (typeof val === 'string') {
    currentCalendarView.value = val
    const calendarApi = calendarRef.value?.getApi()
    if (calendarApi) {
      calendarApi.changeView(val)
    }
  }
}

interface ExtendedEventProps {
  type?: 'session' | 'sale'
  rawSession?: SesionFotografica
  rawSale?: CitaVenta
  paxStr?: string
  [key: string]: unknown
}

interface EventTooltipInfo {
  hotelNombre: string
  fotografoPrimerNombre: string
  fotografoNombreCompleto: string
  fotografoNombre?: string | null
  fotografoApellidos?: string | null
  fotografoImagen?: string | null
  fotografoColor?: string | null
  fechaCabecera: string
  habitacion: string
  clienteNombre: string
  checkout: string
  fechaCitaVenta: string
  adultosYNinos: string
  telefono: string
  email: string
  agendadoPor: string
  type: 'session' | 'sale'
  rawSession?: SesionFotografica
  rawSale?: CitaVenta
}

type DeletableCalendarEvent = EventApi | EventTooltipInfo | ExtendedEventProps

function getAssociatedEventId(
  event: EventApi | { id?: string; extendedProps?: ExtendedEventProps },
): string | null {
  const extendedProps = event.extendedProps
  if (!extendedProps) return null

  if (extendedProps.type === 'session' && extendedProps.rawSession) {
    const rawSession = extendedProps.rawSession
    if (rawSession.citaVenta?.id) {
      return `sale-${rawSession.citaVenta.id}`
    }
    const matchedSale = saleStore.citasVenta.find(
      (c) => Number(c.sesionId) === Number(rawSession.id),
    )
    if (matchedSale?.id) {
      return `sale-${matchedSale.id}`
    }
  } else if (extendedProps.type === 'sale' && extendedProps.rawSale) {
    const rawSale = extendedProps.rawSale
    if (rawSale.sesionId) {
      return `session-${rawSale.sesionId}`
    }
    const matchedSession = sessionStore.sessions.find(
      (s) => s.citaVenta && Number(s.citaVenta.id) === Number(rawSale.id),
    )
    if (matchedSession?.id) {
      return `session-${matchedSession.id}`
    }
  }

  return null
}

function highlightEventAndAssociated(hoveredEvent: EventApi) {
  const hoveredId = hoveredEvent.id
  const associatedId = getAssociatedEventId(hoveredEvent)

  const calendarEl = calendarRef.value?.getApi()?.el || document.querySelector('.calendar-card')
  if (!calendarEl) return

  const allEventEls = calendarEl.querySelectorAll<HTMLElement>('.fc-event')
  allEventEls.forEach((el) => {
    const eventId =
      el.getAttribute('data-fc-event-id') ||
      el.querySelector('.jj-event-card-content')?.getAttribute('data-event-id')

    if (eventId === hoveredId) {
      el.classList.add('fc-event-hovered')
      el.classList.remove('fc-event-dimmed', 'fc-event-associated')
    } else if (associatedId && eventId === associatedId) {
      el.classList.add('fc-event-associated')
      el.classList.remove('fc-event-dimmed', 'fc-event-hovered')
    } else {
      el.classList.add('fc-event-dimmed')
      el.classList.remove('fc-event-hovered', 'fc-event-associated')
    }
  })
}

function clearEventHighlights() {
  const calendarEl = calendarRef.value?.getApi()?.el || document.querySelector('.calendar-card')
  if (!calendarEl) return

  const allEventEls = calendarEl.querySelectorAll<HTMLElement>('.fc-event')
  allEventEls.forEach((el) => {
    el.classList.remove('fc-event-dimmed', 'fc-event-hovered', 'fc-event-associated')
  })
}

function handleDatesSet(dateInfo: DatesSetArg) {
  clearEventHighlights()
  if (dateInfo.view?.type) {
    currentCalendarView.value = dateInfo.view.type
    localStorage.setItem(CALENDAR_VIEW_STORAGE_KEY, dateInfo.view.type)
  }
  if (dateInfo.view?.currentStart && isMobile.value) {
    const viewDateStr = dayjs(dateInfo.view.currentStart).format('YYYY-MM-DD')
    if (mobileSelectedDate.value !== viewDateStr) {
      mobileSelectedDate.value = viewDateStr
    }
  }
}

watch(isMobile, (mobile) => {
  if (mobile) {
    const calendarApi = calendarRef.value?.getApi()
    if (calendarApi) {
      const currentView = calendarApi.view?.type
      if (currentView === 'dayGridMonth' || currentView === 'timeGridWeek') {
        calendarApi.changeView('listWeek')
      }
    }
  }
})

// FullCalendar Configuration computed so reactivity works seamlessly
const calendarOptions = computed<CalendarOptions>(() => ({
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
  initialView: getInitialCalendarView(),
  locale: esLocale,
  headerToolbar: isMobile.value
    ? false
    : {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
      },
  eventDisplay: 'block',
  eventTimeFormat: {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  },
  slotLabelFormat: {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  },
  slotMinTime: '00:00:00',
  slotMaxTime: '24:00:00',
  scrollTime: '08:00:00',
  slotDuration: '00:30:00',
  defaultTimedEventDuration: '01:00:00',
  expandRows: true,
  selectable: true,
  selectMirror: true,
  selectAllow: (selectInfo: { start: Date; end: Date }) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return selectInfo.start >= today
  },
  editable: false,
  dayMaxEvents: true,
  height: 'auto',
  select: handleDateSelect,
  eventClick: handleEventClick,
  eventDidMount: (info) => {
    info.el.setAttribute('data-fc-event-id', info.event.id)
  },
  eventMouseEnter: (info) => {
    highlightEventAndAssociated(info.event)
  },
  eventMouseLeave: () => {
    clearEventHighlights()
  },
  datesSet: handleDatesSet,
  events: calendarEvents.value,
}))

const canDeleteEvents = computed(() => {
  const roleCode = currentUser.value?.roleCode?.toUpperCase()
  return roleCode === 'ADMIN' || roleCode === 'SUPERUSUARIO'
})

function getEventTimeText(arg: EventContentArg): string {
  if (arg.event.start) {
    const hours = String(arg.event.start.getHours()).padStart(2, '0')
    const minutes = String(arg.event.start.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }
  return arg.timeText ?? ''
}

// Estado para Popover de Confirmación de Borrado con Checkbox
const deletePopoverVisible = ref(false)
const deletePopoverTarget = ref<HTMLElement | null>(null)
const pendingDeleteEvent = ref<DeletableCalendarEvent | null>(null)
const deleteAssociated = ref(false)
const isDeleting = ref(false)

function hasAssociatedEvent(eventObj: DeletableCalendarEvent | null | undefined): boolean {
  if (!eventObj) return false
  const extendedProps =
    'extendedProps' in eventObj
      ? (eventObj.extendedProps as ExtendedEventProps)
      : (eventObj as ExtendedEventProps)
  const type = extendedProps?.type
  const rawSession = extendedProps?.rawSession
  const rawSale = extendedProps?.rawSale

  if (type === 'session' && rawSession) {
    if (rawSession.citaVenta) return true
    return saleStore.citasVenta.some((c) => Number(c.sesionId) === Number(rawSession.id))
  }

  if (type === 'sale' && rawSale) {
    if (rawSale.sesionId) {
      return sessionStore.sessions.some((s) => Number(s.id) === Number(rawSale.sesionId))
    }
  }

  return false
}

const associatedCheckboxLabel = computed(() => {
  if (!pendingDeleteEvent.value) return ''
  const extendedProps =
    'extendedProps' in pendingDeleteEvent.value
      ? (pendingDeleteEvent.value.extendedProps as ExtendedEventProps)
      : (pendingDeleteEvent.value as ExtendedEventProps)
  const type = extendedProps?.type

  if (type === 'session') {
    return 'Tb Borrar cita de ventas'
  }
  if (type === 'sale') {
    return 'Tb borrar sesión asociada'
  }
  return ''
})

function openDeleteConfirm(eventObj: DeletableCalendarEvent, e: MouseEvent) {
  e.stopPropagation()
  pendingDeleteEvent.value = eventObj
  deleteAssociated.value = false
  deletePopoverTarget.value = e.currentTarget as HTMLElement
  deletePopoverVisible.value = true
}

async function confirmDelete() {
  if (!pendingDeleteEvent.value) return
  isDeleting.value = true
  const extendedProps =
    'extendedProps' in pendingDeleteEvent.value
      ? (pendingDeleteEvent.value.extendedProps as ExtendedEventProps)
      : (pendingDeleteEvent.value as ExtendedEventProps)
  const type = extendedProps?.type
  const rawSession = extendedProps?.rawSession
  const rawSale = extendedProps?.rawSale
  const shouldDeleteAssociated = deleteAssociated.value

  try {
    if (type === 'sale' && rawSale?.id) {
      await saleStore.deleteCitaVenta(Number(rawSale.id), shouldDeleteAssociated)
      ElMessage.success(
        shouldDeleteAssociated
          ? 'Cita de venta y sesión asociada eliminadas correctamente'
          : 'Cita de venta eliminada correctamente',
      )
    } else if (rawSession?.id) {
      await sessionStore.deleteSession(Number(rawSession.id), shouldDeleteAssociated)
      ElMessage.success(
        shouldDeleteAssociated
          ? 'Sesión de fotos y cita de ventas asociadas eliminadas correctamente'
          : 'Sesión fotográfica eliminada correctamente',
      )
    }

    deletePopoverVisible.value = false
    tooltipVisible.value = false
    mobileDialogVisible.value = false

    await Promise.all([
      sessionStore.fetchSessions(selectedHotelId.value ? Number(selectedHotelId.value) : undefined),
      saleStore.fetchCitasVenta(selectedHotelId.value ? Number(selectedHotelId.value) : undefined),
    ])
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : 'Error al eliminar el evento')
  } finally {
    isDeleting.value = false
    pendingDeleteEvent.value = null
  }
}

const STORAGE_KEY = 'jj_selected_hotel_id'

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
  initSelectedHotel()
})

onUnmounted(() => {
  clearEventHighlights()
  window.removeEventListener('resize', checkMobile)
})

function navigateToNewSessionForm(startIso?: string) {
  const query: Record<string, string> = {}
  if (selectedHotelId.value) query.hotelId = String(selectedHotelId.value)
  if (startIso) query.start = startIso

  router.push({ path: '/agenda/nueva', query })
}

function navigateToNewSaleForm() {
  const query: Record<string, string> = {}
  if (selectedHotelId.value) query.hotelId = String(selectedHotelId.value)
  router.push({ path: '/ventas/nueva', query })
}

function handleDateSelect(selectInfo: { startStr: string }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const selectedDate = new Date(selectInfo.startStr)
  if (selectedDate < today) {
    ElMessage.warning('No se pueden crear eventos en fechas anteriores al día actual')
    return
  }
  const startIso = selectInfo.startStr.slice(0, 16)
  navigateToNewSessionForm(startIso)
}

const tooltipVisible = ref(false)
const tooltipTarget = ref<HTMLElement | null>(null)
const activeTooltipInfo = ref<EventTooltipInfo | null>(null)
let clickTimer: ReturnType<typeof setTimeout> | null = null

function formatEventHeaderDate(dateStr?: string | null): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr

  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const meses = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ]

  const diaSemana = dias[d.getDay()]
  const diaMes = d.getDate()
  const mes = meses[d.getMonth()]
  const horas = d.getHours()
  const minutos = String(d.getMinutes()).padStart(2, '0')

  return `${diaSemana}, ${diaMes} ${mes} - ${horas}:${minutos}`
}

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '-'
  return dateStr.replace('T', ' ').slice(0, 16)
}

function formatDateStr(dateStr?: string | null): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

function formatDateTimeStr(dateStr?: string | null): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

function buildTooltipInfo(extendedProps: ExtendedEventProps): EventTooltipInfo {
  const { rawSession, rawSale, type } = extendedProps

  if (type === 'sale' && rawSale) {
    const parentSession = sessionStore.sessions.find((s) => s.id === rawSale.sesionId)
    const hotelId = rawSale.hotelId || parentSession?.hotelId
    const hotel = hotelStore.hotels.find((h) => Number(h.id) === Number(hotelId))
    const hotelNombre = hotel ? hotel.nombre : rawSale.hotelNombre || 'Hotel desconocido'

    const fotografoId = rawSale.fotografoId || parentSession?.fotografoId
    const fotografo = userStore.users.find((u) => String(u.id) === String(fotografoId))
    const fotografoPrimerNombre =
      (fotografo?.nombre ? fotografo.nombre.split(' ')[0] : '') || 'Sin asignar'
    const fotografoNombreCompleto = fotografo?.nombre
      ? `${fotografo.nombre} ${fotografo.apellidos || ''}`.trim()
      : 'Sin asignar'

    const agendadoUser = parentSession
      ? userStore.users.find((u) => String(u.id) === String(parentSession.creadorId))
      : null
    const agendadoPor = agendadoUser?.nombre
      ? `${agendadoUser.nombre} ${agendadoUser.apellidos || ''}`.trim()
      : '-'

    const numAdultos = rawSale.numAdultos ?? parentSession?.numAdultos ?? 1
    const numNinos = rawSale.numNinos ?? parentSession?.numNinos ?? 0

    return {
      hotelNombre,
      fotografoPrimerNombre,
      fotografoNombreCompleto,
      fotografoNombre: fotografo?.nombre || null,
      fotografoApellidos: fotografo?.apellidos || null,
      fotografoImagen: fotografo?.imagen || null,
      fotografoColor: fotografo?.color || null,
      fechaCabecera: formatEventHeaderDate(rawSale.fechaHoraCita),
      habitacion: rawSale.numeroHabitacion || parentSession?.numeroHabitacion || '-',
      clienteNombre: rawSale.clienteNombre || parentSession?.clienteNombre || '-',
      checkout: formatDateStr(parentSession?.fechaSalida),
      fechaCitaVenta: formatDateTimeStr(rawSale.fechaHoraCita),
      adultosYNinos: `${numAdultos} adulto(s), ${numNinos} niño(s)`,
      telefono: rawSale.clienteTelefono || parentSession?.clienteTelefono || '-',
      email: rawSale.clienteEmail || parentSession?.clienteEmail || '-',
      agendadoPor,
      type: 'sale',
      rawSale,
      rawSession: parentSession,
    }
  }

  // Otherwise type === 'session'
  const session = rawSession as SesionFotografica
  const hotel = hotelStore.hotels.find((h) => Number(h.id) === Number(session?.hotelId))
  const hotelNombre = hotel ? hotel.nombre : 'Hotel desconocido'

  const fotografo = userStore.users.find((u) => String(u.id) === String(session?.fotografoId))
  const fotografoPrimerNombre =
    (fotografo?.nombre ? fotografo.nombre.split(' ')[0] : '') || 'Sin asignar'
  const fotografoNombreCompleto = fotografo?.nombre
    ? `${fotografo.nombre} ${fotografo.apellidos || ''}`.trim()
    : 'Sin asignar'

  const agendadoUser = userStore.users.find((u) => String(u.id) === String(session?.creadorId))
  const agendadoPor = agendadoUser?.nombre
    ? `${agendadoUser.nombre} ${agendadoUser.apellidos || ''}`.trim()
    : '-'

  const numAdultos = session?.numAdultos ?? 1
  const numNinos = session?.numNinos ?? 0

  return {
    hotelNombre,
    fotografoPrimerNombre,
    fotografoNombreCompleto,
    fotografoNombre: fotografo?.nombre || null,
    fotografoApellidos: fotografo?.apellidos || null,
    fotografoImagen: fotografo?.imagen || null,
    fotografoColor: fotografo?.color || null,
    fechaCabecera: formatEventHeaderDate(session.fechaHoraInicio),
    habitacion: session?.numeroHabitacion || '-',
    clienteNombre: session?.clienteNombre || '-',
    checkout: formatDateStr(session?.fechaSalida),
    fechaCitaVenta: session?.citaVenta?.fechaHoraCita
      ? formatDateTimeStr(session.citaVenta.fechaHoraCita)
      : 'Sin cita',
    adultosYNinos: `${numAdultos} adulto(s), ${numNinos} niño(s)`,
    telefono: session?.clienteTelefono || '-',
    email: session?.clienteEmail || '-',
    agendadoPor,
    type: 'session',
    rawSession: session,
  }
}

function triggerEditEvent(info?: EventTooltipInfo | ExtendedEventProps | null) {
  if (!info) return
  tooltipVisible.value = false
  mobileDialogVisible.value = false

  const type = info.type
  const rawSale = info.rawSale
  const rawSession = info.rawSession

  if (type === 'sale' && rawSale) {
    router.push(`/ventas/${rawSale.id}/editar`)
    return
  }

  if (rawSession) {
    router.push(`/agenda/${rawSession.id}/editar`)
  }
}

function handleEventClick(clickInfo: EventClickArg) {
  if (isMobile.value) {
    // En versión móvil abrimos directamente el diálogo modal
    activeTooltipInfo.value = buildTooltipInfo(clickInfo.event.extendedProps)
    mobileDialogVisible.value = true
    return
  }

  if (clickTimer) {
    // Doble clic -> editar evento directamente y cancelar temporizador
    clearTimeout(clickTimer)
    clickTimer = null
    tooltipVisible.value = false
    triggerEditEvent(clickInfo.event.extendedProps)
  } else {
    // Clic simple -> esperar 250ms por posible doble clic
    clickTimer = setTimeout(() => {
      clickTimer = null
      activeTooltipInfo.value = buildTooltipInfo(clickInfo.event.extendedProps)
      tooltipTarget.value = clickInfo.el
      tooltipVisible.value = true
    }, 250)
  }
}
</script>

<template>
  <div class="calendar-container">
    <!-- Header principal -->
    <div class="calendar-header">
      <div class="header-info">
        <h1 class="page-title">Agenda</h1>
        <p class="page-subtitle">
          Hotel:
          <strong>{{ selectedHotelName }}</strong>
        </p>
      </div>

      <div class="header-actions">
        <!-- Selector de Hotel -->
        <el-select
          v-model="selectedHotelId"
          placeholder="Filtrar por Hotel"
          class="hotel-selector"
          filterable
          clearable
          :size="isMobile ? 'large' : 'default'"
        >
          <el-option
            v-for="hotel in userHotels"
            :key="hotel.id"
            :label="hotel.nombre"
            :value="hotel.id"
          />
        </el-select>

        <div class="header-buttons-row">
          <!-- Botón Nueva Sesión Fotográfica -->
          <el-button
            type="primary"
            :size="isMobile ? 'large' : 'default'"
            class="header-action-btn"
            @click="navigateToNewSessionForm()"
          >
            <img :src="iconoCamara" alt="Cámara" class="btn-action-icon btn-icon-camara" />
            <span class="btn-action-label">Nueva Sesión</span>
          </el-button>

          <!-- Botón Nueva Cita de Venta -->
          <el-button
            type="primary"
            :size="isMobile ? 'large' : 'default'"
            class="header-action-btn"
            @click="navigateToNewSaleForm()"
          >
            <img :src="iconoCita" alt="Cita" class="btn-action-icon btn-icon-calendar" />
            <span class="btn-action-label">Nueva Cita de Venta</span>
          </el-button>
        </div>
      </div>
    </div>

    <!-- Panel de Alertas Colapsable del Fotógrafo -->
    <div v-if="totalAlertsCount > 0" class="alerts-panel-wrapper">
      <el-collapse v-model="activeAlertPanels" class="alerts-collapse">
        <el-collapse-item name="alerts">
          <template #title>
            <div class="alerts-panel-header">
              <el-icon class="alerts-header-icon"><Bell /></el-icon>
              <span class="alerts-header-title">Panel de Alertas Pendientes</span>
              <el-tag type="danger" effect="dark" round size="small" class="alerts-count-badge">
                {{ totalAlertsCount }}
              </el-tag>
            </div>
          </template>

          <div class="alerts-sections-grid">
            <!-- 1. Sesiones Vencidas -->
            <div v-if="overdueSessions.length > 0" class="alert-section section-overdue">
              <h4 class="section-title">Sesiones Vencidas ({{ overdueSessions.length }})</h4>
              <div class="section-cards">
                <div v-for="s in overdueSessions" :key="s.id" class="alert-item-card">
                  <div class="item-details">
                    <span class="item-name">{{ s.clienteNombre }}</span>
                    <span class="item-sub">
                      {{ formatDateTime(s.fechaHoraInicio)
                      }}{{ s.numeroHabitacion ? ` | Hab ${s.numeroHabitacion}` : '' }}
                    </span>
                  </div>
                  <el-button type="warning" @click="router.push(`/agenda/${s.id}/editar`)">
                    Cambiar Estado
                  </el-button>
                </div>
              </div>
            </div>

            <!-- 2. Sesiones Sin Cita de Venta -->
            <div v-if="missingSaleSessions.length > 0" class="alert-section section-missing">
              <h4 class="section-title">
                Sesiones Sin Cita de Venta ({{ missingSaleSessions.length }})
              </h4>
              <div class="section-cards">
                <div v-for="s in missingSaleSessions" :key="s.id" class="alert-item-card">
                  <div class="item-details">
                    <span class="item-name">{{ s.clienteNombre }}</span>
                    <span class="item-sub">
                      {{ formatDateTime(s.fechaHoraInicio)
                      }}{{ s.numeroHabitacion ? ` | Hab ${s.numeroHabitacion}` : '' }}
                    </span>
                  </div>
                  <el-button type="primary" @click="router.push(`/ventas/nueva?sesionId=${s.id}`)">
                    Agendar Venta
                  </el-button>
                </div>
              </div>
            </div>

            <!-- 3. Citas de Venta Vencidas -->
            <div v-if="overdueSales.length > 0" class="alert-section section-noshow">
              <h4 class="section-title">Citas venta vencidas ({{ overdueSales.length }})</h4>
              <div class="section-cards">
                <div v-for="s in overdueSales" :key="s.id" class="alert-item-card">
                  <div class="item-details">
                    <span class="item-name">{{ s.clienteNombre }}</span>
                    <span class="item-sub">
                      {{ formatDateTime(s.citaVenta?.fechaHoraCita)
                      }}{{ s.numeroHabitacion ? ` | Hab ${s.numeroHabitacion}` : '' }}
                    </span>
                  </div>
                  <el-button
                    type="warning"
                    @click="router.push(`/ventas/${s.citaVenta?.id}/editar`)"
                  >
                    Cambiar Estado
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>

    <!-- Calendario de FullCalendar -->
    <div class="calendar-card">
      <!-- Encabezado Fijo/Sticky para Móvil: Selector de Fecha + Botones de Vista -->
      <div v-if="isMobile" class="mobile-sticky-calendar-header">
        <!-- Selector de fecha para móvil (DatePickerPanel sin bordes con badges) -->
        <div class="mobile-picker-panel-wrapper">
          <el-date-picker-panel
            :key="mobilePickerType"
            :border="false"
            v-model="mobileSelectedDate"
            :type="mobilePickerType"
            value-format="YYYY-MM-DD"
            date-format="YYYY-MM-DD"
          >
            <template #default="cell">
              <div class="el-date-table-cell" :class="{ current: cell.isCurrent }">
                <span class="el-date-table-cell__text">{{ cell.text }}</span>
                <span
                  v-if="getEventCountForDate(cell.date || cell.dayjs) > 0"
                  class="mobile-picker-day-badge"
                >
                  {{ getEventCountForDate(cell.date || cell.dayjs) }}
                </span>
              </div>
            </template>
          </el-date-picker-panel>
        </div>

        <!-- Botones de Cambio de Vista Móvil: Día | Agenda -->
        <div class="mobile-view-buttons-wrapper">
          <el-radio-group
            v-model="currentCalendarView"
            size="default"
            class="mobile-view-segmented"
            @change="handleMobileViewChange"
          >
            <el-radio-button value="timeGridDay">Día</el-radio-button>
            <el-radio-button value="listWeek">Agenda</el-radio-button>
          </el-radio-group>
        </div>
      </div>

      <FullCalendar ref="calendarRef" :options="calendarOptions" :events="calendarEvents">
        <template #eventContent="arg">
          <div class="jj-event-card-content" :data-event-id="arg.event.id">
            <!-- Icono de Cámara para Sesiones -->
            <img
              v-if="arg.event.extendedProps.type !== 'sale'"
              :src="iconoCamara"
              alt="Sesión Fotográfica"
              class="jj-event-type-badge jj-badge-camara"
            />
            <!-- Icono de Cita para Citas de Venta -->
            <img
              v-else
              :src="iconoCita"
              alt="Cita de Venta"
              class="jj-event-type-badge jj-badge-cita"
            />

            <!-- Cabecera: Avatar + (Hora y Nombre Fotógrafo) -->
            <div class="jj-event-header">
              <div class="jj-event-header-left">
                <!-- Avatar del fotógrafo (Foto o Iniciales con color de fondo) -->
                <el-avatar
                  v-if="arg.event.extendedProps.fotografoPrimerNombre"
                  :src="arg.event.extendedProps.fotografoImagen || undefined"
                  shape="circle"
                  :size="30"
                  :style="{
                    backgroundColor: getUserBgColor(arg.event.extendedProps.fotografoColor),
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: '700',
                    flexShrink: 0,
                    border: '1.5px solid rgba(255, 255, 255, 0.85)',
                  }"
                  class="jj-event-avatar"
                >
                  {{
                    getUserInitials(
                      arg.event.extendedProps.fotografoNombre,
                      arg.event.extendedProps.fotografoApellidos,
                    )
                  }}
                </el-avatar>
                <el-avatar
                  v-else
                  shape="circle"
                  :size="30"
                  :style="{
                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: '700',
                    flexShrink: 0,
                    border: '1.5px solid rgba(255, 255, 255, 0.6)',
                  }"
                  class="jj-event-avatar"
                >
                  <el-icon :size="16"><User /></el-icon>
                </el-avatar>

                <!-- Hora y Fotógrafo apilados -->
                <div class="jj-event-header-titles">
                  <span v-if="getEventTimeText(arg)" class="jj-event-time">
                    {{ getEventTimeText(arg) }}
                  </span>
                  <span
                    v-if="arg.event.extendedProps.fotografoPrimerNombre"
                    class="jj-event-photographer"
                  >
                    {{ arg.event.extendedProps.fotografoPrimerNombre }}
                  </span>
                  <span v-else class="jj-event-photographer jj-event-unassigned">Sin asignar</span>
                </div>
              </div>

              <!-- Icono Cubo de Basura (Solo ADMIN y SUPERUSUARIO) -->
              <div v-if="canDeleteEvents" class="jj-event-delete-wrapper" @click.stop>
                <button
                  type="button"
                  class="jj-event-trash-btn"
                  title="Eliminar evento"
                  @click.stop="openDeleteConfirm(arg.event, $event)"
                >
                  <el-icon :size="12"><Delete /></el-icon>
                </button>
              </div>
            </div>

            <!-- Separador punteado -->
            <div class="jj-event-divider"></div>

            <!-- Cuerpo: Habitación, Cliente y PAX -->
            <div class="jj-event-body">
              <div v-if="arg.event.extendedProps.roomStr" class="jj-event-room">
                {{ arg.event.extendedProps.roomStr }}
              </div>
              <div class="jj-event-client">
                {{ arg.event.extendedProps.clienteNombre || arg.event.title }}
              </div>
              <div v-if="arg.event.extendedProps.paxStr" class="jj-event-pax">
                {{ arg.event.extendedProps.paxStr }}
              </div>
            </div>
          </div>
        </template>
      </FullCalendar>

      <!-- Popover de Confirmación de Borrado con Checkbox Dinámico -->
      <el-popover
        v-model:visible="deletePopoverVisible"
        :virtual-ref="deletePopoverTarget"
        virtual-triggering
        trigger="click"
        width="270"
        placement="top"
        popper-class="delete-confirm-popover"
      >
        <div class="delete-popconfirm-box">
          <div class="delete-popconfirm-header">
            <el-icon class="delete-warning-icon" :size="16" color="#e6a23c">
              <WarningFilled />
            </el-icon>
            <span class="delete-popconfirm-title">¿Eliminar este evento?</span>
          </div>

          <!-- Checkbox para evento asociado -->
          <div v-if="hasAssociatedEvent(pendingDeleteEvent)" class="delete-associated-row">
            <el-checkbox v-model="deleteAssociated" size="default">
              <span class="delete-checkbox-label">{{ associatedCheckboxLabel }}</span>
            </el-checkbox>
          </div>

          <div class="delete-popconfirm-actions">
            <el-button size="small" plain @click="deletePopoverVisible = false">Cancelar</el-button>
            <el-button size="small" type="danger" :loading="isDeleting" @click="confirmDelete">
              Sí, eliminar
            </el-button>
          </div>
        </div>
      </el-popover>

      <!-- Popover de Detalle del Evento (Solo Desktop) -->
      <el-popover
        v-if="!isMobile"
        v-model:visible="tooltipVisible"
        :virtual-ref="tooltipTarget"
        virtual-triggering
        trigger="click"
        width="340"
        placement="right-start"
        popper-class="event-details-popover"
      >
        <div v-if="activeTooltipInfo" class="tooltip-card">
          <!-- Cabecera: Nombre Hotel + Nombre Fotógrafo (Solo Nombre) -->
          <div class="tooltip-header">
            <div class="header-hotel" title="Hotel">
              <el-icon :size="16"><Building2 /></el-icon>
              <span>{{ activeTooltipInfo.hotelNombre }}</span>
            </div>
            <div class="header-photographer" title="Fotógrafo asignado">
              <el-avatar
                v-if="activeTooltipInfo.fotografoPrimerNombre !== 'Sin asignar'"
                :src="activeTooltipInfo.fotografoImagen || undefined"
                shape="circle"
                :size="22"
                :style="{
                  backgroundColor: getUserBgColor(activeTooltipInfo.fotografoColor),
                  color: '#ffffff',
                  fontWeight: '600',
                  fontSize: '11px',
                }"
              >
                {{
                  getUserInitials(
                    activeTooltipInfo.fotografoNombre,
                    activeTooltipInfo.fotografoApellidos,
                  )
                }}
              </el-avatar>
              <el-icon v-else :size="16"><User /></el-icon>
              <span>{{ activeTooltipInfo.fotografoPrimerNombre }}</span>
            </div>
            <div class="sub-header">
              <el-icon :size="16"><Calendar /></el-icon>
              <span>{{ activeTooltipInfo.fechaCabecera }}</span>
            </div>
          </div>

          <!-- Cuerpo con datos detallados -->
          <div class="tooltip-body">
            <div class="info-row">
              <span class="info-label">Habitación:</span>
              <span class="info-value">{{ activeTooltipInfo.habitacion }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Nombre cliente:</span>
              <span class="info-value">{{ activeTooltipInfo.clienteNombre }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Checkout:</span>
              <span class="info-value">{{ activeTooltipInfo.checkout }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Fecha cita venta:</span>
              <span class="info-value">{{ activeTooltipInfo.fechaCitaVenta }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Adultos y niños:</span>
              <span class="info-value">{{ activeTooltipInfo.adultosYNinos }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Teléfono:</span>
              <span class="info-value">{{ activeTooltipInfo.telefono }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Email:</span>
              <span class="info-value email-text">{{ activeTooltipInfo.email }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Agendado por:</span>
              <span class="info-value">{{ activeTooltipInfo.agendadoPor }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Fotógrafo:</span>
              <span class="info-value">{{ activeTooltipInfo.fotografoNombreCompleto }}</span>
            </div>
          </div>

          <!-- Pie / Acciones -->
          <div class="tooltip-footer">
            <el-button
              type="primary"
              style="width: 100%"
              @click="triggerEditEvent(activeTooltipInfo)"
            >
              Editar {{ activeTooltipInfo.type === 'sale' ? 'Cita Venta' : 'Sesión' }}
            </el-button>

            <!-- Botón de Borrar en Popover para ADMIN y SUPERUSUARIO -->
            <div v-if="canDeleteEvents" style="margin-top: 8px">
              <el-button
                type="danger"
                plain
                style="width: 100%"
                @click="openDeleteConfirm(activeTooltipInfo, $event)"
              >
                <el-icon style="margin-right: 4px"><Delete /></el-icon>
                Eliminar {{ activeTooltipInfo.type === 'sale' ? 'Cita Venta' : 'Sesión' }}
              </el-button>
            </div>

            <div class="double-click-hint">
              <el-icon style="vertical-align: middle; margin-right: 4px"><InfoFilled /></el-icon>
              O haz doble clic en el evento para editar
            </div>
          </div>
        </div>
      </el-popover>

      <!-- Dialog Modal para Móvil (Sustituye al Tooltip/Popover) -->
      <el-dialog
        v-model="mobileDialogVisible"
        width="90%"
        class="mobile-event-dialog"
        append-to-body
        destroy-on-close
      >
        <template #header>
          <div v-if="activeTooltipInfo" class="dialog-custom-header">
            <div class="header-hotel" title="Hotel">
              <el-icon :size="18"><Building2 /></el-icon>
              <span>{{ activeTooltipInfo.hotelNombre }}</span>
            </div>
            <div class="header-photographer" title="Fotógrafo asignado">
              <el-avatar
                v-if="activeTooltipInfo.fotografoPrimerNombre !== 'Sin asignar'"
                :src="activeTooltipInfo.fotografoImagen || undefined"
                shape="circle"
                :size="22"
                :style="{
                  backgroundColor: getUserBgColor(activeTooltipInfo.fotografoColor),
                  color: '#ffffff',
                  fontWeight: '600',
                  fontSize: '11px',
                }"
              >
                {{
                  getUserInitials(
                    activeTooltipInfo.fotografoNombre,
                    activeTooltipInfo.fotografoApellidos,
                  )
                }}
              </el-avatar>
              <el-icon v-else :size="16"><User /></el-icon>
              <span>{{ activeTooltipInfo.fotografoPrimerNombre }}</span>
            </div>
            <div class="sub-header">
              <el-icon :size="16"><Calendar /></el-icon>
              <span>{{ activeTooltipInfo.fechaCabecera }}</span>
            </div>
          </div>
        </template>

        <div v-if="activeTooltipInfo" class="tooltip-body">
          <div class="info-row">
            <span class="info-label">Habitación:</span>
            <span class="info-value">{{ activeTooltipInfo.habitacion }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Nombre cliente:</span>
            <span class="info-value">{{ activeTooltipInfo.clienteNombre }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Checkout:</span>
            <span class="info-value">{{ activeTooltipInfo.checkout }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Fecha cita venta:</span>
            <span class="info-value">{{ activeTooltipInfo.fechaCitaVenta }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Adultos y niños:</span>
            <span class="info-value">{{ activeTooltipInfo.adultosYNinos }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Teléfono:</span>
            <span class="info-value">{{ activeTooltipInfo.telefono }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Email:</span>
            <span class="info-value email-text">{{ activeTooltipInfo.email }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Agendado por:</span>
            <span class="info-value">{{ activeTooltipInfo.agendadoPor }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Fotógrafo:</span>
            <span class="info-value">{{ activeTooltipInfo.fotografoNombreCompleto }}</span>
          </div>
        </div>

        <template #footer>
          <div v-if="activeTooltipInfo" class="dialog-footer-actions">
            <el-button
              type="primary"
              size="large"
              style="width: 100%"
              @click="triggerEditEvent(activeTooltipInfo)"
            >
              Editar {{ activeTooltipInfo.type === 'sale' ? 'Cita Venta' : 'Sesión' }}
            </el-button>

            <!-- Botón de Borrar en Diálogo Móvil para ADMIN y SUPERUSUARIO -->
            <div v-if="canDeleteEvents" style="margin-top: 10px">
              <el-button
                type="danger"
                size="large"
                plain
                style="width: 100%"
                @click="openDeleteConfirm(activeTooltipInfo, $event)"
              >
                <el-icon style="margin-right: 4px"><Delete /></el-icon>
                Eliminar {{ activeTooltipInfo.type === 'sale' ? 'Cita Venta' : 'Sesión' }}
              </el-button>
            </div>
          </div>
          <div class="double-click-hint">
            <el-icon style="vertical-align: middle; margin-right: 4px"><InfoFilled /></el-icon>
            O haz doble clic en el evento para editar
          </div>
        </template>
      </el-dialog>
    </div>

    <!-- Botón Flotante para Móvil (+ Agendar) -->
    <el-button
      type="primary"
      circle
      size="large"
      class="fab-btn"
      :icon="Plus"
      @click="navigateToNewSessionForm()"
      aria-label="Agendar nueva sesión"
    />
  </div>
</template>

<style scoped>
.calendar-container {
  padding: 1.5rem;
  max-width: 1300px;
  margin: 0 auto;
  position: relative;
}

/* Alerts Panel Styling */
.alerts-panel-wrapper {
  margin-bottom: 1.25rem;
}

.alerts-collapse {
  border: 1px solid var(--el-color-warning-light-5, #fde68a);
  border-radius: var(--el-card-border-radius, 8px);
  background-color: var(--el-color-warning-light-9, #fffbeb);
  overflow: hidden;
}

:deep(.alerts-collapse .el-collapse-item__header) {
  background-color: var(--el-color-warning-light-9, #fffbeb);
  border-bottom: none;
  padding: 0 1.25rem;
  height: 48px;
}

:deep(.alerts-collapse .el-collapse-item__wrap) {
  background-color: var(--el-color-warning-light-9, #fffbeb);
  border-bottom: none;
}

:deep(.alerts-collapse .el-collapse-item__content) {
  padding: 0 1.25rem 1.25rem 1.25rem;
}

.alerts-panel-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-weight: 600;
  color: var(--el-color-warning-dark-2, #b45309);
}

.alerts-header-icon {
  font-size: 1.1rem;
  color: var(--el-color-warning, #e6a23c);
}

.alerts-header-title {
  font-size: 0.95rem;
}

.alerts-sections-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.alert-section {
  background-color: var(--toolbar-bg, #ffffff);
  border: 1px solid var(--toolbar-border, #e2e8f0);
  border-radius: 6px;
  padding: 1rem;
}

.section-title {
  font-size: 0.85rem;
  font-weight: 700;
  margin: 0 0 0.75rem 0;
  color: var(--heading-color, #334155);
}

.section-cards {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.alert-item-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background-color: var(--el-fill-color-blank, #f8fafc);
  border-bottom: 1px solid var(--toolbar-border, #e2e8f0);
}

.item-details {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.item-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--heading-color, #0f172a);
}

.item-sub {
  font-size: 0.75rem;
  color: var(--nav-link-color, #64748b);
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
  margin: 0 0 0.25rem 0;
}

.page-subtitle {
  font-size: 0.9rem;
  color: var(--nav-link-color, #64748b);
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-buttons-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-action-btn {
  display: inline-flex;
  align-items: center;
}

.header-action-btn :deep(> span) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-action-icon {
  width: 32px;
  height: 32px;
  object-fit: contain;
  flex-shrink: 0;
  vertical-align: middle;
}
.btn-icon-calendar {
  width: 25px;
  height: 25px;
}

.hotel-selector {
  width: 220px;
}

.calendar-card {
  background: var(--toolbar-bg, #ffffff);
  border: 1px solid var(--toolbar-border, #e2e8f0);
  border-radius: var(--el-card-border-radius, 4px);
  padding: 1.25rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
}

:deep(.fc) {
  font-family: inherit;
}

:deep(.fc-toolbar-title) {
  font-size: 1.15rem;
  font-weight: 500;
  text-transform: capitalize;
  color: var(--el-input-text-color, var(--el-text-color-regular));
}

:deep(.fc-col-header-cell),
:deep(.fc-col-header-cell-cushion) {
  font-weight: 400 !important;
  text-transform: capitalize;
  color: var(--el-input-text-color, var(--el-text-color-regular));
}

:deep(.fc-button-primary) {
  background-color: var(--el-color-primary, #409eff) !important;
  border-color: var(--el-color-primary, #409eff) !important;
  color: #ffffff !important;
  font-size: var(--el-font-size-base, 14px) !important;
  font-weight: 500 !important;
  border-radius: var(--el-border-radius-base, 4px) !important;
  padding: 19px 26px !important;
  height: 32px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  box-shadow: none !important;
  transition: all 0.2s ease-in-out !important;
}

:deep(.fc-button-primary:hover) {
  background-color: var(--el-color-primary-light-3, #66b1ff) !important;
  border-color: var(--el-color-primary-light-3, #66b1ff) !important;
  color: #ffffff !important;
}

:deep(.fc-button-primary:not(:disabled).fc-button-active),
:deep(.fc-button-primary:not(:disabled):active) {
  background-color: var(--el-color-primary-dark-2, #337ecc) !important;
  border-color: var(--el-color-primary-dark-2, #337ecc) !important;
  color: #ffffff !important;
  font-weight: 600 !important;
}

:deep(.fc-button-primary:disabled) {
  background-color: var(--el-color-primary-light-5, #a0cfff) !important;
  border-color: var(--el-color-primary-light-5, #a0cfff) !important;
  opacity: 0.6;
}

:deep(.fc-button-group) {
  gap: 2px;
}

/* Estilo base para todos los botones del grupo */
:deep(.fc-button-group .fc-button) {
  border-radius: 0 !important;
}

/* Redondea solo el primer botón (Mes) */
:deep(.fc-button-group .fc-button:first-child) {
  border-top-left-radius: 4px !important;
  border-bottom-left-radius: 4px !important;
}

/* Redondea solo el último botón (Agenda) */
:deep(.fc-button-group .fc-button:last-child) {
  border-top-right-radius: 4px !important;
  border-bottom-right-radius: 4px !important;
}

:deep(.fc-button-group > .fc-button) {
  margin-right: 0;
}

/* ── Celdas / Huecos más grandes para FullCalendar ── */
:deep(.fc-timegrid-slot),
:deep(.fc-timegrid-slot-lane) {
  height: 60px !important;
}

:deep(.fc-timegrid-slot-label) {
  font-size: 0.85rem;
  font-weight: 500;
}

:deep(.fc-daygrid-day-frame) {
  min-height: 110px !important;
}

:deep(.fc-daygrid-day-top) {
  font-size: 0.9rem;
  font-weight: 600;
  padding: 4px 6px;
}

:deep(.fc-event) {
  border-radius: 8px !important;
  cursor: pointer !important;
  color: #ffffff !important;
  padding: 6px 8px !important;
  border: none !important;
  /*
  background-image: linear-gradient(
    to top right,
    rgba(0, 0, 0, 0.32) 0%,
    rgba(0, 0, 0, 0.14) 42%,
    rgba(0, 0, 0, 0) 82%
  ) !important;*/
  background-image: linear-gradient(
    11deg,
    rgba(64, 64, 64, 0.51) 0%,
    rgba(255, 255, 255, 0) 86%
  ) !important;
  transition:
    transform 0.18s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.18s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.2s ease,
    filter 0.2s ease !important;
  overflow: visible !important;
}

:deep(.fc-event:hover),
:deep(.fc-event.fc-event-hovered) {
  transform: translateY(-2px) scale(1.01) !important;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25) !important;
  z-index: 10 !important;
  opacity: 1 !important;
  filter: none !important;
}

:deep(.fc-event.fc-event-associated) {
  transform: translateY(-2px) scale(1.01) !important;
  box-shadow:
    0 6px 16px rgba(0, 0, 0, 0.25),
    0 0 0 2.5px rgba(255, 255, 255, 0.9) !important;
  z-index: 9 !important;
  opacity: 1 !important;
  filter: none !important;
}

:deep(.fc-event.fc-event-dimmed) {
  opacity: 0.2 !important;
  transform: none !important;
  box-shadow: none !important;
  filter: grayscale(15%) !important;
}

:deep(.fc-timegrid-event) {
  border-radius: 8px !important;
  margin: 1px 2px !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15) !important;
  color: #ffffff !important;
  min-height: 104px !important;
}

:deep(.fc-daygrid-event) {
  margin: 2px 4px !important;
  padding: 6px 8px !important;
  border-radius: 8px !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15) !important;
  color: #ffffff !important;
}

:deep(.fc-daygrid-event .jj-event-card-content),
:deep(.fc-timegrid-event .jj-event-card-content) {
  color: #ffffff !important;
}

:deep(.jj-event-card-content) {
  display: flex;
  flex-direction: column;
  width: 100%;
  position: relative;
  line-height: 1.25;
  box-sizing: border-box;
}

:deep(.jj-event-type-badge) {
  position: absolute;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.28));
  pointer-events: none;
  z-index: 4;
}

/* Offset y dimensiones para el icono de Cámara (Sesiones) */
:deep(.jj-badge-camara) {
  top: -20px;
  right: -14px;
  width: 38px;
  height: 38px;
}

/* Offset y dimensiones para el icono de Cita (Ventas) */
:deep(.jj-badge-cita) {
  top: -10px;
  right: -14px;
  width: 38px;
  height: 38px;
}

:deep(.jj-event-header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  position: relative;
  padding-right: 34px; /* espacio para el icono de tipo de evento */
}

:deep(.jj-event-header-left) {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

:deep(.jj-event-avatar) {
  flex-shrink: 0;
}

:deep(.jj-event-header-titles) {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  justify-content: center;
}

:deep(.jj-event-time) {
  font-size: 1.22rem;
  font-weight: 800;
  line-height: 1.05;
  color: #ffffff;
  letter-spacing: -0.01em;
}

:deep(.jj-event-photographer) {
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.15;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
}

:deep(.jj-event-unassigned) {
  opacity: 0.85;
  font-style: italic;
  font-size: 0.85rem;
}

:deep(.jj-event-delete-wrapper) {
  display: inline-flex;
  align-items: center;
  position: absolute;
  bottom: 0;
  right: -2px;
  z-index: 10;
}

:deep(.jj-event-trash-btn) {
  background: rgba(0, 0, 0, 0.25);
  border: none;
  border-radius: 4px;
  color: #ffffff;
  cursor: pointer;
  padding: 3px 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  line-height: 1;
  opacity: 0.8;
}

:deep(.fc-list-event .jj-event-trash-btn) {
  background: rgba(0, 0, 0, 0.08);
  color: #64748b;
  opacity: 1;
}

:deep(.jj-event-trash-btn:hover) {
  background: #ef4444 !important;
  color: #ffffff !important;
  transform: scale(1.15);
  opacity: 1;
}

:deep(.jj-event-divider) {
  width: 100%;
  border-top: 1px dashed rgba(255, 255, 255, 0.48);
  margin: 6px 0 5px 0;
}

:deep(.jj-event-body) {
  display: flex;
  flex-direction: column;
  gap: 1px;
  font-size: 0.88rem;
  font-weight: 500;
  color: #ffffff;
  line-height: 1.25;
}

:deep(.jj-event-room) {
  font-size: 0.88rem;
  font-weight: 500;
  color: #ffffff;
}

:deep(.jj-event-client) {
  font-size: 0.88rem;
  font-weight: 500;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.jj-event-pax) {
  font-size: 0.85rem;
  font-weight: 500;
  color: #ffffff;
  opacity: 0.95;
}

/* ── Popover de Confirmación de Borrado con Checkbox ── */
:deep(.delete-confirm-popover) {
  padding: 12px 14px !important;
  border-radius: 8px !important;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15) !important;
  border: 1px solid var(--el-border-color-lighter, #e2e8f0) !important;
}

.delete-popconfirm-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.delete-popconfirm-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.delete-warning-icon {
  flex-shrink: 0;
}

.delete-popconfirm-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--el-text-color-primary, #0f172a);
}

.delete-associated-row {
  background: var(--el-fill-color-light, #f8fafc);
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px dashed var(--el-border-color, #cbd5e1);
  display: flex;
  align-items: center;
}

.delete-checkbox-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--el-text-color-regular, #334155);
}

.delete-popconfirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

/* ── Vista Agenda / Lista: texto oscuro legible y punto de color nativo ── */
:deep(.fc-list-event) {
  cursor: pointer;
  font-size: 0.9rem;
  background-image: none !important;
}

:deep(.fc-list-event td),
:deep(.fc-list-event-title),
:deep(.fc-list-event-title a),
:deep(.fc-list-event-time),
:deep(.fc-list-event .jj-event-card-content),
:deep(.fc-list-event .jj-event-time),
:deep(.fc-list-event .jj-event-photographer),
:deep(.fc-list-event .jj-event-room),
:deep(.fc-list-event .jj-event-client),
:deep(.fc-list-event .jj-event-pax) {
  color: var(--el-text-color-primary, #0f172a) !important;
}

:deep(.fc-list-event .jj-event-divider) {
  border-top: 1px dashed rgba(0, 0, 0, 0.15) !important;
}

:deep(.fc-list-event .jj-event-type-badge) {
  position: absolute;
  top: 0px;
  right: 0px;
  width: 32px;
  height: 32px;
  filter: none;
}

:deep(.fc-list-event .jj-event-header) {
  padding-right: 0;
}

.fab-btn {
  display: none;
  position: fixed;
  bottom: 2rem;
  right: 1.5rem;
  width: 56px;
  height: 56px;
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
  z-index: 99;
}

.mobile-sticky-calendar-header {
  width: calc(100vw - 50px);
}

.mobile-view-buttons-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 0.25rem;
}

.mobile-view-segmented :deep(.el-radio-button__inner) {
  padding: 8px 24px;
  font-weight: 500;
  font-size: 0.88rem;
}

.mobile-picker-panel-wrapper {
  display: flex;
  justify-content: center;
  width: 100%;
  margin-bottom: 0.35rem;
  overflow: hidden;
}

.mobile-picker-panel-wrapper :deep(.el-picker-panel) {
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
}

.mobile-picker-panel-wrapper :deep(.el-picker-panel__body-wrapper),
.mobile-picker-panel-wrapper :deep(.el-picker-panel__body) {
  width: 100%;
  max-width: 320px;
  margin: 0 auto;
}

.mobile-picker-panel-wrapper :deep(.el-date-table-cell) {
  position: relative;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mobile-picker-day-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  background-color: var(--el-color-danger, #ef4444);
  color: #ffffff;
  font-size: 9px;
  font-weight: 700;
  min-width: 14px;
  height: 14px;
  line-height: 14px;
  padding: 0 3px;
  border-radius: 7px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
  pointer-events: none;
  z-index: 2;
}

.mobile-picker-panel-wrapper :deep(.current) .mobile-picker-day-badge,
.mobile-picker-panel-wrapper :deep(.start-date) .mobile-picker-day-badge,
.mobile-picker-panel-wrapper :deep(.end-date) .mobile-picker-day-badge,
.mobile-picker-panel-wrapper :deep(.in-range) .mobile-picker-day-badge,
.mobile-picker-panel-wrapper :deep(.is-week-mode) .mobile-picker-day-badge {
  background-color: var(--el-color-danger, #ef4444);
  color: #ffffff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
}

.mobile-picker-panel-wrapper :deep(.prev-month) .mobile-picker-day-badge,
.mobile-picker-panel-wrapper :deep(.next-month) .mobile-picker-day-badge {
  opacity: 0.4;
}

@media (max-width: 768px) {
  .calendar-container {
    padding: 1rem;
  }

  .calendar-card {
    padding: 0;
    overflow: visible;
    background: transparent;
    border: none;
    box-shadow: none;
  }

  .mobile-sticky-calendar-header {
    position: sticky;
    top: 0;
    z-index: 30;
    background-color: var(--toolbar-bg, #ffffff);
    padding: 0.5rem 0.5rem 0.65rem 0.5rem;
    border: 1px solid var(--toolbar-border, #e2e8f0);
    border-radius: var(--el-card-border-radius, 8px) var(--el-card-border-radius, 8px) 0 0;
    margin-bottom: 0.75rem;
    box-shadow: 0 -4px 14px rgba(0, 0, 0, 0.06);
  }

  .calendar-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 0.65rem;
  }

  .header-actions .hotel-selector {
    width: 100% !important;
  }

  .header-buttons-row {
    display: flex;
    flex-direction: row;
    width: 100%;
    gap: 0.65rem;
  }

  .header-buttons-row .header-action-btn {
    flex: 1 1 0;
    width: 50% !important;
    height: auto !important;
    min-height: 78px;
    padding: 10px 6px !important;
    margin: 0 !important;
    border-radius: 8px !important;
  }

  .header-buttons-row .header-action-btn :deep(> span) {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 6px;
    width: 100%;
    text-align: center;
  }

  .btn-action-icon {
    width: 38px !important;
    height: 38px !important;
    margin: 0 !important;
  }

  .btn-icon-calendar {
    width: 32px !important;
    height: 32px !important;
    margin: 0 !important;
  }

  .btn-action-label {
    font-size: 0.8rem;
    font-weight: 600;
    line-height: 1.2;
    text-align: center;
    white-space: normal;
  }

  .fab-btn {
    display: inline-flex;
  }

  /* ── FullCalendar toolbar: stack sections vertically on mobile ── */
  :deep(.fc .fc-toolbar.fc-header-toolbar) {
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
    justify-content: center;
    margin-bottom: 0.75rem !important;
  }

  :deep(.fc-toolbar.fc-header-toolbar .fc-toolbar-chunk) {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 4px;
  }

  /* Ocultar navegador de tiempo nativo (flechas, hoy y título) en móvil */
  :deep(.fc-prev-button),
  :deep(.fc-next-button),
  :deep(.fc-today-button),
  :deep(.fc-toolbar-title) {
    display: none !important;
  }

  /* ── Ocultar vistas de Mes y Semana en móvil ── */
  :deep(.fc-dayGridMonth-button),
  :deep(.fc-timeGridWeek-button) {
    display: none !important;
  }

  /* Compact buttons on narrow viewports */
  :deep(.fc-button-primary) {
    padding: 14px 18px !important;
    font-size: 0.75rem !important;
    height: 28px !important;
  }

  :deep(.fc-toolbar-title) {
    font-size: 1rem;
    text-align: center;
  }

  .calendar-card {
    padding: 0.75rem 0 0;
  }
}

/* Tooltip Card & Popover Styling */
.tooltip-card {
  padding: 0.1rem;
  font-family: inherit;
}

.tooltip-header {
  display: flex;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--el-border-color-light, #f1f5f9);
  gap: 5px;
}
.header-hotel,
.header-photographer {
  font-size: 1.2rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 5px;
}
.sub-header {
  display: flex;
  align-items: center;
  gap: 5px;
  width: 100%;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

.tooltip-body {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.75rem;
  font-size: 0.85rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 3px 0;
  border-bottom: 1px dashed var(--el-border-color-lighter, #f1f5f9);
}

.info-label {
  color: var(--el-text-color-secondary, #64748b);
  font-weight: 500;
  white-space: nowrap;
}

.info-value {
  color: var(--el-text-color-primary, #0f172a);
  font-weight: 500;
  text-align: right;
  word-break: break-word;
}

.email-text {
  font-size: 0.8rem;
}

.tooltip-footer {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--el-border-color-lighter, #e2e8f0);
}

.double-click-hint {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: var(--el-text-color-placeholder, #94a3b8);
  text-align: center;
}

/* Mobile Dialog Specific Styles */
.dialog-custom-header {
  display: flex;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--el-border-color-light, #f1f5f9);
  gap: 5px;
  padding-bottom: 0.5rem;
  width: 100%;
}

.dialog-footer-actions {
  display: flex;
  width: 100%;
}
</style>
