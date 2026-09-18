<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useCommissionStore } from '../stores/commission.store'
import { useCountryStore } from '@/features/countries/stores/country.store'
import { useHotelStore } from '@/features/hotels/stores/hotel.store'
import { useUserStore } from '@/features/users/stores/user.store'
import { useLocale } from '@/i18n/useLocale'
import { ElMessage } from 'element-plus'
import { Check, InfoFilled, Location, Delete, EditPen } from '@element-plus/icons-vue'
import { Building2, HandCoins, UserRound, Percent } from '@lucide/vue'
import {
  getUserInitials,
  getUserBgColor,
  getRoleSvg,
  getRoleTagType,
} from '@/features/users/utils/user-avatar'
import type { ComisionConfig, ComisionUsuarioConfig } from '../domain/commission.model'

const { t } = useLocale()
const commissionStore = useCommissionStore()
const countryStore = useCountryStore()
const hotelStore = useHotelStore()
const userStore = useUserStore()

// Switch de Modo: false = País / Hotel, true = Especial por Usuario
const isModoUsuario = ref(false)

// Estado Modo País / Hotel
const selectedPaisId = ref<number | null>(null)
const selectedHotelId = ref<number | null>(null)

const formData = ref({
  impuestoPct: 16,
  gerentePct: 2,
  supervisorPct: 2,
  fotografoAsalariadoPct: 14,
  fotografoSinSalarioPct: 20,
  vendedorAsalariadoPct: 6,
  vendedorSinSalarioPct: 8,
  activo: true,
})

// Estado Modo Especial por Usuario
const selectedUsuarioId = ref<string | null>(null)
const userSearchQuery = ref('')
const userFormData = ref({
  porcentajeComision: 10,
  impuestoPct: 16,
  activo: true,
})

function normalizeSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

const filteredSelectUsers = computed(() => {
  const q = normalizeSearchText(userSearchQuery.value.trim())
  if (!q) return userStore.usersWithProfile
  return userStore.usersWithProfile.filter((u) => {
    const fullName = normalizeSearchText(`${u.nombre || ''} ${u.apellidos || ''}`)
    const email = normalizeSearchText(u.email || '')
    const roleName = normalizeSearchText(u.perfil?.name || '')
    return fullName.includes(q) || email.includes(q) || roleName.includes(q)
  })
})

function onFilterUser(query: string) {
  userSearchQuery.value = query
}

function onUserSelectChange() {
  userSearchQuery.value = ''
}

function onUserSelectVisibleChange(visible: boolean) {
  if (!visible) {
    userSearchQuery.value = ''
  }
}

const formatPercentTooltip = (val: number) => `${val}%`
const formatNegativePercentTooltip = (val: number) => `-${val}%`

interface AreaGroup {
  id: number
  nombre: string
  hoteles: { id: number; nombre: string }[]
}

const groupedAreas = computed<AreaGroup[]>(() => {
  if (!selectedPaisId.value) return []
  const country = countryStore.countries.find((c) => c.id === selectedPaisId.value)
  if (!country || !country.areas) return []

  const result: AreaGroup[] = []
  for (const area of country.areas) {
    let hotelsInArea: { id: number; nombre: string }[] = (area.hoteles || [])
      .filter((h) => !h.deletedAt)
      .map((h) => ({ id: h.id, nombre: h.nombre }))

    if (hotelsInArea.length === 0) {
      hotelsInArea = hotelStore.hotels
        .filter((h) => h.areaId === area.id)
        .map((h) => ({ id: h.id, nombre: h.nombre }))
    }

    if (hotelsInArea.length > 0) {
      result.push({
        id: area.id,
        nombre: area.nombre,
        hoteles: hotelsInArea,
      })
    }
  }
  return result
})

const selectedUser = computed(() => {
  if (!selectedUsuarioId.value) return null
  return userStore.usersWithProfile.find((u) => u.id === selectedUsuarioId.value) || null
})

async function loadConfig() {
  await commissionStore.fetchConfigs(
    selectedPaisId.value || undefined,
    selectedHotelId.value || undefined,
  )
  const eff = commissionStore.effectiveConfig
  if (eff) {
    formData.value = {
      impuestoPct: Math.round(eff.impuestoPct ?? 16),
      gerentePct: Math.round(eff.gerentePct),
      supervisorPct: Math.round(eff.supervisorPct),
      fotografoAsalariadoPct: Math.round(eff.fotografoAsalariadoPct),
      fotografoSinSalarioPct: Math.round(eff.fotografoSinSalarioPct),
      vendedorAsalariadoPct: Math.round(eff.vendedorAsalariadoPct),
      vendedorSinSalarioPct: Math.round(eff.vendedorSinSalarioPct),
      activo: eff.activo ?? true,
    }
  }
}

onMounted(async () => {
  await Promise.all([
    countryStore.fetchCountries(),
    hotelStore.fetchHotels(),
    userStore.fetchUsers(),
    commissionStore.fetchUserConfigs(),
  ])
  // Default to first country if available (e.g., México)
  if (countryStore.countries.length > 0 && countryStore.countries[0]) {
    selectedPaisId.value = countryStore.countries[0].id
  }
  await loadConfig()
})

watch([selectedPaisId, selectedHotelId], async () => {
  await loadConfig()
})

watch(selectedUsuarioId, (newId) => {
  if (newId) {
    const existing = commissionStore.userConfigs.find((c) => c.usuarioId === newId)
    if (existing) {
      userFormData.value = {
        porcentajeComision: Math.round(existing.porcentajeComision),
        impuestoPct: Math.round(existing.impuestoPct),
        activo: existing.activo ?? true,
      }
    } else {
      userFormData.value = {
        porcentajeComision: 10,
        impuestoPct: 16,
        activo: true,
      }
    }
  }
})

function onPaisChange() {
  selectedHotelId.value = null
}

async function handleSave() {
  try {
    await commissionStore.saveConfig({
      paisId: selectedPaisId.value,
      hotelId: selectedHotelId.value,
      ...formData.value,
    })
    ElMessage.success(t('commissions.toasts.configSaved'))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t('commissions.toasts.saveConfigError')
    ElMessage.error(message)
  }
}

async function handleDeleteConfig(row: ComisionConfig) {
  if (!row.id) return
  try {
    await commissionStore.deleteConfig(
      row.id,
      selectedPaisId.value || undefined,
      selectedHotelId.value || undefined,
    )
    ElMessage.success(t('commissions.toasts.configDeleted'))
    await loadConfig()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t('commissions.toasts.deleteConfigError')
    ElMessage.error(message)
  }
}

async function handleSaveUserConfig() {
  if (!selectedUsuarioId.value) {
    ElMessage.warning(t('commissions.toasts.userRequired'))
    return
  }
  try {
    await commissionStore.saveUserConfig({
      usuarioId: selectedUsuarioId.value,
      porcentajeComision: userFormData.value.porcentajeComision,
      impuestoPct: userFormData.value.impuestoPct,
      activo: userFormData.value.activo,
    })
    ElMessage.success(t('commissions.toasts.userConfigSaved'))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t('commissions.toasts.saveUserConfigError')
    ElMessage.error(message)
  }
}

async function handleDeleteUserConfig(row: ComisionUsuarioConfig) {
  if (!row.id) return
  try {
    await commissionStore.deleteUserConfig(row.id)
    ElMessage.success(t('commissions.toasts.userConfigDeleted'))
    if (selectedUsuarioId.value === row.usuarioId) {
      userFormData.value = {
        porcentajeComision: 10,
        impuestoPct: 16,
        activo: true,
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t('commissions.toasts.deleteUserConfigError')
    ElMessage.error(message)
  }
}

function onEditUserConfig(row: ComisionUsuarioConfig) {
  selectedUsuarioId.value = row.usuarioId
  userFormData.value = {
    porcentajeComision: Math.round(row.porcentajeComision),
    impuestoPct: Math.round(row.impuestoPct),
    activo: row.activo ?? true,
  }
}
</script>

<template>
  <div class="comisiones-config-container">
    <!-- Toolbar superior de Selección Geográfica / Usuario y Switch de Modo -->
    <div class="toolbar-bar">
      <div class="toolbar-left">
        <!-- Modo Estándar: País / Hotel -->
        <template v-if="!isModoUsuario">
          <el-select
            v-model="selectedPaisId"
            :placeholder="$t('commissions.globalConfigPlaceholder')"
            clearable
            size="large"
            class="country-select"
            @change="onPaisChange"
          >
            <el-option
              v-for="pais in countryStore.countries"
              :key="pais.id"
              :value="pais.id"
              :label="pais.nombre"
            />
          </el-select>

          <el-select
            v-model="selectedHotelId"
            :placeholder="$t('commissions.allHotelsCountryPlaceholder')"
            clearable
            filterable
            size="large"
            class="hotel-select"
            :disabled="!selectedPaisId"
            popper-class="custom-group-select-dropdown"
          >
            <template v-for="area in groupedAreas" :key="area.id">
              <el-option
                :value="`area-${area.id}`"
                :label="area.nombre"
                disabled
                class="area-header-option"
              >
                <div class="area-option-header">
                  <el-icon :size="18" class="area-icon"><Location /></el-icon>
                  <span class="area-title">{{ area.nombre }}</span>
                </div>
              </el-option>

              <el-option
                v-for="hotel in area.hoteles"
                :key="hotel.id"
                :value="hotel.id"
                :label="hotel.nombre"
                class="hotel-sub-option"
              >
                <div class="option-item-content hotel-option-item">
                  <el-icon :size="18" class="hotel-option-icon"><Building2 /></el-icon>
                  <span class="hotel-name">{{ hotel.nombre }}</span>
                </div>
              </el-option>
            </template>
          </el-select>
        </template>

        <!-- Modo Especial: Desplegable de Usuarios -->
        <template v-else>
          <el-select
            v-model="selectedUsuarioId"
            :placeholder="$t('commissions.selectUserPlaceholder')"
            filterable
            :filter-method="onFilterUser"
            clearable
            size="large"
            class="user-select"
            popper-class="profile-select-popper"
            @change="onUserSelectChange"
            @visible-change="onUserSelectVisibleChange"
          >
            <el-option
              v-for="u in filteredSelectUsers"
              :key="u.id"
              :value="u.id"
              :label="`${u.nombre} ${u.apellidos}`"
            >
              <div class="user-select-option">
                <el-avatar
                  :src="u.imagen || undefined"
                  shape="circle"
                  :size="26"
                  :style="{
                    backgroundColor: getUserBgColor(u.color),
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                  }"
                >
                  {{ getUserInitials(u.nombre, u.apellidos) }}
                </el-avatar>
                <span class="user-select-name">{{ u.nombre }} {{ u.apellidos }}</span>
                <el-tag
                  v-if="u.perfil"
                  :type="getRoleTagType(u.perfil.code)"
                  size="small"
                  effect="light"
                  class="role-tag"
                >
                  <img
                    :src="getRoleSvg(u.perfil.code)"
                    class="role-tag-icon-option"
                    :alt="u.perfil.name"
                  />
                  {{ u.perfil.name }}
                </el-tag>
              </div>
            </el-option>
          </el-select>
        </template>
      </div>

      <!-- Lado Derecho: Switch Usuario -->
      <div class="toolbar-right">
        <div class="user-switch-box">
          <span class="switch-label">{{ $t('commissions.byUser') }}</span>
          <el-switch
            v-model="isModoUsuario"
            size="large"
          />
        </div>
      </div>
    </div>

    <!-- Card Unificada de Configuración de Porcentajes -->
    <el-card shadow="never" class="matrix-card">
      <!-- MODO ESTÁNDAR (País / Hotel) -->
      <div v-if="!isModoUsuario" class="matrix-sections-container">
        <!-- 1. Sección Fotógrafo -->
        <div class="role-section">
          <div class="section-header-role">
            <el-tag type="success" size="large" effect="light" class="role-tag">
              <img :src="getRoleSvg('FOTOGRAFO')" class="role-header-icon" :alt="$t('commissions.photographer')" />
              {{ $t('commissions.photographer') }}
            </el-tag>
            <span class="role-desc-header">{{ $t('commissions.photographerDesc') }}</span>
          </div>

          <div class="inputs-row">
            <div class="input-block">
              <div class="contract-label">
                <span class="contract-badge salaried">{{ $t('commissions.salaried') }}</span>
                <span class="contract-hint">{{ $t('commissions.photographerSalariedHint') }}</span>
              </div>
              <div class="slider-container">
                <el-slider
                  v-model="formData.fotografoAsalariadoPct"
                  :min="0"
                  :max="100"
                  :step="1"
                  :format-tooltip="formatPercentTooltip"
                />
                <span class="pct-value">{{ formData.fotografoAsalariadoPct }} %</span>
              </div>
            </div>

            <div class="input-block">
              <div class="contract-label">
                <span class="contract-badge commission-only">{{ $t('commissions.freelance') }}</span>
                <span class="contract-hint">{{ $t('commissions.photographerFreelanceHint') }}</span>
              </div>
              <div class="slider-container">
                <el-slider
                  v-model="formData.fotografoSinSalarioPct"
                  :min="0"
                  :max="100"
                  :step="1"
                  :format-tooltip="formatPercentTooltip"
                />
                <span class="pct-value">{{ formData.fotografoSinSalarioPct }} %</span>
              </div>
            </div>
          </div>
        </div>

        <el-divider border-style="dashed" class="section-divider" />

        <!-- 2. Sección Vendedor / Agendador -->
        <div class="role-section">
          <div class="section-header-role">
            <el-tag type="primary" size="large" effect="light" class="role-tag">
              <img
                :src="getRoleSvg('AGENDADOR')"
                class="role-header-icon"
                :alt="$t('commissions.seller')"
              />
              {{ $t('commissions.seller') }}
            </el-tag>
            <span class="role-desc-header">{{ $t('commissions.sellerDesc') }}</span>
          </div>

          <div class="inputs-row">
            <div class="input-block">
              <div class="contract-label">
                <span class="contract-badge salaried">{{ $t('commissions.salaried') }}</span>
                <span class="contract-hint">{{ $t('commissions.sellerSalariedHint') }}</span>
              </div>
              <div class="slider-container">
                <el-slider
                  v-model="formData.vendedorAsalariadoPct"
                  :min="0"
                  :max="100"
                  :step="1"
                  :format-tooltip="formatPercentTooltip"
                />
                <span class="pct-value">{{ formData.vendedorAsalariadoPct }} %</span>
              </div>
            </div>

            <div class="input-block">
              <div class="contract-label">
                <span class="contract-badge commission-only">{{ $t('commissions.freelance') }}</span>
                <span class="contract-hint">{{ $t('commissions.sellerFreelanceHint') }}</span>
              </div>
              <div class="slider-container">
                <el-slider
                  v-model="formData.vendedorSinSalarioPct"
                  :min="0"
                  :max="100"
                  :step="1"
                  :format-tooltip="formatPercentTooltip"
                />
                <span class="pct-value">{{ formData.vendedorSinSalarioPct }} %</span>
              </div>
            </div>
          </div>
        </div>

        <el-divider border-style="dashed" class="section-divider" />

        <!-- 3. Sección Supervisor de Hotel -->
        <div class="role-section">
          <div class="section-header-role">
            <el-tag type="warning" size="large" effect="light" class="role-tag">
              <img
                :src="getRoleSvg('SUPERVISOR')"
                class="role-header-icon"
                :alt="$t('commissions.supervisor')"
              />
              {{ $t('commissions.supervisor') }}
            </el-tag>
            <span class="role-desc-header">
              {{ $t('commissions.supervisorDesc') }}
            </span>
          </div>

          <div class="inputs-row">
            <div class="slider-container">
              <el-slider
                v-model="formData.supervisorPct"
                :min="0"
                :max="100"
                :step="1"
                :format-tooltip="formatPercentTooltip"
              />
              <span class="pct-value">{{ formData.supervisorPct }} %</span>
            </div>
          </div>
        </div>

        <el-divider border-style="dashed" class="section-divider" />

        <!-- 4. Sección Gerente de Área -->
        <div class="role-section">
          <div class="section-header-role">
            <el-tag type="danger" size="large" effect="light" class="role-tag">
              <img :src="getRoleSvg('GERENTE')" class="role-header-icon" :alt="$t('commissions.manager')" />
              {{ $t('commissions.manager') }}
            </el-tag>

            <span class="role-desc-header">
              {{ $t('commissions.managerDesc') }}
            </span>
          </div>

          <div class="inputs-row">
            <div class="slider-container">
              <el-slider
                v-model="formData.gerentePct"
                :min="0"
                :max="100"
                :step="1"
                :format-tooltip="formatPercentTooltip"
              />
              <span class="pct-value">{{ formData.gerentePct }} %</span>
            </div>
          </div>
        </div>

        <el-divider border-style="dashed" class="section-divider" />

        <!-- 5. Sección Retención Estatal / Impuestos -->
        <div class="role-section">
          <div class="section-header-role">
            <el-tag type="info" size="large" effect="light" class="role-tag tax-tag">
              <HandCoins :size="18" class="role-lucide-icon" />
              {{ $t('commissions.taxRetention') }}
            </el-tag>
            <span class="role-desc-header">
              {{ $t('commissions.taxRetentionDesc') }}
            </span>
          </div>

          <div class="inputs-row">
            <div class="slider-container">
              <el-slider
                v-model="formData.impuestoPct"
                :min="0"
                :max="100"
                :step="1"
                :format-tooltip="formatNegativePercentTooltip"
              />
              <span class="pct-value text-danger">-{{ formData.impuestoPct }} %</span>
            </div>
          </div>
        </div>

        <el-divider class="section-divider final-divider" />

        <!-- Footer con Info y Botón Guardar -->
        <div class="card-footer-actions">
          <div class="summary-info">
            <el-icon><InfoFilled /></el-icon>
            <span>
              {{ $t('commissions.standardInfoNotice') }}
            </span>
          </div>

          <el-button
            type="primary"
            size="large"
            :icon="Check"
            :loading="commissionStore.isSaving"
            class="save-btn"
            @click="handleSave"
          >
            {{ $t('commissions.saveConfigButton') }}
          </el-button>
        </div>
      </div>

      <!-- MODO ESPECIAL POR USUARIO -->
      <div v-else class="matrix-sections-container">
        <!-- Sin usuario seleccionado -->
        <div v-if="!selectedUsuarioId" class="empty-user-selection">
          <el-icon :size="42" color="#94a3b8"><UserRound /></el-icon>
          <h3 class="empty-user-title">{{ $t('commissions.specialUserTitle') }}</h3>
          <p class="empty-user-desc">
            {{ $t('commissions.specialUserDesc') }}
          </p>
        </div>

        <!-- Con usuario seleccionado -->
        <template v-else>
          <!-- Ficha Resumen del Usuario Seleccionado -->
          <div class="selected-user-card">
            <el-avatar
              :src="selectedUser?.imagen || undefined"
              shape="circle"
              :size="48"
              :style="{
                backgroundColor: getUserBgColor(selectedUser?.color),
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '1.1rem',
              }"
            >
              {{ getUserInitials(selectedUser?.nombre, selectedUser?.apellidos) }}
            </el-avatar>
            <div class="selected-user-details">
              <div class="selected-user-header-row">
                <span class="selected-user-name">{{ selectedUser?.nombre }} {{ selectedUser?.apellidos }}</span>
                <el-tag
                  v-if="selectedUser?.perfil"
                  :type="getRoleTagType(selectedUser.perfil.code)"
                  size="default"
                  effect="light"
                  class="role-tag"
                >
                  <img
                    :src="getRoleSvg(selectedUser.perfil.code)"
                    class="role-header-icon-small"
                    :alt="selectedUser.perfil.name"
                  />
                  {{ selectedUser.perfil.name }}
                </el-tag>
              </div>
              <span class="selected-user-email">{{ selectedUser?.email }}</span>
            </div>
          </div>

          <el-divider border-style="dashed" class="section-divider" />

          <!-- 1. Sección Comisión del Usuario -->
          <div class="role-section">
            <div class="section-header-role">
              <el-tag type="primary" size="large" effect="light" class="role-tag">
                <el-icon :size="18" class="role-lucide-icon"><Percent /></el-icon>
                {{ $t('commissions.commissionPercentage') }}
              </el-tag>
              <span class="role-desc-header">
                {{ $t('commissions.userCommissionDesc') }}
              </span>
            </div>

            <div class="inputs-row">
              <div class="slider-container">
                <el-slider
                  v-model="userFormData.porcentajeComision"
                  :min="0"
                  :max="100"
                  :step="1"
                  :format-tooltip="formatPercentTooltip"
                />
                <span class="pct-value">{{ userFormData.porcentajeComision }} %</span>
              </div>
            </div>
          </div>

          <el-divider border-style="dashed" class="section-divider" />

          <!-- 2. Sección Retención Estatal / Impuestos del Usuario -->
          <div class="role-section">
            <div class="section-header-role">
              <el-tag type="info" size="large" effect="light" class="role-tag tax-tag">
                <HandCoins :size="18" class="role-lucide-icon" />
                {{ $t('commissions.taxRetention') }}
              </el-tag>
              <span class="role-desc-header">
                {{ $t('commissions.userTaxRetentionDesc') }}
              </span>
            </div>

            <div class="inputs-row">
              <div class="slider-container">
                <el-slider
                  v-model="userFormData.impuestoPct"
                  :min="0"
                  :max="100"
                  :step="1"
                  :format-tooltip="formatNegativePercentTooltip"
                />
                <span class="pct-value text-danger">-{{ userFormData.impuestoPct }} %</span>
              </div>
            </div>
          </div>

          <el-divider class="section-divider final-divider" />

          <!-- Footer con Info y Botón Guardar para Usuario -->
          <div class="card-footer-actions">
            <div class="summary-info">
              <el-icon><InfoFilled /></el-icon>
              <span>
                {{ $t('commissions.userSpecialInfoNotice', { name: selectedUser?.nombre || $t('commissions.thisUser') }) }}
              </span>
            </div>

            <el-button
              type="primary"
              size="large"
              :icon="Check"
              :loading="commissionStore.isSaving"
              class="save-btn"
              @click="handleSaveUserConfig"
            >
              {{ $t('commissions.saveUserConfigButton') }}
            </el-button>
          </div>
        </template>
      </div>
    </el-card>

    <!-- TABLA 1: Configuraciones Geográficas Guardadas (Modo País / Hotel) -->
    <div v-if="!isModoUsuario && commissionStore.configs.length > 0" class="saved-configs-section">
      <h4 class="section-subtitle">{{ $t('commissions.savedConfigsTitle') }}</h4>
      <el-table :data="commissionStore.configs" border stripe style="width: 100%">
        <el-table-column prop="paisNombre" :label="$t('commissions.table.country')" min-width="150" />
        <el-table-column prop="hotelNombre" :label="$t('commissions.table.hotel')" min-width="160" />
        <el-table-column :label="$t('commissions.table.taxRetention')" align="center" width="150">
          <template #default="{ row }">
            <span class="text-danger font-semibold">-{{ row.impuestoPct ?? 16 }}%</span>
          </template>
        </el-table-column>
        <el-table-column :label="$t('commissions.table.photographerSalariedFreelance')" align="center" width="220">
          <template #default="{ row }">
            <span>
              {{ row.fotografoAsalariadoPct }}% |
              <strong>{{ row.fotografoSinSalarioPct }}%</strong>
            </span>
          </template>
        </el-table-column>
        <el-table-column :label="$t('commissions.table.sellerSalariedFreelance')" align="center" width="220">
          <template #default="{ row }">
            <span>
              {{ row.vendedorAsalariadoPct }}% |
              <strong>{{ row.vendedorSinSalarioPct }}%</strong>
            </span>
          </template>
        </el-table-column>
        <el-table-column :label="$t('commissions.table.supervisor')" align="center" width="110">
          <template #default="{ row }">
            <span>{{ row.supervisorPct }}%</span>
          </template>
        </el-table-column>
        <el-table-column :label="$t('commissions.table.manager')" align="center" width="110">
          <template #default="{ row }">
            <span>{{ row.gerentePct }}%</span>
          </template>
        </el-table-column>
        <el-table-column :label="$t('commissions.table.actions')" width="90" align="center">
          <template #default="{ row }">
            <el-popconfirm
              :title="$t('commissions.deleteConfigConfirm')"
              :confirm-button-text="$t('commissions.delete')"
              :cancel-button-text="$t('commissions.cancel')"
              confirm-button-type="danger"
              :width="260"
              @confirm="handleDeleteConfig(row)"
            >
              <template #reference>
                <el-button type="danger" link :icon="Delete" :title="$t('commissions.deleteConfigTooltip')" />
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- TABLA 2: Comisiones Especiales de Usuarios Guardadas (Modo Usuario) -->
    <div v-if="isModoUsuario" class="saved-configs-section">
      <h4 class="section-subtitle">{{ $t('commissions.savedUserConfigsTitle') }}</h4>
      <el-empty
        v-if="commissionStore.userConfigs.length === 0"
        :description="$t('commissions.noUserConfigs')"
        :image-size="60"
      />
      <el-table
        v-else
        :data="commissionStore.userConfigs"
        border
        stripe
        style="width: 100%"
      >
        <el-table-column :label="$t('commissions.table.user')" min-width="220">
          <template #default="{ row }">
            <div class="table-user-cell">
              <span class="user-cell-name">{{ row.usuarioNombre }} {{ row.usuarioApellidos }}</span>
              <small class="user-cell-email">{{ row.usuarioEmail }}</small>
            </div>
          </template>
        </el-table-column>

        <el-table-column :label="$t('commissions.table.role')" min-width="160" class-name="role-column">
          <template #default="{ row }">
            <el-tag
              v-if="row.rolCodigo"
              :type="getRoleTagType(row.rolCodigo)"
              size="default"
              effect="light"
              class="role-tag"
            >
              <img
                :src="getRoleSvg(row.rolCodigo)"
                class="role-tag-icon-table"
                :alt="row.rolNombre || row.rolCodigo"
              />
              {{ row.rolNombre || row.rolCodigo }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column :label="$t('commissions.table.specialCommissionPct')" align="center" width="180">
          <template #default="{ row }">
            <span class="font-bold user-pct-highlight">{{ row.porcentajeComision }}%</span>
          </template>
        </el-table-column>

        <el-table-column :label="$t('commissions.table.taxRetention')" align="center" width="160">
          <template #default="{ row }">
            <span class="text-danger font-semibold">-{{ row.impuestoPct }}%</span>
          </template>
        </el-table-column>

        <el-table-column :label="$t('commissions.table.actions')" width="110" align="center">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button
                type="primary"
                link
                :icon="EditPen"
                :title="$t('commissions.editUserConfigTooltip')"
                @click="onEditUserConfig(row)"
              />
              <el-popconfirm
                :title="$t('commissions.deleteUserConfigConfirm')"
                :confirm-button-text="$t('commissions.delete')"
                :cancel-button-text="$t('commissions.cancel')"
                confirm-button-type="danger"
                :width="260"
                @confirm="handleDeleteUserConfig(row)"
              >
                <template #reference>
                  <el-button type="danger" link :icon="Delete" :title="$t('commissions.deleteUserConfigTooltip')" />
                </template>
              </el-popconfirm>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.comisiones-config-container {
  padding-top: 0.5rem;
}

.toolbar-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  gap: 1rem;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.toolbar-right {
  display: flex;
  align-items: center;
}

.user-switch-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.switch-label {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
}

.country-select {
  width: 320px;
}

.hotel-select {
  width: 360px;
}

.user-select {
  width: 380px;
}

:deep(.profile-select-popper .el-select-dropdown__item) {
  overflow: visible !important;
}

.user-select-option {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
}

.user-select-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--heading-color, #0f172a);
}

.role-tag-icon-option {
  width: 20px;
  height: 20px;
  object-fit: contain;
  margin-right: 4px;
  vertical-align: middle;
}

.matrix-card {
  border-radius: 12px;
  border: 1px solid var(--border-color, #e2e8f0);
  background: var(--card-bg, #ffffff);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.matrix-card :deep(.el-card__body) {
  padding: 1.5rem;
}

.matrix-sections-container {
  display: flex;
  flex-direction: column;
}

.empty-user-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 3rem 1.5rem;
}

.empty-user-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  color: var(--heading-color, #0f172a);
}

.empty-user-desc {
  font-size: 0.9rem;
  color: var(--text-muted, #64748b);
  max-width: 480px;
}

.selected-user-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.25rem 0.5rem;
}

.selected-user-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.selected-user-header-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.selected-user-name {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
}

.selected-user-email {
  font-size: 0.85rem;
  color: var(--text-muted, #64748b);
}

.role-header-icon-small {
  width: 24px;
  height: 24px;
  object-fit: contain;
  flex-shrink: 0;
  margin-top: -6px;
  margin-right: 4px;
  vertical-align: middle;
  position: relative;
  z-index: 1;
}

.role-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 0;
}

.section-header-role {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.role-header-icon {
  width: 32px;
  height: 32px;
  object-fit: contain;
  flex-shrink: 0;
  margin-top: -8px;
  margin-right: 4px;
  vertical-align: middle;
  position: relative;
  z-index: 1;
}

:deep(.el-tag.role-tag) {
  overflow: visible !important;
}

:deep(.el-tag.role-tag .el-tag__content) {
  overflow: visible !important;
  display: inline-flex;
  align-items: center;
}

.role-tag {
  font-weight: 700 !important;
  text-transform: uppercase;
}

.role-lucide-icon {
  margin-right: 6px;
  vertical-align: middle;
  margin-top: -2px;
}

.tax-tag {
  color: #475569 !important;
  background-color: #f1f5f9 !important;
  border-color: #cbd5e1 !important;
}

.text-danger {
  color: var(--el-color-danger, #f56c6c) !important;
}

.font-semibold {
  font-weight: 600;
}

.font-bold {
  font-weight: 700;
}

.user-pct-highlight {
  font-size: 1.15rem;
  color: #2563eb;
}

.role-desc-header {
  font-size: 0.825rem;
  color: var(--text-muted, #64748b);
}

.inputs-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
  margin-bottom: 0;
}

@media (max-width: 768px) {
  .inputs-row {
    grid-template-columns: 1fr;
  }
  .toolbar-bar {
    flex-direction: column;
    align-items: stretch;
  }
  .country-select,
  .hotel-select,
  .user-select {
    width: 100%;
  }
}

.input-block {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.contract-label {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.contract-badge {
  font-size: 0.85rem;
  font-weight: 600;

  &.salaried {
    color: #059669;
  }

  &.commission-only {
    color: #2563eb;
  }
}

.contract-hint {
  font-size: 0.775rem;
  color: var(--text-muted, #64748b);
}

.slider-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem 0 0.5rem;
  .pct-value {
    font-size: 3em;
    font-weight: 700;
    display: inline-block;
    width: 140px;
    text-align: right;
    color: var(--text-muted, #64748b);
  }
}

.slider-container :deep(.el-slider) {
  flex: 1;
}

.section-divider {
  margin: 1.5rem 0;
}

.final-divider {
  margin: 1.5rem 0 1.25rem 0 !important;
}

.card-footer-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.25rem;
  padding-top: 0;
}

.summary-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.85rem;
  color: var(--text-muted, #64748b);
  max-width: 680px;
  line-height: 1.4;
}

.summary-info .el-icon {
  font-size: 1.25rem;
  color: #3b82f6;
  flex-shrink: 0;
}

.save-btn {
  font-weight: 700;
  padding: 0.75rem 2rem;
}

.saved-configs-section {
  margin-top: 1rem;
}

.section-subtitle {
  font-size: 1.05rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  color: var(--heading-color, #0f172a);
}

.table-user-cell {
  display: flex;
  flex-direction: column;
}

.user-cell-name {
  font-weight: 600;
  color: var(--heading-color, #0f172a);
}

.user-cell-email {
  font-size: 0.8rem;
  color: var(--text-muted, #64748b);
}

:deep(td.role-column),
:deep(td.role-column .cell) {
  overflow: visible !important;
}

.role-tag-icon-table {
  width: 28px;
  height: 28px;
  object-fit: contain;
  flex-shrink: 0;
  margin-top: -10px;
  margin-right: 4px;
  vertical-align: middle;
  position: relative;
  z-index: 1;
}

.table-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
}
</style>
