<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessageBox, ElMessage, type TableInstance } from 'element-plus'
import { useUserStore } from '@/features/users/stores/user.store'
import { useCommissionStore } from '@/features/commissions/stores/commission.store'
import { useGoalStore } from '@/features/goals/stores/goal.store'
import { formatCurrency, formatMxn } from '@/shared/formatters'
import { getUserInitials, getUserBgColor } from '@/features/users/utils/user-avatar'
import { Money, Wallet, Tickets, InfoFilled, Edit } from '@element-plus/icons-vue'
import { RotateCcw, Award } from '@lucide/vue'
import type { Comision } from '@/features/commissions/domain/commission.model'
import type { Meta } from '@/features/goals/domain/goal.model'

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

export interface BonusDetalle {
  tipo: 'INDIVIDUAL' | 'GRUPAL'
  hotelNombre: string
  metaObjetivo: number
  ventasAlcanzadas: number
  montoBonus: number
  descripcion: string
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
  // Meta individual / Bono
  cumpleBono: boolean
  bonoIndividualUsd: number
  bonoGrupalUsd: number
  totalBonusUsd: number
  bonusDetalles: BonusDetalle[]
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
const router = useRouter()
const userStore = useUserStore()
const commissionStore = useCommissionStore()
const goalStore = useGoalStore()

// Asegurar carga de metas cuando cambia el rango de fechas
watch(
  () => props.commissionDateRange,
  async (range) => {
    if (range && range[0]) {
      const parts = range[0].split('-').map(Number)
      const anio = parts[0] || new Date().getFullYear()
      const mes = parts[1] || new Date().getMonth() + 1
      const hotelIdsParam =
        props.selectedHotelFilters.length > 0 ? props.selectedHotelFilters : undefined
      await Promise.all([
        goalStore.fetchMetas({ anio, mes }).catch(() => {}),
        goalStore.fetchProgreso({ hotelIds: hotelIdsParam, anio, mes }).catch(() => {}),
      ])
    }
  },
  { immediate: true },
)

function goToEditSale(citaVentaId: number) {
  if (citaVentaId) {
    router.push(`/ventas/${citaVentaId}/editar`)
  }
}

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
const LOCAL_STORAGE_KEY_USER_FILTER = 'jj_studio_contable_user_filter'
const comisionUsuarioFilter = ref<string | null>(
  localStorage.getItem(LOCAL_STORAGE_KEY_USER_FILTER) || null,
)

watch(comisionUsuarioFilter, (newVal) => {
  if (newVal) {
    localStorage.setItem(LOCAL_STORAGE_KEY_USER_FILTER, newVal)
  } else {
    localStorage.removeItem(LOCAL_STORAGE_KEY_USER_FILTER)
  }
})

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

// --- Orden de la tabla (preservado en LocalStorage) ---
interface TableSortState {
  prop: string
  order: 'ascending' | 'descending' | null
}

const LOCAL_STORAGE_KEY_SORT = 'jj_studio_contable_table_sort'
function getInitialSort(): TableSortState {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY_SORT)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed && typeof parsed.prop === 'string') {
        return parsed
      }
    }
  } catch {}
  return { prop: 'totalComisionesUsd', order: 'descending' }
}

const currentSort = ref<TableSortState>(getInitialSort())

function handleSortChange({
  prop,
  order,
}: {
  prop: string
  order: 'ascending' | 'descending' | null
}) {
  currentSort.value = { prop: prop || '', order }
  if (order) {
    localStorage.setItem(LOCAL_STORAGE_KEY_SORT, JSON.stringify({ prop, order }))
  } else {
    localStorage.removeItem(LOCAL_STORAGE_KEY_SORT)
  }
}

// --- Helpers puros para cálculo y optimización de rendimiento ---
function extractSaleMetrics(c: Comision) {
  const ventaBruta =
    c.totalVentaUsd && c.totalVentaUsd > 0
      ? c.totalVentaUsd
      : c.baseCalculoUsd > 0
        ? Number((c.baseCalculoUsd / 0.84).toFixed(2))
        : 0

  const impuesto =
    c.impuestoMontoUsd !== undefined
      ? c.impuestoMontoUsd
      : Number(Math.max(0, ventaBruta - (c.baseCalculoUsd || 0)).toFixed(2))

  return {
    ventaBruta,
    impuesto,
    baseCalculoUsd: c.baseCalculoUsd || 0,
  }
}

interface BonusCalculationContext {
  userProfileMap: Map<string, (typeof userStore.usersWithProfile)[0]>
  userMetasMap: Map<string, Meta[]>
  hotelMetasConBono: Meta[]
  ventasUnicasPorHotel: Map<number, number>
  totalVentasPeriodo: number
  teamCountPorHotel: Map<number, number>
}

function calcularBonosEmpleado(
  item: EmpleadoComisionResumen,
  ctx: BonusCalculationContext,
) {
  item.bonoIndividualUsd = 0
  item.bonoGrupalUsd = 0
  item.totalBonusUsd = 0
  item.bonusDetalles = []

  // 1. Bono Individual (Meta personal del colaborador para este año y mes)
  const userMetas = ctx.userMetasMap.get(item.usuarioId) || []
  for (const meta of userMetas) {
    const umbralBonus = Number(meta.importeBonus) || 0
    const montoPremio = Number(meta.valorBonus) || 0
    if (item.totalVentasBrutasUsd >= umbralBonus && umbralBonus > 0 && montoPremio > 0) {
      item.bonoIndividualUsd += montoPremio
      const hotelNom =
        meta.hotelNombre ||
        props.contableHotels.find((h) => h.id === meta.hotelId)?.nombre ||
        `Hotel #${meta.hotelId}`
      item.bonusDetalles.push({
        tipo: 'INDIVIDUAL',
        hotelNombre: hotelNom,
        metaObjetivo: umbralBonus,
        ventasAlcanzadas: item.totalVentasBrutasUsd,
        montoBonus: montoPremio,
        descripcion: `${t('dashboard.table.individualBonus')} (${hotelNom}): Ventas de ${formatCurrency(item.totalVentasBrutasUsd, 2)} superan meta de ${formatCurrency(umbralBonus, 2)}`,
      })
    }
  }

  // 2. Bono Grupal (Meta colectiva del hotel para este año y mes)
  // Se reparte exclusivamente entre fotógrafos, agendadores/vendedores y supervisores.
  // Gerentes, administradores, superusuarios y contables NO participan en el bono grupal.
  const ROLES_ELEGIBLES_BONO_GRUPAL = ['FOTOGRAFO', 'AGENDADOR', 'VENDEDOR', 'SUPERVISOR']
  const ROLES_EXCLUIDOS_BONO_GRUPAL = [
    'GERENTE',
    'ADMIN',
    'ADMINISTRADOR',
    'SUPERUSUARIO',
    'SUPERUSER',
    'CONTABLE',
  ]

  const uProfile = ctx.userProfileMap.get(item.usuarioId)
  const userRoleCode = (uProfile?.perfil?.code || '').toUpperCase()
  const userRoleName = (uProfile?.perfil?.name || '').toUpperCase()

  const tieneRolExcluido =
    ROLES_EXCLUIDOS_BONO_GRUPAL.includes(userRoleCode) ||
    ROLES_EXCLUIDOS_BONO_GRUPAL.includes(userRoleName) ||
    (item.roles.length > 0 &&
      item.roles.every((r) => ROLES_EXCLUIDOS_BONO_GRUPAL.includes(r.toUpperCase())))

  const esElegibleBonoGrupal =
    !tieneRolExcluido &&
    (ROLES_ELEGIBLES_BONO_GRUPAL.includes(userRoleCode) ||
      ROLES_ELEGIBLES_BONO_GRUPAL.includes(userRoleName) ||
      item.roles.some((r) => ROLES_ELEGIBLES_BONO_GRUPAL.includes(r.toUpperCase())))

  if (esElegibleBonoGrupal) {
    const userHotelSet = new Set(uProfile?.hotelIds || [])

    for (const metaHotel of ctx.hotelMetasConBono) {
      const userAssignedHotel = userHotelSet.has(metaHotel.hotelId)
      const userHasSalesInHotel = item.comisiones.some((c) => c.hotelId === metaHotel.hotelId)

      if (userAssignedHotel || userHasSalesInHotel) {
        const metaImporte = Number(metaHotel.importeObjetivo) || 0
        const valorBonoTotal = Number(metaHotel.valorBonus) || 0
        const ventasHotel = ctx.ventasUnicasPorHotel.get(metaHotel.hotelId) || 0
        const hotelProg = goalStore.progresoHoteles.find((p) => p.hotelId === metaHotel.hotelId)

        const alcanzoBono =
          (metaImporte > 0 && ventasHotel >= metaImporte) ||
          Boolean(hotelProg?.alcanzoBonoGrupal) ||
          (props.selectedHotelFilters.length === 0 &&
            metaImporte > 0 &&
            ctx.totalVentasPeriodo >= metaImporte)

        if (alcanzoBono && valorBonoTotal > 0) {
          const teamCount = ctx.teamCountPorHotel.get(metaHotel.hotelId) || 2
          const share = Number((valorBonoTotal / teamCount).toFixed(2))
          item.bonoGrupalUsd += share
          const hotelNom =
            metaHotel.hotelNombre ||
            props.contableHotels.find((h) => h.id === metaHotel.hotelId)?.nombre ||
            `Hotel #${metaHotel.hotelId}`
          item.bonusDetalles.push({
            tipo: 'GRUPAL',
            hotelNombre: hotelNom,
            metaObjetivo: metaImporte,
            ventasAlcanzadas: Math.max(ventasHotel, ctx.totalVentasPeriodo),
            montoBonus: share,
            descripcion: `${t('dashboard.table.groupBonus')} (${hotelNom}): Meta de ${formatCurrency(metaImporte, 2)} alcanzada (${formatCurrency(valorBonoTotal, 2)} ÷ ${teamCount} colaboradores)`,
          })
        }
      }
    }
  }

  // Reflejar bonus en "Otras Comisiones" y Total Comisiones
  item.totalBonusUsd = Number((item.bonoIndividualUsd + item.bonoGrupalUsd).toFixed(2))
  item.comisionOtrasUsd = Number((item.comisionOtrasUsd + item.totalBonusUsd).toFixed(2))
  item.totalComisionesUsd = Number(
    (item.comisionFotografoUsd + item.comisionVendedorUsd + item.comisionOtrasUsd).toFixed(2),
  )
  item.cumpleBono = item.totalBonusUsd > 0
}

// --- Agrupación de comisiones por Usuario (Estilo Excel COMISIONES1) ---
const resumenUsuariosComision = computed<EmpleadoComisionResumen[]>(() => {
  let list = commissionStore.comisiones
  if (comisionUsuarioFilter.value) {
    list = list.filter((c) => c.usuarioId === comisionUsuarioFilter.value)
  }

  // Pre-indexar perfiles de usuario en O(1)
  const userProfileMap = new Map<string, (typeof userStore.usersWithProfile)[0]>()
  for (const u of userStore.usersWithProfile) {
    userProfileMap.set(u.id, u)
  }

  // 1. Agrupar registros de comisiones por usuario
  const userMap = new Map<string, EmpleadoComisionResumen>()

  for (const c of list) {
    let item = userMap.get(c.usuarioId)
    if (!item) {
      const uProfile = userProfileMap.get(c.usuarioId)
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
        bonoIndividualUsd: 0,
        bonoGrupalUsd: 0,
        totalBonusUsd: 0,
        bonusDetalles: [],
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

  // 2. Ventas únicas del periodo por hotel (para cálculo de bono grupal)
  const ventasUnicasPorHotel = new Map<number, number>()
  const ventasProcesadasGlobal = new Set<number>()
  for (const c of list) {
    if (!ventasProcesadasGlobal.has(c.citaVentaId)) {
      ventasProcesadasGlobal.add(c.citaVentaId)
      const { ventaBruta } = extractSaleMetrics(c)
      ventasUnicasPorHotel.set(c.hotelId, (ventasUnicasPorHotel.get(c.hotelId) || 0) + ventaBruta)
    }
  }
  let totalVentasPeriodo = 0
  for (const v of ventasUnicasPorHotel.values()) {
    totalVentasPeriodo += v
  }

  // 3. Pre-indexación de contexto para cálculo de bonos O(1)
  const [fechaDesde] = props.commissionDateRange || []
  const targetAnio = Number(fechaDesde?.split('-')[0]) || new Date().getFullYear()
  const targetMes = Number(fechaDesde?.split('-')[1]) || new Date().getMonth() + 1

  const userMetasMap = new Map<string, Meta[]>()
  const hotelMetasConBono: Meta[] = []

  for (const m of goalStore.metas) {
    if (m.anio !== targetAnio || m.mes !== targetMes) continue

    if (m.alcanceTipo === 'USUARIO' && m.usuarioId && m.importeBonus && m.valorBonus) {
      const metas = userMetasMap.get(m.usuarioId) || []
      metas.push(m)
      userMetasMap.set(m.usuarioId, metas)
    } else if (m.alcanceTipo === 'HOTEL' && !m.usuarioId && m.valorBonus && m.valorBonus > 0) {
      hotelMetasConBono.push(m)
    }
  }

  // Pre-cálculo de integrantes por hotel (evita bucles anidados por usuario)
  const teamCountPorHotel = new Map<number, number>()
  for (const metaHotel of hotelMetasConBono) {
    const hotelProg = goalStore.progresoHoteles.find((p) => p.hotelId === metaHotel.hotelId)
    const count = Math.max(
      1,
      hotelProg?.fotografos?.length ||
        userStore.usersWithProfile.filter(
          (u) =>
            u.status === 'Activo' &&
            (u.hotelIds || []).includes(metaHotel.hotelId) &&
            ['FOTOGRAFO', 'SUPERVISOR', 'AGENDADOR', 'VENDEDOR'].includes(
              (u.perfil?.code || u.perfil?.name || '').toUpperCase(),
            ),
        ).length ||
        2,
    )
    teamCountPorHotel.set(metaHotel.hotelId, count)
  }

  const bonusCtx: BonusCalculationContext = {
    userProfileMap,
    userMetasMap,
    hotelMetasConBono,
    ventasUnicasPorHotel,
    totalVentasPeriodo,
    teamCountPorHotel,
  }

  // 4. Segundo pase por usuario: métricas deduplicadas de venta, impuestos y bonos
  const tc = tipoCambioMxn.value > 0 ? tipoCambioMxn.value : 1

  for (const item of userMap.values()) {
    const processedSaleIds = new Set<number>()

    for (const c of item.comisiones) {
      if (!processedSaleIds.has(c.citaVentaId)) {
        processedSaleIds.add(c.citaVentaId)
        const { ventaBruta, impuesto, baseCalculoUsd } = extractSaleMetrics(c)
        item.totalVentasBrutasUsd += ventaBruta
        item.totalImpuestoUsd += impuesto
        item.totalBaseNetaUsd += baseCalculoUsd
      }
    }

    // Porcentaje de impuesto efectivo aplicado
    item.impuestoPctCalculado =
      item.totalVentasBrutasUsd > 0
        ? Math.round((item.totalImpuestoUsd / item.totalVentasBrutasUsd) * 100)
        : 16

    // Redondeos limpios de ventas
    item.totalVentasBrutasUsd = Number(item.totalVentasBrutasUsd.toFixed(2))
    item.totalImpuestoUsd = Number(item.totalImpuestoUsd.toFixed(2))
    item.totalBaseNetaUsd = Number(item.totalBaseNetaUsd.toFixed(2))
    item.comisionFotografoUsd = Number(item.comisionFotografoUsd.toFixed(2))
    item.comisionVendedorUsd = Number(item.comisionVendedorUsd.toFixed(2))
    item.comisionOtrasUsd = Number(item.comisionOtrasUsd.toFixed(2))

    // Cálculo optimizado de bonos
    calcularBonosEmpleado(item, bonusCtx)

    // Conversión a Pesos MXN
    item.totalComisionesMxn = Number((item.totalComisionesUsd * tc).toFixed(2))

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
  }

  // 5. Ordenamiento
  const result = Array.from(userMap.values())
  if (currentSort.value.prop && currentSort.value.order) {
    const { prop, order } = currentSort.value
    const isAsc = order === 'ascending'
    result.sort((a, b) => {
      const valA = (a as unknown as Record<string, unknown>)[prop]
      const valB = (b as unknown as Record<string, unknown>)[prop]
      if (typeof valA === 'string' && typeof valB === 'string') {
        return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA)
      }
      const numA = typeof valA === 'number' ? valA : 0
      const numB = typeof valB === 'number' ? valB : 0
      return isAsc ? numA - numB : numB - numA
    })
  } else {
    result.sort((a, b) => b.totalComisionesUsd - a.totalComisionesUsd)
  }
  return result
})

// --- Control de filas expandidas (preservado en LocalStorage) ---
const LOCAL_STORAGE_KEY_EXPANDED = 'jj_studio_contable_expanded_rows'
function getInitialExpandedRows(): string[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY_EXPANDED)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {}
  return []
}

const expandedRowKeys = ref<string[]>(getInitialExpandedRows())

watch(
  expandedRowKeys,
  (keys) => {
    localStorage.setItem(LOCAL_STORAGE_KEY_EXPANDED, JSON.stringify(keys))
  },
  { deep: true },
)

function handleExpandChange(
  _row: EmpleadoComisionResumen,
  expandedRows: EmpleadoComisionResumen[],
) {
  expandedRowKeys.value = expandedRows.map((r) => r.usuarioId)
}

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

export interface DetalleVentaItem extends Omit<Partial<Comision>, 'id'> {
  id: string | number
  isSeparator?: boolean
  isBonus?: boolean
  esVentaDuplicada?: boolean
  bonusTipo?: 'INDIVIDUAL' | 'GRUPAL'
  bonusDescripcion?: string
  totalBonusUsd?: number
}

function getDetalleTableData(row: EmpleadoComisionResumen): DetalleVentaItem[] {
  const items: DetalleVentaItem[] = []
  const seenSaleIds = new Set<number>()

  for (const c of row.comisiones) {
    const isDuplicate = c.citaVentaId ? seenSaleIds.has(c.citaVentaId) : false
    if (c.citaVentaId) {
      seenSaleIds.add(c.citaVentaId)
    }

    items.push({
      ...c,
      esVentaDuplicada: isDuplicate,
      totalVentaUsd: isDuplicate ? 0 : c.totalVentaUsd,
      impuestoMontoUsd: isDuplicate ? 0 : c.impuestoMontoUsd,
      baseCalculoUsd: isDuplicate ? 0 : c.baseCalculoUsd,
    })
  }
  if (row.totalBonusUsd > 0 && row.bonusDetalles.length > 0) {
    // 1. Fila de separación
    items.push({
      id: `sep-${row.usuarioId}`,
      isSeparator: true,
      isBonus: false,
      totalBonusUsd: row.totalBonusUsd,
      totalVentaUsd: 0,
      impuestoMontoUsd: 0,
      baseCalculoUsd: 0,
      importeComisionUsd: 0,
    })

    // 2. Filas de cada bonus
    row.bonusDetalles.forEach((b, idx) => {
      items.push({
        id: `bonus-${row.usuarioId}-${idx}`,
        isSeparator: false,
        isBonus: true,
        bonusTipo: b.tipo,
        bonusDescripcion: b.descripcion,
        numeroMiscelaneo:
          b.tipo === 'INDIVIDUAL'
            ? t('dashboard.table.individualBonus')
            : t('dashboard.table.groupBonus'),
        fechaVenta: props.commissionDateRange[0]?.slice(0, 7) || '—',
        hotelNombre: b.hotelNombre,
        clienteNombre: b.descripcion,
        rolEnVenta: 'BONO',
        porcentajeAplicado: 0,
        totalVentaUsd: 0,
        impuestoMontoUsd: 0,
        baseCalculoUsd: 0,
        importeComisionUsd: b.montoBonus,
        estado: row.estadoGeneral === 'MIXTO' ? 'APROBADA' : row.estadoGeneral,
      })
    })
  }
  return items
}

function getNestedSpanMethod({ row, columnIndex }: { row: DetalleVentaItem; columnIndex: number }) {
  if (row.isSeparator) {
    if (columnIndex === 0) {
      return { rowspan: 1, colspan: 13 }
    }
    return { rowspan: 0, colspan: 0 }
  }
  return { rowspan: 1, colspan: 1 }
}

function getNestedRowClassName({ row }: { row: DetalleVentaItem }) {
  if (row.isSeparator) return 'nested-separator-tr'
  if (row.isBonus) return 'nested-bonus-tr'
  return ''
}

interface DetalleSummaryMethodProps {
  columns: TableColumnSummaryCtx[]
  data: DetalleVentaItem[]
}

function getDetalleVentasSummaries(param: DetalleSummaryMethodProps): string[] {
  const { columns, data } = param
  const sums: string[] = []

  columns.forEach((column, index) => {
    if (index === 0) {
      sums[index] = t('dashboard.table.total') || 'Total'
      return
    }

    if (column.property === 'totalVentaUsd' || column.label === t('dashboard.table.grossSales')) {
      const sum = data.reduce(
        (acc, row) => acc + (row.isSeparator || row.isBonus ? 0 : row.totalVentaUsd || 0),
        0,
      )
      sums[index] = formatCurrency(sum, 2)
      return
    }

    if (
      column.property === 'impuestoMontoUsd' ||
      column.label === t('dashboard.table.taxWithholding')
    ) {
      const sum = data.reduce(
        (acc, row) => acc + (row.isSeparator || row.isBonus ? 0 : row.impuestoMontoUsd || 0),
        0,
      )
      sums[index] = `-${formatCurrency(sum, 2)}`
      return
    }

    if (column.property === 'baseCalculoUsd' || column.label === t('dashboard.table.netBase')) {
      const sum = data.reduce(
        (acc, row) => acc + (row.isSeparator || row.isBonus ? 0 : row.baseCalculoUsd || 0),
        0,
      )
      sums[index] = formatCurrency(sum, 2)
      return
    }

    if (
      column.property === 'importeComisionUsd' ||
      column.label === t('dashboard.table.commissionAmountUsd')
    ) {
      // Suma ventas + importes de bonus
      const sum = data.reduce(
        (acc, row) => acc + (row.isSeparator ? 0 : row.importeComisionUsd || 0),
        0,
      )
      sums[index] = formatCurrency(sum, 2)
      return
    }

    if (column.label === t('dashboard.table.commissionAmountMxn')) {
      const sum = data.reduce(
        (acc, row) =>
          acc + (row.isSeparator ? 0 : (row.importeComisionUsd || 0) * (tipoCambioMxn.value || 1)),
        0,
      )
      sums[index] = formatMxn(sum)
      return
    }

    sums[index] = ''
  })

  return sums
}

const totalComisionesLiquidables = computed(() => {
  return resumenUsuariosComision.value.reduce((acc, row) => acc + (row.totalComisionesUsd || 0), 0)
})
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
            <span class="stat-label">{{ $t('dashboard.commissionsToSettle') }}</span>
            <span class="stat-value text-success">
              {{ formatCurrency(totalComisionesLiquidables, 2) }}
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
        row-key="usuarioId"
        :expand-row-keys="expandedRowKeys"
        :default-sort="
          currentSort.order ? { prop: currentSort.prop, order: currentSort.order } : undefined
        "
        border
        stripe
        show-summary
        :summary-method="getUsuariosSummaries"
        style="width: 100%"
        @selection-change="handleSelectionChange"
        @expand-change="handleExpandChange"
        @sort-change="handleSortChange"
      >
        <el-table-column type="selection" width="36" align="center" fixed="left" />

        <!-- Desglose expandible de ventas individuales por empleado -->
        <el-table-column type="expand" width="36" fixed="left">
          <template #default="{ row }">
            <div class="expand-table-wrapper">
              <div class="expand-header">
                <strong>{{ $t('dashboard.table.saleDetails') }}</strong>
                <span class="text-xs text-muted">
                  ({{ row.comisiones.length }} {{ $t('dashboard.table.salesCount') || 'ventas'
                  }}{{
                    row.totalBonusUsd > 0
                      ? ` + ${row.bonusDetalles.length} ${$t('dashboard.table.bonusesCount') || 'bonos'}`
                      : ''
                  }})
                </span>
              </div>
              <el-table
                :data="getDetalleTableData(row)"
                row-key="id"
                size="small"
                border
                stripe
                show-summary
                :span-method="getNestedSpanMethod"
                :row-class-name="getNestedRowClassName"
                :summary-method="getDetalleVentasSummaries"
                class="nested-table"
              >
                <!-- Columna 0: Folio / Misc. o Separador / Nombre de Bono -->
                <el-table-column
                  prop="numeroMiscelaneo"
                  :label="$t('dashboard.table.voucherFolio')"
                  width="155"
                >
                  <template #default="{ row: subRow }">
                    <!-- Fila de Separación -->
                    <div v-if="subRow.isSeparator" class="nested-separator-content">
                      <div class="separator-badge-title">
                        <el-icon class="text-warning mr-1"><Award :size="15" /></el-icon>
                        <span class="separator-title">
                          {{ $t('dashboard.table.bonusesEarnedPeriod') }}
                        </span>
                      </div>
                    </div>

                    <!-- Fila de Bono -->
                    <div v-else-if="subRow.isBonus" class="bonus-row-folio">
                      <el-tag
                        size="small"
                        :type="subRow.bonusTipo === 'INDIVIDUAL' ? 'warning' : 'primary'"
                        effect="plain"
                        round
                        class="bonus-tag-pill"
                      >
                        <el-icon class="mr-1"><Award :size="12" /></el-icon>
                        {{ subRow.numeroMiscelaneo }}
                      </el-tag>
                    </div>

                    <!-- Cita de Venta normal -->
                    <el-button
                      v-else-if="subRow.citaVentaId"
                      type="primary"
                      link
                      size="small"
                      class="folio-link-btn"
                      :title="$t('common.edit') + ' ' + (subRow.numeroMiscelaneo || '')"
                      @click.stop="goToEditSale(subRow.citaVentaId)"
                    >
                      <el-icon :size="13"><Edit /></el-icon>
                      <span class="font-mono text-xs">
                        {{ subRow.numeroMiscelaneo || $t('dashboard.table.noVoucherFolio') }}
                      </span>
                    </el-button>
                    <span v-else class="font-mono text-xs">
                      {{ subRow.numeroMiscelaneo || $t('dashboard.table.noVoucherFolio') }}
                    </span>
                  </template>
                </el-table-column>

                <!-- Columna 1: Fecha -->
                <el-table-column prop="fechaVenta" :label="$t('dashboard.table.date')" width="110">
                  <template #default="{ row: subRow }">
                    <span :class="{ 'text-muted text-xs': subRow.isBonus }">
                      {{ subRow.fechaVenta }}
                    </span>
                  </template>
                </el-table-column>

                <!-- Columna 2: Hotel -->
                <el-table-column
                  prop="hotelNombre"
                  :label="$t('dashboard.table.hotel')"
                  width="110"
                  show-overflow-tooltip
                />

                <!-- Columna 3: Cliente / Descripción de Bono -->
                <el-table-column
                  prop="clienteNombre"
                  :label="$t('dashboard.table.client')"
                  width="110"
                  show-overflow-tooltip
                >
                  <template #default="{ row: subRow }">
                    <div v-if="subRow.isBonus" class="bonus-info-wrapper">
                      <el-tooltip
                        placement="top"
                        effect="dark"
                        :teleported="true"
                        popper-class="vat-info-popper"
                      >
                        <template #content>
                          <div class="vat-tooltip-content">
                            {{ subRow.clienteNombre }}
                          </div>
                        </template>
                        <el-icon class="cursor-pointer text-muted hover:text-primary" :size="14">
                          <InfoFilled />
                        </el-icon>
                      </el-tooltip>
                    </div>
                    <span v-else>{{ subRow.clienteNombre }}</span>
                  </template>
                </el-table-column>

                <!-- Columna 4: Rol -->
                <el-table-column :label="$t('dashboard.table.role')" width="110" align="center">
                  <template #default="{ row: subRow }">
                    <el-tag
                      v-if="subRow.isBonus"
                      size="small"
                      type="warning"
                      effect="dark"
                      round
                      class="font-bold bono-table-tag"
                    >
                      <el-icon class="mr-1"><Award :size="11" /></el-icon>
                      BONO
                    </el-tag>
                    <el-tag
                      v-else
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

                <!-- Columna 5: Tasa -->
                <el-table-column :label="$t('dashboard.table.rate')" width="80" align="center">
                  <template #default="{ row: subRow }">
                    <span v-if="subRow.isBonus" class="text-muted">—</span>
                    <span v-else>{{ subRow.porcentajeAplicado }}%</span>
                  </template>
                </el-table-column>

                <!-- Columna 6: Ventas Brutas -->
                <el-table-column
                  prop="totalVentaUsd"
                  :label="$t('dashboard.table.grossSales')"
                  width="120"
                  align="right"
                >
                  <template #default="{ row: subRow }">
                    <span v-if="subRow.isBonus || subRow.esVentaDuplicada" class="text-muted">
                      —
                    </span>
                    <span v-else>{{ formatCurrency(subRow.totalVentaUsd, 2) }}</span>
                  </template>
                </el-table-column>

                <!-- Columna 7: Retención / IVA -->
                <el-table-column
                  prop="impuestoMontoUsd"
                  :label="$t('dashboard.table.taxWithholding')"
                  width="115"
                  align="right"
                >
                  <template #default="{ row: subRow }">
                    <span v-if="subRow.isBonus || subRow.esVentaDuplicada" class="text-muted">
                      —
                    </span>
                    <span v-else class="text-danger">
                      -{{ formatCurrency(subRow.impuestoMontoUsd, 2) }}
                    </span>
                  </template>
                </el-table-column>

                <!-- Columna 8: Base Neta -->
                <el-table-column
                  prop="baseCalculoUsd"
                  :label="$t('dashboard.table.netBase')"
                  width="120"
                  align="right"
                >
                  <template #default="{ row: subRow }">
                    <span v-if="subRow.isBonus || subRow.esVentaDuplicada" class="text-muted">
                      —
                    </span>
                    <span v-else>{{ formatCurrency(subRow.baseCalculoUsd, 2) }}</span>
                  </template>
                </el-table-column>

                <!-- Columna 9: Comisión USD -->
                <el-table-column
                  prop="importeComisionUsd"
                  :label="$t('dashboard.table.commissionAmountUsd')"
                  width="135"
                  align="right"
                >
                  <template #default="{ row: subRow }">
                    <strong class="text-success font-bold">
                      {{ subRow.isBonus ? '+' : ''
                      }}{{ formatCurrency(subRow.importeComisionUsd, 2) }}
                    </strong>
                  </template>
                </el-table-column>

                <!-- Columna 10: Comisión MXN -->
                <el-table-column
                  :label="$t('dashboard.table.commissionAmountMxn')"
                  width="135"
                  align="right"
                >
                  <template #default="{ row: subRow }">
                    <strong class="text-primary font-medium">
                      {{ subRow.isBonus ? '+' : ''
                      }}{{ formatMxn((subRow.importeComisionUsd || 0) * (tipoCambioMxn || 1)) }}
                    </strong>
                  </template>
                </el-table-column>

                <!-- Columna 11: Estado -->
                <el-table-column :label="$t('dashboard.table.status')" width="110" align="center">
                  <template #default="{ row: subRow }">
                    <el-tag
                      size="small"
                      round
                      class="status-tag"
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

                <!-- Columna 12: Acción -->
                <el-table-column :label="$t('dashboard.table.action')" width="115" align="center">
                  <template #default="{ row: subRow }">
                    <span v-if="subRow.isBonus" class="text-muted text-xs">—</span>
                    <template v-else>
                      <el-button
                        v-if="subRow.estado === 'PENDIENTE'"
                        type="warning"
                        size="small"
                        class="action-btn"
                        @click.stop="onUpdateCommissionStatus(subRow.id, 'APROBADA')"
                      >
                        {{ $t('dashboard.approve') }}
                      </el-button>
                      <el-button
                        v-else-if="subRow.estado === 'APROBADA'"
                        type="success"
                        size="small"
                        class="action-btn"
                        @click.stop="onUpdateCommissionStatus(subRow.id, 'PAGADA')"
                      >
                        {{ $t('dashboard.pay') }}
                      </el-button>
                      <el-button
                        v-else-if="subRow.estado === 'PAGADA'"
                        type="info"
                        plain
                        size="small"
                        class="action-btn"
                        :icon="RotateCcw"
                        :title="$t('dashboard.undoPayment')"
                        @click.stop="onUpdateCommissionStatus(subRow.id, 'PENDIENTE')"
                      >
                        {{ $t('dashboard.undo') }}
                      </el-button>
                    </template>
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
          width="220"
          fixed="left"
          sortable="custom"
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
          sortable="custom"
        >
          <template #default="{ row }">
            <span class="font-semibold">{{ formatCurrency(row.totalVentasBrutasUsd, 2) }}</span>
          </template>
        </el-table-column>

        <!-- Columna 4: Retención / Impuesto Estatal deducido -->
        <el-table-column prop="totalImpuestoUsd" width="170" align="right" sortable="custom">
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
          sortable="custom"
          class-name="col-highlighted"
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
          sortable="custom"
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
          sortable="custom"
        >
          <template #default="{ row }">
            <span v-if="row.comisionVendedorUsd > 0">
              {{ formatCurrency(row.comisionVendedorUsd, 2) }}
            </span>
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>

        <!-- Columna 8: Otras Comisiones (Supervisor / Gerente / Bonos) -->
        <el-table-column
          prop="comisionOtrasUsd"
          :label="$t('dashboard.table.otherCommission')"
          width="155"
          align="right"
          sortable="custom"
        >
          <template #default="{ row }">
            <div v-if="row.comisionOtrasUsd > 0" class="other-comm-cell">
              <!-- Icono Naranja para Bono Personal / Individual (al principio) -->
              <el-tooltip
                v-if="row.bonoIndividualUsd > 0"
                placement="top"
                effect="dark"
                popper-class="award-bonus-popper"
              >
                <template #content>
                  <div class="award-bonus-tooltip">
                    <div class="award-bonus-title">{{ $t('dashboard.table.individualBonus') }}:</div>
                    <div class="award-bonus-amount text-warning">+{{ formatCurrency(row.bonoIndividualUsd, 2) }}</div>
                  </div>
                </template>
                <el-icon class="text-warning cursor-pointer hover:scale-110 transition-transform">
                  <Award :size="15" />
                </el-icon>
              </el-tooltip>

              <!-- Icono Azul para Bono Grupal (al principio) -->
              <el-tooltip
                v-if="row.bonoGrupalUsd > 0"
                placement="top"
                effect="dark"
                popper-class="award-bonus-popper"
              >
                <template #content>
                  <div class="award-bonus-tooltip">
                    <div class="award-bonus-title">{{ $t('dashboard.table.groupBonus') }}:</div>
                    <div class="award-bonus-amount text-primary">+{{ formatCurrency(row.bonoGrupalUsd, 2) }}</div>
                  </div>
                </template>
                <el-icon class="text-primary cursor-pointer hover:scale-110 transition-transform">
                  <Award :size="15" />
                </el-icon>
              </el-tooltip>

              <!-- Cantidad monetaria -->
              <span class="font-medium">
                {{ formatCurrency(row.comisionOtrasUsd, 2) }}
              </span>
            </div>
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>

        <!-- Columna 9: TOTAL COMISIONES (USD) -->
        <el-table-column
          prop="totalComisionesUsd"
          :label="$t('dashboard.table.totalCommissionsUsd')"
          width="195"
          align="right"
          sortable="custom"
          class-name="col-highlighted"
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
          sortable="custom"
          class-name="col-highlighted"
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
          min-width="140"
          align="center"
        >
          <template #default="{ row }">
            <el-tag
              size="small"
              round
              class="status-tag"
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

        <!-- Columna 12: Acción por Empleado -->
        <el-table-column
          :label="$t('dashboard.table.action')"
          width="115"
          align="center"
          fixed="right"
        >
          <template #default="{ row }">
            <div class="row-actions-group">
              <!-- Paso 1: Si tiene comisiones pendientes -> Botón Aprobar -->
              <template v-if="row.pendientesCount > 0">
                <el-button
                  type="warning"
                  size="small"
                  class="action-btn"
                  @click="handleUserApprove(row)"
                >
                  {{ $t('dashboard.approve') }}
                </el-button>
              </template>

              <!-- Paso 2: Si no tiene pendientes pero tiene comisiones aprobadas -> Botón Pagar + Deshacer -->
              <template v-else-if="row.aprobadasCount > 0">
                <el-button
                  type="success"
                  size="small"
                  class="action-btn"
                  @click="handleUserPay(row)"
                >
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
                      class="action-btn"
                      :icon="RotateCcw"
                      :title="$t('dashboard.undoApproval')"
                    >
                      {{ $t('dashboard.undo') }}
                    </el-button>
                  </template>
                </el-popconfirm>
              </template>

              <!-- Paso 3: Si todas están pagadas -> Solo botón Deshacer -->
              <template v-else-if="row.pagadasCount > 0">
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
                      class="action-btn"
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

.row-actions-group {
  display: flex;
  gap: 6px;
  justify-content: center;
  align-items: center;
}

.action-btn {
  width: 82px !important;
  justify-content: center !important;
  text-align: center !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
}

.status-tag {
  min-width: 84px !important;
  width: auto !important;
  justify-content: center !important;
  text-align: center !important;
  display: inline-flex !important;
  padding: 0 10px !important;
  white-space: nowrap !important;
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

:deep(.el-table th.el-table-column--selection .cell),
:deep(.el-table td.el-table-column--selection .cell),
:deep(.el-table th.el-table__expand-column .cell),
:deep(.el-table td.el-table__expand-column .cell) {
  padding-left: 0 !important;
  padding-right: 0 !important;
  text-align: center;
}

:deep(.el-table th.col-highlighted),
:deep(.el-table td.col-highlighted) {
  background-color: var(--el-color-primary-light-9, #ecf5ff) !important;
}

:deep(.el-table__footer-wrapper tbody td) {
  font-weight: 700;
  background-color: var(--el-fill-color-light, #f8fafc);
}

:deep(.el-table__footer-wrapper .cell) {
  font-weight: 700;
  color: var(--heading-color, #0f172a);
}

.folio-link-btn {
  padding: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
}

.folio-link-btn:hover {
  text-decoration: underline;
}

.other-comm-cell {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}

/* Fila de Separador y Filas de Bonus en Tabla Anidada */
:deep(.nested-table .nested-separator-tr) {
  background: linear-gradient(
    90deg,
    rgba(245, 158, 11, 0.08) 0%,
    rgba(241, 245, 249, 0.8) 100%
  ) !important;
}

:deep(.nested-table .nested-separator-tr td) {
  padding: 8px 12px !important;
  border-top: 1px solid var(--toolbar-border, #e2e8f0) !important;
  border-bottom: 1px solid var(--toolbar-border, #e2e8f0) !important;
}

.nested-separator-content {
  display: flex;
  align-items: center;
  width: 100%;
}

.separator-badge-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  font-size: 0.8rem;
  color: #b45309;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  white-space: nowrap;
}

:deep(.nested-table .nested-bonus-tr) {
  background-color: rgba(245, 158, 11, 0.035) !important;
}

:deep(.nested-table .nested-bonus-tr:hover > td) {
  background-color: rgba(245, 158, 11, 0.07) !important;
}

.bonus-info-wrapper {
  display: inline-flex;
  align-items: center;
}

.bonus-row-folio {
  display: flex;
  align-items: center;
}

.bonus-tag-pill {
  width: 122px;
  justify-content: center;
  text-align: center;
  font-weight: 600;
  display: inline-flex;
}

.bono-table-tag {
  letter-spacing: 0.03em;
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

.el-popper.award-bonus-popper {
  min-width: 130px !important;
  width: max-content !important;
  max-width: 200px !important;
  text-align: center !important;
  padding: 6px 10px !important;
}

.el-popper.award-bonus-popper .award-bonus-tooltip {
  text-align: center;
  line-height: 1.35;
}

.el-popper.award-bonus-popper .award-bonus-title {
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap !important;
}

.el-popper.award-bonus-popper .award-bonus-amount {
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap !important;
  margin-top: 2px;
}
</style>
