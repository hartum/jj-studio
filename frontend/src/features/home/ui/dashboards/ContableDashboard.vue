<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useDashboard } from '@/features/home/composables/useDashboard'
import type { HotelItem } from '@/features/countries/domain/country.model'
import { Location } from '@element-plus/icons-vue'
import { Building2 } from '@lucide/vue'
import ContableEstadisticasTab from './components/ContableEstadisticasTab.vue'
import ContableComisionesTab from './components/ContableComisionesTab.vue'
import ContableVentasTab from './components/ContableVentasTab.vue'

const LOCAL_STORAGE_KEY_TAB = 'jj_studio_contable_active_tab'
const LOCAL_STORAGE_KEY_DATES = 'jj_studio_contable_date_range'
const LOCAL_STORAGE_KEY_HOTELS = 'jj_studio_contable_selected_hotels'

const {
  countryStore,
  currentHotelProgreso,
  filteredProgresoHoteles,
  globalProgresoTotals,
  selectedHotelsSummary,
  selectedMonthsLabel,
  selectedHotelFilters,
  globalMonthlyCommissions,
  handleUpdateCommissionStatus,
  handleUpdateCommissionsStatusMasivo,
  contableAreas,
  contableHotels,
  commissionDateRange,
  commissionDateShortcuts,
  loadCommissionsData,
  loadGoalsData,
  loadVentasData,
  getProgressColor,
  getSemaforoTagType,
  getSemaforoText,
} = useDashboard()

// 1. Restaurar pestaña activa guardada
const savedTab = localStorage.getItem(LOCAL_STORAGE_KEY_TAB) as 'estadisticas' | 'comisiones' | 'ventas' | null
const activeTab = ref<'estadisticas' | 'comisiones' | 'ventas'>(
  savedTab === 'comisiones' ? 'comisiones' : savedTab === 'ventas' ? 'ventas' : 'estadisticas',
)

// 2. Restaurar rango de fechas guardado para el contable
try {
  const savedDates = localStorage.getItem(LOCAL_STORAGE_KEY_DATES)
  if (savedDates) {
    const parsed = JSON.parse(savedDates)
    if (Array.isArray(parsed) && parsed.length === 2 && parsed[0] && parsed[1]) {
      commissionDateRange.value = [parsed[0], parsed[1]]
    }
  }
} catch (e) {
  console.warn('Error al restaurar commissionDateRange de localStorage', e)
}

// 3. Restaurar hoteles seleccionados para el contable
try {
  const savedHotels = localStorage.getItem(LOCAL_STORAGE_KEY_HOTELS)
  if (savedHotels) {
    const parsed = JSON.parse(savedHotels)
    if (Array.isArray(parsed)) {
      selectedHotelFilters.value = parsed.map(Number).filter((n) => !isNaN(n))
    }
  }
} catch (e) {
  console.warn('Error al restaurar selectedHotelFilters de localStorage', e)
}

watch(activeTab, (tab) => {
  localStorage.setItem(LOCAL_STORAGE_KEY_TAB, tab)
  if (tab === 'comisiones') {
    loadCommissionsData()
  } else if (tab === 'estadisticas') {
    loadGoalsData()
  } else if (tab === 'ventas') {
    loadVentasData()
  }
})

watch(
  commissionDateRange,
  (val) => {
    if (val && val.length === 2 && val[0] && val[1]) {
      localStorage.setItem(LOCAL_STORAGE_KEY_DATES, JSON.stringify(val))
    }
  },
  { deep: true },
)

watch(
  selectedHotelFilters,
  (val) => {
    localStorage.setItem(LOCAL_STORAGE_KEY_HOTELS, JSON.stringify(val))
  },
  { deep: true },
)

interface AreaGroup {
  id: number
  nombre: string
  hoteles: HotelItem[]
}

interface CountryGroup {
  id: number
  nombre: string
  codigo: string
  areas: AreaGroup[]
}

const groupedContableHotelsByCountry = computed<CountryGroup[]>(() => {
  const groups: CountryGroup[] = []
  const areaIds = contableAreas.value.map((a) => a.id)
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
          hoteles: (a.hoteles || []) as HotelItem[],
        })),
      })
    }
  }
  return groups
})
</script>

<template>
  <div class="dashboard-section">
    <!-- Barra Superior con Pestañas y Filtros -->
    <div class="tabs-header-container">
      <el-tabs v-model="activeTab" type="card" class="contable-tabs">
        <el-tab-pane :label="$t('dashboard.statsTab')" name="estadisticas" />
        <el-tab-pane :label="$t('dashboard.commissionsTab')" name="comisiones" />
        <el-tab-pane :label="$t('dashboard.salesTab') || 'Ventas'" name="ventas" />
      </el-tabs>

      <div class="header-controls">
        <div class="controls-bar">
          <el-select
            v-model="selectedHotelFilters"
            :placeholder="$t('dashboard.allYourHotels')"
            multiple
            collapse-tags
            collapse-tags-tooltip
            :max-collapse-tags="2"
            filterable
            clearable
            size="default"
            class="hotel-filter-select"
            popper-class="custom-group-select-dropdown"
          >
            <el-option-group
              v-for="pais in groupedContableHotelsByCountry"
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

          <!-- Selector unificado de Rango de Fechas para Estadísticas y Liquidación -->
          <el-date-picker
            v-model="commissionDateRange"
            type="daterange"
            :range-separator="$t('auditLog.filters.dateRangeSeparator') || 'a'"
            :start-placeholder="$t('auditLog.filters.startDate') || 'Desde'"
            :end-placeholder="$t('auditLog.filters.endDate') || 'Hasta'"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            size="default"
            :shortcuts="commissionDateShortcuts"
            popper-class="commission-date-range-popper"
            class="commission-date-picker"
            :clearable="false"
          />
        </div>
      </div>
    </div>

    <!-- PESTAÑA 1: ESTADÍSTICAS -->
    <ContableEstadisticasTab
      v-if="activeTab === 'estadisticas'"
      :selected-hotel-filters="selectedHotelFilters"
      :selected-hotels-summary="selectedHotelsSummary"
      :selected-months-label="selectedMonthsLabel"
      :current-hotel-progreso="currentHotelProgreso"
      :filtered-progreso-hoteles="filteredProgresoHoteles"
      :global-progreso-totals="globalProgresoTotals"
      :contable-hotels="contableHotels"
      :get-progress-color="getProgressColor"
      :get-semaforo-tag-type="getSemaforoTagType"
      :get-semaforo-text="getSemaforoText"
    />

    <!-- PESTAÑA 2: LIQUIDACIÓN Y CONTROL DE COMISIONES -->
    <ContableComisionesTab
      v-else-if="activeTab === 'comisiones'"
      :selected-hotel-filters="selectedHotelFilters"
      :contable-hotels="contableHotels"
      :contable-areas="contableAreas"
      :commission-date-range="commissionDateRange"
      :global-monthly-commissions="globalMonthlyCommissions"
      :on-update-commission-status="handleUpdateCommissionStatus"
      :on-update-commissions-status-masivo="handleUpdateCommissionsStatusMasivo"
    />

    <!-- PESTAÑA 3: VENTAS -->
    <ContableVentasTab
      v-else-if="activeTab === 'ventas'"
      :selected-hotel-filters="selectedHotelFilters"
      :contable-hotels="contableHotels"
      :commission-date-range="commissionDateRange"
    />
  </div>
</template>

<style scoped>
.tabs-header-container {
  position: relative;
  margin-bottom: 1.25rem;
}

.tabs-header-container :deep(.el-tabs__header) {
  margin-bottom: 0;
}

.header-controls {
  position: absolute;
  right: 0;
  top: 0;
  display: flex;
  align-items: center;
  height: 40px;
  z-index: 2;
}

.controls-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: nowrap;
}

.hotel-filter-select {
  min-width: 200px;
  max-width: 330px;
}

:deep(.commission-date-picker.el-date-editor--daterange) {
  width: 225px !important;
  min-width: 225px !important;
  flex-shrink: 0 !important;
  padding: 0 8px !important;
}

:deep(.commission-date-picker .el-range-input) {
  width: 44% !important;
}

:deep(.commission-date-picker .el-range-separator) {
  padding: 0 2px !important;
  flex-shrink: 0 !important;
}

:deep(.commission-date-picker .el-range__icon) {
  margin-right: 4px !important;
}

@media (max-width: 992px) {
  .header-controls {
    position: static;
    margin-top: 0.75rem;
    justify-content: flex-end;
  }
}

/* Custom Date Range Popper con Sidebar Ampliado para Atajos y Bloques */
:global(.commission-date-range-popper .el-date-range-picker.has-sidebar) {
  width: 846px !important;
}

:global(.commission-date-range-popper .el-picker-panel__sidebar) {
  width: 200px !important;
  padding: 8px 6px !important;
  box-sizing: border-box !important;
}

:global(.commission-date-range-popper .el-picker-panel__sidebar + .el-picker-panel__body) {
  margin-left: 200px !important;
}

:global(.commission-date-range-popper .el-picker-panel__shortcut) {
  font-size: 12.5px !important;
  line-height: 32px !important;
  height: 32px !important;
  padding: 0 12px !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  border-radius: 6px !important;
  margin-bottom: 2px !important;
  transition: all 0.15s ease !important;
}

:global(.commission-date-range-popper .el-picker-panel__shortcut:hover) {
  background-color: var(--el-color-primary-light-9, #ecf5ff) !important;
  color: var(--el-color-primary, #409eff) !important;
}

/* Separador punteado entre grupos de atajos (Grupo 1: Meses | Grupo 2: Quincenas) */
:global(.commission-date-range-popper .el-picker-panel__shortcut:nth-child(2)) {
  margin-bottom: 12px !important;
  position: relative !important;
  overflow: visible !important;
}

:global(.commission-date-range-popper .el-picker-panel__shortcut:nth-child(2)::after) {
  content: '' !important;
  position: absolute !important;
  bottom: -6px !important;
  left: 6px !important;
  right: 6px !important;
  height: 0 !important;
  border-top: 1px dotted var(--el-border-color, #cbd5e1) !important;
  pointer-events: none !important;
}

:global(html.dark .commission-date-range-popper .el-picker-panel__shortcut:nth-child(2)::after) {
  border-top-color: var(--el-border-color, #4c4d4f) !important;
}
</style>
