<script setup lang="ts">
import { computed } from 'vue'
import type { PhotoSessionFormContext } from '../composables/usePhotoSessionForm'
import { User, Message, Phone, Check, ArrowLeft, Close, Edit } from '@element-plus/icons-vue'
import {
  Building2,
  PlaneTakeoff,
  Users,
  Baby,
  Camera,
  Calendar,
  Balloon,
  Sparkles,
  Gem,
} from '@lucide/vue'

const props = defineProps<{
  form: PhotoSessionFormContext
}>()

const {
  timeSlots,
  formData,
  isEditing,
  loadedSession,
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
  isReadOnly,
  alertNoSaleAppointment,
  alertSaleNoShow,
  isSaving,
  disponibilidadHotel,
  isTopeAlcanzado,
  userHotels,
  photographers,
  selectedPhotographer,
  selectedPhotographerName,
  getPhotographerStatus,
  ausenciaFotografoActual,
  isFotografoAusente,
  selectedHotelDisplayName,
  summaryFormattedDate,
  appointmentSummaryCardStyle,
  summaryPersonas,
  summaryClienteNombre,
  summaryMotivo,
  handlePanelChange,
  hasAusenciasInVisibleMonth,
  getFotografoCellClassName,
  getCitaVentaCellClassName,
  disabledPastDates,
  handleGoBack,
  handleSaveSession,
  router,
  getUserInitials,
  getUserBgColor,
  sessionStore,
  saleStore,
} = props.form

// Mapa de cantidad de sesiones por hora para el día seleccionado
const sessionsCountByHour = computed<Record<string, number>>(() => {
  const counts: Record<string, number> = {}
  const targetDate = selectedDateOnly.value
  if (!targetDate) return counts

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

    const sDate = s.fechaHoraInicio.slice(0, 10)
    if (sDate !== targetDate) continue

    const timePart = s.fechaHoraInicio.includes('T')
      ? s.fechaHoraInicio.split('T')[1]
      : s.fechaHoraInicio.split(' ')[1]
    if (timePart) {
      const hourKey = `${timePart.substring(0, 2)}:00`
      counts[hourKey] = (counts[hourKey] || 0) + 1
    }
  }

  return counts
})

const minuteSlots = ['00', '10', '20', '30', '40', '50']

const selectedHourOnly = computed(() => {
  if (!selectedTimeOnly.value) return ''
  return selectedTimeOnly.value.split(':')[0] || ''
})

const selectedMinuteOnly = computed(() => {
  if (!selectedTimeOnly.value) return '00'
  return selectedTimeOnly.value.split(':')[1] || '00'
})

function selectHour(timeOrHour: string) {
  const hour = timeOrHour.includes(':') ? timeOrHour.split(':')[0] : timeOrHour
  const min = selectedMinuteOnly.value || '00'
  selectTimeSlot(`${hour}:${min}`)
}

function selectMinute(min: string) {
  const hour = selectedHourOnly.value || '10'
  selectTimeSlot(`${hour}:${min}`)
}

const selectedCitaVentaHourOnly = computed(() => {
  if (!selectedCitaVentaTimeOnly.value) return ''
  return selectedCitaVentaTimeOnly.value.split(':')[0] || ''
})

const selectedCitaVentaMinuteOnly = computed(() => {
  if (!selectedCitaVentaTimeOnly.value) return '00'
  return selectedCitaVentaTimeOnly.value.split(':')[1] || '00'
})

function selectCitaVentaHour(timeOrHour: string) {
  const hour = timeOrHour.includes(':') ? timeOrHour.split(':')[0] : timeOrHour
  const min = selectedCitaVentaMinuteOnly.value || '00'
  selectCitaVentaTimeSlot(`${hour}:${min}`)
}

function selectCitaVentaMinute(min: string) {
  const hour = selectedCitaVentaHourOnly.value || '10'
  selectCitaVentaTimeSlot(`${hour}:${min}`)
}

const motivoOptions = [
  { label: 'Cumpleaños', value: 'Cumpleaños', icon: Balloon },
  { label: 'Foto familiar', value: 'Foto familiar', icon: Users },
  { label: 'Pedida matrimonio', value: 'Pedida de matrimonio', icon: Gem },
  { label: 'Revelación género', value: 'Revelación de género', icon: Baby },
  { label: 'Otro', value: 'Otro', icon: Sparkles },
]

if (!formData.value.concepto) {
  formData.value.concepto = 'Otro'
}

function isMotivoActive(val: string): boolean {
  return formData.value.concepto === val
}

function handleSelectMotivo(val: string) {
  if (formData.value.concepto === val) {
    formData.value.concepto = ''
  } else {
    formData.value.concepto = val
  }
}

function getTimeSlotStatusClass(time: string): string {
  const count = sessionsCountByHour.value[time] || 0
  if (count === 0) return 'time-slot-btn--empty'

  const totalCap = photographers.value.length || 1
  if (count >= totalCap) {
    return 'time-slot-btn--full'
  }
  return 'time-slot-btn--partial'
}

// Mapa de cantidad de citas de venta por hora para la fecha de venta seleccionada
const salesCountByHour = computed<Record<string, number>>(() => {
  const counts: Record<string, number> = {}
  const targetDate = selectedCitaVentaDateOnly.value
  if (!targetDate) return counts

  const currentHotelId = formData.value.hotelId ? Number(formData.value.hotelId) : null
  const allowedHotelIds = new Set(userHotels.value.map((h) => Number(h.id)))
  const currentCitaId = loadedSession.value?.citaVenta?.id

  for (const c of saleStore.citasVenta) {
    if (c.estado === 'CANCELADA') continue
    if (currentCitaId && c.id === currentCitaId) continue
    if (currentHotelId) {
      if (Number(c.hotelId) !== currentHotelId) continue
    } else if (allowedHotelIds.size > 0 && !allowedHotelIds.has(Number(c.hotelId))) {
      continue
    }
    if (!c.fechaHoraCita) continue

    const cDate = c.fechaHoraCita.slice(0, 10)
    if (cDate !== targetDate) continue

    const timePart = c.fechaHoraCita.includes('T')
      ? c.fechaHoraCita.split('T')[1]
      : c.fechaHoraCita.split(' ')[1]
    if (timePart) {
      const hourKey = `${timePart.substring(0, 2)}:00`
      counts[hourKey] = (counts[hourKey] || 0) + 1
    }
  }

  return counts
})

function getCitaVentaTimeSlotStatusClass(time: string): string {
  // 1. Si la hora tiene una venta directa -> ROJO
  if (salesCountByHour.value[time] && salesCountByHour.value[time] > 0) {
    return 'time-slot-btn--full'
  }

  // 2. Si la hora anterior o posterior tiene una venta -> AMARILLO (margen de conflicto ±1h)
  const hourNum = parseInt(time.split(':')[0] ?? '0', 10)
  const prevHourKey = `${String(hourNum - 1).padStart(2, '0')}:00`
  const nextHourKey = `${String(hourNum + 1).padStart(2, '0')}:00`

  if (
    (salesCountByHour.value[prevHourKey] && salesCountByHour.value[prevHourKey] > 0) ||
    (salesCountByHour.value[nextHourKey] && salesCountByHour.value[nextHourKey] > 0)
  ) {
    return 'time-slot-btn--partial'
  }

  // 3. El resto -> color neutro por defecto
  return 'time-slot-btn--empty'
}
</script>

<template>
  <div class="session-form-container">
    <!-- Header con botón redondo Volver y Título -->
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
                        <div class="desktop-picker-panel-wrapper inline-calendar-picker">
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
                          <el-badge
                            v-for="time in timeSlots"
                            :key="time"
                            :value="sessionsCountByHour[time]"
                            :hidden="!sessionsCountByHour[time]"
                            class="time-slot-badge-wrapper"
                          >
                            <button
                              type="button"
                              class="time-slot-btn"
                              :class="[
                                getTimeSlotStatusClass(time),
                                { active: selectedHourOnly === time.split(':')[0] },
                              ]"
                              @click="selectHour(time)"
                            >
                              {{ time }}
                            </button>
                          </el-badge>
                        </div>

                        <!-- Divisor punteado para selección de minutos -->
                        <div class="minute-slots-divider">
                          <el-divider border-style="dotted" />
                        </div>

                        <!-- Grid de slots de minutos (00 - 50) -->
                        <div class="minute-slots-grid">
                          <button
                            v-for="min in minuteSlots"
                            :key="`sesion-desktop-min-${min}`"
                            type="button"
                            class="time-slot-btn minute-slot-btn"
                            :class="{ active: selectedMinuteOnly === min && !!selectedHourOnly }"
                            @click="selectMinute(min)"
                          >
                            {{ min }}
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
                        <div class="desktop-picker-panel-wrapper inline-calendar-picker">
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
                          <el-badge
                            v-for="time in timeSlots"
                            :key="`cita-${time}`"
                            :value="salesCountByHour[time]"
                            :hidden="!salesCountByHour[time]"
                            class="time-slot-badge-wrapper"
                          >
                            <button
                              type="button"
                              class="time-slot-btn"
                              :class="[
                                getCitaVentaTimeSlotStatusClass(time),
                                { active: selectedCitaVentaHourOnly === time.split(':')[0] },
                              ]"
                              @click="selectCitaVentaHour(time)"
                            >
                              {{ time }}
                            </button>
                          </el-badge>
                        </div>

                        <!-- Divisor punteado para selección de minutos de venta -->
                        <div class="minute-slots-divider">
                          <el-divider border-style="dotted" />
                        </div>

                        <!-- Grid de slots de minutos (00 - 50) -->
                        <div class="minute-slots-grid">
                          <button
                            v-for="min in minuteSlots"
                            :key="`cita-sesion-desktop-min-${min}`"
                            type="button"
                            class="time-slot-btn minute-slot-btn"
                            :class="{ active: selectedCitaVentaMinuteOnly === min && !!selectedCitaVentaHourOnly }"
                            @click="selectCitaVentaMinute(min)"
                          >
                            {{ min }}
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
                        <div class="desktop-picker-panel-wrapper inline-calendar-picker">
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
              <div class="motivo-section">
                <label class="form-field-label">Concepto / Motivo de la Sesión</label>
                <div class="motivo-grid">
                  <button
                    v-for="opt in motivoOptions"
                    :key="opt.value"
                    type="button"
                    class="motivo-grid-btn"
                    :class="{ 'is-active': isMotivoActive(opt.value) }"
                    :disabled="isReadOnly"
                    @click="handleSelectMotivo(opt.value)"
                  >
                    <el-icon class="motivo-grid-icon">
                      <component :is="opt.icon" :size="18" :stroke-width="2" />
                    </el-icon>
                    <span>{{ opt.label }}</span>
                  </button>
                </div>
              </div>

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
              size="large"
              :icon="Check"
              :loading="isSaving"
              :disabled="isReadOnly || isTopeAlcanzado || isFotografoAusente"
              @click="handleSaveSession"
            >
              {{ isEditing ? 'Guardar Cambios' : 'Agendar Sesión' }}
            </el-button>
            <el-button size="large" :icon="Close" @click="handleGoBack">Cancelar</el-button>
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
  grid-template-columns: repeat(6, 1fr);
  gap: 0.65rem 0.45rem;
  padding-top: 0.35rem;
}

.minute-slots-divider {
  margin: 0.25rem 0 0.15rem 0;
}

.minute-slots-divider :deep(.el-divider) {
  margin: 0.35rem 0;
  border-top-color: var(--toolbar-border, #e2e8f0);
}

.minute-slots-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.65rem 0.45rem;
}

.minute-slot-btn {
  font-weight: 600;
}

.time-slot-badge-wrapper {
  width: 100%;
  display: block;
}

.time-slot-badge-wrapper :deep(.el-badge__content) {
  background-color: #475569;
  color: #ffffff;
  border: 1.5px solid var(--toolbar-bg, #ffffff);
  font-weight: 700;
  font-size: 0.65rem;
}

.time-slot-btn {
  width: 100%;
  box-sizing: border-box;
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

.time-slot-btn--partial {
  background-color: #fef9c3 !important;
  border-color: #fde047 !important;
  color: #854d0e !important;
}

.time-slot-btn--partial:hover {
  background-color: #fef08a !important;
  border-color: #eab308 !important;
  color: #713f12 !important;
}

.time-slot-btn--full {
  background-color: #fee2e2 !important;
  border-color: #fca5a5 !important;
  color: #991b1b !important;
}

.time-slot-btn--full:hover {
  background-color: #fecaca !important;
  border-color: #ef4444 !important;
  color: #7f1d1d !important;
}

.time-slot-btn:hover {
  border-color: var(--el-color-primary, #3b82f6);
  background: rgba(59, 130, 246, 0.08);
  color: var(--el-color-primary, #3b82f6);
}

.time-slot-btn.active {
  background-color: var(--el-color-primary, #3b82f6) !important;
  border-color: var(--el-color-primary, #3b82f6) !important;
  color: #ffffff !important;
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
html.dark .time-slot-badge-wrapper :deep(.el-badge__content) {
  background-color: #475569;
  border-color: var(--toolbar-bg, #1d1e1f);
}

html.dark .time-slot-btn {
  background: var(--toolbar-bg, #1d1e1f);
  border-color: var(--toolbar-border, #363637);
  color: var(--heading-color, #ffffff);
}

html.dark .time-slot-btn--partial {
  background-color: rgba(234, 179, 8, 0.18) !important;
  border-color: rgba(234, 179, 8, 0.45) !important;
  color: #fef08a !important;
}

html.dark .time-slot-btn--partial:hover {
  background-color: rgba(234, 179, 8, 0.28) !important;
  border-color: #eab308 !important;
}

html.dark .time-slot-btn--full {
  background-color: rgba(239, 68, 68, 0.18) !important;
  border-color: rgba(239, 68, 68, 0.45) !important;
  color: #fca5a5 !important;
}

html.dark .time-slot-btn--full:hover {
  background-color: rgba(239, 68, 68, 0.28) !important;
  border-color: #ef4444 !important;
}

html.dark .time-slot-btn.active {
  background-color: var(--el-color-primary, #3b82f6) !important;
  border-color: var(--el-color-primary, #3b82f6) !important;
  color: #ffffff !important;
}

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

.photographers-card-list {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.calendar-label-btn {
  padding: 0 !important;
  font-weight: 600 !important;
  font-size: inherit !important;
  height: auto !important;
}

.conflict-alert-box {
  margin-top: 0.5rem;
}

.motivo-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}

.form-field-label {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--heading-color, #0f172a);
}

.motivo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 0.65rem;
}

.motivo-grid-btn {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.55rem;
  padding: 0.65rem 0.85rem;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid var(--toolbar-border, #e2e8f0);
  background: var(--toolbar-bg, #ffffff);
  color: var(--nav-link-color, #475569);
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
  box-sizing: border-box;
  text-align: left;
}

.motivo-grid-btn:hover:not(:disabled):not(.is-active) {
  border-color: var(--el-color-primary-light-5, #93c5fd);
  color: var(--el-color-primary, #3b82f6);
  background: var(--el-color-primary-light-9, #eff6ff);
}

.motivo-grid-btn.is-active {
  background-color: var(--el-color-primary, #3b82f6) !important;
  border-color: var(--el-color-primary, #3b82f6) !important;
  color: #ffffff !important;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.28);
}

.motivo-grid-icon {
  font-size: 1.15rem;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

html.dark .motivo-grid-btn {
  background-color: var(--content-bg, #121212);
  border-color: var(--toolbar-border, #363637);
  color: var(--nav-link-color, #94a3b8);
}

html.dark .motivo-grid-btn:hover:not(:disabled):not(.is-active) {
  background-color: rgba(59, 130, 246, 0.15);
  border-color: var(--el-color-primary, #3b82f6);
  color: #ffffff;
}

html.dark .motivo-grid-btn.is-active {
  background-color: var(--el-color-primary, #3b82f6) !important;
  border-color: var(--el-color-primary, #3b82f6) !important;
  color: #ffffff !important;
}
</style>
