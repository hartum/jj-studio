import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export interface AuthUser {
  id: string
  nombre: string
  apellidos: string
  email: string
  telefono: string
  profileId: number
  roleCode: string
  roleName: string
  tipoContrato?: string
  imagen?: string | null
  color?: string | null
  areaIds?: number[]
  hotelIds?: number[]
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<AuthUser | null>(
    localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null,
  )

  const isAuthenticated = computed(() => !!token.value)

  async function login(email: string, password: string) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData.error || 'Error al iniciar sesión')
    }

    const data = await res.json()
    token.value = data.token
    user.value = data.user

    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))

    return data
  }

  function logout() {
    if (token.value) {
      // Registrar evento de logout en el backend de forma asíncrona
      fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
      }).catch(() => {})
    }
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return {
    token,
    user,
    isAuthenticated,
    login,
    logout,
  }
})
