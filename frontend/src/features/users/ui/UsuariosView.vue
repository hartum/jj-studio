<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/features/users/stores/user.store'
import { useProfileStore } from '@/features/users/stores/profile.store'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useCountryStore } from '@/features/countries/stores/country.store'
import type { UserWithProfile } from '@/features/users/domain/user.model'
import {
  getUserInitials,
  getUserBgColor,
  getRoleSvg,
  getRoleTagType,
} from '@/features/users/utils/user-avatar'
import { formatAntiguedad } from '@/features/users/utils/user-date'
import { getRolePermissions, canEditUser, canDeleteUser, type RoleCode } from '@/shared/permissions'
import { useLocale } from '@/i18n/useLocale'
import { Search, Plus, EditPen, Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const router = useRouter()
const { t, locale } = useLocale()
const userStore = useUserStore()
const profileStore = useProfileStore()
const authStore = useAuthStore()
const countryStore = useCountryStore()

// State
const searchQuery = ref('')

const currentUser = computed(() => authStore.user)

onMounted(async () => {
  await Promise.all([
    profileStore.fetchProfiles(),
    userStore.fetchUsers(),
    countryStore.fetchCountries(),
  ])
})

function getHotelIdsInArea(areaId: number): number[] {
  for (const pais of countryStore.countries) {
    const area = (pais.areas || []).find((a) => a.id === areaId)
    if (area) {
      return (area.hoteles || []).map((h) => h.id)
    }
  }
  return []
}

// Visible users filtered by RBAC role visibility and scope
const visibleUsersByRole = computed(() => {
  const user = currentUser.value
  if (!user) return []

  const roleCode = user.roleCode?.toUpperCase()
  const perm = getRolePermissions(roleCode)

  return userStore.usersWithProfile.filter((u) => {
    const targetRoleCode = (u.perfil?.code?.toUpperCase() as RoleCode) || 'FOTOGRAFO'

    // 1. Role visibility check
    if (!perm.visibleTargetRoles.includes(targetRoleCode)) {
      return false
    }

    // 2. Scope check
    if (perm.scopeType === 'GLOBAL') {
      return true
    }

    if (perm.scopeType === 'AREAS') {
      const myAreaIds = new Set(user.areaIds || [])
      const myHotelIdsInAreas = new Set<number>()
      myAreaIds.forEach((areaId) => {
        getHotelIdsInArea(areaId).forEach((hId) => myHotelIdsInAreas.add(hId))
      })

      if (u.id === user.id) return true

      if (u.areaIds && u.areaIds.some((id) => myAreaIds.has(id))) {
        return true
      }

      if (u.hotelIds && u.hotelIds.some((hId) => myHotelIdsInAreas.has(hId))) {
        return true
      }

      return false
    }

    if (perm.scopeType === 'HOTELS') {
      const myHotelIds = new Set(user.hotelIds || [])
      if (u.id === user.id) return true
      if (u.hotelIds && u.hotelIds.some((hId) => myHotelIds.has(hId))) {
        return true
      }
      return false
    }

    return false
  })
})

// Filtered Users with search query
const filteredUsers = computed(() => {
  const baseList = visibleUsersByRole.value
  const query = searchQuery.value.toLowerCase().trim()
  if (!query) return baseList

  return baseList.filter((u) => {
    const fullName = `${u.nombre} ${u.apellidos}`.toLowerCase()
    const email = u.email.toLowerCase()
    const profileName = u.perfil?.name.toLowerCase() ?? ''
    return fullName.includes(query) || email.includes(query) || profileName.includes(query)
  })
})

// Navigation Handlers
function navigateToCreate() {
  router.push('/usuarios/nuevo')
}

function navigateToEdit(user: UserWithProfile) {
  router.push(`/usuarios/${user.id}/editar`)
}

async function handleDeleteUser(userId: string) {
  try {
    await userStore.deleteUser(userId)
    ElMessage.success(t('users.toasts.userDeleted'))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t('users.toasts.deleteError')
    ElMessage.error(message)
  }
}

function tableRowClassName({ row }: { row: UserWithProfile }) {
  if (row.status === 'Inactivo' || (row as unknown as { activo?: boolean }).activo === false) {
    return 'inactive-row'
  }
  return ''
}
</script>

<template>
  <div class="view-container">
    <!-- Header de la sección -->
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ $t('users.title') }}</h1>
        <p class="page-subtitle">{{ $t('users.subtitle') }}</p>
      </div>

      <el-button type="primary" :icon="Plus" size="large" @click="navigateToCreate">
        {{ $t('users.newUser') }}
      </el-button>
    </div>

    <!-- Barra de búsqueda y filtrado -->
    <div class="toolbar-bar">
      <el-input
        v-model="searchQuery"
        :placeholder="$t('users.searchPlaceholder')"
        :prefix-icon="Search"
        clearable
        class="search-input"
      />

      <el-tag type="info" v-html="$t('users.totalUsers', { count: filteredUsers.length })" />
    </div>

    <!-- Tabla de Usuarios con Element Plus -->
    <div class="table-card">
      <el-table
        v-loading="userStore.isLoading || profileStore.isLoading"
        :data="filteredUsers"
        :row-class-name="tableRowClassName"
        stripe
        style="width: 100%"
      >
        <el-table-column :label="$t('users.table.firstName')" sortable prop="nombre" width="160">
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar
                :src="row.imagen || undefined"
                shape="circle"
                :size="36"
                :style="{
                  backgroundColor: getUserBgColor(row.color),
                  color: '#ffffff',
                  fontWeight: '600',
                }"
              >
                {{ getUserInitials(row.nombre, row.apellidos) }}
              </el-avatar>
              <span class="user-fullname">{{ row.nombre }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          prop="apellidos"
          :label="$t('users.table.lastName')"
          show-overflow-tooltip
          sortable
          width="180"
        />

        <el-table-column
          prop="email"
          :label="$t('users.table.email')"
          sortable
          min-width="260"
          show-overflow-tooltip
        />

        <el-table-column prop="telefono" :label="$t('users.table.phone')" sortable width="150" />

        <el-table-column
          :label="$t('users.table.role')"
          sortable
          prop="perfil.name"
          width="240"
          class-name="role-column"
        >
          <template #default="{ row }">
            <el-tag
              v-if="row.perfil"
              :type="getRoleTagType(row.perfil.code)"
              size="large"
              effect="light"
              class="role-tag"
            >
              <img
                :src="getRoleSvg(row.perfil.code)"
                class="role-tag-icon"
                :alt="row.perfil.name"
              />
              {{ row.perfil.name }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column
          :label="$t('users.table.seniority')"
          sortable
          prop="fechaContratacion"
          min-width="190"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <span :class="{ 'empty-value': !row.fechaContratacion }">
              {{ formatAntiguedad(row.fechaContratacion, locale) }}
            </span>
          </template>
        </el-table-column>

        <el-table-column :label="$t('users.table.color')" width="75" align="center">
          <template #default="{ row }">
            <div
              v-if="['FOTOGRAFO', 'SUPERVISOR'].includes(row.perfil?.code?.toUpperCase() || '')"
              style="display: flex; align-items: center; justify-content: center; gap: 6px"
            >
              <span
                v-if="row.color"
                :style="{
                  backgroundColor: row.color,
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: '2px solid #ffffff',
                  boxShadow: '0 0 0 1px #cbd5e1',
                  display: 'inline-block',
                }"
                :title="`Color: ${row.color}`"
              />
              <span v-else style="color: #94a3b8; font-size: 0.8rem">—</span>
            </div>
            <span v-else style="color: #cbd5e1; font-size: 0.8rem">—</span>
          </template>
        </el-table-column>

        <el-table-column :label="$t('users.table.actions')" width="100" align="center" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button
                v-if="canEditUser(currentUser?.roleCode, row.perfil?.code, currentUser?.id, row.id)"
                type="primary"
                link
                :icon="EditPen"
                :title="$t('users.editUserTooltip')"
                @click="navigateToEdit(row)"
              />
              <el-popconfirm
                v-if="
                  canDeleteUser(currentUser?.roleCode, row.perfil?.code, currentUser?.id, row.id)
                "
                :title="$t('users.deleteConfirm', { name: `${row.nombre} ${row.apellidos}` })"
                :confirm-button-text="$t('users.delete')"
                :cancel-button-text="$t('users.cancel')"
                confirm-button-type="danger"
                :width="240"
                @confirm="handleDeleteUser(row.id)"
              >
                <template #reference>
                  <el-button type="danger" link :icon="Delete" :title="$t('users.deleteUserTooltip')" />
                </template>
              </el-popconfirm>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.search-input {
  width: 320px;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

:deep(td.role-column),
:deep(td.role-column .cell) {
  overflow: visible !important;
}

:deep(.el-tag.role-tag) {
  overflow: visible !important;
}

:deep(.el-tag.role-tag .el-tag__content) {
  overflow: visible !important;
  display: inline-flex;
  align-items: center;
}

:deep(.el-table__row.inactive-row) {
  opacity: 0.45;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.8;
  }
}

.role-tag-icon {
  width: 32px;
  height: 32px;
  object-fit: contain;
  flex-shrink: 0;
  margin-top: -12px;
  margin-right: 2px;
  vertical-align: middle;
  position: relative;
  z-index: 1;
}

.role-tag {
  font-weight: 700 !important;
  text-transform: uppercase;
}

.user-fullname {
  font-weight: 600;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 0.1rem;
  .el-button {
    font-size: 1.3rem;
    padding: 4px;
  }
}

.empty-value {
  color: #94a3b8;
}

@media (max-width: 768px) {
  .search-input {
    width: 100%;
  }
}
</style>
