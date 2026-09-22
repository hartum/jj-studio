<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHotelStore } from '../stores/hotel.store'
import { useCountryStore } from '@/features/countries/stores/country.store'
import type { GoogleCalendarTestResult } from '../domain/hotel.model'
import { getFlagEmoji } from '@/shared/flagEmoji'
import { useLocale } from '@/i18n/useLocale'
import { ArrowLeft, Check, Close, Delete, DocumentCopy, Refresh, Upload } from '@element-plus/icons-vue'
import { Calendar } from '@lucide/vue'
import { ElMessage } from 'element-plus'

const { t } = useLocale()
const route = useRoute()
const router = useRouter()
const hotelStore = useHotelStore()
const countryStore = useCountryStore()

const hotelId = computed(() => {
  const param = route.params.id as string | undefined
  return param ? Number(param) : undefined
})

const isEditing = computed(() => !!hotelId.value)
const isSaving = ref(false)

const isMobile = ref(false)

function checkMobile() {
  isMobile.value = window.innerWidth <= 768
}

const formData = ref({
  areaId: null as number | null,
  nombre: '',
  direccion: '',
  estrellas: 5,
  cadenaHotelera: '',
  personaContacto: '',
  email: '',
  telefono: '',
  latitud: null as number | null,
  longitud: null as number | null,
  gcalCalendarId: '',
  gcalServiceAccountEmail: '',
  gcalConfigured: false,
})

const serviceAccountJson = ref('')
const isTestingGcal = ref(false)
const gcalTestResult = ref<GoogleCalendarTestResult | null>(null)
const isDisconnectingGcal = ref(false)

// Service Account compartida por defecto (Opción A)
const defaultServiceAccountEmail = 'jj-studio-calendar-sync@jj-studio-calendar.iam.gserviceaccount.com'

const activeServiceAccountEmail = computed(() => {
  return formData.value.gcalServiceAccountEmail || defaultServiceAccountEmail
})

onMounted(async () => {
  checkMobile()
  window.addEventListener('resize', checkMobile)

  await countryStore.fetchCountries()
  await hotelStore.fetchHotels()

  if (isEditing.value && hotelId.value) {
    const existing = hotelStore.hotels.find((h) => h.id === hotelId.value)
    if (existing) {
      formData.value = {
        areaId: existing.areaId,
        nombre: existing.nombre,
        direccion: existing.direccion || '',
        estrellas: existing.estrellas || 5,
        cadenaHotelera: existing.cadenaHotelera || '',
        personaContacto: existing.personaContacto || '',
        email: existing.email || '',
        telefono: existing.telefono || '',
        latitud: existing.latitud || null,
        longitud: existing.longitud || null,
        gcalCalendarId: existing.gcalCalendarId || '',
        gcalServiceAccountEmail: existing.gcalServiceAccountEmail || '',
        gcalConfigured: existing.gcalConfigured ?? !!existing.gcalCalendarId,
      }
    } else {
      ElMessage.error(t('hotelsConfig.toasts.hotelNotFound'))
      router.push('/configuracion?tab=hoteles')
    }
  } else {
    // Si es nuevo hotel, seleccionar por defecto la primera área si existe
    const firstArea = allAreasFlat.value[0]
    if (firstArea) {
      formData.value.areaId = firstArea.id
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

// Lista plana de todas las áreas activas con su país para el selector
const allAreasFlat = computed(() => {
  const result: Array<{ id: number; nombre: string; paisNombre: string; paisCodigo: string }> = []
  for (const pais of countryStore.countries) {
    if (pais.areas) {
      for (const area of pais.areas) {
        result.push({
          id: area.id,
          nombre: area.nombre,
          paisNombre: pais.nombre,
          paisCodigo: pais.codigo,
        })
      }
    }
  }
  return result
})

function handleCancel() {
  router.push('/configuracion?tab=hoteles')
}

function handleJsonFileChange(file: { raw: File }) {
  if (!file.raw) return
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const text = e.target?.result as string
      const parsed = JSON.parse(text)
      serviceAccountJson.value = text
      if (parsed.client_email) {
        formData.value.gcalServiceAccountEmail = parsed.client_email
      }
      ElMessage.success('Archivo JSON de Service Account cargado correctamente')
    } catch {
      ElMessage.error('El archivo no es un JSON válido')
    }
  }
  reader.readAsText(file.raw)
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
  ElMessage.success('Copiado al portapapeles')
}

async function handleTestGcal() {
  if (!hotelId.value) return
  isTestingGcal.value = true
  gcalTestResult.value = null
  try {
    const result = await hotelStore.testGoogleCalendar(hotelId.value, {
      calendarId: formData.value.gcalCalendarId?.trim() || undefined,
      serviceAccountJson: serviceAccountJson.value?.trim() || undefined,
    })
    gcalTestResult.value = result
    if (result.success) {
      ElMessage.success(t('hotelsConfig.googleCalendar.connectionSuccess'))
    } else {
      ElMessage.error(result.error || t('hotelsConfig.googleCalendar.testConnectionError'))
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al probar conexión'
    ElMessage.error(msg)
  } finally {
    isTestingGcal.value = false
  }
}

async function handleDisconnectGcal() {
  if (!hotelId.value) return
  isDisconnectingGcal.value = true
  try {
    await hotelStore.disconnectGoogleCalendar(hotelId.value)
    formData.value.gcalCalendarId = ''
    formData.value.gcalServiceAccountEmail = ''
    formData.value.gcalConfigured = false
    serviceAccountJson.value = ''
    gcalTestResult.value = null
    ElMessage.success(t('hotelsConfig.googleCalendar.calendarDisconnected'))
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al desconectar'
    ElMessage.error(msg)
  } finally {
    isDisconnectingGcal.value = false
  }
}

async function handleSave() {
  if (!formData.value.nombre.trim() || !formData.value.areaId) {
    ElMessage.warning(t('hotelsConfig.toasts.requiredFields'))
    return
  }

  isSaving.value = true
  try {
    const payload = {
      areaId: formData.value.areaId,
      nombre: formData.value.nombre.trim(),
      direccion: formData.value.direccion,
      estrellas: formData.value.estrellas,
      cadenaHotelera: formData.value.cadenaHotelera,
      personaContacto: formData.value.personaContacto,
      email: formData.value.email,
      telefono: formData.value.telefono,
      gcalCalendarId: formData.value.gcalCalendarId ? formData.value.gcalCalendarId.trim() : undefined,
      gcalServiceAccountEmail: formData.value.gcalServiceAccountEmail ? formData.value.gcalServiceAccountEmail.trim() : undefined,
      serviceAccountJson: serviceAccountJson.value ? serviceAccountJson.value.trim() : undefined,
    }

    if (isEditing.value && hotelId.value) {
      await hotelStore.updateHotel(hotelId.value, payload)
      ElMessage.success(t('hotelsConfig.toasts.hotelUpdated'))
    } else {
      await hotelStore.addHotel(payload)
      ElMessage.success(t('hotelsConfig.toasts.hotelCreated'))
    }
    router.push('/configuracion?tab=hoteles')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t('hotelsConfig.toasts.saveError')
    ElMessage.error(message)
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="view-container">
    <!-- Header con botón Volver y Título -->
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" circle class="back-btn" @click="handleCancel" />
        <div>
          <h1 class="page-title">
            {{ isEditing ? t('hotelsConfig.form.titleEdit') : t('hotelsConfig.form.titleNew') }}
          </h1>
          <p class="page-subtitle">
            {{
              isEditing
                ? t('hotelsConfig.form.subtitleEdit')
                : t('hotelsConfig.form.subtitleNew')
            }}
          </p>
        </div>
      </div>
    </div>

    <!-- Formulario alineado -->
    <el-form
      :model="formData"
      :label-width="isMobile ? 'auto' : '170px'"
      :label-position="isMobile ? 'top' : 'left'"
      :size="isMobile ? 'large' : 'default'"
      class="hotel-form"
      @submit.prevent="handleSave"
    >
      <el-form-item :label="t('hotelsConfig.form.hotelNameRequired')" required>
        <el-input v-model="formData.nombre" :placeholder="t('hotelsConfig.form.hotelNamePlaceholder')" />
      </el-form-item>

      <el-form-item :label="t('hotelsConfig.form.assignedAreaRequired')" required>
        <el-select v-model="formData.areaId" :placeholder="t('hotelsConfig.form.selectAreaPlaceholder')" style="width: 100%">
          <el-option
            v-for="area in allAreasFlat"
            :key="area.id"
            :label="`${getFlagEmoji(area.paisCodigo)} ${area.nombre} (${area.paisNombre})`"
            :value="area.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item :label="t('hotelsConfig.form.hotelChain')">
        <el-input
          v-model="formData.cadenaHotelera"
          :placeholder="t('hotelsConfig.form.hotelChainPlaceholder')"
        />
      </el-form-item>

      <el-form-item :label="t('hotelsConfig.form.stars')">
        <el-rate v-model="formData.estrellas" />
      </el-form-item>

      <el-form-item :label="t('hotelsConfig.form.contactPerson')">
        <el-input
          v-model="formData.personaContacto"
          :placeholder="t('hotelsConfig.form.contactPersonPlaceholder')"
        />
      </el-form-item>

      <el-form-item :label="t('hotelsConfig.form.contactPhone')">
        <el-input v-model="formData.telefono" :placeholder="t('hotelsConfig.form.contactPhonePlaceholder')" />
      </el-form-item>

      <el-form-item :label="t('hotelsConfig.form.email')">
        <el-input v-model="formData.email" :placeholder="t('hotelsConfig.form.emailPlaceholder')" />
      </el-form-item>

      <el-form-item :label="t('hotelsConfig.form.address')">
        <el-input
          v-model="formData.direccion"
          type="textarea"
          :rows="3"
          :placeholder="t('hotelsConfig.form.addressPlaceholder')"
        />
      </el-form-item>

      <!-- Sección Google Calendar -->
      <div class="gcal-section-divider">
        <el-divider border-style="dashed">
          <span class="divider-title">
            <el-icon class="divider-icon"><Calendar /></el-icon>
            {{ t('hotelsConfig.googleCalendar.sectionTitle') }}
          </span>
        </el-divider>
      </div>

      <div class="gcal-container">
        <p class="gcal-subtitle">
          {{ t('hotelsConfig.googleCalendar.sectionSubtitle') }}
        </p>

        <!-- Tip de Service Account para invitar -->
        <div class="gcal-sa-tip">
          <div class="sa-tip-content">
            <span class="sa-tip-label">{{ t('hotelsConfig.googleCalendar.serviceAccountEmail') }}</span>
            <code class="sa-tip-email">{{ activeServiceAccountEmail }}</code>
            <el-button
              type="primary"
              link
              size="small"
              :icon="DocumentCopy"
              @click="copyToClipboard(activeServiceAccountEmail)"
            >
              Copiar
            </el-button>
          </div>
          <small class="sa-tip-help">{{ t('hotelsConfig.googleCalendar.serviceAccountEmailTip') }}</small>
        </div>

        <el-form-item :label="t('hotelsConfig.googleCalendar.calendarId')">
          <el-input
            v-model="formData.gcalCalendarId"
            :placeholder="t('hotelsConfig.googleCalendar.calendarIdPlaceholder')"
            clearable
          >
            <template #prefix>
              <el-icon><Calendar /></el-icon>
            </template>
          </el-input>
          <div class="field-hint">{{ t('hotelsConfig.googleCalendar.calendarIdHelp') }}</div>
        </el-form-item>

        <!-- Subida opcional de JSON de service account -->
        <el-form-item :label="t('hotelsConfig.googleCalendar.serviceAccountJson')">
          <div class="gcal-json-upload-row">
            <el-upload
              action=""
              :auto-upload="false"
              :show-file-list="false"
              accept=".json"
              :on-change="handleJsonFileChange"
            >
              <template #trigger>
                <el-button :icon="Upload" plain size="small">
                  {{ t('hotelsConfig.googleCalendar.uploadJsonBtn') }}
                </el-button>
              </template>
            </el-upload>
            <span v-if="serviceAccountJson" class="json-loaded-badge">
              <el-icon class="text-success"><Check /></el-icon> JSON cargado
            </span>
          </div>
          <el-input
            v-model="serviceAccountJson"
            type="textarea"
            :rows="2"
            :placeholder="t('hotelsConfig.googleCalendar.serviceAccountJsonPlaceholder')"
            class="gcal-json-textarea"
          />
        </el-form-item>

        <!-- Botones de Acción de Google Calendar (Solo en modo edición) -->
        <div v-if="isEditing" class="gcal-actions-bar">
          <div class="gcal-status-indicator">
            <span class="status-label">Estado:</span>
            <el-tag :type="formData.gcalCalendarId ? 'success' : 'info'" effect="plain">
              {{ formData.gcalCalendarId ? t('hotelsConfig.googleCalendar.statusConnected') : t('hotelsConfig.googleCalendar.statusNotConfigured') }}
            </el-tag>
          </div>

          <div class="gcal-btn-group">
            <el-button
              v-if="formData.gcalCalendarId"
              type="primary"
              plain
              size="default"
              :icon="Refresh"
              :loading="isTestingGcal"
              @click="handleTestGcal"
            >
              {{ t('hotelsConfig.googleCalendar.testConnectionBtn') }}
            </el-button>

            <el-popconfirm
              v-if="formData.gcalCalendarId"
              :title="t('hotelsConfig.googleCalendar.disconnectConfirm')"
              :confirm-button-text="t('hotelsConfig.delete')"
              :cancel-button-text="t('hotelsConfig.cancel')"
              confirm-button-type="danger"
              :width="300"
              @confirm="handleDisconnectGcal"
            >
              <template #reference>
                <el-button
                  type="danger"
                  link
                  :icon="Delete"
                  :loading="isDisconnectingGcal"
                >
                  {{ t('hotelsConfig.googleCalendar.disconnectBtn') }}
                </el-button>
              </template>
            </el-popconfirm>
          </div>
        </div>

        <!-- Feedback de Test de Conexión -->
        <div v-if="gcalTestResult" class="gcal-test-feedback">
          <el-alert
            v-if="gcalTestResult.success"
            type="success"
            show-icon
            :closable="true"
            @close="gcalTestResult = null"
          >
            <template #title>
              <strong>{{ t('hotelsConfig.googleCalendar.connectionSuccess') }}</strong>
            </template>
            <div class="test-feedback-details">
              <span><strong>{{ t('hotelsConfig.googleCalendar.connectionCalendarTitle') }}</strong> {{ gcalTestResult.calendarTitle }}</span>
              <span class="ml-3"><strong>{{ t('hotelsConfig.googleCalendar.connectionTimeZone') }}</strong> {{ gcalTestResult.timeZone }}</span>
            </div>
          </el-alert>

          <el-alert
            v-else
            type="error"
            show-icon
            :closable="true"
            @close="gcalTestResult = null"
          >
            <template #title>
              <strong>{{ t('hotelsConfig.googleCalendar.testConnectionError') }}</strong>
            </template>
            <div>{{ gcalTestResult.error }}</div>
          </el-alert>
        </div>
      </div>

      <el-form-item class="form-actions-item">
        <el-button
          type="primary"
          :size="isMobile ? 'large' : 'default'"
          :icon="Check"
          :loading="isSaving"
          @click="handleSave"
        >
          {{ isEditing ? t('hotelsConfig.form.saveChanges') : t('hotelsConfig.form.createHotel') }}
        </el-button>
        <el-button
          :size="isMobile ? 'large' : 'default'"
          :icon="Close"
          @click="handleCancel"
        >
          {{ t('hotelsConfig.form.cancel') }}
        </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<style scoped>
.view-container {
  max-width: 720px;
}

.page-header {
  margin-bottom: 2rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-btn {
  font-size: 1.1rem;
}

.hotel-form {
  margin-top: 1rem;
}

.gcal-section-divider {
  margin: 2rem 0 1.25rem 0;
}

.divider-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--heading-color, #0f172a);
}

.divider-icon {
  color: #3b82f6;
  font-size: 1.1rem;
}

.gcal-container {
  background: var(--el-fill-color-light, #f8fafc);
  border: 1px solid var(--toolbar-border, #e2e8f0);
  border-radius: 10px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.gcal-subtitle {
  margin: 0 0 1rem 0;
  font-size: 0.875rem;
  color: var(--nav-link-color, #64748b);
  line-height: 1.4;
}

.gcal-sa-tip {
  background: var(--el-bg-color, #ffffff);
  border: 1px solid var(--toolbar-border, #e2e8f0);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 1.25rem;
}

.sa-tip-content {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.sa-tip-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--heading-color, #0f172a);
}

.sa-tip-email {
  background: var(--el-fill-color, #f1f5f9);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.82rem;
  color: #2563eb;
  word-break: break-all;
}

.sa-tip-help {
  display: block;
  margin-top: 0.35rem;
  font-size: 0.78rem;
  color: var(--nav-link-color, #64748b);
}

.field-hint {
  font-size: 0.75rem;
  color: var(--nav-link-color, #64748b);
  margin-top: 0.25rem;
  line-height: 1.3;
}

.gcal-json-upload-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.json-loaded-badge {
  font-size: 0.8rem;
  color: #10b981;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.gcal-json-textarea {
  font-family: monospace;
  font-size: 0.8rem;
}

.gcal-actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--toolbar-border, #e2e8f0);
  margin-top: 0.75rem;
}

.gcal-status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--nav-link-color, #64748b);
}

.gcal-btn-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.gcal-test-feedback {
  margin-top: 1rem;
}

.test-feedback-details {
  display: flex;
  gap: 1rem;
  margin-top: 0.25rem;
  font-size: 0.82rem;
}

.ml-3 {
  margin-left: 0.75rem;
}

.text-success {
  color: #10b981;
}

.form-actions-item {
  margin-top: 2rem;
}

@media (max-width: 768px) {
  :deep(.hotel-form .el-form-item) {
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
  }

  :deep(.hotel-form .el-form-item__label) {
    width: 100% !important;
    text-align: left !important;
    margin-bottom: 0.25rem;
  }

  :deep(.hotel-form .el-form-item__content) {
    width: 100% !important;
    margin-left: 0 !important;
  }

  :deep(.hotel-form .el-input),
  :deep(.hotel-form .el-select),
  :deep(.hotel-form .el-textarea) {
    width: 100% !important;
  }

  .gcal-actions-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .gcal-btn-group {
    width: 100%;
    justify-content: flex-start;
  }

  .test-feedback-details {
    flex-direction: column;
    gap: 0.25rem;
  }

  .ml-3 {
    margin-left: 0;
  }

  :deep(.form-actions-item .el-form-item__content) {
    display: flex;
    flex-direction: column-reverse;
    gap: 0.75rem;
    width: 100%;
    margin-left: 0 !important;
  }

  :deep(.form-actions-item .el-button) {
    width: 100%;
    margin-left: 0 !important;
  }
}
</style>
