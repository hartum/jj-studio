<script setup lang="ts">
import { useDashboard, monthsOptions } from '@/features/home/composables/useDashboard'
import SupervisorHotelGoalCard from '@/features/goals/ui/SupervisorHotelGoalCard.vue'
import GoalEvolutionChart from '@/features/goals/ui/GoalEvolutionChart.vue'
import { Money } from '@element-plus/icons-vue'

const {
  goalStore,
  commissionStore,
  selectedAnio,
  selectedMes,
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
      <h2 class="section-title">Control de Metas y Comisiones</h2>
      <div class="controls-bar">
        <el-select
          v-model="selectedHotelFilter"
          placeholder="Selecciona un Hotel"
          clearable
          size="default"
          style="width: 220px"
        >
          <el-option v-for="h in supervisorHotels" :key="h.id" :label="h.nombre" :value="h.id" />
        </el-select>
        <el-select v-model="selectedMes" size="default" style="width: 140px">
          <el-option
            v-for="m in monthsOptions"
            :key="m.value"
            :label="m.label"
            :value="m.value"
          />
        </el-select>
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
            Tus Comisiones —
            {{ monthsOptions.find((m) => m.value === selectedMes)?.label }} {{ selectedAnio }}
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
            Tu comisión acumulada:
          </div>
          <div style="font-size: 1.8rem; font-weight: 800; color: #c026d3">
            {{ formatCurrency(supervisorMonthlyCommissions) }}
          </div>
        </div>
        <div>
          <div
            style="font-size: 0.825rem; color: var(--el-text-color-secondary); margin-bottom: 4px"
          >
            Total comisiones generadas en tus hoteles:
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
            description="No hay información de metas disponible para el período seleccionado."
          />
        </el-card>
      </div>
      <SupervisorHotelGoalCard
        v-for="hotelProg in goalStore.progresoHoteles"
        :key="hotelProg.hotelId"
        :hotel-progreso="hotelProg"
        :month-label="monthsOptions.find((m) => m.value === selectedMes)?.label || ''"
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
