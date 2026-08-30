<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import type { PhotoSessionFormContext } from '../composables/usePhotoSessionForm'
import { ArrowLeft, Close, Message, Phone, Check } from '@element-plus/icons-vue'
import {
  User,
  Camera,
  Calendar,
  PlaneTakeoff,
  Building2,
  Users,
  Baby,
  Balloon,
  Sparkles,
  MoreHorizontal,
  ChevronDown,
  UserX,
} from '@lucide/vue'

const props = defineProps<{
  form: PhotoSessionFormContext
}>()

const {
  formData,
  userHotels,
  isEditing,
  isSaving,
  isReadOnly,
  selectedDateOnly,
  selectedTimeOnly,
  disabledPastDates,
  getFotografoCellClassName,
  handlePanelChange,
  selectedPhotographer,
  isFotografoAusente,
  disponibilidadHotel,
  isTopeAlcanzado,
  timeSlots,
  selectTimeSlot,
  photographers,
  getPhotographerStatus,
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

const showAllClientFields = ref(
  Boolean(
    formData.value.clienteEmail ||
    formData.value.clienteTelefono ||
    formData.value.numeroHabitacion,
  ),
)

watch(
  () => [
    formData.value.clienteEmail,
    formData.value.clienteTelefono,
    formData.value.numeroHabitacion,
  ],
  ([email, tel, hab]) => {
    if (email || tel || hab) {
      showAllClientFields.value = true
    }
  },
)

// Auto-seleccionar hotel si el usuario solo tiene acceso a un hotel
watch(
  () => userHotels.value,
  (hotels) => {
    if (!isEditing.value && hotels.length === 1 && hotels[0] && !formData.value.hotelId) {
      formData.value.hotelId = hotels[0].id
    }
  },
  { immediate: true },
)
const showAllTimeSlots = ref(false)
const showAllCitaVentaTimeSlots = ref(false)
const showPhotographersList = ref(false)

function togglePhotographersList() {
  if (isReadOnly.value) return
  showPhotographersList.value = !showPhotographersList.value
}

function handleSelectPhotographer(id: string | number) {
  if (isReadOnly.value) return
  if (getPhotographerStatus(id).disabled) return
  if (String(formData.value.fotografoId) === String(id)) {
    formData.value.fotografoId = ''
  } else {
    formData.value.fotografoId = String(id)
    showPhotographersList.value = false
  }
}

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

// Opciones para el selector de estado de la cita
const estadoOptions = [
  { value: 'PROGRAMADA', label: 'Programada', icon: Calendar },
  { value: 'NO_SHOW', label: 'No vino', icon: UserX },
  { value: 'CANCELADA', label: 'Cancelada', icon: Close },
  { value: 'COMPLETADA', label: 'Completada', icon: Check },
]

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

function validateForm(): boolean {
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

  // 5. Fecha de sesión obligatoria
  if (!selectedDateOnly.value) {
    activeScheduleAccordion.value = 'sesion'
    ElMessage.warning('Por favor, selecciona una fecha para la sesión de fotos')
    return false
  }

  // 6. Horario de sesión obligatorio
  if (!selectedTimeOnly.value) {
    activeScheduleAccordion.value = 'sesion'
    ElMessage.warning('Por favor, selecciona un horario para la sesión de fotos')
    return false
  }

  // 7. Ausencia del fotógrafo (solo si hay fotógrafo seleccionado)
  if (data.fotografoId && isFotografoAusente.value) {
    ElMessage.warning('El fotógrafo seleccionado tiene una ausencia en esta fecha')
    return false
  }

  // 8. Tope de sesiones simultáneas
  if (isTopeAlcanzado.value) {
    activeScheduleAccordion.value = 'sesion'
    ElMessage.warning('Se ha alcanzado el tope de sesiones simultáneas para esta hora')
    return false
  }

  return true
}

function handleSave() {
  if (isReadOnly.value) {
    return
  }
  if (!validateForm()) {
    return
  }
  handleSaveSession()
}
</script>

<template>
  <div class="session-form-mobile">
    <!-- Header móvil con botón Volver y Título -->
    <div class="mobile-header">
      <el-button :icon="ArrowLeft" circle class="back-btn" @click="handleGoBack" />
      <h1 class="mobile-title">
        {{ isEditing ? 'Editar Sesión' : 'Nueva Sesión' }}
      </h1>
    </div>

    <!-- Contenido del Formulario en Pantalla Única -->
    <div class="mobile-step-body">
      <!-- 1 Datos del cliente -->
      <div class="mobile-card-section-label">
        <span class="step-badge-num">1</span>
        <span>Datos del cliente</span>
      </div>

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

        <!-- Fila 2: Hotel (solo si el usuario tiene acceso a más de 1 hotel) -->
        <el-form-item v-if="userHotels.length > 1" label="Hotel" required>
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
          <span class="switch-label">Más datos del cliente</span>
        </div>

        <!-- Fila 4 Condicional: Nº de Habitación, Email y Teléfono al 100% de ancho -->
        <transition name="el-fade-in">
          <div v-if="showAllClientFields" class="mobile-form-extra-fields">
            <el-form-item label="Nº de Habitación">
              <el-input
                v-model="formData.numeroHabitacion"
                size="large"
                placeholder="Ej. 304B / Villa 12"
                :prefix-icon="Building2"
              />
            </el-form-item>

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

      <!-- 2 Establece fechas -->
      <div class="mobile-card-section-label mobile-card-section-label--schedule">
        <span class="step-badge-num">2</span>
        <span>Establece fechas</span>
      </div>

      <!-- Acordeón de Planificación (Sesión, Cita de Venta, Checkout) al final del Paso 1 -->
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
                <el-icon class="accordion-icon">
                  <Camera :size="24" :stroke-width="2" />
                </el-icon>
                <span class="accordion-title-text">
                  Sesión
                  <span class="required-asterisk">*</span>
                </span>
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
            </div>

            <!-- 2. Bloque de Horas -->
            <div class="schedule-section-block">
              <div class="schedule-section-header-row">
                <span class="schedule-section-title">Horario disponible</span>
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

            <!-- Indicador de Disponibilidad y Cupo del Hotel (después de hora y antes de fotógrafo) -->
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
                            disponibilidadHotel.cupoLibre === 1 ? 'sesión libre' : 'sesiones libres'
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
                    Tope de {{ disponibilidadHotel.disponibles }} sesiones simultáneas alcanzado
                    para esta hora.
                  </span>
                </template>
              </el-alert>
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
                <span class="schedule-section-title">Horario de venta</span>
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

      <!-- 3 Elige fotógrafo -->
      <div class="mobile-card-section-label mobile-card-section-label--photographer">
        <span class="step-badge-num">3</span>
        <span>Elige fotógrafo</span>
      </div>

      <!-- Selector de Fotógrafo Estilo Card Desplegable -->
      <div
        class="mobile-photographer-selector-card"
        :class="{ 'is-photographer-colored': !!selectedPhotographer }"
        :style="
          selectedPhotographer
            ? { backgroundColor: getUserBgColor(selectedPhotographer?.color) || '#8b5cf6' }
            : {}
        "
      >
        <div class="photographer-card-main">
          <div class="photographer-avatar-circle">
            <el-avatar
              v-if="selectedPhotographer"
              :src="selectedPhotographer.imagen || undefined"
              :size="46"
              :style="{
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '14px',
              }"
              class="photographer-header-avatar-colored"
            >
              {{ getUserInitials(selectedPhotographer.nombre, selectedPhotographer.apellidos) }}
            </el-avatar>
            <div v-else class="photographer-default-circle">
              <el-icon :size="22"><User /></el-icon>
            </div>
          </div>
          <div class="photographer-info-box">
            <span v-if="selectedPhotographer" class="photographer-badge-label">
              FOTÓGRAFO ASIGNADO
            </span>
            <span
              class="photographer-title-label"
              :class="{ 'text-white': !!selectedPhotographer }"
            >
              {{
                selectedPhotographer
                  ? `${selectedPhotographer.nombre} ${selectedPhotographer.apellidos}`
                  : 'Selecciona fotógrafo'
              }}
            </span>
            <span v-if="!selectedPhotographer" class="photographer-subtitle-label">
              Elige un fotógrafo para la sesión
            </span>
          </div>
        </div>

        <!-- Resumen de la sesión dentro de la tarjeta al haber fotógrafo asignado -->
        <template v-if="selectedPhotographer">
          <div class="photographer-selected-divider" />
          <div class="photographer-selected-details">
            <div v-if="selectedHotelDisplayName" class="detail-row">
              <span class="detail-label">Hotel:</span>
              <span class="detail-value">{{ selectedHotelDisplayName }}</span>
            </div>
            <div v-if="formData.clienteNombre?.trim()" class="detail-row">
              <span class="detail-label">Cliente:</span>
              <span class="detail-value">{{ formData.clienteNombre }}</span>
            </div>
            <div v-if="formData.numeroHabitacion?.trim()" class="detail-row">
              <span class="detail-label">Habitación:</span>
              <span class="detail-value">{{ formData.numeroHabitacion }}</span>
            </div>
            <div
              v-if="
                formData.fechaHoraInicio &&
                summaryFormattedDate &&
                summaryFormattedDate !== 'Sin fecha'
              "
              class="detail-row"
            >
              <span class="detail-label">Fecha:</span>
              <span class="detail-value">{{ summaryFormattedDate }}</span>
            </div>
            <div v-if="selectedTimeOnly" class="detail-row">
              <span class="detail-label">Hora:</span>
              <span class="detail-value">{{ selectedTimeOnly }}</span>
            </div>
            <div
              v-if="summaryPersonas && summaryPersonas !== 'Sin participantes'"
              class="detail-row"
            >
              <span class="detail-label">Personas:</span>
              <span class="detail-value">{{ summaryPersonas }}</span>
            </div>
            <div
              v-if="mobileCitaVentaPreview && mobileCitaVentaPreview !== 'Sin cita'"
              class="detail-row"
            >
              <span class="detail-label">Cita Venta:</span>
              <span class="detail-value">{{ mobileCitaVentaPreview }}</span>
            </div>
            <div
              v-if="mobileCheckoutPreview && mobileCheckoutPreview !== 'Sin checkout'"
              class="detail-row"
            >
              <span class="detail-label">Checkout:</span>
              <span class="detail-value">{{ mobileCheckoutPreview }}</span>
            </div>
            <div v-if="formData.concepto?.trim()" class="detail-row">
              <span class="detail-label">Motivo:</span>
              <span class="detail-value">{{ formData.concepto }}</span>
            </div>
          </div>
        </template>

        <!-- Barra toggle VER / OCULTAR FOTÓGRAFOS -->
        <div
          class="photographer-toggle-bar"
          :class="{
            'is-open': showPhotographersList,
            'is-selected-toggle': !!selectedPhotographer,
          }"
          role="button"
          tabindex="0"
          @click="togglePhotographersList"
        >
          <span class="toggle-text">
            {{ showPhotographersList ? 'OCULTAR FOTÓGRAFOS' : 'VER FOTÓGRAFOS' }}
          </span>
          <el-icon class="toggle-icon" :class="{ 'is-rotated': showPhotographersList }">
            <ChevronDown :size="18" />
          </el-icon>
        </div>

        <!-- Lista colapsable de fotógrafos -->
        <el-collapse-transition>
          <div v-if="showPhotographersList" class="photographer-dropdown-container">
            <div v-if="!formData.hotelId" class="photographer-empty-state">
              Selecciona primero un hotel para ver sus fotógrafos.
            </div>
            <div v-else-if="photographers.length === 0" class="photographer-empty-state">
              No hay fotógrafos activos en este hotel.
            </div>
            <div v-else class="photographer-dropdown-list">
              <div
                v-for="photographer in photographers"
                :key="photographer.id"
                class="photographer-pick-item"
                :class="{
                  'is-selected': String(formData.fotografoId) === String(photographer.id),
                  'is-disabled': getPhotographerStatus(photographer.id).disabled,
                }"
                @click="
                  !getPhotographerStatus(photographer.id).disabled &&
                  handleSelectPhotographer(photographer.id)
                "
              >
                <div class="pick-item-left">
                  <el-avatar
                    :src="photographer.imagen || undefined"
                    :size="36"
                    :style="{
                      backgroundColor: getUserBgColor(photographer.color),
                      color: '#ffffff',
                      fontWeight: '600',
                      fontSize: '11px',
                    }"
                    class="pick-photographer-avatar"
                  >
                    {{ getUserInitials(photographer.nombre, photographer.apellidos) }}
                  </el-avatar>

                  <div class="pick-item-info">
                    <div class="pick-item-client">
                      {{ photographer.nombre }} {{ photographer.apellidos }}
                    </div>
                    <div class="pick-item-meta">
                      <span
                        class="photographer-status-tag"
                        :class="getPhotographerStatus(photographer.id).tagClass"
                      >
                        {{ getPhotographerStatus(photographer.id).label }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="pick-item-tags">
                  <el-tag size="small" type="success" effect="light">Fotógrafo</el-tag>
                </div>
              </div>
            </div>
          </div>
        </el-collapse-transition>
      </div>

      <!-- 4 Otros datos -->
      <div class="mobile-card-section-label mobile-card-section-label--details">
        <span class="step-badge-num">4</span>
        <span>Otros datos</span>
      </div>

      <!-- Concepto / Motivo de la Sesión y Notas Adicionales -->
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

      <!-- 5 Estado de la cita -->
      <div class="mobile-card-section-label mobile-card-section-label--status">
        <span class="step-badge-num">5</span>
        <span>Estado de la cita</span>
      </div>

      <!-- Selector de Estado de la Cita (3 arriba + 1 abajo) -->
      <div class="mobile-status-section">
        <div class="status-radio-container">
          <el-radio-group
            v-model="formData.estado"
            class="status-radio-group"
            size="large"
            :disabled="isReadOnly"
          >
            <el-radio-button
              v-for="opt in estadoOptions"
              :key="opt.value"
              :value="opt.value"
              :class="['status-radio-btn', `status-radio-btn--${opt.value.toLowerCase()}`]"
            >
              <span class="status-btn-content">
                <el-icon class="status-btn-icon"><component :is="opt.icon" /></el-icon>
                <span>{{ opt.label }}</span>
              </span>
            </el-radio-button>
          </el-radio-group>
        </div>
      </div>
    </div>

    <!-- Barra de acciones inferior móvil (Sticky Bottom Bar) -->
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
        :loading="isSaving"
        :disabled="isReadOnly"
        @click="handleSave"
      >
        <span>{{ isEditing ? 'Guardar' : 'Agendar' }}</span>
        <el-icon class="btn-icon-right">
          <Check :size="18" />
        </el-icon>
      </el-button>
    </div>
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

.mobile-step-body {
  width: 100%;
}

.mobile-client-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.mobile-client-form :deep(.el-form-item) {
  margin-bottom: 0.65rem;
}

.mobile-client-form :deep(.el-form-item__label) {
  margin-bottom: 4px;
  padding-bottom: 0;
  line-height: 1.25;
}

.mobile-client-form
  :deep(.el-form-item.is-required:not(.is-no-asterisk) > .el-form-item__label:before),
.mobile-client-form
  :deep(
    .el-form-item.is-required:not(.is-no-asterisk)
      .el-form-item__label-wrap
      > .el-form-item__label:before
  ) {
  display: none !important;
  content: '' !important;
}

.mobile-client-form
  :deep(.el-form-item.is-required:not(.is-no-asterisk) > .el-form-item__label:after),
.mobile-client-form
  :deep(
    .el-form-item.is-required:not(.is-no-asterisk)
      .el-form-item__label-wrap
      > .el-form-item__label:after
  ) {
  content: ' *' !important;
  color: var(--el-color-danger, #f56c6c) !important;
  margin-left: 2px !important;
  font-weight: bold;
}

.mobile-form-row-pax {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
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
  padding: 0.35rem 0 0.2rem 0;
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
  gap: 0.5rem;
  width: 100%;
}

.mobile-form-extra-fields :deep(.el-form-item) {
  margin-bottom: 0.65rem;
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

/* Schedule & Availability Accordion Styles in Step 1 */
.mobile-schedule-accordion {
  border: none;
  background: transparent;
  display: block;
  margin-top: 1rem;
}

.mobile-schedule-accordion :deep(.el-collapse-item:first-child .el-collapse-item__header) {
  border-top: 1px solid var(--toolbar-border, #e2e8f0);
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
  background: linear-gradient(180deg, rgba(255, 255, 255, 0) 50%, rgb(234 244 254 / 90%) 100%);
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
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
  width: 100% !important;
  margin: 0 auto;
}

.inline-calendar-picker :deep(.el-picker-panel__body-wrapper),
.inline-calendar-picker :deep(.el-picker-panel__body),
.inline-calendar-picker :deep(.el-picker-panel__content) {
  width: 100% !important;
  margin: 0 auto !important;
  padding: 0 !important;
}

.inline-calendar-picker :deep(.el-date-picker__prev-year-btn),
.inline-calendar-picker :deep(.el-date-picker__next-year-btn),
.inline-calendar-picker :deep(.d-arrow-left),
.inline-calendar-picker :deep(.d-arrow-right),
.inline-calendar-picker :deep(.el-date-picker__prev-btn.d-arrow-left),
.inline-calendar-picker :deep(.el-date-picker__next-btn.d-arrow-right) {
  display: none !important;
}

.inline-calendar-picker :deep(.el-date-picker__header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 8px 10px 16px 10px !important;
}

.inline-calendar-picker :deep(.el-date-picker__header-label) {
  font-size: 1.15rem !important;
  font-weight: 700 !important;
  color: var(--heading-color, #0f172a) !important;
  letter-spacing: 0.02em;
}

.inline-calendar-picker :deep(.el-date-picker__prev-btn),
.inline-calendar-picker :deep(.el-date-picker__next-btn) {
  font-size: 1.1rem !important;
  color: var(--nav-link-color, #64748b) !important;
}

.inline-calendar-picker :deep(.el-date-table) {
  font-size: 0.95rem !important;
  width: 100% !important;
}

.inline-calendar-picker :deep(.el-date-table th) {
  font-size: 0.85rem !important;
  font-weight: 600 !important;
  color: var(--nav-link-color, #64748b) !important;
  padding: 6px 0 10px 0 !important;
  text-transform: lowercase;
}

.inline-calendar-picker :deep(.el-date-table td) {
  padding: 4px 0 !important;
  height: 42px !important;
}

.inline-calendar-picker :deep(.el-date-table-cell) {
  position: relative;
  height: 38px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.inline-calendar-picker :deep(.el-date-table-cell__text) {
  width: 36px !important;
  height: 36px !important;
  line-height: 36px !important;
  font-size: 0.95rem !important;
  font-weight: 600 !important;
  border-radius: 50% !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.inline-calendar-picker :deep(.el-date-table td.today .el-date-table-cell__text) {
  font-weight: 800 !important;
  color: var(--el-color-primary, #3b82f6) !important;
}

.inline-calendar-picker :deep(.el-date-table td.current:not(.disabled) .el-date-table-cell__text) {
  background-color: var(--el-color-primary, #3b82f6) !important;
  color: #ffffff !important;
  font-weight: 700 !important;
}

.inline-calendar-picker
  :deep(.el-date-table td.available:not(.disabled):not(.current) .el-date-table-cell__text) {
  color: var(--heading-color, #0f172a);
}

.inline-calendar-picker :deep(.el-date-table td.prev-month .el-date-table-cell__text),
.inline-calendar-picker :deep(.el-date-table td.next-month .el-date-table-cell__text) {
  color: var(--el-text-color-placeholder, #cbd5e1) !important;
  opacity: 0.45;
}

html.dark .inline-calendar-picker :deep(.el-date-picker__header-label) {
  color: var(--heading-color, #ffffff) !important;
}

html.dark
  .inline-calendar-picker
  :deep(.el-date-table td.available:not(.disabled):not(.current) .el-date-table-cell__text) {
  color: var(--heading-color, #ffffff) !important;
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
  background: #fff;
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

.schedule-section-title {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
}

.mobile-card-section-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
  margin-top: 0.25rem;
  margin-bottom: 0.65rem;
}

.mobile-card-section-label--schedule {
  margin-top: 2.75rem;
  margin-bottom: 0.65rem;
}

.mobile-card-section-label--photographer {
  margin-top: 2.75rem;
  margin-bottom: 0.65rem;
}

.mobile-card-section-label--details {
  margin-top: 2.75rem;
  margin-bottom: 0.65rem;
}

.mobile-card-section-label--status {
  margin-top: 2.75rem;
  margin-bottom: 0.65rem;
}

.required-asterisk {
  color: var(--el-color-danger, #f56c6c);
  margin-left: 3px;
  font-weight: 700;
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

/* Card Selector de Fotógrafos Desplegable */
.mobile-photographer-selector-card {
  background: var(--toolbar-bg, #ffffff);
  border: 1px solid var(--toolbar-border, #e2e8f0);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  transition:
    background-color 0.25s ease,
    box-shadow 0.25s ease;
}

.mobile-photographer-selector-card.is-photographer-colored {
  border: none;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
  color: #ffffff;
}

.photographer-card-main {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 1rem 1rem;
}

.photographer-avatar-circle {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.photographer-default-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(64, 158, 255, 0.12);
  border: 1px solid rgba(64, 158, 255, 0.25);
  color: #409eff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.photographer-header-avatar-colored {
  border: 2px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.photographer-info-box {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.photographer-badge-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.85);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  line-height: 1.2;
}

.photographer-title-label {
  font-size: 1rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
  line-height: 1.25;
}

.photographer-title-label.text-white {
  color: #ffffff;
}

.photographer-subtitle-label {
  font-size: 0.8rem;
  color: var(--nav-link-color, #64748b);
  margin-top: 0.2rem;
}

.photographer-subtitle-label.text-white-subtle {
  color: rgba(255, 255, 255, 0.85);
}

.photographer-selected-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.25);
  margin: 0 1rem 0.85rem 1rem;
}

.photographer-selected-details {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding: 0 1rem 0.95rem 1rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
  line-height: 1.3;
}

.detail-label {
  color: rgba(255, 255, 255, 0.82);
  font-weight: 500;
}

.detail-value {
  color: #ffffff;
  font-weight: 700;
  text-align: right;
}

.photographer-toggle-bar {
  padding: 0.8rem 1rem;
  border-top: 1px solid var(--toolbar-border, #f1f5f9);
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  background: var(--toolbar-bg, #ffffff);
  transition: background 0.15s ease;
}

.photographer-toggle-bar:active {
  background: var(--el-fill-color-light, #f8fafc);
}

.photographer-toggle-bar.is-selected-toggle {
  background: rgba(0, 0, 0, 0.1);
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.photographer-toggle-bar.is-selected-toggle .toggle-text,
.photographer-toggle-bar.is-selected-toggle .toggle-icon {
  color: rgba(255, 255, 255, 0.92);
}

.toggle-text {
  font-size: 0.78rem;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.toggle-icon {
  color: #64748b;
  font-size: 1.1rem;
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.toggle-icon.is-rotated {
  transform: rotate(180deg);
}

.photographer-dropdown-container {
  padding: 0.5rem 1rem 1rem 1rem;
  border-top: 1px dashed var(--toolbar-border, #e2e8f0);
  background: var(--toolbar-bg, #ffffff);
}

.photographer-dropdown-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 280px;
  overflow-y: auto;
}

.photographer-pick-item {
  padding: 0.75rem 0.85rem;
  border-radius: 10px;
  border: 1px solid var(--toolbar-border, #e2e8f0);
  background: var(--toolbar-bg, #ffffff);
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.photographer-pick-item:active {
  transform: scale(0.99);
}

.photographer-pick-item.is-selected {
  border-color: var(--el-color-primary, #3b82f6);
  background: rgba(59, 130, 246, 0.06);
}

.photographer-pick-item.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: var(--el-fill-color-lighter, #f8fafc);
}

.photographer-pick-item.is-disabled:active {
  transform: none;
}

.photographer-status-tag {
  font-size: 0.72rem;
  font-weight: 600;
  display: inline-block;
}

.photographer-status-tag.tag-available {
  color: #10b981;
}

.photographer-status-tag.tag-busy {
  color: #f56c6c;
}

.photographer-status-tag.tag-assigned {
  color: var(--el-color-primary, #3b82f6);
}

.pick-photographer-avatar {
  flex-shrink: 0;
  border: 1px solid var(--toolbar-border, #e2e8f0);
}

.pick-item-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
  flex: 1;
}

.pick-item-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.pick-item-client {
  font-weight: 600;
  font-size: 0.88rem;
  color: var(--heading-color, #0f172a);
}

.pick-item-meta {
  font-size: 0.78rem;
  color: var(--nav-link-color, #64748b);
  margin-top: 2px;
}

.pick-item-tags {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.photographer-empty-state {
  font-size: 0.85rem;
  color: var(--nav-link-color, #64748b);
  text-align: center;
  padding: 1rem 0;
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
  gap: 0.85rem;
}

.mobile-details-form :deep(.el-form-item) {
  margin-bottom: 0.65rem;
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

/* Estado de la Cita (Radio Group) */
.mobile-status-section {
  margin-top: 0.25rem;
  margin-bottom: 0.5rem;
}

.status-radio-container {
  display: flex;
  justify-content: center;
  width: 100%;
}

.status-radio-group {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  width: 100%;
}

:deep(.status-radio-btn) {
  display: flex;
}

:deep(.status-radio-btn .el-radio-button__inner) {
  width: 100%;
  height: 100%;
  border-radius: 12px !important;
  border: 1px solid var(--toolbar-border, #e2e8f0) !important;
  box-shadow: none !important;
  padding: 1rem 0.4rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  font-size: 0.8rem;
  font-weight: 700;
  background: var(--toolbar-bg, #ffffff);
  color: var(--nav-link-color, #475569);
}

:deep(.status-radio-btn--completada) {
  grid-column: 1 / -1;
}

:deep(.status-radio-btn--completada .el-radio-button__inner) {
  flex-direction: row;
  padding: 0.85rem 1.25rem;
  font-size: 0.95rem;
}

.status-btn-content {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
}

:deep(.status-radio-btn--completada .status-btn-content) {
  flex-direction: row;
  gap: 0.6rem;
}

.status-btn-icon {
  font-size: 1.4rem;
}

/* Colores personalizados por estado */
:deep(.status-radio-btn--programada.is-active .el-radio-button__inner) {
  background-color: #409eff !important;
  border-color: #409eff !important;
  color: #ffffff !important;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3) !important;
}

:deep(.status-radio-btn--completada.is-active .el-radio-button__inner) {
  background-color: #67c23a !important;
  border-color: #67c23a !important;
  color: #ffffff !important;
  box-shadow: 0 4px 12px rgba(103, 194, 58, 0.3) !important;
}

:deep(.status-radio-btn--no_show.is-active .el-radio-button__inner) {
  background-color: #e6a23c !important;
  border-color: #e6a23c !important;
  color: #ffffff !important;
  box-shadow: 0 4px 12px rgba(230, 162, 60, 0.3) !important;
}

:deep(.status-radio-btn--cancelada.is-active .el-radio-button__inner) {
  background-color: #f56c6c !important;
  border-color: #f56c6c !important;
  color: #ffffff !important;
  box-shadow: 0 4px 12px rgba(245, 108, 108, 0.3) !important;
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

.btn-icon-right {
  display: inline-flex;
  align-items: center;
  margin-left: 0.2rem;
}

/* Dark Mode Overrides */
html.dark .session-form-mobile {
  background-color: var(--app-bg, #121212);
}

html.dark .back-btn {
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

html.dark .mobile-photographer-selector-card {
  background: var(--toolbar-bg, #1d1e1f);
  border-color: var(--toolbar-border, #363637);
}

html.dark .photographer-toggle-bar {
  background: var(--toolbar-bg, #1d1e1f);
  border-color: var(--toolbar-border, #363637);
}

html.dark .photographer-dropdown-container {
  background: var(--toolbar-bg, #1d1e1f);
  border-color: var(--toolbar-border, #363637);
}

html.dark .photographer-pick-item {
  background: var(--toolbar-bg, #1d1e1f);
  border-color: var(--toolbar-border, #363637);
}

html.dark .photographer-pick-item.is-disabled {
  background: rgba(255, 255, 255, 0.02);
  border-color: var(--toolbar-border, #363637);
}

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
