<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox, type InputInstance } from 'element-plus'
import {
  useEmailTemplates,
  type EmailTemplate,
  type VariableInfo,
} from '../composables/useEmailTemplates'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import {
  Check,
  Refresh,
  Message,
  Document,
  CopyDocument,
  InfoFilled,
  VideoPlay,
} from '@element-plus/icons-vue'
import { Eye, CodeXml } from '@lucide/vue'

defineProps<{
  embedded?: boolean
}>()

const authStore = useAuthStore()
const {
  templates,
  isLoading,
  isSaving,
  isResetting,
  isTestingReminders,
  fetchTemplates,
  updateTemplate,
  resetTemplate,
  triggerTestReminders,
} = useEmailTemplates()

const activeTab = ref<'RECORDATORIO_SESION' | 'RECORDATORIO_VENTA'>('RECORDATORIO_SESION')

// Local editable state per template type
const formState = ref<
  Record<
    'RECORDATORIO_SESION' | 'RECORDATORIO_VENTA',
    { asunto: string; cuerpoHtml: string; cuerpoTexto: string }
  >
>({
  RECORDATORIO_SESION: { asunto: '', cuerpoHtml: '', cuerpoTexto: '' },
  RECORDATORIO_VENTA: { asunto: '', cuerpoHtml: '', cuerpoTexto: '' },
})

// Current template metadata
const currentTemplate = computed<EmailTemplate | undefined>(() => {
  return templates.value.find((t) => t.tipo === activeTab.value)
})

const currentVariables = computed<VariableInfo[]>(() => {
  return currentTemplate.value?.variables || []
})

const categorizedVariables = computed(() => {
  const map: Record<string, VariableInfo[]> = {}
  for (const v of currentVariables.value) {
    const cat = v.category || 'General'
    if (!map[cat]) map[cat] = []
    map[cat].push(v)
  }
  return map
})

const isSuperOrAdmin = computed(() => {
  const role = authStore.user?.roleCode?.toUpperCase()
  return role === 'SUPERUSUARIO' || role === 'ADMIN'
})

// Selector de vista: 'preview' (por defecto) o 'code'
const viewMode = ref<'preview' | 'code'>('preview')

// Datos de ejemplo para resolver variables en la vista previa reactiva
const SAMPLE_MOCK_DATA: Record<string, string> = {
  '[nombre_cliente]': 'Alejandro Martínez',
  '[email_cliente]': 'alejandro.martinez@ejemplo.com',
  '[telefono_cliente]': '+52 998 123 4567',
  '[numero_habitacion]': '402',
  '[fecha_sesion]': '15 de Marzo, 2026',
  '[hora_sesion]': '10:30 AM',
  '[concepto]': 'Familiar / Playa',
  '[num_adultos]': '2',
  '[num_ninos]': '1',
  '[fecha_cita_venta]': '16 de Marzo, 2026',
  '[hora_cita_venta]': '16:00',
  '[lugar_cita_venta]': 'Lobby Principal / JJ Studio',
  '[hotel_nombre]': 'Grand Palladium Riviera Maya',
  '[area_nombre]': 'Riviera Maya',
  '[pais_nombre]': 'México',
  '[fotografo_nombre]': 'Carlos Mendoza',
  '[supervisor_nombre]': 'Laura Gómez',
  '[vendedor_nombre]': 'David Sánchez',
  '[notas]': 'Sesión al atardecer en la playa.',
}

function resolveVariables(template: string, data: Record<string, string>): string {
  if (!template) return ''
  let result = template
  for (const [k, v] of Object.entries(data)) {
    result = result.split(k).join(v)
  }
  return result
}

const previewSubject = computed(() => {
  const current = formState.value[activeTab.value]
  return resolveVariables(current.asunto || '', SAMPLE_MOCK_DATA)
})

const previewHtml = computed(() => {
  const current = formState.value[activeTab.value]
  return resolveVariables(current.cuerpoHtml || '', SAMPLE_MOCK_DATA)
})

// Textarea refs for variable insertion
const htmlEditorRef = ref<InputInstance | null>(null)
const subjectEditorRef = ref<InputInstance | null>(null)
const lastFocusedField = ref<'asunto' | 'cuerpoHtml'>('cuerpoHtml')

function syncFormWithTemplates() {
  for (const t of templates.value) {
    if (t.tipo === 'RECORDATORIO_SESION' || t.tipo === 'RECORDATORIO_VENTA') {
      formState.value[t.tipo] = {
        asunto: t.asunto || '',
        cuerpoHtml: t.cuerpoHtml || '',
        cuerpoTexto: t.cuerpoTexto || '',
      }
    }
  }
}

async function handleSave() {
  const current = formState.value[activeTab.value]
  if (!current.asunto.trim() || !current.cuerpoHtml.trim()) {
    ElMessage.warning('El asunto y el cuerpo HTML son obligatorios')
    return
  }

  try {
    await updateTemplate(activeTab.value, {
      asunto: current.asunto,
      cuerpoHtml: current.cuerpoHtml,
      cuerpoTexto: current.cuerpoTexto,
    })
    ElMessage.success('Plantilla de correo guardada con éxito')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al guardar la plantilla'
    ElMessage.error(message)
  }
}

async function handleReset() {
  try {
    await ElMessageBox.confirm(
      '¿Estás seguro de que deseas restablecer esta plantilla al diseño por defecto oficial de JJ Studio? Se perderán las modificaciones personalizadas no guardadas.',
      'Restablecer Plantilla',
      {
        confirmButtonText: 'Restablecer',
        cancelButtonText: 'Cancelar',
        type: 'warning',
      },
    )

    await resetTemplate(activeTab.value)
    syncFormWithTemplates()
    ElMessage.success('Plantilla restablecida a los valores por defecto')
  } catch {
    // cancelled or error
  }
}

async function handleTestReminders() {
  try {
    await ElMessageBox.confirm(
      'Esta acción buscará las citas y sesiones programadas para HOY y enviará un correo de recordatorio real a los clientes que tengan email registrado y aún no hayan recibido recordatorio.',
      'Disparar Recordatorios de Hoy',
      {
        confirmButtonText: 'Enviar Recordatorios',
        cancelButtonText: 'Cancelar',
        type: 'info',
      },
    )

    const res = await triggerTestReminders()
    const ses = res.result?.sesiones || { found: 0, sent: 0, failed: 0 }
    const sales = res.result?.citasVenta || { found: 0, sent: 0, failed: 0 }

    ElMessage.success(
      `Proceso completado: ${ses.sent} recordatorios de sesión enviados (${ses.found} encontradas) y ${sales.sent} de citas de venta (${sales.found} encontradas).`,
    )
  } catch (err: unknown) {
    if (err !== 'cancel') {
      const message = err instanceof Error ? err.message : 'Error al ejecutar recordatorios'
      ElMessage.error(message)
    }
  }
}

function insertVariable(varKey: string) {
  const field = lastFocusedField.value
  const current = formState.value[activeTab.value]

  if (field === 'asunto') {
    const inputEl = subjectEditorRef.value?.input as HTMLInputElement | undefined
    if (inputEl && typeof inputEl.selectionStart === 'number') {
      const start = inputEl.selectionStart
      const end = inputEl.selectionEnd || start
      current.asunto = current.asunto.substring(0, start) + varKey + current.asunto.substring(end)
      nextTick(() => {
        inputEl.focus()
        inputEl.setSelectionRange(start + varKey.length, start + varKey.length)
      })
    } else {
      current.asunto += ` ${varKey}`
    }
  } else {
    const textareaEl = htmlEditorRef.value?.textarea as HTMLTextAreaElement | undefined
    if (textareaEl && typeof textareaEl.selectionStart === 'number') {
      const start = textareaEl.selectionStart
      const end = textareaEl.selectionEnd || start
      current.cuerpoHtml =
        current.cuerpoHtml.substring(0, start) + varKey + current.cuerpoHtml.substring(end)
      nextTick(() => {
        textareaEl.focus()
        textareaEl.setSelectionRange(start + varKey.length, start + varKey.length)
      })
    } else {
      current.cuerpoHtml += varKey
    }
  }

  ElMessage.info({
    message: `Variable ${varKey} insertada`,
    duration: 1500,
  })
}

function copyVariableToClipboard(varKey: string) {
  navigator.clipboard.writeText(varKey)
  ElMessage.success({
    message: `Copiado: ${varKey}`,
    duration: 1500,
  })
}

onMounted(async () => {
  try {
    await fetchTemplates()
    syncFormWithTemplates()
  } catch (err) {
    console.error('Error al inicializar plantillas:', err)
  }
})
</script>

<template>
  <div :class="['email-templates-wrapper', { 'standalone-view': !embedded }]">
    <!-- Header (cuando no está incrustado en pestañas de configuración) -->
    <div v-if="!embedded" class="page-header">
      <div>
        <h1 class="page-title">Plantillas de Correo</h1>
        <p class="page-subtitle">
          Configura el asunto y contenido HTML de los emails automáticos que reciben los clientes el
          día de su cita.
        </p>
      </div>

      <div class="header-actions">
        <el-button
          v-if="isSuperOrAdmin"
          type="warning"
          plain
          :icon="VideoPlay"
          :loading="isTestingReminders"
          @click="handleTestReminders"
        >
          Probar Recordatorios Hoy
        </el-button>
      </div>
    </div>

    <!-- Pestañas de tipo de recordatorio y acciones -->
    <div class="email-templates-container" v-loading="isLoading">
      <div class="template-nav-bar">
        <el-tabs v-model="activeTab" type="card" class="type-tabs">
          <el-tab-pane label="📸 Recordatorio de Sesión" name="RECORDATORIO_SESION" />
          <el-tab-pane label="📅 Recordatorio de Cita de Venta" name="RECORDATORIO_VENTA" />
        </el-tabs>

        <div class="template-top-actions">
          <el-radio-group v-model="viewMode" size="default" class="view-mode-group">
            <el-radio-button value="preview" label="preview">
              <span class="radio-btn-content">
                <Eye :size="15" :stroke-width="2" class="btn-icon" />
                <span>Vista Previa</span>
              </span>
            </el-radio-button>
            <el-radio-button value="code" label="code">
              <span class="radio-btn-content">
                <CodeXml :size="15" :stroke-width="2" class="btn-icon" />
                <span>Código</span>
              </span>
            </el-radio-button>
          </el-radio-group>
        </div>
      </div>

      <!-- Panel de Contenido de los Tabs (Fondo Blanco) -->
      <div class="tab-content-panel">
        <!-- Modo 1: Vista Previa Renderizada en Vivo -->
        <div v-if="viewMode === 'preview'" class="preview-panel-view">
          <div class="preview-subject-bar">
            <span class="preview-subject-value">{{ previewSubject }}</span>
          </div>

          <div class="preview-iframe-wrapper">
            <iframe
              :srcdoc="previewHtml"
              class="preview-inline-iframe"
              sandbox="allow-same-origin"
              title="Vista previa del correo"
            />
          </div>
        </div>

        <!-- Modo 2: Editor de Código -->
        <div v-else class="editor-layout">
          <!-- Columna Izquierda: Formulario de Asunto y Código HTML -->
          <div class="editor-main">
            <!-- Asunto del Correo -->
            <div class="field-group">
              <label class="field-label">
                <el-icon :size="16"><Message /></el-icon>
                <span>Asunto del Correo (Subject)</span>
              </label>
              <el-input
                ref="subjectEditorRef"
                v-model="formState[activeTab].asunto"
                placeholder="Ej: 📸 Recordatorio: Tu sesión de fotos en [hotel_nombre] /Photo session appointment"
                size="large"
                clearable
                @focus="lastFocusedField = 'asunto'"
              />
              <p class="field-hint">
                Puedes insertar variables como
                <code>[hotel_nombre]</code>
                o
                <code>[fecha_sesion]</code>
                en el asunto.
              </p>
            </div>

            <!-- Cuerpo HTML -->
            <div class="field-group">
              <label class="field-label">
                <el-icon :size="16"><Document /></el-icon>
                <span>Cuerpo del Correo (HTML)</span>
              </label>

              <el-input
                ref="htmlEditorRef"
                v-model="formState[activeTab].cuerpoHtml"
                type="textarea"
                :rows="18"
                class="code-editor-textarea"
                placeholder="Pega o edita el código HTML aquí..."
                @focus="lastFocusedField = 'cuerpoHtml'"
              />
              <p class="field-hint">
                Soporta etiquetas HTML estándar y estilos en línea (CSS inline) compatibles con
                clientes de correo (Gmail, Outlook, Apple Mail).
              </p>
            </div>

            <!-- Texto Plano Fallback (Opcional / Colapsable) -->
            <el-collapse class="plaintext-collapse">
              <el-collapse-item
                title="Texto Alternativo en Plano (Plain Text Fallback)"
                name="plaintext"
              >
                <el-input
                  v-model="formState[activeTab].cuerpoTexto"
                  type="textarea"
                  :rows="6"
                  placeholder="Versión solo texto para clientes antiguos..."
                />
              </el-collapse-item>
            </el-collapse>

            <!-- Botones de Acción en la parte inferior -->
            <div class="editor-bottom-actions">
              <el-button
                type="primary"
                size="large"
                :icon="Check"
                :loading="isSaving"
                @click="handleSave"
              >
                Guardar Plantilla
              </el-button>

              <el-button
                v-if="isSuperOrAdmin"
                type="danger"
                plain
                size="large"
                :icon="Refresh"
                :loading="isResetting"
                @click="handleReset"
              >
                Restablecer plantilla por defecto
              </el-button>
            </div>
          </div>

          <!-- Columna Derecha: Selector de Variables Dinámicas -->
          <div class="variables-sidebar">
            <div class="variables-card">
              <div class="variables-header">
                <span class="variables-title">Variables Disponibles</span>
                <el-tooltip
                  content="Haz clic en cualquier variable para insertarla en la posición actual del cursor"
                  placement="top"
                >
                  <el-icon class="info-icon"><InfoFilled /></el-icon>
                </el-tooltip>
              </div>
              <p class="variables-desc">
                Haz clic en una variable para insertarla en el campo activo (Asunto o HTML):
              </p>

              <div class="variables-scroll">
                <div
                  v-for="(vars, category) in categorizedVariables"
                  :key="category"
                  class="category-block"
                >
                  <div class="category-title">{{ category }}</div>
                  <div class="pills-grid">
                    <div
                      v-for="v in vars"
                      :key="v.key"
                      class="variable-pill"
                      @click="insertVariable(v.key)"
                    >
                      <div class="pill-top">
                        <span class="pill-key">{{ v.key }}</span>
                        <el-button
                          type="info"
                          link
                          size="small"
                          :icon="CopyDocument"
                          title="Copiar al portapapeles"
                          @click.stop="copyVariableToClipboard(v.key)"
                        />
                      </div>
                      <div class="pill-label">{{ v.label }}</div>
                      <div class="pill-example">Ej: {{ v.example }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.email-templates-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 0.5rem;
}

.standalone-view {
  padding: 1.5rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.page-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
  margin: 0;
}

.page-subtitle {
  font-size: 0.9rem;
  color: var(--nav-link-color, #64748b);
  margin: 0.25rem 0 0 0;
}

.email-templates-container {
  width: 100%;
}

.template-nav-bar {
  position: relative;
  margin-bottom: 0;
}

.type-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
  border-bottom: 1px solid var(--toolbar-border, #e2e8f0);
}

.type-tabs :deep(.el-tabs__nav) {
  border-color: var(--toolbar-border, #e2e8f0);
  overflow: hidden;
}

.type-tabs :deep(.el-tabs__item) {
  background-color: var(--card-bg, #ffffff);
  border-left-color: var(--toolbar-border, #e2e8f0);
}

.type-tabs :deep(.el-tabs__item:not(.is-active)) {
  border-bottom: 1px solid var(--toolbar-border, #e2e8f0);
}

.template-top-actions {
  position: absolute;
  right: 1px;
  top: -5px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  z-index: 1;
}

.view-mode-group :deep(.el-radio-button:last-child .el-radio-button__inner) {
  border-right: 1px solid var(--toolbar-border, #e2e8f0);
}

.radio-btn-content {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.btn-icon {
  display: inline-block;
  vertical-align: middle;
}

.tab-content-panel {
  background-color: var(--card-bg, #ffffff);
  border: 1px solid var(--toolbar-border, #e2e8f0);
  border-top: none;
  border-radius: 0 0 12px 12px;
  padding: 1.75rem;
}

.editor-layout {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 1.5rem;
  align-items: start;
}

.editor-main {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.editor-bottom-actions {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  flex-wrap: wrap;
  padding-top: 0.5rem;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--heading-color, #0f172a);
}

.field-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.field-hint {
  font-size: 0.8rem;
  color: var(--nav-link-color, #64748b);
  margin: 0.25rem 0 0 0;

  code {
    background-color: var(--nav-link-hover-bg, #f1f5f9);
    padding: 2px 6px;
    border-radius: 4px;
    color: var(--color-primary, #3b82f6);
    font-size: 0.82rem;
  }
}

.code-editor-textarea :deep(textarea) {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
  font-size: 0.85rem;
  line-height: 1.45;
  background-color: #fafbfc;
  color: #1e293b;
  border-radius: 8px;
}

.plaintext-collapse {
  border: 1px solid var(--toolbar-border, #e2e8f0);
  border-radius: 8px;
  overflow: hidden;
}

/* Sidebar de Variables */
.variables-sidebar {
  position: sticky;
  top: 1rem;
}

.variables-card {
  background-color: #f8fafc;
  border: 1px solid var(--toolbar-border, #e2e8f0);
  border-radius: 10px;
  padding: 1rem;
}

.variables-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.variables-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
}

.info-icon {
  color: var(--nav-link-color, #64748b);
  cursor: pointer;
}

.variables-desc {
  font-size: 0.8rem;
  color: var(--nav-link-color, #64748b);
  margin: 0 0 0.75rem 0;
}

.variables-scroll {
  max-height: 520px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-right: 4px;
}

.category-block {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.category-title {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-primary, #3b82f6);
}

.pills-grid {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.variable-pill {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 0.45rem 0.6rem;
  cursor: pointer;
  transition: all 0.15s ease-in-out;

  &:hover {
    border-color: var(--color-primary, #3b82f6);
    background-color: #eff6ff;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.08);
  }
}

.pill-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pill-key {
  font-family: monospace;
  font-weight: 600;
  font-size: 0.82rem;
  color: #2563eb;
}

.pill-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #334155;
  margin-top: 2px;
}

.pill-example {
  font-size: 0.7rem;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Vista Previa Renderizada en Panel */
.preview-panel-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.preview-subject-bar {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.95rem;
  padding: 0.25rem 0;
}

.preview-subject-value {
  font-weight: 600;
  color: var(--heading-color, #0f172a);
}

.preview-iframe-wrapper {
  border: 1px solid var(--toolbar-border, #e2e8f0);
  border-radius: 8px;
  overflow: hidden;
  background-color: #f8fafc;
  min-height: 560px;
}

.preview-inline-iframe {
  width: 100%;
  height: 640px;
  border: none;
  display: block;
}

@media (max-width: 992px) {
  .editor-layout {
    grid-template-columns: 1fr;
  }

  .variables-sidebar {
    position: static;
  }
}
</style>
