<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useAlertStore } from '@/features/alerts/stores/alert.store'
import { useHotelStore } from '@/features/hotels/stores/hotel.store'
import { getUserInitials, getUserBgColor } from '@/features/users/utils/user-avatar'
import { useLocale } from '@/i18n/useLocale'
import { ElMessage } from 'element-plus'
import type { AlertaItem } from '@/features/alerts/domain/alert.model'
import {
  Search,
  RotateCw,
  CheckCheck,
  Check,
  Eye,
  ShieldCheck,
  AlertTriangle,
  Building2,
} from '@lucide/vue'

const { t } = useLocale()
const alertStore = useAlertStore()
const hotelStore = useHotelStore()

const { alerts, total, unreadCount, criticalCount, readCount, currentPage, pageSize, isLoading } =
  storeToRefs(alertStore)

const filters = reactive({
  search: '',
  tipoCaso: null as number | null,
  leida: 'all' as 'all' | 'false' | 'true',
  hotelId: null as number | null,
})

// Modal de detalle
const detailDialogVisible = ref(false)
const selectedAlert = ref<AlertaItem | null>(null)

// Hoteles disponibles ordenados alfabéticamente
const availableHotels = computed(() => {
  return [...hotelStore.hotels].sort((a, b) => a.nombre.localeCompare(b.nombre))
})

let searchDebounceTimeout: ReturnType<typeof setTimeout> | undefined
function handleSearchInput() {
  if (searchDebounceTimeout) {
    clearTimeout(searchDebounceTimeout)
  }
  searchDebounceTimeout = setTimeout(() => {
    loadAlerts(1)
  }, 350)
}

onUnmounted(() => {
  if (searchDebounceTimeout) {
    clearTimeout(searchDebounceTimeout)
  }
})

async function loadAlerts(page = 1) {
  await alertStore.fetchAlertas({
    page,
    limit: pageSize.value,
    search: filters.search,
    tipoCaso: filters.tipoCaso,
    leida: filters.leida,
    hotelId: filters.hotelId,
  })
}

function handlePageChange(page: number) {
  loadAlerts(page)
}

function handleFilterChange() {
  loadAlerts(1)
}

async function toggleReadStatus(alert: AlertaItem) {
  try {
    const newStatus = !alert.leida
    await alertStore.markAsRead(alert.id, newStatus)
    ElMessage.success(
      newStatus
        ? t('configuration.alerts.messages.markedRead')
        : t('configuration.alerts.messages.markedUnread'),
    )
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error al actualizar alerta'
    ElMessage.error(errorMsg)
  }
}

async function handleMarkAllAsRead() {
  try {
    await alertStore.markAllAsRead()
    ElMessage.success(t('configuration.alerts.messages.allMarkedRead'))
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error al marcar alertas'
    ElMessage.error(errorMsg)
  }
}

async function handleEvaluateAlerts() {
  try {
    await alertStore.evaluateAlerts()
    ElMessage.success(t('configuration.alerts.messages.evaluated'))
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error al evaluar anomalías'
    ElMessage.error(errorMsg)
  }
}

function openDetailDialog(alert: AlertaItem) {
  selectedAlert.value = alert
  detailDialogVisible.value = true
}

function handleMarkReadAndClose() {
  if (selectedAlert.value) {
    toggleReadStatus(selectedAlert.value)
    detailDialogVisible.value = false
  }
}

const CASE_BADGES: Record<number, 'warning' | 'danger' | 'primary' | 'info'> = {
  1: 'warning',
  2: 'danger',
  3: 'danger',
  4: 'primary',
}

const GRAVITY_BADGES: Record<string, 'danger' | 'warning' | 'info'> = {
  CRITICA: 'danger',
  ALTA: 'warning',
}

function getCaseBadgeType(tipoCaso: number) {
  return CASE_BADGES[tipoCaso] || 'info'
}

function getCaseLabel(tipoCaso: number): string {
  const labels: Record<number, string> = {
    1: t('configuration.alerts.caseTags.case1'),
    2: t('configuration.alerts.caseTags.case2'),
    3: t('configuration.alerts.caseTags.case3'),
    4: t('configuration.alerts.caseTags.case4'),
  }
  return labels[tipoCaso] || `Caso ${tipoCaso}`
}

function getGravityType(gravedad: string) {
  return GRAVITY_BADGES[gravedad] || 'info'
}

onMounted(async () => {
  if (hotelStore.hotels.length === 0) {
    await hotelStore.fetchHotels()
  }
  await loadAlerts(1)
})
</script>

<template>
  <div class="alerts-container">
    <!-- 1. Stats Bar (Data-First) -->
    <div class="stats-row">
      <div class="stat-card">
        <span class="stat-label">{{ t('configuration.alerts.stats.total') }}</span>
        <span class="stat-value">{{ total }}</span>
      </div>
      <div class="stat-card" :class="{ 'has-unread': unreadCount > 0 }">
        <span class="stat-label">{{ t('configuration.alerts.stats.unread') }}</span>
        <span class="stat-value unread-text">{{ unreadCount }}</span>
      </div>
      <div class="stat-card" :class="{ 'has-critical': criticalCount > 0 }">
        <span class="stat-label">{{ t('configuration.alerts.stats.critical') }}</span>
        <span class="stat-value critical-text">{{ criticalCount }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">{{ t('configuration.alerts.stats.read') }}</span>
        <span class="stat-value">{{ readCount }}</span>
      </div>
    </div>

    <!-- 2. Barra de Filtros y Herramientas -->
    <div class="toolbar-bar">
      <div class="toolbar-left">
        <el-input
          v-model="filters.search"
          :placeholder="t('configuration.alerts.filters.searchPlaceholder')"
          clearable
          size="large"
          class="search-input"
          @input="handleSearchInput"
          @clear="loadAlerts(1)"
        >
          <template #prefix>
            <Search class="tool-icon" />
          </template>
        </el-input>

        <el-select
          v-model="filters.tipoCaso"
          clearable
          size="large"
          :placeholder="t('configuration.alerts.cases.allCases')"
          class="filter-select"
          @change="handleFilterChange"
        >
          <el-option :label="t('configuration.alerts.cases.allCases')" :value="null" />
          <el-option :label="t('configuration.alerts.cases.case1')" :value="1" />
          <el-option :label="t('configuration.alerts.cases.case2')" :value="2" />
          <el-option :label="t('configuration.alerts.cases.case3')" :value="3" />
          <el-option :label="t('configuration.alerts.cases.case4')" :value="4" />
        </el-select>

        <el-select
          v-model="filters.leida"
          size="large"
          class="filter-select-sm"
          @change="handleFilterChange"
        >
          <el-option :label="t('configuration.alerts.filters.allStatus')" value="all" />
          <el-option :label="t('configuration.alerts.filters.unread')" value="false" />
          <el-option :label="t('configuration.alerts.filters.read')" value="true" />
        </el-select>

        <el-select
          v-model="filters.hotelId"
          clearable
          size="large"
          :placeholder="t('configuration.alerts.filters.allHotels')"
          class="filter-select"
          @change="handleFilterChange"
        >
          <el-option :label="t('configuration.alerts.filters.allHotels')" :value="null" />
          <el-option v-for="h in availableHotels" :key="h.id" :label="h.nombre" :value="h.id" />
        </el-select>
      </div>

      <div class="toolbar-right">
        <el-button plain size="large" :disabled="unreadCount === 0" @click="handleMarkAllAsRead">
          <CheckCheck class="btn-icon" />
          <span>{{ t('configuration.alerts.filters.markAllRead') }}</span>
        </el-button>

        <el-button
          type="primary"
          plain
          size="large"
          :loading="isLoading"
          @click="handleEvaluateAlerts"
        >
          <RotateCw class="btn-icon" />
          <span>{{ t('configuration.alerts.filters.evaluate') }}</span>
        </el-button>
      </div>
    </div>

    <!-- 3. Tabla Principal de Alertas -->
    <div v-loading="isLoading" class="table-card">
      <el-table
        v-if="alerts.length > 0"
        :data="alerts"
        stripe
        style="width: 100%"
        class="alerts-table"
      >
        <!-- Estado (Leída / No Leída) -->
        <el-table-column :label="t('configuration.alerts.table.status')" width="110" align="center">
          <template #default="{ row }">
            <span class="status-pill" :class="row.leida ? 'status-read' : 'status-unread'">
              <span class="status-dot"></span>
              {{
                row.leida
                  ? t('configuration.alerts.table.readBadge')
                  : t('configuration.alerts.table.unreadBadge')
              }}
            </span>
          </template>
        </el-table-column>

        <!-- Tipo / Caso y Gravedad -->
        <el-table-column :label="t('configuration.alerts.table.case')" width="170">
          <template #default="{ row }">
            <div class="case-col">
              <el-tag
                :type="getCaseBadgeType(row.tipoCaso)"
                effect="light"
                round
                size="small"
                class="case-tag"
              >
                {{ getCaseLabel(row.tipoCaso) }}
              </el-tag>
              <el-tag
                v-if="row.gravedad === 'CRITICA'"
                type="danger"
                effect="dark"
                round
                size="small"
                class="gravity-tag"
              >
                {{ t('configuration.alerts.table.critical') }}
              </el-tag>
            </div>
          </template>
        </el-table-column>

        <!-- ¿Qué pasó? (Título y Descripción) -->
        <el-table-column :label="t('configuration.alerts.table.whatHappened')" min-width="320">
          <template #default="{ row }">
            <div class="what-happened-col">
              <div class="alert-title-row">
                <span class="alert-title">{{ row.titulo }}</span>
                <el-button
                  link
                  type="primary"
                  size="small"
                  class="details-link-btn"
                  @click="openDetailDialog(row)"
                >
                  <Eye class="link-icon" />
                  <span>{{ t('configuration.alerts.table.viewDetails') }}</span>
                </el-button>
              </div>
              <p class="alert-desc">{{ row.descripcion }}</p>
            </div>
          </template>
        </el-table-column>

        <!-- ¿Quién lo hizo? -->
        <el-table-column :label="t('configuration.alerts.table.whoDidIt')" min-width="190">
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar
                :size="28"
                :style="{ backgroundColor: getUserBgColor(row.usuarioOrigenNombre || '') }"
                class="user-avatar"
              >
                {{ getUserInitials(row.usuarioOrigenNombre || '') }}
              </el-avatar>
              <div class="user-info">
                <span class="user-name">
                  {{ row.usuarioOrigenNombre || t('configuration.alerts.table.system') }}
                </span>
                <span v-if="row.usuarioOrigenRol" class="user-role">
                  {{ row.usuarioOrigenRol }}
                </span>
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- ¿A quién afecta? -->
        <el-table-column :label="t('configuration.alerts.table.whoIsAffected')" min-width="180">
          <template #default="{ row }">
            <span class="affected-text">
              {{ row.usuarioAfectadoNombre || t('configuration.alerts.table.notApplicable') }}
            </span>
          </template>
        </el-table-column>

        <!-- Hotel -->
        <el-table-column :label="t('configuration.alerts.table.hotel')" min-width="150">
          <template #default="{ row }">
            <div v-if="row.hotelNombre" class="hotel-pill">
              <Building2 class="hotel-icon" />
              <span>{{ row.hotelNombre }}</span>
            </div>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>

        <!-- Fecha y hora -->
        <el-table-column :label="t('configuration.alerts.table.date')" width="170">
          <template #default="{ row }">
            <span class="date-text">
              {{ row.fechaFormateada || row.createdAt.slice(0, 16).replace('T', ' ') }}
            </span>
          </template>
        </el-table-column>

        <!-- Acciones -->
        <el-table-column
          :label="t('configuration.alerts.table.actions')"
          width="140"
          align="center"
          fixed="right"
        >
          <template #default="{ row }">
            <el-tooltip
              :content="
                row.leida
                  ? t('configuration.alerts.table.markUnread')
                  : t('configuration.alerts.table.markRead')
              "
              placement="top"
            >
              <el-button
                circle
                :type="row.leida ? 'info' : 'success'"
                plain
                size="small"
                @click="toggleReadStatus(row)"
              >
                <Check v-if="!row.leida" class="action-icon" />
                <RotateCw v-else class="action-icon" />
              </el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>

      <!-- Estado vacío si no hay alertas -->
      <div v-else class="empty-state">
        <div class="empty-icon-wrap">
          <ShieldCheck class="empty-icon" />
        </div>
        <h3 class="empty-title">{{ t('configuration.alerts.empty.title') }}</h3>
        <p class="empty-desc">{{ t('configuration.alerts.empty.description') }}</p>
      </div>

      <!-- 4. Paginación (100 en 100) -->
      <div v-if="total > 0" class="pagination-footer">
        <el-pagination
          :current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          background
          layout="total, prev, pager, next"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- 5. Diálogo Modal de Detalle Exhaustivo -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="t('configuration.alerts.dialog.title')"
      width="680px"
      destroy-on-close
      class="alert-detail-dialog"
    >
      <div v-if="selectedAlert" class="dialog-body">
        <div class="detail-banner" :class="`banner-${selectedAlert.gravedad.toLowerCase()}`">
          <div class="banner-top">
            <el-tag
              :type="getCaseBadgeType(selectedAlert.tipoCaso)"
              effect="dark"
              round
              size="small"
            >
              {{ getCaseLabel(selectedAlert.tipoCaso) }}
            </el-tag>
            <el-tag
              :type="getGravityType(selectedAlert.gravedad)"
              effect="plain"
              round
              size="small"
            >
              {{ selectedAlert.gravedad }}
            </el-tag>
          </div>
          <h3 class="banner-title">{{ selectedAlert.titulo }}</h3>
          <p class="banner-desc">{{ selectedAlert.descripcion }}</p>
        </div>

        <!-- Ficha de Datos Clave -->
        <div class="detail-grid">
          <div class="detail-box">
            <span class="box-label">{{ t('configuration.alerts.table.whoDidIt') }}</span>
            <span class="box-value">
              {{ selectedAlert.usuarioOrigenNombre || t('configuration.alerts.table.system') }}
              <span v-if="selectedAlert.usuarioOrigenRol" class="box-sub">
                ({{ selectedAlert.usuarioOrigenRol }})
              </span>
            </span>
          </div>

          <div class="detail-box">
            <span class="box-label">{{ t('configuration.alerts.table.whoIsAffected') }}</span>
            <span class="box-value">
              {{
                selectedAlert.usuarioAfectadoNombre || t('configuration.alerts.table.notApplicable')
              }}
            </span>
          </div>

          <div class="detail-box">
            <span class="box-label">{{ t('configuration.alerts.table.hotel') }}</span>
            <span class="box-value">{{ selectedAlert.hotelNombre || '-' }}</span>
          </div>

          <div class="detail-box">
            <span class="box-label">{{ t('configuration.alerts.table.date') }}</span>
            <span class="box-value">
              {{ selectedAlert.fechaFormateada || selectedAlert.createdAt }}
            </span>
          </div>
        </div>

        <!-- Desglose Específico para Caso 1 (Sesiones Sospechosas) -->
        <div
          v-if="selectedAlert.tipoCaso === 1 && selectedAlert.metadatos?.sesiones"
          class="meta-section"
        >
          <h4 class="section-heading">
            {{ t('configuration.alerts.dialog.involvedSessions') }}
            ({{ selectedAlert.metadatos.sesiones.length }})
          </h4>
          <el-table
            :data="selectedAlert.metadatos.sesiones"
            size="small"
            border
            style="width: 100%"
          >
            <el-table-column
              property="fechaHoraInicio"
              :label="t('configuration.alerts.dialog.sessionDate')"
              width="150"
            >
              <template #default="{ row }">
                {{ row.fechaHoraInicio.slice(0, 16).replace('T', ' ') }}
              </template>
            </el-table-column>
            <el-table-column
              property="clienteNombre"
              :label="t('configuration.alerts.dialog.client')"
              min-width="140"
            />
            <el-table-column
              property="numeroHabitacion"
              :label="t('configuration.alerts.dialog.room')"
              width="100"
            />
            <el-table-column
              property="hotel"
              :label="t('configuration.alerts.dialog.hotel')"
              min-width="120"
            />
            <el-table-column
              property="citaVentaEstado"
              :label="t('configuration.alerts.dialog.saleState')"
              width="140"
            >
              <template #default="{ row }">
                <el-tag
                  :type="row.citaVentaEstado === 'SIN_CITA_DE_VENTAS' ? 'danger' : 'warning'"
                  size="small"
                >
                  {{ row.citaVentaEstado }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- Desglose de Cambios para Casos 2, 3 o 4 -->
        <div v-else-if="selectedAlert.metadatos?.cambios" class="meta-section">
          <h4 class="section-heading">{{ t('configuration.alerts.dialog.changes') }}</h4>
          <div v-if="Array.isArray(selectedAlert.metadatos.cambios)" class="changes-list">
            <div v-for="(c, idx) in selectedAlert.metadatos.cambios" :key="idx" class="change-item">
              <AlertTriangle class="change-icon" />
              <span>{{ c }}</span>
            </div>
          </div>
          <div v-else class="changes-list">
            <div
              v-for="(val, key) in selectedAlert.metadatos.cambios"
              :key="key"
              class="change-item"
            >
              <AlertTriangle class="change-icon" />
              <strong>{{ key }}:</strong>
              <span>{{ val }}</span>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="detailDialogVisible = false">Cerrar</el-button>
          <el-button
            v-if="selectedAlert && !selectedAlert.leida"
            type="primary"
            @click="handleMarkReadAndClose"
          >
            {{ t('configuration.alerts.table.markRead') }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.alerts-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-top: 0.5rem;
}

/* 1. Stats Row */
.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  background: var(--toolbar-bg, #ffffff);
  border: 1px solid var(--toolbar-border, #e2e8f0);
  border-radius: 10px;
  padding: 1rem 1.25rem;
}

.stat-card.has-unread {
  border-color: rgba(239, 68, 68, 0.4);
  background-color: rgba(254, 242, 242, 0.5);
}

.stat-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--nav-link-color, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
  line-height: 1.2;
}

.unread-text {
  color: #ef4444;
}

.critical-text {
  color: #dc2626;
}

/* 2. Toolbar Bar */
.toolbar-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  flex: 1;
}

.search-input {
  width: 320px;
}

.filter-select {
  width: 200px;
}

.filter-select-sm {
  width: 140px;
}

.tool-icon {
  width: 16px;
  height: 16px;
  color: #94a3b8;
}

.btn-icon {
  width: 16px;
  height: 16px;
  margin-right: 0.4rem;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

/* 3. Table Card */
.table-card {
  background: var(--toolbar-bg, #ffffff);
  border: 1px solid var(--toolbar-border, #e2e8f0);
  border-radius: 12px;
  overflow: hidden;
}

.alerts-table {
  --el-table-header-bg-color: #f8fafc;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-unread {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
}

.status-unread .status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #dc2626;
}

.status-read {
  background: var(--el-fill-color-light, #f1f5f9);
  color: #64748b;
}

.status-read .status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #94a3b8;
}

.case-col {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.3rem;
}

.case-tag {
  font-weight: 600;
}

.gravity-tag {
  font-weight: 700;
  font-size: 0.7rem;
}

.what-happened-col {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.25rem 0;
}

.alert-title-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.alert-title {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--heading-color, #0f172a);
}

.details-link-btn {
  padding: 0;
  font-size: 0.8rem;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.link-icon {
  width: 14px;
  height: 14px;
}

.alert-desc {
  margin: 0;
  font-size: 0.82rem;
  color: var(--nav-link-color, #64748b);
  line-height: 1.45;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.user-avatar {
  font-size: 0.75rem;
  font-weight: 700;
  color: #ffffff;
}

.user-info {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.user-name {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--heading-color, #0f172a);
}

.user-role {
  font-size: 0.75rem;
  color: var(--nav-link-color, #64748b);
}

.affected-text {
  font-size: 0.85rem;
  color: var(--heading-color, #334155);
}

.hotel-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  color: var(--heading-color, #0f172a);
}

.hotel-icon {
  width: 14px;
  height: 14px;
  color: #64748b;
}

.date-text {
  font-size: 0.8rem;
  color: var(--nav-link-color, #64748b);
}

.action-icon {
  width: 14px;
  height: 14px;
}

.text-muted {
  color: #94a3b8;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.empty-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  margin-bottom: 1rem;
}

.empty-icon {
  width: 32px;
  height: 32px;
}

.empty-title {
  margin: 0 0 0.4rem 0;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--heading-color, #0f172a);
}

.empty-desc {
  margin: 0;
  font-size: 0.9rem;
  color: var(--nav-link-color, #64748b);
  max-width: 440px;
}

/* Pagination Footer */
.pagination-footer {
  display: flex;
  justify-content: flex-end;
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--toolbar-border, #e2e8f0);
}

/* Modal Dialog */
.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.detail-banner {
  padding: 1rem 1.25rem;
  border-radius: 8px;
  border: 1px solid transparent;
}

.banner-critica {
  background-color: #fef2f2;
  border-color: #fca5a5;
}

.banner-alta {
  background-color: #fffbeb;
  border-color: #fcd34d;
}

.banner-media {
  background-color: #f0fdf4;
  border-color: #86efac;
}

.banner-top {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.banner-title {
  margin: 0 0 0.35rem 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
}

.banner-desc {
  margin: 0;
  font-size: 0.9rem;
  color: #475569;
  line-height: 1.5;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.detail-box {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  background: var(--el-fill-color-light, #f8fafc);
  padding: 0.75rem 1rem;
  border-radius: 8px;
}

.box-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--nav-link-color, #64748b);
  text-transform: uppercase;
}

.box-value {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--heading-color, #0f172a);
}

.box-sub {
  font-weight: normal;
  color: var(--nav-link-color, #64748b);
}

.meta-section {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.section-heading {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
}

.changes-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.change-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  padding: 0.5rem 0.75rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  color: #334155;
}

.change-icon {
  width: 16px;
  height: 16px;
  color: #f59e0b;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .toolbar-bar {
    flex-direction: column;
    align-items: stretch;
  }
  .toolbar-left {
    flex-direction: column;
    align-items: stretch;
  }
  .search-input,
  .filter-select,
  .filter-select-sm {
    width: 100%;
  }
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
