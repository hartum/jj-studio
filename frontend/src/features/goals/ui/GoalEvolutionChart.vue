<script setup lang="ts">
import { ref, computed } from 'vue'
import { formatCurrency } from '@/shared/formatters'
import type { EvolucionMetasResponse } from '../domain/goal.model'
import { Activity, Calendar, CalendarDays } from '@lucide/vue'

const props = defineProps<{
  data: EvolucionMetasResponse | null
  loading?: boolean
  hotelName?: string
}>()

const activeTab = ref<'mes' | 'anio'>('mes')
const hoveredIndex = ref<number | null>(null)

// --- CONFIGURACIÓN DE DIMENSIONES DEL GRÁFICO SVG ---
const svgWidth = 800
const svgHeight = 280
const padding = { top: 30, right: 30, bottom: 45, left: 60 }

const chartWidth = svgWidth - padding.left - padding.right
const chartHeight = svgHeight - padding.top - padding.bottom

// --- DATOS DEL MES (DÍA A DÍA) ---
const mesPoints = computed(() => props.data?.evolucionMes || [])

const maxValMes = computed(() => {
  if (!mesPoints.value.length) return 1000
  let max = 0
  for (const p of mesPoints.value) {
    if (p.realAcumulado > max) max = p.realAcumulado
    if (p.objetivoAcumulado > max) max = p.objetivoAcumulado
  }
  return max > 0 ? Math.ceil(max * 1.15) : 1000
})

const mesCoordinates = computed(() => {
  if (!mesPoints.value.length) return { real: '', objetivo: '', area: '', points: [] }

  const count = mesPoints.value.length
  const stepX = count > 1 ? chartWidth / (count - 1) : chartWidth
  const max = maxValMes.value

  const coords = mesPoints.value.map((p, i) => {
    const x = padding.left + i * stepX
    const yReal = padding.top + chartHeight - (p.realAcumulado / max) * chartHeight
    const yObjetivo = padding.top + chartHeight - (p.objetivoAcumulado / max) * chartHeight
    return { x, yReal, yObjetivo, data: p }
  })

  if (!coords.length) return { real: '', objetivo: '', area: '', points: [] }
  const firstCoord = coords[0]
  const lastCoord = coords[coords.length - 1]
  if (!firstCoord || !lastCoord) return { real: '', objetivo: '', area: '', points: [] }

  // Generar paths SVG
  let realPath = `M ${firstCoord.x} ${firstCoord.yReal}`
  let objetivoPath = `M ${firstCoord.x} ${firstCoord.yObjetivo}`
  let areaPath = `M ${firstCoord.x} ${firstCoord.yReal}`

  for (let i = 1; i < coords.length; i++) {
    const pt = coords[i]
    if (pt) {
      realPath += ` L ${pt.x} ${pt.yReal}`
      objetivoPath += ` L ${pt.x} ${pt.yObjetivo}`
      areaPath += ` L ${pt.x} ${pt.yReal}`
    }
  }

  const bottomY = padding.top + chartHeight
  areaPath += ` L ${lastCoord.x} ${bottomY} L ${firstCoord.x} ${bottomY} Z`

  return { real: realPath, objetivo: objetivoPath, area: areaPath, points: coords }
})

// --- DATOS DEL AÑO (MES A MES) ---
const anioPoints = computed(() => props.data?.evolucionAnio || [])

const maxValAnio = computed(() => {
  if (!anioPoints.value.length) return 1000
  let max = 0
  for (const p of anioPoints.value) {
    if (p.realAcumulado > max) max = p.realAcumulado
    if (p.objetivoAcumulado > max) max = p.objetivoAcumulado
  }
  return max > 0 ? Math.ceil(max * 1.15) : 1000
})

const anioCoordinates = computed(() => {
  if (!anioPoints.value.length) return { real: '', objetivo: '', area: '', points: [] }

  const count = anioPoints.value.length
  const stepX = count > 1 ? chartWidth / (count - 1) : chartWidth
  const max = maxValAnio.value

  const coords = anioPoints.value.map((p, i) => {
    const x = padding.left + i * stepX
    const yReal = padding.top + chartHeight - (p.realAcumulado / max) * chartHeight
    const yObjetivo = padding.top + chartHeight - (p.objetivoAcumulado / max) * chartHeight
    return { x, yReal, yObjetivo, data: p }
  })

  if (!coords.length) return { real: '', objetivo: '', area: '', points: [] }
  const firstCoord = coords[0]
  const lastCoord = coords[coords.length - 1]
  if (!firstCoord || !lastCoord) return { real: '', objetivo: '', area: '', points: [] }

  let realPath = `M ${firstCoord.x} ${firstCoord.yReal}`
  let objetivoPath = `M ${firstCoord.x} ${firstCoord.yObjetivo}`
  let areaPath = `M ${firstCoord.x} ${firstCoord.yReal}`

  for (let i = 1; i < coords.length; i++) {
    const pt = coords[i]
    if (pt) {
      realPath += ` L ${pt.x} ${pt.yReal}`
      objetivoPath += ` L ${pt.x} ${pt.yObjetivo}`
      areaPath += ` L ${pt.x} ${pt.yReal}`
    }
  }

  const bottomY = padding.top + chartHeight
  areaPath += ` L ${lastCoord.x} ${bottomY} L ${firstCoord.x} ${bottomY} Z`

  return { real: realPath, objetivo: objetivoPath, area: areaPath, points: coords }
})

// --- Y-AXIS TICKS (4 divisiones) ---
const currentMax = computed(() => (activeTab.value === 'mes' ? maxValMes.value : maxValAnio.value))

const yTicks = computed(() => {
  const max = currentMax.value
  return [0, Math.round(max * 0.33), Math.round(max * 0.66), max].map((val) => ({
    val,
    y: padding.top + chartHeight - (val / max) * chartHeight,
  }))
})

// Current coordinates based on active tab
const currentCoords = computed(() => {
  return activeTab.value === 'mes' ? mesCoordinates.value : anioCoordinates.value
})

const hoveredPoint = computed(() => {
  if (hoveredIndex.value === null) return null
  return currentCoords.value.points[hoveredIndex.value] || null
})

</script>

<template>
  <el-card class="evolution-card" shadow="hover">
    <!-- Header with tab switcher & title -->
    <div class="chart-header">
      <div class="header-left">
        <div class="chart-title-row">
          <el-icon :size="20" class="header-icon"><Activity /></el-icon>
          <h3 class="chart-title">{{ $t('dashboard.evolution.title') }}</h3>
        </div>
        <span class="chart-subtitle">
          {{ hotelName ? $t('dashboard.evolution.hotelPrefix', { name: hotelName }) : $t('dashboard.evolution.generalConsolidated') }} — {{ $t('dashboard.evolution.subtitle', { hotel: '', year: data?.anio || 2026 }).replace(/^\s*—\s*/, '') }}
        </span>
      </div>

      <div class="header-right">
        <!-- Switcher Mes vs Año -->
        <el-radio-group v-model="activeTab" class="tab-radio-group">
          <el-radio-button value="mes">
            <el-icon :size="14"><Calendar /></el-icon>
            <span class="tab-label">{{ $t('dashboard.evolution.monthly') }}</span>
          </el-radio-button>
          <el-radio-button value="anio">
            <el-icon :size="14"><CalendarDays /></el-icon>
            <span class="tab-label">{{ $t('dashboard.evolution.annual') }}</span>
          </el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <!-- Leyenda -->
    <div class="chart-legend">
      <div class="legend-item">
        <span class="legend-dot dot-real"></span>
        <span class="legend-text">{{ $t('dashboard.evolution.realSalesAccumulated') }}</span>
      </div>
      <div class="legend-item">
        <span class="legend-line dot-objetivo"></span>
        <span class="legend-text">{{ $t('dashboard.evolution.targetPacing') }}</span>
      </div>
    </div>

    <!-- Loading / Empty / SVG Chart -->
    <div class="chart-body" v-loading="loading">
      <div v-if="!data || (!mesPoints.length && !anioPoints.length)" class="empty-state">
        <el-empty
          :description="$t('dashboard.evolution.noData')"
          :image-size="80"
        />
      </div>

      <div v-else class="svg-container" @mouseleave="hoveredIndex = null">
        <svg
          :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
          class="evolution-svg"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <!-- Gradient for real sales area fill -->
            <linearGradient id="realGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#409eff" stop-opacity="0.35" />
              <stop offset="100%" stop-color="#409eff" stop-opacity="0.02" />
            </linearGradient>

            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#3b82f6" />
              <stop offset="100%" stop-color="#60a5fa" />
            </linearGradient>
          </defs>

          <!-- Y-Axis Grid Lines & Labels -->
          <g class="grid-lines">
            <line
              v-for="tick in yTicks"
              :key="tick.val"
              :x1="padding.left"
              :y1="tick.y"
              :x2="svgWidth - padding.right"
              :y2="tick.y"
              class="grid-line"
            />
            <text
              v-for="tick in yTicks"
              :key="`lbl-${tick.val}`"
              :x="padding.left - 10"
              :y="tick.y + 4"
              class="axis-text axis-y-text"
              text-anchor="end"
            >
              {{ formatCurrency(tick.val) }}
            </text>
          </g>

          <!-- Area Fill -->
          <path
            v-if="currentCoords.area"
            :d="currentCoords.area"
            fill="url(#realGradient)"
            class="area-path"
          />

          <!-- Target Line (Dashed) -->
          <path v-if="currentCoords.objetivo" :d="currentCoords.objetivo" class="line-objetivo" />

          <!-- Real Sales Line -->
          <path v-if="currentCoords.real" :d="currentCoords.real" class="line-real" />

          <!-- X-Axis Labels & Points -->
          <g class="axis-x-labels">
            <template v-if="activeTab === 'mes'">
              <!-- Show day label every 3-5 days -->
              <text
                v-for="(pt, idx) in currentCoords.points"
                :key="`x-day-${idx}`"
                v-show="idx === 0 || (idx + 1) % 5 === 0 || idx === currentCoords.points.length - 1"
                :x="pt.x"
                :y="padding.top + chartHeight + 20"
                class="axis-text axis-x-text"
                text-anchor="middle"
              >
                {{ $t('dashboard.evolution.day', { day: (pt.data as any).dia }) }}
              </text>
            </template>

            <template v-else>
              <text
                v-for="(pt, idx) in currentCoords.points"
                :key="`x-mes-${idx}`"
                :x="pt.x"
                :y="padding.top + chartHeight + 20"
                class="axis-text axis-x-text"
                text-anchor="middle"
              >
                {{ (pt.data as any).mesNombre }}
              </text>
            </template>
          </g>

          <!-- Interactive Hover Guides and Points -->
          <g class="interactive-points">
            <!-- Vertical guide line -->
            <line
              v-if="hoveredPoint"
              :x1="hoveredPoint.x"
              :y1="padding.top"
              :x2="hoveredPoint.x"
              :y2="padding.top + chartHeight"
              class="hover-guide-line"
            />

            <!-- Visible dots on hover -->
            <circle
              v-if="hoveredPoint"
              :cx="hoveredPoint.x"
              :cy="hoveredPoint.yObjetivo"
              r="4"
              class="hover-dot-objetivo"
            />
            <circle
              v-if="hoveredPoint"
              :cx="hoveredPoint.x"
              :cy="hoveredPoint.yReal"
              r="6"
              class="hover-dot-real"
            />

            <!-- Transparent capture bars for easy hovering -->
            <rect
              v-for="(pt, idx) in currentCoords.points"
              :key="`hit-${idx}`"
              :x="pt.x - chartWidth / (currentCoords.points.length * 2)"
              :y="padding.top"
              :width="chartWidth / currentCoords.points.length"
              :height="chartHeight"
              fill="transparent"
              class="hit-area"
              @mouseenter="hoveredIndex = idx"
            />
          </g>
        </svg>

        <!-- Floating Tooltip -->
        <transition name="fade">
          <div
            v-if="hoveredPoint"
            class="chart-tooltip"
            :style="{
              left: `${(hoveredPoint.x / svgWidth) * 100}%`,
              top: `${(Math.min(hoveredPoint.yReal, hoveredPoint.yObjetivo) / svgHeight) * 100}%`,
            }"
          >
            <div class="tooltip-title">
              <span v-if="activeTab === 'mes'"
                >{{ $t('dashboard.evolution.dayOfMonth', { day: (hoveredPoint.data as any).dia }) }}</span
              >
              <span v-else>{{ $t('dashboard.evolution.monthOf', { month: (hoveredPoint.data as any).mesNombre }) }}</span>
            </div>
            <div class="tooltip-row">
              <span class="tooltip-dot dot-real"></span>
              <span class="tooltip-lbl">{{ $t('dashboard.evolution.accumulatedSales') }}</span>
              <span class="tooltip-val font-semibold text-primary">
                {{ formatCurrency(hoveredPoint.data.realAcumulado) }}
              </span>
            </div>
            <div class="tooltip-row">
              <span class="tooltip-dot dot-objetivo"></span>
              <span class="tooltip-lbl">{{ $t('dashboard.evolution.targetPacingLbl') }}</span>
              <span class="tooltip-val">
                {{ formatCurrency(hoveredPoint.data.objetivoAcumulado) }}
              </span>
            </div>
            <div class="tooltip-row tooltip-footer">
              <span class="tooltip-lbl">{{ $t('dashboard.evolution.difference') }}</span>
              <span
                class="tooltip-val font-bold"
                :class="
                  hoveredPoint.data.realAcumulado >= hoveredPoint.data.objetivoAcumulado
                    ? 'text-success'
                    : 'text-danger'
                "
              >
                {{
                  hoveredPoint.data.realAcumulado >= hoveredPoint.data.objetivoAcumulado ? '+' : ''
                }}
                {{
                  formatCurrency(
                    hoveredPoint.data.realAcumulado - hoveredPoint.data.objetivoAcumulado,
                  )
                }}
              </span>
            </div>
          </div>
        </transition>
      </div>
    </div>
  </el-card>
</template>

<style scoped>
.evolution-card {
  border-radius: 12px;
  border: 1px solid var(--el-border-color-light, #e2e8f0);
  background-color: var(--el-bg-color-overlay, #ffffff);
  margin-bottom: 1.5rem;
}

.evolution-card :deep(.el-card__body) {
  padding: 1.5rem;
}

/* Header */
.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.chart-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-icon {
  color: #409eff;
}

.chart-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
}

.chart-subtitle {
  font-size: 0.82rem;
  color: var(--nav-link-color, #64748b);
}

.tab-radio-group :deep(.el-radio-button__inner) {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-weight: 600;
  font-size: 0.8rem;
}

/* Legend */
.chart-legend {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.8rem;
  color: var(--nav-link-color, #64748b);
  font-weight: 500;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-line {
  width: 18px;
  height: 3px;
  border-radius: 2px;
}

.dot-real {
  background-color: #3b82f6;
}

.dot-objetivo {
  background-color: #10b981;
  border: 1px dashed #10b981;
}

/* Chart Body */
.chart-body {
  position: relative;
  min-height: 240px;
}

.svg-container {
  position: relative;
  width: 100%;
}

.evolution-svg {
  width: 100%;
  height: auto;
  overflow: visible;
}

/* Grid and Axis */
.grid-line {
  stroke: var(--el-border-color-lighter, #f1f5f9);
  stroke-dasharray: 4, 4;
  stroke-width: 1;
}

.axis-text {
  font-size: 10px;
  fill: var(--nav-link-color, #94a3b8);
  font-weight: 500;
  font-family: inherit;
}

/* Lines and Areas */
.area-path {
  transition: d 0.5s ease-in-out;
}

.line-real {
  fill: none;
  stroke: url(#lineGradient);
  stroke-width: 3.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 4px 6px rgba(59, 130, 246, 0.25));
  transition: d 0.5s ease-in-out;
}

.line-objetivo {
  fill: none;
  stroke: #10b981;
  stroke-width: 2.2;
  stroke-dasharray: 6, 4;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: d 0.5s ease-in-out;
}

/* Hover and Hit area */
.hit-area {
  cursor: crosshair;
}

.hover-guide-line {
  stroke: #94a3b8;
  stroke-width: 1.5;
  stroke-dasharray: 3, 3;
}

.hover-dot-real {
  fill: #3b82f6;
  stroke: #ffffff;
  stroke-width: 2.5;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.hover-dot-objetivo {
  fill: #10b981;
  stroke: #ffffff;
  stroke-width: 2;
}

/* Tooltip */
.chart-tooltip {
  position: absolute;
  transform: translate(-50%, -120%);
  background-color: var(--el-bg-color-overlay, #ffffff);
  border: 1px solid var(--el-border-color-light, #e2e8f0);
  border-radius: 8px;
  padding: 0.65rem 0.85rem;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
  pointer-events: none;
  z-index: 20;
  min-width: 170px;
  font-size: 0.78rem;
  backdrop-filter: blur(8px);
}

.tooltip-title {
  font-weight: 700;
  color: var(--heading-color, #0f172a);
  margin-bottom: 0.35rem;
  border-bottom: 1px solid var(--el-border-color-lighter, #f1f5f9);
  padding-bottom: 0.25rem;
}

.tooltip-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.2rem;
  color: var(--nav-link-color, #64748b);
}

.tooltip-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tooltip-lbl {
  flex: 1;
}

.tooltip-val {
  color: var(--heading-color, #0f172a);
}

.tooltip-footer {
  margin-top: 0.35rem;
  padding-top: 0.25rem;
  border-top: 1px dashed var(--el-border-color-lighter, #f1f5f9);
}

.text-primary {
  color: #3b82f6 !important;
}

.text-success {
  color: #10b981 !important;
}

.text-danger {
  color: #ef4444 !important;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
