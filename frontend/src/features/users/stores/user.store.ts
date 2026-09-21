import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, UserWithProfile } from '../domain/user.model'
import { useProfileStore } from './profile.store'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export const useUserStore = defineStore('users', () => {
  const profileStore = useProfileStore()
  const users = ref<User[]>([])
  const isLoading = ref(false)

  const usersWithProfile = computed<UserWithProfile[]>(() => {
    return users.value
      .filter((u) => !u.deletedAt)
      .map((u) => ({
        ...u,
        perfil: profileStore.getProfileById(u.profileId),
      }))
  })

  async function fetchUsers() {
    isLoading.value = true
    try {
      if (profileStore.profiles.length === 0) {
        await profileStore.fetchProfiles()
      }
      const res = await fetch(`${API_URL}/usuarios`)
      if (res.ok) {
        users.value = await res.json()
      } else {
        throw new Error(`HTTP ${res.status}: Error al cargar usuarios`)
      }
    } catch (err) {
      console.error('Error fetching users from DB:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function addUser(userData: Omit<User, 'id' | 'createdAt' | 'deletedAt'>) {
    try {
      const res = await fetch(`${API_URL}/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(
          errorData.error || `HTTP ${res.status}: Error al guardar en la base de datos`,
        )
      }
      const created: User = await res.json()
      users.value.unshift(created)
      return created
    } catch (err) {
      console.error('Error creating user in DB:', err)
      throw err
    }
  }

  async function updateUser(
    id: string,
    updatedData: Partial<Omit<User, 'id' | 'createdAt' | 'deletedAt'>>,
  ) {
    try {
      const res = await fetch(`${API_URL}/usuarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(
          errorData.error || `HTTP ${res.status}: Error al actualizar en la base de datos`,
        )
      }
      const updated: User = await res.json()
      const index = users.value.findIndex((u) => u.id === id)
      if (index !== -1) {
        users.value[index] = updated
      }
      return updated
    } catch (err) {
      console.error('Error updating user in DB:', err)
      throw err
    }
  }

  async function deleteUser(id: string) {
    try {
      const res = await fetch(`${API_URL}/usuarios/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(
          errorData.error || `HTTP ${res.status}: Error al eliminar en la base de datos`,
        )
      }
      const user = users.value.find((u) => u.id === id)
      if (user) {
        user.deletedAt = new Date().toISOString().split('T')[0] ?? ''
      }
    } catch (err) {
      console.error('Error deleting user in DB:', err)
      throw err
    }
  }

  async function updateUserColor(id: string, color: string | null) {
    try {
      const token = localStorage.getItem('token')
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      const res = await fetch(`${API_URL}/usuarios/${id}/color`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ color }),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${res.status}: Error al actualizar el color`)
      }
      const data = await res.json()
      const user = users.value.find((u) => u.id === id)
      if (user) {
        user.color = data.color
      }
      return data
    } catch (err) {
      console.error('Error updating user color:', err)
      throw err
    }
  }

  async function updateUserAvatar(id: string, imagen: string | null) {
    try {
      const token = localStorage.getItem('token')
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      const res = await fetch(`${API_URL}/usuarios/${id}/avatar`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ imagen }),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${res.status}: Error al actualizar la foto`)
      }
      const data = await res.json()
      const user = users.value.find((u) => u.id === id)
      if (user) {
        user.imagen = data.imagen ?? null
      }
      return data
    } catch (err) {
      console.error('Error updating user avatar:', err)
      throw err
    }
  }

  return {
    users,
    usersWithProfile,
    isLoading,
    fetchUsers,
    addUser,
    updateUser,
    updateUserColor,
    updateUserAvatar,
    deleteUser,
  }
})
