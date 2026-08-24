import { ref, computed, type Ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { EventApi } from '@fullcalendar/core'
import { useSessionStore } from '../stores/session.store'
import { useSaleStore } from '@/features/sales/stores/sale.store'
import type { ExtendedEventProps, EventTooltipInfo } from './useCalendarEvents'

export type DeletableCalendarEvent = EventApi | EventTooltipInfo | ExtendedEventProps

export function useCalendarDelete(
  selectedHotelId: Ref<number | null>,
  onSuccess?: () => void,
) {
  const sessionStore = useSessionStore()
  const saleStore = useSaleStore()

  const deletePopoverVisible = ref(false)
  const deletePopoverTarget = ref<HTMLElement | null>(null)
  const pendingDeleteEvent = ref<DeletableCalendarEvent | null>(null)
  const deleteAssociated = ref(false)
  const isDeleting = ref(false)

  function hasAssociatedEvent(eventObj: DeletableCalendarEvent | null | undefined): boolean {
    if (!eventObj) return false
    const extendedProps =
      'extendedProps' in eventObj
        ? (eventObj.extendedProps as ExtendedEventProps)
        : (eventObj as ExtendedEventProps)
    const type = extendedProps?.type
    const rawSession = extendedProps?.rawSession
    const rawSale = extendedProps?.rawSale

    if (type === 'session' && rawSession) {
      if (rawSession.citaVenta) return true
      return saleStore.citasVenta.some((c) => Number(c.sesionId) === Number(rawSession.id))
    }

    if (type === 'sale' && rawSale) {
      if (rawSale.sesionId) {
        return sessionStore.sessions.some((s) => Number(s.id) === Number(rawSale.sesionId))
      }
    }

    return false
  }

  const associatedCheckboxLabel = computed(() => {
    if (!pendingDeleteEvent.value) return ''
    const extendedProps =
      'extendedProps' in pendingDeleteEvent.value
        ? (pendingDeleteEvent.value.extendedProps as ExtendedEventProps)
        : (pendingDeleteEvent.value as ExtendedEventProps)
    const type = extendedProps?.type

    if (type === 'session') {
      return 'Tb Borrar cita de ventas'
    }
    if (type === 'sale') {
      return 'Tb borrar sesión asociada'
    }
    return ''
  })

  function openDeleteConfirm(eventObj: DeletableCalendarEvent, e: MouseEvent) {
    e.stopPropagation()
    pendingDeleteEvent.value = eventObj
    deleteAssociated.value = false
    deletePopoverTarget.value = e.currentTarget as HTMLElement
    deletePopoverVisible.value = true
  }

  async function confirmDelete() {
    if (!pendingDeleteEvent.value) return
    isDeleting.value = true
    const extendedProps =
      'extendedProps' in pendingDeleteEvent.value
        ? (pendingDeleteEvent.value.extendedProps as ExtendedEventProps)
        : (pendingDeleteEvent.value as ExtendedEventProps)
    const type = extendedProps?.type
    const rawSession = extendedProps?.rawSession
    const rawSale = extendedProps?.rawSale
    const shouldDeleteAssociated = deleteAssociated.value

    try {
      if (type === 'sale' && rawSale?.id) {
        await saleStore.deleteCitaVenta(Number(rawSale.id), shouldDeleteAssociated)
        ElMessage.success(
          shouldDeleteAssociated
            ? 'Cita de venta y sesión asociada eliminadas correctamente'
            : 'Cita de venta eliminada correctamente',
        )
      } else if (rawSession?.id) {
        await sessionStore.deleteSession(Number(rawSession.id), shouldDeleteAssociated)
        ElMessage.success(
          shouldDeleteAssociated
            ? 'Sesión de fotos y cita de ventas asociadas eliminadas correctamente'
            : 'Sesión fotográfica eliminada correctamente',
        )
      }

      deletePopoverVisible.value = false
      if (onSuccess) {
        onSuccess()
      }

      await Promise.all([
        sessionStore.fetchSessions(selectedHotelId.value ? Number(selectedHotelId.value) : undefined),
        saleStore.fetchCitasVenta(selectedHotelId.value ? Number(selectedHotelId.value) : undefined),
      ])
    } catch (err: unknown) {
      ElMessage.error(err instanceof Error ? err.message : 'Error al eliminar el evento')
    } finally {
      isDeleting.value = false
      pendingDeleteEvent.value = null
    }
  }

  return {
    deletePopoverVisible,
    deletePopoverTarget,
    pendingDeleteEvent,
    deleteAssociated,
    isDeleting,
    hasAssociatedEvent,
    associatedCheckboxLabel,
    openDeleteConfirm,
    confirmDelete,
  }
}
