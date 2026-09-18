<script setup lang="ts">
import { computed } from 'vue'
import { useDashboard } from '@/features/home/composables/useDashboard'
import GoalProgressCard from '@/features/goals/ui/GoalProgressCard.vue'
import GoalEvolutionChart from '@/features/goals/ui/GoalEvolutionChart.vue'
import { User, Location, Setting, Money } from '@element-plus/icons-vue'
import { Building2 } from '@lucide/vue'
import type { HotelProgresoResumen } from '@/features/goals/domain/goal.model'
import type { Hotel } from '@/features/hotels/domain/hotel.model'

const {
  countryStore,
  hotelStore,
  goalStore,
  commissionStore,
  selectedAnio,
  selectedMes,
  selectedMonthDate,
  selectedMonthLabel,
  selectedHotelFilters,
  totalUsers,
  activeUsers,
  totalCountries,
  totalAreas,
  totalHotels,
  currentHotelProgreso,
  filteredProgresoHoteles,
  globalProgresoTotals,
  selectedHotelsSummary,
  getSemaforoTagType,
  getSemaforoText,
  getProgressColor,
  goToConfig,
  goToUsers,
  formatCurrency,
  handleNavigateToGoalForm,
  globalMonthlyCommissions,
} = useDashboard()

interface AreaGroup {
  id: number
  nombre: string
  hoteles: Hotel[]
}

interface CountryGroup {
  id: number
  nombre: string
  codigo: string
  areas: AreaGroup[]
}

const groupedHotelsByCountry = computed<CountryGroup[]>(() => {
  const hotels = hotelStore.hotels
  const groupsMap = new Map<number, CountryGroup>()

  for (const h of hotels) {
    const countryId = h.paisId || 0
    const countryName = h.paisNombre || 'Sin País'
    const countryObj = countryStore.countries.find(
      (c) => c.id === countryId || c.nombre === countryName,
    )
    const countryCode = countryObj?.codigo || h.paisCodigo || ''

    if (!groupsMap.has(countryId)) {
      groupsMap.set(countryId, {
        id: countryId,
        nombre: countryName,
        codigo: countryCode,
        areas: [],
      })
    }

    const countryGroup = groupsMap.get(countryId)!
    const areaId = h.areaId || 0
    const areaName = h.areaNombre || 'Sin Área'

    let areaGroup = countryGroup.areas.find((a) => a.id === areaId)
    if (!areaGroup) {
      areaGroup = {
        id: areaId,
        nombre: areaName,
        hoteles: [],
      }
      countryGroup.areas.push(areaGroup)
    }

    areaGroup.hoteles.push(h)
  }

  return Array.from(groupsMap.values())
})

function semaforoSortMethod(a: HotelProgresoResumen, b: HotelProgresoResumen): number {
  const getScore = (row: HotelProgresoResumen) => {
    if (row.metaImporte <= 0 || row.semaforo === 'SIN_META') return 0
    if (row.semaforo === 'ROJO') return 1
    if (row.semaforo === 'AMARILLO') return 2
    if (row.semaforo === 'VERDE') return 3
    return 0
  }
  return getScore(a) - getScore(b)
}
</script>

<template>
  <div class="dashboard-section">
    <!-- Filtro y Controles de Metas -->
    <div class="section-header-row">
      <h2 class="section-title">{{ $t('dashboard.executivePanel') }}</h2>
      <div class="controls-bar">
        <el-select
          v-model="selectedHotelFilters"
          :placeholder="$t('dashboard.allHotels')"
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
            v-for="pais in groupedHotelsByCountry"
            :key="pais.id"
            :label="pais.codigo ? `${pais.nombre} (${pais.codigo})` : pais.nombre"
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

    <!-- Fila 50% - 50%: Objetivo Global / Consolidado + Resumen Financiero de Comisiones -->
    <el-row :gutter="20" class="top-cards-row">
      <el-col :xs="24" :lg="12" class="top-card-col">
        <div class="goals-summary-block">
          <GoalProgressCard
            v-if="!currentHotelProgreso"
            :titulo="selectedHotelFilters.length > 1 ? $t('dashboard.consolidatedGoal') : $t('dashboard.globalGoal')"
            :subtitulo="$t('dashboard.consolidatedSubtitle', {
              month: selectedMonthLabel,
              year: selectedAnio,
              count: globalProgresoTotals.numHoteles,
              hotelsLabel: globalProgresoTotals.numHoteles === 1 ? $t('dashboard.hotelSingle') : $t('dashboard.hotelPlural'),
              summary: selectedHotelFilters.length > 1 ? ` (${selectedHotelsSummary})` : ''
            })"
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
                {{ $t('dashboard.configureGoals') }}
              </el-button>
            </template>
          </GoalProgressCard>

          <GoalProgressCard
            v-else
            :titulo="$t('dashboard.monthlyGoalHotel', { hotel: currentHotelProgreso.hotelNombre })"
            :subtitulo="$t('dashboard.hotelSubtitleArea', {
              area: currentHotelProgreso.areaNombre,
              country: currentHotelProgreso.paisNombre,
              month: selectedMonthLabel,
              year: selectedAnio
            })"
            :meta-importe="currentHotelProgreso.metaImporte"
            :ventas-reales-usd="currentHotelProgreso.ventasRealesUsd"
            :porcentaje-cumplimiento="currentHotelProgreso.porcentajeCumplimiento"
            :meta-esperada-hoy="currentHotelProgreso.metaEsperadaHoy"
            :desviacion-monetaria="currentHotelProgreso.desviacionMonetaria"
            :semaforo="currentHotelProgreso.semaforo"
            :num-ventas="currentHotelProgreso.numVentas"
            :num-sesiones="currentHotelProgreso.numSesiones"
          >
            <template #actions>
              <el-button
                type="primary"
                :icon="Setting"
                size="default"
                @click="handleNavigateToGoalForm(currentHotelProgreso.hotelId)"
              >
                {{ $t('dashboard.configureGoals') }}
              </el-button>
            </template>
          </GoalProgressCard>
        </div>
      </el-col>

      <el-col :xs="24" :lg="12" class="top-card-col">
        <!-- Resumen Ejecutivo Financiero de Comisiones para Admin -->
        <el-card class="dashboard-card comm-summary-card" shadow="hover">
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center">
              <span class="font-bold">
                <el-icon style="vertical-align: middle; margin-right: 6px; color: #10b981"
                  ><Money
                /></el-icon>
                {{ $t('dashboard.commissionsSummary') }} —
                {{ selectedMonthLabel }} {{ selectedAnio }}
              </span>
            </div>
          </template>
          <el-row :gutter="12" class="comm-stats-row">
            <el-col :xs="24" :sm="8">
              <div class="stat-box-comm">
                <span class="stat-box-label">{{ $t('dashboard.totalCommissions') }}</span>
                <span class="stat-box-val text-success">{{
                  formatCurrency(globalMonthlyCommissions)
                }}</span>
              </div>
            </el-col>
            <el-col :xs="24" :sm="8">
              <div class="stat-box-comm">
                <span class="stat-box-label">{{ $t('dashboard.salesWithCommission') }}</span>
                <span class="stat-box-val">{{
                  formatCurrency(commissionStore.resumen?.totalVentasUsd || 0)
                }}</span>
              </div>
            </el-col>
            <el-col :xs="24" :sm="8">
              <div class="stat-box-comm">
                <span class="stat-box-label">{{ $t('dashboard.pendingCommissions') }}</span>
                <span class="stat-box-val text-warning">
                  {{ $t('dashboard.pendingCount', { count: commissionStore.comisiones.filter((c) => c.estado === 'PENDIENTE').length }) }}
                </span>
              </div>
            </el-col>
          </el-row>
          <div class="comm-card-footer">
            <el-button type="primary" :icon="Setting" size="default" @click="goToConfig('comisiones')">
              {{ $t('dashboard.configureCommissions') }}
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Gráficas de Línea (Line Charts): Mes a Día y Año a Mes -->
    <GoalEvolutionChart
      :data="goalStore.evolucion"
      :loading="goalStore.isLoading"
      :hotel-name="selectedHotelFilters.length > 0 ? selectedHotelsSummary : undefined"
    />

    <!-- Tabla Comparativa de Hoteles con Semáforos -->
    <el-card
      class="dashboard-card mb-4"
      :header="$t('dashboard.hotelBreakdownTitle')"
      shadow="hover"
    >
      <el-table
        :data="filteredProgresoHoteles"
        :default-sort="{ prop: 'porcentajeCumplimiento', order: 'descending' }"
        style="width: 100%"
        size="small"
        stripe
      >
        <el-table-column prop="hotelNombre" :label="$t('dashboard.table.hotel')" min-width="160" sortable />
        <el-table-column prop="areaNombre" :label="$t('dashboard.table.area')" min-width="120" sortable />
        <el-table-column prop="metaImporte" :label="$t('dashboard.table.monthlyGoal')" width="140" align="right" sortable>
          <template #default="{ row }">
            <span class="font-semibold">{{ formatCurrency(row.metaImporte) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="ventasRealesUsd"
          :label="$t('dashboard.table.realSales')"
          width="140"
          align="right"
          sortable
        >
          <template #default="{ row }">
            <span class="font-bold text-primary">{{ formatCurrency(row.ventasRealesUsd) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="metaEsperadaHoy"
          :label="$t('dashboard.table.pacingToday')"
          width="130"
          align="right"
          sortable
        >
          <template #default="{ row }">
            <span>{{ formatCurrency(row.metaEsperadaHoy) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="porcentajeCumplimiento" :label="$t('dashboard.table.progress')" min-width="170" sortable>
          <template #default="{ row }">
            <el-progress
              :percentage="Math.min(100, Math.max(0, row.porcentajeCumplimiento))"
              :color="getProgressColor(row.semaforo, row.metaImporte)"
              :stroke-width="8"
            />
          </template>
        </el-table-column>
        <el-table-column
          prop="semaforo"
          :label="$t('dashboard.table.trafficLight')"
          width="140"
          align="center"
          sortable
          :sort-method="semaforoSortMethod"
        >
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
    </el-card>

    <!-- Tarjetas de Estadísticas Rápidas de la Plataforma -->
    <h3 class="subsection-title">{{ $t('dashboard.structureAndStaff') }}</h3>
    <el-row :gutter="20" class="stats-row">
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="dashboard-card stat-card" shadow="hover">
          <div class="card-icon bg-primary">
            <el-icon><User /></el-icon>
          </div>
          <div class="stat-content">
            <span class="stat-label">{{ $t('dashboard.activeUsers') }}</span>
            <span class="stat-value"
              >{{ activeUsers }} <small>/ {{ totalUsers }}</small></span
            >
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="dashboard-card stat-card" shadow="hover">
          <div class="card-icon bg-warning">
            <el-icon><Location /></el-icon>
          </div>
          <div class="stat-content">
            <span class="stat-label">{{ $t('dashboard.countriesAndAreas') }}</span>
            <span class="stat-value"
              >{{ totalCountries }} <small>{{ $t('dashboard.countriesCountSummary', { countries: '', areas: '' }).trim() || `p / ${totalAreas} á` }}</small></span
            >
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="dashboard-card stat-card" shadow="hover">
          <div class="card-icon bg-success">
            <el-icon><Building2 :size="24" /></el-icon>
          </div>
          <div class="stat-content">
            <span class="stat-label">{{ $t('dashboard.hotels') }}</span>
            <span class="stat-value">{{ totalHotels }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="dashboard-card stat-card" shadow="hover">
          <div class="card-icon bg-info">
            <el-icon><Setting /></el-icon>
          </div>
          <div class="stat-content">
            <span class="stat-label">{{ $t('dashboard.quickLinks') }}</span>
            <div class="quick-actions">
              <el-button size="small" type="primary" link @click="goToConfig()"
                >{{ $t('nav.settings') }}</el-button
              >
              <el-button size="small" type="primary" link @click="goToUsers">{{ $t('nav.users') }}</el-button>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.top-cards-row {
  margin-bottom: 1rem;
}

.top-card-col {
  margin-bottom: 1rem;
}

.comm-stats-row {
  margin-top: 0.5rem;
}

.stat-box-comm {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
  border-radius: 8px;
  background-color: var(--el-fill-color-blank, #f8fafc);
  border: 1px solid var(--el-border-color-lighter, #f1f5f9);
}

.stat-box-label {
  font-size: 0.75rem;
  color: var(--nav-link-color, #64748b);
  font-weight: 500;
}

.stat-box-val {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
}

.comm-card-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-top: 1.25rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--el-border-color-lighter, #f1f5f9);
}
</style>
