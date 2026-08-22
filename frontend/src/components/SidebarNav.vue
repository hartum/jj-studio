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
  <nav class="sidebar-nav">
    <RouterLink to="/inicio" class="nav-link" @click="handleNavClick">
      <el-icon :size="18"><House /></el-icon>
      <span>Inicio</span>
    </RouterLink>

    <RouterLink v-if="canSeeConfig" to="/configuracion" class="nav-link" @click="handleNavClick">
      <el-icon :size="18"><Setting /></el-icon>
      <span>Configuración</span>
    </RouterLink>

    <RouterLink v-if="canSeeUsers" to="/usuarios" class="nav-link" @click="handleNavClick">
      <el-icon :size="18"><User /></el-icon>
      <span>Usuarios</span>
    </RouterLink>

    <!-- Línea de separación -->
    <div class="sidebar-divider" v-if="canSeeAgenda || filteredCountriesTree.length > 0"></div>

    <RouterLink v-if="canSeeAgenda" to="/agenda" class="nav-link" @click="handleNavClick">
      <el-icon :size="18"><Calendar /></el-icon>
      <span>Agenda</span>
    </RouterLink>

    <!-- Estructura Jerárquica: Países -> Áreas -> Hoteles -->
    <div class="sidebar-tree" v-if="filteredCountriesTree.length > 0">
      <div v-for="pais in filteredCountriesTree" :key="pais.id" class="tree-country-group">
        <!-- Nivel 1: País -->
        <div class="tree-node node-country">
          <span class="node-text">{{ pais.nombre }}</span>
        </div>

        <!-- Nivel 2: Áreas -->
        <div v-for="area in pais.areas" :key="area.id" class="tree-area-group">
          <div class="tree-node node-area">
            <el-icon :size="18" class="node-icon area-icon"><Location /></el-icon>
            <span class="node-text">{{ area.nombre }}</span>
          </div>

          <!-- Nivel 3: Hoteles (Clicables) -->
          <div
            v-for="hotel in area.hoteles"
            :key="hotel.id"
            class="tree-node node-hotel clickable-node"
            title="Ver agenda del hotel"
            @click="handleHotelClick(hotel.id)"
          >
            <el-icon :size="18" class="node-icon hotel-icon"><Building2 /></el-icon>
            <span class="node-text">{{ hotel.nombre }}</span>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
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
