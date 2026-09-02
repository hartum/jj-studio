<script setup lang="ts">
import { computed } from 'vue'
import { useDashboard, monthsOptions } from '@/features/home/composables/useDashboard'
import GoalProgressCard from '@/features/goals/ui/GoalProgressCard.vue'
import GoalEvolutionChart from '@/features/goals/ui/GoalEvolutionChart.vue'
import {
  User,
  Location,
  Setting,
  Money,
} from '@element-plus/icons-vue'
import { Building2 } from '@lucide/vue'

const {
  countryStore,
  hotelStore,
  goalStore,
  commissionStore,
  selectedAnio,
  selectedMes,
  selectedHotelFilters,
  yearsOptions,
  currentHotelProgreso,
  filteredProgresoHoteles,
  globalProgresoTotals,
  selectedHotelsSummary,
  getSemaforoTagType,
  getSemaforoText,
  getProgressColor,
  formatCurrency,
  handleNavigateToGoalForm,
  managerAreas,
  managerHotels,
  managerTeam,
  gerenteMonthlyCommissions,
  myCommissionFormula,
  myCommissionTooltip,
} = useDashboard()

interface AreaGroup {
  id: number
  nombre: string
  hoteles: any[]
}

interface CountryGroup {
  id: number
  nombre: string
  codigo: string
  areas: AreaGroup[]
}

const groupedManagerHotelsByCountry = computed<CountryGroup[]>(() => {
  const groups: CountryGroup[] = []
  const areaIds = managerAreas.value.map((a) => a.id)
  const areaSet = new Set(areaIds)

  for (const pais of countryStore.countries) {
    const matchingAreas = (pais.areas || []).filter((a) => areaSet.has(a.id))
    if (matchingAreas.length > 0) {
      groups.push({
        id: pais.id,
        nombre: pais.nombre,
        codigo: pais.codigo,
        areas: matchingAreas.map((a) => ({
          id: a.id,
          nombre: a.nombre,
          hoteles: a.hoteles || [],
        })),
      })
    }
  }
  return groups
})
</script>

<template>
  <div class="dashboard-section">
    <div class="section-header-row">
      <h2 class="section-title">Control de Áreas, Metas y Comisiones</h2>
      <div class="controls-bar">
        <el-select
          v-model="selectedHotelFilters"
          placeholder="Todos tus Hoteles"
          multiple
          collapse-tags
          collapse-tags-tooltip
          :max-collapse-tags="1"
          filterable
          clearable
          size="default"
          style="width: 220px"
          popper-class="custom-group-select-dropdown"
        >
          <el-option-group
            v-for="pais in groupedManagerHotelsByCountry"
            :key="pais.id"
            :label="pais.nombre"
          >
            <template v-for="area in pais.areas" :key="area.id">
              <!-- Item no seleccionable por cada Área -->
              <el-option
                :value="`area-${area.id}`"
                :label="area.nombre"
                disabled
                class="area-header-option"
              >
                <div class="area-option-header">
                  <el-icon :size="18" class="area-icon"><Location /></el-icon>
                  <span class="area-title">{{ area.nombre }}</span>
                </div>
              </el-option>

              <!-- Hoteles pertenecientes a este área -->
              <el-option
                v-for="h in area.hoteles"
                :key="h.id"
                :label="`${h.nombre} (${area.nombre})`"
                :value="h.id"
                class="hotel-sub-option"
              >
                <div class="option-item-content hotel-option-item">
                  <el-icon :size="18" class="hotel-option-icon"><Building2 /></el-icon>
                  <span class="hotel-name">{{ h.nombre }}</span>
                </div>
              </el-option>
            </template>
          </el-option-group>
        </el-select>
        <el-select v-model="selectedMes" size="default" style="width: 130px">
          <el-option
            v-for="m in monthsOptions"
            :key="m.value"
            :label="m.label"
            :value="m.value"
          />
        </el-select>
        <el-select v-model="selectedAnio" size="default" style="width: 95px">
          <el-option v-for="y in yearsOptions" :key="y" :label="String(y)" :value="y" />
        </el-select>
      </div>
    </div>

    <!-- Tarjeta de Comisiones del Gerente -->
    <el-card class="dashboard-card mb-4" shadow="hover">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span class="font-bold">
            <el-icon style="vertical-align: middle; margin-right: 6px; color: #2563eb"
              ><Money
            /></el-icon>
            Tus Comisiones —
            {{ monthsOptions.find((m) => m.value === selectedMes)?.label }} {{ selectedAnio }}
          </span>
          <el-tooltip
            :content="myCommissionTooltip"
            placement="top"
          >
            <el-tag type="primary" effect="light" style="font-weight: 600; cursor: help">
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
          gap: 1.5rem;
        "
      >
        <div>
          <div style="font-size: 0.85rem; color: var(--el-text-color-secondary)">
            Tu comisión acumulada:
          </div>
          <div style="font-size: 1.8rem; font-weight: 800; color: #2563eb">
            {{ formatCurrency(gerenteMonthlyCommissions) }}
          </div>
        </div>
        <div style="display: flex; gap: 2rem; flex-wrap: wrap">
          <div>
            <div
              style="
                font-size: 0.825rem;
                color: var(--el-text-color-secondary);
                margin-bottom: 4px;
              "
            >
              Ventas en tus áreas:
            </div>
            <div style="font-size: 1.3rem; font-weight: 700; color: #0f172a">
              {{ formatCurrency(commissionStore.resumen?.totalVentasUsd || 0) }}
            </div>
          </div>
          <div>
            <div
              style="
                font-size: 0.825rem;
                color: var(--el-text-color-secondary);
                margin-bottom: 4px;
              "
            >
              Total comisiones en tus hoteles:
            </div>
            <div style="font-size: 1.3rem; font-weight: 700; color: #0f172a">
              {{ formatCurrency(commissionStore.resumen?.totalComisionesUsd || 0) }}
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- Barra de Progreso Semafórica Consolidada de las Áreas -->
    <div class="goals-summary-block">
      <GoalProgressCard
        v-if="!currentHotelProgreso"
        :titulo="selectedHotelFilters.length > 1 ? 'Objetivo Consolidado de tus Áreas' : 'Objetivo Comercial de tus Áreas'"
        :subtitulo="`Mes de ${monthsOptions.find((m) => m.value === selectedMes)?.label} ${selectedAnio} — Consolidado de ${globalProgresoTotals.numHoteles} ${globalProgresoTotals.numHoteles === 1 ? 'hotel' : 'hoteles'}${selectedHotelFilters.length > 1 ? ` (${selectedHotelsSummary})` : ''}`"
        :meta-importe="globalProgresoTotals.metaTotal"
        :ventas-reales-usd="globalProgresoTotals.ventasTotal"
        :porcentaje-cumplimiento="globalProgresoTotals.porcentaje"
        :meta-esperada-hoy="globalProgresoTotals.metaEsperadaTotal"
        :desviacion-monetaria="globalProgresoTotals.desviacion"
        :semaforo="globalProgresoTotals.semaforo"
      >
        <template #actions>
          <el-button
            type="primary"
            :icon="Setting"
            size="default"
            @click="handleNavigateToGoalForm(selectedHotelFilters[0] || null)"
          >
            Configurar Metas
          </el-button>
        </template>
      </GoalProgressCard>
      <GoalProgressCard
        v-else
        :titulo="`Meta Mensual: ${currentHotelProgreso.hotelNombre}`"
        :subtitulo="`${currentHotelProgreso.areaNombre} — ${monthsOptions.find((m) => m.value === selectedMes)?.label} ${selectedAnio}`"
        :meta-importe="currentHotelProgreso.metaImporte"
        :ventas-reales-usd="currentHotelProgreso.ventasRealesUsd"
        :porcentaje-cumplimiento="currentHotelProgreso.porcentajeCumplimiento"
        :meta-esperada-hoy="currentHotelProgreso.metaEsperadaHoy"
        :desviacion-monetaria="currentHotelProgreso.desviacionMonetaria"
        :semaforo="currentHotelProgreso.semaforo"
      >
        <template #actions>
          <el-button
            type="primary"
            :icon="Setting"
            size="default"
            @click="handleNavigateToGoalForm(currentHotelProgreso.hotelId)"
          >
            Configurar Metas
          </el-button>
        </template>
      </GoalProgressCard>
    </div>

    <!-- Gráficas de Línea -->
    <GoalEvolutionChart
      :data="goalStore.evolucion"
      :loading="goalStore.isLoading"
      :hotel-name="selectedHotelFilters.length > 0 ? selectedHotelsSummary : undefined"
    />

    <!-- Tabla de Hoteles en tus Áreas con Semáforos -->
    <el-card
      class="dashboard-card mb-4"
      header="Rendimiento de Hoteles en tus Áreas"
      shadow="hover"
    >
      <el-table :data="filteredProgresoHoteles" style="width: 100%" size="small" stripe>
        <el-table-column prop="hotelNombre" label="Hotel" min-width="160" />
        <el-table-column prop="areaNombre" label="Área" min-width="120" />
        <el-table-column label="Meta Mensual" width="130" align="right">
          <template #default="{ row }">
            <span class="font-semibold">{{ formatCurrency(row.metaImporte) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Ventas Reales" width="130" align="right">
          <template #default="{ row }">
            <span class="font-bold text-primary">{{ formatCurrency(row.ventasRealesUsd) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Avance" min-width="170">
          <template #default="{ row }">
            <el-progress
              :percentage="Math.min(100, Math.max(0, row.porcentajeCumplimiento))"
              :color="getProgressColor(row.semaforo, row.metaImporte)"
              :stroke-width="8"
            />
          </template>
        </el-table-column>
        <el-table-column label="Semáforo" width="130" align="center">
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
        <el-table-column label="Acción" width="140" align="center">
          <template #default="{ row }">
            <el-button
              size="small"
              type="primary"
              link
              :icon="Setting"
              @click="handleNavigateToGoalForm(row.hotelId)"
            >
              Configurar Meta
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Resumen Operativo de Áreas y Personal -->
    <el-row :gutter="20" class="stats-row">
      <el-col :xs="24" :sm="8">
        <el-card class="dashboard-card stat-card" shadow="hover">
          <div class="card-icon bg-primary">
            <el-icon><Location /></el-icon>
          </div>
          <div class="stat-content">
            <span class="stat-label">Tus Áreas</span>
            <span class="stat-value">{{ managerAreas.length }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="8">
        <el-card class="dashboard-card stat-card" shadow="hover">
          <div class="card-icon bg-success">
            <el-icon><Building2 :size="24" /></el-icon>
          </div>
          <div class="stat-content">
            <span class="stat-label">Hoteles Asociados</span>
            <span class="stat-value">{{ managerHotels.length }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="8">
        <el-card class="dashboard-card stat-card" shadow="hover">
          <div class="card-icon bg-warning">
            <el-icon><User /></el-icon>
          </div>
          <div class="stat-content">
            <span class="stat-label">Personal a tu Cargo</span>
            <span class="stat-value">{{ managerTeam.length }}</span>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>
