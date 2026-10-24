<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { House, Calendar, Setting, User, Location } from '@element-plus/icons-vue'
import { Building2 } from '@lucide/vue'

export interface HotelNode {
  id: number
  nombre: string
}

export interface AreaNode {
  id: number
  nombre: string
  hoteles?: HotelNode[]
}

export interface CountryNode {
  id: number
  nombre: string
  areas?: AreaNode[]
}

defineProps<{
  canSeeAgenda: boolean
  canSeeConfig: boolean
  canSeeUsers: boolean
  filteredCountriesTree: CountryNode[]
  collapsed?: boolean
}>()

const emit = defineEmits<{
  (e: 'navigate'): void
  (e: 'selectHotel', hotelId: number): void
}>()

function handleNavClick() {
  emit('navigate')
}

function handleHotelClick(hotelId: number) {
  emit('selectHotel', hotelId)
  emit('navigate')
}
</script>

<template>
  <nav class="sidebar-nav" :class="{ 'is-collapsed': collapsed }">
    <!-- Sección fija superior: Inicio, Configuración, Usuarios -->
    <div class="nav-fixed-section">
      <el-tooltip
        :content="$t('nav.home')"
        placement="right"
        popper-class="sidebar-nav-popper"
        :disabled="!collapsed"
      >
        <RouterLink to="/inicio" class="nav-link" @click="handleNavClick">
          <el-icon :size="18"><House /></el-icon>
          <span v-show="!collapsed" class="nav-text">{{ $t('nav.home') }}</span>
        </RouterLink>
      </el-tooltip>

      <el-tooltip
        v-if="canSeeConfig"
        :content="$t('nav.configuration')"
        placement="right"
        popper-class="sidebar-nav-popper"
        :disabled="!collapsed"
      >
        <RouterLink to="/configuracion" class="nav-link" @click="handleNavClick">
          <el-icon :size="18"><Setting /></el-icon>
          <span v-show="!collapsed" class="nav-text">{{ $t('nav.configuration') }}</span>
        </RouterLink>
      </el-tooltip>

      <el-tooltip
        v-if="canSeeUsers"
        :content="$t('nav.users')"
        placement="right"
        popper-class="sidebar-nav-popper"
        :disabled="!collapsed"
      >
        <RouterLink to="/usuarios" class="nav-link" @click="handleNavClick">
          <el-icon :size="18"><User /></el-icon>
          <span v-show="!collapsed" class="nav-text">{{ $t('nav.users') }}</span>
        </RouterLink>
      </el-tooltip>

      <!-- Línea de separación antes de la agenda -->
      <div class="sidebar-divider" v-if="canSeeAgenda || filteredCountriesTree.length > 0"></div>
    </div>

    <!-- Sección con scroll independiente: Agenda + Listado de Hoteles -->
    <div class="nav-scrollable-section">
      <el-tooltip
        v-if="canSeeAgenda"
        :content="$t('nav.schedule')"
        placement="right"
        popper-class="sidebar-nav-popper"
        :disabled="!collapsed"
      >
        <RouterLink
          to="/agenda"
          class="nav-link"
          :class="{ 'is-collapsed-agenda': collapsed }"
          @click="handleNavClick"
        >
          <el-icon :size="18"><Calendar /></el-icon>
          <span :class="collapsed ? 'hotel-label' : 'nav-text'">{{ $t('nav.schedule') }}</span>
        </RouterLink>
      </el-tooltip>

      <!-- Separación punteada entre el icono de agenda y el listado de hoteles cuando está colapsado -->
      <div
        v-if="collapsed && canSeeAgenda && filteredCountriesTree.length > 0"
        class="collapsed-area-divider agenda-hotels-divider"
      ></div>

      <!-- Estructura Jerárquica: Países -> Áreas -> Hoteles -->
      <div class="sidebar-tree" v-if="filteredCountriesTree.length > 0">
        <div v-for="pais in filteredCountriesTree" :key="pais.id" class="tree-country-group">
          <!-- Nivel 1: País -->
          <div v-if="!collapsed" class="tree-node node-country">
            <span class="node-text">{{ pais.nombre }}</span>
          </div>

          <!-- Nivel 2: Áreas -->
          <template v-for="(area, areaIndex) in pais.areas" :key="area.id">
            <!-- Separador punteado entre áreas cuando el menú está colapsado -->
            <div
              v-if="collapsed && areaIndex > 0"
              class="collapsed-area-divider"
              :title="area.nombre"
            ></div>

            <div class="tree-area-group">
              <div v-if="!collapsed" class="tree-node node-area">
                <el-icon :size="18" class="node-icon area-icon"><Location /></el-icon>
                <span class="node-text">{{ area.nombre }}</span>
              </div>

              <!-- Nivel 3: Hoteles (Clicables) -->
              <template v-for="hotel in area.hoteles" :key="hotel.id">
                <el-tooltip
                  :content="`${pais.nombre} · ${area.nombre} - ${hotel.nombre}`"
                  placement="right"
                  popper-class="sidebar-nav-popper"
                  :disabled="!collapsed"
                >
                  <div
                    class="tree-node node-hotel clickable-node"
                    :class="{ 'is-collapsed-hotel': collapsed }"
                    :title="collapsed ? undefined : $t('nav.viewHotelSchedule')"
                    @click="handleHotelClick(hotel.id)"
                  >
                    <el-icon :size="18" class="node-icon hotel-icon"><Building2 /></el-icon>
                    <span class="node-text hotel-label">{{ hotel.nombre }}</span>
                  </div>
                </el-tooltip>
              </template>
            </div>
          </template>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.sidebar-nav {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.nav-fixed-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex-shrink: 0;
}

.nav-scrollable-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 2px;

  /* Barra de desplazamiento sutil */
  scrollbar-width: thin;
  scrollbar-color: var(--sidebar-border, #cbd5e1) transparent;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: var(--sidebar-border, #cbd5e1);
    border-radius: 4px;
  }
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  color: var(--nav-link-color, #64748b);
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.2s ease-in-out;

  &:hover {
    color: var(--nav-link-hover-color, #0f172a);
    background-color: var(--nav-link-hover-bg, #f1f5f9);
  }

  &.router-link-active {
    color: #ffffff;
    background-color: var(--color-primary, #409eff);
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(64, 158, 255, 0.25);
  }
}

/* Sidebar Tree Hierarchy Styling */
.sidebar-divider {
  height: 1px;
  background-color: var(--sidebar-border, #e2e8f0);
  margin: 0.75rem 0;
  width: 100%;
}

.sidebar-tree {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  user-select: none;
  cursor: default;
}

.tree-country-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.tree-area-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  line-height: 1.3;
}

.node-country {
  padding-left: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--heading-color, #0f172a);
  pointer-events: none;
}

.node-area {
  padding-left: 1.5rem;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--nav-link-color, #475569);
  pointer-events: none;
}

.node-hotel {
  padding-left: 2.5rem;
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--nav-link-color, #64748b);
  border-radius: 6px;
  transition: all 0.2s ease-in-out;
}

.clickable-node {
  pointer-events: auto !important;
  cursor: pointer !important;

  &:hover {
    background-color: var(--nav-link-hover-bg, #f1f5f9);
    color: var(--color-primary, #409eff);

    .hotel-icon {
      color: var(--color-primary, #409eff);
    }
  }
}

.node-icon {
  flex-shrink: 0;
}

.country-icon {
  color: var(--color-primary, #409eff);
}

.area-icon {
  color: var(--color-warning, #e6a23c);
}

.hotel-icon {
  color: var(--text-muted, #94a3b8);
}

.node-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Collapsed Mode Styling */
.sidebar-nav.is-collapsed {
  align-items: center;
}

.sidebar-nav.is-collapsed .nav-fixed-section {
  width: 100%;
  align-items: center;
}

.sidebar-nav.is-collapsed .nav-scrollable-section {
  width: 100%;
  align-items: center;
}

.sidebar-nav.is-collapsed .nav-fixed-section .nav-link {
  width: 44px;
  height: 44px;
  padding: 0;
  justify-content: center;
  margin: 0 auto;
}

.sidebar-nav.is-collapsed .sidebar-tree {
  width: 100%;
  align-items: center;
  gap: 0.5rem;
}

.sidebar-nav.is-collapsed .tree-country-group,
.sidebar-nav.is-collapsed .tree-area-group {
  width: 100%;
  align-items: center;
}

/* Agenda & Hotel nodes in collapsed mode: icon on top, name underneath */
.sidebar-nav.is-collapsed .nav-link.is-collapsed-agenda,
.sidebar-nav.is-collapsed .node-hotel.is-collapsed-hotel {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0.35rem 0.2rem !important;
  width: 100% !important;
  max-width: 62px !important;
  min-height: 48px !important;
  height: auto !important;
  margin: 0 auto !important;
  gap: 0.2rem !important;
  text-align: center !important;
  box-sizing: border-box !important;
}

.sidebar-nav.is-collapsed .nav-link.is-collapsed-agenda .hotel-label,
.sidebar-nav.is-collapsed .node-hotel.is-collapsed-hotel .hotel-label {
  display: block;
  font-size: 0.65rem;
  line-height: 1.1;
  font-weight: 500;
  max-width: 58px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: -0.01em;
}

/* Dotted divider between areas when collapsed */
.collapsed-area-divider {
  width: 36px;
  height: 0;
  border-top: 1.5px dotted var(--sidebar-border, #cbd5e1);
  margin: 0.45rem auto;
}

.agenda-hotels-divider {
  margin: 0.25rem auto 0.45rem auto;
}

@media (max-width: 768px) {
  .sidebar-divider {
    margin: 1rem 0;
  }

  .sidebar-tree {
    gap: 1rem;
  }

  .tree-country-group {
    gap: 0.5rem;
  }

  .tree-area-group {
    gap: 0.35rem;
  }

  .tree-node {
    gap: 0.6rem;
    line-height: 1.4;
  }

  .node-country {
    padding: 0.4rem 0.5rem 0.2rem 0.5rem;
    font-size: 0.95rem;
    font-weight: 700;
  }

  .node-area {
    padding: 0.35rem 0.5rem 0.15rem 1.25rem;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .node-hotel {
    padding: 0.65rem 0.75rem 0.65rem 2.25rem;
    font-size: 0.92rem;
    font-weight: 500;
    color: var(--nav-link-color, #334155);
    min-height: 44px;
  }
}
</style>
