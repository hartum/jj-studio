<script setup lang="ts">
import type { Hotel } from '@/features/hotels/domain/hotel.model'
import iconoCamara from '@/assets/icono_camara.png'
import iconoCita from '@/assets/icono_cita.png'

interface Props {
  hotelId: number | null
  hotels: Hotel[]
  selectedHotelName: string
  isMobile?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:hotelId', value: number | null): void
  (e: 'newSession'): void
  (e: 'newSale'): void
}>()
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
      <!-- Selector de Hotel -->
      <el-select
        :model-value="hotelId"
        placeholder="Filtrar por Hotel"
        class="hotel-selector"
        filterable
        clearable
        :size="isMobile ? 'large' : 'default'"
        @update:model-value="emit('update:hotelId', $event)"
      >
        <el-option
          v-for="hotel in hotels"
          :key="hotel.id"
          :label="hotel.nombre"
          :value="hotel.id"
        />
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
  width: 220px;
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
