<script setup lang="ts">
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'

interface PeriodStats {
  total: number
  sessions: number
  sales: number
}

interface Props {
  title: string
  stats: PeriodStats
  currentView: string
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'nav', action: 'prev' | 'next' | 'today'): void
  (e: 'changeView', viewName: string): void
}>()
</script>

<template>
  <div class="desktop-calendar-toolbar">
    <!-- Izquierda: Controles de navegación (<, >, Hoy) -->
    <div class="calendar-toolbar-left">
      <el-button-group class="nav-button-group">
        <el-button
          type="primary"
          :icon="ArrowLeft"
          class="toolbar-btn nav-btn"
          @click="emit('nav', 'prev')"
          title="Periodo anterior"
        />
        <el-button
          type="primary"
          :icon="ArrowRight"
          class="toolbar-btn nav-btn"
          @click="emit('nav', 'next')"
          title="Periodo siguiente"
        />
      </el-button-group>
      <el-button
        type="primary"
        class="toolbar-btn today-btn"
        @click="emit('nav', 'today')"
      >
        Hoy
      </el-button>
    </div>

    <!-- Centro: Título del Periodo + Badge de Total de Sesiones / Citas -->
    <div class="calendar-toolbar-center">
      <h2 class="calendar-period-title">{{ title }}</h2>
      <el-tooltip
        effect="dark"
        placement="bottom"
        :content="`${stats.sessions} sesiones fotográficas y ${stats.sales} citas de venta programadas`"
      >
        <el-tag type="success" effect="light" round size="large" class="calendar-period-badge">
          <span class="badge-count">{{ stats.total }}</span>
          <span class="badge-label">
            {{ stats.total === 1 ? 'Sesión / Cita' : 'Sesiones / Citas' }}
          </span>
        </el-tag>
      </el-tooltip>
    </div>

    <!-- Derecha: Selector de Vistas (Mes, Semana, Día, Agenda) -->
    <div class="calendar-toolbar-right">
      <el-button-group class="view-button-group">
        <el-button
          :type="currentView === 'dayGridMonth' ? 'primary' : 'default'"
          :class="{ 'is-active': currentView === 'dayGridMonth' }"
          class="toolbar-btn view-btn"
          @click="emit('changeView', 'dayGridMonth')"
        >
          Mes
        </el-button>
        <el-button
          :type="currentView === 'timeGridWeek' ? 'primary' : 'default'"
          :class="{ 'is-active': currentView === 'timeGridWeek' }"
          class="toolbar-btn view-btn"
          @click="emit('changeView', 'timeGridWeek')"
        >
          Semana
        </el-button>
        <el-button
          :type="currentView === 'timeGridDay' ? 'primary' : 'default'"
          :class="{ 'is-active': currentView === 'timeGridDay' }"
          class="toolbar-btn view-btn"
          @click="emit('changeView', 'timeGridDay')"
        >
          Día
        </el-button>
        <el-button
          :type="currentView === 'listWeek' ? 'primary' : 'default'"
          :class="{ 'is-active': currentView === 'listWeek' }"
          class="toolbar-btn view-btn"
          @click="emit('changeView', 'listWeek')"
        >
          Agenda
        </el-button>
      </el-button-group>
    </div>
  </div>
</template>

<style scoped>
.desktop-calendar-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  padding-bottom: 0.25rem;
  gap: 1rem;
}

.calendar-toolbar-left {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.nav-button-group :deep(.toolbar-btn.nav-btn) {
  padding: 10px 18px;
  height: 38px;
  background-color: var(--el-color-primary, #409eff);
  border-color: var(--el-color-primary, #409eff);
  color: #ffffff;
  font-size: 1rem;
}

.nav-button-group :deep(.toolbar-btn.nav-btn:hover) {
  background-color: var(--el-color-primary-light-3, #66b1ff);
  border-color: var(--el-color-primary-light-3, #66b1ff);
}

.today-btn {
  padding: 10px 22px !important;
  height: 38px !important;
  background-color: var(--el-color-primary-light-9, #ecf5ff) !important;
  border-color: var(--el-color-primary-light-6, #b3d8ff) !important;
  color: var(--el-color-primary, #409eff) !important;
  font-weight: 500 !important;
  border-radius: var(--el-border-radius-base, 4px) !important;
  transition: all 0.2s ease-in-out !important;
}

.today-btn:hover {
  background-color: var(--el-color-primary, #409eff) !important;
  border-color: var(--el-color-primary, #409eff) !important;
  color: #ffffff !important;
}

.calendar-toolbar-center {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.85rem;
}

.calendar-period-title {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 600;
  text-transform: capitalize;
  color: var(--heading-color, #0f172a);
  letter-spacing: -0.01em;
}

.calendar-period-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: default;
  background-color: var(--el-color-success-light-9, #f0fdf4);
  border: 1px solid var(--el-color-success-light-5, #86efac);
  color: var(--el-color-success-dark-2, #15803d);
  box-shadow: 0 1px 3px rgba(16, 185, 129, 0.12);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.calendar-period-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(16, 185, 129, 0.22);
}

.calendar-period-badge .badge-count {
  font-weight: 700;
  font-size: 0.92rem;
  background-color: var(--el-color-success, #10b981);
  color: #ffffff;
  padding: 1px 7px;
  border-radius: 10px;
  line-height: 1.2;
  margin-right: 0.5rem;
}

.calendar-period-badge .badge-label {
  font-weight: 600;
  color: var(--el-color-success-dark-2, #15803d);
}

.calendar-toolbar-right {
  display: flex;
  align-items: center;
}

.view-button-group :deep(.toolbar-btn.view-btn) {
  padding: 10px 20px;
  height: 38px;
  font-size: var(--el-font-size-base, 14px);
  font-weight: 500;
  transition: all 0.2s ease-in-out;
}

.view-button-group :deep(.toolbar-btn.view-btn.is-active) {
  background-color: var(--el-color-primary, #409eff) !important;
  border-color: var(--el-color-primary, #409eff) !important;
  color: #ffffff !important;
  font-weight: 600 !important;
}

.view-button-group :deep(.toolbar-btn.view-btn:not(.is-active)) {
  background-color: var(--toolbar-bg, #ffffff);
  border-color: var(--toolbar-border, #e2e8f0);
  color: var(--nav-link-color, #64748b);
}

.view-button-group :deep(.toolbar-btn.view-btn:not(.is-active):hover) {
  background-color: var(--el-color-primary-light-9, #ecf5ff);
  border-color: var(--el-color-primary-light-5, #a0cfff);
  color: var(--el-color-primary, #409eff);
}
</style>
