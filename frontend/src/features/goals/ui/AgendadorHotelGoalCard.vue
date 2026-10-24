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
} from '@element-plus/icons-vue'
import { Building2, Award, Sparkles, Check } from '@lucide/vue'
import { useAuthStore } from '@/features/auth/stores/auth.store'

const { t } = useI18n()
const authStore = useAuthStore()

const props = defineProps<{
  hotelNombre: string
  hotelProgreso: HotelProgresoResumen
  monthLabel: string
  selectedAnio?: number
}>()

const myPersonalProgreso = computed(() => {
  const myId = authStore.user?.id
  if (!myId) return null
  return props.hotelProgreso.fotografos?.find((f) => f.usuarioId === myId) || null
})

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
  if (estado === 'VERDE') return t('dashboard.trafficLightLabels.onTrack')
  if (estado === 'AMARILLO') return t('dashboard.trafficLightLabels.warning')
  return t('dashboard.trafficLightLabels.delayed')
}

function getSemaforoIcon(estado?: SemaforoEstado, metaImporte?: number) {
  if (isSinMeta(estado, metaImporte)) return InfoFilled
  if (estado === 'VERDE') return SuccessFilled
  if (estado === 'AMARILLO') return WarningFilled
  return CircleCloseFilled
}

function getCappedPercentage(val?: number): number {
  if (val === undefined || isNaN(val)) return 0
  return Math.min(Math.max(0, val), 100)
}

const displayHotelTitle = computed(() => {
  const name = props.hotelNombre || props.hotelProgreso.hotelNombre || ''
  if (name.toLowerCase().startsWith('hotel')) {
    return name
  }
  return `${t('dashboard.table.hotel')} ${name}`
})

const hasIndividualBonus = computed(() => {
  return Boolean(myPersonalProgreso.value?.metaBonus && myPersonalProgreso.value.metaBonus > 0)
})

const hasGroupBonus = computed(() => {
  if (!props.hotelProgreso || props.hotelProgreso.metaImporte <= 0) return false
  if (props.hotelProgreso.valorBonoGrupal !== undefined) {
    return props.hotelProgreso.valorBonoGrupal !== null && props.hotelProgreso.valorBonoGrupal > 0
  }
  return true
})

const hasAnyBonus = computed(() => hasIndividualBonus.value || hasGroupBonus.value)

const teamMemberCount = computed(() => Math.max(1, props.hotelProgreso.fotografos?.length || 1))

const groupBonusShare = computed(() => {
  const total = props.hotelProgreso.valorBonoGrupal || 0
  if (total <= 0) return 0
  return Math.round((total / teamMemberCount.value) * 100) / 100
})
</script>

<template>
  <el-card class="agendador-goal-card dashboard-card" shadow="hover">
    <!-- Header: Hotel info -->
    <div class="card-hotel-header">
      <div class="hotel-title-group">
        <el-icon class="hotel-icon"><Building2 :size="20" /></el-icon>
        <div>
          <h3 class="hotel-title">{{ displayHotelTitle }}</h3>
          <span class="hotel-subtitle text-muted">
            {{ hotelProgreso.areaNombre }} — {{ monthLabel }} {{ selectedAnio || hotelProgreso.anio }}
          </span>
        </div>
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
        <span class="badge-text">{{ getSemaforoLabel(hotelProgreso.semaforo, hotelProgreso.metaImporte) }}</span>
      </div>
    </div>

    <!-- Main Amounts -->
    <div class="amounts-row">
      <div class="amount-current">
        <span
          class="current-value font-bold"
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

    <!-- Dynamic Semaphor Progress Bar -->
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

    <!-- Pacing Details & Sub-metrics -->
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
          {{ hotelProgreso.desviacionMonetaria >= 0 ? '+' : '' }}{{ formatCurrency(hotelProgreso.desviacionMonetaria) }}
        </span>
      </div>

      <div class="pacing-item">
        <el-icon :size="14" class="pacing-icon"><Money /></el-icon>
        <span class="pacing-label">{{ $t('dashboard.goalCard.sales') }}</span>
        <span class="pacing-val">{{ hotelProgreso.numVentas }}</span>
      </div>

      <div class="pacing-item">
        <el-icon :size="14" class="pacing-icon"><Calendar /></el-icon>
        <span class="pacing-label">{{ $t('dashboard.goalCard.sessions') }}</span>
        <span class="pacing-val">{{ hotelProgreso.numSesiones }}</span>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- SECCIÓN BONUS (AL FINAL DE LA TARJETA) -->
    <!-- ============================================== -->
    <div v-if="hasAnyBonus" class="bonus-card-footer">
      <div class="bonus-footer-grid">
        <!-- Bono Individual del Agendador/Vendedor (si tiene configurado) -->
        <div v-if="hasIndividualBonus && myPersonalProgreso" class="bonus-footer-item">
          <div class="bonus-footer-item-header">
            <el-icon class="text-warning"><Award :size="16" /></el-icon>
            <span class="bonus-footer-label">{{ $t('goalsConfig.bonusGoalUsd') }}:</span>
          </div>
          <div class="bonus-footer-item-content">
            <el-tag
              v-if="myPersonalProgreso.alcanzoBonus"
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
                  myPersonalProgreso.valorBonus && myPersonalProgreso.valorBonus > 0
                    ? $t('goalsConfig.remainingForBonus', {
                        amount: formatCurrency(myPersonalProgreso.faltanteBonus || 0),
                        bonusValue: formatCurrency(myPersonalProgreso.valorBonus),
                      })
                    : $t('goalsConfig.remainingForBonusSimple', {
                        amount: formatCurrency(myPersonalProgreso.faltanteBonus || 0),
                      })
                }}
              </span>
              <span class="bonus-fraction">
                ({{ formatCurrency(myPersonalProgreso.ventasRealesUsd) }} / {{ formatCurrency(myPersonalProgreso.metaBonus) }})
              </span>
            </div>
          </div>
        </div>

        <!-- Bono Grupal del Hotel -->
        <div v-if="hasGroupBonus" class="bonus-footer-item">
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
      </div>
    </div>
  </el-card>
</template>

<style scoped>
.agendador-goal-card {
  border-radius: 12px;
  border: 1px solid var(--toolbar-border, #e2e8f0);
  background-color: var(--toolbar-bg, #ffffff);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  margin-bottom: 1rem;
}

.agendador-goal-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.agendador-goal-card :deep(.el-card__body) {
  padding: 1.25rem 1.5rem;
}

/* Header */
.card-hotel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 0.75rem;
}

.hotel-title-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.hotel-icon {
  color: #3b82f6;
  flex-shrink: 0;
}

.hotel-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
}

.hotel-subtitle {
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
  padding: 0.2rem 0.55rem;
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
  transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.4s ease;
}

/* Pacing metrics */
.pacing-metrics-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1.25rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--toolbar-border, #e2e8f0);
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

.text-success {
  color: #10b981 !important;
}

.text-danger {
  color: #ef4444 !important;
}

@media (max-width: 640px) {
  .pacing-metrics-row {
    gap: 0.75rem;
  }
}

/* Bonus Card Footer */
.bonus-card-footer {
  margin-top: 0.85rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--el-border-color-lighter, #f1f5f9);
}

.bonus-footer-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.bonus-footer-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.25rem 0;
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
