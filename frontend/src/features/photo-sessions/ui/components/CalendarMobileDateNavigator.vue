<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'
import { ChevronLeft, ChevronRight } from '@lucide/vue'

interface Props {
  currentDate: string
  viewMode?: string // 'timeGridDay' | 'listWeek'
  eventsCountByDate?: Record<string, number>
}

const props = withDefaults(defineProps<Props>(), {
  viewMode: 'timeGridDay',
  eventsCountByDate: () => ({}),
})

const emit = defineEmits<{
  (e: 'prev'): void
  (e: 'next'): void
  (e: 'today'): void
}>()

const isWeekMode = computed(() => props.viewMode === 'listWeek')

// Día / Fecha base
const currentDayjs = computed(() => {
  const d = dayjs(props.currentDate)
  return d.isValid() ? d : dayjs()
})

// Inicio y Fin de Semana (Lunes a Domingo)
const startOfWeek = computed(() => currentDayjs.value.startOf('week'))
const endOfWeek = computed(() => currentDayjs.value.endOf('week'))

// Cabecera del Mes (Banner superior)
const formattedMonth = computed(() => {
  if (isWeekMode.value) {
    const mStart = startOfWeek.value.format('MMM').replace('.', '').toUpperCase()
    const mEnd = endOfWeek.value.format('MMM').replace('.', '').toUpperCase()
    if (mStart !== mEnd) {
      return `${mStart}/${mEnd}`
    }
    return mStart
  }
  return currentDayjs.value.format('MMM').replace('.', '').toUpperCase()
})

// Vista Día: Número de Día y Nombre del Día de la Semana
const formattedDayNumber = computed(() => currentDayjs.value.format('D'))

const formattedWeekday = computed(() => {
  const weekday = currentDayjs.value.format('dddd')
  return weekday.charAt(0).toUpperCase() + weekday.slice(1)
})

// Vista Semana: Rango '24 al 30' y Número de Semana del Mes (ej. '5ª Semana')
const startDayNumber = computed(() => startOfWeek.value.format('D'))
const endDayNumber = computed(() => endOfWeek.value.format('D'))

const weekOfMonth = computed(() => {
  const d = startOfWeek.value
  const firstDayOfMonth = d.startOf('month')
  const firstDayIso = firstDayOfMonth.day() === 0 ? 7 : firstDayOfMonth.day()
  return Math.ceil((d.date() + firstDayIso - 1) / 7)
})

// Conteo total de eventos en el rango seleccionado (Día o Semana)
const totalEventsCount = computed(() => {
  if (!props.eventsCountByDate) return 0
  if (isWeekMode.value) {
    let sum = 0
    const start = startOfWeek.value
    for (let i = 0; i < 7; i++) {
      const dateStr = start.add(i, 'day').format('YYYY-MM-DD')
      sum += props.eventsCountByDate[dateStr] || 0
    }
    return sum
  }
  const dateStr = currentDayjs.value.format('YYYY-MM-DD')
  return props.eventsCountByDate[dateStr] || 0
})
</script>

<template>
  <div class="mobile-date-navigator">
    <!-- Botón Flecha Izquierda (Anterior) -->
    <button
      type="button"
      class="nav-arrow-btn"
      :aria-label="isWeekMode ? 'Semana anterior' : 'Día anterior'"
      :title="isWeekMode ? 'Semana anterior' : 'Día anterior'"
      @click="emit('prev')"
    >
      <ChevronLeft :size="20" :stroke-width="2.2" />
    </button>

    <!-- Contenedor con el-badge oficial de Element Plus -->
    <el-badge
      :value="totalEventsCount"
      :hidden="totalEventsCount === 0"
      :max="99"
      class="date-leaf-badge-wrapper"
    >
      <!-- Ficha Central de Calendario (Rojo como icono_cita.png) -->
      <div
        class="date-leaf-card"
        :class="{ 'is-week': isWeekMode }"
        role="button"
        tabindex="0"
        title="Ir a hoy"
        :aria-label="
          isWeekMode ? 'Semana actual. Clic para ir a hoy' : 'Día actual. Clic para ir a hoy'
        "
        @click="emit('today')"
        @keydown.enter="emit('today')"
        @keydown.space.prevent="emit('today')"
      >
        <!-- Banner superior con Mes (Rojo) -->
        <div class="date-leaf-header">
          <span>{{ formattedMonth }}</span>
        </div>

        <!-- Cuerpo de la Ficha -->
        <div class="date-leaf-body">
          <!-- Modo Semana: 24 al 30 / 5ª Semana -->
          <template v-if="isWeekMode">
            <div class="date-leaf-week-range">
              <span class="range-num">{{ startDayNumber }}</span>
              <span class="range-separator">al</span>
              <span class="range-num">{{ endDayNumber }}</span>
            </div>
            <span class="date-leaf-subtext">{{ weekOfMonth }}ª Semana</span>
          </template>

          <!-- Modo Día: 27 / Jueves -->
          <template v-else>
            <span class="date-leaf-day">{{ formattedDayNumber }}</span>
            <span class="date-leaf-subtext">{{ formattedWeekday }}</span>
          </template>
        </div>
      </div>
    </el-badge>

    <!-- Botón Flecha Derecha (Siguiente) -->
    <button
      type="button"
      class="nav-arrow-btn"
      :aria-label="isWeekMode ? 'Semana siguiente' : 'Día siguiente'"
      :title="isWeekMode ? 'Semana siguiente' : 'Día siguiente'"
      @click="emit('next')"
    >
      <ChevronRight :size="20" :stroke-width="2.2" />
    </button>
  </div>
</template>

<style scoped>
.mobile-date-navigator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.25rem;
  margin: 0.5rem 0 0.85rem 0;
  user-select: none;
}

/* ── Botón Circular Estilo JJ Studio (Fondo Blanco + Borde Suave) ── */
.nav-arrow-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--toolbar-border, #e2e8f0);
  background-color: var(--toolbar-bg, #ffffff);
  color: var(--heading-color, #0f172a);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  outline: none;
  -webkit-tap-highlight-color: transparent;
  padding: 0;
  transition: transform 0.12s ease;
}

.nav-arrow-btn:focus,
.nav-arrow-btn:focus-visible,
.nav-arrow-btn:active {
  outline: none;
  border-color: var(--toolbar-border, #e2e8f0);
  background-color: var(--toolbar-bg, #ffffff);
  color: var(--heading-color, #0f172a);
}

.nav-arrow-btn:active {
  transform: scale(0.92);
}

@media (hover: hover) and (pointer: fine) {
  .nav-arrow-btn:hover {
    background-color: var(--el-fill-color-light, #f8fafc);
  }
}

/* ── Badge de Element Plus para la Ficha Central ── */
.date-leaf-badge-wrapper {
  display: inline-flex;
}

.date-leaf-badge-wrapper :deep(.el-badge__content) {
  background-color: #334155;
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  height: 20px;
  line-height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  border: 1.5px solid var(--toolbar-bg, #ffffff);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.25);
  z-index: 10;
}

/* ── Ficha Central de Calendario (Banner y Borde Rojo) ── */
.date-leaf-card {
  width: 94px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--toolbar-bg, #ffffff);
  border: 2px solid #ef4444;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
  text-align: center;
  cursor: pointer;
  outline: none;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.date-leaf-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(36, 36, 36, 0.25);
}

.date-leaf-card:active {
  transform: scale(0.96);
}

.date-leaf-header {
  background: #ef4444;
  color: #ffffff;
  font-size: 0.88rem;
  font-weight: 800;
  padding: 4px 6px;
  letter-spacing: 0.8px;
  border-bottom: 1.5px dashed rgba(255, 255, 255, 0.6);
  line-height: 1.2;
}

.date-leaf-body {
  padding: 4px 4px 6px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--toolbar-bg, #ffffff);
  min-height: 48px;
}

.date-leaf-day {
  font-size: 1.65rem;
  font-weight: 800;
  line-height: 1.1;
  color: var(--heading-color, #0f172a);
}

.date-leaf-week-range {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 2px;
  line-height: 1.1;
}

.range-num {
  font-size: 1.45rem;
  font-weight: 800;
  color: var(--heading-color, #0f172a);
}

.range-separator {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--heading-color, #0f172a);
  margin: 0 1px;
}

.date-leaf-subtext {
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--nav-link-color, #64748b);
  text-transform: capitalize;
  margin-top: 2px;
}

/* ── Soporte Modo Oscuro ── */
html.dark .nav-arrow-btn {
  background-color: var(--toolbar-bg, #1d1e1f);
  border-color: var(--toolbar-border, #363637);
  color: #ffffff;
}

html.dark .nav-arrow-btn:focus,
html.dark .nav-arrow-btn:focus-visible,
html.dark .nav-arrow-btn:active {
  border-color: var(--toolbar-border, #363637);
  background-color: var(--toolbar-bg, #1d1e1f);
  color: #ffffff;
}

@media (hover: hover) and (pointer: fine) {
  html.dark .nav-arrow-btn:hover {
    background-color: #262727;
  }
}

html.dark .date-leaf-badge-wrapper :deep(.el-badge__content) {
  border-color: #1d1e1f;
  background-color: #334155;
}

html.dark .date-leaf-card {
  background: #1e293b;
  border-color: #ef4444;
}

html.dark .date-leaf-body {
  background: #1e293b;
}

html.dark .date-leaf-day,
html.dark .range-num,
html.dark .range-separator {
  color: #ffffff;
}

html.dark .date-leaf-subtext {
  color: #94a3b8;
}
</style>
