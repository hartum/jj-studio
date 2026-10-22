<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/features/users/stores/user.store'
import { useHotelStore } from '@/features/hotels/stores/hotel.store'
import { useGoalStore } from '@/features/goals/stores/goal.store'
import { useCommissionStore } from '@/features/commissions/stores/commission.store'
import { getUserInitials, getUserBgColor } from '@/features/users/utils/user-avatar'
import { formatCurrency } from '@/shared/formatters'
import GoalProgressCard from '@/features/goals/ui/GoalProgressCard.vue'
import GoalEvolutionChart from '@/features/goals/ui/GoalEvolutionChart.vue'
import type { SemaforoEstado, HotelProgresoResumen } from '@/features/goals/domain/goal.model'

export interface ContableHotelSummary {
  id: number
  nombre: string
  areaNombre: string
  paisNombre: string
}

interface GlobalProgresoTotals {
  metaTotal: number
  ventasTotal: number
  porcentaje: number
  metaEsperadaTotal: number
  desviacion: number
  semaforo: SemaforoEstado
  numHoteles: number
}

const props = defineProps<{
  selectedHotelFilters: number[]
  selectedHotelsSummary: string
  selectedMonthsLabel: string
  currentHotelProgreso: HotelProgresoResumen | null
  filteredProgresoHoteles: HotelProgresoResumen[]
  globalProgresoTotals: GlobalProgresoTotals
  contableHotels: ContableHotelSummary[]
  getProgressColor: (semaforo: string, metaImporte: number) => string
  getSemaforoTagType: (
    semaforo: string,
    metaImporte: number,
  ) => 'success' | 'warning' | 'danger' | 'info'
  getSemaforoText: (semaforo: string, metaImporte: number) => string
}>()

const { t } = useI18n()
const userStore = useUserStore()
const hotelStore = useHotelStore()
const goalStore = useGoalStore()
const commissionStore = useCommissionStore()

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

  // 1. Determinar IDs de hoteles activos
  const activeHotelIds = new Set<number>()
  if (props.selectedHotelFilters.length > 0) {
    for (const id of props.selectedHotelFilters) activeHotelIds.add(id)
  } else {
    for (const h of props.contableHotels) activeHotelIds.add(h.id)
  }

  // 2. Iterar sobre filteredProgresoHoteles para extraer fotógrafos
  for (const hotel of props.filteredProgresoHoteles) {
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

  // 3. Usuarios de ventas (AGENDADOR / VENDEDOR) en hoteles activos
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
  <div class="tab-content-fade">
    <!-- 1. Objetivos Comerciales de tus Áreas -->
    <div class="goals-summary-block mb-4">
      <GoalProgressCard
        v-if="!currentHotelProgreso"
        :titulo="
          selectedHotelFilters.length > 1
            ? $t('dashboard.commercialGoalSelected')
            : $t('dashboard.commercialGoal')
        "
        :subtitulo="
          $t('dashboard.commercialSubtitle', {
            monthsLabel: selectedMonthsLabel,
            count: globalProgresoTotals.numHoteles,
            hotelsLabel:
              globalProgresoTotals.numHoteles === 1
                ? $t('dashboard.hotelSingle')
                : $t('dashboard.hotelPlural'),
            summary: selectedHotelFilters.length > 1 ? ` (${selectedHotelsSummary})` : '',
          })
        "
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
        :subtitulo="
          $t('dashboard.hotelSubtitleMonths', {
            area: currentHotelProgreso.areaNombre,
            monthsLabel: selectedMonthsLabel,
          })
        "
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
    <el-card
      class="dashboard-card mb-4"
      :header="$t('dashboard.hotelEconomicPerformance')"
      shadow="hover"
    >
      <el-table :data="filteredProgresoHoteles" style="width: 100%" size="small" stripe>
        <el-table-column
          prop="hotelNombre"
          :label="$t('dashboard.table.hotel')"
          min-width="160"
          sortable
        />
        <el-table-column
          prop="areaNombre"
          :label="$t('dashboard.table.area')"
          min-width="120"
          sortable
        />
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
        <el-table-column
          prop="porcentajeCumplimiento"
          :label="$t('dashboard.table.progress')"
          min-width="170"
          sortable
        >
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
        <el-table-column
          prop="nombreCompleto"
          :label="$t('dashboard.table.employee')"
          min-width="190"
          sortable
        >
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
        <el-table-column
          prop="rolCodigo"
          :label="$t('dashboard.table.role')"
          width="120"
          align="center"
          sortable
        >
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="row.rolCodigo === 'FOTOGRAFO' ? 'success' : 'primary'"
              effect="light"
            >
              {{
                row.rolCodigo === 'FOTOGRAFO'
                  ? $t('dashboard.table.photographerRole')
                  : $t('dashboard.table.seller')
              }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="hotelNombre"
          :label="$t('dashboard.table.hotel')"
          min-width="150"
          sortable
        >
          <template #default="{ row }">
            <span style="font-weight: 500">
              {{ row.hotelNombre || $t('dashboard.table.unassigned') }}
            </span>
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
        <el-table-column
          prop="porcentajeCumplimiento"
          :label="$t('dashboard.table.progress')"
          min-width="170"
          sortable
        >
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
</template>

<style scoped>
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
