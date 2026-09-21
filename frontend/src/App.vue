<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useCountryStore } from '@/features/countries/stores/country.store'
import { useUserStore } from '@/features/users/stores/user.store'
import { getUserInitials, getUserBgColor } from '@/features/users/utils/user-avatar'
import { canAccessRoute, getRolePermissions } from '@/shared/permissions'
import SidebarNav from '@/components/SidebarNav.vue'
import LanguageSelector from '@/components/LanguageSelector.vue'
import AvatarCropperDialog from '@/features/users/ui/AvatarCropperDialog.vue'
import logoJJ from '@/assets/logoJJ.png'
import { useLocale } from '@/i18n/useLocale'
import { Sunny, Moon, SwitchButton, Menu, Close, Camera, Upload, Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const { elementPlusLocale, t } = useLocale()

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const countryStore = useCountryStore()
const userStore = useUserStore()

const isFullScreenAuthPage = computed(
  () => Boolean(route.meta.guestOnly) || ['/login', '/forgot-password', '/reset-password'].includes(route.path),
)
const isDark = ref(false)
const isMobileDrawerOpen = ref(false)

// Estados para cambio de foto de perfil
const avatarFileInput = ref<HTMLInputElement | null>(null)
const cropperDialogVisible = ref(false)
const imageToCrop = ref<string | null>(null)
const isUpdatingAvatar = ref(false)

function triggerAvatarUpload() {
  avatarFileInput.value?.click()
}

function onAvatarFileSelected(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    ElMessage.error(t('users.toasts.validImageRequired'))
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    imageToCrop.value = e.target?.result as string
    cropperDialogVisible.value = true
  }
  reader.readAsDataURL(file)
  target.value = ''
}

async function handleCropSave(base64: string) {
  isUpdatingAvatar.value = true
  try {
    await authStore.updateAvatar(base64)
    if (userStore.users.length > 0 && authStore.user?.id) {
      const u = userStore.users.find((x) => x.id === authStore.user!.id)
      if (u) u.imagen = base64
    }
    cropperDialogVisible.value = false
    imageToCrop.value = null
    ElMessage.success(t('nav.avatarUpdated'))
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : t('users.toasts.dbError')
    ElMessage.error(msg)
  } finally {
    isUpdatingAvatar.value = false
  }
}

async function handleRemoveAvatar() {
  isUpdatingAvatar.value = true
  try {
    await authStore.updateAvatar(null)
    if (userStore.users.length > 0 && authStore.user?.id) {
      const u = userStore.users.find((x) => x.id === authStore.user!.id)
      if (u) u.imagen = null
    }
    ElMessage.info(t('nav.avatarRemoved'))
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : t('users.toasts.dbError')
    ElMessage.error(msg)
  } finally {
    isUpdatingAvatar.value = false
  }
}

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
  <el-config-provider :locale="elementPlusLocale">
    <!-- Input oculto para subir avatar -->
    <input
      ref="avatarFileInput"
      type="file"
      accept="image/*"
      style="display: none"
      @change="onAvatarFileSelected"
    />

    <!-- Diálogo reutilizable de recorte de imagen de perfil -->
    <AvatarCropperDialog
      v-model:visible="cropperDialogVisible"
      :image-src="imageToCrop"
      :loading="isUpdatingAvatar"
      @crop="handleCropSave"
      @cancel="imageToCrop = null"
    />

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

        <div class="sidebar-lang-wrapper">
          <LanguageSelector full-width />
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
              :aria-label="t('nav.closeMenu')"
            />
          </div>

          <div class="sidebar-lang-wrapper">
            <LanguageSelector full-width />
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
                :aria-label="t('nav.openMenu')"
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
              <!-- Usuario autenticado con avatar interactivo -->
              <div v-if="authStore.user" class="user-badge">
                <el-dropdown trigger="click" popper-class="avatar-menu-popper">
                  <div class="topbar-avatar-wrapper" :title="t('nav.avatarTooltip')">
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
                    <div class="avatar-hover-overlay">
                      <el-icon :size="14"><Camera /></el-icon>
                    </div>
                  </div>

                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item :icon="Upload" @click="triggerAvatarUpload">
                        {{ authStore.user.imagen ? t('nav.changeAvatar') : t('nav.uploadAvatar') }}
                      </el-dropdown-item>
                      <el-dropdown-item
                        v-if="authStore.user.imagen"
                        :icon="Delete"
                        divided
                        class="dropdown-item-danger"
                        @click="handleRemoveAvatar"
                      >
                        {{ t('nav.removeAvatar') }}
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>

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
                :title="t('nav.logoutTitle')"
                @click="handleLogout"
                class="logout-btn"
              >
                <span class="logout-text">{{ t('nav.logout') }}</span>
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
  padding: 0 0.5rem 1.25rem 0.5rem;
  border-bottom: 1px solid var(--sidebar-border, #e2e8f0);
  margin-bottom: 1.25rem;
  transition: border-color 0.2s ease;
  min-height: 40px;
}

.sidebar-lang-wrapper {
  margin-bottom: 1.25rem;
  width: 100%;
}

.brand-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.brand-logo {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.brand-title {
  font-weight: 700;
  font-size: 1.15rem;
  letter-spacing: -0.02em;
  color: var(--heading-color, #0f172a);
}

.close-drawer-btn {
  border: none;
  background-color: transparent;
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

.topbar-avatar-wrapper {
  position: relative;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: transform 0.15s ease;
  outline: none;
}

.topbar-avatar-wrapper:hover {
  transform: scale(1.05);
}

.avatar-hover-overlay {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.topbar-avatar-wrapper:hover .avatar-hover-overlay {
  opacity: 1;
}

:deep(.dropdown-item-danger) {
  color: var(--el-color-danger, #f56c6c) !important;
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
