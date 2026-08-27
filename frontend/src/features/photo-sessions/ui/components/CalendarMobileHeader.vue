<script setup lang="ts">
import dayjs from 'dayjs'

interface Props {
  date: string
  pickerType: 'week' | 'date'
  eventsCountByDate: Record<string, number>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:date', val: string): void
}>()

function getEventCountForDate(dateOrDayjs: unknown): number {
  if (!dateOrDayjs) return 0
  const dateStr = dayjs(dateOrDayjs as Date | string).format('YYYY-MM-DD')
  return props.eventsCountByDate[dateStr] || 0
}
</script>

<template>
  <div class="mobile-calendar-header">
    <!-- Selector de fecha para móvil (DatePickerPanel plano sin tarjeta y con flechas simples) -->
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
  </div>
</template>

<style scoped>
.mobile-calendar-header {
  background: transparent;
  border-radius: 0;
  box-shadow: none;
  margin-bottom: 0.5rem;
  padding: 0;
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

/* Ocultar flechas dobles de navegación anual (« y ») */
.mobile-picker-panel-wrapper :deep(.d-arrow-left),
.mobile-picker-panel-wrapper :deep(.d-arrow-right),
.mobile-picker-panel-wrapper :deep(.el-date-picker__prev-btn.d-arrow-left),
.mobile-picker-panel-wrapper :deep(.el-date-picker__next-btn.d-arrow-right) {
  display: none !important;
}

.mobile-picker-panel-wrapper :deep(.el-date-picker__header) {
  margin: 4px 12px !important;
}

.mobile-picker-panel-wrapper :deep(.el-date-picker__header-label) {
  font-size: 1rem;
  font-weight: 600;
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
  background-color: #334155;
  color: #ffffff;
  font-size: 9px;
  font-weight: 700;
  min-width: 15px;
  height: 15px;
  line-height: 15px;
  padding: 0 3px;
  border-radius: 999px;
  text-align: center;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  pointer-events: none;
  z-index: 4;
}

.mobile-picker-panel-wrapper :deep(.current) .mobile-picker-day-badge,
.mobile-picker-panel-wrapper :deep(.start-date) .mobile-picker-day-badge,
.mobile-picker-panel-wrapper :deep(.end-date) .mobile-picker-day-badge,
.mobile-picker-panel-wrapper :deep(.in-range) .mobile-picker-day-badge,
.mobile-picker-panel-wrapper :deep(.is-week-mode) .mobile-picker-day-badge {
  background-color: #334155;
  color: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
}

.mobile-picker-panel-wrapper :deep(.prev-month) .mobile-picker-day-badge,
.mobile-picker-panel-wrapper :deep(.next-month) .mobile-picker-day-badge {
  opacity: 0.35;
}
</style>
