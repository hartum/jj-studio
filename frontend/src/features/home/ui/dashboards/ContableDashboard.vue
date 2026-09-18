<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDashboard } from '@/features/home/composables/useDashboard'
import type { HotelItem } from '@/features/countries/domain/country.model'
import type { SemaforoEstado } from '@/features/goals/domain/goal.model'
import type { Comision } from '@/features/commissions/domain/commission.model'
import GoalProgressCard from '@/features/goals/ui/GoalProgressCard.vue'
import GoalEvolutionChart from '@/features/goals/ui/GoalEvolutionChart.vue'
import { getUserInitials, getUserBgColor } from '@/features/users/utils/user-avatar'
import { Money, Wallet, Tickets, Location } from '@element-plus/icons-vue'
import { Building2, RotateCcw } from '@lucide/vue'

const { t } = useI18n()
const activeTab = ref<'estadisticas' | 'comisiones'>('estadisticas')

const {
  countryStore,
  userStore,
  hotelStore,
  goalStore,
  commissionStore,
  selectedMonths,
  selectedMonthsLabel,
  selectedHotelFilters,
  currentHotelProgreso,
  filteredProgresoHoteles,
  globalProgresoTotals,
  selectedHotelsSummary,
  getSemaforoTagType,
  getSemaforoText,
  getProgressColor,
  formatCurrency,
  globalMonthlyCommissions,
  handleUpdateCommissionStatus,
  contableAreas,
  contableHotels,
} = useDashboard()

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

interface EmpleadoRendimiento {
  usuarioId: string
  nombre: string
  apellidos: string
  nombreCompleto: string
  email: string
  rolCodigo: string
  rolNombre: string
  hotelNombre: string
  areaNombre: string
  metaImporte: number
  ventasRealesUsd: number
  numVentas: number
  numSesiones: number
  porcentajeCumplimiento: number
  semaforo: SemaforoEstado
  color?: string | null
  imagen?: string | null
}

const empleadosRendimiento = computed<EmpleadoRendimiento[]>(() => {
  const userMap = new Map<string, EmpleadoRendimiento>()

  // 1. Determine active hotel IDs in scope
  const activeHotelIds = new Set<number>()
  if (selectedHotelFilters.value.length > 0) {
    for (const id of selectedHotelFilters.value) activeHotelIds.add(id)
  } else {
    for (const h of contableHotels.value) activeHotelIds.add(h.id)
  }

  // 2. Iterate through filteredProgresoHoteles to extract photographers
  for (const hotel of filteredProgresoHoteles.value) {
    if (!activeHotelIds.has(hotel.hotelId)) continue
    for (const f of hotel.fotografos || []) {
      const uInfo = userStore.usersWithProfile.find((u) => u.id === f.usuarioId)
      const existing = userMap.get(f.usuarioId)
      if (!existing) {
        userMap.set(f.usuarioId, {
          usuarioId: f.usuarioId,
          nombre: uInfo?.nombre || f.nombreCompleto.split(' ')[0] || '',
          apellidos: uInfo?.apellidos || f.nombreCompleto.split(' ').slice(1).join(' ') || '',
          nombreCompleto:
            f.nombreCompleto || (uInfo ? `${uInfo.nombre} ${uInfo.apellidos}`.trim() : 'Usuario'),
          email: f.email || uInfo?.email || '',
          rolCodigo: 'FOTOGRAFO',
          rolNombre: 'Fotógrafo',
          hotelNombre: hotel.hotelNombre,
          areaNombre: hotel.areaNombre,
          metaImporte: f.metaImporte,
          ventasRealesUsd: f.ventasRealesUsd,
          numVentas: f.numVentas,
          numSesiones: f.numSesiones,
          porcentajeCumplimiento: f.porcentajeCumplimiento,
          semaforo: f.semaforo,
          color: uInfo?.color,
          imagen: uInfo?.imagen,
        })
      } else {
        existing.metaImporte += f.metaImporte
        existing.ventasRealesUsd += f.ventasRealesUsd
        existing.numVentas += f.numVentas
        existing.numSesiones += f.numSesiones
        if (!existing.hotelNombre.includes(hotel.hotelNombre)) {
          existing.hotelNombre += `, ${hotel.hotelNombre}`
        }
        existing.porcentajeCumplimiento =
          existing.metaImporte > 0
            ? Math.round((existing.ventasRealesUsd / existing.metaImporte) * 1000) / 10
            : 0
        if (existing.metaImporte <= 0) {
          existing.semaforo = 'SIN_META'
        } else if (existing.ventasRealesUsd >= existing.metaImporte) {
          existing.semaforo = 'VERDE'
        } else {
          existing.semaforo = f.semaforo
        }
      }
    }
  }

  // 3. Find other selling users (AGENDADOR / VENDEDOR) in active hotels
  const sellingUsers = userStore.usersWithProfile.filter((u) => {
    if (u.status !== 'Activo') return false
    const role = u.perfil?.code?.toUpperCase() || ''
    if (role !== 'AGENDADOR' && role !== 'FOTOGRAFO') return false
    if (userMap.has(u.id)) return false

    const userHotels = u.hotelIds || []
    return userHotels.some((hId) => activeHotelIds.has(hId))
  })

  for (const u of sellingUsers) {
    const roleCode = u.perfil?.code?.toUpperCase() || 'AGENDADOR'
    const roleNombre = roleCode === 'FOTOGRAFO' ? 'Fotógrafo' : 'Vendedor'

    const assignedHotels = hotelStore.hotels.filter(
      (h) => (u.hotelIds || []).includes(h.id) && activeHotelIds.has(h.id),
    )
    const hotelNames = assignedHotels.map((h) => h.nombre).join(', ') || 'Sin hotel asignado'
    const areaNames = Array.from(
      new Set(assignedHotels.map((h) => h.areaNombre).filter(Boolean)),
    ).join(', ')

    const userCommissions = commissionStore.comisiones.filter(
      (c) => c.usuarioId === u.id && activeHotelIds.has(c.hotelId),
    )
    const ventasReales = userCommissions.reduce((sum, c) => sum + (c.baseCalculoUsd || 0), 0)
    const numVentas = userCommissions.length

    userMap.set(u.id, {
      usuarioId: u.id,
      nombre: u.nombre,
      apellidos: u.apellidos,
      nombreCompleto: `${u.nombre} ${u.apellidos}`.trim(),
      email: u.email,
      rolCodigo: roleCode,
      rolNombre: roleNombre,
      hotelNombre: hotelNames,
      areaNombre: areaNames,
      metaImporte: 0,
      ventasRealesUsd: ventasReales,
      numVentas,
      numSesiones: 0,
      porcentajeCumplimiento: 0,
      semaforo: 'SIN_META',
      color: u.color,
      imagen: u.imagen,
    })
  }

  return Array.from(userMap.values())
})

// Filtro de usuario para la tabla de Liquidación y Control de Comisiones
const comisionUsuarioFilter = ref<string | null>(null)

const availableContableUsers = computed(() => {
  const activeHotelIds = new Set<number>()
  if (selectedHotelFilters.value.length > 0) {
    for (const id of selectedHotelFilters.value) activeHotelIds.add(id)
  } else {
    for (const h of contableHotels.value) activeHotelIds.add(h.id)
  }

  const areaIdSet = new Set(contableAreas.value.map((a) => a.id))
  const userMap = new Map<string, { id: string; nombre: string; apellidos: string; rol?: string }>()

  // 1. Usuarios activos asignados a hoteles o áreas del contable
  for (const u of userStore.usersWithProfile) {
    if (u.status !== 'Activo') continue
    const hasHotel = (u.hotelIds || []).some((id) => activeHotelIds.has(id))
    const hasArea = (u.areaIds || []).some((id) => areaIdSet.has(id))
    if (hasHotel || hasArea) {
      userMap.set(u.id, {
        id: u.id,
        nombre: u.nombre,
        apellidos: u.apellidos,
        rol: u.perfil?.name || u.perfil?.code,
      })
    }
  }

  // 2. Beneficiarios con comisiones en el periodo actual
  for (const c of commissionStore.comisiones) {
    if (activeHotelIds.has(c.hotelId) && !userMap.has(c.usuarioId)) {
      userMap.set(c.usuarioId, {
        id: c.usuarioId,
        nombre: c.usuarioNombre || 'Usuario',
        apellidos: c.usuarioApellidos || '',
        rol: c.rolEnVenta,
      })
    }
  }

  return Array.from(userMap.values()).sort((a, b) =>
    `${a.nombre} ${a.apellidos}`.localeCompare(`${b.nombre} ${b.apellidos}`),
  )
})

const filteredComisiones = computed(() => {
  let list = commissionStore.comisiones
  if (comisionUsuarioFilter.value) {
    list = list.filter((c) => c.usuarioId === comisionUsuarioFilter.value)
  }
  return list
})

interface TableColumnSummaryCtx {
  property: string
  label: string
}

interface SummaryMethodProps {
  columns: TableColumnSummaryCtx[]
  data: Comision[]
}

function getComisionesSummaries(param: SummaryMethodProps): string[] {
  const { columns, data } = param
  const sums: string[] = []

  columns.forEach((column, index) => {
    if (index === 0) {
      sums[index] = t('dashboard.table.total') || 'Total'
      return
    }

    if (column.property === 'importeComisionUsd' || column.label === t('dashboard.table.commissionAmount')) {
      const total = data.reduce((sum, item) => sum + (item.importeComisionUsd || 0), 0)
      sums[index] = formatCurrency(total)
      return
    }

    sums[index] = ''
  })

  return sums
}

function semaforoSortWeight(row: { metaImporte?: number; semaforo?: SemaforoEstado }): number {
  if (!row.metaImporte || row.metaImporte <= 0 || row.semaforo === 'SIN_META') return 0
  if (row.semaforo === 'ROJO') return 1
  if (row.semaforo === 'AMARILLO') return 2
  if (row.semaforo === 'VERDE') return 3
  return 0
}
</script>

<template>
  <div class="dashboard-section">
    <!-- Barra Superior con Pestañas y Filtros -->
    <div class="tabs-header-container">
      <el-tabs v-model="activeTab" type="card" class="contable-tabs">
        <el-tab-pane :label="$t('dashboard.statsTab')" name="estadisticas" />
        <el-tab-pane :label="$t('dashboard.commissionsTab')" name="comisiones" />
      </el-tabs>

      <div class="header-controls">
        <div class="controls-bar">
          <el-select
            v-model="selectedHotelFilters"
            :placeholder="$t('dashboard.allYourHotels')"
            multiple
            collapse-tags
            collapse-tags-tooltip
            :max-collapse-tags="3"
            filterable
            clearable
            size="default"
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

          <el-date-picker
            v-model="selectedMonths"
            type="months"
            :placeholder="$t('dashboard.selectMonths')"
            format="YYYY-MM"
            value-format="YYYY-MM"
            size="default"
            style="width: 220px"
            :clearable="false"
          />
        </div>
      </div>
    </div>

    <!-- PESTAÑA 1: ESTADÍSTICAS -->
    <div v-if="activeTab === 'estadisticas'" class="tab-content-fade">
      <!-- 1. Objetivos Comerciales de tus Áreas -->
      <div class="goals-summary-block mb-4">
        <GoalProgressCard
          v-if="!currentHotelProgreso"
          :titulo="
            selectedHotelFilters.length > 1
              ? $t('dashboard.commercialGoalSelected')
              : $t('dashboard.commercialGoal')
          "
          :subtitulo="$t('dashboard.commercialSubtitle', {
            monthsLabel: selectedMonthsLabel,
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
        />
        <GoalProgressCard
          v-else
          :titulo="$t('dashboard.commercialGoalHotel', { hotel: currentHotelProgreso.hotelNombre })"
          :subtitulo="$t('dashboard.hotelSubtitleMonths', { area: currentHotelProgreso.areaNombre, monthsLabel: selectedMonthsLabel })"
          :meta-importe="currentHotelProgreso.metaImporte"
          :ventas-reales-usd="currentHotelProgreso.ventasRealesUsd"
          :porcentaje-cumplimiento="currentHotelProgreso.porcentajeCumplimiento"
          :meta-esperada-hoy="currentHotelProgreso.metaEsperadaHoy"
          :desviacion-monetaria="currentHotelProgreso.desviacionMonetaria"
          :semaforo="currentHotelProgreso.semaforo"
        />
      </div>

      <!-- 2. Evolución y Progresión de Ventas -->
      <GoalEvolutionChart
        :data="goalStore.evolucion"
        :loading="goalStore.isLoading"
        :hotel-name="selectedHotelFilters.length > 0 ? selectedHotelsSummary : undefined"
      />

      <!-- 3. Rendimiento de Hoteles -->
      <el-card class="dashboard-card mb-4" :header="$t('dashboard.hotelEconomicPerformance')" shadow="hover">
        <el-table :data="filteredProgresoHoteles" style="width: 100%" size="small" stripe>
          <el-table-column prop="hotelNombre" :label="$t('dashboard.table.hotel')" min-width="160" sortable />
          <el-table-column prop="areaNombre" :label="$t('dashboard.table.area')" min-width="120" sortable />
          <el-table-column
            prop="metaImporte"
            :label="$t('dashboard.table.monthlyGoal')"
            width="140"
            align="right"
            sortable
          >
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
            :sort-by="semaforoSortWeight"
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

      <!-- 4. Rendimiento económico por Empleado -->
      <el-card
        class="dashboard-card mb-4"
        :header="$t('dashboard.employeeEconomicPerformance')"
        shadow="hover"
      >
        <div v-if="empleadosRendimiento.length === 0" class="empty-hint p-4 text-center">
          {{ $t('dashboard.noSellingEmployees') }}
        </div>
        <el-table v-else :data="empleadosRendimiento" style="width: 100%" size="small" stripe>
          <el-table-column prop="nombreCompleto" :label="$t('dashboard.table.employee')" min-width="190" sortable>
            <template #default="{ row }">
              <div style="display: flex; align-items: center; gap: 8px">
                <el-avatar
                  :size="28"
                  :src="row.imagen || undefined"
                  :style="{
                    backgroundColor: getUserBgColor(row.color),
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 'bold',
                  }"
                >
                  {{ getUserInitials(row.nombre, row.apellidos) }}
                </el-avatar>
                <div>
                  <div style="font-weight: 600; line-height: 1.2">{{ row.nombreCompleto }}</div>
                  <div style="font-size: 0.75rem; color: var(--el-text-color-secondary)">
                    {{ row.email }}
                  </div>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="rolCodigo" :label="$t('dashboard.table.role')" width="120" align="center" sortable>
            <template #default="{ row }">
              <el-tag
                size="small"
                :type="row.rolCodigo === 'FOTOGRAFO' ? 'success' : 'primary'"
                effect="light"
              >
                {{ row.rolCodigo === 'FOTOGRAFO' ? $t('dashboard.table.photographerRole') : $t('dashboard.table.seller') }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="hotelNombre" :label="$t('dashboard.table.hotel')" min-width="150" sortable>
            <template #default="{ row }">
              <span style="font-weight: 500">{{ row.hotelNombre || $t('dashboard.table.unassigned') }}</span>
              <span
                v-if="row.areaNombre"
                style="display: block; font-size: 0.75rem; color: var(--el-text-color-secondary)"
              >
                {{ row.areaNombre }}
              </span>
            </template>
          </el-table-column>
          <el-table-column
            prop="metaImporte"
            :label="$t('dashboard.table.monthlyGoal')"
            width="140"
            align="right"
            sortable
          >
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
            :sort-by="semaforoSortWeight"
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
    </div>

    <!-- PESTAÑA 2: LIQUIDACIÓN Y CONTROL DE COMISIONES -->
    <div v-else-if="activeTab === 'comisiones'" class="tab-content-fade">
      <!-- Tarjetas KPIs para Contable -->
      <el-row :gutter="20" class="stats-row mb-4">
        <el-col :xs="24" :sm="8">
          <el-card class="dashboard-card stat-card" shadow="hover">
            <div class="card-icon bg-primary">
              <el-icon><Wallet /></el-icon>
            </div>
            <div class="stat-content">
              <span class="stat-label">{{ $t('dashboard.completedSales') }}</span>
              <span class="stat-value">
                {{ formatCurrency(commissionStore.resumen?.totalVentasUsd || 0) }}
              </span>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="8">
          <el-card class="dashboard-card stat-card" shadow="hover">
            <div class="card-icon bg-success">
              <el-icon><Money /></el-icon>
            </div>
            <div class="stat-content">
              <span class="stat-label">
                {{ $t('dashboard.commissionsToSettle', { period: selectedMonths.length > 1 ? `${selectedMonths.length} meses` : 'Mes' }) }}
              </span>
              <span class="stat-value text-success">
                {{ formatCurrency(globalMonthlyCommissions) }}
              </span>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="8">
          <el-card class="dashboard-card stat-card" shadow="hover">
            <div class="card-icon bg-warning">
              <el-icon><Tickets /></el-icon>
            </div>
            <div class="stat-content">
              <span class="stat-label">{{ $t('dashboard.pendingCommissions') }}</span>
              <span class="stat-value text-warning">
                {{ commissionStore.comisiones.filter((c) => c.estado === 'PENDIENTE').length }}
              </span>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- Tabla de Liquidación de Comisiones -->
      <el-card class="dashboard-card mb-4" shadow="hover">
        <template #header>
          <div class="comisiones-card-header">
            <span class="card-header-title">{{ $t('dashboard.commissionsListTitle') }}</span>
            <div class="comisiones-filters">
              <el-select
                v-model="comisionUsuarioFilter"
                :placeholder="$t('dashboard.allUsers')"
                clearable
                filterable
                size="default"
                style="width: 240px"
              >
                <el-option
                  v-for="u in availableContableUsers"
                  :key="u.id"
                  :label="`${u.nombre} ${u.apellidos}`.trim()"
                  :value="u.id"
                >
                  <div class="user-select-option">
                    <span>{{ u.nombre }} {{ u.apellidos }}</span>
                    <el-tag v-if="u.rol" size="small" type="info" effect="plain" class="ml-2">
                      {{ u.rol }}
                    </el-tag>
                  </div>
                </el-option>
              </el-select>
            </div>
          </div>
        </template>

        <div v-if="filteredComisiones.length === 0" class="empty-hint p-4 text-center">
          {{ $t('dashboard.noCommissionRecords') }}
        </div>
        <el-table
          v-else
          :data="filteredComisiones"
          stripe
          show-summary
          :summary-method="getComisionesSummaries"
          style="width: 100%"
        >
          <el-table-column prop="fechaVenta" :label="$t('dashboard.table.date')" width="110" />
          <el-table-column :label="$t('dashboard.table.beneficiary')" min-width="170">
            <template #default="{ row }">
              <strong>{{ row.usuarioNombre }} {{ row.usuarioApellidos }}</strong>
            </template>
          </el-table-column>
          <el-table-column :label="$t('dashboard.table.roleContract')" width="180">
            <template #default="{ row }">
              <div style="display: flex; gap: 4px; align-items: center">
                <el-tag size="small">{{ row.rolEnVenta }}</el-tag>
                <el-tag
                  size="small"
                  :type="row.tipoContrato === 'SIN_SALARIO' ? 'primary' : 'success'"
                >
                  {{ row.tipoContrato === 'SIN_SALARIO' ? $t('dashboard.table.withoutSalary') : $t('dashboard.table.salaried') }}
                </el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="hotelNombre" :label="$t('dashboard.table.hotel')" min-width="150" />
          <el-table-column prop="baseCalculoUsd" :label="$t('dashboard.table.netBase')" width="165" align="right">
            <template #default="{ row }">
              <span>{{ formatCurrency(row.baseCalculoUsd) }}</span>
            </template>
          </el-table-column>
          <el-table-column :label="$t('dashboard.table.rate')" width="90" align="center">
            <template #default="{ row }">
              <span>{{ row.porcentajeAplicado }}%</span>
            </template>
          </el-table-column>
          <el-table-column
            prop="importeComisionUsd"
            :label="$t('dashboard.table.commissionAmount')"
            width="140"
            align="right"
          >
            <template #default="{ row }">
              <strong class="text-success">{{ formatCurrency(row.importeComisionUsd) }}</strong>
            </template>
          </el-table-column>
          <el-table-column :label="$t('dashboard.table.status')" width="120" align="center">
            <template #default="{ row }">
              <el-tag
                size="small"
                :type="
                  row.estado === 'PAGADA'
                    ? 'success'
                    : row.estado === 'APROBADA'
                      ? 'warning'
                      : 'info'
                "
              >
                {{ row.estado }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="$t('dashboard.table.actions')" width="190" align="center" fixed="right">
            <template #default="{ row }">
              <div style="display: flex; gap: 6px; justify-content: center; align-items: center">
                <!-- Estado PENDIENTE: Aprobar y Pagar -->
                <template v-if="row.estado === 'PENDIENTE'">
                  <el-button
                    type="warning"
                    size="small"
                    @click="handleUpdateCommissionStatus(row.id, 'APROBADA')"
                  >
                    {{ $t('dashboard.approve') }}
                  </el-button>
                  <el-button
                    type="success"
                    size="small"
                    @click="handleUpdateCommissionStatus(row.id, 'PAGADA')"
                  >
                    {{ $t('dashboard.pay') }}
                  </el-button>
                </template>

                <!-- Estado APROBADA: Pagar y Deshacer -->
                <template v-else-if="row.estado === 'APROBADA'">
                  <el-button
                    type="success"
                    size="small"
                    @click="handleUpdateCommissionStatus(row.id, 'PAGADA')"
                  >
                    {{ $t('dashboard.pay') }}
                  </el-button>
                  <el-popconfirm
                    :title="$t('dashboard.restorePendingConfirm')"
                    :confirm-button-text="$t('dashboard.restore')"
                    :cancel-button-text="$t('common.cancel')"
                    confirm-button-type="warning"
                    :width="230"
                    @confirm="handleUpdateCommissionStatus(row.id, 'PENDIENTE')"
                  >
                    <template #reference>
                      <el-button
                        type="info"
                        plain
                        size="small"
                        :icon="RotateCcw"
                        :title="$t('dashboard.undoApproval')"
                      >
                        {{ $t('dashboard.undo') }}
                      </el-button>
                    </template>
                  </el-popconfirm>
                </template>

                <!-- Estado PAGADA: Liquidada y Deshacer -->
                <template v-else-if="row.estado === 'PAGADA'">
                  <span class="text-xs text-muted" style="margin-right: 4px">{{ $t('dashboard.settled') }}</span>
                  <el-popconfirm
                    :title="$t('dashboard.restorePendingConfirm')"
                    :confirm-button-text="$t('dashboard.restore')"
                    :cancel-button-text="$t('common.cancel')"
                    confirm-button-type="warning"
                    :width="230"
                    @confirm="handleUpdateCommissionStatus(row.id, 'PENDIENTE')"
                  >
                    <template #reference>
                      <el-button
                        type="info"
                        plain
                        size="small"
                        :icon="RotateCcw"
                        :title="$t('dashboard.undoPayment')"
                      >
                        {{ $t('dashboard.undo') }}
                      </el-button>
                    </template>
                  </el-popconfirm>
                </template>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
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

@media (max-width: 992px) {
  .header-controls {
    position: static;
    margin-top: 0.75rem;
    justify-content: flex-end;
  }
}

.comisiones-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.card-header-title {
  font-weight: 600;
  font-size: 1rem;
  color: var(--heading-color, #0f172a);
}

.comisiones-filters {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-select-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.tab-content-fade {
  animation: fadeIn 0.25s ease-in-out;
}

:deep(.el-table__footer-wrapper tbody td) {
  font-weight: 700;
  background-color: var(--el-fill-color-light, #f8fafc);
}

:deep(.el-table__footer-wrapper .cell) {
  font-weight: 700;
  color: var(--heading-color, #0f172a);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
