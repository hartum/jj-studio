<script setup lang="ts">
import { useDashboard } from '@/features/home/composables/useDashboard'
import SupervisorHotelGoalCard from '@/features/goals/ui/SupervisorHotelGoalCard.vue'
import GoalEvolutionChart from '@/features/goals/ui/GoalEvolutionChart.vue'
import { Money } from '@element-plus/icons-vue'

const {
  goalStore,
  commissionStore,
  selectedAnio,
  selectedMes,
  selectedMonthDate,
  selectedMonthLabel,
  selectedHotelFilter,
  formatCurrency,
  supervisorHotels,
  supervisorMonthlyCommissions,
  myCommissionFormula,
  myCommissionTooltip,
} = useDashboard()
</script>

<template>
  <div class="dashboard-section">
    <div class="section-header-row">
      <h2 class="section-title">{{ $t('dashboard.supervisorControlTitle') }}</h2>
      <div class="controls-bar">
        <el-select
          v-model="selectedHotelFilter"
          :placeholder="$t('dashboard.selectHotel')"
          clearable
          size="default"
          style="width: 220px"
        >
          <el-option v-for="h in supervisorHotels" :key="h.id" :label="h.nombre" :value="h.id" />
        </el-select>
        <el-date-picker
          v-model="selectedMonthDate"
          type="month"
          :placeholder="$t('dashboard.selectMonth')"
          format="YYYY-MM"
          value-format="YYYY-MM"
          size="default"
          style="width: 140px"
          :clearable="false"
        />
      </div>
    </div>

    <!-- Tarjeta de Comisiones del Supervisor -->
    <el-card class="dashboard-card mb-4" shadow="hover">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span class="font-bold">
            <el-icon style="vertical-align: middle; margin-right: 6px; color: #c026d3"
              ><Money
            /></el-icon>
            {{ $t('dashboard.yourCommissions') }} —
            {{ selectedMonthLabel }} {{ selectedAnio }}
          </span>
          <el-tooltip
            :content="myCommissionTooltip"
            placement="top"
          >
            <el-tag type="info" effect="light" style="font-weight: 600; cursor: help">
              {{ myCommissionFormula }}
            </el-tag>
          </el-tooltip>
        </div>
      </template>
      <div
        style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        "
      >
        <div>
          <div style="font-size: 0.85rem; color: var(--el-text-color-secondary)">
            {{ $t('dashboard.accumulatedCommission') }}
          </div>
          <div style="font-size: 1.8rem; font-weight: 800; color: #c026d3">
            {{ formatCurrency(supervisorMonthlyCommissions) }}
          </div>
        </div>
        <div>
          <div
            style="font-size: 0.825rem; color: var(--el-text-color-secondary); margin-bottom: 4px"
          >
            {{ $t('dashboard.totalCommissionsGenerated') }}
          </div>
          <div style="font-size: 1.3rem; font-weight: 700; color: #0f172a">
            {{ formatCurrency(commissionStore.resumen?.totalComisionesUsd || 0) }}
          </div>
        </div>
      </div>
    </el-card>

    <!-- Metas Agrupadas por Hotel con Rendimiento de Fotógrafos -->
    <div class="goals-summary-block">
      <div v-if="goalStore.progresoHoteles.length === 0" class="mb-4">
        <el-card class="dashboard-card" shadow="hover">
          <el-empty
            :description="$t('dashboard.noGoalsAvailablePeriod')"
          />
        </el-card>
      </div>
      <SupervisorHotelGoalCard
        v-for="hotelProg in goalStore.progresoHoteles"
        :key="hotelProg.hotelId"
        :hotel-progreso="hotelProg"
        :month-label="selectedMonthLabel"
        :selected-anio="selectedAnio"
      />
    </div>

    <!-- Gráficas de Línea -->
    <GoalEvolutionChart
      :data="goalStore.evolucion"
      :loading="goalStore.isLoading"
      :hotel-name="goalStore.progresoHoteles[0]?.hotelNombre"
    />
  </div>
</template>
