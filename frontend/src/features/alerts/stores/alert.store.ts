import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AlertaItem, AlertaFilters, AlertaListResponse } from '../domain/alert.model'
import { useAuthStore } from '@/features/auth/stores/auth.store'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export const useAlertStore = defineStore('alertStore', () => {
  const authStore = useAuthStore()

  const alerts = ref<AlertaItem[]>([])
  const total = ref(0)
  const unreadCount = ref(0)
  const criticalCount = ref(0)
  const readCount = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(100)
  const totalPages = ref(1)
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)

  function getAuthHeaders(hasBody = false): HeadersInit {
    const headers: Record<string, string> = {}
    if (authStore.token) {
      headers.Authorization = `Bearer ${authStore.token}`
    }
    if (hasBody) {
      headers['Content-Type'] = 'application/json'
    }
    return headers
  }

  async function fetchAlertas(filters: AlertaFilters = {}) {
    isLoading.value = true
    errorMessage.value = null

    try {
      const pageToFetch = filters.page !== undefined ? filters.page : currentPage.value
      const limitToFetch = filters.limit !== undefined ? filters.limit : pageSize.value

      const params = new URLSearchParams()
      params.append('page', String(pageToFetch))
      params.append('limit', String(limitToFetch))

      if (filters.leida && filters.leida !== 'all') {
        params.append('leida', filters.leida)
      }
      if (filters.tipoCaso) {
        params.append('tipoCaso', String(filters.tipoCaso))
      }
      if (filters.hotelId) {
        params.append('hotelId', String(filters.hotelId))
      }
      if (filters.search && filters.search.trim()) {
        params.append('search', filters.search.trim())
      }

      const res = await fetch(`${API_URL}/alertas?${params.toString()}`, {
        headers: getAuthHeaders(false),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Error al cargar alertas de seguridad')
      }

      const data: AlertaListResponse = await res.json()
      alerts.value = data.items
      total.value = data.total
      unreadCount.value = data.unreadCount
      criticalCount.value = data.criticalCount ?? 0
      readCount.value = data.readCount ?? 0
      currentPage.value = data.page
      pageSize.value = data.limit
      totalPages.value = data.totalPages
    } catch (err: unknown) {
      errorMessage.value = err instanceof Error ? err.message : 'Error al consultar alertas'
      console.error('Error al cargar alertas:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function fetchUnreadCount() {
    try {
      const res = await fetch(`${API_URL}/alertas/conteo-no-leidas`, {
        headers: getAuthHeaders(false),
      })
      if (res.ok) {
        const data = await res.json()
        unreadCount.value = data.unreadCount || 0
      }
    } catch (err) {
      console.error('Error al consultar conteo de alertas no leídas:', err)
    }
  }

  async function markAsRead(id: number, leida = true) {
    try {
      const res = await fetch(`${API_URL}/alertas/${id}/leida`, {
        method: 'PATCH',
        headers: getAuthHeaders(true),
        body: JSON.stringify({ leida }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Error al actualizar alerta')
      }

      const target = alerts.value.find((a) => a.id === id)
      if (target) {
        const wasUnread = !target.leida
        target.leida = leida
        if (leida) {
          target.leidaAt = new Date().toISOString()
          if (wasUnread && unreadCount.value > 0) {
            unreadCount.value--
          }
        } else {
          target.leidaAt = null
          if (!wasUnread) {
            unreadCount.value++
          }
        }
      }
    } catch (err) {
      console.error('Error al marcar alerta como leída:', err)
      throw err
    }
  }

  async function markAllAsRead() {
    try {
      const res = await fetch(`${API_URL}/alertas/marcar-todas-leidas`, {
        method: 'PATCH',
        headers: getAuthHeaders(false),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Error al marcar todas las alertas como leídas')
      }

      alerts.value.forEach((a) => {
        a.leida = true
        a.leidaAt = new Date().toISOString()
      })
      unreadCount.value = 0
    } catch (err) {
      console.error('Error al marcar todas las alertas como leídas:', err)
      throw err
    }
  }

  async function evaluateAlerts() {
    isLoading.value = true
    try {
      const res = await fetch(`${API_URL}/alertas/evaluar`, {
        method: 'POST',
        headers: getAuthHeaders(false),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Error al evaluar alertas')
      }
      await fetchAlertas({ page: 1 })
    } catch (err) {
      console.error('Error al evaluar alertas:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  return {
    alerts,
    total,
    unreadCount,
    criticalCount,
    readCount,
    currentPage,
    pageSize,
    totalPages,
    isLoading,
    errorMessage,
    fetchAlertas,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    evaluateAlerts,
  }
})
