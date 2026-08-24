<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useCountryStore } from '@/features/countries/stores/country.store'
import { getUserInitials, getUserBgColor } from '@/features/users/utils/user-avatar'
import { canAccessRoute, getRolePermissions } from '@/shared/permissions'
import SidebarNav from '@/components/SidebarNav.vue'
import logoJJ from '@/assets/logoJJ.png'
import es from 'element-plus/es/locale/lang/es'
import { Sunny, Moon, SwitchButton, Menu, Close } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const countryStore = useCountryStore()

const isFullScreenAuthPage = computed(
  () => Boolean(route.meta.guestOnly) || ['/login', '/forgot-password', '/reset-password'].includes(route.path),
)
const isDark = ref(false)
const isMobileDrawerOpen = ref(false)

const canSeeAgenda = computed(() => canAccessRoute(authStore.user?.roleCode, '/agenda'))
const canSeeConfig = computed(() => canAccessRoute(authStore.user?.roleCode, '/configuracion'))
const canSeeUsers = computed(() => canAccessRoute(authStore.user?.roleCode, '/usuarios'))

function handleSelectHotelNode(hotelId: number) {
  closeMobileDrawer()
  router.push({ path: '/agenda', query: { hotelId } })
}

const filteredCountriesTree = computed(() => {
  const user = authStore.user
  if (!user) return []

  const roleCode = user.roleCode?.toUpperCase()
  const perm = getRolePermissions(roleCode)

  if (perm.scopeType === 'GLOBAL') {
    return countryStore.countries
  }

  if (perm.scopeType === 'AREAS') {
    const userAreaIds = new Set(user.areaIds || [])
    return countryStore.countries
      .map((pais) => {
        const allowedAreas = (pais.areas || []).filter((area) => userAreaIds.has(area.id))
        return {
          ...pais,
          areas: allowedAreas,
        }
      })
      .filter((pais) => (pais.areas || []).length > 0)
  }

  if (perm.scopeType === 'HOTELS') {
    const userHotelIds = new Set(user.hotelIds || [])
    return countryStore.countries
      .map((pais) => {
        const allowedAreas = (pais.areas || [])
          .map((area) => {
            const allowedHotels = (area.hoteles || []).filter((hotel) => userHotelIds.has(hotel.id))
            return {
              ...area,
              hoteles: allowedHotels,
            }
          })
          .filter((area) => (area.hoteles || []).length > 0)
        return {
          ...pais,
          areas: allowedAreas,
        }
      })
      .filter((pais) => (pais.areas || []).length > 0)
  }

  return []
})

function toggleTheme() {
  if (isDark.value) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

function handleLogout() {
  authStore.logout()
  router.push('/login')
}

function closeMobileDrawer() {
  isMobileDrawerOpen.value = false
}

onMounted(async () => {
  isDark.value = document.documentElement.classList.contains('dark')
  await countryStore.fetchCountries()
})
</script>

<template>
  <el-config-provider :locale="es">
    <!-- Vistas de Autenticación a pantalla completa sin Sidebar/Toolbar -->
    <div v-if="isFullScreenAuthPage" class="full-screen-wrapper">
      <RouterView />
    </div>

    <!-- Vista Principal de la App con Sidebar y Toolbar -->
    <div v-else class="app-container">
      <!-- Menú lateral izquierdo (Desktop) -->
      <aside class="sidebar desktop-sidebar">
        <div class="brand">
          <div class="brand-info">
            <img :src="logoJJ" alt="Logo JJ Studio" class="brand-logo" />
            <span class="brand-title">JJ Studio</span>
          </div>
        </div>

        <SidebarNav
          :can-see-agenda="canSeeAgenda"
          :can-see-config="canSeeConfig"
          :can-see-users="canSeeUsers"
          :filtered-countries-tree="filteredCountriesTree"
          @select-hotel="handleSelectHotelNode"
        />
      </aside>

      <!-- Drawer Lateral de Navegación (Móvil) -->
      <el-drawer
        v-model="isMobileDrawerOpen"
        direction="ltr"
        size="100%"
        :with-header="false"
        class="mobile-drawer"
      >
        <div class="sidebar mobile-drawer-content">
          <div class="brand mobile-drawer-brand">
            <div class="brand-info">
              <img :src="logoJJ" alt="Logo JJ Studio" class="brand-logo" />
              <span class="brand-title">JJ Studio</span>
            </div>
            <el-button
              circle
              class="close-drawer-btn"
              :icon="Close"
              @click="closeMobileDrawer"
              aria-label="Cerrar menú de navegación"
            />
          </div>

          <SidebarNav
            :can-see-agenda="canSeeAgenda"
            :can-see-config="canSeeConfig"
            :can-see-users="canSeeUsers"
            :filtered-countries-tree="filteredCountriesTree"
            @navigate="closeMobileDrawer"
            @select-hotel="handleSelectHotelNode"
          />
        </div>
      </el-drawer>

      <!-- Área principal con Toolbar superior + Contenido -->
      <div class="main-wrapper">
        <header class="app-toolbar-container">
          <div class="app-toolbar">
            <div class="toolbar-left">
              <el-button
                class="mobile-menu-btn"
                circle
                :icon="Menu"
                @click="isMobileDrawerOpen = true"
                aria-label="Abrir menú de navegación"
              />
            </div>

            <!-- Conmutador de tema centrado -->
            <div class="theme-switcher">
              <el-icon class="theme-icon sun-icon" :class="{ active: !isDark }" :size="18"
                ><Sunny
              /></el-icon>
              <el-switch v-model="isDark" @change="toggleTheme" />
              <el-icon class="theme-icon moon-icon" :class="{ active: isDark }" :size="18"
                ><Moon
              /></el-icon>
            </div>

            <div class="toolbar-right">
              <!-- Usuario autenticado -->
              <div v-if="authStore.user" class="user-badge">
                <el-avatar
                  :src="authStore.user.imagen || undefined"
                  shape="circle"
                  :size="36"
                  :style="{
                    backgroundColor: getUserBgColor(authStore.user.color),
                    color: '#ffffff',
                    fontWeight: '600',
                  }"
                  class="topbar-avatar"
                >
                  {{ getUserInitials(authStore.user.nombre, authStore.user.apellidos) }}
                </el-avatar>
                <div class="user-info">
                  <span class="user-name"
                    >{{ authStore.user.nombre }} {{ authStore.user.apellidos }}</span
                  >
                  <span class="user-role">{{ authStore.user.roleName }}</span>
                </div>
              </div>

              <!-- Botón Cerrar Sesión -->
              <el-button
                type="danger"
                link
                :icon="SwitchButton"
                title="Cerrar sesión"
                @click="handleLogout"
                class="logout-btn"
              >
                <span class="logout-text">Salir</span>
              </el-button>
            </div>
          </div>
        </header>

        <main class="main-content">
          <RouterView />
        </main>
      </div>
    </div>
  </el-config-provider>
</template>

<style scoped>
.full-screen-wrapper {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.app-container {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: var(--app-bg, #f8fafc);
  color: var(--app-text, #0f172a);
}

/* Sidebar Styling */
.sidebar {
  width: 250px;
  min-width: 250px;
  background-color: var(--sidebar-bg, #ffffff);
  border-right: 1px solid var(--sidebar-border, #e2e8f0);
  display: flex;
  flex-direction: column;
  padding: 1.5rem 1rem;
  z-index: 10;
  overflow-y: auto;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
}

.brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0.5rem 1.5rem 0.5rem;
  border-bottom: 1px solid var(--sidebar-border, #e2e8f0);
  margin-bottom: 1.5rem;
  transition: border-color 0.2s ease;
  min-height: 40px;
}

.brand-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.close-drawer-btn {
  font-size: 1.1rem;
}

.brand-logo {
  width: 42px;
  height: 42px;
  object-fit: contain;
}

.brand-title {
  font-weight: 700;
  font-size: 1.2rem;
  background: linear-gradient(135deg, #409eff 0%, #a0cfff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Main Wrapper Styling */
.main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Top Toolbar Header */
.app-toolbar-container {
  border-bottom: 1px solid var(--toolbar-border, #e2e8f0);
  transition: border-color 0.2s ease;
}

.app-toolbar {
  background-color: var(--toolbar-bg, #ffffff);
  padding: 0.5rem 1.5rem;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  transition: background-color 0.2s ease;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.user-badge {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.user-info {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.user-name {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--heading-color, #0f172a);
}

.user-role {
  font-size: 0.75rem;
  color: var(--nav-link-color, #64748b);
  font-weight: 400;
}

/* Theme Switcher Styling (Centrado universal) */
.theme-switcher {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.theme-icon {
  color: var(--nav-link-color, #64748b);
  transition: color 0.2s ease;
}

.sun-icon.active {
  color: #e6a23c;
}

.moon-icon.active {
  color: #409eff;
}

/* Content Area */
.main-content {
  flex: 1;
  overflow-y: auto;
  background-color: var(--content-bg, #f8fafc);
  transition: background-color 0.2s ease;
}

/* Responsive Elements & Media Queries */
.mobile-menu-btn {
  display: none;
}

.mobile-drawer-content {
  height: 100%;
  width: 100%;
  border-right: none;
}

@media (max-width: 768px) {
  .desktop-sidebar {
    display: none !important;
  }

  .mobile-menu-btn {
    display: inline-flex !important;
  }

  .app-toolbar {
    padding: 0.5rem 1rem;
  }

  .toolbar-right {
    gap: 0.75rem;
  }

  .user-badge {
    gap: 0.35rem;
  }
}

@media (max-width: 480px) {
  .user-info {
    display: none;
  }

  .logout-text {
    display: none;
  }

  .app-toolbar {
    padding: 0.5rem 0.75rem;
  }
}
</style>
