import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useUserStore } from '@/features/users/stores/user.store'
import { useCountryStore } from '@/features/countries/stores/country.store'
import { useProfileStore } from '@/features/users/stores/profile.store'
import { useHotelStore } from '@/features/hotels/stores/hotel.store'
import { useGoalStore } from '@/features/goals/stores/goal.store'
import { useSessionStore } from '@/features/photo-sessions/stores/session.store'
import { useSaleStore } from '@/features/sales/stores/sale.store'
import { useCommissionStore } from '@/features/commissions/stores/commission.store'
import type { FotografoProgreso, HotelProgresoResumen } from '@/features/goals/domain/goal.model'
import { ElMessage } from 'element-plus'
import { formatCurrency } from '@/shared/formatters'

export interface PhotographerHotelData {
  id: number
  nombre: string
  areaNombre: string
  paisNombre: string
  cadenaHotelera?: string
  categoriaEstrellas?: number
  personaContacto?: string
  telefonoContacto?: string
  emailContacto?: string
  direccion?: string
}

export const monthsOptions = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
] as const

export function useDashboard() {
  const router = useRouter()
  const authStore = useAuthStore()
  const userStore = useUserStore()
  const countryStore = useCountryStore()
  const profileStore = useProfileStore()
  const hotelStore = useHotelStore()
  const goalStore = useGoalStore()
  const sessionStore = useSessionStore()
  const saleStore = useSaleStore()
  const commissionStore = useCommissionStore()

  const currentUser = computed(() => authStore.user)
  const userRole = computed(() => currentUser.value?.roleCode?.toUpperCase() || '')

  // --- Filtros temporales ---
  const now = new Date()
  const selectedAnio = ref(now.getFullYear())
  const selectedMes = ref(now.getMonth() + 1)
  const selectedHotelFilters = ref<number[]>([])

  const selectedHotelFilter = computed<number | null>({
    get: () => (selectedHotelFilters.value.length > 0 ? selectedHotelFilters.value[0]! : null),
    set: (val) => {
      selectedHotelFilters.value = val !== null && val !== undefined ? [val] : []
    },
  })

  const yearsOptions = computed(() => {
    const currentYear = now.getFullYear()
    const years: number[] = []
    for (let y = currentYear - 5; y <= currentYear + 2; y++) {
      years.push(y)
    }
    return years
  })

  // --- Carga de datos ---
  async function loadCommissionConfigForUser() {
    let paisId: number | undefined = undefined
    let hotelId: number | undefined = undefined

    if (selectedHotelFilters.value.length === 1 && selectedHotelFilters.value[0]) {
      hotelId = selectedHotelFilters.value[0]
      const h = hotelStore.hotels.find((item) => item.id === hotelId)
      if (h) {
        const area = countryStore.countries
          .flatMap((c) => c.areas || [])
          .find((a) => a.id === h.areaId)
        if (area) paisId = area.paisId
      }
    } else if (
      currentUser.value?.hotelIds &&
      currentUser.value.hotelIds.length > 0 &&
      currentUser.value.hotelIds[0]
    ) {
      hotelId = currentUser.value.hotelIds[0]
      const h = hotelStore.hotels.find((item) => item.id === hotelId)
      if (h) {
        const area = countryStore.countries
          .flatMap((c) => c.areas || [])
          .find((a) => a.id === h.areaId)
        if (area) paisId = area.paisId
      }
    } else if (
      currentUser.value?.areaIds &&
      currentUser.value.areaIds.length > 0 &&
      currentUser.value.areaIds[0]
    ) {
      const area = countryStore.countries
        .flatMap((c) => c.areas || [])
        .find((a) => a.id === currentUser.value?.areaIds?.[0])
      if (area) paisId = area.paisId
    }

    await commissionStore.fetchConfigs(paisId, hotelId).catch(() => {})
  }

  async function loadGoalsData() {
    const hotelIdsParam =
      selectedHotelFilters.value.length > 0 ? selectedHotelFilters.value : undefined
    await Promise.all([
      goalStore.fetchProgreso({
        hotelIds: hotelIdsParam,
        anio: selectedAnio.value,
        mes: selectedMes.value,
      }),
      goalStore.fetchEvolucion({
        hotelIds: hotelIdsParam,
        anio: selectedAnio.value,
        mes: selectedMes.value,
      }),
      commissionStore.fetchResumen({
        hotelIds: hotelIdsParam,
        anio: selectedAnio.value,
        mes: selectedMes.value,
      }),
      commissionStore.fetchComisiones({
        hotelIds: hotelIdsParam,
        anio: selectedAnio.value,
        mes: selectedMes.value,
      }),
      loadCommissionConfigForUser(),
    ])
  }

  onMounted(async () => {
    await Promise.all([
      countryStore.fetchCountries(),
      userStore.fetchUsers(),
      profileStore.fetchProfiles(),
      hotelStore.fetchHotels(),
    ])
    sessionStore.fetchSessions()
    saleStore.fetchCitasVenta()
    await loadGoalsData()
  })

  watch([selectedAnio, selectedMes, selectedHotelFilters], async () => {
    await loadGoalsData()
  })

  // --- Helpers de hoy ---
  function getTodaySessionsForHotel(hotelId: number) {
    const today = new Date().toISOString().split('T')[0]
    return sessionStore.sessions.filter((s) => {
      if (s.hotelId !== hotelId) return false
      const sDate = s.fechaHoraInicio ? s.fechaHoraInicio.split('T')[0] : ''
      return sDate === today && s.estado !== 'CANCELADA'
    })
  }

  function getTodaySalesForHotel(hotelId: number) {
    const today = new Date().toISOString().split('T')[0]
    return saleStore.citasVenta.filter((c) => {
      if (c.hotelId !== hotelId) return false
      const cDate = c.fechaHoraCita ? c.fechaHoraCita.split('T')[0] : ''
      return cDate === today && c.estado !== 'CANCELADA'
    })
  }

  function formatTime(isoStr?: string): string {
    if (!isoStr) return '--:--'
    const timePart = isoStr.includes('T') ? isoStr.split('T')[1] : isoStr
    return timePart ? timePart.slice(0, 5) : '--:--'
  }

  // --- KPIs globales ---
  const totalUsers = computed(() => userStore.usersWithProfile.length)
  const activeUsers = computed(
    () => userStore.usersWithProfile.filter((u) => u.status === 'Activo').length,
  )
  const totalCountries = computed(() => countryStore.countries.length)
  const totalAreas = computed(() =>
    countryStore.countries.reduce((acc, c) => acc + (c.areas?.length || 0), 0),
  )
  const totalHotels = computed(() =>
    countryStore.countries.reduce(
      (acc, c) =>
        acc + (c.areas?.reduce((areaAcc, a) => areaAcc + (a.hoteles?.length || 0), 0) || 0),
      0,
    ),
  )

  // --- Metas consolidadas y filtradas ---
  const filteredProgresoHoteles = computed(() => {
    if (selectedHotelFilters.value.length === 0) {
      return goalStore.progresoHoteles
    }
    const filterSet = new Set(selectedHotelFilters.value)
    return goalStore.progresoHoteles.filter((p) => filterSet.has(p.hotelId))
  })

  const currentHotelProgreso = computed(() => {
    if (selectedHotelFilters.value.length === 1) {
      return (
        goalStore.progresoHoteles.find((p) => p.hotelId === selectedHotelFilters.value[0]) || null
      )
    }
    return null
  })

  const selectedHotelsSummary = computed(() => {
    if (selectedHotelFilters.value.length === 0) {
      return 'Consolidado general'
    }
    if (selectedHotelFilters.value.length === 1) {
      const h = hotelStore.hotels.find((item) => item.id === selectedHotelFilters.value[0])
      return h ? h.nombre : '1 hotel seleccionado'
    }
    const names = hotelStore.hotels
      .filter((item) => selectedHotelFilters.value.includes(item.id))
      .map((item) => item.nombre)
    if (names.length <= 2) {
      return names.join(', ')
    }
    return `${names.length} hoteles seleccionados`
  })

  const globalProgresoTotals = computed(() => {
    const list = filteredProgresoHoteles.value
    const metaTotal = list.reduce((sum, h) => sum + h.metaImporte, 0)
    const ventasTotal = list.reduce((sum, h) => sum + h.ventasRealesUsd, 0)
    const metaEsperadaTotal = list.reduce((sum, h) => sum + h.metaEsperadaHoy, 0)
    const pct = metaTotal > 0 ? Math.round((ventasTotal / metaTotal) * 1000) / 10 : 0
    const desv = ventasTotal - metaEsperadaTotal

    let semaforo: 'VERDE' | 'AMARILLO' | 'ROJO' | 'SIN_META' = 'SIN_META'
    if (metaTotal <= 0) {
      semaforo = 'SIN_META'
    } else if (ventasTotal >= metaTotal) {
      semaforo = 'VERDE'
    } else if (metaEsperadaTotal > 0) {
      const ratio = ventasTotal / metaEsperadaTotal
      if (ratio >= 1.0) semaforo = 'VERDE'
      else if (ratio >= 0.8) semaforo = 'AMARILLO'
      else semaforo = 'ROJO'
    }

    return {
      metaTotal: Math.round(metaTotal * 100) / 100,
      ventasTotal: Math.round(ventasTotal * 100) / 100,
      porcentaje: pct,
      metaEsperadaTotal: Math.round(metaEsperadaTotal * 100) / 100,
      desviacion: Math.round(desv * 100) / 100,
      semaforo,
      numHoteles: list.length,
    }
  })

  // --- Helpers semáforo ---
  function getSemaforoTagType(
    semaforo: string,
    metaImporte: number,
  ): 'success' | 'warning' | 'danger' | 'info' {
    if (metaImporte <= 0 || semaforo === 'SIN_META') return 'info'
    if (semaforo === 'VERDE') return 'success'
    if (semaforo === 'AMARILLO') return 'warning'
    return 'danger'
  }

  function getSemaforoText(semaforo: string, metaImporte: number): string {
    if (metaImporte <= 0 || semaforo === 'SIN_META') return 'Meta no definida'
    if (semaforo === 'VERDE') return 'En tiempo'
    if (semaforo === 'AMARILLO') return 'Alerta'
    return 'Atrasado'
  }

  function getProgressColor(semaforo: string, metaImporte: number): string {
    if (metaImporte <= 0 || semaforo === 'SIN_META') return '#94a3b8'
    if (semaforo === 'VERDE') return '#10b981'
    if (semaforo === 'AMARILLO') return '#f59e0b'
    return '#ef4444'
  }

  // --- Gerente ---
  const managerAreaIds = computed(() => new Set(currentUser.value?.areaIds || []))

  const managerAreas = computed(() => {
    const list: { id: number; nombre: string; paisNombre: string; hotelesCount: number }[] = []
    for (const pais of countryStore.countries) {
      for (const area of pais.areas || []) {
        if (managerAreaIds.value.has(area.id)) {
          list.push({
            id: area.id,
            nombre: area.nombre,
            paisNombre: pais.nombre,
            hotelesCount: area.hoteles?.length || 0,
          })
        }
      }
    }
    return list
  })

  const managerHotels = computed(() => {
    const list: { id: number; nombre: string; areaNombre: string; paisNombre: string }[] = []
    for (const pais of countryStore.countries) {
      for (const area of pais.areas || []) {
        if (managerAreaIds.value.has(area.id)) {
          for (const hotel of area.hoteles || []) {
            list.push({
              id: hotel.id,
              nombre: hotel.nombre,
              areaNombre: area.nombre,
              paisNombre: pais.nombre,
            })
          }
        }
      }
    }
    return list
  })

  const managerTeam = computed(() => {
    const mHotels = new Set(managerHotels.value.map((h) => h.id))
    return userStore.usersWithProfile.filter((u) => {
      const role = u.perfil?.code?.toUpperCase()
      if (role !== 'SUPERVISOR' && role !== 'FOTOGRAFO' && role !== 'AGENDADOR') return false
      return u.hotelIds?.some((hid) => mHotels.has(hid))
    })
  })

  // --- Supervisor ---
  const supervisorHotelIds = computed(() => new Set(currentUser.value?.hotelIds || []))

  const supervisorHotels = computed(() => {
    const list: {
      id: number
      nombre: string
      areaNombre: string
      paisNombre: string
      cadena?: string
      categoria?: number
    }[] = []
    for (const pais of countryStore.countries) {
      for (const area of pais.areas || []) {
        for (const hotel of area.hoteles || []) {
          if (supervisorHotelIds.value.has(hotel.id)) {
            const details = hotelStore.hotels.find((h) => h.id === hotel.id)
            list.push({
              id: hotel.id,
              nombre: hotel.nombre,
              areaNombre: area.nombre,
              paisNombre: pais.nombre,
              cadena: details?.cadenaHotelera,
              categoria: details?.estrellas,
            })
          }
        }
      }
    }
    return list
  })

  // --- Fotógrafo ---
  const photographerHotels = computed(() => {
    const list: PhotographerHotelData[] = []
    const photographerHotelIds = new Set(currentUser.value?.hotelIds || [])
    for (const pais of countryStore.countries) {
      for (const area of pais.areas || []) {
        for (const hotel of area.hoteles || []) {
          if (photographerHotelIds.has(hotel.id)) {
            const details = hotelStore.hotels.find((h) => h.id === hotel.id)
            list.push({
              ...hotel,
              areaNombre: area.nombre,
              paisNombre: pais.nombre,
              cadenaHotelera: details?.cadenaHotelera,
              categoriaEstrellas: details?.estrellas,
              personaContacto: details?.personaContacto,
              telefonoContacto: details?.telefono,
              emailContacto: details?.email,
              direccion: details?.direccion,
            })
          }
        }
      }
    }
    return list
  })

  const photographerPersonalGoals = computed(() => {
    const myId = currentUser.value?.id
    if (!myId) return []

    const results: Array<{
      hotelId: number
      hotelNombre: string
      personal: FotografoProgreso
      hotel: HotelProgresoResumen
    }> = []

    for (const prog of goalStore.progresoHoteles) {
      const foto = prog.fotografos.find((f) => f.usuarioId === myId)
      if (foto) {
        results.push({
          hotelId: prog.hotelId,
          hotelNombre: prog.hotelNombre,
          personal: foto,
          hotel: prog,
        })
      }
    }
    return results
  })

  // --- Agendador / Vendedor ---
  const agendadorHotels = computed(() => photographerHotels.value)

  const agendadorHotelGoals = computed(() => {
    const myHotelIds = new Set(currentUser.value?.hotelIds || [])
    return goalStore.progresoHoteles.filter((p) => myHotelIds.has(p.hotelId))
  })

  // --- Navegación ---
  function goToConfig(tab = 'paises') {
    router.push(`/configuracion?tab=${tab}`)
  }

  function goToUsers() {
    router.push('/usuarios')
  }

  function goToAgenda() {
    router.push('/agenda')
  }



  function handleNavigateToGoalForm(hotelId?: number | null) {
    const query: Record<string, string | number> = { tab: 'metas' }
    if (hotelId) query.hotelId = hotelId
    if (selectedMes.value) query.mes = selectedMes.value
    if (selectedAnio.value) query.anio = selectedAnio.value
    router.push({ path: '/configuracion', query })
  }

  // --- Comisiones ---
  const myContractBadge = computed(() => {
    const c = currentUser.value?.tipoContrato
    return c === 'SIN_SALARIO' ? '🔵 Sin Salario / Freelance' : '🟢 Asalariado'
  })

  const currentImpuestoPct = computed(() => {
    return commissionStore.effectiveConfig?.impuestoPct ?? 16
  })

  const myCommissionFormula = computed(() => {
    const code = currentUser.value?.roleCode
    const contrato = currentUser.value?.tipoContrato
    const config = commissionStore.effectiveConfig
    const tax = config?.impuestoPct !== undefined ? config.impuestoPct : 16

    if (code === 'GERENTE') {
      const pct = config?.gerentePct ?? 2
      return `${pct}% × (Ventas − ${tax}% impuestos)`
    }
    if (code === 'SUPERVISOR') {
      const pct = config?.supervisorPct ?? 2
      return `${pct}% × (Ventas del hotel − ${tax}% impuestos)`
    }
    if (code === 'FOTOGRAFO') {
      const pct =
        contrato === 'SIN_SALARIO'
          ? (config?.fotografoSinSalarioPct ?? 20)
          : (config?.fotografoAsalariadoPct ?? 14)
      return `${pct}% × (Venta − ${tax}% impuestos)`
    }
    if (code === 'AGENDADOR') {
      const pct =
        contrato === 'SIN_SALARIO'
          ? (config?.vendedorSinSalarioPct ?? 8)
          : (config?.vendedorAsalariadoPct ?? 6)
      return `${pct}% × (Venta − ${tax}% impuestos)`
    }
    return ''
  })

  const myCommissionTooltip = computed(() => {
    const tax = currentImpuestoPct.value
    return `La comisión se calcula sobre la base neta tras deducir el ${tax}% de retención de impuestos: ${myCommissionFormula.value}`
  })

  const myMonthlyCommissions = computed(() => commissionStore.resumen?.totalComisionesUsd || 0)

  const supervisorMonthlyCommissions = computed(() => {
    if (currentUser.value?.id) {
      const u = commissionStore.resumen?.porUsuario.find(
        (item) => item.usuarioId === currentUser.value?.id,
      )
      if (u) return u.totalUsd
    }
    const r = commissionStore.resumen?.porRol.find((item) => item.rol === 'SUPERVISOR')
    return r?.totalUsd || 0
  })

  const gerenteMonthlyCommissions = computed(() => {
    if (currentUser.value?.id) {
      const u = commissionStore.resumen?.porUsuario.find(
        (item) => item.usuarioId === currentUser.value?.id,
      )
      if (u) return u.totalUsd
    }
    const r = commissionStore.resumen?.porRol.find((item) => item.rol === 'GERENTE')
    return r?.totalUsd || 0
  })

  const globalMonthlyCommissions = computed(() => commissionStore.resumen?.totalComisionesUsd || 0)

  async function handleUpdateCommissionStatus(id: number, nuevoEstado: string) {
    try {
      await commissionStore.updateEstadoComision(id, nuevoEstado)
      ElMessage.success(`Comisión marcada como ${nuevoEstado}`)
      await commissionStore.fetchResumen({
        hotelIds: selectedHotelFilters.value.length > 0 ? selectedHotelFilters.value : undefined,
        anio: selectedAnio.value,
        mes: selectedMes.value,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al actualizar estado'
      ElMessage.error(message)
    }
  }

  return {
    // Stores
    countryStore,
    hotelStore,
    goalStore,
    commissionStore,
    // User
    currentUser,
    userRole,
    // Filtros
    selectedAnio,
    selectedMes,
    selectedHotelFilter,
    selectedHotelFilters,
    yearsOptions,
    // KPIs
    totalUsers,
    activeUsers,
    totalCountries,
    totalAreas,
    totalHotels,
    // Metas
    currentHotelProgreso,
    filteredProgresoHoteles,
    globalProgresoTotals,
    selectedHotelsSummary,
    // Helpers semáforo
    getSemaforoTagType,
    getSemaforoText,
    getProgressColor,
    // Gerente
    managerAreas,
    managerHotels,
    managerTeam,
    // Supervisor
    supervisorHotels,
    // Fotógrafo
    photographerHotels,
    photographerPersonalGoals,
    // Agendador / Vendedor
    agendadorHotels,
    agendadorHotelGoals,
    getTodaySessionsForHotel,
    getTodaySalesForHotel,
    formatTime,
    // Navegación
    goToConfig,
    goToUsers,
    goToAgenda,
    formatCurrency,
    handleNavigateToGoalForm,
    // Comisiones
    currentImpuestoPct,
    myContractBadge,
    myCommissionFormula,
    myCommissionTooltip,
    myMonthlyCommissions,
    supervisorMonthlyCommissions,
    gerenteMonthlyCommissions,
    globalMonthlyCommissions,
    handleUpdateCommissionStatus,
  }
}
