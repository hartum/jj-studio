<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import type { PhotoSessionFormContext } from '../composables/usePhotoSessionForm'
import type { EstadoSesion } from '../domain/session.model'
import { ArrowLeft, Close, Message, Phone, Check } from '@element-plus/icons-vue'
import {
  User,
  Camera,
  Calendar,
  PlaneTakeoff,
  ArrowRight,
  ArrowLeft as LucideArrowLeft,
  Building2,
  Users,
  Baby,
  SquarePen,
  Balloon,
  Sparkles,
  MoreHorizontal,
} from '@lucide/vue'

const props = defineProps<{
  form: PhotoSessionFormContext
}>()

const {
  formData,
  userHotels,
  sessionId,
  isEditing,
  isSaving,
  isReadOnly,
  selectedDateOnly,
  selectedTimeOnly,
  disabledPastDates,
  getFotografoCellClassName,
  handlePanelChange,
  hasAusenciasInVisibleMonth,
  selectedPhotographer,
  selectedPhotographerName,
  isFotografoAusente,
  ausenciaFotografoActual,
  disponibilidadHotel,
  isTopeAlcanzado,
  timeSlots,
  selectTimeSlot,
  photographers,
  getPhotographerStatus,
  selectPhotographerCard,
  getUserInitials,
  getUserBgColor,
  handleGoBack,
  handleSaveSession,
  sessionStore,
  saleStore,
  activeScheduleAccordion,
  sessionStateTagType,
  fechaHoraCitaVenta,
  loadedSession,
  selectedCitaVentaDateOnly,
  selectedCitaVentaTimeOnly,
  selectCitaVentaTimeSlot,
  getCitaVentaCellClassName,
  conflictsCitaVenta,
  summaryFormattedDate,
  selectedHotelDisplayName,
  summaryPersonas,
  appointmentSummaryCardStyle,
  estadoSesionOptions,
} = props.form

// Formato compacto para las etiquetas de la cabecera en móvil (evita que el texto se corte)
const mobileSessionPreview = computed(() => {
  if (!formData.value.fechaHoraInicio) return 'Sin fecha'
  try {
    const parts = formData.value.fechaHoraInicio.split('T')
    const datePart = parts[0]
    const timePart = parts[1]
    if (!datePart) return 'Sin fecha'
    const [y, m, d] = datePart.split('-').map(Number)
    if (!y || !m || !d) return formData.value.fechaHoraInicio
    const dateObj = new Date(y, m - 1, d)
    const monthShort = dateObj.toLocaleDateString('es-ES', { month: 'short' })
    const time = timePart ? timePart.substring(0, 5) : ''
    return time ? `${d} ${monthShort} ${y}, ${time}` : `${d} ${monthShort} ${y}`
  } catch {
    return formData.value.fechaHoraInicio
  }
})

const mobileCitaVentaPreview = computed(() => {
  const cita = fechaHoraCitaVenta?.value || loadedSession?.value?.citaVenta?.fechaHoraCita
  if (!cita) return 'Sin cita'
  try {
    const parts = cita.split('T')
    const datePart = parts[0]
    const timePart = parts[1]
    if (!datePart) return 'Sin cita'
    const [y, m, d] = datePart.split('-').map(Number)
    if (!y || !m || !d) return cita
    const dateObj = new Date(y, m - 1, d)
    const monthShort = dateObj.toLocaleDateString('es-ES', { month: 'short' })
    const time = timePart ? timePart.substring(0, 5) : ''
    return time ? `${d} ${monthShort} ${y}, ${time}` : `${d} ${monthShort} ${y}`
  } catch {
    return cita
  }
})

const mobileCheckoutPreview = computed(() => {
  const salida = formData.value.fechaSalida
  if (!salida) return 'Sin checkout'
  try {
    const [y, m, d] = salida.split('-').map(Number)
    if (!y || !m || !d) return salida
    const dateObj = new Date(y, m - 1, d)
    const monthShort = dateObj.toLocaleDateString('es-ES', { month: 'short' })
    return `${d} ${monthShort} ${y}`
  } catch {
    return salida
  }
})

const showAllClientFields = ref(false)
const showAllTimeSlots = ref(false)
const showAllCitaVentaTimeSlots = ref(false)

const visibleTimeSlots = computed(() => {
  if (showAllTimeSlots.value) {
    return timeSlots
  }
  return timeSlots.filter((time) => {
    const hour = parseInt(time.split(':')[0] ?? '0', 10)
    return hour >= 8 && hour <= 20
  })
})

const visibleCitaVentaTimeSlots = computed(() => {
  if (showAllCitaVentaTimeSlots.value) {
    return timeSlots
  }
  return timeSlots.filter((time) => {
    const hour = parseInt(time.split(':')[0] ?? '0', 10)
    return hour >= 8 && hour <= 20
  })
})

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

// Pantalla inicial de estado de sesión (solo al editar)
const showStatusScreen = ref(isEditing.value)

function goToEditSteps() {
  showStatusScreen.value = false
  currentStep.value = 0
}

async function handleStatusClick(optValue: EstadoSesion) {
  if (optValue === 'PROGRAMADA') {
    formData.value.estado = 'PROGRAMADA'
    goToEditSteps()
    return
  }

  if (isReadOnly.value) {
    ElMessage.warning('No tienes permisos para modificar el estado de esta sesión')
    return
  }

  try {
    isSaving.value = true
    formData.value.estado = optValue
    if (sessionId.value) {
      await sessionStore.updateSession(Number(sessionId.value), {
        estado: optValue,
      })
      ElMessage.success(`Estado actualizado a ${optValue === 'NO_SHOW' ? 'NO VINO' : optValue}`)
      await sessionStore.fetchSessions()
      handleGoBack()
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al actualizar el estado'
    ElMessage.error(msg)
  } finally {
    isSaving.value = false
  }
}

const currentStep = ref(0)

// Opciones para botones de motivo de sesión (estilo Estado de Sesión)
const motivoOptions = [
  { label: 'Cumpleaños', value: 'Cumpleaños', icon: Balloon },
  { label: 'Foto familiar', value: 'Foto familiar', icon: Users },
  { label: 'Pedida matrimonio', value: 'Pedida de matrimonio', icon: Sparkles },
  { label: 'Revelación género', value: 'Revelación de género', icon: Baby },
  { label: 'Otro', value: 'Otro', icon: MoreHorizontal },
]

// Establecer 'Otro' como motivo seleccionado por defecto si no hay ninguno
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

function scrollToActiveAccordion() {
  nextTick(() => {
    const scrollContainer = document.querySelector('.main-content') as HTMLElement | null
    const accordionEl = document.querySelector('.mobile-schedule-accordion') as HTMLElement | null
    if (!accordionEl) return

    if (scrollContainer) {
      const containerRect = scrollContainer.getBoundingClientRect()
      const accordionRect = accordionEl.getBoundingClientRect()
      const targetScrollTop = scrollContainer.scrollTop + (accordionRect.top - containerRect.top)
      scrollContainer.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'instant',
      })
    } else {
      accordionEl.scrollIntoView({ behavior: 'instant', block: 'start' })
    }
  })
}

function handleAccordionChange(activeName: string) {
  if (activeName) {
    scrollToActiveAccordion()
  }
}

watch(activeScheduleAccordion, (newVal) => {
  if (newVal) {
    scrollToActiveAccordion()
  }
})

watch(currentStep, () => {
  nextTick(() => {
    const scrollContainer = document.querySelector('.main-content')
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'instant' })
    }
  })
})

function handleStepBack() {
  if (currentStep.value > 0) {
    currentStep.value--
  } else {
    handleGoBack()
  }
}

function validateStep1(): boolean {
  const data = formData.value

  // 1. Nombre del cliente obligatorio
  if (!data.clienteNombre || !data.clienteNombre.trim()) {
    ElMessage.warning('Por favor, indica el nombre del cliente')
    return false
  }

  // 2. Hotel obligatorio
  if (!data.hotelId) {
    ElMessage.warning('Por favor, selecciona un hotel')
    return false
  }

  // 3. Email con formato válido si existe
  if (data.clienteEmail && data.clienteEmail.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(data.clienteEmail.trim())) {
      ElMessage.warning('El formato del correo electrónico no es válido')
      return false
    }
  }

  // 4. Mínimo 1 participante (no pueden estar ambos en 0)
  const adultos = Number(data.numAdultos) || 0
  const ninos = Number(data.numNinos) || 0
  if (adultos === 0 && ninos === 0) {
    ElMessage.warning('Debe haber al menos 1 participante (al menos 1 adulto o 1 niño)')
    return false
  }

  return true
}

function validateStep2(): boolean {
  // 1. Validar que haya fecha elegida para la sesión de fotos
  if (!selectedDateOnly.value) {
    activeScheduleAccordion.value = 'sesion'
    ElMessage.warning('Por favor, selecciona una fecha para la sesión de fotos')
    return false
  }

  // 2. Validar que haya un horario seleccionado para la sesión
  if (!selectedTimeOnly.value) {
    activeScheduleAccordion.value = 'sesion'
    ElMessage.warning('Por favor, selecciona un horario para la sesión de fotos')
    return false
  }

  // 3. Validar que el fotógrafo (si está seleccionado) no tenga ausencia registrada
  if (formData.value.fotografoId && isFotografoAusente.value) {
    activeScheduleAccordion.value = 'sesion'
    ElMessage.warning('El fotógrafo seleccionado tiene una ausencia en esta fecha')
    return false
  }

  // 4. Validar que no se supere el tope de sesiones simultáneas
  if (isTopeAlcanzado.value) {
    activeScheduleAccordion.value = 'sesion'
    ElMessage.warning('Se ha alcanzado el tope de sesiones simultáneas para esta hora')
    return false
  }

  return true
}

function handleNextStep() {
  if (currentStep.value === 0) {
    if (!validateStep1()) {
      return
    }
    currentStep.value = 1
  } else if (currentStep.value === 1) {
    if (!validateStep2()) {
      return
    }
    currentStep.value = 2
  } else {
    handleSaveSession()
  }
}
</script>

<template>
  <div class="session-form-mobile">
    <!-- Pantalla Inicial de Estado de Sesión (solo al entrar a editar sesión) -->
    <template v-if="showStatusScreen">
      <div class="mobile-header">
        <el-button :icon="ArrowLeft" circle class="back-btn" @click="handleGoBack" />
        <h1 class="mobile-title">Editar Sesión</h1>
      </div>

      <div class="status-screen-center">
        <div class="status-screen-box">
          <label class="status-screen-label">ESTADO DE SESIÓN</label>
          <div class="status-screen-grid">
            <button
              v-for="opt in estadoSesionOptions"
              :key="opt.value"
              type="button"
              class="status-screen-btn"
              :class="[
                `status-screen-btn--${opt.value.toLowerCase()}`,
                { 'is-active': formData.estado === opt.value },
              ]"
              :disabled="isReadOnly"
              @click="handleStatusClick(opt.value)"
            >
              <el-icon class="status-screen-btn-icon"><component :is="opt.icon" :size="20" /></el-icon>
              <span>{{ opt.label }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Barra de acciones inferior de la pantalla de estado -->
      <div class="mobile-bottom-actions mobile-bottom-actions--status">
        <el-button
          class="mobile-cancel-icon-btn"
          size="large"
          text
          bg
          :icon="Close"
          @click="handleGoBack"
        />

        <el-button
          type="primary"
          class="mobile-next-btn"
          size="large"
          @click="goToEditSteps"
        >
          <span>Editar sesión</span>
          <el-icon class="btn-icon-right"><ArrowRight :size="18" /></el-icon>
        </el-button>
      </div>
    </template>

    <!-- Flujo de 3 Pasos del Formulario -->
    <template v-else>
      <!-- Header móvil con botón Volver y Título -->
      <div class="mobile-header">
        <el-button :icon="ArrowLeft" circle class="back-btn" @click="handleStepBack" />
        <h1 class="mobile-title">
          {{ isEditing ? 'Editar Sesión' : 'Nueva Sesión' }}
        </h1>
      </div>

    <!-- Barra de Pasos (Steps) Móvil -->
    <div class="mobile-steps-wrapper">
      <div class="mobile-stepper">
        <!-- Paso 1: Cliente -->
        <div
          class="stepper-item"
          :class="{
            active: currentStep === 0,
            completed: currentStep > 0,
          }"
        >
          <div class="stepper-icon-wrap">
            <User :size="24" :stroke-width="2" />
          </div>
          <span class="stepper-label">Cliente</span>
        </div>

        <!-- Conector 1-2 -->
        <div class="stepper-connector" :class="{ completed: currentStep > 0 }"></div>

        <!-- Paso 2: Sesión -->
        <div
          class="stepper-item"
          :class="{
            active: currentStep === 1,
            completed: currentStep > 1,
          }"
        >
          <div class="stepper-icon-wrap">
            <Camera :size="24" :stroke-width="2" />
          </div>
          <span class="stepper-label">Sesión</span>
        </div>

        <!-- Conector 2-3 -->
        <div class="stepper-connector" :class="{ completed: currentStep > 1 }"></div>

        <!-- Paso 3: Detalles -->
        <div
          class="stepper-item"
          :class="{
            active: currentStep === 2,
            completed: currentStep > 2,
          }"
        >
          <div class="stepper-icon-wrap">
            <SquarePen :size="24" :stroke-width="2" />
          </div>
          <span class="stepper-label">Detalles</span>
        </div>
      </div>
    </div>

    <!-- Contenido Dinámico del Paso Activo -->
    <div class="mobile-step-body">
      <!-- Paso 1: Información del Cliente -->
      <div v-if="currentStep === 0" class="step-pane step-pane-client">
        <el-form
          :model="formData"
          label-position="top"
          size="large"
          :disabled="isReadOnly"
          class="mobile-client-form"
        >
          <!-- Fila 1: Nombre del Cliente -->
          <el-form-item label="Nombre del Cliente" required>
            <el-input
              v-model="formData.clienteNombre"
              size="large"
              placeholder="Ej. Familia López / Pareja Smith"
              :prefix-icon="User"
            />
          </el-form-item>

          <!-- Fila 2: Hotel y Nº de Habitación -->
          <div class="mobile-form-row-2">
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

          <!-- Fila 3: Participantes (Adultos y Niños) en 2 columnas al 50% -->
          <div class="mobile-form-row-pax">
            <el-form-item>
              <template #label>
                <span class="pax-item-label">
                  <el-icon class="pax-label-icon"><Users :size="16" /></el-icon>
                  <span>Adultos</span>
                </span>
              </template>
              <el-input-number
                v-model="formData.numAdultos"
                size="large"
                :min="0"
                :max="99"
                :step="1"
                class="mobile-pax-input"
              />
            </el-form-item>

            <el-form-item>
              <template #label>
                <span class="pax-item-label">
                  <el-icon class="pax-label-icon"><Baby :size="16" /></el-icon>
                  <span>Niños</span>
                </span>
              </template>
              <el-input-number
                v-model="formData.numNinos"
                size="large"
                :min="0"
                :max="99"
                :step="1"
                class="mobile-pax-input"
              />
            </el-form-item>
          </div>

          <!-- Switch para mostrar/ocultar campos adicionales -->
          <div class="mobile-switch-row">
            <el-switch v-model="showAllClientFields" size="default" />
            <span class="switch-label">Más datos</span>
          </div>

          <!-- Fila 4 Condicional: Email y Teléfono al 100% de ancho -->
          <transition name="el-fade-in">
            <div v-if="showAllClientFields" class="mobile-form-extra-fields">
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
          </transition>
        </el-form>
      </div>

      <!-- Paso 2: Planificación con Acordeón (3 Secciones) -->
      <div v-else-if="currentStep === 1" class="step-pane step-pane-schedule">
        <el-collapse
          v-model="activeScheduleAccordion"
          accordion
          class="mobile-schedule-accordion"
          @change="handleAccordionChange"
        >
          <!-- 1. Sesión -->
          <el-collapse-item name="sesion">
            <template #title>
              <div class="mobile-accordion-header">
                <div class="accordion-title-group">
                  <el-icon class="accordion-icon"><Camera :size="24" :stroke-width="2" /></el-icon>
                  <span class="accordion-title-text">Sesión</span>
                </div>
                <el-tag
                  :type="activeScheduleAccordion === 'sesion' ? sessionStateTagType : 'info'"
                  effect="light"
                  round
                  size="small"
                  class="header-datetime-tag"
                  :class="{ 'is-active': activeScheduleAccordion === 'sesion' }"
                >
                  {{ mobileSessionPreview }}
                </el-tag>
              </div>
            </template>

            <div class="mobile-schedule-container">
              <!-- 1. Bloque de Calendario -->
              <div class="mobile-calendar-section">
                <div class="schedule-subheading">
                  <span class="step-badge-num">1</span>
                  <span>SELECCIONA FECHA</span>
                </div>

                <div class="calendar-panel-box">
                  <div class="inline-calendar-picker">
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

                <!-- Contenedor de Avisos e Información bajo el Calendario -->
                <div class="calendar-info-boxes">
                  <!-- Leyenda de colores de ausencias del fotógrafo seleccionado -->
                  <div
                    v-if="formData.fotografoId && hasAusenciasInVisibleMonth"
                    class="fotografo-absence-legend uniform-box"
                  >
                    <span class="legend-label">Ausencias de {{ selectedPhotographerName }}:</span>
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

                  <!-- Alerta de Bloqueo por Ausencia Individual del Fotógrafo -->
                  <el-alert
                    v-if="formData.fechaHoraInicio && isFotografoAusente && ausenciaFotografoActual"
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

                  <!-- Indicador de Disponibilidad y Cupo del Hotel -->
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
                        <span>Sesiones disponibles:</span>
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
                          No hay fotógrafos disponibles en este hotel para la fecha seleccionada.
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

              <!-- 2. Bloque de Horas: 2 SELECCIONA HORARIO (Recuadro Verde) -->
              <div class="schedule-section-block">
                <div class="schedule-section-header-row">
                  <div class="schedule-subheading">
                    <span class="step-badge-num">2</span>
                    <span>SELECCIONA HORARIO</span>
                  </div>
                  <el-switch v-model="showAllTimeSlots" size="default" />
                </div>
                <div class="time-slots-grid">
                  <el-badge
                    v-for="time in visibleTimeSlots"
                    :key="time"
                    :value="sessionsCountByHour[time]"
                    :hidden="!sessionsCountByHour[time]"
                    class="time-slot-badge-wrapper"
                  >
                    <button
                      type="button"
                      class="time-slot-btn"
                      :class="[getTimeSlotStatusClass(time), { active: selectedTimeOnly === time }]"
                      @click="selectTimeSlot(time)"
                    >
                      {{ time }}
                    </button>
                  </el-badge>
                </div>
              </div>

              <!-- 3. Bloque de Fotógrafos:  FOTÓGRAFOS DISPONIBLES (Recuadro Morado) -->
              <div class="schedule-section-block">
                <div class="schedule-subheading">
                  <span class="step-badge-num">3</span>
                  <span>FOTÓGRAFOS DISPONIBLES</span>
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
          </el-collapse-item>

          <!-- 2. Venta -->
          <el-collapse-item name="cita-venta">
            <template #title>
              <div class="mobile-accordion-header">
                <div class="accordion-title-group">
                  <el-icon class="accordion-icon">
                    <Calendar :size="24" :stroke-width="2" />
                  </el-icon>
                  <span class="accordion-title-text">Venta</span>
                </div>
                <el-tag
                  :type="activeScheduleAccordion === 'cita-venta' ? 'primary' : 'info'"
                  effect="light"
                  round
                  size="small"
                  class="header-datetime-tag"
                  :class="{ 'is-active': activeScheduleAccordion === 'cita-venta' }"
                >
                  {{ mobileCitaVentaPreview }}
                </el-tag>
              </div>
            </template>

            <div class="mobile-schedule-container">
              <!-- 1. Bloque de Calendario Cita de Ventas -->
              <div class="mobile-calendar-section">
                <div class="schedule-subheading">
                  <span class="step-badge-num">1</span>
                  <span>SELECCIONA FECHA</span>
                </div>

                <div class="calendar-panel-box">
                  <div class="inline-calendar-picker">
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
              </div>

              <!-- 2. Bloque de Horas de Venta -->
              <div class="schedule-section-block">
                <div class="schedule-section-header-row">
                  <div class="schedule-subheading">
                    <span class="step-badge-num">2</span>
                    <span>SELECCIONA HORARIO VENTA</span>
                  </div>
                  <el-switch v-model="showAllCitaVentaTimeSlots" size="default" />
                </div>
                <div class="time-slots-grid">
                  <el-badge
                    v-for="time in visibleCitaVentaTimeSlots"
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
                        { active: selectedCitaVentaTimeOnly === time },
                      ]"
                      @click="selectCitaVentaTimeSlot(time)"
                    >
                      {{ time }}
                    </button>
                  </el-badge>
                </div>

                <!-- Alerta de conflictos de Cita de Venta -->
                <div
                  v-if="conflictsCitaVenta.length > 0"
                  class="conflict-alert-box uniform-box"
                  style="margin-top: 0.75rem"
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
            </div>
          </el-collapse-item>

          <!-- 3. Checkout -->
          <el-collapse-item name="checkout">
            <template #title>
              <div class="mobile-accordion-header">
                <div class="accordion-title-group">
                  <el-icon class="accordion-icon">
                    <PlaneTakeoff :size="24" :stroke-width="2" />
                  </el-icon>
                  <span class="accordion-title-text">Checkout</span>
                </div>
                <el-tag
                  :type="activeScheduleAccordion === 'checkout' ? 'primary' : 'info'"
                  effect="light"
                  round
                  size="small"
                  class="header-datetime-tag"
                  :class="{ 'is-active': activeScheduleAccordion === 'checkout' }"
                >
                  {{ mobileCheckoutPreview }}
                </el-tag>
              </div>
            </template>

            <div class="mobile-schedule-container">
              <!-- Bloque de Calendario de Checkout -->
              <div class="mobile-calendar-section">
                <div class="schedule-subheading">
                  <span class="step-badge-num">1</span>
                  <span>SELECCIONA CHECKOUT</span>
                </div>

                <div class="calendar-panel-box">
                  <div class="inline-calendar-picker">
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
          </el-collapse-item>
        </el-collapse>
      </div>

      <!-- Paso 3: Resumen y Detalles de la Sesión -->
      <div v-else-if="currentStep === 2" class="step-pane step-pane-details">
        <!-- 1. Tarjeta Azul de Resumen de Cita -->
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
            <!-- Cliente -->
            <div v-if="formData.clienteNombre?.trim()" class="summary-detail-row">
              <span class="summary-detail-key">Cliente:</span>
              <span class="summary-detail-val">{{ formData.clienteNombre }}</span>
            </div>

            <!-- Habitación -->
            <div v-if="formData.numeroHabitacion?.trim()" class="summary-detail-row">
              <span class="summary-detail-key">Habitación:</span>
              <span class="summary-detail-val">{{ formData.numeroHabitacion }}</span>
            </div>

            <!-- Email -->
            <div v-if="formData.clienteEmail?.trim()" class="summary-detail-row">
              <span class="summary-detail-key">Email:</span>
              <span class="summary-detail-val">{{ formData.clienteEmail }}</span>
            </div>

            <!-- Teléfono -->
            <div v-if="formData.clienteTelefono?.trim()" class="summary-detail-row">
              <span class="summary-detail-key">Teléfono:</span>
              <span class="summary-detail-val">{{ formData.clienteTelefono }}</span>
            </div>

            <!-- Hotel -->
            <div v-if="selectedHotelDisplayName" class="summary-detail-row">
              <span class="summary-detail-key">Hotel:</span>
              <span class="summary-detail-val">{{ selectedHotelDisplayName }}</span>
            </div>

            <!-- Fecha Sesión -->
            <div
              v-if="
                formData.fechaHoraInicio &&
                summaryFormattedDate &&
                summaryFormattedDate !== 'Sin fecha'
              "
              class="summary-detail-row"
            >
              <span class="summary-detail-key">Fecha:</span>
              <span class="summary-detail-val">{{ summaryFormattedDate }}</span>
            </div>

            <!-- Hora Sesión -->
            <div v-if="selectedTimeOnly" class="summary-detail-row">
              <span class="summary-detail-key">Hora:</span>
              <span class="summary-detail-val">{{ selectedTimeOnly }}</span>
            </div>

            <!-- Personas -->
            <div
              v-if="summaryPersonas && summaryPersonas !== 'Sin participantes'"
              class="summary-detail-row"
            >
              <span class="summary-detail-key">Personas:</span>
              <span class="summary-detail-val">{{ summaryPersonas }}</span>
            </div>

            <!-- Cita de Venta -->
            <div
              v-if="mobileCitaVentaPreview && mobileCitaVentaPreview !== 'Sin cita'"
              class="summary-detail-row"
            >
              <span class="summary-detail-key">Cita Venta:</span>
              <span class="summary-detail-val">{{ mobileCitaVentaPreview }}</span>
            </div>

            <!-- Checkout -->
            <div
              v-if="mobileCheckoutPreview && mobileCheckoutPreview !== 'Sin checkout'"
              class="summary-detail-row"
            >
              <span class="summary-detail-key">Checkout:</span>
              <span class="summary-detail-val">{{ mobileCheckoutPreview }}</span>
            </div>

            <!-- Motivo / Concepto (Solo si se ha seleccionado/escrito) -->
            <div v-if="formData.concepto?.trim()" class="summary-detail-row">
              <span class="summary-detail-key">Motivo:</span>
              <span class="summary-detail-val">{{ formData.concepto }}</span>
            </div>

            <!-- Notas Adicionales (Solo si se han escrito) -->
            <div v-if="formData.notas?.trim()" class="summary-detail-row">
              <span class="summary-detail-key">Notas:</span>
              <span class="summary-detail-val">{{ formData.notas }}</span>
            </div>
          </div>
        </div>

        <!-- 2. Detalles de la Sesión -->
        <div class="mobile-details-section">
          <div class="mobile-details-form">
            <!-- Concepto / Motivo de la Sesión (Botones estilo Estado de Sesión) -->
            <div class="motivo-section">
              <label class="form-field-label">CONCEPTO / MOTIVO DE LA SESIÓN</label>
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
                    <component :is="opt.icon" :size="20" :stroke-width="2" />
                  </el-icon>
                  <span>{{ opt.label }}</span>
                </button>
              </div>
            </div>

            <!-- Notas Adicionales -->
            <div class="notas-section">
              <label class="form-field-label">NOTAS ADICIONALES</label>
              <el-input
                v-model="formData.notas"
                size="large"
                type="textarea"
                :rows="3"
                placeholder="Ej. Fotos en la playa al atardecer, vestidos de blanco."
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Barra de acciones inferior móvil (Sticky Bottom Bar) -->
    <!-- Paso 1 (2 botones): 1/4 Cancelar + 3/4 Siguiente -->
    <div v-if="currentStep === 0" class="mobile-bottom-actions mobile-bottom-actions--2cols">
      <el-button class="mobile-cancel-btn" size="large" text bg :icon="Close" @click="handleGoBack">
        Cancelar
      </el-button>

      <el-button
        type="primary"
        class="mobile-next-btn"
        size="large"
        :loading="isSaving"
        :disabled="isReadOnly"
        @click="handleNextStep"
      >
        <span>Siguiente</span>
        <el-icon class="btn-icon-right"><ArrowRight :size="18" /></el-icon>
      </el-button>
    </div>

    <!-- Pasos 2 y 3 (3 botones): Cancelar (solo icono) + Anterior (50%) + Siguiente / Guardar (50%) -->
    <div v-else class="mobile-bottom-actions mobile-bottom-actions--3cols">
      <el-button
        class="mobile-cancel-icon-btn"
        size="large"
        text
        bg
        :icon="Close"
        @click="handleGoBack"
      />

      <el-button class="mobile-prev-btn" size="large" @click="handleStepBack">
        <el-icon class="btn-icon-left"><LucideArrowLeft :size="18" /></el-icon>
        <span>Anterior</span>
      </el-button>

      <el-button
        type="primary"
        class="mobile-next-btn"
        size="large"
        :loading="isSaving"
        :disabled="isReadOnly"
        @click="handleNextStep"
      >
        <span>{{ currentStep < 2 ? 'Siguiente' : isEditing ? 'Guardar' : 'Agendar' }}</span>
        <el-icon class="btn-icon-right">
          <component :is="currentStep < 2 ? ArrowRight : Check" :size="18" />
        </el-icon>
      </el-button>
    </div>
    </template>
  </div>
</template>

<style scoped>
.session-form-mobile {
  padding: 1rem;
  padding-bottom: 5.5rem;
  min-height: 100vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.mobile-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.mobile-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
  margin: 0;
}

.back-btn {
  background-color: var(--toolbar-bg, #ffffff);
  border: 1px solid var(--toolbar-border, #e2e8f0);
}

.mobile-steps-wrapper {
  padding: 0.5rem 0.25rem 0.25rem 0.25rem;
}

.mobile-stepper {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
}

.stepper-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  min-width: 64px;
}

.stepper-icon-wrap {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--nav-link-color, #94a3b8);
  transition: color 0.2s ease;
}

.stepper-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--nav-link-color, #94a3b8);
  transition:
    color 0.2s ease,
    font-weight 0.2s ease;
  white-space: nowrap;
}

/* Conector entre pasos */
.stepper-connector {
  flex: 1;
  height: 2px;
  background-color: var(--toolbar-border, #e2e8f0);
  margin-top: 15px;
  margin-left: 0.35rem;
  margin-right: 0.35rem;
  border-radius: 1px;
  transition: background-color 0.2s ease;
}

/* Estados */
.stepper-item.active .stepper-icon-wrap {
  color: var(--el-color-success, #67c23a);
}

.stepper-item.active .stepper-label {
  color: var(--heading-color, #0f172a);
  font-weight: 700;
}

.stepper-item.completed .stepper-icon-wrap {
  color: var(--el-color-success, #67c23a);
}

.stepper-item.completed .stepper-label {
  color: var(--heading-color, #0f172a);
  font-weight: 600;
}

.stepper-connector.completed {
  background-color: var(--el-color-success, #67c23a);
}

.mobile-step-body {
  width: 100%;
}

.step-pane {
  width: 100%;
}

.mobile-client-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Switch beside Nombre del Cliente label */
.client-name-item :deep(.el-form-item__label) {
  width: 100% !important;
  display: block !important;
  padding-right: 0 !important;
  margin-bottom: 6px;
}

.client-name-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.client-name-label-text {
  font-weight: 600;
}

.mobile-form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.mobile-form-row-pax {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  width: 100%;
}

.mobile-pax-input {
  width: 100% !important;
}

.mobile-pax-input :deep(.el-input) {
  width: 100% !important;
}

.mobile-switch-row {
  display: flex;
  align-items: center;
  padding: 0.5rem 0 0.25rem 0;
}

.switch-label {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--heading-color, #0f172a);
  margin-left: 0.5rem;
}

.mobile-form-extra-fields {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
}

.pax-item-label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 600;
  font-size: 0.9rem;
}

.pax-label-icon {
  color: var(--el-text-color-secondary, #64748b);
  display: inline-flex;
  align-items: center;
}

/* Step 2: Schedule & Availability Accordion Styles */
.mobile-schedule-accordion {
  border: none;
  background: transparent;
  display: block;
}

.mobile-schedule-accordion :deep(.el-collapse-item) {
  display: contents;
}

.mobile-schedule-accordion :deep(.el-collapse-item__header) {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
  padding: 0 0.5rem;
  height: 50px;
  min-height: 50px;
  border-bottom: 1px solid var(--toolbar-border, #e2e8f0);
  background-color: var(--content-bg, #f8fafc);
  line-height: 50px;
  box-sizing: border-box;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
}

/* Sticky cascading headers */
.mobile-schedule-accordion :deep(.el-collapse-item:nth-of-type(1) .el-collapse-item__header) {
  position: sticky;
  top: 0px;
  z-index: 23;
}

.mobile-schedule-accordion :deep(.el-collapse-item:nth-of-type(2) .el-collapse-item__header) {
  position: sticky;
  top: 50px;
  z-index: 22;
}

.mobile-schedule-accordion :deep(.el-collapse-item:nth-of-type(3) .el-collapse-item__header) {
  position: sticky;
  top: 100px;
  z-index: 21;
}

.mobile-schedule-accordion :deep(.el-collapse-item__wrap) {
  border-bottom: 1px solid var(--toolbar-border, #e2e8f0);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0) 0%, rgb(234 244 254 / 90%) 100%);
}

.mobile-schedule-accordion :deep(.el-collapse-item:last-child .el-collapse-item__wrap) {
  border-bottom: none;
}

.mobile-schedule-accordion :deep(.el-collapse-item__content) {
  padding: 0.85rem 0.5rem 1rem 0.5rem;
  color: var(--el-text-color-primary);
}

.mobile-accordion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding-right: 0.35rem;
  gap: 0.5rem;
}

.accordion-title-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.accordion-icon {
  color: #94a3b8;
  font-size: 24px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.accordion-title-text {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
  white-space: nowrap;
}

.header-datetime-tag {
  font-weight: 500;
  font-size: 0.74rem;
  flex-shrink: 0;
  white-space: nowrap;
  padding: 0 0.5rem;
  height: 24px;
  line-height: 24px;
  transition:
    font-size 0.2s ease,
    padding 0.2s ease,
    height 0.2s ease;
}

.header-datetime-tag.is-active,
.mobile-schedule-accordion :deep(.el-collapse-item.is-active .header-datetime-tag) {
  font-weight: 700;
  font-size: 1em;
  padding: 0 0.75rem;
  height: 28px;
  line-height: 28px;
}

.mobile-schedule-accordion :deep(.el-collapse-item__arrow) {
  margin-left: 0.25rem;
  margin-right: 0.1rem;
  color: #94a3b8;
}

.mobile-accordion-empty-body {
  min-height: 20px;
}

.mobile-schedule-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
}

.mobile-calendar-section {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  width: 100%;
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
  margin: 0 auto;
}

.inline-calendar-picker :deep(.el-date-picker__prev-year-btn),
.inline-calendar-picker :deep(.el-date-picker__next-year-btn),
.inline-calendar-picker :deep(.d-arrow-left),
.inline-calendar-picker :deep(.d-arrow-right) {
  display: none !important;
}

.calendar-info-boxes {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
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
  padding: 0.75rem 0.85rem;
  background: var(--el-fill-color-light, #f8fafc);
  border: 1px solid var(--el-border-color-lighter, #e2e8f0);
  border-radius: 8px;
}

.legend-label {
  font-weight: 600;
  color: var(--el-text-color-regular, #475569);
  font-size: 0.82rem;
}

.calendar-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
  font-size: 0.78rem;
  color: var(--el-text-color-secondary, #64748b);
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
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

.fotografo-absence-alert {
  border-radius: 8px !important;
  padding: 0.75rem 0.85rem !important;
}

.disponibilidad-indicator-card {
  background: var(--el-fill-color-light, #f8fafc);
  border: 1px solid var(--el-border-color-lighter, #e2e8f0);
  border-radius: 8px;
  padding: 0.75rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
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
  font-size: 0.84rem;
  color: var(--heading-color, #0f172a);
  font-weight: 600;
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
  font-size: 0.78rem;
  color: var(--el-text-color-regular, #64748b);
}

.detail-separator {
  color: var(--el-border-color, #cbd5e1);
}

.quota-alert {
  margin-top: 0.25rem;
}

/* Schedule Section Block (Horas y Fotógrafos) */
.schedule-section-block {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.schedule-section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
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

.step-badge-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--el-color-primary, #3b82f6);
  color: #ffffff;
  font-size: 0.7rem;
  font-weight: 700;
  flex-shrink: 0;
}

/* Time slots grid (6 columnas x 4 filas) */
.time-slots-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.65rem 0.45rem;
  padding-top: 0.35rem;
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
  padding: 0.55rem 0.2rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--heading-color, #0f172a);
  background: var(--el-fill-color-light, #f8fafc);
  border: 1px solid var(--toolbar-border, #e2e8f0);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
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

/* Photographers List */
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

.photographer-avatar-preview {
  flex-shrink: 0;
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

.empty-photographers-msg {
  font-size: 0.85rem;
  color: var(--nav-link-color, #64748b);
  padding: 0.75rem;
  background: var(--el-fill-color-light, #f8fafc);
  border-radius: 8px;
}

/* Step 3: Resumen & Detalles Styles */
.step-pane-details {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding-bottom: 1rem;
}

.appointment-summary-card {
  background-color: var(--el-color-primary, #2563eb);
  border-radius: 14px;
  padding: 1.25rem;
  color: #ffffff;
  box-shadow: 0 6px 18px rgba(37, 99, 235, 0.22);
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
  text-align: right;
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mobile-details-section {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding-top: 0.25rem;
}

.mobile-details-form {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.motivo-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-field-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--nav-link-color, #64748b);
  text-transform: uppercase;
}

.motivo-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.6rem;
}

.motivo-grid-btn {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.55rem;
  padding: 0.75rem 0.85rem;
  font-size: 0.84rem;
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
  font-size: 1.25rem;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.notas-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Pantalla Inicial de Estado de Sesión (solo al editar) */
.status-screen-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 200px);
  width: 100%;
  padding: 1rem 0;
  box-sizing: border-box;
}

.status-screen-box {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.status-screen-label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--nav-link-color, #64748b);
  text-transform: uppercase;
}

.status-screen-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.85rem;
}

.status-screen-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 1.1rem 0.65rem;
  font-size: 0.88rem;
  font-weight: 700;
  border-radius: 12px;
  border: 1px solid var(--toolbar-border, #e2e8f0);
  background: var(--toolbar-bg, #ffffff);
  color: var(--nav-link-color, #475569);
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
  box-sizing: border-box;
}

.status-screen-btn-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.status-screen-btn:hover:not(:disabled):not(.is-active) {
  border-color: var(--el-color-primary-light-5, #93c5fd);
  color: var(--el-color-primary, #3b82f6);
  background: var(--el-color-primary-light-9, #eff6ff);
}

.status-screen-btn--programada.is-active {
  background-color: #409eff !important;
  border-color: #409eff !important;
  color: #ffffff !important;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.status-screen-btn--completada.is-active {
  background-color: #67c23a !important;
  border-color: #67c23a !important;
  color: #ffffff !important;
  box-shadow: 0 4px 12px rgba(103, 194, 58, 0.3);
}

.status-screen-btn--cancelada.is-active {
  background-color: #f56c6c !important;
  border-color: #f56c6c !important;
  color: #ffffff !important;
  box-shadow: 0 4px 12px rgba(245, 108, 108, 0.3);
}

.status-screen-btn--no_show.is-active {
  background-color: #e6a23c !important;
  border-color: #e6a23c !important;
  color: #ffffff !important;
  box-shadow: 0 4px 12px rgba(230, 162, 60, 0.3);
}

/* Sticky Bottom Bar */
.mobile-bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0.75rem 1rem;
  background: var(--toolbar-bg, #ffffff);
  border-top: 1px solid var(--toolbar-border, #e2e8f0);
  display: grid;
  gap: 0.65rem;
  z-index: 100;
  box-shadow: 0 -4px 14px rgba(0, 0, 0, 0.06);
}

.mobile-bottom-actions--status {
  grid-template-columns: auto 1fr;
}

.mobile-bottom-actions--2cols {
  grid-template-columns: 1fr 3fr;
}

.mobile-bottom-actions--3cols {
  grid-template-columns: auto 1fr 1fr;
}

.mobile-cancel-icon-btn {
  width: 44px !important;
  min-width: 44px !important;
  height: 40px !important;
  padding: 0 !important;
  margin: 0 !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
}

.mobile-cancel-btn {
  width: 100%;
  margin: 0 !important;
  font-weight: 600;
  padding: 0 0.5rem !important;
}

.mobile-prev-btn {
  width: 100%;
  margin: 0 !important;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  background-color: var(--toolbar-bg, #ffffff);
  border: 1px solid var(--toolbar-border, #e2e8f0);
  color: var(--heading-color, #0f172a);
  padding: 0 0.5rem !important;
}

.mobile-next-btn {
  width: 100%;
  margin: 0 !important;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0 0.5rem !important;
}

.btn-icon-left {
  display: inline-flex;
  align-items: center;
  margin-right: 0.2rem;
}

.btn-icon-right {
  display: inline-flex;
  align-items: center;
  margin-left: 0.2rem;
}

/* Dark Mode Overrides */
html.dark .session-form-mobile {
  background-color: var(--app-bg, #121212);
}

html.dark .back-btn,
html.dark .mobile-prev-btn {
  background-color: var(--toolbar-bg, #1d1e1f);
  border-color: var(--toolbar-border, #363637);
  color: var(--heading-color, #ffffff);
}

html.dark .mobile-schedule-accordion :deep(.el-collapse-item__header) {
  background-color: var(--content-bg, #121212);
  border-color: var(--toolbar-border, #363637);
}

html.dark .mobile-schedule-accordion :deep(.el-collapse-item__wrap) {
  border-color: var(--toolbar-border, #363637);
  box-shadow: rgba(0, 0, 0, 0.45) 0px 55px 25px -25px inset;
}

html.dark .accordion-title-text {
  color: var(--heading-color, #ffffff);
}

html.dark .accordion-icon {
  color: #71717a;
}

html.dark .photographer-selection-card,
html.dark .mobile-bottom-actions {
  background: var(--toolbar-bg, #1d1e1f);
  border-color: var(--toolbar-border, #363637);
}

html.dark .fotografo-absence-legend,
html.dark .disponibilidad-indicator-card,
html.dark .empty-photographers-msg {
  background: rgba(255, 255, 255, 0.03);
  border-color: var(--toolbar-border, #363637);
}

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

html.dark .photographer-selection-card.disabled {
  background: rgba(255, 255, 255, 0.02);
  border-color: var(--toolbar-border, #363637);
}

html.dark .stepper-icon-wrap,
html.dark .stepper-label {
  color: var(--nav-link-color, #64748b);
}

html.dark .stepper-item.active .stepper-icon-wrap,
html.dark .stepper-item.completed .stepper-icon-wrap {
  color: var(--el-color-success, #67c23a);
}

html.dark .stepper-item.active .stepper-label,
html.dark .stepper-item.completed .stepper-label {
  color: var(--heading-color, #ffffff);
}

html.dark .stepper-connector {
  background-color: var(--toolbar-border, #363637);
}

html.dark .stepper-connector.completed {
  background-color: var(--el-color-success, #67c23a);
}

html.dark .form-field-label {
  color: var(--nav-link-color, #a1a1aa);
}

html.dark .motivo-grid-btn {
  background: var(--toolbar-bg, #1d1e1f);
  border-color: var(--toolbar-border, #363637);
  color: var(--nav-link-color, #a1a1aa);
}

html.dark .motivo-grid-btn:hover:not(:disabled):not(.is-active) {
  border-color: #3b82f6;
  color: #60a5fa;
  background: rgba(59, 130, 246, 0.1);
}

html.dark .motivo-grid-btn.is-active {
  background-color: var(--el-color-primary, #3b82f6) !important;
  border-color: var(--el-color-primary, #3b82f6) !important;
  color: #ffffff !important;
}

html.dark .status-screen-label {
  color: var(--nav-link-color, #a1a1aa);
}

html.dark .status-screen-btn {
  background: var(--toolbar-bg, #1d1e1f);
  border-color: var(--toolbar-border, #363637);
  color: var(--nav-link-color, #a1a1aa);
}
</style>
