<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessageBox, ElMessage, type TableInstance } from 'element-plus'
import { useUserStore } from '@/features/users/stores/user.store'
import { useCommissionStore } from '@/features/commissions/stores/commission.store'
import { formatCurrency } from '@/shared/formatters'
import { Money, Wallet, Tickets } from '@element-plus/icons-vue'
import { RotateCcw } from '@lucide/vue'
import type { Comision } from '@/features/commissions/domain/commission.model'

export interface ContableHotelSummary {
  id: number
  nombre: string
  areaNombre: string
  paisNombre: string
}

export interface ContableAreaSummary {
  id: number
  nombre: string
  paisNombre: string
  hotelesCount: number
}

const props = defineProps<{
  selectedHotelFilters: number[]
  contableHotels: ContableHotelSummary[]
  contableAreas: ContableAreaSummary[]
  commissionDateRange: [string, string]
  globalMonthlyCommissions: number
  onUpdateCommissionStatus: (id: number, nuevoEstado: string) => Promise<void>
  onUpdateCommissionsStatusMasivo: (ids: number[], nuevoEstado: string) => Promise<void>
}>()

const { t } = useI18n()
const userStore = useUserStore()
const commissionStore = useCommissionStore()

// Filtro de usuario para la tabla de Liquidación y Control de Comisiones
const comisionUsuarioFilter = ref<string | null>(null)

const availableContableUsers = computed(() => {
  const activeHotelIds = new Set<number>()
  if (props.selectedHotelFilters.length > 0) {
    for (const id of props.selectedHotelFilters) activeHotelIds.add(id)
  } else {
    for (const h of props.contableHotels) activeHotelIds.add(h.id)
  }

  const areaIdSet = new Set(props.contableAreas.map((a) => a.id))
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

// Selección y acciones masivas de comisiones
const comisionesTableRef = ref<TableInstance>()
const selectedComisiones = ref<Comision[]>([])

function handleSelectionChange(val: Comision[]) {
  selectedComisiones.value = val
}

const pendingSelectedCount = computed(
  () => selectedComisiones.value.filter((c) => c.estado === 'PENDIENTE').length,
)

const payableSelectedCount = computed(
  () =>
    selectedComisiones.value.filter((c) => c.estado === 'PENDIENTE' || c.estado === 'APROBADA')
      .length,
)

async function handleBulkApprove() {
  const pendingItems = selectedComisiones.value.filter((c) => c.estado === 'PENDIENTE')
  if (pendingItems.length === 0) {
    ElMessage.warning(t('dashboard.noPendingSelected'))
    return
  }

  try {
    await ElMessageBox.confirm(
      t('dashboard.confirmBulkApproveMsg', { count: pendingItems.length }),
      t('dashboard.confirmBulkApproveTitle'),
      {
        confirmButtonText: t('dashboard.approve'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      },
    )

    const ids = pendingItems.map((c) => c.id)
    await props.onUpdateCommissionsStatusMasivo(ids, 'APROBADA')
    comisionesTableRef.value?.clearSelection()
    selectedComisiones.value = []
  } catch {
    // Cancelado por el usuario
  }
}

async function handleBulkPay() {
  const payableItems = selectedComisiones.value.filter(
    (c) => c.estado === 'PENDIENTE' || c.estado === 'APROBADA',
  )
  if (payableItems.length === 0) {
    ElMessage.warning(t('dashboard.noApprovableSelected'))
    return
  }

  try {
    await ElMessageBox.confirm(
      t('dashboard.confirmBulkPayMsg', { count: payableItems.length }),
      t('dashboard.confirmBulkPayTitle'),
      {
        confirmButtonText: t('dashboard.pay'),
        cancelButtonText: t('common.cancel'),
        type: 'success',
      },
    )

    const ids = payableItems.map((c) => c.id)
    await props.onUpdateCommissionsStatusMasivo(ids, 'PAGADA')
    comisionesTableRef.value?.clearSelection()
    selectedComisiones.value = []
  } catch {
    // Cancelado por el usuario
  }
}

interface TableColumnSummaryCtx {
  property: string
  label: string
  type?: string
}

interface SummaryMethodProps {
  columns: TableColumnSummaryCtx[]
  data: Comision[]
}

function getComisionesSummaries(param: SummaryMethodProps): string[] {
  const { columns, data } = param
  const sums: string[] = []

  const firstDataIndex = columns.findIndex((c) => c.type !== 'selection')

  columns.forEach((column, index) => {
    if (index === firstDataIndex) {
      sums[index] = t('dashboard.table.total') || 'Total'
      return
    }

    if (
      column.property === 'importeComisionUsd' ||
      column.label === t('dashboard.table.commissionAmount')
    ) {
      const total = data.reduce((sum, item) => sum + (item.importeComisionUsd || 0), 0)
      sums[index] = formatCurrency(total)
      return
    }

    sums[index] = ''
  })

  return sums
}
</script>

<template>
  <div class="tab-content-fade">
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
              {{
                $t('dashboard.commissionsToSettle', {
                  period: `${commissionDateRange[0]} a ${commissionDateRange[1]}`,
                })
              }}
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
          <div class="comisiones-header-left">
            <span class="card-header-title">{{ $t('dashboard.commissionsListTitle') }}</span>
            <transition name="fade">
              <div v-if="selectedComisiones.length > 0" class="bulk-actions-toolbar">
                <el-tag type="info" effect="plain" round class="selected-count-tag">
                  {{ $t('dashboard.selectedCount', { count: selectedComisiones.length }) }}
                </el-tag>
                <el-button
                  type="warning"
                  size="small"
                  :disabled="pendingSelectedCount === 0"
                  @click="handleBulkApprove"
                >
                  {{ $t('dashboard.bulkApprove', { count: pendingSelectedCount }) }}
                </el-button>
                <el-button
                  type="success"
                  size="small"
                  :disabled="payableSelectedCount === 0"
                  @click="handleBulkPay"
                >
                  {{ $t('dashboard.bulkPay', { count: payableSelectedCount }) }}
                </el-button>
              </div>
            </transition>
          </div>
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
        ref="comisionesTableRef"
        :data="filteredComisiones"
        stripe
        show-summary
        :summary-method="getComisionesSummaries"
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="48" align="center" />
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
                {{
                  row.tipoContrato === 'SIN_SALARIO'
                    ? $t('dashboard.table.withoutSalary')
                    : $t('dashboard.table.salaried')
                }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          prop="hotelNombre"
          :label="$t('dashboard.table.hotel')"
          min-width="150"
        />
        <el-table-column
          prop="baseCalculoUsd"
          :label="$t('dashboard.table.netBase')"
          width="165"
          align="right"
        >
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
        <el-table-column
          :label="$t('dashboard.table.actions')"
          width="190"
          align="center"
          fixed="right"
        >
          <template #default="{ row }">
            <div style="display: flex; gap: 6px; justify-content: center; align-items: center">
              <!-- Estado PENDIENTE: Aprobar y Pagar -->
              <template v-if="row.estado === 'PENDIENTE'">
                <el-button
                  type="warning"
                  size="small"
                  @click="onUpdateCommissionStatus(row.id, 'APROBADA')"
                >
                  {{ $t('dashboard.approve') }}
                </el-button>
                <el-button
                  type="success"
                  size="small"
                  @click="onUpdateCommissionStatus(row.id, 'PAGADA')"
                >
                  {{ $t('dashboard.pay') }}
                </el-button>
              </template>

              <!-- Estado APROBADA: Pagar y Deshacer -->
              <template v-else-if="row.estado === 'APROBADA'">
                <el-button
                  type="success"
                  size="small"
                  @click="onUpdateCommissionStatus(row.id, 'PAGADA')"
                >
                  {{ $t('dashboard.pay') }}
                </el-button>
                <el-popconfirm
                  :title="$t('dashboard.restorePendingConfirm')"
                  :confirm-button-text="$t('dashboard.restore')"
                  :cancel-button-text="$t('common.cancel')"
                  confirm-button-type="warning"
                  :width="230"
                  @confirm="onUpdateCommissionStatus(row.id, 'PENDIENTE')"
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
                <span class="text-xs text-muted" style="margin-right: 4px">
                  {{ $t('dashboard.settled') }}
                </span>
                <el-popconfirm
                  :title="$t('dashboard.restorePendingConfirm')"
                  :confirm-button-text="$t('dashboard.restore')"
                  :cancel-button-text="$t('common.cancel')"
                  confirm-button-type="warning"
                  :width="230"
                  @confirm="onUpdateCommissionStatus(row.id, 'PENDIENTE')"
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
</template>

<style scoped>
.comisiones-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.comisiones-header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.bulk-actions-toolbar {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding-left: 0.75rem;
  border-left: 2px solid var(--toolbar-border, #e2e8f0);
}

.selected-count-tag {
  font-weight: 600;
  font-size: 0.75rem;
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
