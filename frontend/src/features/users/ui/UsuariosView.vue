<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
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
import { Search, Plus, EditPen, Delete, Operation } from '@element-plus/icons-vue'
import { ElMessage, type TableInstance } from 'element-plus'

const router = useRouter()
const { t, locale } = useLocale()
const userStore = useUserStore()
const profileStore = useProfileStore()
const authStore = useAuthStore()
const countryStore = useCountryStore()

// State persistence interface
interface UsersTableState {
  columns: string[]
  searchQuery: string
  sort: {
    prop: string
    order: 'ascending' | 'descending' | null
  }
}

const TABLE_STATE_STORAGE_KEY = 'jj_studio_users_table_state'
const LEGACY_COLUMNS_KEY = 'jj_studio_users_table_columns'
const allColumnKeys = ['nombre', 'apellidos', 'email', 'telefono', 'perfil', 'hoteles', 'antiguedad', 'color']
const defaultVisibleColumns = ['nombre', 'apellidos', 'email', 'telefono', 'perfil', 'antiguedad', 'color']

interface ColumnConfig {
  key: string
  label: string
}

const columnDefinitions = computed<ColumnConfig[]>(() => [
  { key: 'nombre', label: t('users.table.firstName') },
  { key: 'apellidos', label: t('users.table.lastName') },
  { key: 'email', label: t('users.table.email') },
  { key: 'telefono', label: t('users.table.phone') },
  { key: 'perfil', label: t('users.table.role') },
  { key: 'hoteles', label: t('users.table.hotels') },
  { key: 'antiguedad', label: t('users.table.seniority') },
  { key: 'color', label: t('users.table.color') },
])

function loadSavedState(): UsersTableState {
  let columns = [...defaultVisibleColumns]
  let searchQuery = ''
  let sort: UsersTableState['sort'] = { prop: '', order: null }

  try {
    const raw = localStorage.getItem(TABLE_STATE_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.columns)) {
        const valid = parsed.columns.filter((k: string) => allColumnKeys.includes(k))
        if (valid.length > 0) columns = valid
      }
      if (typeof parsed.searchQuery === 'string') {
        searchQuery = parsed.searchQuery
      }
      if (parsed.sort && typeof parsed.sort === 'object') {
        sort = {
          prop: parsed.sort.prop || '',
          order: parsed.sort.order || null,
        }
      }
      return { columns, searchQuery, sort }
    }

    // Fallback clave legacy
    const legacyColumnsRaw = localStorage.getItem(LEGACY_COLUMNS_KEY)
    if (legacyColumnsRaw) {
      const parsed = JSON.parse(legacyColumnsRaw)
      if (Array.isArray(parsed)) {
        const valid = parsed.filter((k: string) => allColumnKeys.includes(k))
        if (valid.length > 0) columns = valid
      }
    }
  } catch {
    // fallback
  }

  return { columns, searchQuery, sort }
}

const savedState = loadSavedState()

const tableRef = ref<TableInstance>()
const searchQuery = ref(savedState.searchQuery)
const selectedColumns = ref<string[]>(savedState.columns)
const tableSort = ref<UsersTableState['sort']>(savedState.sort)

function saveTableState() {
  try {
    const state: UsersTableState = {
      columns: selectedColumns.value,
      searchQuery: searchQuery.value,
      sort: tableSort.value,
    }
    localStorage.setItem(TABLE_STATE_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

watch(searchQuery, () => {
  saveTableState()
})

function handleColumnsChange(newVal: string[]) {
  if (newVal.length === 0) {
    ElMessage.warning(t('users.table.atLeastOneColumn'))
    return
  }
  selectedColumns.value = newVal
  saveTableState()
}

function handleSortChange({ prop, order }: { prop: string; order: 'ascending' | 'descending' | null }) {
  tableSort.value = {
    prop: prop || '',
    order: order || null,
  }
  saveTableState()
}

function isColumnVisible(key: string): boolean {
  return selectedColumns.value.includes(key)
}

// Mapa de hotelId -> datos del hotel (nombre, etc.)
const hotelMap = computed(() => {
  const map = new Map<number, { id: number; nombre: string; areaNombre?: string; paisNombre?: string }>()
  for (const pais of countryStore.countries) {
    for (const area of pais.areas || []) {
      for (const hotel of area.hoteles || []) {
        map.set(hotel.id, {
          id: hotel.id,
          nombre: hotel.nombre,
          areaNombre: area.nombre,
          paisNombre: pais.nombre,
        })
      }
    }
  }
  return map
})

function isAllHotelsUser(roleCode?: string): boolean {
  const code = roleCode?.toUpperCase() || ''
  return ['GERENTE', 'SUPERUSUARIO', 'ADMIN'].includes(code)
}

const currentUser = computed(() => authStore.user)

onMounted(async () => {
  await Promise.all([
    profileStore.fetchProfiles(),
    userStore.fetchUsers(),
    countryStore.fetchCountries(),
  ])
  if (tableSort.value.prop && tableSort.value.order && tableRef.value) {
    tableRef.value.sort(tableSort.value.prop, tableSort.value.order)
  }
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

      <div class="toolbar-actions">
        <!-- Selector múltiple custom con switches para mostrar/ocultar columnas -->
        <el-select
          :model-value="selectedColumns"
          multiple
          :placeholder="$t('users.table.columns')"
          class="columns-select"
          popper-class="columns-select-popper"
          @update:model-value="handleColumnsChange"
        >
          <template #prefix>
            <el-icon class="column-select-icon"><Operation /></el-icon>
          </template>
          <template #tag>
            <span class="column-select-trigger-text">
              {{ $t('users.table.columns') }} ({{ selectedColumns.length }}/{{ columnDefinitions.length }})
            </span>
          </template>
          <el-option
            v-for="col in columnDefinitions"
            :key="col.key"
            :label="col.label"
            :value="col.key"
          >
            <div class="column-option-row">
              <span class="column-option-label">{{ col.label }}</span>
              <el-switch
                :model-value="isColumnVisible(col.key)"
                size="small"
                class="column-option-switch"
              />
            </div>
          </el-option>
        </el-select>

        <el-tag type="info">
          <i18n-t keypath="users.totalUsers" tag="span" scope="global">
            <template #count>
              <strong>{{ filteredUsers.length }}</strong>
            </template>
          </i18n-t>
        </el-tag>
      </div>
    </div>

    <!-- Tabla de Usuarios con Element Plus -->
    <div class="table-card">
      <el-table
        ref="tableRef"
        v-loading="userStore.isLoading || profileStore.isLoading"
        :data="filteredUsers"
        :row-class-name="tableRowClassName"
        :default-sort="tableSort.prop && tableSort.order ? { prop: tableSort.prop, order: tableSort.order } : undefined"
        max-height="530"
        stripe
        style="width: 100%"
        @sort-change="handleSortChange"
      >
        <el-table-column
          v-if="isColumnVisible('nombre')"
          key="nombre"
          :label="$t('users.table.firstName')"
          sortable
          prop="nombre"
          width="160"
        >
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
          v-if="isColumnVisible('apellidos')"
          key="apellidos"
          prop="apellidos"
          :label="$t('users.table.lastName')"
          show-overflow-tooltip
          sortable
          width="180"
        />

        <el-table-column
          v-if="isColumnVisible('email')"
          key="email"
          prop="email"
          :label="$t('users.table.email')"
          sortable
          min-width="260"
          show-overflow-tooltip
        />

        <el-table-column
          v-if="isColumnVisible('telefono')"
          key="telefono"
          prop="telefono"
          :label="$t('users.table.phone')"
          sortable
          width="150"
        />

        <el-table-column
          v-if="isColumnVisible('perfil')"
          key="perfil"
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
          v-if="isColumnVisible('hoteles')"
          key="hoteles"
          :label="$t('users.table.hotels')"
          min-width="200"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <el-tag
              v-if="isAllHotelsUser(row.perfil?.code)"
              type="primary"
              size="small"
              effect="light"
              round
              class="all-hotels-tag"
            >
              {{ $t('users.table.all') }}
            </el-tag>
            <div v-else-if="row.hotelIds && row.hotelIds.length > 0" class="hotels-tag-list">
              <el-tag
                v-for="hId in row.hotelIds"
                :key="hId"
                size="small"
                effect="plain"
                type="info"
                class="user-hotel-tag"
              >
                {{ hotelMap.get(hId)?.nombre || `Hotel #${hId}` }}
              </el-tag>
            </div>
            <span v-else class="empty-value">—</span>
          </template>
        </el-table-column>

        <el-table-column
          v-if="isColumnVisible('antiguedad')"
          key="antiguedad"
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

        <el-table-column
          v-if="isColumnVisible('color')"
          key="color"
          :label="$t('users.table.color')"
          width="75"
          align="center"
        >
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

        <el-table-column key="acciones" :label="$t('users.table.actions')" width="100" align="center" fixed="right">
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

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.columns-select {
  width: 175px;
}

.column-select-icon {
  font-size: 0.95rem;
  color: var(--nav-link-color, #64748b);
}

.column-select-trigger-text {
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--heading-color, #0f172a);
  white-space: nowrap;
  user-select: none;
}

.column-option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-right: 2px;
}

.column-option-label {
  font-size: 0.85rem;
  color: var(--heading-color, #0f172a);
}

.column-option-switch {
  pointer-events: none;
}

:global(.columns-select-popper) {
  min-width: 220px !important;
}

:global(.columns-select-popper .el-select-dropdown__item) {
  padding: 0 14px !important;
  height: 38px !important;
  line-height: 38px !important;
}

:global(.columns-select-popper .el-select-dropdown__item::after) {
  display: none !important;
}

:global(.columns-select-popper .el-select-dropdown__item.is-selected) {
  background-color: rgba(64, 158, 255, 0.08) !important;
  color: inherit !important;
}

.hotels-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.all-hotels-tag {
  font-weight: 600;
  letter-spacing: 0.2px;
}

.user-hotel-tag {
  font-size: 0.75rem;
}

.empty-value {
  color: #94a3b8;
}

@media (max-width: 768px) {
  .search-input {
    width: 100%;
  }

  .toolbar-actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
