<script setup lang="ts">
import { useDashboard, monthsOptions } from '@/features/home/composables/useDashboard'
import PhotographerHotelGoalCard from '@/features/goals/ui/PhotographerHotelGoalCard.vue'
import { Camera, Calendar, Money } from '@element-plus/icons-vue'
import { Building2 } from '@lucide/vue'

const {
  commissionStore,
  selectedMes,
  photographerHotels,
  photographerPersonalGoals,
  getTodaySessionsForHotel,
  getTodaySalesForHotel,
  formatTime,
  goToAgenda,
  formatCurrency,
  myMonthlyCommissions,
  myCommissionFormula,
  myCommissionTooltip,
} = useDashboard()
</script>

<template>
  <div class="dashboard-section">
    <div class="section-header-row photographer-header-row">
      <h2 class="section-title">Tu Rendimiento y Comisiones</h2>
      <div class="controls-bar photographer-controls">
        <el-button
          type="primary"
          :icon="Calendar"
          size="large"
          class="btn-agenda-hotel"
          @click="goToAgenda"
        >
          Ir a la Agenda del Hotel
        </el-button>
      </div>
    </div>

    <!-- Widget de Comisiones del Fotógrafo -->
    <el-card class="dashboard-card mb-4 commission-banner-card" shadow="hover">
      <div class="commission-banner-content">
        <div class="commission-banner-left">
          <div class="comm-icon-wrapper">
            <el-icon><Money /></el-icon>
          </div>
          <div>
            <div class="comm-card-title">Tus Comisiones Acumuladas del Mes</div>
            <div class="comm-card-amount text-success">
              {{ formatCurrency(myMonthlyCommissions) }}
            </div>
          </div>
        </div>
        <div class="commission-banner-right">
          <el-tooltip
            :content="myCommissionTooltip"
            placement="top"
          >
            <el-tag type="success" effect="light" style="font-weight: 600; cursor: help">
              {{ myCommissionFormula }}
            </el-tag>
          </el-tooltip>
          <div class="stat-pill">
            <span class="pill-label">Ventas con Comisión:</span>
            <span class="pill-val">{{ commissionStore.comisiones.length }}</span>
          </div>
        </div>
      </div>

      <!-- Mini tabla de comisiones recientes si hay registros -->
      <div v-if="commissionStore.comisiones.length > 0" class="mt-3">
        <el-divider style="margin: 0.75rem 0" />
        <div
          style="
            font-size: 0.825rem;
            font-weight: 600;
            color: var(--el-text-color-secondary);
            margin-bottom: 6px;
          "
        >
          Desglose de tus comisiones en
          {{ monthsOptions.find((m) => m.value === selectedMes)?.label }}:
        </div>
        <el-table :data="commissionStore.comisiones" size="small" stripe style="width: 100%">
          <el-table-column prop="fechaVenta" label="Fecha" width="110" />
          <el-table-column prop="clienteNombre" label="Cliente" min-width="140" />
          <el-table-column prop="hotelNombre" label="Hotel" min-width="140" />
          <el-table-column label="Base Neta (tras imp.)" width="165" align="right">
            <template #default="{ row }">
              <span>{{ formatCurrency(row.baseCalculoUsd) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Tasa" width="90" align="center">
            <template #default="{ row }">
              <el-tag size="small" type="info">{{ row.porcentajeAplicado }}%</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Tu Comisión" width="120" align="right">
            <template #default="{ row }">
              <strong class="text-success">{{ formatCurrency(row.importeComisionUsd) }}</strong>
            </template>
          </el-table-column>
          <el-table-column prop="estado" label="Estado" width="110" align="center">
            <template #default="{ row }">
              <el-tag
                size="small"
                :type="
                  row.estado === 'PAGADA'
                    ? 'success'
                    : row.estado === 'APROBADA'
                      ? 'warning'
                      : 'info'
                "
              >
                {{ row.estado }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <!-- Tarjetas de Metas Agrupadas por Hotel -->
    <div v-if="photographerPersonalGoals.length === 0" class="mb-4">
      <el-card class="dashboard-card" shadow="hover">
        <el-empty
          description="Aún no tienes metas registradas para este mes en tus hoteles asignados."
        />
      </el-card>
    </div>

    <div v-else class="photographer-goals-container mb-4">
      <el-row :gutter="20">
        <el-col v-for="g in photographerPersonalGoals" :key="g.hotelId" :xs="24" :md="12" :lg="12">
          <PhotographerHotelGoalCard
            :hotel-nombre="g.hotelNombre"
            :hotel-progreso="g.hotel"
            :personal-progreso="g.personal"
            :month-label="monthsOptions.find((m) => m.value === selectedMes)?.label || ''"
          />
        </el-col>
      </el-row>
    </div>

    <!-- Trabajo de hoy por hotel e instrucciones -->
    <h3 class="subsection-title mt-4">Tu trabajo para hoy</h3>
    <el-row :gutter="20" class="photographer-grid">
      <el-col :xs="24" :md="12">
        <div class="hotels-cards-container">
          <el-card
            v-for="hotel in photographerHotels"
            :key="hotel.id"
            class="dashboard-card hotel-work-card mb-4"
            shadow="hover"
          >
            <template #header>
              <div class="hotel-card-header">
                <div class="hotel-title-area">
                  <el-icon class="hotel-header-icon"><Building2 :size="18" /></el-icon>
                  <span class="hotel-name font-bold">{{ hotel.nombre }}</span>
                </div>
                <span class="hotel-sub-info text-muted">
                  {{ hotel.paisNombre }} — {{ hotel.areaNombre }}
                </span>
              </div>
            </template>

            <div class="hotel-work-body">
              <!-- 1. Sesiones Fotográficas de Hoy -->
              <div class="work-block mb-3">
                <div class="work-block-header">
                  <el-icon class="work-icon text-primary"><Camera /></el-icon>
                  <span class="work-block-title font-semibold">
                    Sesiones Fotográficas de Hoy ({{ getTodaySessionsForHotel(hotel.id).length }})
                  </span>
                </div>

                <div v-if="getTodaySessionsForHotel(hotel.id).length > 0" class="work-list mt-2">
                  <div
                    v-for="s in getTodaySessionsForHotel(hotel.id)"
                    :key="s.id"
                    class="work-item-row"
                  >
                    <div class="work-time-badge">
                      <el-icon><Calendar /></el-icon>
                      <span>{{ formatTime(s.fechaHoraInicio) }}</span>
                    </div>
                    <div class="client-name font-semibold">{{ s.clienteNombre }}</div>
                    <div v-if="s.numeroHabitacion" class="room-tag">
                      Hab: {{ s.numeroHabitacion }}
                    </div>
                    <el-tag size="small" :type="s.estado === 'COMPLETADA' ? 'success' : 'primary'">
                      {{ s.estado }}
                    </el-tag>
                  </div>
                </div>
                <div v-else class="work-empty-hint mt-1">
                  <span class="text-muted">Sin sesiones fotográficas agendadas para hoy.</span>
                </div>
              </div>

              <!-- Divider -->
              <div class="work-block-divider"></div>

              <!-- 2. Citas de Venta de Hoy -->
              <div class="work-block mt-3">
                <div class="work-block-header">
                  <el-icon class="work-icon text-success"><Money /></el-icon>
                  <span class="work-block-title font-semibold">
                    Citas de Venta de Hoy ({{ getTodaySalesForHotel(hotel.id).length }})
                  </span>
                </div>

                <div v-if="getTodaySalesForHotel(hotel.id).length > 0" class="work-list mt-2">
                  <div
                    v-for="c in getTodaySalesForHotel(hotel.id)"
                    :key="c.id"
                    class="work-item-row"
                  >
                    <div class="work-time-badge">
                      <el-icon><Calendar /></el-icon>
                      <span>{{ formatTime(c.fechaHoraCita) }}</span>
                    </div>
                    <div class="client-name font-semibold">
                      {{ c.clienteNombre || 'Cliente' }}
                    </div>
                    <div v-if="c.numeroHabitacion" class="room-tag">
                      Hab: {{ c.numeroHabitacion }}
                    </div>
                    <el-tag size="small" :type="c.estado === 'COMPLETADA' ? 'success' : 'warning'">
                      {{ c.estado }}
                    </el-tag>
                  </div>
                </div>
                <div v-else class="work-empty-hint mt-1">
                  <span class="text-muted">Sin citas de venta agendadas para hoy.</span>
                </div>
              </div>
            </div>
          </el-card>

          <el-empty
            v-if="photographerHotels.length === 0"
            description="No tienes ningún hotel asignado actualmente."
          />
        </div>

        <!-- Botón para versión móvil justo después de las tarjetas de trabajo de hoy -->
        <div class="mobile-agenda-btn-container mb-4">
          <el-button
            type="primary"
            :icon="Calendar"
            size="large"
            class="btn-agenda-hotel"
            @click="goToAgenda"
          >
            Ir a la Agenda del Hotel
          </el-button>
        </div>
      </el-col>
    </el-row>
    <el-row :gutter="20">
      <el-col :xs="24" :md="12">
        <el-card class="dashboard-card instructions-card" shadow="hover">
          <template #header>
            <div class="instructions-header">
              <div class="instructions-title-area">
                <el-icon class="instructions-icon"><Camera /></el-icon>
                <span class="instructions-name font-bold">Instrucciones del Fotógrafo</span>
              </div>
            </div>
          </template>
          <div class="instructions-body">
            <ol class="instructions-list">
              <li>Acude al hotel asignado en las horas de mayor afluencia.</li>
              <li>Mantén tu equipo de fotografía calibrado y limpio.</li>
              <li>Reporta cualquier incidencia al supervisor de la zona.</li>
              <li>Sigue estrictamente las políticas de privacidad de los huéspedes.</li>
            </ol>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.mobile-agenda-btn-container {
  display: none;
}

@media (max-width: 768px) {
  .mobile-agenda-btn-container {
    display: block;
    width: 100%;
  }

  .mobile-agenda-btn-container .btn-agenda-hotel {
    width: 100%;
  }
}
</style>

