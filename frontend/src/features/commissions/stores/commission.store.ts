import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  ComisionConfig,
  Comision,
  ResumenComisiones,
} from '../domain/commission.model'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export const useCommissionStore = defineStore('commission', () => {
  const configs = ref<ComisionConfig[]>([])
  const effectiveConfig = ref<ComisionConfig | null>(null)
  const comisiones = ref<Comision[]>([])
  const resumen = ref<ResumenComisiones | null>(null)
  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref<string | null>(null)

  function getHeaders(includeJson: boolean = false): HeadersInit {
    const token = localStorage.getItem('token')
    const headers: Record<string, string> = {}
    if (includeJson) {
      headers['Content-Type'] = 'application/json'
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }

  async function fetchConfigs(paisId?: number, hotelId?: number) {
    isLoading.value = true
    error.value = null
    try {
      const query = new URLSearchParams()
      if (paisId) query.append('paisId', String(paisId))
      if (hotelId) query.append('hotelId', String(hotelId))

      const res = await fetch(`${API_URL}/comisiones/config?${query.toString()}`, {
        headers: getHeaders(),
      })
      if (!res.ok) throw new Error('Error al cargar la configuración de comisiones')
      const data = await res.json()
      configs.value = data.configs || []
      effectiveConfig.value = data.effectiveConfig || null
      return data
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : String(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function saveConfig(configData: ComisionConfig) {
    isSaving.value = true
    error.value = null
    try {
      const res = await fetch(`${API_URL}/comisiones/config`, {
        method: 'PUT',
        headers: getHeaders(true),
        body: JSON.stringify(configData),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error al guardar la configuración de comisiones')
      }
      const saved = await res.json()
      await fetchConfigs(configData.paisId || undefined, configData.hotelId || undefined)
      return saved
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : String(err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function deleteConfig(id: number, paisId?: number, hotelId?: number) {
    isLoading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_URL}/comisiones/config/${id}`, {
        method: 'DELETE',
        headers: getHeaders(false),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error al eliminar la configuración de comisiones')
      }
      await fetchConfigs(paisId, hotelId)
      return true
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : String(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function fetchResumen(params?: {
    hotelId?: number
    hotelIds?: number[]
    anio?: number
    mes?: number
  }) {
    isLoading.value = true
    error.value = null
    try {
      const query = new URLSearchParams()
      if (params?.hotelIds && params.hotelIds.length > 0) {
        query.append('hotelIds', params.hotelIds.join(','))
      } else if (params?.hotelId) {
        query.append('hotelId', String(params.hotelId))
      }
      if (params?.anio) query.append('anio', String(params.anio))
      if (params?.mes) query.append('mes', String(params.mes))

      const res = await fetch(`${API_URL}/comisiones/resumen?${query.toString()}`, {
        headers: getHeaders(),
      })
      if (!res.ok) throw new Error('Error al obtener el resumen de comisiones')
      const data = await res.json()
      resumen.value = data
      return data
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : String(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function fetchComisiones(params?: {
    hotelId?: number
    hotelIds?: number[]
    usuarioId?: string
    anio?: number
    mes?: number
    rolEnVenta?: string
    estado?: string
  }) {
    isLoading.value = true
    error.value = null
    try {
      const query = new URLSearchParams()
      if (params?.hotelIds && params.hotelIds.length > 0) {
        query.append('hotelIds', params.hotelIds.join(','))
      } else if (params?.hotelId) {
        query.append('hotelId', String(params.hotelId))
      }
      if (params?.usuarioId) query.append('usuarioId', params.usuarioId)
      if (params?.anio) query.append('anio', String(params.anio))
      if (params?.mes) query.append('mes', String(params.mes))
      if (params?.rolEnVenta) query.append('rolEnVenta', params.rolEnVenta)
      if (params?.estado) query.append('estado', params.estado)

      const res = await fetch(`${API_URL}/comisiones?${query.toString()}`, {
        headers: getHeaders(),
      })
      if (!res.ok) throw new Error('Error al listar las comisiones')
      const data = await res.json()
      comisiones.value = data
      return data
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : String(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function updateEstadoComision(id: number, estado: string) {
    try {
      const res = await fetch(`${API_URL}/comisiones/${id}/estado`, {
        method: 'PATCH',
        headers: getHeaders(true),
        body: JSON.stringify({ estado }),
      })
      if (!res.ok) throw new Error('Error al actualizar el estado de la comisión')
      const updated = await res.json()
      const index = comisiones.value.findIndex((c) => c.id === id)
      if (index !== -1 && comisiones.value[index]) {
        comisiones.value[index]!.estado = estado
      }
      return updated
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : String(err)
      throw err
    }
  }

  return {
    configs,
    effectiveConfig,
    comisiones,
    resumen,
    isLoading,
    isSaving,
    error,
    fetchConfigs,
    saveConfig,
    deleteConfig,
    fetchResumen,
    fetchComisiones,
    updateEstadoComision,
  }
})
