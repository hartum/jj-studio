import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  Meta,
  SaveMetaPayload,
  HotelProgresoResumen,
  EvolucionMetasResponse,
} from '../domain/goal.model'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = localStorage.getItem('token')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export const useGoalStore = defineStore('goals', () => {
  const metas = ref<Meta[]>([])
  const progresoHoteles = ref<HotelProgresoResumen[]>([])
  const evolucion = ref<EvolucionMetasResponse | null>(null)
  const isLoading = ref(false)

  async function fetchMetas(params?: {
    hotelId?: number
    anio?: number
    mes?: number
    usuarioId?: string
  }) {
    isLoading.value = true
    try {
      const query = new URLSearchParams()
      if (params?.hotelId) query.set('hotelId', String(params.hotelId))
      if (params?.anio) query.set('anio', String(params.anio))
      if (params?.mes) query.set('mes', String(params.mes))
      if (params?.usuarioId) query.set('usuarioId', params.usuarioId)

      const url = `${API_URL}/metas${query.toString() ? `?${query}` : ''}`
      const res = await fetch(url, { headers: getAuthHeaders() })
      if (res.ok) {
        metas.value = await res.json()
      }
    } catch (err) {
      console.warn('Error al obtener metas:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function fetchProgreso(params?: {
    hotelId?: number
    hotelIds?: number[]
    anio?: number
    mes?: number
  }) {
    isLoading.value = true
    try {
      const query = new URLSearchParams()
      if (params?.hotelIds && params.hotelIds.length > 0) {
        query.set('hotelIds', params.hotelIds.join(','))
      } else if (params?.hotelId) {
        query.set('hotelId', String(params.hotelId))
      }
      if (params?.anio) query.set('anio', String(params.anio))
      if (params?.mes) query.set('mes', String(params.mes))

      const url = `${API_URL}/metas/progreso${query.toString() ? `?${query}` : ''}`
      const res = await fetch(url, { headers: getAuthHeaders() })
      if (res.ok) {
        progresoHoteles.value = await res.json()
      }
    } catch (err) {
      console.warn('Error al obtener progreso de metas:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function fetchEvolucion(params?: {
    hotelId?: number
    hotelIds?: number[]
    anio?: number
    mes?: number
  }) {
    isLoading.value = true
    try {
      const query = new URLSearchParams()
      if (params?.hotelIds && params.hotelIds.length > 0) {
        query.set('hotelIds', params.hotelIds.join(','))
      } else if (params?.hotelId) {
        query.set('hotelId', String(params.hotelId))
      }
      if (params?.anio) query.set('anio', String(params.anio))
      if (params?.mes) query.set('mes', String(params.mes))

      const url = `${API_URL}/metas/evolucion${query.toString() ? `?${query}` : ''}`
      const res = await fetch(url, { headers: getAuthHeaders() })
      if (res.ok) {
        evolucion.value = await res.json()
      }
    } catch (err) {
      console.warn('Error al obtener evolución de metas:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function saveMeta(payload: SaveMetaPayload): Promise<Meta> {
    isLoading.value = true
    try {
      const res = await fetch(`${API_URL}/metas`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${res.status}: Error al guardar la meta`)
      }

      const saved = await res.json()
      const index = metas.value.findIndex((m) => m.id === saved.id)
      if (index !== -1) {
        metas.value[index] = saved
      } else {
        metas.value.push(saved)
      }
      return saved
    } finally {
      isLoading.value = false
    }
  }

  async function deleteMeta(id: number): Promise<void> {
    isLoading.value = true
    try {
      const res = await fetch(`${API_URL}/metas/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        metas.value = metas.value.filter((m) => m.id !== id)
      }
    } finally {
      isLoading.value = false
    }
  }

  return {
    metas,
    progresoHoteles,
    evolucion,
    isLoading,
    fetchMetas,
    fetchProgreso,
    fetchEvolucion,
    saveMeta,
    deleteMeta,
  }
})
