<script setup lang="ts">
import { computed } from 'vue'
import type { SemaforoEstado } from '../domain/goal.model'
import {
  SuccessFilled,
  WarningFilled,
  CircleCloseFilled,
  InfoFilled,
  Money,
  TrendCharts,
  Calendar,
  Flag,
} from '@element-plus/icons-vue'

const props = withDefaults(
  defineProps<{
    titulo: string
    subtitulo?: string
    metaImporte: number
    ventasRealesUsd: number
    porcentajeCumplimiento: number
    metaEsperadaHoy: number
    desviacionMonetaria: number
    semaforo: SemaforoEstado
    numVentas?: number
    numSesiones?: number
    badgeText?: string
    isCompact?: boolean
    showFlag?: boolean
  }>(),
  {
    subtitulo: '',
    numVentas: undefined,
    numSesiones: undefined,
    badgeText: '',
    isCompact: false,
    showFlag: true,
  },
)

const isSinMeta = computed(() => {
  return props.semaforo === 'SIN_META' || props.metaImporte <= 0
})

const semaforoColor = computed(() => {
  if (isSinMeta.value) return '#94a3b8' // Slate / Gray
  if (props.semaforo === 'VERDE') return '#10b981' // Green
  if (props.semaforo === 'AMARILLO') return '#f59e0b' // Amber
  return '#ef4444' // Red
})

const semaforoBgLight = computed(() => {
  if (isSinMeta.value) return 'rgba(148, 163, 184, 0.12)'
  if (props.semaforo === 'VERDE') return 'rgba(16, 185, 129, 0.12)'
  if (props.semaforo === 'AMARILLO') return 'rgba(245, 158, 11, 0.12)'
  return 'rgba(239, 68, 68, 0.12)'
})

const semaforoLabel = computed(() => {
  if (isSinMeta.value) return 'Meta no definida'
  if (props.semaforo === 'VERDE') return 'En tiempo / Adelantado'
  if (props.semaforo === 'AMARILLO') return 'Alerta leve'
  return 'Por detrás'
})

const semaforoIcon = computed(() => {
  if (isSinMeta.value) return InfoFilled
  if (props.semaforo === 'VERDE') return SuccessFilled
  if (props.semaforo === 'AMARILLO') return WarningFilled
  return CircleCloseFilled
})

const cappedPercentage = computed(() => {
  return Math.min(Math.max(0, props.porcentajeCumplimiento), 100)
})

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val)
}
</script>

<template>
  <el-card class="goal-card" :class="{ compact: isCompact }" shadow="hover">
    <!-- Header -->
    <div class="goal-card-header">
      <div class="header-titles">
        <h3 class="goal-title">
          <el-icon v-if="showFlag" class="title-flag-icon"><Flag /></el-icon>
          <span>{{ titulo }}</span>
        </h3>
        <p v-if="subtitulo" class="goal-subtitle">{{ subtitulo }}</p>
      </div>

      <div
        class="semaforo-badge"
        :style="{
          backgroundColor: semaforoBgLight,
          color: semaforoColor,
          borderColor: semaforoColor,
        }"
      >
        <el-icon :size="14"><component :is="semaforoIcon" /></el-icon>
        <span class="badge-text">{{ badgeText || semaforoLabel }}</span>
      </div>
    </div>

    <!-- Main Amounts -->
    <div class="amounts-row">
      <div class="amount-current">
        <span class="current-value" :style="{ color: semaforoColor }">
          {{ formatCurrency(ventasRealesUsd) }}
        </span>
        <span class="target-value">/ {{ formatCurrency(metaImporte) }}</span>
      </div>

      <div
        class="percentage-pill"
        :style="{ backgroundColor: semaforoBgLight, color: semaforoColor }"
      >
        {{ porcentajeCumplimiento }}%
      </div>
    </div>

    <!-- Dynamic Semaphor Progress Bar -->
    <div class="progress-track-wrapper">
      <div class="progress-track">
        <div
          class="progress-fill"
          :style="{
            width: `${cappedPercentage}%`,
            backgroundColor: semaforoColor,
            boxShadow: `0 0 12px ${semaforoColor}66`,
          }"
        ></div>
      </div>
    </div>

    <!-- Pacing Details and Footnote -->
    <div class="pacing-metrics-row">
      <div class="pacing-metrics-left">
        <div class="pacing-item">
          <el-icon :size="14" class="pacing-icon"><Calendar /></el-icon>
          <span class="pacing-label">Ritmo a hoy:</span>
          <span class="pacing-val">{{ formatCurrency(metaEsperadaHoy) }}</span>
        </div>

        <div class="pacing-item">
          <el-icon :size="14" class="pacing-icon"><TrendCharts /></el-icon>
          <span class="pacing-label">Desviación:</span>
          <span
            class="pacing-val font-semibold"
            :class="{
              'text-success': desviacionMonetaria >= 0,
              'text-danger': desviacionMonetaria < 0,
            }"
          >
            {{ desviacionMonetaria >= 0 ? '+' : '' }}{{ formatCurrency(desviacionMonetaria) }}
          </span>
        </div>

        <div v-if="numVentas !== undefined" class="pacing-item">
          <el-icon :size="14" class="pacing-icon"><Money /></el-icon>
          <span class="pacing-label">Ventas:</span>
          <span class="pacing-val">{{ numVentas }}</span>
        </div>

        <div v-if="numSesiones !== undefined" class="pacing-item">
          <el-icon :size="14" class="pacing-icon"><Calendar /></el-icon>
          <span class="pacing-label">Sesiones:</span>
          <span class="pacing-val">{{ numSesiones }}</span>
        </div>
      </div>

      <div v-if="$slots.actions || $slots.footer || $slots.default" class="pacing-actions">
        <slot name="actions" />
        <slot name="footer" />
        <slot />
      </div>
    </div>
  </el-card>
</template>

<style scoped>
.goal-card {
  border-radius: 12px;
  border: 1px solid var(--el-border-color-light, #e2e8f0);
  background-color: var(--el-bg-color-overlay, #ffffff);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  margin-bottom: 1rem;
}

.goal-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.goal-card.compact {
  margin-bottom: 0.5rem;
}

.goal-card :deep(.el-card__body) {
  padding: 1.25rem 1.5rem;
}

.goal-card.compact :deep(.el-card__body) {
  padding: 1rem;
}

/* Header */
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
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.title-flag-icon {
  color: #11b981;
  font-size: 1.15rem;
  flex-shrink: 0;
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
  margin-top: 0.5rem;
  margin-bottom: 0.75rem;
}

.amount-current {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  margin-top: 1.7rem;
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
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--el-border-color-lighter, #f1f5f9);
  font-size: 0.82rem;
}

.pacing-metrics-left {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1.25rem;
}

.pacing-actions {
  display: flex;
  align-items: center;
  margin-left: auto;
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

.text-success {
  color: #10b981 !important;
}

.text-danger {
  color: #ef4444 !important;
}
</style>
