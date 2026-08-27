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
import iconoCamara from '@/assets/icono_camara.png'
import iconoCita from '@/assets/icono_cita.png'

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
} from '../composables/useCalendarEvents'
import { useCalendarDelete } from '../composables/useCalendarDelete'

import CalendarHeader from './components/CalendarHeader.vue'
import CalendarAlertsPanel from './components/CalendarAlertsPanel.vue'
import CalendarMobileHeader from './components/CalendarMobileHeader.vue'
import CalendarMobileDateNavigator from './components/CalendarMobileDateNavigator.vue'
import CalendarEventCard from './components/CalendarEventCard.vue'
import CalendarDeleteConfirmPopover from './components/CalendarDeleteConfirmPopover.vue'

const router = useRouter()
const hotelStore = useHotelStore()
const userStore = useUserStore()
const profileStore = useProfileStore()
const sessionStore = useSessionStore()
const saleStore = useSaleStore()

// 1. Referencia a FullCalendar
const calendarRef = ref<InstanceType<typeof FullCalendar> | null>(null)
function getCalendarEl(): HTMLElement | null {
  return calendarRef.value?.getApi()?.el || document.querySelector('.calendar-mobile-card')
}

// 2. Composable: Alcance y Filtros de Hotel (RBAC)
const { currentUser, userHotels, selectedHotelIds, selectedHotelName, initSelectedHotel } =
  useCalendarScope()

// 3. Composable: Alertas Pendientes
const { overdueSessions, missingSaleSessions, overdueSales, totalAlertsCount } = useCalendarAlerts(
  userHotels,
  selectedHotelIds,
)

// 4. Composable: Eventos y Mapeo de FullCalendar
const {
  calendarEvents,
  eventsCountByDate,
  clearEventHighlights,
} = useCalendarEvents(userHotels, selectedHotelIds, getCalendarEl)

// 5. Composable: Borrado de Eventos
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
} = useCalendarDelete(selectedHotelIds)

// 6. Estado y Navegación Móvil
const CALENDAR_VIEW_STORAGE_KEY = 'jj_calendar_view_mobile'

function getInitialCalendarView(): string {
  const savedView = localStorage.getItem(CALENDAR_VIEW_STORAGE_KEY)
  const validViews = ['timeGridDay', 'listWeek']
  if (savedView && validViews.includes(savedView)) {
    return savedView
  }
  return 'listWeek'
}

const currentCalendarView = ref<string>(getInitialCalendarView())
const currentCalendarTitle = ref<string>('')
const mobileSelectedDate = ref<string>(dayjs().format('YYYY-MM-DD'))
const showMiniCalendar = ref(false)

const mobilePickerType = computed<'week' | 'date'>(() =>
  currentCalendarView.value === 'listWeek' ? 'week' : 'date',
)

function handleMobileViewChange(val: string | number | boolean | undefined) {
  if (typeof val === 'string') {
    currentCalendarView.value = val
    const calendarApi = calendarRef.value?.getApi()
    if (calendarApi) {
      calendarApi.changeView(val)
      localStorage.setItem(CALENDAR_VIEW_STORAGE_KEY, val)
    }
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

function handleDatesSet(dateInfo: DatesSetArg) {
  clearEventHighlights()
  if (dateInfo.view?.type) {
    currentCalendarView.value = dateInfo.view.type
    localStorage.setItem(CALENDAR_VIEW_STORAGE_KEY, dateInfo.view.type)
  }
  if (dateInfo.view?.title) {
    currentCalendarTitle.value = dateInfo.view.title
  }

  if (dateInfo.view?.currentStart) {
    const viewDateStr = dayjs(dateInfo.view.currentStart).format('YYYY-MM-DD')
    if (mobileSelectedDate.value !== viewDateStr) {
      mobileSelectedDate.value = viewDateStr
    }
  }
}

function handleDateNav(action: 'prev' | 'next' | 'today') {
  const calendarApi = calendarRef.value?.getApi()
  if (!calendarApi) return

  if (action === 'prev') {
    calendarApi.prev()
  } else if (action === 'next') {
    calendarApi.next()
  } else if (action === 'today') {
    calendarApi.today()
    mobileSelectedDate.value = dayjs().format('YYYY-MM-DD')
  }
}

// 7. Permisos de Usuario y Creación de Sesiones/Ventas
const canDeleteEvents = computed(() => {
  const roleCode = currentUser.value?.roleCode?.toUpperCase()
  return roleCode === 'ADMIN' || roleCode === 'SUPERUSUARIO'
})

function navigateToNewSessionForm(startIso?: string) {
  const query: Record<string, string> = {}
  if (selectedHotelIds.value.length === 1 && selectedHotelIds.value[0]) {
    query.hotelId = String(selectedHotelIds.value[0])
  } else if (userHotels.value.length === 1 && userHotels.value[0]) {
    query.hotelId = String(userHotels.value[0].id)
  }
  if (startIso) query.start = startIso

  router.push({ path: '/agenda/nueva', query })
}

function navigateToNewSaleForm() {
  const query: Record<string, string> = {}
  if (selectedHotelIds.value.length === 1 && selectedHotelIds.value[0]) {
    query.hotelId = String(selectedHotelIds.value[0])
  } else if (userHotels.value.length === 1 && userHotels.value[0]) {
    query.hotelId = String(userHotels.value[0].id)
  }
  router.push({ path: '/ventas/nueva', query })
}

// Control del menú flotante Speed Dial (FAB)
const fabMenuOpen = ref(false)

function toggleFabMenu() {
  fabMenuOpen.value = !fabMenuOpen.value
}

function handleNewSessionClick() {
  fabMenuOpen.value = false
  navigateToNewSessionForm()
}

function handleNewSaleClick() {
  fabMenuOpen.value = false
  navigateToNewSaleForm()
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

// 8. Click en Eventos: Redirección directa a edición
function handleEventClick(clickInfo: EventClickArg) {
  const props = clickInfo.event.extendedProps as ExtendedEventProps
  if (!props) return

  if (props.type === 'sale' && props.rawSale?.id) {
    router.push(`/ventas/${props.rawSale.id}/editar`)
    return
  }

  if (props.rawSession?.id) {
    router.push(`/agenda/${props.rawSession.id}/editar`)
  }
}

// 9. Configuración de FullCalendar Móvil
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
  datesSet: handleDatesSet,
  events: calendarEvents.value,
}))

// 10. Ciclo de vida
onMounted(async () => {
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
})
</script>

<template>
  <div class="calendar-mobile-container">
    <!-- 1. Cabecera Móvil: Selector de Hotel, Título y Switch de Mini Calendario -->
    <CalendarHeader
      :hotel-ids="selectedHotelIds"
      :hotels="userHotels"
      :selected-hotel-name="selectedHotelName"
      :is-mobile="true"
      :show-mini-calendar="showMiniCalendar"
      @update:hotel-ids="selectedHotelIds = $event"
      @update:show-mini-calendar="showMiniCalendar = $event"
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

    <!-- Selector de Vista Móvil: Día | Semana (después del Panel de Alertas) -->
    <div class="mobile-view-switch-wrapper">
      <el-radio-group
        :model-value="currentCalendarView"
        size="large"
        class="mobile-view-segmented"
        @change="handleMobileViewChange"
      >
        <el-radio-button value="timeGridDay">Día</el-radio-button>
        <el-radio-button value="listWeek">Semana</el-radio-button>
      </el-radio-group>
    </div>

    <!-- Navegador de Fecha Móvil (Flecha Izquierda + Ficha Calendario + Flecha Derecha) - Oculto si el switch de calendario mensual está activo -->
    <el-collapse-transition>
      <div v-show="!showMiniCalendar">
        <CalendarMobileDateNavigator
          :current-date="mobileSelectedDate"
          :view-mode="currentCalendarView"
          :events-count-by-date="eventsCountByDate"
          @prev="handleDateNav('prev')"
          @next="handleDateNav('next')"
          @today="handleDateNav('today')"
        />
      </div>
    </el-collapse-transition>

    <!-- 3. Contenedor de Calendario Móvil -->
    <div class="calendar-mobile-card">
      <!-- Barra / Selector de Fecha Móvil (Colapsable según switch) -->
      <el-collapse-transition>
        <div v-show="showMiniCalendar">
          <CalendarMobileHeader
            v-model:date="mobileSelectedDate"
            :picker-type="mobilePickerType"
            :events-count-by-date="eventsCountByDate"
          />
        </div>
      </el-collapse-transition>

      <!-- Componente FullCalendar Móvil -->
      <FullCalendar ref="calendarRef" :options="calendarOptions" :events="calendarEvents">
        <template #eventContent="arg">
          <CalendarEventCard
            :arg="arg"
            :can-delete="canDeleteEvents"
            @delete="openDeleteConfirm(arg.event, $event)"
          />
        </template>
      </FullCalendar>

      <!-- 4. Popover de Confirmación de Borrado -->
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

    <!-- 5. Speed Dial FAB para Móvil (+ Agendar) -->
    <div class="speed-dial-container" :class="{ 'is-open': fabMenuOpen }">
      <!-- Backdrop al desplegar -->
      <transition name="fade">
        <div
          v-if="fabMenuOpen"
          class="speed-dial-backdrop"
          @click="fabMenuOpen = false"
        />
      </transition>

      <!-- Opciones Speed Dial (Nueva Sesión & Nueva Cita) -->
      <div class="speed-dial-actions">
        <!-- Opción 1: Nueva Sesión Fotográfica -->
        <div class="speed-dial-item item-session" @click="handleNewSessionClick">
          <span class="speed-dial-label">Nueva Sesión</span>
          <button
            type="button"
            class="speed-dial-btn btn-session"
            aria-label="Nueva Sesión Fotográfica"
          >
            <img :src="iconoCamara" alt="Cámara" class="speed-dial-icon icon-camara" />
          </button>
        </div>

        <!-- Opción 2: Nueva Cita de Venta -->
        <div class="speed-dial-item item-sale" @click="handleNewSaleClick">
          <span class="speed-dial-label">Nueva Cita de Venta</span>
          <button
            type="button"
            class="speed-dial-btn btn-sale"
            aria-label="Nueva Cita de Venta"
          >
            <img :src="iconoCita" alt="Cita de Venta" class="speed-dial-icon icon-cita" />
          </button>
        </div>
      </div>

      <!-- Botón Principal Disparador (+) -->
      <button
        type="button"
        class="speed-dial-trigger"
        :class="{ 'is-active': fabMenuOpen }"
        aria-label="Abrir opciones de creación"
        @click="toggleFabMenu"
      >
        <el-icon :size="24" class="trigger-icon"><Plus /></el-icon>
      </button>
    </div>
  </div>
</template>

<style scoped>
.calendar-mobile-container {
  padding: 1rem;
  max-width: 100%;
  margin: 0 auto;
  position: relative;
  box-sizing: border-box;
}

/* ── Selector de Vista Segmentado Móvil (Día | Semana) ── */
.mobile-view-switch-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 0.85rem;
}

.mobile-view-segmented {
  width: 100%;
  display: flex;
  height: 48px;
}

.mobile-view-segmented :deep(.el-radio-button) {
  flex: 1;
  height: 48px;
  display: flex;
}

.mobile-view-segmented :deep(.el-radio-button__inner) {
  width: 100%;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.95rem;
  padding: 0 16px;
  border-radius: 8px;
}

.mobile-view-segmented :deep(.el-radio-button:first-child .el-radio-button__inner) {
  border-radius: 8px 0 0 8px;
}

.mobile-view-segmented :deep(.el-radio-button:last-child .el-radio-button__inner) {
  border-radius: 0 8px 8px 0;
}

.calendar-mobile-card {
  padding: 0;
  overflow: visible;
  background: transparent;
  border: none;
  box-shadow: none;
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

/* ── Celdas / Huecos para FullCalendar Móvil ── */
:deep(.fc-timegrid-slot),
:deep(.fc-timegrid-slot-lane) {
  height: 54px !important;
}

:deep(.fc-timegrid-slot-label) {
  font-size: 0.8rem;
  font-weight: 500;
}

:deep(.fc-daygrid-day-frame) {
  min-height: 90px !important;
}

:deep(.fc-daygrid-day-top) {
  font-size: 0.85rem;
  font-weight: 600;
  padding: 2px 4px;
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
    opacity 0.2s ease !important;
  overflow: visible !important;
}

:deep(.fc-timegrid-event) {
  border-radius: 8px !important;
  margin: 1px 2px !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15) !important;
  color: #ffffff !important;
  min-height: 96px !important;
}

:deep(.fc-daygrid-event) {
  margin: 2px 3px !important;
  padding: 4px 6px !important;
  border-radius: 8px !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15) !important;
  color: #ffffff !important;
}

:deep(.fc-daygrid-event .jj-event-card-content),
:deep(.fc-timegrid-event .jj-event-card-content) {
  color: #ffffff !important;
}

/* ── Vista Agenda / Lista Móvil ── */
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

/* ── Speed Dial FAB Móvil ── */
.speed-dial-container {
  position: fixed;
  bottom: 2rem;
  right: 1.5rem;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.speed-dial-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.32);
  backdrop-filter: blur(2px);
  z-index: 998;
}

.speed-dial-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.85rem;
  margin-bottom: 0.85rem;
  position: relative;
  z-index: 1000;
  pointer-events: none;
}

.speed-dial-container.is-open .speed-dial-actions {
  pointer-events: auto;
}

.speed-dial-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  cursor: pointer;
  opacity: 0;
  transform: translateY(16px) scale(0.85);
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  user-select: none;
}

.speed-dial-container.is-open .speed-dial-item {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.speed-dial-container.is-open .item-sale {
  transition-delay: 0.03s;
}

.speed-dial-container.is-open .item-session {
  transition-delay: 0.07s;
}

.speed-dial-label {
  background: rgba(15, 23, 42, 0.88);
  color: #ffffff;
  font-size: 0.82rem;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  white-space: nowrap;
  letter-spacing: 0.2px;
  pointer-events: auto;
}

.speed-dial-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.9);
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.18);
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  padding: 0;
  outline: none;
}

.speed-dial-btn:active {
  transform: scale(0.92);
}

.btn-session,
.btn-sale {
  background: #ffffff;
  border-color: #334155;
}

.speed-dial-icon {
  object-fit: contain;
  pointer-events: none;
}

.icon-camara {
  width: 28px;
  height: 28px;
}

.icon-cita {
  width: 26px;
  height: 26px;
}

.speed-dial-trigger {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: var(--el-color-primary, #3b82f6);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.45);
  cursor: pointer;
  position: relative;
  z-index: 1000;
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease, box-shadow 0.2s ease;
  outline: none;
}

.speed-dial-trigger:active {
  transform: scale(0.94);
}

.speed-dial-trigger .trigger-icon {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.speed-dial-trigger.is-active {
  background: #475569;
  box-shadow: 0 6px 20px rgba(71, 85, 105, 0.4);
}

.speed-dial-trigger.is-active .trigger-icon {
  transform: rotate(45deg);
}

/* Transición suave para el backdrop */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
