<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatCurrency } from '@/shared/formatters'
import type { HotelProgresoResumen, SemaforoEstado } from '../domain/goal.model'
import {
  SuccessFilled,
  WarningFilled,
  CircleCloseFilled,
  InfoFilled,
  Money,
  TrendCharts,
  Calendar,
  User,
} from '@element-plus/icons-vue'
import { Users } from '@lucide/vue'

const { t } = useI18n()

const props = defineProps<{
  hotelProgreso: HotelProgresoResumen
  monthLabel: string
  selectedAnio: number
}>()

function isSinMeta(estado?: SemaforoEstado, metaImporte?: number): boolean {
  return estado === 'SIN_META' || !metaImporte || metaImporte <= 0
}

function getSemaforoColor(estado?: SemaforoEstado, metaImporte?: number): string {
  if (isSinMeta(estado, metaImporte)) return '#94a3b8'
  if (estado === 'VERDE') return '#10b981'
  if (estado === 'AMARILLO') return '#f59e0b'
  return '#ef4444'
}

function getSemaforoBg(estado?: SemaforoEstado, metaImporte?: number): string {
  if (isSinMeta(estado, metaImporte)) return 'rgba(148, 163, 184, 0.12)'
  if (estado === 'VERDE') return 'rgba(16, 185, 129, 0.12)'
  if (estado === 'AMARILLO') return 'rgba(245, 158, 11, 0.12)'
  return 'rgba(239, 68, 68, 0.12)'
}

function getSemaforoLabel(estado?: SemaforoEstado, metaImporte?: number): string {
  if (isSinMeta(estado, metaImporte)) return t('dashboard.trafficLightLabels.noGoal')
  if (estado === 'VERDE') return t('dashboard.trafficLightLabels.onTrackAhead')
  if (estado === 'AMARILLO') return t('dashboard.trafficLightLabels.slightWarning')
  return t('dashboard.trafficLightLabels.behind')
}

function getSemaforoIcon(estado?: SemaforoEstado, metaImporte?: number) {
  if (isSinMeta(estado, metaImporte)) return InfoFilled
  if (estado === 'VERDE') return SuccessFilled
  if (estado === 'AMARILLO') return WarningFilled
  return CircleCloseFilled
}

function getSemaforoTagType(
  estado?: SemaforoEstado,
  metaImporte?: number,
): 'success' | 'warning' | 'danger' | 'info' {
  if (isSinMeta(estado, metaImporte)) return 'info'
  if (estado === 'VERDE') return 'success'
  if (estado === 'AMARILLO') return 'warning'
  return 'danger'
}

function getSemaforoText(estado?: SemaforoEstado, metaImporte?: number): string {
  if (isSinMeta(estado, metaImporte)) return t('dashboard.trafficLightLabels.noGoal')
  if (estado === 'VERDE') return t('dashboard.trafficLightLabels.onTrack')
  if (estado === 'AMARILLO') return t('dashboard.trafficLightLabels.warning')
  return t('dashboard.trafficLightLabels.delayed')
}

function getProgressColor(estado?: SemaforoEstado, metaImporte?: number): string {
  return getSemaforoColor(estado, metaImporte)
}

function getCappedPercentage(val?: number): number {
  if (val === undefined || isNaN(val)) return 0
  return Math.min(Math.max(0, val), 100)
}

const numFotografos = computed(() => {
  return props.hotelProgreso.fotografos?.length || 0
})
</script>

<template>
  <el-card class="supervisor-hotel-card dashboard-card" shadow="hover">
    <!-- ============================================== -->
    <!-- PARTE SUPERIOR: META DEL HOTEL -->
    <!-- ============================================== -->
    <div class="hotel-goal-section">
      <!-- Header -->
      <div class="goal-card-header">
        <div class="header-titles">
          <h3 class="goal-title">{{ $t('dashboard.goalCard.hotelGoal') }}: {{ hotelProgreso.hotelNombre }}</h3>
          <p class="goal-subtitle">
            {{ hotelProgreso.areaNombre }} — {{ monthLabel }} {{ selectedAnio }}
          </p>
        </div>

        <div
          class="semaforo-badge"
          :style="{
            backgroundColor: getSemaforoBg(hotelProgreso.semaforo, hotelProgreso.metaImporte),
            color: getSemaforoColor(hotelProgreso.semaforo, hotelProgreso.metaImporte),
            borderColor: getSemaforoColor(hotelProgreso.semaforo, hotelProgreso.metaImporte),
          }"
        >
          <el-icon :size="14">
            <component :is="getSemaforoIcon(hotelProgreso.semaforo, hotelProgreso.metaImporte)" />
          </el-icon>
          <span class="badge-text">
            {{ getSemaforoLabel(hotelProgreso.semaforo, hotelProgreso.metaImporte) }}
          </span>
        </div>
      </div>

      <!-- Main Amounts -->
      <div class="amounts-row">
        <div class="amount-current">
          <span
            class="current-value"
            :style="{ color: getSemaforoColor(hotelProgreso.semaforo, hotelProgreso.metaImporte) }"
          >
            {{ formatCurrency(hotelProgreso.ventasRealesUsd) }}
          </span>
          <span class="target-value">/ {{ formatCurrency(hotelProgreso.metaImporte) }}</span>
        </div>

        <div
          class="percentage-pill"
          :style="{
            backgroundColor: getSemaforoBg(hotelProgreso.semaforo, hotelProgreso.metaImporte),
            color: getSemaforoColor(hotelProgreso.semaforo, hotelProgreso.metaImporte),
          }"
        >
          {{ hotelProgreso.porcentajeCumplimiento }}%
        </div>
      </div>

      <!-- Dynamic Progress Bar -->
      <div class="progress-track-wrapper">
        <div class="progress-track">
          <div
            class="progress-fill"
            :style="{
              width: `${getCappedPercentage(hotelProgreso.porcentajeCumplimiento)}%`,
              backgroundColor: getSemaforoColor(hotelProgreso.semaforo, hotelProgreso.metaImporte),
              boxShadow: `0 0 12px ${getSemaforoColor(hotelProgreso.semaforo, hotelProgreso.metaImporte)}66`,
            }"
          ></div>
        </div>
      </div>

      <!-- Pacing Metrics -->
      <div class="pacing-metrics-row">
        <div class="pacing-item">
          <el-icon :size="14" class="pacing-icon"><Calendar /></el-icon>
          <span class="pacing-label">{{ $t('dashboard.goalCard.pacingToday') }}</span>
          <span class="pacing-val">{{ formatCurrency(hotelProgreso.metaEsperadaHoy) }}</span>
        </div>

        <div class="pacing-item">
          <el-icon :size="14" class="pacing-icon"><TrendCharts /></el-icon>
          <span class="pacing-label">{{ $t('dashboard.goalCard.deviation') }}</span>
          <span
            class="pacing-val font-semibold"
            :class="{
              'text-success': hotelProgreso.desviacionMonetaria >= 0,
              'text-danger': hotelProgreso.desviacionMonetaria < 0,
            }"
          >
            {{ hotelProgreso.desviacionMonetaria >= 0 ? '+' : ''
            }}{{ formatCurrency(hotelProgreso.desviacionMonetaria) }}
          </span>
        </div>

        <div v-if="hotelProgreso.numVentas !== undefined" class="pacing-item">
          <el-icon :size="14" class="pacing-icon"><Money /></el-icon>
          <span class="pacing-label">{{ $t('dashboard.goalCard.sales') }}</span>
          <span class="pacing-val">{{ hotelProgreso.numVentas }}</span>
        </div>

        <div v-if="hotelProgreso.numSesiones !== undefined" class="pacing-item">
          <el-icon :size="14" class="pacing-icon"><Calendar /></el-icon>
          <span class="pacing-label">{{ $t('dashboard.goalCard.sessions') }}</span>
          <span class="pacing-val">{{ hotelProgreso.numSesiones }}</span>
        </div>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- LÍNEA CONTINUA DE SEPARACIÓN -->
    <!-- ============================================== -->
    <div class="card-solid-divider"></div>

    <!-- ============================================== -->
    <!-- PARTE INFERIOR: RENDIMIENTO DE FOTÓGRAFOS -->
    <!-- ============================================== -->
    <div class="photographers-performance-section">
      <div class="photographers-section-header">
        <div class="header-left">
          <el-icon class="section-icon"><Users :size="18" /></el-icon>
          <h4 class="section-title">
            {{ $t('dashboard.goalCard.individualPhotographers', { hotel: hotelProgreso.hotelNombre }) }}
          </h4>
        </div>
        <el-tag size="small" effect="plain" type="info" class="fotografos-count-tag">
          {{ numFotografos }} {{ numFotografos === 1 ? $t('dashboard.goalCard.photographerSingle') : $t('dashboard.goalCard.photographerPlural', { count: numFotografos }) }}
        </el-tag>
      </div>

      <div v-if="hotelProgreso.fotografos.length === 0" class="empty-photographers-hint">
        <span class="text-muted">{{ $t('dashboard.goalCard.noPhotographersAssigned') }}</span>
      </div>

      <div v-else class="photographers-table-wrapper">
        <el-table :data="hotelProgreso.fotografos" style="width: 100%" size="small" stripe>
          <el-table-column prop="nombreCompleto" :label="$t('dashboard.table.photographer')" min-width="160">
            <template #default="{ row }">
              <div class="photographer-name-cell">
                <el-icon class="photographer-icon"><User /></el-icon>
                <span class="photographer-name">{{ row.nombreCompleto }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column :label="$t('dashboard.table.assignedGoal')" width="130" align="right">
            <template #default="{ row }">
              <span class="font-semibold">{{ formatCurrency(row.metaImporte) }}</span>
            </template>
          </el-table-column>
          <el-table-column :label="$t('dashboard.table.realSales')" width="130" align="right">
            <template #default="{ row }">
              <span class="font-bold text-primary">{{ formatCurrency(row.ventasRealesUsd) }}</span>
            </template>
          </el-table-column>
          <el-table-column :label="$t('dashboard.table.pacingToday')" width="120" align="right">
            <template #default="{ row }">
              <span>{{ formatCurrency(row.metaEsperadaHoy) }}</span>
            </template>
          </el-table-column>
          <el-table-column :label="$t('dashboard.table.progress')" min-width="170">
            <template #default="{ row }">
              <el-progress
                :percentage="Math.min(100, Math.max(0, row.porcentajeCumplimiento))"
                :color="getProgressColor(row.semaforo, row.metaImporte)"
                :stroke-width="8"
              />
            </template>
          </el-table-column>
          <el-table-column :label="$t('dashboard.table.trafficLight')" width="130" align="center">
            <template #default="{ row }">
              <el-tag
                size="small"
                effect="dark"
                :type="getSemaforoTagType(row.semaforo, row.metaImporte)"
              >
                {{ getSemaforoText(row.semaforo, row.metaImporte) }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </el-card>
</template>

<style scoped>
.supervisor-hotel-card {
  border-radius: 12px;
  border: 1px solid var(--el-border-color-light, #e2e8f0);
  background-color: var(--el-bg-color-overlay, #ffffff);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  margin-bottom: 1.5rem;
}

.supervisor-hotel-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.supervisor-hotel-card :deep(.el-card__body) {
  padding: 1.25rem 1.5rem;
}

/* ============================
   SECCIÓN SUPERIOR: META HOTEL
   ============================ */
.hotel-goal-section {
  display: flex;
  flex-direction: column;
}

.goal-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 0.75rem;
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.goal-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
}

.goal-subtitle {
  margin: 0;
  font-size: 0.8rem;
  color: var(--nav-link-color, #64748b);
}

/* Badge */
.semaforo-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.65rem;
  border-radius: 9999px;
  border: 1px solid transparent;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
  letter-spacing: 0.02em;
}

/* Amounts */
.amounts-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.75rem;
}

.amount-current {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
}

.current-value {
  font-size: 1.65rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.1;
}

.target-value {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--nav-link-color, #64748b);
}

.percentage-pill {
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 700;
}

/* Progress Track */
.progress-track-wrapper {
  margin-bottom: 1rem;
}

.progress-track {
  width: 100%;
  height: 10px;
  background-color: var(--app-bg, #f1f5f9);
  border-radius: 9999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 9999px;
  transition:
    width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1),
    background-color 0.4s ease;
}

/* Pacing metrics */
.pacing-metrics-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1.25rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--el-border-color-lighter, #f1f5f9);
  font-size: 0.82rem;
}

.pacing-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--nav-link-color, #64748b);
}

.pacing-icon {
  color: var(--nav-link-color, #94a3b8);
}

.pacing-label {
  font-weight: 500;
}

.pacing-val {
  font-weight: 600;
  color: var(--heading-color, #0f172a);
}

/* ============================
   LÍNEA CONTINUA DE SEPARACIÓN
   ============================ */
.card-solid-divider {
  width: 100%;
  height: 1px;
  background-color: var(--el-border-color-light, #e2e8f0);
  margin: 1.25rem 0;
}

/* ============================
   SECCIÓN INFERIOR: FOTÓGRAFOS
   ============================ */
.photographers-performance-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.photographers-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-icon {
  color: #409eff;
}

.section-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
  margin: 0;
}

.fotografos-count-tag {
  font-weight: 500;
}

.empty-photographers-hint {
  padding: 1rem 0;
  font-size: 0.85rem;
}

.photographers-table-wrapper {
  width: 100%;
  overflow-x: auto;
}

.photographer-name-cell {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.photographer-icon {
  color: #94a3b8;
  font-size: 0.9rem;
}

.photographer-name {
  font-weight: 500;
}

.table-progress-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.table-progress-cell .el-progress {
  flex: 1;
}

.progress-pct-label {
  font-size: 0.75rem;
  font-weight: 700;
  min-width: 40px;
  color: var(--heading-color, #0f172a);
}

.text-success {
  color: #10b981 !important;
}

.text-danger {
  color: #ef4444 !important;
}

.font-semibold {
  font-weight: 600;
}

.font-bold {
  font-weight: 700;
}

.text-primary {
  color: #3b82f6;
}

.text-muted {
  color: #94a3b8;
}
</style>
