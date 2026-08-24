<script setup lang="ts">
import { computed } from 'vue'
import { Location } from '@element-plus/icons-vue'
import { Building2 } from '@lucide/vue'
import type { Hotel } from '@/features/hotels/domain/hotel.model'
import iconoCamara from '@/assets/icono_camara.png'
import iconoCita from '@/assets/icono_cita.png'

interface Props {
  hotelIds: number[]
  hotels: Hotel[]
  selectedHotelName: string
  isMobile?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:hotelIds', value: number[]): void
  (e: 'newSession'): void
  (e: 'newSale'): void
}>()

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

const groupedHotelsByCountry = computed<CountryGroup[]>(() => {
  const hotels = props.hotels || []
  const groupsMap = new Map<number, CountryGroup>()

  for (const h of hotels) {
    const countryId = h.paisId || 0
    const countryName = h.paisNombre || 'Sin País'
    const countryCode = h.paisCodigo || ''

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
    const areaName = h.areaNombre || 'Sin Área'

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
</script>

<template>
  <div class="calendar-header">
    <div class="header-info">
      <h1 class="page-title">Agenda</h1>
      <p class="page-subtitle">
        Hotel:
        <strong>{{ selectedHotelName }}</strong>
      </p>
    </div>

    <div class="header-actions">
      <!-- Selector de Hotel (Oculto si solo hay 1 hotel asignado o ninguno) -->
      <el-select
        v-if="hotels.length > 1"
        :model-value="hotelIds"
        placeholder="Filtrar por Hotel"
        class="hotel-selector"
        multiple
        collapse-tags
        collapse-tags-tooltip
        :max-collapse-tags="2"
        filterable
        clearable
        :size="isMobile ? 'large' : 'default'"
        popper-class="custom-group-select-dropdown"
        @update:model-value="emit('update:hotelIds', $event)"
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
              v-for="hotel in area.hoteles"
              :key="hotel.id"
              :label="`${hotel.nombre} (${area.nombre})`"
              :value="hotel.id"
              class="hotel-sub-option"
            >
              <div class="option-item-content hotel-option-item">
                <el-icon :size="18" class="hotel-option-icon"><Building2 /></el-icon>
                <span class="hotel-name">{{ hotel.nombre }}</span>
              </div>
            </el-option>
          </template>
        </el-option-group>
      </el-select>

      <div class="header-buttons-row">
        <!-- Botón Nueva Sesión Fotográfica -->
        <el-button
          type="primary"
          :size="isMobile ? 'large' : 'default'"
          class="header-action-btn"
          @click="emit('newSession')"
        >
          <img :src="iconoCamara" alt="Cámara" class="btn-action-icon btn-icon-camara" />
          <span class="btn-action-label">Nueva Sesión</span>
        </el-button>

        <!-- Botón Nueva Cita de Venta -->
        <el-button
          type="primary"
          :size="isMobile ? 'large' : 'default'"
          class="header-action-btn"
          @click="emit('newSale')"
        >
          <img :src="iconoCita" alt="Cita" class="btn-action-icon btn-icon-calendar" />
          <span class="btn-action-label">Nueva Cita de Venta</span>
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
  margin: 0 0 0.25rem 0;
}

.page-subtitle {
  font-size: 0.9rem;
  color: var(--nav-link-color, #64748b);
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-buttons-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-action-btn {
  display: inline-flex;
  align-items: center;
}

.header-action-btn :deep(> span) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-action-icon {
  width: 32px;
  height: 32px;
  object-fit: contain;
  flex-shrink: 0;
  vertical-align: middle;
}

.btn-icon-calendar {
  width: 25px;
  height: 25px;
}

.hotel-selector {
  min-width: 220px;
  max-width: 320px;
}

@media (max-width: 768px) {
  .calendar-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .header-actions {
    flex-direction: column;
    width: 100%;
    gap: 0.75rem;
  }

  .hotel-selector {
    width: 100%;
  }

  .header-buttons-row {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .header-action-btn {
    width: 100%;
    justify-content: center;
    padding: 10px 8px !important;
  }

  .header-action-btn :deep(> span) {
    font-size: 0.85rem;
  }
}
</style>
