<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSaleStore } from '../stores/sale.store'
import { useSessionStore } from '@/features/photo-sessions/stores/session.store'
import { useHotelStore } from '@/features/hotels/stores/hotel.store'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useUserStore } from '@/features/users/stores/user.store'
import { useProfileStore } from '@/features/users/stores/profile.store'
import type { CitaVenta, UpdateCitaVentaPayload, ConflictoCitaVenta, EstadoCitaVenta } from '../domain/sale.model'
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
} from '@element-plus/icons-vue'
import { UserX } from '@lucide/vue'
import { ElMessage } from 'element-plus'
import { getUserInitials, getUserBgColor } from '@/features/users/utils/user-avatar'

const route = useRoute()
const router = useRouter()
const saleStore = useSaleStore()
const sessionStore = useSessionStore()
const hotelStore = useHotelStore()
const authStore = useAuthStore()
const userStore = useUserStore()
const profileStore = useProfileStore()

const citaId = computed(() => (route.params.id ? Number(route.params.id) : null))
const isEditing = computed(() => !!citaId.value)
const isSaving = ref(false)
const isMobile = ref(false)
const conflicts = ref<ConflictoCitaVenta[]>([])
const loadedCita = ref<CitaVenta | null>(null)

// Form data
const formData = ref({
  sesionId: null as number | null,
  hotelId: 0,
  vendedorId: null as string | null,
  fechaHoraCita: '',
  estado: 'PROGRAMADA' as EstadoCitaVenta,
  numFotosVendidas: null as number | null,
  totalVentaUsd: null as number | null,
  notas: '',
})

// Session info (read-only context)
const sessionInfo = ref({
  clienteNombre: '',
  clienteEmail: '',
  clienteTelefono: '',
  numeroHabitacion: '',
  fotografoId: '',
  numAdultos: 1,
  numNinos: 0,
  concepto: '',
  fechaHoraInicio: '',
  hotelNombre: '',
})

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

// Role-based edit lock (only locks if the appointment was already saved in DB with status other than PROGRAMADA)
const isReadOnly = computed(() => {
  if (!isEditing.value || !loadedCita.value) return false
  if (loadedCita.value.estado === 'PROGRAMADA') return false
  const role = currentUser.value?.roleCode?.toUpperCase() || ''
  return !['SUPERVISOR', 'GERENTE', 'ADMIN', 'SUPERUSUARIO'].includes(role)
})

// Available completed sessions without a sales appointment (for session selector)
const ESTADOS_NO_PERMITIDOS = ['CANCELADA', 'NO_SHOW'] as const

const availableSessions = computed(() => {
  const allowedHotelIds = new Set(userHotels.value.map((h) => Number(h.id)))
  return sessionStore.sessions.filter((s) => {
    if (!allowedHotelIds.has(Number(s.hotelId))) return false
    if ((ESTADOS_NO_PERMITIDOS as readonly string[]).includes(s.estado)) return false
    if (s.citaVenta && s.citaVenta.id) return false
    return true
  })
})

// Count of sessions in allowed hotels without sales appointment that do not meet all criteria
const excludedSessionsCount = computed(() => {
  const allowedHotelIds = new Set(userHotels.value.map((h) => Number(h.id)))
  return sessionStore.sessions.filter((s) => {
    if (!allowedHotelIds.has(Number(s.hotelId))) return false
    if (s.citaVenta && s.citaVenta.id) return false
    return (ESTADOS_NO_PERMITIDOS as readonly string[]).includes(s.estado)
  }).length
})

// Photographer name and avatar for display
const photographerUser = computed(() => {
  if (!sessionInfo.value.fotografoId) return null
  return userStore.users.find((u) => String(u.id) === String(sessionInfo.value.fotografoId)) || null
})

const photographerName = computed(() => {
  if (!sessionInfo.value.fotografoId) return 'Sin asignar'
  const user = photographerUser.value
  return user ? `${user.nombre} ${user.apellidos}` : 'Desconocido'
})

// Sellers list for assignment (filtered by hotel: only Agendador and Fotógrafo)
const sellers = computed(() => {
  const selectedHotelId = Number(formData.value.hotelId)
  if (!selectedHotelId) return []

  return userStore.usersWithProfile
    .filter((u) => {
      if (u.status === 'Inactivo') return false
      const perfilCode =
        u.perfil?.code?.toUpperCase() ||
        profileStore.getProfileById(u.profileId)?.code?.toUpperCase()
      const allowedRoles = ['AGENDADOR', 'FOTOGRAFO']
      if (!allowedRoles.includes(perfilCode || '')) return false
      const assignedHotelIds = u.hotelIds || []
      return assignedHotelIds.some((hId) => Number(hId) === selectedHotelId)
    })
    .map((u) => {
      const perfil = u.perfil || profileStore.getProfileById(u.profileId)
      return {
        id: u.id,
        nombre: u.nombre,
        apellidos: u.apellidos,
        color: u.color,
        imagen: u.imagen,
        perfilNombre: perfil?.name || perfil?.code || 'Vendedor',
      }
    })
})

const selectedSeller = computed(() => {
  if (!formData.value.vendedorId) return null
  return sellers.value.find((s) => String(s.id) === String(formData.value.vendedorId)) || null
})

// Reset vendedor selection when hotel changes if selected vendedor is not in the new hotel
watch(
  () => formData.value.hotelId,
  () => {
    if (!formData.value.vendedorId) return
    const isAvailable = sellers.value.some(
      (s) => String(s.id) === String(formData.value.vendedorId),
    )
    if (!isAvailable) {
      formData.value.vendedorId = null
    }
  },
)

// PAX display
const paxDisplay = computed(() => {
  return `${sessionInfo.value.numAdultos}.${sessionInfo.value.numNinos} PAX`
})

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '-'
  return dateStr.replace('T', ' ').slice(0, 16)
}

const estadoOptions: { value: EstadoCitaVenta; label: string; color: string; icon: Component }[] = [
  { value: 'PROGRAMADA', label: 'Programada', color: '#409eff', icon: Calendar },
  { value: 'NO_SHOW', label: 'No se presentó', color: '#e6a23c', icon: UserX },
  { value: 'CANCELADA', label: 'Cancelada', color: '#f56c6c', icon: Close },
  { value: 'COMPLETADA', label: 'Completada', color: '#67c23a', icon: Check },
]

function checkMobile() {
  isMobile.value = window.innerWidth <= 768
}

function disabledPastDates(time: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return time.getTime() < today.getTime()
}

// Conflict check on date change
watch(
  () => formData.value.fechaHoraCita,
  async (newVal) => {
    if (!newVal || !formData.value.hotelId) {
      conflicts.value = []
      return
    }
    conflicts.value = await saleStore.checkConflictos(
      formData.value.hotelId,
      newVal,
      citaId.value ?? undefined,
    )
    if (conflicts.value.length > 0) {
      ElMessage({
        type: 'warning',
        icon: WarnTriangleFilled,
        message: `Hay ${conflicts.value.length} cita(s) de venta en el mismo hotel dentro de la franja de 1 hora`,
      })
    }
  },
)

// Load session info when sesionId changes
watch(
  () => formData.value.sesionId,
  (newVal) => {
    if (!newVal) return
    const session = sessionStore.sessions.find((s) => s.id === newVal)
    if (session) {
      formData.value.hotelId = session.hotelId
      sessionInfo.value = {
        clienteNombre: session.clienteNombre,
        clienteEmail: session.clienteEmail || '',
        clienteTelefono: session.clienteTelefono || '',
        numeroHabitacion: session.numeroHabitacion || '',
        fotografoId: session.fotografoId || '',
        numAdultos: session.numAdultos ?? 1,
        numNinos: session.numNinos ?? 0,
        concepto: session.concepto || '',
        fechaHoraInicio: session.fechaHoraInicio,
        hotelNombre: hotelStore.hotels.find((h) => h.id === session.hotelId)?.nombre || '',
      }
      if (!isEditing.value && !formData.value.vendedorId && currentUser.value) {
        const isAgendador = currentUser.value.roleCode?.toUpperCase() === 'AGENDADOR'
        if (
          isAgendador &&
          currentUser.value.hotelIds?.some((hId) => Number(hId) === Number(session.hotelId))
        ) {
          formData.value.vendedorId = currentUser.value.id
        }
      }
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
  ])

  if (isEditing.value && citaId.value) {
    const existing = await saleStore.fetchCitaVenta(citaId.value)
    if (existing) {
      loadedCita.value = existing
      const allowedHotelIds = new Set(userHotels.value.map((h) => Number(h.id)))
      if (!allowedHotelIds.has(Number(existing.hotelId))) {
        ElMessage.error('No tienes acceso a las citas de venta de este hotel')
        handleGoBack()
        return
      }

      formData.value = {
        sesionId: existing.sesionId,
        hotelId: existing.hotelId,
        vendedorId: existing.vendedorId || null,
        fechaHoraCita: existing.fechaHoraCita,
        estado: existing.estado,
        numFotosVendidas: existing.numFotosVendidas ?? null,
        totalVentaUsd: existing.totalVentaUsd ?? null,
        notas: existing.notas || '',
      }
      sessionInfo.value = {
        clienteNombre: existing.clienteNombre || '',
        clienteEmail: existing.clienteEmail || '',
        clienteTelefono: existing.clienteTelefono || '',
        numeroHabitacion: existing.numeroHabitacion || '',
        fotografoId: existing.fotografoId || '',
        numAdultos: existing.numAdultos ?? 1,
        numNinos: existing.numNinos ?? 0,
        concepto: existing.concepto || '',
        fechaHoraInicio: existing.sesionFechaHoraInicio || '',
        hotelNombre: existing.hotelNombre || '',
      }
    } else {
      ElMessage.error('Cita de venta no encontrada')
      handleGoBack()
    }
  } else {
    // Creating new: check for sesionId query param
    const querySesionId = route.query.sesionId ? Number(route.query.sesionId) : null
    if (querySesionId) {
      formData.value.sesionId = querySesionId
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

function handleGoBack() {
  router.push('/agenda')
}

async function handleSave() {
  if (!formData.value.sesionId) {
    ElMessage.warning('Debes seleccionar una sesión fotográfica')
    return
  }
  if (!formData.value.fechaHoraCita) {
    ElMessage.warning('Debes seleccionar la fecha y hora de la cita')
    return
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (!isEditing.value && new Date(formData.value.fechaHoraCita) < today) {
    ElMessage.error('No se pueden crear citas de venta en fechas anteriores al día actual')
    return
  }

  if (formData.value.estado === 'COMPLETADA') {
    if (formData.value.numFotosVendidas == null || formData.value.totalVentaUsd == null) {
      ElMessage.warning('Para completar la cita, indica el nº de fotos vendidas y el total en USD')
      return
    }
  }

  isSaving.value = true
  try {
    if (isEditing.value && citaId.value) {
      const payload: UpdateCitaVentaPayload = {
        vendedorId: formData.value.vendedorId || null,
        fechaHoraCita: formData.value.fechaHoraCita,
        estado: formData.value.estado,
        numFotosVendidas: formData.value.numFotosVendidas,
        totalVentaUsd: formData.value.totalVentaUsd,
        notas: formData.value.notas ? formData.value.notas.trim() : null,
      }
      const result = await saleStore.updateCitaVenta(citaId.value, payload)
      if (result.conflictos && result.conflictos.length > 0) {
        ElMessage.warning(
          `Cita actualizada, pero hay ${result.conflictos.length} cita(s) solapada(s) en el mismo hotel`,
        )
      } else {
        ElMessage.success('Cita de venta actualizada correctamente')
      }
    } else {
      const result = await saleStore.addCitaVenta({
        sesionId: formData.value.sesionId,
        hotelId: formData.value.hotelId,
        vendedorId: formData.value.vendedorId || null,
        fechaHoraCita: formData.value.fechaHoraCita,
        notas: formData.value.notas ? formData.value.notas.trim() : null,
      })
      if (result.conflictos && result.conflictos.length > 0) {
        ElMessage.warning(
          `Cita creada, pero hay ${result.conflictos.length} cita(s) solapada(s) en el mismo hotel`,
        )
      } else {
        ElMessage.success('Cita de venta agendada correctamente')
      }
    }
    await Promise.all([sessionStore.fetchSessions(), saleStore.fetchCitasVenta()])
    handleGoBack()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al guardar la cita de venta'
    ElMessage.error(msg)
  } finally {
    isSaving.value = false
  }
}
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
            <el-icon :size="24"><Camera /></el-icon> Sesión Fotográfica Asociada
          </span>
          <el-button
            v-if="formData.sesionId"
            type="primary"
            size="small"
            @click="router.push(`/agenda/${formData.sesionId}/editar`)"
          >
            Ver sesión
          </el-button>
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
              :size="22"
              :style="{
                backgroundColor: getUserBgColor(photographerUser.color),
                color: '#ffffff',
                fontWeight: '600',
                fontSize: '11px',
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
            <el-option label="Sin vendedor asignado" :value="null" />
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

    <!-- Main Form -->
    <el-card class="form-card" shadow="never">
      <template #header>
        <span class="ref-card-title">
          <el-icon :size="24"><Money /></el-icon> Cita venta fotos
        </span>
      </template>
      <el-form
        :model="formData"
        label-position="top"
        :size="isMobile ? 'large' : 'default'"
        class="sale-form"
        :disabled="isReadOnly"
      >
        <!-- Estado de la Cita -->
        <el-form-item label="Estado de la Cita" class="status-form-item">
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

        <!-- Session selector (only when creating new) -->
        <el-form-item v-if="!isEditing" label="Sesión Fotográfica *" required>
          <el-select
            v-model="formData.sesionId"
            style="width: 100%"
            placeholder="Elige la sesión para la que agendar esta venta"
            filterable
            clearable
          >
            <el-option
              v-for="session in availableSessions"
              :key="session.id"
              :label="`${session.clienteNombre} — ${formatDateTime(session.fechaHoraInicio)} (${session.estado === 'COMPLETADA' ? 'Completada' : 'Programada'})`"
              :value="session.id"
            />
          </el-select>
          <div v-if="excludedSessionsCount > 0" class="select-helper-notice">
            <el-icon style="vertical-align: middle; margin-right: 4px; color: #e6a23c"
              ><WarnTriangleFilled
            /></el-icon>
            Hay {{ excludedSessionsCount }} sesión(es) en tus hoteles no mostrada(s) porque están
            canceladas o el cliente no se presentó.
          </div>
        </el-form-item>

        <!-- Fila: Fecha y Hora de la Cita + Campos de Venta (form-row-2) -->
        <div class="form-row-2">
          <!-- Columna Izquierda: Selector Fecha/Hora -->
          <el-form-item required>
            <template #label>
              <span class="calendar-item-label">
                <el-icon class="calendar-label-icon icon-money"><Money /></el-icon>
                <span>Fecha/Hora Cita de Ventas</span>
              </span>
            </template>
            <div class="desktop-picker-panel-wrapper">
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

          <!-- Columna Derecha: Fotos Vendidas y Total USD -->
          <div class="sales-inputs-col">
            <el-form-item label="Nº de Fotos Vendidas *">
              <el-input-number
                v-model="formData.numFotosVendidas"
                :min="0"
                :step="1"
                style="width: 100%"
                placeholder="0"
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
              >
                <template #suffix>
                  <span>$ (USD)</span>
                </template>
              </el-input-number>
            </el-form-item>
          </div>
        </div>

        <el-divider border-style="dashed">
          <el-icon><Edit /></el-icon>
        </el-divider>

        <!-- Notes -->
        <el-form-item label="Notas">
          <el-input
            v-model="formData.notas"
            type="textarea"
            :rows="3"
            placeholder="Notas sobre la cita de venta..."
          />
        </el-form-item>

        <!-- Actions -->
        <div class="form-actions">
          <el-button
            type="primary"
            :size="isMobile ? 'large' : 'default'"
            :icon="Check"
            :loading="isSaving"
            :disabled="isReadOnly"
            @click="handleSave"
          >
            {{ isEditing ? 'Guardar Cambios' : 'Agendar Cita' }}
          </el-button>
          <el-button :size="isMobile ? 'large' : 'default'" :icon="Close" @click="handleGoBack">
            Cancelar
          </el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.sale-form-container {
  padding: 1.5rem;
  max-width: 840px;
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
  font-size: 0.95rem;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.ref-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem 1rem;
  align-items: flex-start;
}

.ref-item {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.ref-item--vendedor {
  margin-top: -0.15rem;
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
  font-size: 0.75rem;
  color: var(--nav-link-color, #64748b);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.ref-value {
  font-size: 0.9rem;
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
  margin-bottom: 0.5rem;
}

.status-radio-container {
  display: flex;
  justify-content: center;
  width: 100%;
}

.status-radio-group {
  display: inline-flex;
  justify-content: center;
  flex-wrap: wrap;
}

:deep(.status-radio-btn .el-radio-button__inner) {
  font-weight: 600;
  transition: all 0.2s ease;
}

.status-btn-content {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.status-btn-icon {
  font-size: 1.05rem;
}

/* En móvil: distribución 3 arriba + 1 abajo según diseño */
@media (max-width: 768px) {
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
    padding: 1rem 0.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  :deep(.status-radio-btn--completada) {
    grid-column: 1 / -1;
  }

  :deep(.status-radio-btn--completada .el-radio-button__inner) {
    flex-direction: row;
    padding: 0.85rem 1.25rem;
  }

  .status-btn-content {
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
  }

  :deep(.status-radio-btn--completada .status-btn-content) {
    flex-direction: row;
  }

  .status-btn-icon {
    font-size: 1.35rem;
  }
}

/* Colores personalizados por estado */
:deep(.status-radio-btn--programada.is-active .el-radio-button__inner) {
  background-color: #409eff !important;
  border-color: #409eff !important;
  color: #ffffff !important;
  box-shadow: -1px 0 0 0 #409eff !important;
}

:deep(.status-radio-btn--completada.is-active .el-radio-button__inner) {
  background-color: #67c23a !important;
  border-color: #67c23a !important;
  color: #ffffff !important;
  box-shadow: -1px 0 0 0 #67c23a !important;
}

:deep(.status-radio-btn--no_show.is-active .el-radio-button__inner) {
  background-color: #e6a23c !important;
  border-color: #e6a23c !important;
  color: #ffffff !important;
  box-shadow: -1px 0 0 0 #e6a23c !important;
}

:deep(.status-radio-btn--cancelada.is-active .el-radio-button__inner) {
  background-color: #f56c6c !important;
  border-color: #f56c6c !important;
  color: #ffffff !important;
  box-shadow: -1px 0 0 0 #f56c6c !important;
}

/* Hover sin activar */
:deep(.status-radio-btn--programada:not(.is-active) .el-radio-button__inner:hover) {
  color: #409eff !important;
}
:deep(.status-radio-btn--completada:not(.is-active) .el-radio-button__inner:hover) {
  color: #67c23a !important;
}
:deep(.status-radio-btn--no_show:not(.is-active) .el-radio-button__inner:hover) {
  color: #e6a23c !important;
}
:deep(.status-radio-btn--cancelada:not(.is-active) .el-radio-button__inner:hover) {
  color: #f56c6c !important;
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.sales-inputs-col {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
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

@media (max-width: 768px) {
  .sale-form-container {
    padding: 1rem;
  }

  .form-row-2 {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .ref-grid {
    grid-template-columns: 1fr;
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
