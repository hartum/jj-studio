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
import type { Comision, ResumenComisiones } from '@/features/commissions/domain/commission.model'
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
  const initialYear = now.getFullYear()
  const initialMonth = now.getMonth() + 1
  const selectedAnio = ref(initialYear)
  const selectedMes = ref(initialMonth)
  const selectedMonths = ref<string[]>([
    `${initialYear}-${String(initialMonth).padStart(2, '0')}`,
  ])
  const selectedHotelFilters = ref<number[]>([])

  const parsedMonths = computed<{ anio: number; mes: number }[]>(() => {
    if (!selectedMonths.value || selectedMonths.value.length === 0) {
      return [{ anio: selectedAnio.value, mes: selectedMes.value }]
    }
    return selectedMonths.value
      .map((ym) => {
        const parts = String(ym).split('-').map(Number)
        return { anio: parts[0] || selectedAnio.value, mes: parts[1] || selectedMes.value }
      })
      .sort((a, b) => (a.anio !== b.anio ? a.anio - b.anio : a.mes - b.mes))
  })

  const selectedMonthsLabel = computed<string>(() => {
    const list = parsedMonths.value
    if (list.length === 0) {
      return `Mes de ${monthsOptions.find((m) => m.value === selectedMes.value)?.label || ''} ${selectedAnio.value}`
    }
    if (list.length === 1) {
      const item = list[0]!
      const mName = monthsOptions.find((m) => m.value === item.mes)?.label || String(item.mes)
      return `Mes de ${mName} ${item.anio}`
    }
    const formatted = list.map((item) => {
      const mName = monthsOptions.find((m) => m.value === item.mes)?.label || String(item.mes)
      return `${mName.slice(0, 3)} ${item.anio}`
    })
    return `${formatted.join(', ')} (${list.length} meses)`
  })

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

    await Promise.all([
      commissionStore.fetchConfigs(paisId, hotelId, currentUser.value?.id).catch(() => {}),
      commissionStore.fetchUserConfigs().catch(() => {}),
    ])
  }

  async function loadGoalsData() {
    const hotelIdsParam =
      selectedHotelFilters.value.length > 0 ? selectedHotelFilters.value : undefined
    const list = parsedMonths.value

    if (list.length <= 1) {
      const targetAnio = list[0]?.anio || selectedAnio.value
      const targetMes = list[0]?.mes || selectedMes.value
      await Promise.all([
        goalStore.fetchProgreso({
          hotelIds: hotelIdsParam,
          anio: targetAnio,
          mes: targetMes,
        }),
        goalStore.fetchEvolucion({
          hotelIds: hotelIdsParam,
          anio: targetAnio,
          mes: targetMes,
        }),
        commissionStore.fetchResumen({
          hotelIds: hotelIdsParam,
          anio: targetAnio,
          mes: targetMes,
        }),
        commissionStore.fetchComisiones({
          hotelIds: hotelIdsParam,
          anio: targetAnio,
          mes: targetMes,
        }),
        loadCommissionConfigForUser(),
      ])
      return
    }

    // Multiple months selected
    const API_URL = import.meta.env.VITE_API_URL || '/api'
    const token = localStorage.getItem('token')
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    goalStore.isLoading = true
    commissionStore.isLoading = true

    try {
      // 1. Fetch progreso for all months in parallel
      const progresoPromises = list.map(async ({ anio, mes }) => {
        const query = new URLSearchParams()
        if (hotelIdsParam && hotelIdsParam.length > 0) {
          query.set('hotelIds', hotelIdsParam.join(','))
        }
        query.set('anio', String(anio))
        query.set('mes', String(mes))
        const res = await fetch(`${API_URL}/metas/progreso?${query.toString()}`, { headers })
        if (!res.ok) return []
        return (await res.json()) as HotelProgresoResumen[]
      })

      // 2. Fetch resumen for all months in parallel
      const resumenPromises = list.map(async ({ anio, mes }) => {
        const query = new URLSearchParams()
        if (hotelIdsParam && hotelIdsParam.length > 0) {
          query.set('hotelIds', hotelIdsParam.join(','))
        }
        query.set('anio', String(anio))
        query.set('mes', String(mes))
        const res = await fetch(`${API_URL}/comisiones/resumen?${query.toString()}`, { headers })
        if (!res.ok) return null
        return (await res.json()) as ResumenComisiones
      })

      // 3. Fetch comisiones for all months in parallel
      const comisionesPromises = list.map(async ({ anio, mes }) => {
        const query = new URLSearchParams()
        if (hotelIdsParam && hotelIdsParam.length > 0) {
          query.set('hotelIds', hotelIdsParam.join(','))
        }
        query.set('anio', String(anio))
        query.set('mes', String(mes))
        const res = await fetch(`${API_URL}/comisiones?${query.toString()}`, { headers })
        if (!res.ok) return []
        return (await res.json()) as Comision[]
      })

      // 4. Fetch evolucion for the latest month
      const latest = list[list.length - 1]!
      const evolucionPromise = goalStore.fetchEvolucion({
        hotelIds: hotelIdsParam,
        anio: latest.anio,
        mes: latest.mes,
      })

      const [progresoResults, resumenResults, comisionesResults] = await Promise.all([
        Promise.all(progresoPromises),
        Promise.all(resumenPromises),
        Promise.all(comisionesPromises),
        evolucionPromise,
        loadCommissionConfigForUser(),
      ])

      // Merge progresoHoteles
      const hotelMap = new Map<number, HotelProgresoResumen>()
      for (const monthProgreso of progresoResults) {
        for (const h of monthProgreso) {
          const existing = hotelMap.get(h.hotelId)
          if (!existing) {
            hotelMap.set(h.hotelId, { ...h, fotografos: [...(h.fotografos || [])] })
          } else {
            existing.metaImporte += h.metaImporte
            existing.ventasRealesUsd += h.ventasRealesUsd
            existing.metaEsperadaHoy += h.metaEsperadaHoy
            existing.numVentas += h.numVentas
            existing.numSesiones += h.numSesiones
            existing.desviacionMonetaria = existing.ventasRealesUsd - existing.metaEsperadaHoy
            existing.porcentajeCumplimiento =
              existing.metaImporte > 0
                ? (existing.ventasRealesUsd / existing.metaImporte) * 100
                : 0
            if (existing.metaImporte <= 0) {
              existing.semaforo = 'SIN_META'
            } else if (existing.ventasRealesUsd >= existing.metaImporte) {
              existing.semaforo = 'VERDE'
            } else if (existing.metaEsperadaHoy <= 0) {
              existing.semaforo = existing.ventasRealesUsd > 0 ? 'VERDE' : 'SIN_META'
            } else {
              const ratio = existing.ventasRealesUsd / existing.metaEsperadaHoy
              existing.semaforo = ratio >= 1.0 ? 'VERDE' : ratio >= 0.8 ? 'AMARILLO' : 'ROJO'
            }
          }
        }
      }
      goalStore.progresoHoteles = Array.from(hotelMap.values())

      // Merge resumen
      const lastItem = list[list.length - 1]!
      const mergedResumen: ResumenComisiones = {
        anio: lastItem.anio,
        mes: lastItem.mes,
        totalVentasUsd: 0,
        totalComisionesUsd: 0,
        porRol: [],
        porUsuario: [],
        porHotel: [],
      }

      const rolMap = new Map<string, { rol: string; totalUsd: number; count: number }>()
      const userMap = new Map<
        string,
        {
          usuarioId: string
          nombreCompleto: string
          rol: string
          tipoContrato: string
          totalUsd: number
          ventasCount: number
        }
      >()
      const hotelMapCom = new Map<
        number,
        {
          hotelId: number
          hotelNombre: string
          totalComisionesUsd: number
          totalVentasUsd: number
        }
      >()

      for (const r of resumenResults) {
        if (r) {
          mergedResumen.totalVentasUsd += r.totalVentasUsd || 0
          mergedResumen.totalComisionesUsd += r.totalComisionesUsd || 0

          for (const item of r.porRol || []) {
            const existing = rolMap.get(item.rol)
            if (existing) {
              existing.totalUsd += item.totalUsd || 0
              existing.count += item.count || 0
            } else {
              rolMap.set(item.rol, { ...item })
            }
          }

          for (const item of r.porUsuario || []) {
            const existing = userMap.get(item.usuarioId)
            if (existing) {
              existing.totalUsd += item.totalUsd || 0
              existing.ventasCount += item.ventasCount || 0
            } else {
              userMap.set(item.usuarioId, { ...item })
            }
          }

          for (const item of r.porHotel || []) {
            const existing = hotelMapCom.get(item.hotelId)
            if (existing) {
              existing.totalComisionesUsd += item.totalComisionesUsd || 0
              existing.totalVentasUsd += item.totalVentasUsd || 0
            } else {
              hotelMapCom.set(item.hotelId, { ...item })
            }
          }
        }
      }

      mergedResumen.porRol = Array.from(rolMap.values())
      mergedResumen.porUsuario = Array.from(userMap.values())
      mergedResumen.porHotel = Array.from(hotelMapCom.values())
      commissionStore.resumen = mergedResumen

      // Merge comisiones
      const comisionMap = new Map<number, Comision>()
      for (const monthComisiones of comisionesResults) {
        for (const c of monthComisiones) {
          comisionMap.set(c.id, c)
        }
      }
      commissionStore.comisiones = Array.from(comisionMap.values()).sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime()
        const dateB = new Date(b.createdAt || 0).getTime()
        return dateB - dateA
      })
    } finally {
      goalStore.isLoading = false
      commissionStore.isLoading = false
    }
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

  let isInternalSync = false

  watch(
    selectedMonths,
    (newMonths) => {
      if (isInternalSync) return
      if (!newMonths || newMonths.length === 0) {
        isInternalSync = true
        selectedMonths.value = [
          `${selectedAnio.value}-${String(selectedMes.value).padStart(2, '0')}`,
        ]
        isInternalSync = false
        return
      }

      const list = parsedMonths.value
      if (list.length > 0) {
        const latest = list[list.length - 1]!
        if (latest.anio !== selectedAnio.value || latest.mes !== selectedMes.value) {
          isInternalSync = true
          selectedAnio.value = latest.anio
          selectedMes.value = latest.mes
          isInternalSync = false
        }
      }
      loadGoalsData()
    },
    { deep: true },
  )

  watch([selectedAnio, selectedMes], ([newYear, newMes]) => {
    if (isInternalSync) return
    const key = `${newYear}-${String(newMes).padStart(2, '0')}`
    if (selectedMonths.value.length !== 1 || selectedMonths.value[0] !== key) {
      isInternalSync = true
      selectedMonths.value = [key]
      isInternalSync = false
    }
    loadGoalsData()
  })

  watch(selectedHotelFilters, async () => {
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

  const currentUserSpecialConfig = computed(() => {
    if (commissionStore.currentUserConfig && commissionStore.currentUserConfig.activo !== false) {
      return commissionStore.currentUserConfig
    }
    const uid = currentUser.value?.id
    if (!uid) return null
    return (
      commissionStore.userConfigs.find(
        (c) => c.usuarioId === uid && (c.activo === undefined || c.activo === true),
      ) || null
    )
  })

  const currentImpuestoPct = computed(() => {
    if (currentUserSpecialConfig.value) {
      return currentUserSpecialConfig.value.impuestoPct
    }
    return commissionStore.effectiveConfig?.impuestoPct ?? 16
  })

  const myCommissionFormula = computed(() => {
    const code = currentUser.value?.roleCode
    const contrato = currentUser.value?.tipoContrato
    const config = commissionStore.effectiveConfig

    // Si el usuario tiene comisión especial personalizada asignada
    if (currentUserSpecialConfig.value) {
      const pct = currentUserSpecialConfig.value.porcentajeComision
      const tax = currentUserSpecialConfig.value.impuestoPct
      if (code === 'GERENTE') {
        return `${pct}% × (Ventas − ${tax}% impuestos)`
      }
      if (code === 'SUPERVISOR') {
        return `${pct}% × (Ventas del hotel − ${tax}% impuestos)`
      }
      return `${pct}% × (Venta − ${tax}% impuestos)`
    }

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
      if (nuevoEstado === 'PENDIENTE') {
        ElMessage.success('Comisión restablecida a estado Pendiente')
      } else {
        ElMessage.success(`Comisión marcada como ${nuevoEstado}`)
      }
      await loadGoalsData()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al actualizar estado'
      ElMessage.error(message)
    }
  }

  return {
    // Stores
    countryStore,
    userStore,
    hotelStore,
    goalStore,
    commissionStore,
    // User
    currentUser,
    userRole,
    // Filtros
    selectedAnio,
    selectedMes,
    selectedMonths,
    selectedMonthsLabel,
    parsedMonths,
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
    // Gerente y Contable
    managerAreas,
    managerHotels,
    contableAreas: managerAreas,
    contableHotels: managerHotels,
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
    currentUserSpecialConfig,
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
