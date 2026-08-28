<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { SaleAppointmentFormContext } from '../composables/useSaleAppointmentForm'
import {
  ArrowLeft,
  Check,
  Close,
  Warning,
  Camera,
  Money,
  Calendar,
  Edit,
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
  paxDisplay,
  estadoOptions,
  disabledPastDates,
  formatDateTime,
  handleGoBack,
  handleSave,
  userStore,
} = props.form

const showSessionsList = ref(!isEditing.value && !formData.value.sesionId)
const showSellersList = ref(false)

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
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
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

function toggleSellersList() {
  if (isReadOnly.value) return
  showSellersList.value = !showSellersList.value
}

function selectSeller(sellerId: string | null) {
  if (isReadOnly.value) return
  if (formData.value.vendedorId === sellerId) {
    formData.value.vendedorId = null
  } else {
    formData.value.vendedorId = sellerId
    showSellersList.value = false
  }
}
</script>

<template>
  <div class="sale-form-mobile">
    <!-- Header Móvil -->
    <div class="mobile-header">
      <el-button :icon="ArrowLeft" circle class="back-btn" @click="handleGoBack" />
      <h1 class="mobile-title">
        {{ isEditing ? 'Editar Cita de Venta' : 'Nueva Cita de Venta' }}
      </h1>
    </div>

    <!-- Selector de Citas Estilo Card (Móvil) -->
    <div
      class="mobile-session-selector-card"
      :class="{ 'is-session-selected': !!formData.sesionId }"
      :style="formData.sesionId ? { backgroundColor: getUserBgColor(photographerUser?.color) || '#8b5cf6' } : {}"
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
            <span class="detail-label">Cliente:</span>
            <span class="detail-value">{{ sessionInfo.clienteNombre }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Fecha:</span>
            <span class="detail-value">{{ formatSessionDate(sessionInfo.fechaHoraInicio) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Hora:</span>
            <span class="detail-value">{{ formatSessionTime(sessionInfo.fechaHoraInicio) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Hotel:</span>
            <span class="detail-value">{{ sessionInfo.hotelNombre }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Personas:</span>
            <span class="detail-value">{{ formatPersonas(sessionInfo.numAdultos, sessionInfo.numNinos) }}</span>
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
        <span class="toggle-text">{{ showSessionsList ? 'OCULTAR SESIONES' : 'VER SESIONES' }}</span>
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
                    backgroundColor: getUserBgColor(getPhotographer(session.fotografoId)?.color),
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
          </div>
          <div v-if="excludedSessionsCount > 0" class="session-excluded-notice">
            <el-icon style="vertical-align: middle; margin-right: 4px; color: #e6a23c">
              <WarnTriangleFilled />
            </el-icon>
            {{ excludedSessionsCount }} sesión(es) canceladas o no-show no se muestran.
          </div>
        </div>
      </el-collapse-transition>
    </div>

    <!-- Selector de Vendedor Estilo Card (Móvil) -->
    <div class="mobile-seller-selector-card">
      <div class="seller-card-main">
        <div class="seller-avatar-circle">
          <el-avatar
            v-if="selectedSeller"
            :src="selectedSeller.imagen || undefined"
            :size="44"
            :style="{
              backgroundColor: getUserBgColor(selectedSeller.color),
              color: '#ffffff',
              fontWeight: '600',
              fontSize: '13px',
            }"
            class="seller-header-avatar"
          >
            {{ getUserInitials(selectedSeller.nombre, selectedSeller.apellidos) }}
          </el-avatar>
          <div v-else class="seller-default-circle">
            <el-icon :size="22"><User /></el-icon>
          </div>
        </div>
        <div class="seller-info-box">
          <span class="seller-category-label">VENDEDOR</span>
          <span class="seller-title-label">
            {{
              selectedSeller
                ? `${selectedSeller.nombre} ${selectedSeller.apellidos}`
                : 'Selecciona vendedor'
            }}
          </span>
          <span v-if="selectedSeller" class="seller-subtitle-label">
            {{ selectedSeller.perfilNombre }}
          </span>
        </div>
      </div>

      <!-- Barra toggle VER VENDEDORES -->
      <div
        class="seller-toggle-bar"
        :class="{ 'is-open': showSellersList }"
        role="button"
        tabindex="0"
        @click="toggleSellersList"
      >
        <span class="toggle-text">VER VENDEDORES</span>
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
              :class="{ 'is-selected': String(formData.vendedorId) === String(seller.id) }"
              @click="selectSeller(seller.id)"
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
                    <span>{{ seller.perfilNombre }}</span>
                  </div>
                </div>
              </div>

              <div class="pick-item-tags">
                <el-tag
                  size="small"
                  :type="
                    seller.perfilNombre.toUpperCase().includes('AGENDADOR') ? 'primary' : 'success'
                  "
                  effect="light"
                >
                  {{ seller.perfilNombre }}
                </el-tag>
              </div>
            </div>
          </div>
        </div>
      </el-collapse-transition>
    </div>

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

    <!-- Session Reference Card (read-only) -->
    <el-card v-if="sessionInfo.clienteNombre" class="session-ref-card" shadow="never">
      <template #header>
        <div class="ref-card-header">
          <span class="ref-card-title">
            <el-icon :size="20"><Camera /></el-icon>
            Sesión Fotográfica Asociada
          </span>
        </div>
      </template>
      <div class="ref-grid">
        <div class="ref-item">
          <span class="ref-label">Cliente</span>
          <span class="ref-value">{{ sessionInfo.clienteNombre }}</span>
        </div>
        <div class="ref-item">
          <span class="ref-label">Hotel</span>
          <span class="ref-value">{{ sessionInfo.hotelNombre }}</span>
        </div>
        <div class="ref-item">
          <span class="ref-label">Habitación</span>
          <span class="ref-value">{{ sessionInfo.numeroHabitacion || '-' }}</span>
        </div>
        <div class="ref-item">
          <span class="ref-label">Fotógrafo</span>
          <div class="ref-user-value">
            <el-avatar
              v-if="photographerUser"
              :src="photographerUser.imagen || undefined"
              :size="20"
              :style="{
                backgroundColor: getUserBgColor(photographerUser.color),
                color: '#ffffff',
                fontWeight: '600',
                fontSize: '10px',
              }"
              class="ref-user-avatar"
            >
              {{ getUserInitials(photographerUser.nombre, photographerUser.apellidos) }}
            </el-avatar>
            <span class="ref-value">{{ photographerName }}</span>
          </div>
        </div>
        <div class="ref-item">
          <span class="ref-label">PAX</span>
          <span class="ref-value">{{ paxDisplay }}</span>
        </div>
        <div class="ref-item">
          <span class="ref-label">Concepto</span>
          <span class="ref-value">{{ sessionInfo.concepto || '-' }}</span>
        </div>
        <div class="ref-item">
          <span class="ref-label">Sesión de fotos</span>
          <span class="ref-value">{{ formatDateTime(sessionInfo.fechaHoraInicio) }}</span>
        </div>
        <div class="ref-item ref-item--vendedor">
          <span class="ref-label">Vendedor</span>
          <el-select
            v-model="formData.vendedorId"
            placeholder="Selecciona vendedor"
            clearable
            filterable
            size="large"
            style="width: 100%"
            :disabled="isReadOnly"
          >
            <template #prefix v-if="selectedSeller">
              <el-avatar
                :src="selectedSeller.imagen || undefined"
                :size="20"
                :style="{
                  backgroundColor: getUserBgColor(selectedSeller.color),
                  color: '#ffffff',
                  fontWeight: '600',
                  fontSize: '10px',
                }"
                class="select-prefix-avatar"
              >
                {{ getUserInitials(selectedSeller.nombre, selectedSeller.apellidos) }}
              </el-avatar>
            </template>
            <el-option label="Sin vendedor asignado" value="" />
            <el-option
              v-for="seller in sellers"
              :key="seller.id"
              :label="`${seller.nombre} ${seller.apellidos}`"
              :value="seller.id"
            >
              <div class="seller-option-item">
                <el-avatar
                  :src="seller.imagen || undefined"
                  :size="24"
                  :style="{
                    backgroundColor: getUserBgColor(seller.color),
                    color: '#ffffff',
                    fontWeight: '600',
                    fontSize: '11px',
                  }"
                  class="seller-avatar"
                >
                  {{ getUserInitials(seller.nombre, seller.apellidos) }}
                </el-avatar>
                <span class="seller-option-name">{{ seller.nombre }} {{ seller.apellidos }}</span>
                <span class="seller-option-role">({{ seller.perfilNombre }})</span>
              </div>
            </el-option>
          </el-select>
        </div>
      </div>
    </el-card>

    <!-- Main Form Móvil -->
    <el-card class="form-card" shadow="never">
      <template #header>
        <span class="ref-card-title">
          <el-icon :size="20"><Money /></el-icon>
          Cita venta fotos
        </span>
      </template>
      <el-form
        :model="formData"
        label-position="top"
        size="large"
        class="sale-form"
        :disabled="isReadOnly"
      >
        <!-- Estado de la Cita (3 arriba + 1 abajo según diseño) -->
        <el-form-item label="ESTADO DE LA CITA" class="status-form-item">
          <div class="status-radio-container">
            <el-radio-group v-model="formData.estado" class="status-radio-group" size="large">
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
        </el-form-item>

        <el-divider border-style="dashed">
          <el-icon><Calendar /></el-icon>
        </el-divider>

        <!-- Session selector (solo al crear nueva) -->
        <el-form-item v-if="!isEditing" label="Sesión Fotográfica *" required>
          <el-select
            v-model="formData.sesionId"
            style="width: 100%"
            placeholder="Elige la sesión para la que agendar esta venta"
            filterable
            clearable
            size="large"
          >
            <el-option
              v-for="session in availableSessions"
              :key="session.id"
              :label="`${session.clienteNombre} — ${formatDateTime(session.fechaHoraInicio)} (${session.estado === 'COMPLETADA' ? 'Completada' : 'Programada'})`"
              :value="session.id"
            />
          </el-select>
          <div v-if="excludedSessionsCount > 0" class="select-helper-notice">
            <el-icon style="vertical-align: middle; margin-right: 4px; color: #e6a23c">
              <WarnTriangleFilled />
            </el-icon>
            Hay {{ excludedSessionsCount }} sesión(es) en tus hoteles no mostrada(s) porque están
            canceladas o el cliente no se presentó.
          </div>
        </el-form-item>

        <!-- Selector Fecha/Hora -->
        <el-form-item required>
          <template #label>
            <span class="calendar-item-label">
              <el-icon class="calendar-label-icon icon-money"><Money /></el-icon>
              <span>Fecha/Hora Cita de Ventas</span>
            </span>
          </template>
          <div class="mobile-picker-panel-wrapper">
            <el-date-picker-panel
              :border="false"
              v-model="formData.fechaHoraCita"
              type="datetime"
              value-format="YYYY-MM-DDTHH:mm"
              date-format="YYYY-MM-DD"
              time-format="HH:mm"
              :default-time="new Date(2000, 0, 1, 10, 0, 0)"
              :disabled-date="disabledPastDates"
            />
          </div>
        </el-form-item>

        <!-- Fotos Vendidas y Total USD -->
        <el-form-item label="Nº de Fotos Vendidas *">
          <el-input-number
            v-model="formData.numFotosVendidas"
            :min="0"
            :step="1"
            style="width: 100%"
            placeholder="0"
            size="large"
          />
        </el-form-item>

        <el-form-item label="Total en USD *">
          <el-input-number
            v-model="formData.totalVentaUsd"
            :min="0"
            :step="0.01"
            :precision="2"
            style="width: 100%"
            placeholder="0.00"
            size="large"
          >
            <template #suffix>
              <span>$ (USD)</span>
            </template>
          </el-input-number>
        </el-form-item>

        <el-divider border-style="dashed">
          <el-icon><Edit /></el-icon>
        </el-divider>

        <!-- Notas -->
        <el-form-item label="Notas">
          <el-input
            v-model="formData.notas"
            type="textarea"
            :rows="3"
            placeholder="Notas sobre la cita de venta..."
          />
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Sticky Bottom Bar -->
    <div class="mobile-bottom-actions">
      <el-button size="large" :icon="Close" class="mobile-cancel-icon-btn" @click="handleGoBack" />
      <el-button
        type="primary"
        size="large"
        :icon="Check"
        :loading="isSaving"
        :disabled="isReadOnly"
        class="mobile-submit-btn"
        @click="handleSave"
      >
        {{ isEditing ? 'Guardar Cambios' : 'Agendar Cita' }}
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.sale-form-mobile {
  padding: 1rem;
  padding-bottom: 5.5rem;
  max-width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

.mobile-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.back-btn {
  font-size: 1rem;
}

.mobile-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
  margin: 0;
}

/* Card Selector de Sesiones */
.mobile-session-selector-card {
  background: var(--toolbar-bg, #ffffff);
  border: 1px solid var(--toolbar-border, #e2e8f0);
  border-radius: 16px;
  margin-bottom: 1rem;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  transition: background-color 0.25s ease, box-shadow 0.25s ease;
}

.mobile-session-selector-card.is-session-selected {
  border: none;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
  color: #ffffff;
}

.session-card-main {
  position: relative;
  padding: 0.95rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

/* Card Seleccionada (Color de fotógrafo) */
.session-card-selected-content {
  padding: 1.1rem 1.1rem 0.6rem 1.1rem;
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
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.85);
  text-transform: uppercase;
  line-height: 1.2;
}

.session-selected-name {
  font-size: 1.1rem;
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

.session-avatar-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
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
}

.session-header-avatar {
  border: 1px solid var(--toolbar-border, #e2e8f0);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
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
  color: #94a3b8;
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

.session-subtitle-label {
  font-size: 0.8rem;
  color: var(--nav-link-color, #64748b);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-toggle-bar {
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

.session-pick-item:active {
  transform: scale(0.99);
}

.session-pick-item.is-selected {
  border-color: var(--el-color-primary, #3b82f6);
  background: rgba(59, 130, 246, 0.06);
}

.pick-item-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
  flex: 1;
}

.pick-photographer-avatar {
  flex-shrink: 0;
  border: 1px solid var(--toolbar-border, #e2e8f0);
}

.pick-photographer-placeholder {
  width: 36px;
  height: 36px;
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

.pick-check-icon {
  color: var(--el-color-primary, #3b82f6);
  font-size: 1rem;
  font-weight: 700;
}

.session-empty-state {
  font-size: 0.85rem;
  color: var(--nav-link-color, #64748b);
  text-align: center;
  padding: 1rem 0;
}

.session-excluded-notice {
  font-size: 0.75rem;
  color: #e6a23c;
  margin-top: 0.5rem;
  line-height: 1.35;
}

/* Card Selector de Vendedores */
.mobile-seller-selector-card {
  background: var(--toolbar-bg, #ffffff);
  border: 1px solid var(--toolbar-border, #e2e8f0);
  border-radius: 14px;
  margin-bottom: 1rem;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
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

.seller-info-box {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.seller-category-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  line-height: 1.2;
}

.seller-title-label {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.seller-subtitle-label {
  font-size: 0.8rem;
  color: var(--nav-link-color, #64748b);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.seller-toggle-bar {
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

.seller-toggle-bar:active {
  background: var(--el-fill-color-light, #f8fafc);
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

.seller-pick-item:active {
  transform: scale(0.99);
}

.seller-pick-item.is-selected {
  border-color: var(--el-color-primary, #3b82f6);
  background: rgba(59, 130, 246, 0.06);
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

.lock-banner,
.conflict-banner {
  margin-bottom: 1rem;
}

.conflict-item {
  font-size: 0.85rem;
  color: var(--el-text-color-secondary);
  margin-top: 0.25rem;
}

.select-helper-notice {
  font-size: 0.8rem;
  color: #e6a23c;
  margin-top: 0.35rem;
  line-height: 1.35;
}

.session-ref-card {
  margin-bottom: 1rem;
  border-radius: var(--el-card-border-radius, 8px);
  border: 1px solid var(--toolbar-border, #e2e8f0);
}

.ref-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.ref-card-title {
  font-weight: 600;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 6px;
}

.ref-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.65rem;
}

.ref-item {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.ref-user-value {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.ref-user-avatar {
  flex-shrink: 0;
}

.select-prefix-avatar {
  margin-right: 2px;
  vertical-align: middle;
}

.seller-option-item {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
}

.seller-avatar {
  flex-shrink: 0;
}

.seller-option-name {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.seller-option-role {
  font-size: 0.8rem;
  color: var(--el-text-color-secondary);
  margin-left: auto;
}

.ref-label {
  font-size: 0.72rem;
  color: var(--nav-link-color, #64748b);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.ref-value {
  font-size: 0.88rem;
  color: var(--heading-color, #0f172a);
  font-weight: 500;
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

.status-form-item :deep(.el-form-item__label) {
  width: 100%;
  text-align: center;
  font-weight: 700;
  font-size: 0.8rem;
  letter-spacing: 0.05em;
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

.calendar-item-label {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-weight: 600;
}

.calendar-label-icon {
  font-size: 1.1rem;
}

.calendar-label-icon.icon-money {
  color: var(--el-input-icon-color, var(--el-text-color-placeholder));
}

.mobile-picker-panel-wrapper {
  display: flex;
  justify-content: center;
  width: 100%;
  overflow-x: auto;
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
  grid-template-columns: auto 1fr;
  gap: 0.65rem;
  z-index: 100;
  box-shadow: 0 -4px 14px rgba(0, 0, 0, 0.06);
}

.mobile-cancel-icon-btn {
  width: 50px !important;
  min-width: 50px !important;
  height: 48px !important;
  padding: 0 !important;
  margin: 0 !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  border-radius: 10px;
  background: var(--el-fill-color-light, #f1f5f9);
  border: 1px solid var(--toolbar-border, #e2e8f0);
  color: var(--el-text-color-regular, #64748b);
}

.mobile-cancel-icon-btn:hover {
  background: var(--el-fill-color, #e2e8f0);
}

.mobile-submit-btn {
  width: 100%;
  height: 48px !important;
  margin: 0 !important;
  font-weight: 700;
  font-size: 0.95rem;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}
</style>
