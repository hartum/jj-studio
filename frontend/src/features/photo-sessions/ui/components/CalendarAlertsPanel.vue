<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Bell } from '@element-plus/icons-vue'
import type { SesionFotografica } from '../../domain/session.model'

interface Props {
  overdueSessions: SesionFotografica[]
  missingSaleSessions: SesionFotografica[]
  overdueSales: SesionFotografica[]
}

const props = defineProps<Props>()
const router = useRouter()

const activeAlertPanels = ref<string[]>([])

const totalAlertsCount = computed(() => {
  return props.overdueSessions.length + props.missingSaleSessions.length + props.overdueSales.length
})

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '-'
  return dateStr.replace('T', ' ').slice(0, 16)
}
</script>

<template>
  <div v-if="totalAlertsCount > 0" class="alerts-panel-wrapper">
    <el-collapse v-model="activeAlertPanels" class="alerts-collapse">
      <el-collapse-item name="alerts">
        <template #title>
          <div class="alerts-panel-header">
            <el-icon class="alerts-header-icon"><Bell /></el-icon>
            <span class="alerts-header-title">Alertas Pendientes</span>
            <el-tag type="danger" effect="dark" round size="small" class="alerts-count-badge">
              {{ totalAlertsCount }}
            </el-tag>
          </div>
        </template>

        <div class="alerts-sections-grid">
          <!-- 1. Sesiones Vencidas -->
          <div v-if="overdueSessions.length > 0" class="alert-section section-overdue">
            <h4 class="section-title">Sesiones Vencidas ({{ overdueSessions.length }})</h4>
            <div class="section-cards">
              <div v-for="s in overdueSessions" :key="s.id" class="alert-item-card">
                <div class="item-details">
                  <span class="item-name">{{ s.clienteNombre }}</span>
                  <span class="item-sub">
                    {{ formatDateTime(s.fechaHoraInicio)
                    }}{{ s.numeroHabitacion ? ` | Hab ${s.numeroHabitacion}` : '' }}
                  </span>
                </div>
                <el-button type="warning" @click="router.push(`/agenda/${s.id}/editar`)">
                  Cambiar Estado
                </el-button>
              </div>
            </div>
          </div>

          <!-- 2. Sesiones Sin Cita de Venta -->
          <div v-if="missingSaleSessions.length > 0" class="alert-section section-missing">
            <h4 class="section-title">
              Sesiones Sin Cita de Venta ({{ missingSaleSessions.length }})
            </h4>
            <div class="section-cards">
              <div v-for="s in missingSaleSessions" :key="s.id" class="alert-item-card">
                <div class="item-details">
                  <span class="item-name">{{ s.clienteNombre }}</span>
                  <span class="item-sub">
                    {{ formatDateTime(s.fechaHoraInicio)
                    }}{{ s.numeroHabitacion ? ` | Hab ${s.numeroHabitacion}` : '' }}
                  </span>
                </div>
                <el-button type="primary" @click="router.push(`/ventas/nueva?sesionId=${s.id}`)">
                  Agendar Venta
                </el-button>
              </div>
            </div>
          </div>

          <!-- 3. Citas de Venta Vencidas -->
          <div v-if="overdueSales.length > 0" class="alert-section section-noshow">
            <h4 class="section-title">Citas venta vencidas ({{ overdueSales.length }})</h4>
            <div class="section-cards">
              <div v-for="s in overdueSales" :key="s.id" class="alert-item-card">
                <div class="item-details">
                  <span class="item-name">{{ s.clienteNombre }}</span>
                  <span class="item-sub">
                    {{ formatDateTime(s.citaVenta?.fechaHoraCita)
                    }}{{ s.numeroHabitacion ? ` | Hab ${s.numeroHabitacion}` : '' }}
                  </span>
                </div>
                <el-button type="warning" @click="router.push(`/ventas/${s.citaVenta?.id}/editar`)">
                  Cambiar Estado
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<style scoped>
.alerts-panel-wrapper {
  margin-bottom: 1.25rem;
}

.alerts-collapse {
  border: 1px solid var(--el-color-warning-light-5, #fde68a);
  border-radius: var(--el-card-border-radius, 8px);
  background-color: var(--el-color-warning-light-9, #fffbeb);
  overflow: hidden;
}

:deep(.alerts-collapse .el-collapse-item__header) {
  background-color: var(--el-color-warning-light-9, #fffbeb);
  border-bottom: none;
  padding: 0 1.25rem;
  height: 48px;
}

:deep(.alerts-collapse .el-collapse-item__wrap) {
  background-color: var(--el-color-warning-light-9, #fffbeb);
  border-bottom: none;
}

:deep(.alerts-collapse .el-collapse-item__content) {
  padding: 0 1.25rem 1.25rem 1.25rem;
}

.alerts-panel-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-weight: 600;
  color: var(--el-color-warning-dark-2, #b45309);
}

.alerts-header-icon {
  font-size: 1.1rem;
  color: var(--el-color-warning, #e6a23c);
}

.alerts-header-title {
  font-size: 0.95rem;
}

.alerts-sections-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.alert-section {
  background-color: var(--toolbar-bg, #ffffff);
  border: 1px solid var(--toolbar-border, #e2e8f0);
  border-radius: 6px;
  padding: 1rem;
}

.section-title {
  font-size: 0.85rem;
  font-weight: 700;
  margin: 0 0 0.75rem 0;
  color: var(--heading-color, #334155);
}

.section-cards {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.alert-item-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background-color: var(--el-fill-color-blank, #f8fafc);
  border-bottom: 1px solid var(--toolbar-border, #e2e8f0);
}

.item-details {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.item-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--heading-color, #0f172a);
}

.item-sub {
  font-size: 0.75rem;
  color: var(--nav-link-color, #64748b);
}
</style>
