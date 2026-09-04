<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuditLogStore } from '../stores/audit-log.store'
import { useHotelStore } from '@/features/hotels/stores/hotel.store'
import { useUserStore } from '@/features/users/stores/user.store'
import { getUserInitials, getUserBgColor } from '@/features/users/utils/user-avatar'
import type { AuditLogFilters } from '../domain/audit-log.model'
import {
  Search,
  RotateCcw,
  Building2,
  UserRound,
  Camera,
  Calendar,
  MapPin,
  LogIn,
  LogOut,
  Info,
  Clock,
  Sparkles,
  ChevronDown,
} from '@lucide/vue'

const auditStore = useAuditLogStore()
const hotelStore = useHotelStore()
const userStore = useUserStore()

const { logs, total, isLoading, isLoadingMore, hasMore } = storeToRefs(auditStore)

const filters = reactive<AuditLogFilters>({
  hotelId: null,
  usuarioId: null,
  clienteNombre: '',
  fechaRango: null,
  accion: '',
  entidad: '',
})

// Expanded details toggles
const expandedItems = ref<Record<number, boolean>>({})

function toggleExpand(id: number) {
  expandedItems.value[id] = !expandedItems.value[id]
}

// Shortcuts para el selector de fechas
const dateShortcuts = [
  {
    text: 'Hoy',
    value: () => {
      const end = new Date()
      const start = new Date()
      return [start, end]
    },
  },
  {
    text: 'Últimos 7 días',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 7)
      return [start, end]
    },
  },
  {
    text: 'Últimos 30 días',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 30)
      return [start, end]
    },
  },
  {
    text: 'Este mes',
    value: () => {
      const end = new Date()
      const start = new Date(end.getFullYear(), end.getMonth(), 1)
      return [start, end]
    },
  },
]

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function applyFilters() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    auditStore.fetchAuditLogs(filters, true)
  }, 250)
}

function resetFilters() {
  filters.hotelId = null
  filters.usuarioId = null
  filters.clienteNombre = ''
  filters.fechaRango = null
  filters.accion = ''
  filters.entidad = ''
  auditStore.fetchAuditLogs(filters, true)
}

function handleLoadMore() {
  auditStore.loadMore(filters)
}

// Watch filters
watch(
  () => [filters.hotelId, filters.usuarioId, filters.accion, filters.entidad, filters.fechaRango],
  () => {
    auditStore.fetchAuditLogs(filters, true)
  },
)

// Helpers de estilo y semántica
function getActionColor(accion: string): string {
  switch (accion?.toUpperCase()) {
    case 'CREAR':
      return '#10b981' // Esmeralda / éxito
    case 'MODIFICAR':
      return '#3b82f6' // Azul / primario
    case 'ELIMINAR':
      return '#f56c6c' // Coral / peligro
    case 'LOGIN':
      return '#6366f1' // Índigo
    case 'LOGOUT':
      return '#94a3b8' // Pizarra suave
    default:
      return '#64748b'
  }
}

function getActionTagType(accion: string): 'success' | 'primary' | 'danger' | 'warning' | 'info' {
  switch (accion?.toUpperCase()) {
    case 'CREAR':
      return 'success'
    case 'MODIFICAR':
      return 'primary'
    case 'ELIMINAR':
      return 'danger'
    case 'LOGIN':
    case 'LOGOUT':
      return 'warning'
    default:
      return 'info'
  }
}

function getEntityLabel(entidad: string): string {
  switch (entidad?.toUpperCase()) {
    case 'SESION':
      return 'Sesión de Fotos'
    case 'CITA_VENTA':
      return 'Cita de Ventas'
    case 'USUARIO':
      return 'Usuario'
    case 'HOTEL':
      return 'Hotel'
    case 'AREA':
      return 'Zona / Área'
    case 'PAIS':
      return 'País'
    default:
      return entidad || 'Registro'
  }
}

function getDisplayMetadatos(entry: any): Record<string, any> | null {
  if (!entry.metadatos) return null
  let data = entry.metadatos
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data)
    } catch {
      return data
    }
  }
  if (!data || typeof data !== 'object') return data

  // En modificaciones, mostrar únicamente los campos que cambiaron (con su valor anterior y nuevo)
  if (entry.accion === 'MODIFICAR') {
    const filtered: Record<string, any> = {}
    const keys = Object.keys(data)
    const handledNewKeys = new Set<string>()

    for (const key of keys) {
      if (key.endsWith('Anterior') || key.endsWith('Anteriores')) {
        const base = key.endsWith('Anteriores') ? key.slice(0, -10) : key.slice(0, -8)
        const newKey = keys.find(
          (k) =>
            k.startsWith(base) &&
            (k.endsWith('Nuevo') ||
              k.endsWith('Nueva') ||
              k.endsWith('Nuevos') ||
              k.endsWith('Nuevas')),
        )

        if (newKey) {
          handledNewKeys.add(newKey)
          // Solo si los valores son diferentes, mostrar tanto el anterior como el nuevo
          if (data[key] !== data[newKey]) {
            filtered[key] = data[key]
            filtered[newKey] = data[newKey]
          }
          continue
        }
      }

      // Si es una clave nueva ya evaluada junto a su anterior, ignorar
      if (handledNewKeys.has(key)) {
        continue
      }

      // Si es una clave tipo nuevo/nueva con par anterior pero procesada en otro orden
      if (
        key.endsWith('Nuevo') ||
        key.endsWith('Nueva') ||
        key.endsWith('Nuevos') ||
        key.endsWith('Nuevas')
      ) {
        const base = key.replace(/Nuev[oas]+$/, '')
        const prevKey = keys.find((k) => k.startsWith(base) && k.includes('Anterior'))
        if (prevKey) {
          continue
        }
      }

      // Otras claves individuales
      filtered[key] = data[key]
    }

    return Object.keys(filtered).length > 0 ? filtered : null
  }

  return Object.keys(data).length > 0 ? data : null
}

onMounted(async () => {
  if (hotelStore.hotels.length === 0) {
    hotelStore.fetchHotels().catch(() => {})
  }
  if (userStore.users.length === 0) {
    userStore.fetchUsers().catch(() => {})
  }
  await auditStore.fetchAuditLogs(filters, true)
})
</script>

<template>
  <div class="audit-log-tab">
    <!-- Panel superior de filtros -->
    <div class="filters-card">
      <div class="filters-grid">
        <!-- Búsqueda por cliente -->
        <div class="filter-item">
          <label class="filter-label">Nombre del Cliente</label>
          <el-input
            v-model="filters.clienteNombre"
            placeholder="Buscar por cliente..."
            :prefix-icon="Search"
            clearable
            size="large"
            @input="applyFilters"
          />
        </div>

        <!-- Filtro por Hotel -->
        <div class="filter-item">
          <label class="filter-label">Hotel</label>
          <el-select
            v-model="filters.hotelId"
            placeholder="Todos los hoteles"
            clearable
            filterable
            size="large"
            class="full-width"
          >
            <el-option v-for="h in hotelStore.hotels" :key="h.id" :label="h.nombre" :value="h.id" />
          </el-select>
        </div>

        <!-- Filtro por Usuario -->
        <div class="filter-item">
          <label class="filter-label">Usuario que realizó la acción</label>
          <el-select
            v-model="filters.usuarioId"
            placeholder="Todos los usuarios"
            clearable
            filterable
            size="large"
            class="full-width"
          >
            <el-option
              v-for="u in userStore.users"
              :key="u.id"
              :label="`${u.nombre} ${u.apellidos || ''}`.trim()"
              :value="u.id"
            />
          </el-select>
        </div>

        <!-- Filtro por Rango de Fechas -->
        <div class="filter-item filter-dates">
          <label class="filter-label">Rango de Fechas</label>
          <el-date-picker
            v-model="filters.fechaRango"
            type="daterange"
            range-separator="a"
            start-placeholder="Desde"
            end-placeholder="Hasta"
            size="large"
            :shortcuts="dateShortcuts"
            class="full-width"
          />
        </div>
      </div>

      <!-- Fila secundaria: chips de acción rápida y botón de reset -->
      <div class="secondary-toolbar">
        <div class="action-chips">
          <span class="chips-label">Tipo de acción:</span>
          <el-tag
            :effect="filters.accion === '' ? 'dark' : 'plain'"
            class="filter-chip"
            @click="filters.accion = ''"
          >
            Todas
          </el-tag>
          <el-tag
            :effect="filters.accion === 'CREAR' ? 'dark' : 'plain'"
            type="success"
            class="filter-chip"
            @click="filters.accion = filters.accion === 'CREAR' ? '' : 'CREAR'"
          >
            Creaciones
          </el-tag>
          <el-tag
            :effect="filters.accion === 'MODIFICAR' ? 'dark' : 'plain'"
            type="primary"
            class="filter-chip"
            @click="filters.accion = filters.accion === 'MODIFICAR' ? '' : 'MODIFICAR'"
          >
            Modificaciones
          </el-tag>
          <el-tag
            :effect="filters.accion === 'ELIMINAR' ? 'dark' : 'plain'"
            type="danger"
            class="filter-chip"
            @click="filters.accion = filters.accion === 'ELIMINAR' ? '' : 'ELIMINAR'"
          >
            Eliminaciones
          </el-tag>
          <el-tag
            :effect="filters.accion === 'LOGIN' ? 'dark' : 'plain'"
            type="warning"
            class="filter-chip"
            @click="filters.accion = filters.accion === 'LOGIN' ? '' : 'LOGIN'"
          >
            Inicios de sesión
          </el-tag>
          <el-tag
            :effect="filters.accion === 'LOGOUT' ? 'dark' : 'plain'"
            type="info"
            class="filter-chip"
            @click="filters.accion = filters.accion === 'LOGOUT' ? '' : 'LOGOUT'"
          >
            Cierres de sesión
          </el-tag>
        </div>

        <el-button plain size="default" :icon="RotateCcw" class="reset-btn" @click="resetFilters">
          Limpiar filtros
        </el-button>
      </div>
    </div>

    <!-- Barra de estado y conteo -->
    <div class="results-header">
      <div class="results-count">
        <el-icon class="count-icon"><Clock /></el-icon>
        <span>
          Mostrando
          <strong>{{ logs.length }}</strong>
          de
          <strong>{{ total }}</strong>
          registros
        </span>
      </div>
      <div v-if="isLoading" class="loading-badge">
        <span>Actualizando historial...</span>
      </div>
    </div>

    <!-- Timeline interactivo -->
    <div v-loading="isLoading" class="timeline-container">
      <div v-if="logs.length === 0 && !isLoading" class="empty-state-box">
        <el-empty
          description="No se encontraron registros de actividad con los filtros seleccionados"
          :image-size="120"
        >
          <el-button type="primary" plain @click="resetFilters">
            Restablecer todos los filtros
          </el-button>
        </el-empty>
      </div>

      <el-timeline v-else mode="alternate-reverse" class="custom-timeline">
        <el-timeline-item
          v-for="entry in logs"
          :key="entry.id"
          :timestamp="entry.fechaFormateada || entry.createdAt"
          placement="top"
          :color="getActionColor(entry.accion)"
          size="large"
          class="timeline-entry"
        >
          <!-- Custom dot con icono temático según la entidad -->
          <template #dot>
            <div
              class="custom-dot"
              :style="{ backgroundColor: getActionColor(entry.accion) }"
              :title="entry.accion"
            >
              <LogIn v-if="entry.accion === 'LOGIN'" :size="13" class="dot-icon" />
              <LogOut v-else-if="entry.accion === 'LOGOUT'" :size="13" class="dot-icon" />
              <Camera v-else-if="entry.entidad === 'SESION'" :size="13" class="dot-icon" />
              <Calendar v-else-if="entry.entidad === 'CITA_VENTA'" :size="13" class="dot-icon" />
              <Building2 v-else-if="entry.entidad === 'HOTEL'" :size="13" class="dot-icon" />
              <MapPin
                v-else-if="entry.entidad === 'AREA' || entry.entidad === 'PAIS'"
                :size="13"
                class="dot-icon"
              />
              <UserRound v-else-if="entry.entidad === 'USUARIO'" :size="13" class="dot-icon" />
              <Sparkles v-else :size="13" class="dot-icon" />
            </div>
          </template>

          <!-- Tarjeta el-card de Element Plus -->
          <el-card class="timeline-card" shadow="hover">
            <div class="entry-header">
              <div class="user-block">
                <!-- Avatar con foto o iniciales (reutilizando userStore) -->
                <el-avatar
                  :src="userStore.users.find((u) => u.id === entry.usuarioId)?.imagen || undefined"
                  shape="circle"
                  :size="36"
                  :style="{
                    backgroundColor: getUserBgColor(userStore.users.find((u) => u.id === entry.usuarioId)?.color),
                    color: '#ffffff',
                    fontWeight: '600',
                  }"
                  :title="entry.usuarioRol"
                >
                  {{ getUserInitials(entry.usuarioNombre?.split(' ')[0], entry.usuarioNombre?.split(' ').slice(1).join(' ')) }}
                </el-avatar>
                <div class="user-info">
                  <span class="user-name">{{ entry.usuarioNombre }}</span>
                  <span class="user-role">({{ entry.usuarioRol?.toLowerCase() }})</span>
                </div>
              </div>

              <!-- Badge único de acción y entidad -->
              <div class="entry-badges">
                <el-tag :type="getActionTagType(entry.accion)" size="small" class="action-tag">
                  {{ entry.accion }}<template v-if="entry.entidad && entry.entidad !== 'SISTEMA'"> · {{ getEntityLabel(entry.entidad) }}</template>
                </el-tag>
              </div>
            </div>

            <!-- Acción principal humana -->
            <div class="entry-action-line">
              <span class="action-verb">{{ entry.descripcion }}</span>
            </div>

            <!-- Contexto detallado (Cliente, Hotel, etc.) sin recuadro anidado -->
            <div v-if="entry.contexto" class="context-text">
              {{ entry.contexto }}
            </div>

            <div
              v-if="entry.hotelNombre || entry.clienteNombre || entry.ipAddress"
              class="context-meta-pills"
            >
              <span v-if="entry.hotelNombre" class="context-pill hotel-pill">
                <Building2 :size="12" />
                {{ entry.hotelNombre }}
              </span>
              <span v-if="entry.clienteNombre" class="context-pill client-pill">
                <UserRound :size="12" />
                Cliente: {{ entry.clienteNombre }}
              </span>
              <span v-if="entry.ipAddress" class="context-pill ip-pill">
                IP: {{ entry.ipAddress }}
              </span>
            </div>

            <!-- Información de creación original (Requisito clave en modificaciones) -->
            <div v-if="entry.creadorOriginal" class="original-creator-box">
              <div class="creator-content">
                <Info :size="15" class="creator-icon" />
                <span class="creator-text">{{ entry.creadorOriginal }}</span>
              </div>
            </div>

            <!-- Metadatos expandibles opcionales -->
            <div v-if="getDisplayMetadatos(entry)" class="metadata-section">
              <button type="button" class="metadata-toggle-btn" @click="toggleExpand(entry.id)">
                <span>
                  {{
                    expandedItems[entry.id]
                      ? entry.accion === 'MODIFICAR'
                        ? 'Ocultar cambios'
                        : 'Ocultar detalles técnicos'
                      : entry.accion === 'MODIFICAR'
                        ? 'Ver cambios'
                        : 'Ver detalles técnicos'
                  }}
                </span>
                <ChevronDown :size="14" :class="{ rotated: expandedItems[entry.id] }" />
              </button>
              <div v-if="expandedItems[entry.id]" class="metadata-content">
                <pre class="metadata-json">{{ JSON.stringify(getDisplayMetadatos(entry), null, 2) }}</pre>
              </div>
            </div>
          </el-card>
        </el-timeline-item>
      </el-timeline>

      <!-- Botón de paginación incremental / Cargar más -->
      <div v-if="hasMore" class="load-more-section">
        <el-button
          type="primary"
          plain
          size="large"
          :loading="isLoadingMore"
          class="load-more-btn"
          @click="handleLoadMore"
        >
          Cargar más actividades (mostrando {{ logs.length }} de {{ total }})
        </el-button>
      </div>
      <div v-else-if="logs.length > 0 && !isLoading" class="end-of-records">
        <span>Has llegado al final del registro de actividad.</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.audit-log-tab {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-top: 0.5rem;
}

/* Tarjeta de Filtros */
.filters-card {
  background-color: var(--toolbar-bg, #ffffff);
  border: 1px solid var(--toolbar-border, #e2e8f0);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.filter-dates {
  grid-column: span 1;
}

@media (min-width: 992px) {
  .filters-grid {
    grid-template-columns: 1.3fr 1.2fr 1.2fr 1.5fr;
  }
}

.filter-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--heading-color, #0f172a);
}

.full-width {
  width: 100%;
}

.secondary-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--toolbar-border, #e2e8f0);
}

.action-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.chips-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--nav-link-color, #64748b);
  margin-right: 0.25rem;
}

.filter-chip {
  cursor: pointer;
  border-radius: 9999px;
  padding: 0 0.75rem;
  font-size: 0.8rem;
  transition: all 0.15s ease-in-out;
  user-select: none;
}

.filter-chip:hover {
  opacity: 0.85;
  transform: translateY(-1px);
}

.reset-btn {
  font-size: 0.85rem;
  border-radius: 8px;
}

/* Header de resultados */
.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 0.5rem;
}

.results-count {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--nav-link-color, #64748b);
}

.count-icon {
  color: var(--color-primary, #409eff);
}

.loading-badge {
  font-size: 0.82rem;
  color: var(--color-primary, #409eff);
  font-weight: 500;
}

/* Timeline Container */
.timeline-container {
  min-height: 250px;
  padding: 0.5rem 0;
}

.empty-state-box {
  padding: 2.5rem 1rem;
}

.custom-timeline {
  padding-left: 0;
  padding-right: 0;
}

/* Centrado exacto del custom dot con la línea del timeline */
:deep(.el-timeline.is-start .el-timeline-item__dot) {
  left: 5px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.el-timeline.is-alternate .el-timeline-item__dot),
:deep(.el-timeline.is-alternate-reverse .el-timeline-item__dot) {
  left: 50% !important;
  transform: translateX(-50%) !important;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

:deep(.el-timeline-item__timestamp) {
  font-size: 0.85rem !important;
  font-weight: 600 !important;
  color: var(--nav-link-color, #64748b) !important;
  margin-bottom: 0.6rem !important;
}

.custom-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  position: relative;
  z-index: 2;
}

.dot-icon {
  stroke-width: 2.5;
}

/* Tarjeta el-card */
.timeline-card {
  text-align: left;
  border-radius: 10px;
}

:deep(.timeline-card .el-card__body) {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 1rem 1.25rem;
}

.entry-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.user-block {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.user-info {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.user-name {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--heading-color, #0f172a);
}

.user-role {
  font-size: 0.8rem;
  color: var(--nav-link-color, #64748b);
  font-weight: 500;
}

.entry-badges {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.action-tag {
  font-weight: 600;
  border-radius: 6px;
}

.entry-action-line {
  font-size: 0.95rem;
  color: var(--heading-color, #0f172a);
}

.action-verb {
  font-weight: 600;
}

/* Context & Pills */
.context-text {
  font-size: 0.88rem;
  color: var(--heading-color, #1e293b);
  line-height: 1.4;
}

.context-meta-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.context-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.78rem;
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
  background-color: var(--app-bg, #f1f5f9);
  color: var(--nav-link-color, #475569);
  font-weight: 500;
}

.hotel-pill {
  background-color: #eff6ff;
  color: #1d4ed8;
}

.client-pill {
  background-color: #ecfdf5;
  color: #047857;
}

.ip-pill {
  background-color: #f8fafc;
  color: #64748b;
  font-family: monospace;
}

/* Caja destacada de Creador Original (Requisito clave) */
.original-creator-box {
  background-color: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  padding: 0.55rem 0.85rem;
}

.creator-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.creator-icon {
  color: #d97706;
  flex-shrink: 0;
}

.creator-text {
  font-size: 0.84rem;
  color: #92400e;
  font-weight: 500;
}

/* Metadatos */
.metadata-section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.metadata-toggle-btn {
  background: none;
  border: none;
  padding: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.78rem;
  color: var(--color-primary, #409eff);
  cursor: pointer;
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.metadata-toggle-btn:hover {
  color: #2563eb;
}

.metadata-toggle-btn .rotated {
  transform: rotate(180deg);
}

.metadata-content {
  background-color: #0f172a;
  border-radius: 6px;
  padding: 0.6rem 0.8rem;
  overflow-x: auto;
}

.metadata-json {
  margin: 0;
  font-family: monospace;
  font-size: 0.75rem;
  color: #38bdf8;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Paginación / Cargar más */
.load-more-section {
  display: flex;
  justify-content: center;
  padding: 1.5rem 0 0.5rem 0;
}

.load-more-btn {
  min-width: 300px;
  border-radius: 8px;
  font-weight: 600;
}

.end-of-records {
  text-align: center;
  padding: 1.5rem 0 0.5rem 0;
  font-size: 0.84rem;
  color: var(--nav-link-color, #94a3b8);
}

/* Dark mode adjustments */
:root.dark .filters-card {
  background-color: var(--toolbar-bg, #1d1e1f);
  border-color: var(--toolbar-border, #363637);
}

:root.dark .hotel-pill {
  background-color: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
}

:root.dark .client-pill {
  background-color: rgba(16, 185, 129, 0.15);
  color: #34d399;
}

:root.dark .ip-pill {
  background-color: #262627;
  color: #a1a1aa;
}

:root.dark .original-creator-box {
  background-color: rgba(217, 119, 6, 0.12);
  border-color: rgba(217, 119, 6, 0.3);
}

:root.dark .creator-text {
  color: #fcd34d;
}
</style>
