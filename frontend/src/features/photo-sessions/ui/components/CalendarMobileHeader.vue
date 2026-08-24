<script setup lang="ts">
import dayjs from 'dayjs'

interface Props {
  date: string
  view: string
  pickerType: 'week' | 'date'
  eventsCountByDate: Record<string, number>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:date', val: string): void
  (e: 'update:view', val: string): void
  (e: 'changeView', val: string): void
}>()

function getEventCountForDate(dateOrDayjs: unknown): number {
  if (!dateOrDayjs) return 0
  const dateStr = dayjs(dateOrDayjs as Date | string).format('YYYY-MM-DD')
  return props.eventsCountByDate[dateStr] || 0
}

function handleViewChange(val: string | number | boolean | undefined) {
  if (typeof val === 'string') {
    emit('update:view', val)
    emit('changeView', val)
  }
}
</script>

<template>
  <div class="mobile-sticky-calendar-header">
    <!-- Selector de fecha para móvil (DatePickerPanel sin bordes con badges) -->
    <div class="mobile-picker-panel-wrapper">
      <el-date-picker-panel
        :key="pickerType"
        :border="false"
        :model-value="date"
        :type="pickerType"
        value-format="YYYY-MM-DD"
        date-format="YYYY-MM-DD"
        @update:model-value="emit('update:date', $event)"
      >
        <template #default="cell">
          <div class="el-date-table-cell" :class="{ current: cell.isCurrent }">
            <span class="el-date-table-cell__text">{{ cell.text }}</span>
            <span
              v-if="getEventCountForDate(cell.date || cell.dayjs) > 0"
              class="mobile-picker-day-badge"
            >
              {{ getEventCountForDate(cell.date || cell.dayjs) }}
            </span>
          </div>
        </template>
      </el-date-picker-panel>
    </div>

    <!-- Botones de Cambio de Vista Móvil: Día | Agenda -->
    <div class="mobile-view-buttons-wrapper">
      <el-radio-group
        :model-value="view"
        size="default"
        class="mobile-view-segmented"
        @change="handleViewChange"
      >
        <el-radio-button value="timeGridDay">Día</el-radio-button>
        <el-radio-button value="listWeek">Agenda</el-radio-button>
      </el-radio-group>
    </div>
  </div>
</template>

<style scoped>
.mobile-sticky-calendar-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--toolbar-bg, #ffffff);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  margin-bottom: 1rem;
  padding: 0.5rem 0.5rem 0.75rem 0.5rem;
}

.mobile-picker-panel-wrapper {
  display: flex;
  justify-content: center;
  overflow-x: auto;
  width: 100%;
}

.mobile-picker-panel-wrapper :deep(.el-picker-panel) {
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
  margin: 0 auto;
}

.mobile-picker-panel-wrapper :deep(.el-date-picker__header) {
  margin: 4px 12px !important;
}

.mobile-picker-panel-wrapper :deep(.el-date-table) {
  font-size: 12px;
}

.mobile-picker-panel-wrapper :deep(.el-date-table th) {
  padding: 2px !important;
}

.mobile-picker-panel-wrapper :deep(.el-date-table td) {
  padding: 2px 0 !important;
}

.mobile-picker-panel-wrapper :deep(.el-date-table-cell) {
  position: relative;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mobile-picker-day-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  background-color: var(--el-color-success, #10b981);
  color: #ffffff;
  font-size: 9px;
  font-weight: 700;
  min-width: 14px;
  height: 14px;
  line-height: 14px;
  padding: 0 3px;
  border-radius: 7px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
  pointer-events: none;
  z-index: 2;
}

.mobile-picker-panel-wrapper :deep(.current) .mobile-picker-day-badge,
.mobile-picker-panel-wrapper :deep(.start-date) .mobile-picker-day-badge,
.mobile-picker-panel-wrapper :deep(.end-date) .mobile-picker-day-badge,
.mobile-picker-panel-wrapper :deep(.in-range) .mobile-picker-day-badge,
.mobile-picker-panel-wrapper :deep(.is-week-mode) .mobile-picker-day-badge {
  background-color: var(--el-color-success, #10b981);
  color: #ffffff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
}

.mobile-picker-panel-wrapper :deep(.prev-month) .mobile-picker-day-badge,
.mobile-picker-panel-wrapper :deep(.next-month) .mobile-picker-day-badge {
  opacity: 0.4;
}

.mobile-view-buttons-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 0.25rem;
}

.mobile-view-segmented {
  width: 90%;
  display: flex;
}

.mobile-view-segmented :deep(.el-radio-button) {
  flex: 1;
}

.mobile-view-segmented :deep(.el-radio-button__inner) {
  width: 100%;
}
</style>
