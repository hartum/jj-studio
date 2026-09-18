<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useHotelStore } from '@/features/hotels/stores/hotel.store'
import { useUserStore } from '@/features/users/stores/user.store'
import { useCountryStore } from '@/features/countries/stores/country.store'
import { useGoalStore } from '@/features/goals/stores/goal.store'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useProfileStore } from '@/features/users/stores/profile.store'
import { getUserInitials, getUserBgColor } from '@/features/users/utils/user-avatar'
import { formatCurrency } from '@/shared/formatters'
import { useLocale } from '@/i18n/useLocale'
import { ElMessage } from 'element-plus'
import { Location, User, Check, Share } from '@element-plus/icons-vue'
import { Building2 } from '@lucide/vue'
import type { Hotel } from '@/features/hotels/domain/hotel.model'

const route = useRoute()
const { t } = useLocale()
const authStore = useAuthStore()
const countryStore = useCountryStore()
const hotelStore = useHotelStore()
const userStore = useUserStore()
const profileStore = useProfileStore()
const goalStore = useGoalStore()

const now = new Date()
const selectedAnio = ref(now.getFullYear())
const selectedMes = ref(now.getMonth() + 1)
const selectedHotelId = ref<number | null>(null)

const isSaving = ref(false)
const hotelTargetAmount = ref<number>(0)
const defaultHotelTarget = ref<number | null>(null)

// Personal goals per photographer edit map: userId -> custom amount
const customPhotographerGoals = ref<Record<string, number>>({})

const selectedMonthDate = computed<string>({
  get: () => `${selectedAnio.value}-${String(selectedMes.value).padStart(2, '0')}`,
  set: (val: string) => {
    if (!val) return
    const parts = val.split('-').map(Number)
    if (parts[0] && parts[1]) {
      selectedAnio.value = parts[0]
      selectedMes.value = parts[1]
    }
  },
})

const MONTH_KEYS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
] as const

const selectedMonthLabel = computed<string>(() => {
  const key = MONTH_KEYS[selectedMes.value - 1]
  return key ? t(`dashboard.months.${key}`) : ''
})

// Hoteles permitidos según el rol
const availableHotels = computed(() => {
  const user = authStore.user
  if (!user) return []
  const role = user.roleCode?.toUpperCase()

  if (role === 'SUPERUSUARIO' || role === 'ADMIN') {
    return hotelStore.hotels
  }

  if (role === 'GERENTE') {
    const userAreaIds = new Set(user.areaIds || [])
    return hotelStore.hotels.filter((h) => userAreaIds.has(h.areaId))
  }

  if (role === 'SUPERVISOR') {
    const userHotelIds = new Set(user.hotelIds || [])
    return hotelStore.hotels.filter((h) => userHotelIds.has(h.id))
  }

  return []
})

interface AreaGroup {
  id: number
  nombre: string
  hoteles: Hotel[]
}

interface CountryGroup {
  id: number
  nombre: string
  codigo: string
  areas: AreaGroup[]
}

// Hoteles agrupados por país y área para el selector
const groupedHotelsByCountry = computed<CountryGroup[]>(() => {
  const hotels = availableHotels.value
  const groupsMap = new Map<number, CountryGroup>()

  for (const h of hotels) {
    const countryId = h.paisId || 0
    const countryName = h.paisNombre || t('goalsConfig.noCountry')
    const countryObj = countryStore.countries.find(
      (c) => c.id === countryId || c.nombre === countryName,
    )
    const countryCode = countryObj?.codigo || h.paisCodigo || ''

    if (!groupsMap.has(countryId)) {
      groupsMap.set(countryId, {
        id: countryId,
        nombre: countryName,
        codigo: countryCode,
        areas: [],
      })
    }

    const countryGroup = groupsMap.get(countryId)!
    const areaId = h.areaId || 0
    const areaName = h.areaNombre || t('goalsConfig.noArea')

    let areaGroup = countryGroup.areas.find((a) => a.id === areaId)
    if (!areaGroup) {
      areaGroup = {
        id: areaId,
        nombre: areaName,
        hoteles: [],
      }
      countryGroup.areas.push(areaGroup)
    }

    areaGroup.hoteles.push(h)
  }

  return Array.from(groupsMap.values())
})

const currentHotel = computed(() => {
  if (!selectedHotelId.value) return null
  return hotelStore.hotels.find((h) => h.id === selectedHotelId.value) || null
})

// Fotógrafos asignados a este hotel
const assignedPhotographers = computed(() => {
  if (!selectedHotelId.value) return []
  return userStore.usersWithProfile.filter((u) => {
    const isFoto = u.perfil?.code?.toUpperCase() === 'FOTOGRAFO'
    const isAssigned = u.hotelIds?.includes(selectedHotelId.value!)
    return isFoto && isAssigned && u.status === 'Activo'
  })
})

// Suggested quota per photographer
const suggestedQuotaPerPhotographer = computed(() => {
  const count = assignedPhotographers.value.length
  if (count === 0 || !hotelTargetAmount.value) return 0
  return Math.round((hotelTargetAmount.value / count) * 100) / 100
})

async function loadHotelGoals() {
  if (!selectedHotelId.value) return

  await goalStore.fetchMetas({
    hotelId: selectedHotelId.value,
    anio: selectedAnio.value,
    mes: selectedMes.value,
  })

  // Fill hotel target
  const hotelMeta = goalStore.metas.find(
    (m) =>
      m.hotelId === selectedHotelId.value &&
      m.anio === selectedAnio.value &&
      m.mes === selectedMes.value &&
      m.alcanceTipo === 'HOTEL' &&
      !m.usuarioId,
  )

  if (hotelMeta) {
    hotelTargetAmount.value = hotelMeta.importeObjetivo
  } else {
    hotelTargetAmount.value = currentHotel.value?.metaMensualDefault || 0
  }

  defaultHotelTarget.value = currentHotel.value?.metaMensualDefault ?? null

  // Fill photographers custom goals
  const map: Record<string, number> = {}
  for (const foto of assignedPhotographers.value) {
    const userMeta = goalStore.metas.find(
      (m) =>
        m.hotelId === selectedHotelId.value &&
        m.usuarioId === foto.id &&
        m.anio === selectedAnio.value &&
        m.mes === selectedMes.value &&
        m.alcanceTipo === 'USUARIO',
    )
    if (userMeta) {
      map[foto.id] = userMeta.importeObjetivo
    } else {
      map[foto.id] = suggestedQuotaPerPhotographer.value
    }
  }
  customPhotographerGoals.value = map
}

watch([selectedHotelId, selectedAnio, selectedMes], async () => {
  await loadHotelGoals()
})

async function handleSaveHotelGoal() {
  if (!selectedHotelId.value) {
    ElMessage.warning(t('goalsConfig.selectHotelWarning'))
    return
  }

  isSaving.value = true
  try {
    // 1. Guardar meta del hotel
    await goalStore.saveMeta({
      alcanceTipo: 'HOTEL',
      hotelId: selectedHotelId.value,
      anio: selectedAnio.value,
      mes: selectedMes.value,
      importeObjetivo: Number(hotelTargetAmount.value) || 0,
    })

    // 2. Guardar o actualizar metas de fotógrafos si son personalizadas
    for (const foto of assignedPhotographers.value) {
      const customVal = customPhotographerGoals.value[foto.id]
      if (customVal !== undefined) {
        await goalStore.saveMeta({
          alcanceTipo: 'USUARIO',
          hotelId: selectedHotelId.value,
          usuarioId: foto.id,
          anio: selectedAnio.value,
          mes: selectedMes.value,
          importeObjetivo: Number(customVal) || 0,
        })
      }
    }

    ElMessage.success(t('goalsConfig.goalsSavedSuccess'))
    await loadHotelGoals()
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : t('goalsConfig.saveError')
    ElMessage.error(errorMsg)
  } finally {
    isSaving.value = false
  }
}

function applySuggestedDivisionToAll() {
  const quota = suggestedQuotaPerPhotographer.value
  const map: Record<string, number> = {}
  for (const foto of assignedPhotographers.value) {
    map[foto.id] = quota
  }
  customPhotographerGoals.value = map
  ElMessage.info(t('goalsConfig.suggestedAppliedInfo'))
}

function applyRouteQueryParams() {
  if (route.query.anio) {
    const a = Number(route.query.anio)
    if (!isNaN(a)) selectedAnio.value = a
  }
  if (route.query.mes) {
    const m = Number(route.query.mes)
    if (!isNaN(m) && m >= 1 && m <= 12) selectedMes.value = m
  }
  if (route.query.hotelId) {
    const hid = Number(route.query.hotelId)
    if (!isNaN(hid) && availableHotels.value.some((h) => h.id === hid)) {
      selectedHotelId.value = hid
      return
    }
  }

  // Si no se especificó hotel o no es válido para este usuario, seleccionar el primero disponible
  if (
    !selectedHotelId.value ||
    !availableHotels.value.some((h) => h.id === selectedHotelId.value)
  ) {
    const firstHotel = availableHotels.value[0]
    if (firstHotel) {
      selectedHotelId.value = firstHotel.id
    }
  }
}

onMounted(async () => {
  await Promise.all([
    countryStore.fetchCountries(),
    hotelStore.fetchHotels(),
    profileStore.fetchProfiles(),
    userStore.fetchUsers(),
  ])
  applyRouteQueryParams()
  await loadHotelGoals()
})

watch(
  () => assignedPhotographers.value.length,
  async () => {
    await loadHotelGoals()
  },
)

watch(
  () => [route.query.hotelId, route.query.mes, route.query.anio],
  () => {
    applyRouteQueryParams()
  },
)
</script>

<template>
  <div class="metas-config-container">
    <!-- Toolbar superior de Filtros -->
    <div class="filter-grid">
      <div class="filter-field hotel-field">
        <el-select
          v-model="selectedHotelId"
          :placeholder="$t('goalsConfig.selectHotelPlaceholder')"
          filterable
          clearable
          size="large"
          class="full-width"
          popper-class="custom-group-select-dropdown"
        >
          <el-option-group
            v-for="pais in groupedHotelsByCountry"
            :key="pais.id"
            :label="pais.codigo ? `${pais.nombre} (${pais.codigo})` : pais.nombre"
          >
            <template v-for="area in pais.areas" :key="area.id">
              <!-- Item no seleccionable por cada Área -->
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

              <!-- Hoteles pertenecientes a este área -->
              <el-option
                v-for="h in area.hoteles"
                :key="h.id"
                :label="`${h.nombre} (${area.nombre})`"
                :value="h.id"
                class="hotel-sub-option"
              >
                <div class="option-item-content hotel-option-item">
                  <el-icon :size="18" class="hotel-option-icon"><Building2 /></el-icon>
                  <span class="hotel-name">{{ h.nombre }}</span>
                </div>
              </el-option>
            </template>
          </el-option-group>
        </el-select>
      </div>

      <div class="filter-field month-field">
        <el-date-picker
          v-model="selectedMonthDate"
          type="month"
          format="YYYY-MM"
          value-format="YYYY-MM"
          size="large"
          class="full-width"
          :clearable="false"
        />
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!currentHotel" class="empty-hotel-box">
      <el-empty :description="$t('goalsConfig.emptyHotel')" />
    </div>

    <!-- Main Configuration Area -->
    <div v-else class="metas-work-area">
      <!-- Tarjeta Unificada de Metas -->
      <el-card class="goals-unified-card" shadow="never">
        <template #header>
          <div class="card-header-flex">
            <div class="header-left-title">
              <el-icon class="hotel-icon"><Building2 /></el-icon>
              <span>{{ $t('goalsConfig.hotelMonthlyGoal', { hotel: currentHotel.nombre }) }}</span>
            </div>
            <el-tag type="primary" size="large">
              {{ selectedMonthLabel }} {{ selectedAnio }}
            </el-tag>
          </div>
        </template>

        <!-- 1. Meta Global del Hotel -->
        <div class="hotel-target-body">
          <el-row :gutter="24" align="middle">
            <el-col :xs="24" :md="8">
              <div class="input-goal-box">
                <label class="input-goal-label">{{ $t('goalsConfig.monthlyTargetAmount') }}</label>
                <el-input-number
                  v-model="hotelTargetAmount"
                  :min="0"
                  :step="500"
                  :precision="0"
                  size="large"
                  class="target-input-number"
                >
                  <template #suffix>
                    <span>$ (USD)</span>
                  </template>
                </el-input-number>
                <span class="help-text" v-if="defaultHotelTarget">
                  {{ $t('goalsConfig.defaultHotelTarget', { amount: formatCurrency(defaultHotelTarget) }) }}
                </span>
              </div>
            </el-col>

            <el-col :xs="24" :md="16">
              <div class="division-info-box">
                <div class="division-header">
                  <el-icon class="share-icon"><Share /></el-icon>
                  <span class="division-title">{{ $t('goalsConfig.suggestedEquitableDistribution') }}</span>
                </div>
                <p class="division-description">
                  {{ $t('goalsConfig.suggestedDescription', { count: assignedPhotographers.length }) }}
                </p>
                <div class="suggested-quota-badge">
                  {{ formatCurrency(suggestedQuotaPerPhotographer) }} <small>{{ $t('goalsConfig.perPhotographer') }}</small>
                </div>
              </div>
            </el-col>
          </el-row>
        </div>

        <el-divider style="margin: 1.75rem 0 1.25rem 0" />

        <!-- 2. Asignación Individual de Metas a Fotógrafos -->
        <div class="photographers-section">
          <div class="card-subheader-flex">
            <div class="header-left-title">
              <el-icon class="user-icon"><User /></el-icon>
              <span>{{
                $t('goalsConfig.individualGoalsTeam', { count: assignedPhotographers.length })
              }}</span>
            </div>
            <el-button
              type="primary"
              link
              :icon="Share"
              @click="applySuggestedDivisionToAll"
              :disabled="assignedPhotographers.length === 0"
            >
              {{ $t('goalsConfig.applySuggestedToAll') }}
            </el-button>
          </div>

          <div v-if="assignedPhotographers.length === 0" class="no-photographers">
            <el-empty
              :description="$t('goalsConfig.noPhotographers')"
              :image-size="70"
            />
          </div>

          <div v-else class="photographers-table-wrapper">
            <el-table :data="assignedPhotographers" style="width: 100%" stripe>
              <el-table-column :label="$t('goalsConfig.photographer')" min-width="240">
                <template #default="{ row }">
                  <div class="foto-cell">
                    <el-avatar
                      :src="row.imagen || undefined"
                      shape="circle"
                      :size="36"
                      :style="{
                        backgroundColor: getUserBgColor(row.color),
                        color: '#ffffff',
                        fontWeight: '600',
                      }"
                    >
                      {{ getUserInitials(row.nombre, row.apellidos) }}
                    </el-avatar>
                    <div class="foto-info">
                      <span class="foto-name">{{ row.nombre }} {{ row.apellidos }}</span>
                      <span class="foto-email">{{ row.email }}</span>
                    </div>
                  </div>
                </template>
              </el-table-column>

              <el-table-column :label="$t('goalsConfig.suggestedGoal')" width="160" align="center">
                <template #default>
                  <span class="text-muted">{{
                    formatCurrency(suggestedQuotaPerPhotographer)
                  }}</span>
                </template>
              </el-table-column>

              <el-table-column :label="$t('goalsConfig.assignedGoalUsd')" min-width="220">
                <template #default="{ row }">
                  <el-input-number
                    v-model="customPhotographerGoals[row.id]"
                    :min="0"
                    :step="200"
                    :precision="0"
                    size="default"
                    class="user-target-input"
                  >
                    <template #suffix>
                      <span>$ (USD)</span>
                    </template>
                  </el-input-number>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <!-- Botón de Guardado -->
          <div class="save-actions-bar">
            <el-button
              type="primary"
              size="large"
              :icon="Check"
              :loading="isSaving"
              @click="handleSaveHotelGoal"
            >
              {{ $t('goalsConfig.saveGoalsButton') }}
            </el-button>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.metas-config-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.25rem;
  padding-top: 0.5rem;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.filter-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--nav-link-color, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.full-width {
  width: 100%;
}

.metas-work-area {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.goals-unified-card {
  border-radius: 12px;
  border: 1px solid var(--border-color, #e2e8f0);
  background: var(--card-bg, #ffffff);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.card-header-flex {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.card-subheader-flex {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.header-left-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
}

.hotel-icon {
  color: #409eff;
}

.user-icon {
  color: #67c23a;
}

.input-goal-box {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-goal-label {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--heading-color, #0f172a);
}

.target-input-number {
  width: 100%;
  max-width: 320px;
}

.help-text {
  font-size: 0.8rem;
  color: var(--nav-link-color, #64748b);
}

.division-info-box {
  background-color: var(--app-bg, #f8fafc);
  border: 1px solid var(--el-border-color-light, #e2e8f0);
  border-radius: 10px;
  padding: 1.25rem;
}

.division-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.5rem;
  color: #3b82f6;
  font-weight: 700;
}

.division-description {
  margin: 0 0 0.75rem 0;
  font-size: 0.85rem;
  color: var(--nav-link-color, #64748b);
  line-height: 1.4;
}

.suggested-quota-badge {
  font-size: 1.35rem;
  font-weight: 800;
  color: #10b981;
}

.suggested-quota-badge small {
  font-size: 0.85rem;
  font-weight: 400;
  color: var(--nav-link-color, #64748b);
}

/* Photographers Table */
.foto-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.foto-info {
  display: flex;
  flex-direction: column;
}

.foto-name {
  font-weight: 600;
  color: var(--heading-color, #0f172a);
}

.foto-email {
  font-size: 0.75rem;
  color: var(--nav-link-color, #64748b);
}

.user-target-input {
  width: 100%;
  max-width: 220px;
}

.save-actions-bar {
  display: flex;
  justify-content: flex-end;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--el-border-color-light, #e2e8f0);
}

.option-item-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.hotel-option-icon {
  color: #94a3b8;
  font-size: 1rem;
}

:deep(.el-select-group__title) {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
  padding-top: 0.6rem;
  padding-bottom: 0.3rem;
}
</style>
