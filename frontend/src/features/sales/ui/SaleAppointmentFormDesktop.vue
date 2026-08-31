<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { SaleAppointmentFormContext } from '../composables/useSaleAppointmentForm'
import {
  ArrowLeft,
  Check,
  Close,
  Warning,
  Camera,
  Money,
  WarnTriangleFilled,
  User,
} from '@element-plus/icons-vue'
import { ChevronDown } from '@lucide/vue'
import { getUserInitials, getUserBgColor } from '@/features/users/utils/user-avatar'

const props = defineProps<{
  form: SaleAppointmentFormContext
}>()

const router = useRouter()

const {
  formData,
  sessionInfo,
  isEditing,
  isSaving,
  isReadOnly,
  conflicts,
  availableSessions,
  excludedSessionsCount,
  photographerUser,
  photographerName,
  sellers,
  selectedSeller,
  getSellerStatus,
  estadoOptions,
  isSubmitDisabled,
  selectedDateOnly,
  selectedTimeOnly,
  timeSlots,
  getCitaVentaCellClassName,
  disabledPastDates,
  formatDateTime,
  handleGoBack,
  handleSave,
  userStore,
  saleStore,
  userHotels,
  citaId,
} = props.form

const showSessionsList = ref(!isEditing.value && !formData.value.sesionId)

function getPhotographer(fotografoId?: string | null) {
  if (!fotografoId) return null
  return userStore.users.find((u) => String(u.id) === String(fotografoId)) || null
}

function formatSessionDate(dateStr?: string | null): string {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    const months = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ]
    const weekday = weekdays[d.getDay()]
    const day = d.getDate()
    const month = months[d.getMonth()]
    const year = d.getFullYear()
    return `${weekday}, ${day} ${month}, ${year}`
  } catch {
    return dateStr
  }
}

function formatSessionTime(dateStr?: string | null): string {
  if (!dateStr) return '-'
  try {
    const parts = dateStr.split('T')
    return (parts[1] ?? dateStr.slice(11)).slice(0, 5)
  } catch {
    return dateStr
  }
}

function formatPersonas(adultos: number = 1, ninos: number = 0): string {
  const total = (adultos || 0) + (ninos || 0)
  return `${total} (${adultos || 0} ad., ${ninos || 0} niños)`
}

function toggleSessionsList() {
  if (isReadOnly.value) return
  showSessionsList.value = !showSessionsList.value
}

function selectSession(sessionId: number) {
  if (isReadOnly.value) return
  if (Number(formData.value.sesionId) === Number(sessionId)) {
    formData.value.sesionId = null
  } else {
    formData.value.sesionId = sessionId
    showSessionsList.value = false
  }
}

const showSellersList = ref(false)

function toggleSellersList() {
  if (isReadOnly.value) return
  showSellersList.value = !showSellersList.value
}

function selectSeller(sellerId: string | null) {
  if (isReadOnly.value) return
  if (sellerId && getSellerStatus(sellerId).disabled) return
  if (formData.value.vendedorId === sellerId) {
    formData.value.vendedorId = null
  } else {
    formData.value.vendedorId = sellerId
    showSellersList.value = false
  }
}

const isSellerPhotographer = computed(() => {
  if (!selectedSeller.value) return false
  const pName = (selectedSeller.value.perfilNombre || '').toUpperCase()
  const rCode = (selectedSeller.value.roleCode || '').toUpperCase()
  return (
    selectedSeller.value.isFotografo ||
    rCode === 'FOTOGRAFO' ||
    pName.includes('FOTÓGRAFO') ||
    pName.includes('FOTOGRAFO')
  )
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
  if (isReadOnly.value) return
  const hour = timeOrHour.includes(':') ? timeOrHour.split(':')[0] : timeOrHour
  const min = selectedMinuteOnly.value || '00'
  selectedTimeOnly.value = `${hour}:${min}`
}

function selectMinute(min: string) {
  if (isReadOnly.value) return
  const hour = selectedHourOnly.value || '10'
  selectedTimeOnly.value = `${hour}:${min}`
}

// Mapa de cantidad de citas de venta por hora para la fecha de venta seleccionada
const salesCountByHour = computed<Record<string, number>>(() => {
  const counts: Record<string, number> = {}
  const targetDate = selectedDateOnly.value
  if (!targetDate) return counts

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

    const cDate = String(c.fechaHoraCita).slice(0, 10)
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

const formattedSelectedSaleDateTime = computed(() => {
  const dateStr = selectedDateOnly.value
  if (!dateStr) return ''
  const formattedDate = formatSessionDate(dateStr)
  if (selectedTimeOnly.value) {
    return `${formattedDate}, ${selectedTimeOnly.value}`
  }
  return formattedDate
})
</script>

<template>
  <div class="sale-form-container">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" circle class="back-btn" @click="handleGoBack" />
        <div>
          <h1 class="page-title">
            {{ isEditing ? 'Editar Cita de Venta' : 'Nueva Cita de Venta' }}
          </h1>
        </div>
      </div>
    </div>

    <!-- Layout de 2 columnas -->
    <div class="sale-form-layout">
      <!-- Columna Izquierda: Formulario Principal -->
      <div class="form-main-col">
        <!-- Read-only lock banner -->
        <el-alert v-if="isReadOnly" type="warning" :closable="false" show-icon class="lock-banner">
          Para editar esta cita contacta con tu supervisor o gerente de area.
        </el-alert>

        <!-- Conflict banner -->
        <el-alert
          v-if="conflicts.length > 0"
          type="warning"
          :closable="false"
          show-icon
          :icon="Warning"
          class="conflict-banner"
        >
          <template #title>
            Hay {{ conflicts.length }} cita(s) de venta en la misma franja horaria (±1h)
          </template>
          <div v-for="c in conflicts" :key="c.id" class="conflict-item">
            {{ c.clienteNombre }} — {{ c.fechaHoraCita }}
          </div>
        </el-alert>

        <!-- Main Form -->
        <el-card class="form-card" shadow="never">
          <template #header>
            <div class="card-header-with-date">
              <span class="ref-card-title">
                <el-icon :size="24"><Money /></el-icon>
                Cita venta fotos
              </span>
              <div v-if="formattedSelectedSaleDateTime" class="header-datetime-preview">
                <el-tag effect="plain" round size="large" class="header-datetime-tag">
                  {{ formattedSelectedSaleDateTime }}
                </el-tag>
              </div>
            </div>
          </template>
          <el-form
            :model="formData"
            label-position="top"
            size="default"
            class="sale-form"
            :disabled="isReadOnly"
          >
            <!-- Grid Principal: Calendario (Izq) + Horario e Inputs de Venta (Der) -->
            <div class="schedule-main-grid">
              <!-- Columna Izquierda: Calendario -->
              <div class="schedule-calendar-col">
                <div class="calendar-panel-box">
                  <div class="desktop-picker-panel-wrapper inline-calendar-picker">
                    <el-date-picker-panel
                      :key="`sale-cal-${formData.hotelId || 'all'}-${saleStore.citasVenta.length}`"
                      :border="false"
                      v-model="selectedDateOnly"
                      type="date"
                      value-format="YYYY-MM-DD"
                      date-format="YYYY-MM-DD"
                      :disabled="isReadOnly"
                      :disabled-date="disabledPastDates"
                      :cell-class-name="getCitaVentaCellClassName"
                    />
                  </div>
                </div>
              </div>

              <!-- Columna Derecha: Selección de Horario + Inputs de Venta -->
              <div class="schedule-details-col">
                <!-- 1. SELECCIONA HORARIO -->
                <div class="schedule-section-block">
                  <div class="schedule-section-header-row">
                    <div class="schedule-subheading">
                      <span class="step-badge">1</span>
                      <span>SELECCIONA HORARIO</span>
                    </div>
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
                          { active: selectedHourOnly === time.split(':')[0] },
                        ]"
                        :disabled="isReadOnly"
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
                      :key="`cita-desktop-min-${min}`"
                      type="button"
                      class="time-slot-btn minute-slot-btn"
                      :class="{ active: selectedMinuteOnly === min && !!selectedHourOnly }"
                      :disabled="isReadOnly"
                      @click="selectMinute(min)"
                    >
                      {{ min }}
                    </button>
                  </div>
                </div>

                <!-- Inputs de Fotos Vendidas y Total USD (Debajo de las horas) -->
                <div class="sales-inputs-row">
                  <el-form-item label="Nº de Fotos Vendidas *" required>
                    <el-input-number
                      v-model="formData.numFotosVendidas"
                      :min="0"
                      :step="1"
                      style="width: 100%"
                      placeholder="0"
                    />
                  </el-form-item>

                  <el-form-item label="Total en USD *" required>
                    <el-input-number
                      v-model="formData.totalVentaUsd"
                      :min="0"
                      :step="0.01"
                      :precision="2"
                      style="width: 100%"
                      placeholder="0.00"
                    >
                      <template #suffix>
                        <span>$ (USD)</span>
                      </template>
                    </el-input-number>
                  </el-form-item>
                </div>
              </div>
            </div>

            <!-- Notes -->
            <el-form-item label="Notas">
              <el-input
                v-model="formData.notas"
                type="textarea"
                :rows="5"
                placeholder="Notas sobre la cita de venta..."
              />
            </el-form-item>

            <!-- Actions -->
            <div class="form-actions">
              <el-button
                type="primary"
                :icon="Check"
                :loading="isSaving"
                :disabled="isSubmitDisabled"
                @click="handleSave"
              >
                {{ isEditing ? 'Guardar Cambios' : 'Agendar Cita' }}
              </el-button>
              <el-button :icon="Close" @click="handleGoBack">Cancelar</el-button>
            </div>
          </el-form>
        </el-card>
      </div>

      <!-- Columna Derecha: Sidebar con Sesión Asociada y Estado de la Cita -->
      <div class="form-sidebar-col">
        <!-- Selector de Sesión Fotográfica Asociada (Card con lista desplegable) -->
        <div
          class="desktop-session-selector-card"
          :class="{ 'is-session-selected': !!formData.sesionId }"
          :style="
            formData.sesionId
              ? { backgroundColor: getUserBgColor(photographerUser?.color) || '#8b5cf6' }
              : {}
          "
        >
          <!-- Estado A: Sin Sesión Seleccionada -->
          <div v-if="!formData.sesionId" class="session-card-main">
            <div class="session-default-circle">
              <el-icon :size="22"><Camera /></el-icon>
            </div>
            <div class="session-info-box">
              <span class="session-category-label">SIN SESIÓN ASOCIADA</span>
              <span class="session-title-label">Elige una sesión de fotos</span>
            </div>
          </div>

          <!-- Estado B: Sesión Seleccionada (Color del fotógrafo + Datos de la sesión) -->
          <div v-else class="session-card-selected-content">
            <div class="session-selected-header">
              <div class="session-selected-avatar-wrapper">
                <el-avatar
                  v-if="photographerUser"
                  :src="photographerUser.imagen || undefined"
                  :size="46"
                  :style="{
                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                    color: '#ffffff',
                    fontWeight: '700',
                    fontSize: '14px',
                  }"
                  class="session-photographer-avatar"
                >
                  {{ getUserInitials(photographerUser.nombre, photographerUser.apellidos) }}
                </el-avatar>
                <div v-else class="session-selected-placeholder-avatar">
                  <el-icon :size="22"><Camera /></el-icon>
                </div>
              </div>

              <div class="session-selected-titles">
                <span class="session-selected-badge-label">FOTÓGRAFO ASIGNADO</span>
                <span class="session-selected-name">{{ photographerName }}</span>
              </div>

              <el-button
                type="primary"
                size="small"
                class="session-view-action-btn-selected"
                @click.stop="router.push(`/agenda/${formData.sesionId}/editar`)"
              >
                Ver sesión
              </el-button>
            </div>

            <div class="session-selected-divider" />

            <div class="session-selected-details">
              <div class="detail-row">
                <span class="detail-label">Hotel:</span>
                <span class="detail-value">{{ sessionInfo.hotelNombre }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Cliente:</span>
                <span class="detail-value">{{ sessionInfo.clienteNombre }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Fecha:</span>
                <span class="detail-value">
                  {{ formatSessionDate(sessionInfo.fechaHoraInicio) }}
                </span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Hora:</span>
                <span class="detail-value">
                  {{ formatSessionTime(sessionInfo.fechaHoraInicio) }}
                </span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Personas:</span>
                <span class="detail-value">
                  {{ formatPersonas(sessionInfo.numAdultos, sessionInfo.numNinos) }}
                </span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Motivo:</span>
                <span class="detail-value">{{ sessionInfo.concepto || 'Otro' }}</span>
              </div>
            </div>
          </div>

          <!-- Barra toggle VER SESIONES -->
          <div
            class="session-toggle-bar"
            :class="{ 'is-open': showSessionsList, 'is-selected-toggle': !!formData.sesionId }"
            role="button"
            tabindex="0"
            @click="toggleSessionsList"
          >
            <span class="toggle-text">
              {{ showSessionsList ? 'OCULTAR SESIONES' : 'VER SESIONES' }}
            </span>
            <el-icon class="toggle-icon" :class="{ 'is-rotated': showSessionsList }">
              <ChevronDown :size="18" />
            </el-icon>
          </div>

          <!-- Lista colapsable de sesiones -->
          <el-collapse-transition>
            <div v-if="showSessionsList" class="session-dropdown-container">
              <div v-if="availableSessions.length === 0" class="session-empty-state">
                No hay sesiones fotográficas pendientes de agendar cita de venta.
              </div>
              <div v-else class="session-dropdown-list">
                <div
                  v-for="session in availableSessions"
                  :key="session.id"
                  class="session-pick-item"
                  :class="{ 'is-selected': Number(formData.sesionId) === Number(session.id) }"
                  @click="selectSession(session.id)"
                >
                  <div class="pick-item-left">
                    <el-avatar
                      v-if="getPhotographer(session.fotografoId)"
                      :src="getPhotographer(session.fotografoId)?.imagen || undefined"
                      :size="36"
                      :style="{
                        backgroundColor: getUserBgColor(
                          getPhotographer(session.fotografoId)?.color,
                        ),
                        color: '#ffffff',
                        fontWeight: '600',
                        fontSize: '11px',
                      }"
                      class="pick-photographer-avatar"
                    >
                      {{
                        getUserInitials(
                          getPhotographer(session.fotografoId)?.nombre,
                          getPhotographer(session.fotografoId)?.apellidos,
                        )
                      }}
                    </el-avatar>
                    <div v-else class="pick-photographer-placeholder">
                      <el-icon :size="16"><Camera /></el-icon>
                    </div>

                    <div class="pick-item-info">
                      <div class="pick-item-client">{{ session.clienteNombre }}</div>
                      <div class="pick-item-meta">
                        <span>{{ formatDateTime(session.fechaHoraInicio) }}</span>
                        <span v-if="session.numeroHabitacion">
                          · Hab. {{ session.numeroHabitacion }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div class="pick-item-tags">
                    <el-tag
                      size="small"
                      :type="session.estado === 'COMPLETADA' ? 'success' : 'primary'"
                      effect="light"
                    >
                      {{ session.estado === 'COMPLETADA' ? 'Completada' : 'Programada' }}
                    </el-tag>
                  </div>
                </div>

                <div v-if="excludedSessionsCount > 0" class="session-excluded-note">
                  <el-icon style="vertical-align: middle; margin-right: 4px; color: #e6a23c">
                    <WarnTriangleFilled />
                  </el-icon>
                  {{ excludedSessionsCount }} sesión(es) canceladas o no-show no se muestran.
                </div>
              </div>
            </div>
          </el-collapse-transition>
        </div>

        <!-- Selector de Vendedor Estilo Card (Desktop) -->
        <div
          class="desktop-seller-selector-card"
          :class="{ 'is-seller-colored': isSellerPhotographer }"
          :style="
            isSellerPhotographer
              ? { backgroundColor: getUserBgColor(selectedSeller?.color) || '#8b5cf6' }
              : {}
          "
        >
          <div class="seller-card-main">
            <div class="seller-avatar-circle">
              <el-avatar
                v-if="selectedSeller"
                :src="selectedSeller.imagen || undefined"
                :size="44"
                :style="{
                  backgroundColor: isSellerPhotographer
                    ? 'rgba(255, 255, 255, 0.25)'
                    : getUserBgColor(selectedSeller.color),
                  color: '#ffffff',
                  fontWeight: '600',
                  fontSize: '13px',
                }"
                :class="
                  isSellerPhotographer ? 'seller-header-avatar-colored' : 'seller-header-avatar'
                "
              >
                {{ getUserInitials(selectedSeller.nombre, selectedSeller.apellidos) }}
              </el-avatar>
              <div v-else class="seller-default-circle">
                <el-icon :size="22"><User /></el-icon>
              </div>
            </div>
            <div class="seller-info-box">
              <span
                class="seller-subtitle-label"
                :class="{ 'text-white-subtle': isSellerPhotographer }"
              >
                Vendedor
              </span>
              <span class="seller-title-label" :class="{ 'text-white': isSellerPhotographer }">
                {{
                  selectedSeller
                    ? `${selectedSeller.nombre} ${selectedSeller.apellidos}`
                    : 'Selecciona vendedor'
                }}
              </span>
            </div>
          </div>

          <!-- Barra toggle VER VENDEDORES -->
          <div
            class="seller-toggle-bar"
            :class="{ 'is-open': showSellersList, 'is-selected-toggle': isSellerPhotographer }"
            role="button"
            tabindex="0"
            @click="toggleSellersList"
          >
            <span class="toggle-text">
              {{ showSellersList ? 'OCULTAR VENDEDORES' : 'VER VENDEDORES' }}
            </span>
            <el-icon class="toggle-icon" :class="{ 'is-rotated': showSellersList }">
              <ChevronDown :size="18" />
            </el-icon>
          </div>

          <!-- Lista colapsable de vendedores -->
          <el-collapse-transition>
            <div v-if="showSellersList" class="seller-dropdown-container">
              <div v-if="!formData.hotelId" class="seller-empty-state">
                Selecciona primero una sesión de fotos para ver los vendedores de su hotel.
              </div>
              <div v-else-if="sellers.length === 0" class="seller-empty-state">
                No hay agendadores o fotógrafos asignados a este hotel.
              </div>
              <div v-else class="seller-dropdown-list">
                <div
                  v-for="seller in sellers"
                  :key="seller.id"
                  class="seller-pick-item"
                  :class="{
                    'is-selected': String(formData.vendedorId) === String(seller.id),
                    'is-disabled': getSellerStatus(seller.id).disabled,
                  }"
                  @click="!getSellerStatus(seller.id).disabled && selectSeller(seller.id)"
                >
                  <div class="pick-item-left">
                    <el-avatar
                      :src="seller.imagen || undefined"
                      :size="36"
                      :style="{
                        backgroundColor: getUserBgColor(seller.color),
                        color: '#ffffff',
                        fontWeight: '600',
                        fontSize: '11px',
                      }"
                      class="pick-seller-avatar"
                    >
                      {{ getUserInitials(seller.nombre, seller.apellidos) }}
                    </el-avatar>

                    <div class="pick-item-info">
                      <div class="pick-item-client">{{ seller.nombre }} {{ seller.apellidos }}</div>
                      <div class="pick-item-meta">
                        <el-tag
                          size="small"
                          :type="
                            seller.perfilNombre.toUpperCase().includes('AGENDADOR')
                              ? 'primary'
                              : 'success'
                          "
                          effect="light"
                          class="seller-role-tag"
                        >
                          {{ seller.perfilNombre }}
                        </el-tag>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </el-collapse-transition>
        </div>

        <!-- Tarjeta de Estado de la Cita -->
        <el-card class="status-card" shadow="never">
          <div class="status-card-header">
            <span class="status-card-title">ESTADO DE LA CITA</span>
          </div>
          <div class="status-grid">
            <button
              v-for="opt in estadoOptions"
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
.sale-form-container {
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
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
  margin: 0;
}

.sale-form-layout {
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

.lock-banner,
.conflict-banner {
  margin-bottom: 1rem;
}

.conflict-item {
  font-size: 0.85rem;
  color: var(--el-text-color-secondary);
  margin-top: 0.25rem;
}

.ref-card-title {
  font-weight: 600;
  font-size: 0.95rem;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.form-card {
  border-radius: var(--el-card-border-radius, 8px);
  border: 1px solid var(--toolbar-border, #e2e8f0);
}

.sale-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Status Card in Sidebar */
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

.status-grid-btn--programada:not(.is-active):hover {
  color: #409eff !important;
  border-color: #409eff !important;
}
.status-grid-btn--completada:not(.is-active):hover {
  color: #67c23a !important;
  border-color: #67c23a !important;
}
.status-grid-btn--no_show:not(.is-active):hover {
  color: #e6a23c !important;
  border-color: #e6a23c !important;
}
.status-grid-btn--cancelada:not(.is-active):hover {
  color: #f56c6c !important;
  border-color: #f56c6c !important;
}

.card-header-with-date {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.header-datetime-preview {
  display: flex;
  align-items: center;
}

.header-datetime-tag {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--el-color-primary, #3b82f6);
  background-color: rgba(59, 130, 246, 0.08);
  border-color: rgba(59, 130, 246, 0.25);
}

.schedule-main-grid {
  display: grid;
  grid-template-columns: minmax(280px, 320px) minmax(0, 1fr);
  gap: 1.75rem;
}

.schedule-calendar-col {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.calendar-panel-box {
  width: 100%;
}

.schedule-details-col {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.schedule-section-block {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.schedule-section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.schedule-subheading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--nav-link-color, #64748b);
  text-transform: uppercase;
}

.step-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: var(--el-color-primary, #3b82f6);
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 700;
}

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

.sales-inputs-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 0.5rem;
}

/* Calendar Date Badges */
.inline-calendar-picker :deep(.el-picker-panel) {
  border: 1px solid var(--toolbar-border, #e2e8f0);
  border-radius: 12px;
  background: var(--toolbar-bg, #ffffff);
}

/* Ocultar botones de navegación anual (« y ») para dejar únicamente flechas simples (mes anterior/siguiente) */
.inline-calendar-picker :deep(.el-date-picker__prev-year-btn),
.inline-calendar-picker :deep(.el-date-picker__next-year-btn),
.inline-calendar-picker :deep(.d-arrow-left),
.inline-calendar-picker :deep(.d-arrow-right),
.inline-calendar-picker :deep(.el-date-picker__prev-btn.d-arrow-left),
.inline-calendar-picker :deep(.el-date-picker__next-btn.d-arrow-right) {
  display: none !important;
}

.inline-calendar-picker
  :deep(.el-date-table td[class*='has-sessions-'] .el-date-table-cell::after) {
  position: absolute;
  top: 1px;
  right: 2px;
  min-width: 15px;
  height: 15px;
  padding: 0 3px;
  border-radius: 999px;
  background-color: #475569;
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

.inline-calendar-picker :deep(.el-date-table td.has-sessions-1 .el-date-table-cell::after) {
  content: '1';
}
.inline-calendar-picker :deep(.el-date-table td.has-sessions-2 .el-date-table-cell::after) {
  content: '2';
}
.inline-calendar-picker :deep(.el-date-table td.has-sessions-3 .el-date-table-cell::after) {
  content: '3';
}
.inline-calendar-picker :deep(.el-date-table td.has-sessions-4 .el-date-table-cell::after) {
  content: '4';
}
.inline-calendar-picker :deep(.el-date-table td.has-sessions-5 .el-date-table-cell::after) {
  content: '5';
}
.inline-calendar-picker :deep(.el-date-table td.has-sessions-6 .el-date-table-cell::after) {
  content: '6';
}
.inline-calendar-picker :deep(.el-date-table td.has-sessions-7 .el-date-table-cell::after) {
  content: '7';
}
.inline-calendar-picker :deep(.el-date-table td.has-sessions-8 .el-date-table-cell::after) {
  content: '8';
}
.inline-calendar-picker :deep(.el-date-table td.has-sessions-9 .el-date-table-cell::after) {
  content: '9';
}
.inline-calendar-picker :deep(.el-date-table td.has-sessions-10 .el-date-table-cell::after) {
  content: '10';
}
.inline-calendar-picker :deep(.el-date-table td.has-sessions-11 .el-date-table-cell::after) {
  content: '11';
}
.inline-calendar-picker :deep(.el-date-table td.has-sessions-12 .el-date-table-cell::after) {
  content: '12';
}
.inline-calendar-picker :deep(.el-date-table td.has-sessions-13 .el-date-table-cell::after) {
  content: '13';
}
.inline-calendar-picker :deep(.el-date-table td.has-sessions-14 .el-date-table-cell::after) {
  content: '14';
}
.inline-calendar-picker :deep(.el-date-table td.has-sessions-15 .el-date-table-cell::after) {
  content: '15';
}
.inline-calendar-picker :deep(.el-date-table td.has-sessions-16 .el-date-table-cell::after) {
  content: '16';
}
.inline-calendar-picker :deep(.el-date-table td.has-sessions-17 .el-date-table-cell::after) {
  content: '17';
}
.inline-calendar-picker :deep(.el-date-table td.has-sessions-18 .el-date-table-cell::after) {
  content: '18';
}
.inline-calendar-picker :deep(.el-date-table td.has-sessions-19 .el-date-table-cell::after) {
  content: '19';
}
.inline-calendar-picker :deep(.el-date-table td.has-sessions-20 .el-date-table-cell::after) {
  content: '20';
}
.inline-calendar-picker :deep(.el-date-table td.has-sessions-plus .el-date-table-cell::after) {
  content: '20+';
}

.desktop-picker-panel-wrapper {
  display: flex;
  justify-content: center;
  width: 100%;
}

.desktop-picker-panel-wrapper :deep(.el-picker-panel) {
  border-radius: 8px;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

/* Card Selector de Sesiones en Columna Derecha */
.desktop-session-selector-card {
  background: var(--toolbar-bg, #ffffff);
  border: 1px solid var(--toolbar-border, #e2e8f0);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  transition:
    background-color 0.25s ease,
    box-shadow 0.25s ease;
}

.desktop-session-selector-card.is-session-selected {
  border: none;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
  color: #ffffff;
}

.session-card-main {
  position: relative;
  padding: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.session-default-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(64, 158, 255, 0.12);
  border: 1px solid rgba(64, 158, 255, 0.25);
  color: #409eff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.session-info-box {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.session-category-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--nav-link-color, #94a3b8);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  line-height: 1.2;
}

.session-title-label {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

/* Card Seleccionada (Color de fotógrafo) */
.session-card-selected-content {
  padding: 1.15rem 1.15rem 0.6rem 1.15rem;
  color: #ffffff;
}

.session-selected-header {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  position: relative;
}

.session-photographer-avatar {
  border: 2px solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
}

.session-selected-placeholder-avatar {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  flex-shrink: 0;
}

.session-selected-titles {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.session-selected-badge-label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.85);
  text-transform: uppercase;
  line-height: 1.2;
}

.session-selected-name {
  font-size: 1.05rem;
  font-weight: 700;
  color: #ffffff;
  margin-top: 2px;
  line-height: 1.25;
}

.session-view-action-btn-selected {
  background: rgba(255, 255, 255, 0.22) !important;
  border: 1px solid rgba(255, 255, 255, 0.45) !important;
  color: #ffffff !important;
  font-weight: 600;
  font-size: 0.8rem;
  border-radius: 8px;
  padding: 4px 10px;
  backdrop-filter: blur(4px);
  margin-left: auto;
  flex-shrink: 0;
}

.session-view-action-btn-selected:hover {
  background: rgba(255, 255, 255, 0.35) !important;
}

.session-selected-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.25);
  margin: 0.95rem 0 0.85rem 0;
}

.session-selected-details {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding-bottom: 0.35rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.88rem;
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

/* Barra toggle VER SESIONES */
.session-toggle-bar {
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--toolbar-border, #f1f5f9);
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  background: var(--toolbar-bg, #ffffff);
  transition: background 0.15s ease;
}

.session-toggle-bar.is-selected-toggle {
  background: rgba(0, 0, 0, 0.1);
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.session-toggle-bar.is-selected-toggle .toggle-text,
.session-toggle-bar.is-selected-toggle .toggle-icon {
  color: rgba(255, 255, 255, 0.92);
}

.session-toggle-bar:active {
  background: var(--el-fill-color-light, #f8fafc);
}

.toggle-text {
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.toggle-icon {
  color: #64748b;
  font-size: 1.05rem;
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.toggle-icon.is-rotated {
  transform: rotate(180deg);
}

.session-dropdown-container {
  padding: 0.5rem 1rem 1rem 1rem;
  border-top: 1px dashed var(--toolbar-border, #e2e8f0);
  background: var(--toolbar-bg, #ffffff);
}

.session-dropdown-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 280px;
  overflow-y: auto;
}

.session-pick-item {
  padding: 0.65rem 0.75rem;
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

.session-pick-item:hover {
  border-color: var(--el-color-primary-light-5, #93c5fd);
}

.session-pick-item.is-selected {
  border-color: var(--el-color-primary, #3b82f6);
  background: rgba(59, 130, 246, 0.06);
}

.pick-item-left {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
  flex: 1;
}

.pick-photographer-avatar {
  flex-shrink: 0;
  border: 1px solid var(--toolbar-border, #e2e8f0);
}

.pick-photographer-placeholder {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(64, 158, 255, 0.12);
  border: 1px solid rgba(64, 158, 255, 0.25);
  color: #409eff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pick-item-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.pick-item-client {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--heading-color, #0f172a);
}

.pick-item-meta {
  font-size: 0.75rem;
  color: var(--nav-link-color, #64748b);
  margin-top: 2px;
}

.pick-item-tags {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.session-empty-state {
  font-size: 0.85rem;
  color: var(--nav-link-color, #64748b);
  text-align: center;
  padding: 1rem 0;
}

.session-excluded-note {
  font-size: 0.78rem;
  color: #e6a23c;
  margin-top: 0.5rem;
  line-height: 1.35;
}

/* Card Selector de Vendedores en Columna Derecha */
.desktop-seller-selector-card {
  background: var(--toolbar-bg, #ffffff);
  border: 1px solid var(--toolbar-border, #e2e8f0);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  transition:
    background-color 0.25s ease,
    box-shadow 0.25s ease;
}

.desktop-seller-selector-card.is-seller-colored {
  border: none;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
  color: #ffffff;
}

.seller-card-main {
  padding: 0.95rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.seller-avatar-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.seller-default-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(59, 130, 246, 0.25);
  color: #3b82f6;
  display: flex;
  align-items: center;
  justify-content: center;
}

.seller-header-avatar {
  border: 1px solid var(--toolbar-border, #e2e8f0);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.seller-header-avatar-colored {
  border: 2px solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.seller-info-box {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.seller-subtitle-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--nav-link-color, #64748b);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.seller-subtitle-label.text-white-subtle {
  color: rgba(255, 255, 255, 0.88) !important;
}

.seller-title-label {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
  margin-top: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.seller-title-label.text-white {
  color: #ffffff !important;
}

.seller-toggle-bar {
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--toolbar-border, #f1f5f9);
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  background: var(--toolbar-bg, #ffffff);
  transition: background 0.15s ease;
}

.seller-toggle-bar:active {
  background: var(--el-fill-color-light, #f8fafc);
}

.seller-toggle-bar.is-selected-toggle {
  background: rgba(0, 0, 0, 0.1);
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.seller-toggle-bar.is-selected-toggle .toggle-text,
.seller-toggle-bar.is-selected-toggle .toggle-icon {
  color: rgba(255, 255, 255, 0.92);
}

.seller-dropdown-container {
  padding: 0.5rem 1rem 1rem 1rem;
  border-top: 1px dashed var(--toolbar-border, #e2e8f0);
  background: var(--toolbar-bg, #ffffff);
}

.seller-dropdown-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 280px;
  overflow-y: auto;
}

.seller-pick-item {
  padding: 0.65rem 0.75rem;
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

.seller-pick-item:hover:not(.is-disabled) {
  border-color: var(--el-color-primary-light-5, #93c5fd);
}

.seller-pick-item.is-selected {
  border-color: var(--el-color-primary, #3b82f6);
  background: rgba(59, 130, 246, 0.06);
}

.seller-pick-item.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: var(--el-fill-color-lighter, #f8fafc);
}

.seller-status-tag {
  font-size: 0.72rem;
  font-weight: 600;
  display: inline-block;
}

.seller-status-tag.tag-available {
  color: #10b981;
}

.seller-status-tag.tag-busy {
  color: #f56c6c;
}

.seller-status-tag.tag-pending {
  color: var(--nav-link-color, #64748b);
}

.pick-seller-avatar {
  flex-shrink: 0;
  border: 1px solid var(--toolbar-border, #e2e8f0);
}

.seller-empty-state {
  font-size: 0.85rem;
  color: var(--nav-link-color, #64748b);
  text-align: center;
  padding: 1rem 0;
}

/* Dark Mode Overrides */
html.dark .time-slot-btn {
  background-color: var(--content-bg, #121212);
  border-color: var(--toolbar-border, #363637);
  color: var(--nav-link-color, #94a3b8);
}

html.dark .time-slot-btn--partial {
  background-color: rgba(234, 179, 8, 0.2) !important;
  border-color: rgba(234, 179, 8, 0.4) !important;
  color: #fef08a !important;
}

html.dark .time-slot-btn--full {
  background-color: rgba(239, 68, 68, 0.2) !important;
  border-color: rgba(239, 68, 68, 0.4) !important;
  color: #fca5a5 !important;
}

html.dark .time-slot-btn.active {
  background-color: var(--el-color-primary, #409eff) !important;
  border-color: var(--el-color-primary, #409eff) !important;
  color: #ffffff !important;
}

html.dark .inline-calendar-picker :deep(.el-picker-panel) {
  background-color: var(--toolbar-bg, #1d1e1f);
  border-color: var(--toolbar-border, #363637);
}

html.dark .form-card,
html.dark .status-card,
html.dark .desktop-session-selector-card,
html.dark .desktop-seller-selector-card,
html.dark .session-toggle-bar,
html.dark .seller-toggle-bar,
html.dark .session-dropdown-container,
html.dark .seller-dropdown-container {
  background-color: var(--toolbar-bg, #1d1e1f);
  border-color: var(--toolbar-border, #363637);
}

html.dark .session-pick-item,
html.dark .seller-pick-item {
  background-color: var(--content-bg, #121212);
  border-color: var(--toolbar-border, #363637);
}

html.dark .status-grid-btn {
  background-color: var(--content-bg, #121212);
  border-color: var(--toolbar-border, #363637);
  color: var(--nav-link-color, #94a3b8);
}

html.dark .status-grid-btn:hover:not(:disabled):not(.is-active) {
  background-color: rgba(64, 158, 255, 0.12);
  border-color: var(--el-color-primary, #409eff);
  color: #ffffff;
}

@media (max-width: 992px) {
  .sale-form-layout {
    grid-template-columns: 1fr;
  }
  .form-sidebar-col {
    position: static;
  }
}
</style>
