import { computed, type Ref, type ComputedRef } from 'vue'
import dayjs from 'dayjs'
import type { EventApi } from '@fullcalendar/core'
import { useSessionStore } from '../stores/session.store'
import { useSaleStore } from '@/features/sales/stores/sale.store'
import { useHotelStore } from '@/features/hotels/stores/hotel.store'
import { useUserStore } from '@/features/users/stores/user.store'
import type { SesionFotografica } from '../domain/session.model'
import type { CitaVenta } from '@/features/sales/domain/sale.model'
import type { Hotel } from '@/features/hotels/domain/hotel.model'

export interface ExtendedEventProps {
  type?: 'session' | 'sale'
  rawSession?: SesionFotografica
  rawSale?: CitaVenta
  paxStr?: string
  fotografoPrimerNombre?: string
  fotografoNombre?: string | null
  fotografoApellidos?: string | null
  fotografoImagen?: string | null
  fotografoColor?: string | null
  roomStr?: string
  clienteNombre?: string
  iconType?: string
  [key: string]: unknown
}

export interface EventTooltipInfo {
  hotelNombre: string
  fotografoPrimerNombre: string
  fotografoNombreCompleto: string
  fotografoNombre?: string | null
  fotografoApellidos?: string | null
  fotografoImagen?: string | null
  fotografoColor?: string | null
  fechaCabecera: string
  habitacion: string
  clienteNombre: string
  checkout: string
  fechaCitaVenta: string
  adultosYNinos: string
  telefono: string
  email: string
  agendadoPor: string
  type: 'session' | 'sale'
  rawSession?: SesionFotografica
  rawSale?: CitaVenta
}

export function useCalendarEvents(
  userHotels: Ref<Hotel[]> | ComputedRef<Hotel[]>,
  selectedHotelId: Ref<number | null>,
  getCalendarEl: () => HTMLElement | null,
) {
  const sessionStore = useSessionStore()
  const saleStore = useSaleStore()
  const hotelStore = useHotelStore()
  const userStore = useUserStore()

  // Filtered events for FullCalendar (Photo Sessions + Sales Appointments)
  const calendarEvents = computed(() => {
    const allowedHotelIds = new Set(userHotels.value.map((h) => Number(h.id)))

    // 1. Photo Session events
    const sessionList = sessionStore.sessions.filter((s) => {
      if (!allowedHotelIds.has(Number(s.hotelId))) return false
      if (selectedHotelId.value) {
        return Number(s.hotelId) === Number(selectedHotelId.value)
      }
      return true
    })

    const sessionEvents = sessionList.map((session) => {
      let color = '#94a3b8' // Gris para sesiones sin fotógrafo asignado
      let fotografoPrimerNombre = ''
      let fotografoNombre: string | null = null
      let fotografoApellidos: string | null = null
      let fotografoImagen: string | null = null
      let fotografoColor: string | null = null
      if (session.fotografoId) {
        const fotografo = userStore.users.find((u) => String(u.id) === String(session.fotografoId))
        if (fotografo) {
          fotografoNombre = fotografo.nombre || null
          fotografoApellidos = fotografo.apellidos || null
          fotografoImagen = fotografo.imagen || null
          fotografoColor = fotografo.color || null
          color = fotografo.color || '#10b981'
          fotografoPrimerNombre = (fotografo.nombre ? fotografo.nombre.split(' ')[0] : '') || ''
        }
      }

      const paxStr = `[${session.numAdultos ?? 1}.${session.numNinos ?? 0} PAX]`
      const roomStr = session.numeroHabitacion ? `Hab ${session.numeroHabitacion}` : ''
      const clienteNombre = session.clienteNombre || 'Cliente'

      return {
        id: `session-${session.id}`,
        title: clienteNombre,
        start: session.fechaHoraInicio,
        backgroundColor: color,
        borderColor: color,
        extendedProps: {
          rawSession: session,
          type: 'session' as const,
          fotografoPrimerNombre,
          fotografoNombre,
          fotografoApellidos,
          fotografoImagen,
          fotografoColor,
          roomStr,
          clienteNombre,
          paxStr,
        },
      }
    })

    // 2. Sales Appointment events (merged from saleStore and sessionStore)
    const salesMap = new Map<
      number,
      {
        id: number
        sesionId: number
        hotelId: number
        fotografoId?: string | null
        fechaHoraCita: string
        estado: string
        clienteNombre: string
        numeroHabitacion?: string
        numAdultos?: number
        numNinos?: number
      }
    >()

    // Add from saleStore
    saleStore.citasVenta.forEach((c) => {
      const parentSession = sessionStore.sessions.find((s) => s.id === c.sesionId)
      const effectiveHotelId = parentSession ? Number(parentSession.hotelId) : Number(c.hotelId)

      salesMap.set(c.id, {
        id: c.id,
        sesionId: c.sesionId,
        hotelId: effectiveHotelId,
        fotografoId: c.fotografoId || parentSession?.fotografoId || null,
        fechaHoraCita: c.fechaHoraCita,
        estado: c.estado,
        clienteNombre: c.clienteNombre || parentSession?.clienteNombre || 'Cliente',
        numeroHabitacion: c.numeroHabitacion || parentSession?.numeroHabitacion || undefined,
        numAdultos: c.numAdultos ?? parentSession?.numAdultos,
        numNinos: c.numNinos ?? parentSession?.numNinos,
      })
    })

    // Add from embedded session citaVenta
    sessionStore.sessions.forEach((s) => {
      if (s.citaVenta && s.citaVenta.id) {
        if (!salesMap.has(s.citaVenta.id)) {
          salesMap.set(s.citaVenta.id, {
            id: s.citaVenta.id,
            sesionId: s.id,
            hotelId: Number(s.hotelId),
            fotografoId: s.fotografoId || null,
            fechaHoraCita: s.citaVenta.fechaHoraCita,
            estado: s.citaVenta.estado,
            clienteNombre: s.clienteNombre || 'Cliente',
            numeroHabitacion: s.numeroHabitacion || undefined,
            numAdultos: s.numAdultos,
            numNinos: s.numNinos,
          })
        }
      }
    })

    const salesList = Array.from(salesMap.values()).filter((c) => {
      if (!allowedHotelIds.has(Number(c.hotelId))) return false
      if (selectedHotelId.value) {
        return Number(c.hotelId) === Number(selectedHotelId.value)
      }
      return true
    })

    const salesEvents = salesList.map((sale) => {
      let fotografoId: string | null = sale.fotografoId || null
      let parentSession: SesionFotografica | undefined
      if (sale.sesionId) {
        parentSession = sessionStore.sessions.find((s) => s.id === sale.sesionId)
        if (!fotografoId && parentSession) {
          fotografoId = parentSession.fotografoId || null
        }
      }

      let color = '#94a3b8' // Gris para citas de venta sin fotógrafo asignado
      let fotografoPrimerNombre = ''
      let fotografoNombre: string | null = null
      let fotografoApellidos: string | null = null
      let fotografoImagen: string | null = null
      let fotografoColor: string | null = null
      if (fotografoId) {
        const fotografo = userStore.users.find((u) => String(u.id) === String(fotografoId))
        if (fotografo) {
          fotografoNombre = fotografo.nombre || null
          fotografoApellidos = fotografo.apellidos || null
          fotografoImagen = fotografo.imagen || null
          fotografoColor = fotografo.color || null
          color = fotografo.color || '#2563eb'
          fotografoPrimerNombre = (fotografo.nombre ? fotografo.nombre.split(' ')[0] : '') || ''
        }
      }

      const numAdultos = sale.numAdultos ?? parentSession?.numAdultos ?? 1
      const numNinos = sale.numNinos ?? parentSession?.numNinos ?? 0
      const paxStr = `[${numAdultos}.${numNinos} PAX]`
      const habitacionNum = sale.numeroHabitacion || parentSession?.numeroHabitacion
      const roomStr = habitacionNum ? `Hab ${habitacionNum}` : ''
      const clienteNombre = sale.clienteNombre || parentSession?.clienteNombre || 'Cliente'

      return {
        id: `sale-${sale.id}`,
        title: clienteNombre,
        start: sale.fechaHoraCita,
        backgroundColor: color,
        borderColor: color,
        extendedProps: {
          rawSale: sale,
          type: 'sale' as const,
          iconType: 'money',
          fotografoPrimerNombre,
          fotografoNombre,
          fotografoApellidos,
          fotografoImagen,
          fotografoColor,
          roomStr,
          clienteNombre,
          paxStr,
        },
      }
    })

    return [...sessionEvents, ...salesEvents]
  })

  // Map of ISO date (YYYY-MM-DD) -> total events count for mobile picker badges
  const eventsCountByDate = computed(() => {
    const map: Record<string, number> = {}
    for (const evt of calendarEvents.value) {
      if (!evt.start) continue
      const dateStr =
        typeof evt.start === 'string'
          ? evt.start.split('T')[0]
          : dayjs(evt.start).format('YYYY-MM-DD')
      if (dateStr) {
        map[dateStr] = (map[dateStr] || 0) + 1
      }
    }
    return map
  })

  function getEventCountForDate(dateOrDayjs: unknown): number {
    if (!dateOrDayjs) return 0
    const dateStr = dayjs(dateOrDayjs as Date | string).format('YYYY-MM-DD')
    return eventsCountByDate.value[dateStr] || 0
  }

  function getAssociatedEventId(
    event: EventApi | { id?: string; extendedProps?: ExtendedEventProps },
  ): string | null {
    const extendedProps = event.extendedProps
    if (!extendedProps) return null

    if (extendedProps.type === 'session' && extendedProps.rawSession) {
      const rawSession = extendedProps.rawSession
      if (rawSession.citaVenta?.id) {
        return `sale-${rawSession.citaVenta.id}`
      }
      const matchedSale = saleStore.citasVenta.find(
        (c) => Number(c.sesionId) === Number(rawSession.id),
      )
      if (matchedSale?.id) {
        return `sale-${matchedSale.id}`
      }
    } else if (extendedProps.type === 'sale' && extendedProps.rawSale) {
      const rawSale = extendedProps.rawSale
      if (rawSale.sesionId) {
        return `session-${rawSale.sesionId}`
      }
      const matchedSession = sessionStore.sessions.find(
        (s) => s.citaVenta && Number(s.citaVenta.id) === Number(rawSale.id),
      )
      if (matchedSession?.id) {
        return `session-${matchedSession.id}`
      }
    }

    return null
  }

  function highlightEventAndAssociated(hoveredEvent: EventApi) {
    const hoveredId = hoveredEvent.id
    const associatedId = getAssociatedEventId(hoveredEvent)

    const calendarEl = getCalendarEl()
    if (!calendarEl) return

    const allEventEls = calendarEl.querySelectorAll<HTMLElement>('.fc-event')
    allEventEls.forEach((el) => {
      const eventId =
        el.getAttribute('data-fc-event-id') ||
        el.querySelector('.jj-event-card-content')?.getAttribute('data-event-id')

      if (eventId === hoveredId) {
        el.classList.add('fc-event-hovered')
        el.classList.remove('fc-event-dimmed', 'fc-event-associated')
      } else if (associatedId && eventId === associatedId) {
        el.classList.add('fc-event-associated')
        el.classList.remove('fc-event-dimmed', 'fc-event-hovered')
      } else {
        el.classList.add('fc-event-dimmed')
        el.classList.remove('fc-event-hovered', 'fc-event-associated')
      }
    })
  }

  function clearEventHighlights() {
    const calendarEl = getCalendarEl()
    if (!calendarEl) return

    const allEventEls = calendarEl.querySelectorAll<HTMLElement>('.fc-event')
    allEventEls.forEach((el) => {
      el.classList.remove('fc-event-dimmed', 'fc-event-hovered', 'fc-event-associated')
    })
  }

  function formatEventHeaderDate(dateStr?: string | null): string {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr

    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    const meses = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ]

    const diaSemana = dias[d.getDay()]
    const diaMes = d.getDate()
    const mes = meses[d.getMonth()]
    const horas = d.getHours()
    const minutos = String(d.getMinutes()).padStart(2, '0')

    return `${diaSemana}, ${diaMes} ${mes} - ${horas}:${minutos}`
  }

  function formatDateTime(dateStr?: string | null): string {
    if (!dateStr) return '-'
    return dateStr.replace('T', ' ').slice(0, 16)
  }

  function formatDateStr(dateStr?: string | null): string {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  }

  function formatDateTimeStr(dateStr?: string | null): string {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${day}/${month}/${year} ${hours}:${minutes}`
  }

  function buildTooltipInfo(extendedProps: ExtendedEventProps): EventTooltipInfo {
    const { rawSession, rawSale, type } = extendedProps

    if (type === 'sale' && rawSale) {
      const parentSession = sessionStore.sessions.find((s) => s.id === rawSale.sesionId)
      const hotelId = rawSale.hotelId || parentSession?.hotelId
      const hotel = hotelStore.hotels.find((h) => Number(h.id) === Number(hotelId))
      const hotelNombre = hotel ? hotel.nombre : rawSale.hotelNombre || 'Hotel desconocido'

      const fotografoId = rawSale.fotografoId || parentSession?.fotografoId
      const fotografo = userStore.users.find((u) => String(u.id) === String(fotografoId))
      const fotografoPrimerNombre =
        (fotografo?.nombre ? fotografo.nombre.split(' ')[0] : '') || 'Sin asignar'
      const fotografoNombreCompleto = fotografo?.nombre
        ? `${fotografo.nombre} ${fotografo.apellidos || ''}`.trim()
        : 'Sin asignar'

      const agendadoUser = parentSession
        ? userStore.users.find((u) => String(u.id) === String(parentSession.creadorId))
        : null
      const agendadoPor = agendadoUser?.nombre
        ? `${agendadoUser.nombre} ${agendadoUser.apellidos || ''}`.trim()
        : '-'

      const numAdultos = rawSale.numAdultos ?? parentSession?.numAdultos ?? 1
      const numNinos = rawSale.numNinos ?? parentSession?.numNinos ?? 0

      return {
        hotelNombre,
        fotografoPrimerNombre,
        fotografoNombreCompleto,
        fotografoNombre: fotografo?.nombre || null,
        fotografoApellidos: fotografo?.apellidos || null,
        fotografoImagen: fotografo?.imagen || null,
        fotografoColor: fotografo?.color || null,
        fechaCabecera: formatEventHeaderDate(rawSale.fechaHoraCita),
        habitacion: rawSale.numeroHabitacion || parentSession?.numeroHabitacion || '-',
        clienteNombre: rawSale.clienteNombre || parentSession?.clienteNombre || '-',
        checkout: formatDateStr(parentSession?.fechaSalida),
        fechaCitaVenta: formatDateTimeStr(rawSale.fechaHoraCita),
        adultosYNinos: `${numAdultos} adulto(s), ${numNinos} niño(s)`,
        telefono: rawSale.clienteTelefono || parentSession?.clienteTelefono || '-',
        email: rawSale.clienteEmail || parentSession?.clienteEmail || '-',
        agendadoPor,
        type: 'sale',
        rawSale,
        rawSession: parentSession,
      }
    }

    // Otherwise type === 'session'
    const session = rawSession as SesionFotografica
    const hotel = hotelStore.hotels.find((h) => Number(h.id) === Number(session?.hotelId))
    const hotelNombre = hotel ? hotel.nombre : 'Hotel desconocido'

    const fotografo = userStore.users.find((u) => String(u.id) === String(session?.fotografoId))
    const fotografoPrimerNombre =
      (fotografo?.nombre ? fotografo.nombre.split(' ')[0] : '') || 'Sin asignar'
    const fotografoNombreCompleto = fotografo?.nombre
      ? `${fotografo.nombre} ${fotografo.apellidos || ''}`.trim()
      : 'Sin asignar'

    const agendadoUser = userStore.users.find((u) => String(u.id) === String(session?.creadorId))
    const agendadoPor = agendadoUser?.nombre
      ? `${agendadoUser.nombre} ${agendadoUser.apellidos || ''}`.trim()
      : '-'

    const numAdultos = session?.numAdultos ?? 1
    const numNinos = session?.numNinos ?? 0

    return {
      hotelNombre,
      fotografoPrimerNombre,
      fotografoNombreCompleto,
      fotografoNombre: fotografo?.nombre || null,
      fotografoApellidos: fotografo?.apellidos || null,
      fotografoImagen: fotografo?.imagen || null,
      fotografoColor: fotografo?.color || null,
      fechaCabecera: formatEventHeaderDate(session.fechaHoraInicio),
      habitacion: session?.numeroHabitacion || '-',
      clienteNombre: session?.clienteNombre || '-',
      checkout: formatDateStr(session?.fechaSalida),
      fechaCitaVenta: session?.citaVenta?.fechaHoraCita
        ? formatDateTimeStr(session.citaVenta.fechaHoraCita)
        : 'Sin cita',
      adultosYNinos: `${numAdultos} adulto(s), ${numNinos} niño(s)`,
      telefono: session?.clienteTelefono || '-',
      email: session?.clienteEmail || '-',
      agendadoPor,
      type: 'session',
      rawSession: session,
    }
  }

  return {
    calendarEvents,
    eventsCountByDate,
    getEventCountForDate,
    getAssociatedEventId,
    highlightEventAndAssociated,
    clearEventHighlights,
    formatEventHeaderDate,
    formatDateTime,
    formatDateStr,
    formatDateTimeStr,
    buildTooltipInfo,
  }
}
