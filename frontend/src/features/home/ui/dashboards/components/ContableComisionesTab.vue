<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessageBox, ElMessage, type TableInstance } from 'element-plus'
import { useUserStore } from '@/features/users/stores/user.store'
import { useCommissionStore } from '@/features/commissions/stores/commission.store'
import { formatCurrency, formatMxn } from '@/shared/formatters'
import { getUserInitials, getUserBgColor } from '@/features/users/utils/user-avatar'
import { Money, Wallet, Tickets, InfoFilled } from '@element-plus/icons-vue'
import { RotateCcw, Award } from '@lucide/vue'
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

export interface EmpleadoComisionResumen {
  usuarioId: string
  nombre: string
  apellidos: string
  nombreCompleto: string
  email: string
  imagen?: string | null
  color?: string | null
  roles: string[]
  tipoContrato: string
  hoteles: string[]
  // Montos USD
  totalVentasBrutasUsd: number
  totalImpuestoUsd: number
  impuestoPctCalculado: number
  totalBaseNetaUsd: number
  comisionFotografoUsd: number
  comisionVendedorUsd: number
  comisionOtrasUsd: number
  totalComisionesUsd: number
  // Conversión MXN
  totalComisionesMxn: number
  // Conteos y estados
  comisionesCount: number
  pendientesCount: number
  aprobadasCount: number
  pagadasCount: number
  estadoGeneral: 'PENDIENTE' | 'APROBADA' | 'PAGADA' | 'MIXTO'
  // IDs de comisiones
  comisionesIds: number[]
  pendientesIds: number[]
  payableIds: number[]
  comisiones: Comision[]
  // Meta individual / Bono ($500+)
  cumpleBono: boolean
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

// --- Tipo de Cambio USD -> MXN ---
const LOCAL_STORAGE_KEY_TC = 'jj_studio_tipo_cambio_mxn'
const storedTc = localStorage.getItem(LOCAL_STORAGE_KEY_TC)
const tipoCambioMxn = ref<number>(storedTc ? parseFloat(storedTc) || 18.0 : 18.0)

watch(tipoCambioMxn, (newVal) => {
  if (newVal && newVal > 0) {
    localStorage.setItem(LOCAL_STORAGE_KEY_TC, newVal.toString())
  }
})

// --- Filtro de usuario ---
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

// --- Agrupación de comisiones por Usuario (Estilo Excel COMISIONES1) ---
const resumenUsuariosComision = computed<EmpleadoComisionResumen[]>(() => {
  let list = commissionStore.comisiones
  if (comisionUsuarioFilter.value) {
    list = list.filter((c) => c.usuarioId === comisionUsuarioFilter.value)
  }

  const userMap = new Map<string, EmpleadoComisionResumen>()

  for (const c of list) {
    let item = userMap.get(c.usuarioId)
    if (!item) {
      const uProfile = userStore.usersWithProfile.find((u) => u.id === c.usuarioId)
      item = {
        usuarioId: c.usuarioId,
        nombre: c.usuarioNombre || uProfile?.nombre || 'Usuario',
        apellidos: c.usuarioApellidos || uProfile?.apellidos || '',
        nombreCompleto:
          `${c.usuarioNombre || uProfile?.nombre || 'Usuario'} ${c.usuarioApellidos || uProfile?.apellidos || ''}`.trim(),
        email: c.usuarioEmail || uProfile?.email || '',
        imagen: uProfile?.imagen || null,
        color: uProfile?.color || null,
        roles: [],
        tipoContrato: c.tipoContrato || uProfile?.tipoContrato || 'ASALARIADO',
        hoteles: [],
        totalVentasBrutasUsd: 0,
        totalImpuestoUsd: 0,
        impuestoPctCalculado: 16,
        totalBaseNetaUsd: 0,
        comisionFotografoUsd: 0,
        comisionVendedorUsd: 0,
        comisionOtrasUsd: 0,
        totalComisionesUsd: 0,
        totalComisionesMxn: 0,
        comisionesCount: 0,
        pendientesCount: 0,
        aprobadasCount: 0,
        pagadasCount: 0,
        estadoGeneral: 'PENDIENTE',
        comisionesIds: [],
        pendientesIds: [],
        payableIds: [],
        comisiones: [],
        cumpleBono: false,
      }
      userMap.set(c.usuarioId, item)
    }

    item.comisiones.push(c)
    item.comisionesIds.push(c.id)
    item.comisionesCount++

    // Roles únicos del empleado
    if (c.rolEnVenta && !item.roles.includes(c.rolEnVenta)) {
      item.roles.push(c.rolEnVenta)
    }

    // Hoteles únicos
    if (c.hotelNombre && !item.hoteles.includes(c.hotelNombre)) {
      item.hoteles.push(c.hotelNombre)
    }

    // Estados
    if (c.estado === 'PENDIENTE') {
      item.pendientesCount++
      item.pendientesIds.push(c.id)
      item.payableIds.push(c.id)
    } else if (c.estado === 'APROBADA') {
      item.aprobadasCount++
      item.payableIds.push(c.id)
    } else if (c.estado === 'PAGADA') {
      item.pagadasCount++
    }

    // Comisiones por rol
    if (c.rolEnVenta === 'FOTOGRAFO') {
      item.comisionFotografoUsd += c.importeComisionUsd || 0
    } else if (c.rolEnVenta === 'VENDEDOR') {
      item.comisionVendedorUsd += c.importeComisionUsd || 0
    } else {
      item.comisionOtrasUsd += c.importeComisionUsd || 0
    }

    item.totalComisionesUsd += c.importeComisionUsd || 0
  }

  // Segundo pase: cálculo preciso de ventas brutas, impuestos y bases netas sin duplicar ventas
  for (const item of userMap.values()) {
    const processedSaleIds = new Set<number>()

    for (const c of item.comisiones) {
      if (!processedSaleIds.has(c.citaVentaId)) {
        processedSaleIds.add(c.citaVentaId)

        // Venta bruta
        const ventaBruta =
          c.totalVentaUsd && c.totalVentaUsd > 0
            ? c.totalVentaUsd
            : c.baseCalculoUsd > 0
              ? Number((c.baseCalculoUsd / 0.84).toFixed(2))
              : 0

        // Impuesto deducido exacto
        const impuesto =
          c.impuestoMontoUsd !== undefined
            ? c.impuestoMontoUsd
            : Number(Math.max(0, ventaBruta - c.baseCalculoUsd).toFixed(2))

        item.totalVentasBrutasUsd += ventaBruta
        item.totalImpuestoUsd += impuesto
        item.totalBaseNetaUsd += c.baseCalculoUsd || 0
      }
    }

    // Conversión a Pesos MXN
    const tc = tipoCambioMxn.value > 0 ? tipoCambioMxn.value : 1
    item.totalComisionesMxn = Number((item.totalComisionesUsd * tc).toFixed(2))

    // Porcentaje de impuesto efectivo aplicado
    item.impuestoPctCalculado =
      item.totalVentasBrutasUsd > 0
        ? Math.round((item.totalImpuestoUsd / item.totalVentasBrutasUsd) * 100)
        : 16

    // Redondeos limpios
    item.totalVentasBrutasUsd = Number(item.totalVentasBrutasUsd.toFixed(2))
    item.totalImpuestoUsd = Number(item.totalImpuestoUsd.toFixed(2))
    item.totalBaseNetaUsd = Number(item.totalBaseNetaUsd.toFixed(2))
    item.comisionFotografoUsd = Number(item.comisionFotografoUsd.toFixed(2))
    item.comisionVendedorUsd = Number(item.comisionVendedorUsd.toFixed(2))
    item.comisionOtrasUsd = Number(item.comisionOtrasUsd.toFixed(2))
    item.totalComisionesUsd = Number(item.totalComisionesUsd.toFixed(2))

    // Estado general del usuario
    if (item.pagadasCount === item.comisionesCount) {
      item.estadoGeneral = 'PAGADA'
    } else if (item.aprobadasCount === item.comisionesCount) {
      item.estadoGeneral = 'APROBADA'
    } else if (item.pendientesCount === item.comisionesCount) {
      item.estadoGeneral = 'PENDIENTE'
    } else {
      item.estadoGeneral = 'MIXTO'
    }

    // Umbral de Bono de productividad acordado ($500+)
    item.cumpleBono = item.totalVentasBrutasUsd >= 500
  }

  return Array.from(userMap.values()).sort((a, b) => b.totalComisionesUsd - a.totalComisionesUsd)
})

// --- Selección y acciones masivas ---
const usuariosTableRef = ref<TableInstance>()
const selectedUsuarios = ref<EmpleadoComisionResumen[]>([])

function handleSelectionChange(val: EmpleadoComisionResumen[]) {
  selectedUsuarios.value = val
}

const pendingSelectedCount = computed(() =>
  selectedUsuarios.value.reduce((acc, u) => acc + u.pendientesCount, 0),
)

const payableSelectedCount = computed(() =>
  selectedUsuarios.value.reduce((acc, u) => acc + (u.pendientesCount + u.aprobadasCount), 0),
)

async function handleBulkApprove() {
  const ids: number[] = []
  for (const u of selectedUsuarios.value) {
    ids.push(...u.pendientesIds)
  }

  if (ids.length === 0) {
    ElMessage.warning(t('dashboard.noPendingSelected'))
    return
  }

  try {
    await ElMessageBox.confirm(
      t('dashboard.confirmBulkApproveMsg', { count: ids.length }),
      t('dashboard.confirmBulkApproveTitle'),
      {
        confirmButtonText: t('dashboard.approve'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      },
    )

    await props.onUpdateCommissionsStatusMasivo(ids, 'APROBADA')
    usuariosTableRef.value?.clearSelection()
    selectedUsuarios.value = []
  } catch {
    // Cancelado
  }
}

async function handleBulkPay() {
  const ids: number[] = []
  for (const u of selectedUsuarios.value) {
    ids.push(...u.payableIds)
  }

  if (ids.length === 0) {
    ElMessage.warning(t('dashboard.noApprovableSelected'))
    return
  }

  try {
    await ElMessageBox.confirm(
      t('dashboard.confirmBulkPayMsg', { count: ids.length }),
      t('dashboard.confirmBulkPayTitle'),
      {
        confirmButtonText: t('dashboard.pay'),
        cancelButtonText: t('common.cancel'),
        type: 'success',
      },
    )

    await props.onUpdateCommissionsStatusMasivo(ids, 'PAGADA')
    usuariosTableRef.value?.clearSelection()
    selectedUsuarios.value = []
  } catch {
    // Cancelado
  }
}

// --- Acciones individuales por empleado ---
async function handleUserApprove(row: EmpleadoComisionResumen) {
  if (row.pendientesIds.length === 0) return
  try {
    await ElMessageBox.confirm(
      t('dashboard.confirmBulkApproveMsg', { count: row.pendientesIds.length }),
      t('dashboard.confirmBulkApproveTitle'),
      {
        confirmButtonText: t('dashboard.approve'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      },
    )
    await props.onUpdateCommissionsStatusMasivo(row.pendientesIds, 'APROBADA')
  } catch {
    // Cancelado
  }
}

async function handleUserPay(row: EmpleadoComisionResumen) {
  if (row.payableIds.length === 0) return
  try {
    await ElMessageBox.confirm(
      t('dashboard.confirmBulkPayMsg', { count: row.payableIds.length }),
      t('dashboard.confirmBulkPayTitle'),
      {
        confirmButtonText: t('dashboard.pay'),
        cancelButtonText: t('common.cancel'),
        type: 'success',
      },
    )
    await props.onUpdateCommissionsStatusMasivo(row.payableIds, 'PAGADA')
  } catch {
    // Cancelado
  }
}

async function handleUserResetToPending(row: EmpleadoComisionResumen) {
  const idsToReset = row.comisiones
    .filter((c) => c.estado === 'APROBADA' || c.estado === 'PAGADA')
    .map((c) => c.id)

  if (idsToReset.length === 0) return
  await props.onUpdateCommissionsStatusMasivo(idsToReset, 'PENDIENTE')
}

// --- Sumatorias al pie de la tabla ---
interface TableColumnSummaryCtx {
  property: string
  label: string
  type?: string
}

interface SummaryMethodProps {
  columns: TableColumnSummaryCtx[]
  data: EmpleadoComisionResumen[]
}

function getUsuariosSummaries(param: SummaryMethodProps): string[] {
  const { columns, data } = param
  const sums: string[] = []

  columns.forEach((column, index) => {
    if (index === 0 || column.type === 'selection' || column.type === 'expand') {
      sums[index] = ''
      return
    }

    if (
      column.property === 'nombreCompleto' ||
      column.label === t('dashboard.table.employee') ||
      column.label === t('dashboard.table.beneficiary')
    ) {
      sums[index] = t('dashboard.table.total') || 'Total'
      return
    }

    if (column.property === 'totalVentasBrutasUsd') {
      const sum = data.reduce((acc, row) => acc + (row.totalVentasBrutasUsd || 0), 0)
      sums[index] = formatCurrency(sum, 2)
      return
    }

    if (column.property === 'totalImpuestoUsd') {
      const sum = data.reduce((acc, row) => acc + (row.totalImpuestoUsd || 0), 0)
      sums[index] = formatCurrency(sum, 2)
      return
    }

    if (column.property === 'totalBaseNetaUsd') {
      const sum = data.reduce((acc, row) => acc + (row.totalBaseNetaUsd || 0), 0)
      sums[index] = formatCurrency(sum, 2)
      return
    }

    if (column.property === 'comisionFotografoUsd') {
      const sum = data.reduce((acc, row) => acc + (row.comisionFotografoUsd || 0), 0)
      sums[index] = formatCurrency(sum, 2)
      return
    }

    if (column.property === 'comisionVendedorUsd') {
      const sum = data.reduce((acc, row) => acc + (row.comisionVendedorUsd || 0), 0)
      sums[index] = formatCurrency(sum, 2)
      return
    }

    if (column.property === 'comisionOtrasUsd') {
      const sum = data.reduce((acc, row) => acc + (row.comisionOtrasUsd || 0), 0)
      sums[index] = formatCurrency(sum, 2)
      return
    }

    if (column.property === 'totalComisionesUsd') {
      const sum = data.reduce((acc, row) => acc + (row.totalComisionesUsd || 0), 0)
      sums[index] = formatCurrency(sum, 2)
      return
    }

    if (column.property === 'totalComisionesMxn') {
      const sum = data.reduce((acc, row) => acc + (row.totalComisionesMxn || 0), 0)
      sums[index] = formatMxn(sum)
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
              {{ formatCurrency(globalMonthlyCommissions, 2) }}
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

    <!-- Tabla de Liquidación y Control de Comisiones -->
    <el-card class="dashboard-card mb-4" shadow="hover">
      <template #header>
        <div class="comisiones-card-header">
          <div class="comisiones-header-left">
            <span class="card-header-title">{{ $t('dashboard.commissionsListTitle') }}</span>
            <transition name="fade">
              <div v-if="selectedUsuarios.length > 0" class="bulk-actions-toolbar">
                <el-tag type="info" effect="plain" round class="selected-count-tag">
                  {{ $t('dashboard.selectedCount', { count: selectedUsuarios.length }) }}
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
            <!-- Control Tipo de Cambio USD -> MXN -->
            <div class="tc-container">
              <span class="tc-label">{{ $t('dashboard.table.exchangeRate') }}:</span>
              <el-input-number
                v-model="tipoCambioMxn"
                :min="1"
                :max="100"
                :precision="2"
                :step="0.1"
                size="default"
                controls-position="right"
                style="width: 130px"
              />
            </div>

            <!-- Filtro de Usuario -->
            <el-select
              v-model="comisionUsuarioFilter"
              :placeholder="$t('dashboard.allUsers')"
              clearable
              filterable
              size="default"
              style="width: 220px"
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

      <div v-if="resumenUsuariosComision.length === 0" class="empty-hint p-4 text-center">
        {{ $t('dashboard.noCommissionRecords') }}
      </div>

      <el-table
        v-else
        ref="usuariosTableRef"
        :data="resumenUsuariosComision"
        stripe
        show-summary
        :summary-method="getUsuariosSummaries"
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="45" align="center" />

        <!-- Desglose expandible de ventas individuales por empleado -->
        <el-table-column type="expand" width="45">
          <template #default="{ row }">
            <div class="expand-table-wrapper">
              <div class="expand-header">
                <strong>{{ $t('dashboard.table.saleDetails') }}</strong>
                <span class="text-xs text-muted">
                  ({{ row.comisiones.length }} registros en el periodo)
                </span>
              </div>
              <el-table :data="row.comisiones" size="small" border stripe class="nested-table">
                <el-table-column
                  prop="numeroMiscelaneo"
                  :label="$t('dashboard.table.voucherFolio')"
                  width="130"
                >
                  <template #default="{ row: subRow }">
                    <span class="font-mono text-xs">{{ subRow.numeroMiscelaneo || '—' }}</span>
                  </template>
                </el-table-column>
                <el-table-column
                  prop="fechaVenta"
                  :label="$t('dashboard.table.date')"
                  width="110"
                />
                <el-table-column
                  prop="hotelNombre"
                  :label="$t('dashboard.table.hotel')"
                  min-width="140"
                />
                <el-table-column
                  prop="clienteNombre"
                  :label="$t('dashboard.table.client')"
                  min-width="140"
                />
                <el-table-column :label="$t('dashboard.table.role')" width="110" align="center">
                  <template #default="{ row: subRow }">
                    <el-tag
                      size="small"
                      :type="
                        subRow.rolEnVenta === 'FOTOGRAFO'
                          ? 'success'
                          : subRow.rolEnVenta === 'VENDEDOR'
                            ? 'primary'
                            : 'warning'
                      "
                    >
                      {{ subRow.rolEnVenta }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column :label="$t('dashboard.table.rate')" width="80" align="center">
                  <template #default="{ row: subRow }">
                    <span>{{ subRow.porcentajeAplicado }}%</span>
                  </template>
                </el-table-column>
                <el-table-column
                  :label="$t('dashboard.table.grossSales')"
                  width="120"
                  align="right"
                >
                  <template #default="{ row: subRow }">
                    <span>{{ formatCurrency(subRow.totalVentaUsd, 2) }}</span>
                  </template>
                </el-table-column>
                <el-table-column
                  :label="$t('dashboard.table.taxWithholding')"
                  width="115"
                  align="right"
                >
                  <template #default="{ row: subRow }">
                    <span class="text-danger">
                      -{{ formatCurrency(subRow.impuestoMontoUsd, 2) }}
                    </span>
                  </template>
                </el-table-column>
                <el-table-column :label="$t('dashboard.table.netBase')" width="120" align="right">
                  <template #default="{ row: subRow }">
                    <span>{{ formatCurrency(subRow.baseCalculoUsd, 2) }}</span>
                  </template>
                </el-table-column>
                <el-table-column
                  prop="importeComisionUsd"
                  :label="$t('dashboard.table.commissionAmount')"
                  width="130"
                  align="right"
                >
                  <template #default="{ row: subRow }">
                    <strong class="text-success">
                      {{ formatCurrency(subRow.importeComisionUsd, 2) }}
                    </strong>
                  </template>
                </el-table-column>
                <el-table-column :label="$t('dashboard.table.status')" width="110" align="center">
                  <template #default="{ row: subRow }">
                    <el-tag
                      size="small"
                      :type="
                        subRow.estado === 'PAGADA'
                          ? 'success'
                          : subRow.estado === 'APROBADA'
                            ? 'warning'
                            : 'info'
                      "
                    >
                      {{ subRow.estado }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column :label="$t('dashboard.table.action')" width="100" align="center">
                  <template #default="{ row: subRow }">
                    <el-button
                      v-if="subRow.estado === 'PENDIENTE'"
                      type="warning"
                      size="small"
                      link
                      @click="onUpdateCommissionStatus(subRow.id, 'APROBADA')"
                    >
                      {{ $t('dashboard.approve') }}
                    </el-button>
                    <el-button
                      v-else-if="subRow.estado === 'APROBADA'"
                      type="success"
                      size="small"
                      link
                      @click="onUpdateCommissionStatus(subRow.id, 'PAGADA')"
                    >
                      {{ $t('dashboard.pay') }}
                    </el-button>
                    <el-button
                      v-else-if="subRow.estado === 'PAGADA'"
                      type="info"
                      size="small"
                      link
                      @click="onUpdateCommissionStatus(subRow.id, 'PENDIENTE')"
                    >
                      {{ $t('dashboard.undo') }}
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </template>
        </el-table-column>

        <!-- Columna 1: Empleado -->
        <el-table-column
          prop="nombreCompleto"
          :label="$t('dashboard.table.employee')"
          min-width="190"
        >
          <template #default="{ row }">
            <div class="employee-cell">
              <el-avatar
                :size="32"
                shape="circle"
                fit="cover"
                :src="row.imagen || undefined"
                :style="{
                  backgroundColor: getUserBgColor(row.color),
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }"
                class="employee-avatar"
              >
                {{ getUserInitials(row.nombre, row.apellidos) }}
              </el-avatar>
              <div class="employee-info">
                <div class="employee-name-line">
                  <strong class="employee-name">{{ row.nombreCompleto }}</strong>
                  <el-tag
                    v-if="row.cumpleBono"
                    size="small"
                    type="warning"
                    effect="light"
                    class="bono-badge"
                    round
                  >
                    <el-icon class="mr-1"><Award /></el-icon>
                    {{ $t('dashboard.table.bonusAchieved') }}
                  </el-tag>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- Columna 3: Ventas Brutas (Importe USD) -->
        <el-table-column
          prop="totalVentasBrutasUsd"
          :label="$t('dashboard.table.grossSales')"
          width="180"
          align="right"
          sortable
        >
          <template #default="{ row }">
            <span class="font-semibold">{{ formatCurrency(row.totalVentasBrutasUsd, 2) }}</span>
          </template>
        </el-table-column>

        <!-- Columna 4: Retención / Impuesto Estatal deducido -->
        <el-table-column prop="totalImpuestoUsd" width="170" align="right" sortable>
          <template #header>
            <span class="inline-flex items-center gap-1">
              <span>{{ $t('dashboard.table.taxWithholding') }}</span>
              <el-tooltip
                placement="top"
                effect="dark"
                :teleported="true"
                popper-class="vat-info-popper"
              >
                <template #content>
                  <div class="vat-tooltip-content">
                    {{ $t('dashboard.table.vatTooltip') }}
                  </div>
                </template>
                <el-icon class="cursor-pointer text-muted hover:text-primary" :size="14">
                  <InfoFilled />
                </el-icon>
              </el-tooltip>
            </span>
          </template>
          <template #default="{ row }">
            <span class="text-danger font-medium">
              -{{ formatCurrency(row.totalImpuestoUsd, 2) }}
              <span class="text-xs text-muted font-normal ml-1">
                ({{ row.impuestoPctCalculado }}%)
              </span>
            </span>
          </template>
        </el-table-column>

        <!-- Columna 5: Base Neta (Total base) -->
        <el-table-column
          prop="totalBaseNetaUsd"
          width="165"
          align="right"
          sortable
        >
          <template #header>
            <span class="inline-flex items-center gap-1">
              <span>{{ $t('dashboard.table.netBase') }}</span>
              <el-tooltip
                placement="top"
                effect="dark"
                :teleported="true"
                popper-class="vat-info-popper"
              >
                <template #content>
                  <div class="vat-tooltip-content">
                    {{ $t('dashboard.table.netBaseTooltip') }}
                  </div>
                </template>
                <el-icon class="cursor-pointer text-muted hover:text-primary" :size="14">
                  <InfoFilled />
                </el-icon>
              </el-tooltip>
            </span>
          </template>
          <template #default="{ row }">
            <span>{{ formatCurrency(row.totalBaseNetaUsd, 2) }}</span>
          </template>
        </el-table-column>

        <!-- Columna 6: Comisión Fotógrafo -->
        <el-table-column
          prop="comisionFotografoUsd"
          :label="$t('dashboard.table.photographerCommission')"
          width="150"
          align="right"
          sortable
        >
          <template #default="{ row }">
            <span v-if="row.comisionFotografoUsd > 0">
              {{ formatCurrency(row.comisionFotografoUsd, 2) }}
            </span>
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>

        <!-- Columna 7: Comisión Vendedor -->
        <el-table-column
          prop="comisionVendedorUsd"
          :label="$t('dashboard.table.sellerCommission')"
          width="155"
          align="right"
          sortable
        >
          <template #default="{ row }">
            <span v-if="row.comisionVendedorUsd > 0">
              {{ formatCurrency(row.comisionVendedorUsd, 2) }}
            </span>
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>

        <!-- Columna 8: Otras Comisiones (Supervisor / Gerente) -->
        <el-table-column
          prop="comisionOtrasUsd"
          :label="$t('dashboard.table.otherCommission')"
          width="145"
          align="right"
          sortable
        >
          <template #default="{ row }">
            <span v-if="row.comisionOtrasUsd > 0">
              {{ formatCurrency(row.comisionOtrasUsd, 2) }}
            </span>
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>

        <!-- Columna 9: TOTAL COMISIONES (USD) -->
        <el-table-column
          prop="totalComisionesUsd"
          :label="$t('dashboard.table.totalCommissionsUsd')"
          width="195"
          align="right"
          sortable
        >
          <template #default="{ row }">
            <strong class="text-success font-bold text-base">
              {{ formatCurrency(row.totalComisionesUsd, 2) }}
            </strong>
          </template>
        </el-table-column>

        <!-- Columna 10: PESOS A PAGAR (MXN) -->
        <el-table-column
          prop="totalComisionesMxn"
          :label="$t('dashboard.table.totalToPayMxn')"
          width="185"
          align="right"
          sortable
        >
          <template #default="{ row }">
            <strong class="text-primary font-bold">
              {{ formatMxn(row.totalComisionesMxn) }}
            </strong>
          </template>
        </el-table-column>

        <!-- Columna 11: Estado General -->
        <el-table-column
          prop="estadoGeneral"
          :label="$t('dashboard.table.status')"
          width="125"
          align="center"
        >
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="
                row.estadoGeneral === 'PAGADA'
                  ? 'success'
                  : row.estadoGeneral === 'APROBADA'
                    ? 'warning'
                    : row.estadoGeneral === 'PENDIENTE'
                      ? 'info'
                      : 'warning'
              "
            >
              <template v-if="row.estadoGeneral === 'MIXTO'">
                {{ row.pendientesCount > 0 ? `${row.pendientesCount} Pend.` : '' }}
                {{ row.aprobadasCount > 0 ? `${row.aprobadasCount} Aprob.` : '' }}
                {{ row.pagadasCount > 0 ? `${row.pagadasCount} Pag.` : '' }}
              </template>
              <template v-else>
                {{ row.estadoGeneral }}
              </template>
            </el-tag>
          </template>
        </el-table-column>

        <!-- Columna 12: Acciones por Empleado -->
        <el-table-column
          :label="$t('dashboard.table.actions')"
          width="180"
          align="center"
          fixed="right"
        >
          <template #default="{ row }">
            <div class="row-actions-group">
              <!-- Si tiene comisiones pendientes: Aprobar y Pagar -->
              <template v-if="row.pendientesCount > 0">
                <el-button type="warning" size="small" @click="handleUserApprove(row)">
                  {{ $t('dashboard.approve') }}
                </el-button>
                <el-button type="success" size="small" @click="handleUserPay(row)">
                  {{ $t('dashboard.pay') }}
                </el-button>
              </template>

              <!-- Si todas están aprobadas: Pagar y Deshacer -->
              <template v-else-if="row.aprobadasCount > 0">
                <el-button type="success" size="small" @click="handleUserPay(row)">
                  {{ $t('dashboard.pay') }}
                </el-button>
                <el-popconfirm
                  :title="$t('dashboard.restorePendingConfirm')"
                  :confirm-button-text="$t('dashboard.restore')"
                  :cancel-button-text="$t('common.cancel')"
                  confirm-button-type="warning"
                  :width="230"
                  @confirm="handleUserResetToPending(row)"
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

              <!-- Si todas están pagadas: Liquidado y Deshacer -->
              <template v-else-if="row.pagadasCount > 0">
                <span class="text-xs text-muted mr-1">
                  {{ $t('dashboard.settled') }}
                </span>
                <el-popconfirm
                  :title="$t('dashboard.restorePendingConfirm')"
                  :confirm-button-text="$t('dashboard.restore')"
                  :cancel-button-text="$t('common.cancel')"
                  confirm-button-type="warning"
                  :width="230"
                  @confirm="handleUserResetToPending(row)"
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
  gap: 1rem;
  flex-wrap: wrap;
}

.tc-container {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 4px 8px;
  background-color: var(--el-fill-color-light, #f8fafc);
  border: 1px solid var(--toolbar-border, #e2e8f0);
  border-radius: 8px;
}

.tc-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--heading-color, #0f172a);
  white-space: nowrap;
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

.employee-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.employee-avatar {
  flex-shrink: 0;
}

:deep(.employee-avatar img) {
  object-fit: cover !important;
}

.employee-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.employee-name-line {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.employee-name {
  color: var(--heading-color, #0f172a);
  font-size: 0.9rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bono-badge {
  font-size: 0.68rem;
  padding: 0 6px;
  height: 20px;
  line-height: 20px;
  display: inline-flex;
  align-items: center;
}

.row-actions-group {
  display: flex;
  gap: 6px;
  justify-content: center;
  align-items: center;
}

.expand-table-wrapper {
  padding: 1rem 1.25rem;
  background-color: var(--el-fill-color-lighter, #f1f5f9);
  border-radius: 8px;
  margin: 0.5rem 0;
}

.expand-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-size: 0.88rem;
  color: var(--heading-color, #0f172a);
}

.nested-table {
  background-color: #ffffff;
  border-radius: 6px;
  overflow: hidden;
}

:deep(.el-table th.el-table__cell .cell) {
  white-space: nowrap !important;
  word-break: keep-all !important;
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

<style>
.el-popper.vat-info-popper {
  white-space: nowrap !important;
  width: max-content !important;
  min-width: 175px !important;
  max-width: none !important;
}

.el-popper.vat-info-popper .vat-tooltip-content {
  white-space: nowrap !important;
  font-size: 12px !important;
  text-align: center !important;
  padding: 2px 4px !important;
}
</style>
