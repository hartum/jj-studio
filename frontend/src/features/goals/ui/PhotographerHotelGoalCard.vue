<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatCurrency } from '@/shared/formatters'
import type { FotografoProgreso, HotelProgresoResumen, SemaforoEstado } from '../domain/goal.model'
import {
  SuccessFilled,
  WarningFilled,
  CircleCloseFilled,
  InfoFilled,
  Money,
  TrendCharts,
  Calendar,
} from '@element-plus/icons-vue'
import { Building2, Award, Sparkles, Check } from '@lucide/vue'

const { t } = useI18n()

const props = defineProps<{
  hotelNombre: string
  hotelProgreso: HotelProgresoResumen
  personalProgreso: FotografoProgreso
  monthLabel: string
}>()

function getSemaforoColor(estado?: SemaforoEstado): string {
  if (estado === 'SIN_META' || !estado) return '#94a3b8'
  if (estado === 'VERDE') return '#10b981'
  if (estado === 'AMARILLO') return '#f59e0b'
  return '#ef4444'
}

function getSemaforoBg(estado?: SemaforoEstado): string {
  if (estado === 'SIN_META' || !estado) return 'rgba(148, 163, 184, 0.12)'
  if (estado === 'VERDE') return 'rgba(16, 185, 129, 0.12)'
  if (estado === 'AMARILLO') return 'rgba(245, 158, 11, 0.12)'
  return 'rgba(239, 68, 68, 0.12)'
}

function getSemaforoIcon(estado?: SemaforoEstado) {
  if (estado === 'SIN_META' || !estado) return InfoFilled
  if (estado === 'VERDE') return SuccessFilled
  if (estado === 'AMARILLO') return WarningFilled
  return CircleCloseFilled
}

function getCappedPercentage(val?: number): number {
  if (val === undefined || isNaN(val)) return 0
  return Math.min(Math.max(0, val), 100)
}

const numFotografos = computed(() => {
  return props.hotelProgreso.fotografos?.length || 0
})

const fotografoSubtitle = computed(() => {
  const count = numFotografos.value
  const label = count === 1 ? t('dashboard.goalCard.photographerSingle') : t('dashboard.goalCard.photographerPlural', { count })
  return t('dashboard.goalCard.teamGlobalProgress', { label })
})

const displayHotelTitle = computed(() => {
  const name = props.hotelNombre || ''
  if (name.toLowerCase().startsWith('hotel')) {
    return name
  }
  return `${t('dashboard.table.hotel')} ${name}`
})

const hasIndividualBonus = computed(() => {
  return Boolean(props.personalProgreso?.metaBonus && props.personalProgreso.metaBonus > 0)
})

const hasGroupBonus = computed(() => {
  if (!props.hotelProgreso || props.hotelProgreso.metaImporte <= 0) return false
  if (props.hotelProgreso.valorBonoGrupal !== undefined) {
    return props.hotelProgreso.valorBonoGrupal !== null && props.hotelProgreso.valorBonoGrupal > 0
  }
  return true
})

const teamMemberCount = computed(() => Math.max(1, props.hotelProgreso.fotografos?.length || 1))

const groupBonusShare = computed(() => {
  const total = props.hotelProgreso.valorBonoGrupal || 0
  if (total <= 0) return 0
  return Math.round((total / teamMemberCount.value) * 100) / 100
})
</script>

<template>
  <el-card class="combined-goal-card" shadow="hover">
    <!-- TÍTULO CON ICONO DE HOTEL -->
    <div class="card-hotel-main-header">
      <el-icon class="hotel-header-icon"><Building2 :size="20" /></el-icon>
      <h3 class="card-hotel-main-title">{{ displayHotelTitle }}</h3>
    </div>

    <!-- ============================================== -->
    <!-- PARTE SUPERIOR: META DEL HOTEL -->
    <!-- ============================================== -->
    <div class="goal-section collective-section">
      <!-- Header -->
      <div class="goal-section-header">
        <div class="header-titles">
          <div class="title-with-theme-icon">
            <el-icon class="section-theme-icon text-primary"><Building2 :size="18" /></el-icon>
            <h3 class="goal-title">
              {{ $t('dashboard.goalCard.hotelGoalAmount', { amount: formatCurrency(hotelProgreso.metaImporte) }) }}
            </h3>
          </div>
          <p class="goal-subtitle">{{ fotografoSubtitle }}</p>
        </div>

        <div
          class="semaforo-badge"
          :style="{
            backgroundColor: getSemaforoBg(hotelProgreso.semaforo),
            color: getSemaforoColor(hotelProgreso.semaforo),
            borderColor: getSemaforoColor(hotelProgreso.semaforo),
          }"
        >
          <el-icon :size="14"><component :is="getSemaforoIcon(hotelProgreso.semaforo)" /></el-icon>
          <span class="badge-text">{{ $t('dashboard.goalCard.hotelGoal') }}</span>
        </div>
      </div>

      <!-- Main Amounts -->
      <div class="amounts-row">
        <div class="amount-current">
          <span class="current-value" :style="{ color: getSemaforoColor(hotelProgreso.semaforo) }">
            {{ formatCurrency(hotelProgreso.ventasRealesUsd) }}
          </span>
          <span class="target-value">/ {{ formatCurrency(hotelProgreso.metaImporte) }}</span>
        </div>

        <div
          class="percentage-pill"
          :style="{
            backgroundColor: getSemaforoBg(hotelProgreso.semaforo),
            color: getSemaforoColor(hotelProgreso.semaforo),
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
              backgroundColor: getSemaforoColor(hotelProgreso.semaforo),
              boxShadow: `0 0 12px ${getSemaforoColor(hotelProgreso.semaforo)}66`,
            }"
          ></div>
        </div>
      </div>

      <!-- Notificación Bono Grupal del Hotel -->
      <div v-if="hasGroupBonus" class="section-bonus-notice">
        <div class="bonus-footer-item-header">
          <el-icon class="text-primary"><Sparkles :size="15" /></el-icon>
          <span class="bonus-footer-label">{{ $t('goalsConfig.groupBonusLabel') }}</span>
        </div>
        <div class="bonus-footer-item-content">
          <el-tag
            v-if="hotelProgreso.alcanzoBonoGrupal"
            type="success"
            effect="plain"
            round
            size="small"
          >
            <el-icon class="mr-1"><Check :size="13" /></el-icon>
            {{ $t('goalsConfig.groupBonusAchieved') }}
          </el-tag>
          <div v-else class="bonus-missing-inline">
            <span class="bonus-missing-highlight text-primary">
              {{
                groupBonusShare > 0
                  ? $t('goalsConfig.remainingForGroupBonus', {
                      amount: formatCurrency(hotelProgreso.faltanteBonoGrupal || 0),
                      share: formatCurrency(groupBonusShare),
                    })
                  : $t('goalsConfig.remainingForGroupBonusSimple', {
                      amount: formatCurrency(hotelProgreso.faltanteBonoGrupal || 0),
                    })
              }}
            </span>
            <span class="bonus-fraction">
              ({{ formatCurrency(hotelProgreso.ventasRealesUsd) }} / {{ formatCurrency(hotelProgreso.metaImporte) }})
            </span>
          </div>
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
      </div>
    </div>

    <!-- ============================================== -->
    <!-- LÍNEA CONTINUA DE SEPARACIÓN -->
    <!-- ============================================== -->
    <div class="card-solid-divider"></div>

    <!-- ============================================== -->
    <!-- PARTE INFERIOR: TU META PERSONAL -->
    <!-- ============================================== -->
    <div class="goal-section personal-section">
      <!-- Header -->
      <div class="goal-section-header">
        <div class="header-titles">
          <div class="title-with-theme-icon">
            <el-icon class="section-theme-icon text-success"><Money :size="18" /></el-icon>
            <h3 class="goal-title">
              {{ $t('dashboard.goalCard.yourPersonalGoal', { amount: formatCurrency(personalProgreso.metaImporte) }) }}
            </h3>
          </div>
          <p class="goal-subtitle">{{ $t('dashboard.goalCard.individualProgress', { month: monthLabel }) }}</p>
        </div>

        <div
          class="semaforo-badge"
          :style="{
            backgroundColor: getSemaforoBg(personalProgreso.semaforo),
            color: getSemaforoColor(personalProgreso.semaforo),
            borderColor: getSemaforoColor(personalProgreso.semaforo),
          }"
        >
          <el-icon :size="14"
            ><component :is="getSemaforoIcon(personalProgreso.semaforo)"
          /></el-icon>
          <span class="badge-text">{{ $t('dashboard.goalCard.yourPerformance') }}</span>
        </div>
      </div>

      <!-- Main Amounts -->
      <div class="amounts-row">
        <div class="amount-current">
          <span
            class="current-value"
            :style="{ color: getSemaforoColor(personalProgreso.semaforo) }"
          >
            {{ formatCurrency(personalProgreso.ventasRealesUsd) }}
          </span>
          <span class="target-value">/ {{ formatCurrency(personalProgreso.metaImporte) }}</span>
        </div>

        <div
          class="percentage-pill"
          :style="{
            backgroundColor: getSemaforoBg(personalProgreso.semaforo),
            color: getSemaforoColor(personalProgreso.semaforo),
          }"
        >
          {{ personalProgreso.porcentajeCumplimiento }}%
        </div>
      </div>

      <!-- Dynamic Progress Bar -->
      <div class="progress-track-wrapper">
        <div class="progress-track">
          <div
            class="progress-fill"
            :style="{
              width: `${getCappedPercentage(personalProgreso.porcentajeCumplimiento)}%`,
              backgroundColor: getSemaforoColor(personalProgreso.semaforo),
              boxShadow: `0 0 12px ${getSemaforoColor(personalProgreso.semaforo)}66`,
            }"
          ></div>
        </div>
      </div>

      <!-- Notificación Bono Individual -->
      <div v-if="hasIndividualBonus" class="section-bonus-notice">
        <div class="bonus-footer-item-header">
          <el-icon class="text-warning"><Award :size="16" /></el-icon>
          <span class="bonus-footer-label">{{ $t('goalsConfig.bonusGoalUsd') }}:</span>
        </div>
        <div class="bonus-footer-item-content">
          <el-tag
            v-if="personalProgreso.alcanzoBonus"
            type="success"
            effect="dark"
            round
            size="small"
          >
            <el-icon class="mr-1"><Award :size="13" /></el-icon>
            {{ $t('goalsConfig.individualBonusAchieved') }}
          </el-tag>
          <div v-else class="bonus-missing-inline">
            <span class="bonus-missing-highlight text-warning">
              {{
                personalProgreso.valorBonus && personalProgreso.valorBonus > 0
                  ? $t('goalsConfig.remainingForBonus', {
                      amount: formatCurrency(personalProgreso.faltanteBonus || 0),
                      bonusValue: formatCurrency(personalProgreso.valorBonus),
                    })
                  : $t('goalsConfig.remainingForBonusSimple', {
                      amount: formatCurrency(personalProgreso.faltanteBonus || 0),
                    })
              }}
            </span>
            <span class="bonus-fraction">
              ({{ formatCurrency(personalProgreso.ventasRealesUsd) }} / {{ formatCurrency(personalProgreso.metaBonus) }})
            </span>
          </div>
        </div>
      </div>

      <!-- Pacing Metrics -->
      <div class="pacing-metrics-row">
        <div class="pacing-item">
          <el-icon :size="14" class="pacing-icon"><Calendar /></el-icon>
          <span class="pacing-label">{{ $t('dashboard.goalCard.pacingToday') }}</span>
          <span class="pacing-val">{{ formatCurrency(personalProgreso.metaEsperadaHoy) }}</span>
        </div>

        <div class="pacing-item">
          <el-icon :size="14" class="pacing-icon"><TrendCharts /></el-icon>
          <span class="pacing-label">{{ $t('dashboard.goalCard.deviation') }}</span>
          <span
            class="pacing-val font-semibold"
            :class="{
              'text-success': personalProgreso.desviacionMonetaria >= 0,
              'text-danger': personalProgreso.desviacionMonetaria < 0,
            }"
          >
            {{ personalProgreso.desviacionMonetaria >= 0 ? '+' : ''
            }}{{ formatCurrency(personalProgreso.desviacionMonetaria) }}
          </span>
        </div>

        <div v-if="personalProgreso.numVentas !== undefined" class="pacing-item">
          <el-icon :size="14" class="pacing-icon"><Money /></el-icon>
          <span class="pacing-label">{{ $t('dashboard.goalCard.sales') }}</span>
          <span class="pacing-val">{{ personalProgreso.numVentas }}</span>
        </div>
      </div>
    </div>
  </el-card>
</template>

<style scoped>
.combined-goal-card {
  border-radius: 12px;
  border: 1px solid var(--el-border-color-light, #e2e8f0);
  background-color: var(--el-bg-color-overlay, #ffffff);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  margin-bottom: 1.25rem;
}

.combined-goal-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.combined-goal-card :deep(.el-card__body) {
  padding: 1.25rem 1.5rem;
}

.card-hotel-main-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--el-border-color-lighter, #f1f5f9);
}

.hotel-header-icon {
  color: #409eff;
  font-size: 1.15rem;
}

.card-hotel-main-title {
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--heading-color, #0f172a);
  margin: 0;
}

/* Sections */
.goal-section {
  display: flex;
  flex-direction: column;
}

/* Línea continua de separación */
.card-solid-divider {
  width: 100%;
  height: 1px;
  background-color: var(--el-border-color-light, #e2e8f0);
  margin: 1.25rem 0;
}

/* Headers */
.goal-section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.85rem;
  gap: 0.75rem;
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.goal-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 500;
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
  padding: 0.2rem 0.6rem;
  border-radius: 9999px;
  border: 1px solid transparent;
  font-size: 0.72rem;
  font-weight: 600;
  flex-shrink: 0;
  letter-spacing: 0.02em;
}

/* Amounts */
.amounts-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.65rem;
}

.amount-current {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
}

.current-value {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.1;
}

.target-value {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--nav-link-color, #64748b);
}

.percentage-pill {
  padding: 0.15rem 0.45rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 700;
}

/* Progress Track */
.progress-track-wrapper {
  margin-bottom: 0.65rem;
}

.progress-track {
  width: 100%;
  height: 9px;
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
  gap: 1.15rem;
  padding-top: 0.65rem;
  border-top: 1px dashed var(--el-border-color-lighter, #f1f5f9);
  font-size: 0.8rem;
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

.font-semibold {
  font-weight: 600;
}

.title-with-theme-icon {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.section-theme-icon {
  vertical-align: middle;
}

/* Notificación de Bonus bajo barra de progreso */
.section-bonus-notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.65rem;
  padding: 0.15rem 0;
}

.bonus-footer-item-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.bonus-footer-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--heading-color, #0f172a);
}

.bonus-footer-item-content {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.bonus-missing-inline {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.78rem;
}

.bonus-missing-highlight {
  font-weight: 700;
}

.bonus-fraction {
  font-size: 0.72rem;
  color: var(--nav-link-color, #94a3b8);
}
</style>
