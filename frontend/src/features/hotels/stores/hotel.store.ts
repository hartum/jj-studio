import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  Hotel,
  CreateHotelPayload,
  UpdateHotelPayload,
  GoogleCalendarConfigPayload,
  GoogleCalendarTestResult,
} from '../domain/hotel.model'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function getAuthHeaders(hasBody = false): HeadersInit {
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  if (hasBody) {
    headers['Content-Type'] = 'application/json'
  }
  return headers
}

export const useHotelStore = defineStore('hotels', () => {
  const hotels = ref<Hotel[]>([])
  const isLoading = ref(false)

  async function fetchHotels() {
    isLoading.value = true
    try {
      const res = await fetch(`${API_URL}/hoteles`, {
        headers: getAuthHeaders(false),
      })
      if (res.ok) {
        hotels.value = await res.json()
      }
    } catch (err) {
      console.error('Error fetching hotels:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function addHotel(payload: CreateHotelPayload) {
    try {
      const res = await fetch(`${API_URL}/hoteles`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error al guardar el hotel')
      }
      await fetchHotels()
    } catch (err) {
      console.error('Error adding hotel:', err)
      throw err
    }
  }

  async function updateHotel(id: number, payload: UpdateHotelPayload) {
    try {
      const res = await fetch(`${API_URL}/hoteles/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(true),
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error al actualizar el hotel')
      }
      await fetchHotels()
    } catch (err) {
      console.error('Error updating hotel:', err)
      throw err
    }
  }

  async function deleteHotel(id: number) {
    try {
      const res = await fetch(`${API_URL}/hoteles/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(false),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error al eliminar el hotel')
      }
      await fetchHotels()
    } catch (err) {
      console.error('Error deleting hotel:', err)
      throw err
    }
  }

  async function saveGoogleCalendarConfig(id: number, payload: GoogleCalendarConfigPayload) {
    try {
      const res = await fetch(`${API_URL}/hoteles/${id}/google-calendar`, {
        method: 'PUT',
        headers: getAuthHeaders(true),
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error al configurar Google Calendar')
      }
      await fetchHotels()
    } catch (err) {
      console.error('Error saving Google Calendar config:', err)
      throw err
    }
  }

  async function disconnectGoogleCalendar(id: number) {
    try {
      const res = await fetch(`${API_URL}/hoteles/${id}/google-calendar`, {
        method: 'DELETE',
        headers: getAuthHeaders(false),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error al desconectar Google Calendar')
      }
      await fetchHotels()
    } catch (err) {
      console.error('Error disconnecting Google Calendar:', err)
      throw err
    }
  }

  async function testGoogleCalendar(
    id: number,
    payload?: { calendarId?: string; serviceAccountJson?: string },
  ): Promise<GoogleCalendarTestResult> {
    try {
      const hasPayload = Boolean(payload?.calendarId || payload?.serviceAccountJson)
      const res = await fetch(`${API_URL}/hoteles/${id}/google-calendar/test`, {
        method: hasPayload ? 'POST' : 'GET',
        headers: getAuthHeaders(hasPayload),
        ...(hasPayload ? { body: JSON.stringify(payload) } : {}),
      })
      const data = await res.json()
      return data
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error al probar conexión con Google Calendar',
      }
    }
  }

  return {
    hotels,
    isLoading,
    fetchHotels,
    addHotel,
    updateHotel,
    deleteHotel,
    saveGoogleCalendarConfig,
    disconnectGoogleCalendar,
    testGoogleCalendar,
  }
})
