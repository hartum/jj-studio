<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSaleStore } from '@/features/sales/stores/sale.store'
import { useUserStore } from '@/features/users/stores/user.store'
import { formatCurrency } from '@/shared/formatters'
import { getUserInitials, getUserBgColor } from '@/features/users/utils/user-avatar'
import { parseNumericTags } from '@/features/sales/composables/miscelaneo-tag.helper'
import { Search, Operation } from '@element-plus/icons-vue'
import { FileSpreadsheet } from '@lucide/vue'
import type { CitaVenta, PagoCitaVenta } from '@/features/sales/domain/sale.model'
import ExcelJS from 'exceljs'
import { ElMessage, type TableInstance } from 'element-plus'

export interface ContableHotelSummary {
  id: number
  nombre: string
  areaNombre: string
  paisNombre: string
}

export interface SalesTableState {
  columns: string[]
  searchQuery: string
  sort: {
    prop: string
    order: 'ascending' | 'descending' | null
  }
}

const props = defineProps<{
  selectedHotelFilters: number[]
  contableHotels: ContableHotelSummary[]
  commissionDateRange: [string, string]
}>()

const router = useRouter()
const saleStore = useSaleStore()
const userStore = useUserStore()

const isExporting = ref(false)

// Configuración de columnas
const TABLE_STATE_STORAGE_KEY = 'jj_studio_sales_table_state'
const LEGACY_COLUMNS_KEY = 'jj_studio_sales_table_columns_v2'

const allColumnKeys = [
  'fecha',
  'cliente',
  'miscelaneo',
  'agendador',
  'fotografo',
  'vendedor',
  'fotos',
  'pagos',
  'total',
]

// Cliente y Vendedor están ocultas por defecto
const defaultVisibleColumns = [
  'fecha',
  'miscelaneo',
  'agendador',
  'fotografo',
  'fotos',
  'pagos',
  'total',
]

interface ColumnConfig {
  key: string
  label: string
}

const columnDefinitions: ColumnConfig[] = [
  { key: 'fecha', label: 'Fecha venta' },
  { key: 'cliente', label: 'Cliente' },
  { key: 'miscelaneo', label: 'Nº Miscelanea' },
  { key: 'agendador', label: 'Agendador' },
  { key: 'fotografo', label: 'Fotógrafo' },
  { key: 'vendedor', label: 'Vendedor' },
  { key: 'fotos', label: 'Total fotos' },
  { key: 'pagos', label: 'Formas de pago' },
  { key: 'total', label: 'Total de la venta' },
]

function loadSavedState(): SalesTableState {
  let columns = [...defaultVisibleColumns]
  let searchQuery = ''
  let sort: SalesTableState['sort'] = { prop: '', order: null }

  try {
    const raw = localStorage.getItem(TABLE_STATE_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.columns)) {
        const valid = parsed.columns.filter((k: string) => allColumnKeys.includes(k))
        if (valid.length > 0) columns = valid
      }
      if (typeof parsed.searchQuery === 'string') {
        searchQuery = parsed.searchQuery
      }
      if (parsed.sort && typeof parsed.sort === 'object') {
        sort = {
          prop: parsed.sort.prop || '',
          order: parsed.sort.order || null,
        }
      }
      return { columns, searchQuery, sort }
    }

    // Fallback de clave legacy de columnas
    const legacyColumnsRaw = localStorage.getItem(LEGACY_COLUMNS_KEY)
    if (legacyColumnsRaw) {
      const parsed = JSON.parse(legacyColumnsRaw)
      if (Array.isArray(parsed)) {
        const valid = parsed.filter((k: string) => allColumnKeys.includes(k))
        if (valid.length > 0) columns = valid
      }
    }
  } catch {
    // fallback
  }

  return { columns, searchQuery, sort }
}

const savedState = loadSavedState()

const tableRef = ref<TableInstance>()
const searchQuery = ref(savedState.searchQuery)
const selectedColumns = ref<string[]>(savedState.columns)
const tableSort = ref<SalesTableState['sort']>(savedState.sort)

function saveTableState() {
  try {
    const state: SalesTableState = {
      columns: selectedColumns.value,
      searchQuery: searchQuery.value,
      sort: tableSort.value,
    }
    localStorage.setItem(TABLE_STATE_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

watch(searchQuery, () => {
  saveTableState()
})

function handleColumnsChange(newVal: string[]) {
  if (newVal.length === 0) {
    ElMessage.warning('Debe haber al menos una columna visible')
    return
  }
  selectedColumns.value = newVal
  saveTableState()
}

function handleSortChange({
  prop,
  order,
}: {
  prop: string
  order: 'ascending' | 'descending' | null
}) {
  tableSort.value = {
    prop: prop || '',
    order: order || null,
  }
  saveTableState()
}

function isColumnVisible(key: string): boolean {
  return selectedColumns.value.includes(key)
}

onMounted(() => {
  if (tableSort.value.prop && tableSort.value.order && tableRef.value) {
    tableRef.value.sort(tableSort.value.prop, tableSort.value.order)
  }
})

// Lista de ventas completadas filtradas por hoteles y fechas
const filteredSales = computed<CitaVenta[]>(() => {
  const list = saleStore.citasVenta || []
  const hotelFilterSet =
    props.selectedHotelFilters && props.selectedHotelFilters.length > 0
      ? new Set(props.selectedHotelFilters)
      : null

  const [startDate, endDate] = props.commissionDateRange || ['', '']

  return list.filter((sale) => {
    // 1. Solo ventas completadas o con importe de venta
    if (sale.estado !== 'COMPLETADA' && (!sale.totalVentaUsd || sale.totalVentaUsd <= 0)) {
      return false
    }

    // 2. Filtro de hotel
    if (hotelFilterSet && !hotelFilterSet.has(sale.hotelId)) {
      return false
    }

    // 3. Filtro de rango de fechas
    if (startDate || endDate) {
      const saleDate = (sale.fechaHoraCita || '').slice(0, 10)
      if (startDate && saleDate < startDate) return false
      if (endDate && saleDate > endDate) return false
    }

    // 4. Búsqueda por texto libre
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim()
      const miscStr = Array.isArray(sale.numeroMiscelaneo)
        ? sale.numeroMiscelaneo.join(' ')
        : sale.numeroMiscelaneo || ''
      const matchMisc = miscStr.toLowerCase().includes(q)
      const matchClient = (sale.clienteNombre || '').toLowerCase().includes(q)
      const matchHotel = (sale.hotelNombre || '').toLowerCase().includes(q)
      const matchSeller = (sale.vendedorNombre || '').toLowerCase().includes(q)
      const matchPhotographer = (sale.fotografoNombre || '').toLowerCase().includes(q)
      const matchBooker = (sale.agendadorNombre || '').toLowerCase().includes(q)

      if (
        !matchMisc &&
        !matchClient &&
        !matchHotel &&
        !matchSeller &&
        !matchPhotographer &&
        !matchBooker
      ) {
        return false
      }
    }

    return true
  })
})

// Helpers para usuarios (nombre, avatar, color)
function resolveUserInfo(
  userId?: string | null,
  fallbackName?: string | null,
  fallbackImage?: string | null,
  fallbackColor?: string | null,
) {
  if (!userId && !fallbackName) return null
  const storeUser = userId ? userStore.users.find((u) => u.id === userId) : null
  const nombre = storeUser?.nombre || fallbackName?.split(' ')[0] || ''
  const apellidos =
    storeUser?.apellidos || (fallbackName ? fallbackName.split(' ').slice(1).join(' ') : '')
  const nombreCompleto =
    (storeUser ? `${storeUser.nombre} ${storeUser.apellidos}`.trim() : fallbackName) || '—'
  const imagen = storeUser?.imagen || fallbackImage || undefined
  const color = storeUser?.color || fallbackColor || null

  return {
    id: userId,
    nombre,
    apellidos,
    nombreCompleto,
    imagen,
    color,
  }
}

function getAgendador(sale: CitaVenta) {
  return resolveUserInfo(
    sale.agendadorId,
    sale.agendadorNombre,
    sale.agendadorImagen,
    sale.agendadorColor,
  )
}

function getFotografo(sale: CitaVenta) {
  return resolveUserInfo(
    sale.fotografoId,
    sale.fotografoNombre,
    sale.fotografoImagen,
    sale.fotografoColor,
  )
}

function getVendedor(sale: CitaVenta) {
  return resolveUserInfo(
    sale.vendedorId,
    sale.vendedorNombre,
    sale.vendedorImagen,
    sale.vendedorColor,
  )
}

// Helper para parsear misceláneos
function getMiscTags(sale: CitaVenta): string[] {
  return parseNumericTags(sale.numeroMiscelaneo)
}

// Helper para fecha legible
function formatFecha(dateStr?: string | null): string {
  if (!dateStr) return '—'
  return dateStr.slice(0, 10)
}

function getHora(dateStr?: string | null): string {
  if (!dateStr || !dateStr.includes('T')) return ''
  return dateStr.slice(11, 16)
}

// Helper para métodos de pago
interface PagoDisplayItem {
  metodo: string
  importe: number
}

function getPagosList(sale: CitaVenta): PagoDisplayItem[] {
  if (sale.pagos && sale.pagos.length > 0) {
    return sale.pagos.map((p: PagoCitaVenta) => ({
      metodo: capitalizeMetodo(p.metodoPago),
      importe: p.importeUsd || 0,
    }))
  }
  if (sale.modoCobro) {
    return [
      {
        metodo: capitalizeMetodo(sale.modoCobro),
        importe: sale.totalVentaUsd || 0,
      },
    ]
  }
  return []
}

function capitalizeMetodo(val?: string | null): string {
  if (!val) return 'Sin especificar'
  const trimmed = val.trim()
  if (trimmed.toLowerCase() === 'cargo habitacion') return 'Cargo habitación'
  if (trimmed.toLowerCase() === 'paypal') return 'Paypal'
  if (trimmed.toLowerCase() === 'tarjeta') return 'Tarjeta'
  if (trimmed.toLowerCase() === 'efectivo') return 'Efectivo'
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

// Navegar a editar venta
function goToEditSale(saleId: number) {
  if (saleId) {
    router.push(`/ventas/${saleId}/editar`)
  }
}

// Totales de la tabla (summary-method)
interface TableColumnSummaryCtx {
  property: string
  label: string
  type?: string
}

interface SummaryMethodProps {
  columns: TableColumnSummaryCtx[]
  data: CitaVenta[]
}

function getTableSummaries(param: SummaryMethodProps): string[] {
  const { columns, data } = param
  const sums: string[] = []

  const totalVentas = data.reduce((sum, item) => sum + (item.totalVentaUsd || 0), 0)
  const totalFotos = data.reduce((sum, item) => sum + (item.numFotosVendidas || 0), 0)

  let placedCount = false

  columns.forEach((column, index) => {
    if (column.property === 'fechaHoraCita') {
      sums[index] = `${data.length} ${data.length === 1 ? 'venta' : 'ventas'}`
      placedCount = true
      return
    }
    if (column.property === 'numFotosVendidas') {
      sums[index] = `${totalFotos}`
      return
    }
    if (column.property === 'totalVentaUsd') {
      sums[index] = formatCurrency(totalVentas)
      return
    }
    sums[index] = ''
  })

  if (!placedCount && columns.length > 1) {
    sums[1] = `${data.length} ${data.length === 1 ? 'venta' : 'ventas'}`
  }

  return sums
}

// Exportar a Excel
async function handleExportExcel() {
  if (filteredSales.value.length === 0) {
    ElMessage.warning('No hay datos de ventas para exportar')
    return
  }
  isExporting.value = true
  try {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'JJ Studio'
    workbook.created = new Date()

    const worksheet = workbook.addWorksheet('Ventas')

    worksheet.columns = [
      { header: 'Fecha venta', key: 'fecha', width: 14 },
      { header: 'Cliente', key: 'cliente', width: 22 },
      { header: 'Hotel', key: 'hotel', width: 22 },
      { header: 'Nº Miscelanea', key: 'miscelaneos', width: 24 },
      { header: 'Agendador', key: 'agendador', width: 22 },
      { header: 'Fotógrafo', key: 'fotografo', width: 22 },
      { header: 'Vendedor', key: 'vendedor', width: 22 },
      { header: 'Total fotos', key: 'fotos', width: 14 },
      { header: 'Formas de Pago', key: 'pagos', width: 30 },
      { header: 'Total Venta (USD)', key: 'total', width: 18 },
    ]

    // Estilo de cabecera
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    }
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' }

    filteredSales.value.forEach((s) => {
      const agendador = getAgendador(s)
      const fotografo = getFotografo(s)
      const vendedor = getVendedor(s)
      const miscTags = getMiscTags(s)
      const pagos = getPagosList(s)
      const pagosStr = pagos.map((p) => `${p.metodo}: $${p.importe.toFixed(2)}`).join('\n')

      const row = worksheet.addRow({
        fecha: formatFecha(s.fechaHoraCita),
        cliente: s.clienteNombre || '—',
        hotel: s.hotelNombre || '',
        miscelaneos: miscTags.length > 0 ? miscTags.join(', ') : '—',
        agendador: agendador ? agendador.nombreCompleto : '—',
        fotografo: fotografo ? fotografo.nombreCompleto : '—',
        vendedor: vendedor ? vendedor.nombreCompleto : '—',
        fotos: s.numFotosVendidas ?? 0,
        pagos: pagosStr || '—',
        total: s.totalVentaUsd || 0,
      })

      row.alignment = { vertical: 'middle', wrapText: true }
      row.getCell('fotos').alignment = { vertical: 'middle', horizontal: 'right' }
      row.getCell('total').alignment = { vertical: 'middle', horizontal: 'right' }
      row.getCell('total').numFmt = '"$"#,##0.00'
    })

    // Fila de totales
    const totalFotos = filteredSales.value.reduce((acc, s) => acc + (s.numFotosVendidas || 0), 0)
    const totalVentas = filteredSales.value.reduce((acc, s) => acc + (s.totalVentaUsd || 0), 0)
    const summaryRow = worksheet.addRow({
      fecha: 'TOTAL',
      cliente: '',
      hotel: '',
      miscelaneos: '',
      agendador: '',
      fotografo: '',
      vendedor: '',
      fotos: totalFotos,
      pagos: '',
      total: totalVentas,
    })
    summaryRow.font = { bold: true }
    summaryRow.getCell('total').numFmt = '"$"#,##0.00'
    summaryRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' },
    }

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const rangeTag =
      props.commissionDateRange && props.commissionDateRange[0]
        ? `_${props.commissionDateRange[0]}_${props.commissionDateRange[1]}`
        : ''
    a.download = `JJ_Studio_Listado_Ventas${rangeTag}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    ElMessage.success('Listado de ventas exportado exitosamente')
  } catch (error) {
    console.error('Error al exportar ventas a Excel:', error)
    ElMessage.error('Error al exportar el archivo Excel')
  } finally {
    isExporting.value = false
  }
}
</script>

<template>
  <div class="tab-content-fade">
    <el-card class="dashboard-card mb-4" shadow="hover">
      <template #header>
        <div class="ventas-card-header">
          <div class="ventas-header-left">
            <span class="card-header-title">
              {{ $t('dashboard.salesListTitle') || 'Listado de Ventas' }}
            </span>
            <el-tag type="info" effect="plain" round class="count-tag">
              {{ filteredSales.length }} {{ filteredSales.length === 1 ? 'registro' : 'registros' }}
            </el-tag>
          </div>

          <div class="ventas-header-right">
            <el-input
              v-model="searchQuery"
              placeholder="Buscar por misceláneo, cliente, usuario..."
              :prefix-icon="Search"
              clearable
              size="default"
              class="search-input"
            />

            <!-- Selector de columnas visibles similar a UsuariosView -->
            <el-select
              :model-value="selectedColumns"
              multiple
              :placeholder="$t('users.table.columns') || 'Columnas'"
              class="columns-select"
              popper-class="columns-select-popper"
              size="default"
              @update:model-value="handleColumnsChange"
            >
              <template #prefix>
                <el-icon class="column-select-icon"><Operation /></el-icon>
              </template>
              <template #tag>
                <span class="column-select-trigger-text">
                  {{ $t('users.table.columns') || 'Columnas' }} ({{ selectedColumns.length }}/{{
                    columnDefinitions.length
                  }})
                </span>
              </template>
              <el-option
                v-for="col in columnDefinitions"
                :key="col.key"
                :label="col.label"
                :value="col.key"
              >
                <div class="column-option-row">
                  <span class="column-option-label">{{ col.label }}</span>
                  <el-switch
                    :model-value="isColumnVisible(col.key)"
                    size="small"
                    class="column-option-switch"
                  />
                </div>
              </el-option>
            </el-select>

            <el-button
              type="success"
              plain
              size="default"
              :icon="FileSpreadsheet"
              :loading="isExporting"
              @click="handleExportExcel"
            >
              Exportar Excel
            </el-button>
          </div>
        </div>
      </template>

      <!-- Tabla de Ventas -->
      <el-table
        ref="tableRef"
        :data="filteredSales"
        row-key="id"
        border
        stripe
        show-summary
        :summary-method="getTableSummaries"
        :default-sort="tableSort.prop && tableSort.order ? { prop: tableSort.prop, order: tableSort.order } : undefined"
        max-height="max(500px, calc(100vh - 360px))"
        style="width: 100%; min-height: 480px"
        class="ventas-table"
        @sort-change="handleSortChange"
      >
        <template #empty>
          <div class="empty-hint p-4 text-center">
            {{
              $t('dashboard.noSalesRecords') ||
              'No hay ventas registradas para los filtros seleccionados.'
            }}
          </div>
        </template>

        <!-- 0. Acción: ver/consultar venta -->
        <el-table-column label="" width="48" align="center" fixed="left">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              size="small"
              :icon="Search"
              title="Ver detalle de la venta"
              @click.stop="goToEditSale(row.id)"
            />
          </template>
        </el-table-column>

        <!-- 1. Fecha venta -->
        <el-table-column
          v-if="isColumnVisible('fecha')"
          prop="fechaHoraCita"
          label="Fecha venta"
          min-width="135"
          sortable
          fixed="left"
        >
          <template #default="{ row }">
            <div class="fecha-cell">
              <span class="fecha-text">{{ formatFecha(row.fechaHoraCita) }}</span>
              <span v-if="getHora(row.fechaHoraCita)" class="hora-text">
                {{ getHora(row.fechaHoraCita) }}
              </span>
            </div>
          </template>
        </el-table-column>

        <!-- 2. Cliente -->
        <el-table-column
          v-if="isColumnVisible('cliente')"
          prop="clienteNombre"
          label="Cliente"
          min-width="160"
          sortable
        >
          <template #default="{ row }">
            <span class="cliente-nombre" :title="row.clienteNombre">
              {{ row.clienteNombre || '—' }}
            </span>
          </template>
        </el-table-column>

        <!-- 3. Nº Miscelanea -->
        <el-table-column
          v-if="isColumnVisible('miscelaneo')"
          prop="numeroMiscelaneo"
          label="Nº Miscelanea"
          min-width="150"
        >
          <template #default="{ row }">
            <div v-if="getMiscTags(row).length > 0" class="misc-tags-list">
              <el-tag
                v-for="num in getMiscTags(row)"
                :key="num"
                size="small"
                type="info"
                effect="plain"
                round
                class="misc-tag-pill"
              >
                {{ num }}
              </el-tag>
            </div>
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>

        <!-- 4. Avatar y nombre del agendador (si existe) -->
        <el-table-column v-if="isColumnVisible('agendador')" label="Agendador" min-width="180">
          <template #default="{ row }">
            <div v-if="getAgendador(row)" class="user-cell">
              <el-avatar
                :size="30"
                shape="circle"
                fit="cover"
                :src="getAgendador(row)?.imagen"
                :style="{
                  backgroundColor: getUserBgColor(getAgendador(row)?.color),
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 'bold',
                }"
                class="user-avatar"
              >
                {{ getUserInitials(getAgendador(row)?.nombre, getAgendador(row)?.apellidos) }}
              </el-avatar>
              <div class="user-meta">
                <span class="user-name" :title="getAgendador(row)?.nombreCompleto">
                  {{ getAgendador(row)?.nombreCompleto }}
                </span>
              </div>
            </div>
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>

        <!-- 5. Avatar y nombre del fotógrafo (si existe) -->
        <el-table-column v-if="isColumnVisible('fotografo')" label="Fotógrafo" min-width="180">
          <template #default="{ row }">
            <div v-if="getFotografo(row)" class="user-cell">
              <el-avatar
                :size="30"
                shape="circle"
                fit="cover"
                :src="getFotografo(row)?.imagen"
                :style="{
                  backgroundColor: getUserBgColor(getFotografo(row)?.color),
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 'bold',
                }"
                class="user-avatar"
              >
                {{ getUserInitials(getFotografo(row)?.nombre, getFotografo(row)?.apellidos) }}
              </el-avatar>
              <div class="user-meta">
                <span class="user-name" :title="getFotografo(row)?.nombreCompleto">
                  {{ getFotografo(row)?.nombreCompleto }}
                </span>
              </div>
            </div>
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>

        <!-- 6. Avatar y nombre del vendedor (si existe) -->
        <el-table-column v-if="isColumnVisible('vendedor')" label="Vendedor" min-width="180">
          <template #default="{ row }">
            <div v-if="getVendedor(row)" class="user-cell">
              <el-avatar
                :size="30"
                shape="circle"
                fit="cover"
                :src="getVendedor(row)?.imagen"
                :style="{
                  backgroundColor: getUserBgColor(getVendedor(row)?.color),
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 'bold',
                }"
                class="user-avatar"
              >
                {{ getUserInitials(getVendedor(row)?.nombre, getVendedor(row)?.apellidos) }}
              </el-avatar>
              <div class="user-meta">
                <span class="user-name" :title="getVendedor(row)?.nombreCompleto">
                  {{ getVendedor(row)?.nombreCompleto }}
                </span>
              </div>
            </div>
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>

        <!-- 7. Total fotos -->
        <el-table-column
          v-if="isColumnVisible('fotos')"
          prop="numFotosVendidas"
          label="Total fotos"
          min-width="120"
          align="right"
          sortable
        >
          <template #default="{ row }">
            <span class="fotos-count font-semibold">
              {{ row.numFotosVendidas ?? 0 }}
            </span>
          </template>
        </el-table-column>

        <!-- 8. Formas de pago y sus cantidades, una debajo de otra -->
        <el-table-column v-if="isColumnVisible('pagos')" label="Formas de pago" min-width="210">
          <template #default="{ row }">
            <div v-if="getPagosList(row).length > 0" class="pagos-container">
              <div v-for="(pago, pIdx) in getPagosList(row)" :key="pIdx" class="pago-item">
                <span class="pago-metodo">{{ pago.metodo }}:</span>
                <span class="pago-importe">{{ formatCurrency(pago.importe) }}</span>
              </div>
            </div>
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>

        <!-- 9. Total de la venta -->
        <el-table-column
          v-if="isColumnVisible('total')"
          prop="totalVentaUsd"
          label="Total de la venta"
          min-width="150"
          align="right"
          sortable
        >
          <template #default="{ row }">
            <span class="total-venta-amount">
              {{ formatCurrency(row.totalVentaUsd || 0) }}
            </span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.tab-content-fade {
  animation: fadeIn 0.2s ease-in-out;
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

.dashboard-card {
  border-radius: 12px;
  border: 1px solid var(--el-border-color-lighter, #e2e8f0);
}

.ventas-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.ventas-header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.card-header-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
}

.count-tag {
  font-size: 12px;
  font-weight: 500;
}

.ventas-header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.search-input {
  width: 280px;
}

.columns-select {
  width: 175px;
}

.column-select-icon {
  font-size: 0.95rem;
  color: var(--nav-link-color, #64748b);
}

.column-select-trigger-text {
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--heading-color, #0f172a);
  white-space: nowrap;
  user-select: none;
}

.column-option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-right: 2px;
}

.column-option-label {
  font-size: 0.85rem;
  color: var(--heading-color, #0f172a);
}

.column-option-switch {
  pointer-events: none;
}

:global(.columns-select-popper) {
  min-width: 220px !important;
}

:global(.columns-select-popper .el-select-dropdown__item) {
  padding: 0 14px !important;
  height: 38px !important;
  line-height: 38px !important;
}

:global(.columns-select-popper .el-select-dropdown__item::after) {
  display: none !important;
}

:global(.columns-select-popper .el-select-dropdown__item.is-selected) {
  background-color: rgba(64, 158, 255, 0.08) !important;
  color: inherit !important;
}

/* Celdas de la tabla */
.fecha-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.fecha-text {
  font-weight: 600;
  color: var(--el-text-color-primary, #0f172a);
}

.hora-text {
  font-size: 11px;
  color: var(--el-text-color-secondary, #64748b);
}

.cliente-nombre {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary, #0f172a);
}

.misc-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.misc-tag-pill {
  font-size: 11.5px;
  font-weight: 500;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar {
  flex-shrink: 0;
}

.user-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.user-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary, #0f172a);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fotos-count {
  font-size: 13.5px;
  color: var(--el-text-color-primary, #0f172a);
}

.pagos-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pago-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12.5px;
  line-height: 1.4;
}

.pago-metodo {
  color: var(--el-text-color-regular, #475569);
  font-weight: 500;
}

.pago-importe {
  color: var(--el-text-color-primary, #0f172a);
  font-weight: 600;
  white-space: nowrap;
}

.total-venta-amount {
  font-size: 14px;
  font-weight: 700;
  color: var(--el-color-primary, #3b82f6);
}

.text-muted {
  color: var(--el-text-color-secondary, #94a3b8);
}

.empty-hint {
  color: var(--el-text-color-secondary, #64748b);
  font-size: 14px;
}

:deep(.ventas-table .el-table__footer-wrapper tbody td) {
  font-weight: 700;
  background-color: var(--el-fill-color-light, #f8fafc);
}
</style>
