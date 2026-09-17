<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDashboard } from '@/features/home/composables/useDashboard'
import type { HotelItem } from '@/features/countries/domain/country.model'
import type { SemaforoEstado } from '@/features/goals/domain/goal.model'
import GoalProgressCard from '@/features/goals/ui/GoalProgressCard.vue'
import GoalEvolutionChart from '@/features/goals/ui/GoalEvolutionChart.vue'
import { getUserInitials, getUserBgColor } from '@/features/users/utils/user-avatar'
import { Money, Wallet, Tickets, Location } from '@element-plus/icons-vue'
import { Building2 } from '@lucide/vue'

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
        <el-tab-pane label="Estadísticas" name="estadisticas" />
        <el-tab-pane label="Liquidación y Control de Comisiones" name="comisiones" />
      </el-tabs>

      <div class="header-controls">
        <div class="controls-bar">
          <el-select
            v-model="selectedHotelFilters"
            placeholder="Todos tus Hoteles"
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
            placeholder="Seleccionar meses"
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
              ? 'Objetivo comercial hoteles seleccionados'
              : 'Objetivo comercial'
          "
          :subtitulo="`${selectedMonthsLabel} — Ventas de ${globalProgresoTotals.numHoteles} ${globalProgresoTotals.numHoteles === 1 ? 'hotel' : 'hoteles'}${selectedHotelFilters.length > 1 ? ` (${selectedHotelsSummary})` : ''}`"
          :meta-importe="globalProgresoTotals.metaTotal"
          :ventas-reales-usd="globalProgresoTotals.ventasTotal"
          :porcentaje-cumplimiento="globalProgresoTotals.porcentaje"
          :meta-esperada-hoy="globalProgresoTotals.metaEsperadaTotal"
          :desviacion-monetaria="globalProgresoTotals.desviacion"
          :semaforo="globalProgresoTotals.semaforo"
        />
        <GoalProgressCard
          v-else
          :titulo="`Objetivo comercial ${currentHotelProgreso.hotelNombre}`"
          :subtitulo="`${currentHotelProgreso.areaNombre} — ${selectedMonthsLabel}`"
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
      <el-card class="dashboard-card mb-4" header="Rendimiento económico por Hotel" shadow="hover">
        <el-table :data="filteredProgresoHoteles" style="width: 100%" size="small" stripe>
          <el-table-column prop="hotelNombre" label="Hotel" min-width="160" sortable />
          <el-table-column prop="areaNombre" label="Área" min-width="120" sortable />
          <el-table-column
            prop="metaImporte"
            label="Meta Mensual"
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
            label="Ventas Reales"
            width="140"
            align="right"
            sortable
          >
            <template #default="{ row }">
              <span class="font-bold text-primary">{{ formatCurrency(row.ventasRealesUsd) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="porcentajeCumplimiento" label="Avance" min-width="170" sortable>
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
            label="Semáforo"
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
        header="Rendimiento económico por Empleado"
        shadow="hover"
      >
        <div v-if="empleadosRendimiento.length === 0" class="empty-hint p-4 text-center">
          No hay empleados con capacidad de venta en los hoteles seleccionados.
        </div>
        <el-table v-else :data="empleadosRendimiento" style="width: 100%" size="small" stripe>
          <el-table-column prop="nombreCompleto" label="Empleado" min-width="190" sortable>
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
          <el-table-column prop="rolCodigo" label="Rol" width="120" align="center" sortable>
            <template #default="{ row }">
              <el-tag
                size="small"
                :type="row.rolCodigo === 'FOTOGRAFO' ? 'success' : 'primary'"
                effect="light"
              >
                {{ row.rolCodigo === 'FOTOGRAFO' ? 'Fotógrafo' : 'Vendedor' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="hotelNombre" label="Hotel" min-width="150" sortable>
            <template #default="{ row }">
              <span style="font-weight: 500">{{ row.hotelNombre || 'Sin asignar' }}</span>
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
            label="Meta Mensual"
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
            label="Ventas Reales"
            width="140"
            align="right"
            sortable
          >
            <template #default="{ row }">
              <span class="font-bold text-primary">{{ formatCurrency(row.ventasRealesUsd) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="porcentajeCumplimiento" label="Avance" min-width="170" sortable>
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
            label="Semáforo"
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
            <div class="card-icon bg-success">
              <el-icon><Money /></el-icon>
            </div>
            <div class="stat-content">
              <span class="stat-label">
                Comisiones a Liquidar ({{
                  selectedMonths.length > 1 ? `${selectedMonths.length} meses` : 'Mes'
                }})
              </span>
              <span class="stat-value text-success">
                {{ formatCurrency(globalMonthlyCommissions) }}
              </span>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="8">
          <el-card class="dashboard-card stat-card" shadow="hover">
            <div class="card-icon bg-primary">
              <el-icon><Wallet /></el-icon>
            </div>
            <div class="stat-content">
              <span class="stat-label">Ventas Procesadas</span>
              <span class="stat-value">
                {{ formatCurrency(commissionStore.resumen?.totalVentasUsd || 0) }}
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
              <span class="stat-label">Comisiones Pendientes</span>
              <span class="stat-value text-warning">
                {{ commissionStore.comisiones.filter((c) => c.estado === 'PENDIENTE').length }}
              </span>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- Tabla de Liquidación de Comisiones -->
      <el-card
        class="dashboard-card mb-4"
        header="Listado de Comisiones por Venta y Usuario"
        shadow="hover"
      >
        <div v-if="commissionStore.comisiones.length === 0" class="empty-hint p-4">
          No hay registros de comisiones para el período seleccionado.
        </div>
        <el-table v-else :data="commissionStore.comisiones" stripe style="width: 100%">
          <el-table-column prop="fechaVenta" label="Fecha" width="110" />
          <el-table-column label="Beneficiario" min-width="170">
            <template #default="{ row }">
              <strong>{{ row.usuarioNombre }} {{ row.usuarioApellidos }}</strong>
            </template>
          </el-table-column>
          <el-table-column label="Rol / Contrato" width="180">
            <template #default="{ row }">
              <div style="display: flex; gap: 4px; align-items: center">
                <el-tag size="small">{{ row.rolEnVenta }}</el-tag>
                <el-tag
                  size="small"
                  :type="row.tipoContrato === 'SIN_SALARIO' ? 'primary' : 'success'"
                >
                  {{ row.tipoContrato === 'SIN_SALARIO' ? 'Sin Salario' : 'Asalariado' }}
                </el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="hotelNombre" label="Hotel" min-width="150" />
          <el-table-column label="Base Neta (tras imp.)" width="165" align="right">
            <template #default="{ row }">
              <span>{{ formatCurrency(row.baseCalculoUsd) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Tasa" width="90" align="center">
            <template #default="{ row }">
              <span>{{ row.porcentajeAplicado }}%</span>
            </template>
          </el-table-column>
          <el-table-column label="Importe Comisión" width="140" align="right">
            <template #default="{ row }">
              <strong class="text-success">{{ formatCurrency(row.importeComisionUsd) }}</strong>
            </template>
          </el-table-column>
          <el-table-column label="Estado" width="120" align="center">
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
          <el-table-column label="Acciones" width="170" align="center" fixed="right">
            <template #default="{ row }">
              <div style="display: flex; gap: 4px; justify-content: center">
                <el-button
                  v-if="row.estado === 'PENDIENTE'"
                  type="warning"
                  size="small"
                  @click="handleUpdateCommissionStatus(row.id, 'APROBADA')"
                >
                  Aprobar
                </el-button>
                <el-button
                  v-if="row.estado !== 'PAGADA'"
                  type="success"
                  size="small"
                  @click="handleUpdateCommissionStatus(row.id, 'PAGADA')"
                >
                  Pagar
                </el-button>
                <span v-else class="text-xs text-muted">Liquidada</span>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- Catálogo de Países y Áreas Asignadas -->
      <el-card
        class="dashboard-card"
        header="Estructura de Hoteles por Áreas Asignadas"
        shadow="hover"
      >
        <div v-if="groupedContableHotelsByCountry.length === 0" class="empty-hint p-4">
          No tienes áreas asignadas actualmente. Contacta con tu administrador.
        </div>
        <el-collapse v-else>
          <el-collapse-item
            v-for="pais in groupedContableHotelsByCountry"
            :key="pais.id"
            :title="`${pais.nombre} (${pais.areas.length} áreas)`"
          >
            <div class="pais-collapse-content">
              <div v-for="area in pais.areas" :key="area.id" class="area-item-box">
                <span class="area-title">{{ area.nombre }}</span>
                <el-table
                  :data="area.hoteles || []"
                  style="width: 100%; margin-top: 0.5rem"
                  size="small"
                >
                  <el-table-column prop="nombre" label="Hotel" />
                  <el-table-column label="Cadena / Características">
                    <template #default="{ row }">
                      <span>{{ row.cadenaHotelera || 'Hotel Independiente' }}</span>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>
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

.tab-content-fade {
  animation: fadeIn 0.25s ease-in-out;
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
