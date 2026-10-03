import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  CitaVenta,
  CreateCitaVentaPayload,
  CreateVentaDirectaPayload,
  UpdateCitaVentaPayload,
  ConflictoCitaVenta,
} from '../domain/sale.model'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function getAuthHeaders(includeContentType = true): Record<string, string> {
  const headers: Record<string, string> = {}
  if (includeContentType) {
    headers['Content-Type'] = 'application/json'
  }
  const token = localStorage.getItem('token')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export const useSaleStore = defineStore('sales', () => {
  const citasVenta = ref<CitaVenta[]>([])
  const isLoading = ref(false)

  async function fetchCitasVenta(hotelId?: number) {
    isLoading.value = true
    try {
      const url = hotelId
        ? `${API_URL}/citas-venta?hotelId=${hotelId}`
        : `${API_URL}/citas-venta`
      const res = await fetch(url, { headers: getAuthHeaders() })
      if (res.ok) {
        citasVenta.value = await res.json()
      }
    } catch (err) {
      console.warn('Error al obtener citas de venta:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function fetchCitaVenta(id: number): Promise<CitaVenta | null> {
    try {
      const res = await fetch(`${API_URL}/citas-venta/${id}`, { headers: getAuthHeaders() })
      if (res.ok) {
        return await res.json()
      }
      return null
    } catch {
      return null
    }
  }

  async function addCitaVenta(payload: CreateCitaVentaPayload): Promise<CitaVenta & { conflictos?: ConflictoCitaVenta[] }> {
    isLoading.value = true
    try {
      const res = await fetch(`${API_URL}/citas-venta`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${res.status}: Error al crear la cita de venta`)
      }

      const created = await res.json()
      citasVenta.value.push(created)
      return created
    } finally {
      isLoading.value = false
    }
  }

  async function updateCitaVenta(
    id: number,
    payload: UpdateCitaVentaPayload,
  ): Promise<CitaVenta & { conflictos?: ConflictoCitaVenta[] }> {
    isLoading.value = true
    try {
      const res = await fetch(`${API_URL}/citas-venta/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${res.status}: Error al actualizar la cita de venta`)
      }

      const updated = await res.json()
      const index = citasVenta.value.findIndex((c) => c.id === id)
      if (index !== -1) {
        citasVenta.value[index] = updated
      }
      return updated
    } finally {
      isLoading.value = false
    }
  }

  async function deleteCitaVenta(id: number, deleteAssociated = false): Promise<void> {
    isLoading.value = true
    try {
      const url = deleteAssociated
        ? `${API_URL}/citas-venta/${id}?deleteSesion=true`
        : `${API_URL}/citas-venta/${id}`
      const res = await fetch(url, {
        method: 'DELETE',
        headers: getAuthHeaders(false),
      })
      if (res.ok) {
        citasVenta.value = citasVenta.value.filter((c) => c.id !== id)
      } else {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `Error al eliminar la cita de venta`)
      }
    } finally {
      isLoading.value = false
    }
  }

  async function checkConflictos(
    hotelId: number,
    fechaHoraCita: string,
    excludeId?: number,
  ): Promise<ConflictoCitaVenta[]> {
    try {
      const params = new URLSearchParams({
        hotelId: String(hotelId),
        fechaHoraCita,
      })
      if (excludeId) params.set('excludeId', String(excludeId))

      const res = await fetch(`${API_URL}/citas-venta/conflictos?${params}`, {
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        return await res.json()
      }
      return []
    } catch {
      return []
    }
  }

  async function addVentaDirecta(payload: CreateVentaDirectaPayload): Promise<CitaVenta> {
    isLoading.value = true
    try {
      const res = await fetch(`${API_URL}/ventas-directas`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${res.status}: Error al crear la venta directa`)
      }

      const created = await res.json()
      citasVenta.value.push(created)
      return created
    } finally {
      isLoading.value = false
    }
  }

  return {
    citasVenta,
    isLoading,
    fetchCitasVenta,
    fetchCitaVenta,
    addCitaVenta,
    addVentaDirecta,
    updateCitaVenta,
    deleteCitaVenta,
    checkConflictos,
  }
})
