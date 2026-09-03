import { ref } from 'vue'
import { useAuthStore } from '@/features/auth/stores/auth.store'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export interface VariableInfo {
  key: string
  label: string
  example: string
  category: string
}

export interface EmailTemplate {
  id: number
  tipo: 'RECORDATORIO_SESION' | 'RECORDATORIO_VENTA'
  asunto: string
  cuerpoHtml: string
  cuerpoTexto: string
  updatedAt: string
  variables?: VariableInfo[]
}

export interface PreviewResult {
  asunto: string
  html: string
  text: string
  mockData: Record<string, string>
}

export function useEmailTemplates() {
  const authStore = useAuthStore()
  const templates = ref<EmailTemplate[]>([])
  const allVariables = ref<VariableInfo[]>([])
  const isLoading = ref(false)
  const isSaving = ref(false)
  const isPreviewing = ref(false)
  const isResetting = ref(false)
  const isTestingReminders = ref(false)

  function getHeaders(hasBody = false): HeadersInit {
    const headers: Record<string, string> = {}
    if (authStore.token) {
      headers['Authorization'] = `Bearer ${authStore.token}`
    }
    if (hasBody) {
      headers['Content-Type'] = 'application/json'
    }
    return headers
  }

  async function fetchTemplates() {
    isLoading.value = true
    try {
      const res = await fetch(`${API_URL}/plantillas-email`, {
        headers: getHeaders(false),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error al cargar las plantillas de correo')
      }
      const data = await res.json()
      templates.value = data.plantillas || []
      allVariables.value = data.variablesDisponibles || []
      return data
    } catch (err) {
      console.error('Error fetching templates:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function updateTemplate(
    tipo: 'RECORDATORIO_SESION' | 'RECORDATORIO_VENTA',
    payload: { asunto: string; cuerpoHtml: string; cuerpoTexto?: string }
  ) {
    isSaving.value = true
    try {
      const res = await fetch(`${API_URL}/plantillas-email/${tipo}`, {
        method: 'PUT',
        headers: getHeaders(true),
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error al guardar la plantilla')
      }
      const data = await res.json()
      await fetchTemplates()
      return data
    } catch (err) {
      console.error('Error updating template:', err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function previewTemplate(
    tipo: 'RECORDATORIO_SESION' | 'RECORDATORIO_VENTA',
    draft?: { asunto?: string; cuerpoHtml?: string; cuerpoTexto?: string }
  ): Promise<PreviewResult> {
    isPreviewing.value = true
    try {
      const res = await fetch(`${API_URL}/plantillas-email/${tipo}/preview`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify(draft || {}),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error al generar la vista previa')
      }
      return (await res.json()) as PreviewResult
    } catch (err) {
      console.error('Error generating preview:', err)
      throw err
    } finally {
      isPreviewing.value = false
    }
  }

  async function resetTemplate(tipo: 'RECORDATORIO_SESION' | 'RECORDATORIO_VENTA') {
    isResetting.value = true
    try {
      const res = await fetch(`${API_URL}/plantillas-email/${tipo}/reset`, {
        method: 'POST',
        headers: getHeaders(false),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error al restablecer la plantilla')
      }
      const data = await res.json()
      await fetchTemplates()
      return data
    } catch (err) {
      console.error('Error resetting template:', err)
      throw err
    } finally {
      isResetting.value = false
    }
  }

  async function triggerTestReminders(targetDate?: string) {
    isTestingReminders.value = true
    try {
      const res = await fetch(`${API_URL}/recordatorios/test-run`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({ fecha: targetDate }),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error al disparar recordatorios de prueba')
      }
      return await res.json()
    } catch (err) {
      console.error('Error triggering test reminders:', err)
      throw err
    } finally {
      isTestingReminders.value = false
    }
  }

  return {
    templates,
    allVariables,
    isLoading,
    isSaving,
    isPreviewing,
    isResetting,
    isTestingReminders,
    fetchTemplates,
    updateTemplate,
    previewTemplate,
    resetTemplate,
    triggerTestReminders,
  }
}
