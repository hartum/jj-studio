<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useHotelStore } from '../stores/hotel.store'
import { useCountryStore } from '@/features/countries/stores/country.store'
import type { Hotel } from '../domain/hotel.model'
import { getFlagEmoji } from '@/shared/flagEmoji'
import { useLocale } from '@/i18n/useLocale'
import { Search, Plus, EditPen, Delete, Location, Calendar } from '@element-plus/icons-vue'
import { Building2 } from '@lucide/vue'
import { ElMessage } from 'element-plus'

const { t } = useLocale()
const router = useRouter()
const hotelStore = useHotelStore()
const countryStore = useCountryStore()

const searchQuery = ref('')
const areaFilter = ref<number | null | string>(null)

onMounted(async () => {
  await countryStore.fetchCountries()
  await hotelStore.fetchHotels()
})

// Lista plana de todas las áreas activas con su país correspondiente para el desplegable de selección
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

// Lista filtrada de hoteles
const filteredHotels = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  return hotelStore.hotels.filter((h) => {
    const matchesQuery =
      !query ||
      h.nombre.toLowerCase().includes(query) ||
      (h.areaNombre && h.areaNombre.toLowerCase().includes(query)) ||
      (h.paisNombre && h.paisNombre.toLowerCase().includes(query)) ||
      (h.cadenaHotelera && h.cadenaHotelera.toLowerCase().includes(query))

    const matchesArea =
      areaFilter.value === null ||
      areaFilter.value === undefined ||
      areaFilter.value === '' ||
      h.areaId === areaFilter.value

    return matchesQuery && matchesArea
  })
})

function navigateToCreate() {
  router.push('/hoteles/nuevo')
}

function navigateToEdit(hotel: Hotel) {
  router.push(`/hoteles/${hotel.id}/editar`)
}

async function handleDeleteHotel(hotel: Hotel) {
  try {
    await hotelStore.deleteHotel(hotel.id)
    ElMessage.success(t('hotelsConfig.toasts.hotelDeleted', { name: hotel.nombre }))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t('hotelsConfig.toasts.deleteError')
    ElMessage.error(message)
  }
}
</script>

<template>
  <div v-loading="hotelStore.isLoading" class="hoteles-config-container">
    <!-- Toolbar superior: Búsqueda, Filtro por Área y Botón Nuevo Hotel -->
    <div class="toolbar-bar">
      <div class="toolbar-left">
        <el-input
          v-model="searchQuery"
          :placeholder="t('hotelsConfig.searchPlaceholder')"
          :prefix-icon="Search"
          size="large"
          clearable
          class="search-input"
        />

        <el-select
          v-model="areaFilter"
          :placeholder="t('hotelsConfig.allAreas')"
          size="large"
          clearable
          class="area-filter-select"
        >
          <el-option
            v-for="area in allAreasFlat"
            :key="area.id"
            :label="`${getFlagEmoji(area.paisCodigo)} ${area.nombre} (${area.paisNombre})`"
            :value="area.id"
          />
        </el-select>
      </div>

      <el-button type="primary" :icon="Plus" size="large" @click="navigateToCreate">
        {{ t('hotelsConfig.newHotel') }}
      </el-button>
    </div>

    <!-- Tabla de Hoteles -->
    <div class="table-card">
      <el-table :data="filteredHotels" stripe style="width: 100%">
        <el-table-column :label="t('hotelsConfig.table.hotelName')" sortable prop="nombre">
          <template #default="{ row }">
            <div class="hotel-name-cell">
              <el-icon class="hotel-cell-icon"><Building2 /></el-icon>
              <strong class="hotel-fullname">{{ row.nombre }}</strong>
            </div>
          </template>
        </el-table-column>

        <el-table-column :label="t('hotelsConfig.table.country')" sortable prop="paisNombre">
          <template #default="{ row }">
            <div class="country-cell">
              <span class="flag-icon">{{ getFlagEmoji(row.paisCodigo || '') }}</span>
              <span class="country-name">{{ row.paisNombre }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column :label="t('hotelsConfig.table.area')" sortable prop="areaNombre">
          <template #default="{ row }">
            <div class="area-cell">
              <el-icon class="area-cell-icon"><Location /></el-icon>
              <strong class="area-fullname">{{ row.areaNombre }}</strong>
            </div>
          </template>
        </el-table-column>

        <el-table-column :label="t('hotelsConfig.table.hotelChain')" prop="cadenaHotelera">
          <template #default="{ row }">
            <span>{{ row.cadenaHotelera || 'N/A' }}</span>
          </template>
        </el-table-column>

        <el-table-column :label="t('hotelsConfig.table.stars')" width="140" align="center">
          <template #default="{ row }">
            <el-rate v-if="row.estrellas" :model-value="row.estrellas" disabled />
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>

        <el-table-column :label="t('hotelsConfig.table.contact')" prop="personaContacto">
          <template #default="{ row }">
            <div class="contact-info">
              <span>{{ row.personaContacto || 'N/A' }}</span>
              <small v-if="row.telefono" class="contact-phone">{{ row.telefono }}</small>
            </div>
          </template>
        </el-table-column>

        <el-table-column :label="t('hotelsConfig.googleCalendar.sectionTitle')" width="160" align="center">
          <template #default="{ row }">
            <el-tooltip
              v-if="row.gcalConfigured"
              :content="`ID: ${row.gcalCalendarId}`"
              placement="top"
            >
              <span>
                <el-tag type="success" size="small" effect="plain" class="gcal-status-tag">
                  <el-icon class="mr-1"><Calendar /></el-icon>
                  {{ t('hotelsConfig.googleCalendar.tableBadgeConnected') }}
                </el-tag>
              </span>
            </el-tooltip>
            <el-tag v-else type="info" size="small" effect="plain" class="gcal-status-tag text-muted">
              {{ t('hotelsConfig.googleCalendar.tableBadgeNotConfigured') }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column :label="t('hotelsConfig.table.actions')" width="120" align="center">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button
                type="primary"
                link
                :icon="EditPen"
                :title="t('hotelsConfig.editHotelTooltip')"
                @click="navigateToEdit(row)"
              />
              <el-popconfirm
                :title="t('hotelsConfig.deleteConfirm', { name: row.nombre })"
                :confirm-button-text="t('hotelsConfig.delete')"
                :cancel-button-text="t('hotelsConfig.cancel')"
                confirm-button-type="danger"
                :width="240"
                @confirm="handleDeleteHotel(row)"
              >
                <template #reference>
                  <el-button
                    type="danger"
                    link
                    :icon="Delete"
                    :title="t('hotelsConfig.deleteHotelTooltip')"
                  />
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
.hoteles-config-container {
  padding-top: 0.5rem;
}

.search-input {
  width: 280px;
}

.area-filter-select {
  width: 240px;
}

.hotel-name-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.hotel-cell-icon {
  color: #94a3b8;
  font-size: 1.1rem;
}

.hotel-fullname {
  color: var(--heading-color, #0f172a);
}

.country-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.country-name {
  font-weight: 500;
  color: var(--heading-color, #0f172a);
}

.area-cell {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.area-cell-icon {
  color: #e6a23c;
  font-size: 1.05rem;
}

.area-fullname {
  font-weight: 600;
  color: var(--heading-color, #0f172a);
}

.contact-info {
  display: flex;
  flex-direction: column;
}

.contact-phone {
  font-size: 0.75rem;
  color: var(--nav-link-color, #64748b);
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 0.1rem;
  .el-button {
    font-size: 1.3rem;
    padding: 4px;
  }
}

.text-muted {
  color: #94a3b8;
}

@media (max-width: 768px) {
  .hoteles-config-container {
    padding: 1rem;
  }

  .search-input,
  .area-filter-select {
    width: 100%;
  }
}
</style>
