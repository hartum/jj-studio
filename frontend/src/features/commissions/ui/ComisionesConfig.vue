<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useCommissionStore } from '../stores/commission.store'
import { useCountryStore } from '@/features/countries/stores/country.store'
import { useHotelStore } from '@/features/hotels/stores/hotel.store'
import { ElMessage } from 'element-plus'
import { Check, InfoFilled, Location, Delete } from '@element-plus/icons-vue'
import { Building2, HandCoins } from '@lucide/vue'
import { getRoleSvg } from '@/features/users/utils/user-avatar'
import type { ComisionConfig } from '../domain/commission.model'

const commissionStore = useCommissionStore()
const countryStore = useCountryStore()
const hotelStore = useHotelStore()

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
  await Promise.all([countryStore.fetchCountries(), hotelStore.fetchHotels()])
  // Default to first country if available (e.g., México)
  if (countryStore.countries.length > 0 && countryStore.countries[0]) {
    selectedPaisId.value = countryStore.countries[0].id
  }
  await loadConfig()
})

watch([selectedPaisId, selectedHotelId], async () => {
  await loadConfig()
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
    ElMessage.success('Configuración de comisiones guardada correctamente')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al guardar la configuración'
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
    ElMessage.success('Configuración de comisiones eliminada correctamente')
    await loadConfig()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al eliminar la configuración'
    ElMessage.error(message)
  }
}
</script>

<template>
  <div class="comisiones-config-container">
    <!-- Toolbar superior de Selección Geográfica y Recálculo -->
    <div class="toolbar-bar">
      <div class="toolbar-left">
        <el-select
          v-model="selectedPaisId"
          placeholder="🌐 Configuración Global (Por defecto)"
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
          placeholder="Todos los hoteles del país seleccionado"
          clearable
          filterable
          size="large"
          class="hotel-select"
          :disabled="!selectedPaisId"
          popper-class="custom-group-select-dropdown"
        >
          <template v-for="area in groupedAreas" :key="area.id">
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
      </div>
    </div>

    <!-- Card Unificada de Configuración de Porcentajes -->
    <el-card shadow="never" class="matrix-card">
      <div class="matrix-sections-container">
        <!-- 1. Sección Fotógrafo -->
        <div class="role-section">
          <div class="section-header-role">
            <el-tag type="success" size="large" effect="light" class="role-tag">
              <img :src="getRoleSvg('FOTOGRAFO')" class="role-header-icon" alt="Fotógrafo" />
              Fotógrafo
            </el-tag>
            <span class="role-desc-header">Comisión sobre las ventas de sus sesiones</span>
          </div>
          <el-divider border-style="dashed" class="section-divider" />

          <div class="inputs-row">
            <div class="input-block">
              <div class="contract-label">
                <span class="contract-badge salaried">Contratado</span>
                <span class="contract-hint">Fotógrafo en plantilla con sueldo base</span>
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
                <span class="contract-badge commission-only">Freelance</span>
                <span class="contract-hint">Fotógrafo freelance o sin sueldo fijo</span>
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

        <!-- 2. Sección Vendedor / Agendador -->
        <div class="role-section">
          <div class="section-header-role">
            <el-tag type="primary" size="large" effect="light" class="role-tag">
              <img
                :src="getRoleSvg('AGENDADOR')"
                class="role-header-icon"
                alt="Vendedor / Agendador"
              />
              Vendedor / Agendador
            </el-tag>
            <span class="role-desc-header">Comisión por captación y apertura de sesión</span>
          </div>
          <el-divider border-style="dashed" class="section-divider" />

          <div class="inputs-row">
            <div class="input-block">
              <div class="contract-label">
                <span class="contract-badge salaried">Contratado</span>
                <span class="contract-hint">Agendador en plantilla con sueldo base</span>
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
                <span class="contract-badge commission-only">Freelance</span>
                <span class="contract-hint">Captador o comisionista externo</span>
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

        <!-- 3. Sección Supervisor de Hotel -->
        <div class="role-section">
          <div class="section-header-role">
            <el-tag type="warning" size="large" effect="light" class="role-tag">
              <img
                :src="getRoleSvg('SUPERVISOR')"
                class="role-header-icon"
                alt="Supervisor de Hotel"
              />
              Supervisor de Hotel
            </el-tag>
            <span class="role-desc-header">
              Comisión fija sobre la venta total de su hotel asignado
            </span>
          </div>
          <el-divider border-style="dashed" class="section-divider" />

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

        <!-- 4. Sección Gerente de Área -->
        <div class="role-section">
          <div class="section-header-role">
            <el-tag type="danger" size="large" effect="light" class="role-tag">
              <img :src="getRoleSvg('GERENTE')" class="role-header-icon" alt="Gerente de Área" />
              Gerente de Área
            </el-tag>

            <span class="role-desc-header">
              Comisión fija sobre las ventas de todos los hoteles de su área
            </span>
          </div>
          <el-divider border-style="dashed" class="section-divider" />

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

        <!-- 5. Sección Retención Estatal / Impuestos -->
        <div class="role-section">
          <div class="section-header-role">
            <el-tag type="info" size="large" effect="light" class="role-tag tax-tag">
              <HandCoins :size="18" class="role-lucide-icon" />
              Estado / Retención Impuestos
            </el-tag>
            <span class="role-desc-header">
              Porcentaje deducido de los ingresos de cada venta antes de calcular las comisiones
            </span>
          </div>
          <el-divider border-style="dashed" class="section-divider" />

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

        <!-- Divisor final antes del footer -->
        <el-divider class="section-divider final-divider" />

        <!-- 4. Footer con Info y Botón Guardar -->
        <div class="card-footer-actions">
          <div class="summary-info">
            <el-icon><InfoFilled /></el-icon>
            <span>
              Las modificaciones afectarán de manera inmediata a las nuevas ventas que se completen.
              Las ventas ya cerradas mantienen su valor original registrado en el momento de la
              venta.
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
            Guardar Configuración de Comisiones
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- Lista de Configuraciones Activas Guardadas -->
    <div v-if="commissionStore.configs.length > 0" class="saved-configs-section">
      <h4 class="section-subtitle">Configuraciones Guardadas en el Sistema</h4>
      <el-table :data="commissionStore.configs" border stripe style="width: 100%">
        <el-table-column prop="paisNombre" label="País" min-width="150" />
        <el-table-column prop="hotelNombre" label="Hotel" min-width="160" />
        <el-table-column label="Retención Estado" align="center" width="150">
          <template #default="{ row }">
            <span class="text-danger font-semibold">-{{ row.impuestoPct ?? 16 }}%</span>
          </template>
        </el-table-column>
        <el-table-column label="Fotógrafo Contratado | Freelance" align="center" width="220">
          <template #default="{ row }">
            <span>
              {{ row.fotografoAsalariadoPct }}% |
              <strong>{{ row.fotografoSinSalarioPct }}%</strong>
            </span>
          </template>
        </el-table-column>
        <el-table-column label="Vendedor Contratado | Freelance" align="center" width="220">
          <template #default="{ row }">
            <span>
              {{ row.vendedorAsalariadoPct }}% |
              <strong>{{ row.vendedorSinSalarioPct }}%</strong>
            </span>
          </template>
        </el-table-column>
        <el-table-column label="Supervisor" align="center" width="110">
          <template #default="{ row }">
            <span>{{ row.supervisorPct }}%</span>
          </template>
        </el-table-column>
        <el-table-column label="Gerente" align="center" width="110">
          <template #default="{ row }">
            <span>{{ row.gerentePct }}%</span>
          </template>
        </el-table-column>
        <el-table-column label="Acciones" width="90" align="center">
          <template #default="{ row }">
            <el-popconfirm
              title="¿Eliminar esta configuración de comisiones?"
              confirm-button-text="Eliminar"
              cancel-button-text="Cancelar"
              confirm-button-type="danger"
              :width="260"
              @confirm="handleDeleteConfig(row)"
            >
              <template #reference>
                <el-button type="danger" link :icon="Delete" title="Eliminar configuración" />
              </template>
            </el-popconfirm>
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

.country-select {
  width: 320px;
}

.hotel-select {
  width: 360px;
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

.role-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 4rem;
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
}

.role-tag {
  font-weight: 700 !important;
  text-transform: uppercase;
  img {
    margin-top: -12px;
    vertical-align: middle;
  }
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

.role-desc-header {
  font-size: 0.825rem;
  color: var(--text-muted, #64748b);
}

.inputs-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
  margin-bottom: 1rem;
}

@media (max-width: 768px) {
  .inputs-row {
    grid-template-columns: 1fr;
  }
}

.input-block {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.mt-1 {
  margin-top: 0.25rem;
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

.pct-unit {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--heading-color, #0f172a);
  user-select: none;
}

.section-divider {
  margin: 0.3rem 0;
}

.final-divider {
  margin: 0.85rem 0 1.25rem 0 !important;
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
</style>
