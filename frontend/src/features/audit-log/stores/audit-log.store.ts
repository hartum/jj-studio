import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AuditLogEntry, AuditLogFilters, AuditLogResponse } from '../domain/audit-log.model'
import { useAuthStore } from '@/features/auth/stores/auth.store'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export const useAuditLogStore = defineStore('auditLog', () => {
  const authStore = useAuthStore()

  const logs = ref<AuditLogEntry[]>([])
  const total = ref(0)
  const currentPage = ref(1)
  const totalPages = ref(1)
  const limit = ref(30)
  const isLoading = ref(false)
  const isLoadingMore = ref(false)
  const errorMessage = ref<string | null>(null)

  const hasMore = computed(() => logs.value.length < total.value)

  function getAuthHeaders(): HeadersInit {
    const headers: Record<string, string> = {}
    if (authStore.token) {
      headers.Authorization = `Bearer ${authStore.token}`
    }
    return headers
  }

  async function fetchAuditLogs(filters: AuditLogFilters, reset = true) {
    if (reset) {
      isLoading.value = true
      currentPage.value = 1
    } else {
      isLoadingMore.value = true
    }
    errorMessage.value = null

    try {
      const params = new URLSearchParams()
      params.append('page', String(currentPage.value))
      params.append('limit', String(limit.value))

      if (filters.hotelId) {
        params.append('hotelId', String(filters.hotelId))
      }
      if (filters.usuarioId) {
        params.append('usuarioId', filters.usuarioId)
      }
      if (filters.clienteNombre && filters.clienteNombre.trim()) {
        params.append('clienteNombre', filters.clienteNombre.trim())
      }
      if (filters.accion) {
        params.append('accion', filters.accion)
      }
      if (filters.entidad) {
        params.append('entidad', filters.entidad)
      }

      if (filters.fechaRango && Array.isArray(filters.fechaRango)) {
        const [desde, hasta] = filters.fechaRango
        if (desde) {
          const dStr = (desde instanceof Date ? desde.toISOString() : String(desde)).slice(0, 10)
          params.append('fechaDesde', dStr)
        }
        if (hasta) {
          const hStr = (hasta instanceof Date ? hasta.toISOString() : String(hasta)).slice(0, 10)
          params.append('fechaHasta', hStr)
        }
      }

      const res = await fetch(`${API_URL}/audit-log?${params.toString()}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error al obtener el historial de actividad')
      }

      const result: AuditLogResponse = await res.json()
      if (reset) {
        logs.value = result.data
      } else {
        logs.value = [...logs.value, ...result.data]
      }
      total.value = result.total
      totalPages.value = result.totalPages
    } catch (err: unknown) {
      console.error('Error fetching audit logs:', err)
      errorMessage.value = err instanceof Error ? err.message : 'Error desconocido'
    } finally {
      isLoading.value = false
      isLoadingMore.value = false
    }
  }

  async function loadMore(filters: AuditLogFilters) {
    if (isLoading.value || isLoadingMore.value || !hasMore.value) return
    currentPage.value += 1
    await fetchAuditLogs(filters, false)
  }

  return {
    logs,
    total,
    currentPage,
    totalPages,
    limit,
    isLoading,
    isLoadingMore,
    errorMessage,
    hasMore,
    fetchAuditLogs,
    loadMore,
  }
})
