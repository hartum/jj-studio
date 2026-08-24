<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'

import type { DatesSetArg, EventClickArg, CalendarOptions } from '@fullcalendar/core'

import { useHotelStore } from '@/features/hotels/stores/hotel.store'
import { useUserStore } from '@/features/users/stores/user.store'
import { useProfileStore } from '@/features/users/stores/profile.store'
import { useSessionStore } from '../stores/session.store'
import { useSaleStore } from '@/features/sales/stores/sale.store'

import { useCalendarScope } from '../composables/useCalendarScope'
import { useCalendarAlerts } from '../composables/useCalendarAlerts'
import {
  useCalendarEvents,
  type ExtendedEventProps,
  type EventTooltipInfo,
} from '../composables/useCalendarEvents'
import { useCalendarDelete } from '../composables/useCalendarDelete'

import CalendarHeader from './components/CalendarHeader.vue'
import CalendarAlertsPanel from './components/CalendarAlertsPanel.vue'
import CalendarDesktopToolbar from './components/CalendarDesktopToolbar.vue'
import CalendarMobileHeader from './components/CalendarMobileHeader.vue'
import CalendarEventCard from './components/CalendarEventCard.vue'
import CalendarEventDetailsPopover from './components/CalendarEventDetailsPopover.vue'
import CalendarEventDetailsDialog from './components/CalendarEventDetailsDialog.vue'
import CalendarDeleteConfirmPopover from './components/CalendarDeleteConfirmPopover.vue'

const router = useRouter()
const hotelStore = useHotelStore()
const userStore = useUserStore()
const profileStore = useProfileStore()
const sessionStore = useSessionStore()
const saleStore = useSaleStore()

// 1. Detección y estado de pantalla (Mobile / Desktop)
const isMobile = ref(typeof window !== 'undefined' ? window.innerWidth <= 768 : false)
const mobileDialogVisible = ref(false)
const mobileSelectedDate = ref<string>(dayjs().format('YYYY-MM-DD'))

function checkMobile() {
  isMobile.value = window.innerWidth <= 768
}

// 2. Referencia a FullCalendar
const calendarRef = ref<InstanceType<typeof FullCalendar> | null>(null)
function getCalendarEl(): HTMLElement | null {
  return calendarRef.value?.getApi()?.el || document.querySelector('.calendar-card')
}

// 3. Composable: Alcance y Filtros de Hotel (RBAC)
const { currentUser, userHotels, selectedHotelId, selectedHotelName, initSelectedHotel } =
  useCalendarScope()

// 4. Composable: Alertas Pendientes
const { overdueSessions, missingSaleSessions, overdueSales, totalAlertsCount } = useCalendarAlerts(
  userHotels,
  selectedHotelId,
)

// 5. Composable: Eventos y Mapeo de FullCalendar
const {
  calendarEvents,
  eventsCountByDate,
  highlightEventAndAssociated,
  clearEventHighlights,
  buildTooltipInfo,
} = useCalendarEvents(userHotels, selectedHotelId, getCalendarEl)

// 6. Composable: Borrado de Eventos
const {
  deletePopoverVisible,
  deletePopoverTarget,
  pendingDeleteEvent,
  deleteAssociated,
  isDeleting,
  hasAssociatedEvent,
  associatedCheckboxLabel,
  openDeleteConfirm,
  confirmDelete,
} = useCalendarDelete(selectedHotelId, () => {
  tooltipVisible.value = false
  mobileDialogVisible.value = false
})

// 7. Vistas del Calendario y Título
const CALENDAR_VIEW_STORAGE_KEY = 'jj_calendar_view'

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
const currentCalendarTitle = ref<string>('')
const currentVisibleStart = ref<Date | null>(null)
const currentVisibleEnd = ref<Date | null>(null)

const mobilePickerType = computed<'week' | 'date'>(() =>
  currentCalendarView.value === 'listWeek' ? 'week' : 'date',
)

const currentPeriodStats = computed(() => {
  if (!currentVisibleStart.value || !currentVisibleEnd.value) {
    const sessionsCount = calendarEvents.value.filter(
      (e) => e.extendedProps?.type === 'session',
    ).length
    const salesCount = calendarEvents.value.filter((e) => e.extendedProps?.type === 'sale').length
    return {
      total: calendarEvents.value.length,
      sessions: sessionsCount,
      sales: salesCount,
    }
  }

  const startMs = currentVisibleStart.value.getTime()
  const endMs = currentVisibleEnd.value.getTime()

  let sessions = 0
  let sales = 0

  for (const evt of calendarEvents.value) {
    if (!evt.start) continue
    const evtTime = new Date(evt.start).getTime()
    if (evtTime >= startMs && evtTime < endMs) {
      if (evt.extendedProps?.type === 'sale') {
        sales++
      } else {
        sessions++
      }
    }
  }

  return {
    total: sessions + sales,
    sessions,
    sales,
  }
})

// 8. Handlers de Navegación del Calendario
function handleCalendarNav(action: 'prev' | 'next' | 'today') {
  const calendarApi = calendarRef.value?.getApi()
  if (!calendarApi) return
  if (action === 'prev') calendarApi.prev()
  else if (action === 'next') calendarApi.next()
  else if (action === 'today') calendarApi.today()
}

function handleViewChange(viewName: string) {
  currentCalendarView.value = viewName
  const calendarApi = calendarRef.value?.getApi()
  if (calendarApi) {
    calendarApi.changeView(viewName)
  }
}

function handleMobileViewChange(val: string | number | boolean | undefined) {
  if (typeof val === 'string') {
    handleViewChange(val)
  }
}

watch(mobileSelectedDate, (newDateStr) => {
  if (newDateStr) {
    const calendarApi = calendarRef.value?.getApi()
    if (calendarApi) {
      calendarApi.gotoDate(newDateStr)
    }
  }
})

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

function handleDatesSet(dateInfo: DatesSetArg) {
  clearEventHighlights()
  if (dateInfo.view?.type) {
    currentCalendarView.value = dateInfo.view.type
    localStorage.setItem(CALENDAR_VIEW_STORAGE_KEY, dateInfo.view.type)
  }
  if (dateInfo.view?.title) {
    currentCalendarTitle.value = dateInfo.view.title
  }
  currentVisibleStart.value = dateInfo.view.currentStart || dateInfo.start
  currentVisibleEnd.value = dateInfo.view.currentEnd || dateInfo.end

  if (dateInfo.view?.currentStart && isMobile.value) {
    const viewDateStr = dayjs(dateInfo.view.currentStart).format('YYYY-MM-DD')
    if (mobileSelectedDate.value !== viewDateStr) {
      mobileSelectedDate.value = viewDateStr
    }
  }
}

// 9. Permisos de Usuario y Creación de Sesiones/Ventas
const canDeleteEvents = computed(() => {
  const roleCode = currentUser.value?.roleCode?.toUpperCase()
  return roleCode === 'ADMIN' || roleCode === 'SUPERUSUARIO'
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

// 10. Popover & Dialog de Detalles de Eventos
const tooltipVisible = ref(false)
const tooltipTarget = ref<HTMLElement | null>(null)
const activeTooltipInfo = ref<EventTooltipInfo | null>(null)
let clickTimer: ReturnType<typeof setTimeout> | null = null

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
    activeTooltipInfo.value = buildTooltipInfo(clickInfo.event.extendedProps)
    mobileDialogVisible.value = true
    return
  }

  if (clickTimer) {
    clearTimeout(clickTimer)
    clickTimer = null
    tooltipVisible.value = false
    triggerEditEvent(clickInfo.event.extendedProps)
  } else {
    clickTimer = setTimeout(() => {
      clickTimer = null
      activeTooltipInfo.value = buildTooltipInfo(clickInfo.event.extendedProps)
      tooltipTarget.value = clickInfo.el
      tooltipVisible.value = true
    }, 250)
  }
}

// 11. Configuración de FullCalendar
const esLocale = {
  code: 'es',
  week: { dow: 1, doy: 4 },
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

const calendarOptions = computed<CalendarOptions>(() => ({
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
  initialView: getInitialCalendarView(),
  locale: esLocale,
  headerToolbar: false,
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

// 12. Ciclo de vida
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
</script>

<template>
  <div class="calendar-container">
    <!-- 1. Cabecera principal: Título, selector de hotel y botones de acción -->
    <CalendarHeader
      :hotel-id="selectedHotelId"
      :hotels="userHotels"
      :selected-hotel-name="selectedHotelName"
      :is-mobile="isMobile"
      @update:hotel-id="selectedHotelId = $event"
      @new-session="navigateToNewSessionForm()"
      @new-sale="navigateToNewSaleForm()"
    />

    <!-- 2. Panel de Alertas Colapsable -->
    <CalendarAlertsPanel
      v-if="totalAlertsCount > 0"
      :overdue-sessions="overdueSessions"
      :missing-sale-sessions="missingSaleSessions"
      :overdue-sales="overdueSales"
    />

    <!-- 3. Calendario Principal -->
    <div class="calendar-card">
      <!-- Toolbar Desktop -->
      <CalendarDesktopToolbar
        v-if="!isMobile"
        :title="currentCalendarTitle"
        :stats="currentPeriodStats"
        :current-view="currentCalendarView"
        @nav="handleCalendarNav"
        @change-view="handleViewChange"
      />

      <!-- Toolbar / Selector Móvil -->
      <CalendarMobileHeader
        v-if="isMobile"
        v-model:date="mobileSelectedDate"
        v-model:view="currentCalendarView"
        :picker-type="mobilePickerType"
        :events-count-by-date="eventsCountByDate"
        @change-view="handleMobileViewChange"
      />

      <!-- Componente FullCalendar -->
      <FullCalendar ref="calendarRef" :options="calendarOptions" :events="calendarEvents">
        <template #eventContent="arg">
          <CalendarEventCard
            :arg="arg"
            :can-delete="canDeleteEvents"
            @delete="openDeleteConfirm(arg.event, $event)"
          />
        </template>
      </FullCalendar>

      <!-- 4. Popover de Detalle en Desktop -->
      <CalendarEventDetailsPopover
        v-if="!isMobile"
        v-model:visible="tooltipVisible"
        :target="tooltipTarget"
        :info="activeTooltipInfo"
        :can-delete="canDeleteEvents"
        @edit="triggerEditEvent"
        @delete="openDeleteConfirm"
      />

      <!-- 5. Diálogo Modal de Detalle en Móvil -->
      <CalendarEventDetailsDialog
        v-if="isMobile"
        v-model:visible="mobileDialogVisible"
        :info="activeTooltipInfo"
        :can-delete="canDeleteEvents"
        @edit="triggerEditEvent"
        @delete="openDeleteConfirm"
      />

      <!-- 6. Popover de Confirmación de Borrado con Checkbox Dinámico -->
      <CalendarDeleteConfirmPopover
        v-model:visible="deletePopoverVisible"
        v-model:delete-associated="deleteAssociated"
        :target="deletePopoverTarget"
        :event="pendingDeleteEvent"
        :is-deleting="isDeleting"
        :has-associated="hasAssociatedEvent(pendingDeleteEvent)"
        :associated-label="associatedCheckboxLabel"
        @confirm="confirmDelete"
      />
    </div>

    <!-- 7. Botón Flotante para Móvil (+ Agendar) -->
    <el-button
      v-if="isMobile"
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

:deep(.fc-col-header-cell),
:deep(.fc-col-header-cell-cushion) {
  font-weight: 400 !important;
  text-transform: capitalize;
  color: var(--el-input-text-color, var(--el-text-color-regular));
}

/* ── Celdas / Huecos para FullCalendar ── */
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

/* ── Vista Agenda / Lista ── */
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

  .fab-btn {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
