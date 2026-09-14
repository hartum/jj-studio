<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/features/users/stores/user.store'
import { useProfileStore } from '@/features/users/stores/profile.store'
import { useCountryStore } from '@/features/countries/stores/country.store'
import type { UserStatus, UserInput } from '@/features/users/domain/user.model'
import {
  getUserInitials,
  getUserBgColor,
  getRoleSvg,
  getRoleTagType,
} from '@/features/users/utils/user-avatar'
import {
  ArrowLeft,
  Check,
  Close,
  Upload,
  Delete,
  ZoomIn,
  ZoomOut,
  RefreshLeft,
  RefreshRight,
  Location,
} from '@element-plus/icons-vue'
import { Building2 } from '@lucide/vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { getRolePermissions, canEditUser, type RoleCode } from '@/shared/permissions'
import { Cropper, CircleStencil } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'
import CalendarioLaboral from './CalendarioLaboral.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const profileStore = useProfileStore()
const countryStore = useCountryStore()
const authStore = useAuthStore()

const currentUser = computed(() => authStore.user)
const userId = computed(() => route.params.id as string | undefined)
const isEditing = computed(() => !!userId.value)
const isSelfEditing = computed(() => isEditing.value && userId.value === currentUser.value?.id)

const isSaving = ref(false)
const activeTab = ref<'datos' | 'calendario'>('datos')

// Ref para cropper dialog y file input
const fileInput = ref<HTMLInputElement | null>(null)
const cropperDialogVisible = ref(false)
const imageToCrop = ref<string | null>(null)
const cropperRef = ref<InstanceType<typeof Cropper> | null>(null)

const formData = ref({
  nombre: '',
  apellidos: '',
  email: '',
  password: '',
  telefono: '',
  profileId: null as number | null,
  status: 'Activo' as UserStatus,
  tipoContrato: 'ASALARIADO' as string,
  fechaContratacion: null as string | null,
  imagen: null as string | null,
  color: '#3b82f6' as string | null,
  areaIds: [] as number[],
  hotelIds: [] as number[],
})

const ROLE_DISPLAY_ORDER: Record<string, number> = {
  FOTOGRAFO: 1,
  AGENDADOR: 2,
  SUPERVISOR: 3,
  GERENTE: 4,
  CONTABLE: 5,
  ADMIN: 6,
  SUPERUSUARIO: 7,
}

const assignableProfiles = computed(() => {
  const user = currentUser.value
  if (!user) return []

  const roleCode = user.roleCode?.toUpperCase()
  const perm = getRolePermissions(roleCode)

  const filtered = profileStore.activeProfiles.filter((p) => {
    const code = p.code?.toUpperCase() as RoleCode
    if (perm.assignableTargetRoles.includes(code)) return true
    if (isEditing.value && formData.value.profileId === p.id) return true
    return false
  })

  return filtered.sort((a, b) => {
    const orderA = ROLE_DISPLAY_ORDER[a.code?.toUpperCase() || ''] ?? 50
    const orderB = ROLE_DISPLAY_ORDER[b.code?.toUpperCase() || ''] ?? 50
    return orderA - orderB
  })
})

const selectedProfile = computed(() => {
  if (!formData.value.profileId) return null
  return profileStore.getProfileById(formData.value.profileId)
})

const selectedRoleCode = computed(() => {
  return selectedProfile.value?.code?.toUpperCase() || ''
})

const isFotografo = computed(() => selectedRoleCode.value === 'FOTOGRAFO')
const isGerente = computed(() => selectedRoleCode.value === 'GERENTE')
const isSupervisorOrFotografo = computed(
  () =>
    selectedRoleCode.value === 'SUPERVISOR' ||
    selectedRoleCode.value === 'FOTOGRAFO' ||
    selectedRoleCode.value === 'AGENDADOR',
)
const isGlobalAccess = computed(
  () =>
    selectedRoleCode.value === 'SUPERUSUARIO' ||
    selectedRoleCode.value === 'ADMIN' ||
    selectedRoleCode.value === 'CONTABLE',
)

const isStatusDisabled = computed(() => {
  if (!isSelfEditing.value) return false
  const role = currentUser.value?.roleCode?.toUpperCase()
  return role === 'GERENTE' || role === 'SUPERVISOR'
})

const isSelfEditingProfileReadonly = computed(() => {
  if (!isSelfEditing.value) return false
  const role = currentUser.value?.roleCode?.toUpperCase()
  return role === 'GERENTE' || role === 'SUPERVISOR'
})

// --- Helpers reutilizables ---

/** IDs asignados a otros usuarios con un rol determinado, excluyendo al usuario en edición */
function getAssignedIdsByOtherUsers(role: string, field: 'areaIds' | 'hotelIds'): Set<number> {
  const set = new Set<number>()
  for (const u of userStore.users) {
    if (u.id === userId.value) continue
    const code = profileStore.getProfileById(u.profileId)?.code?.toUpperCase()
    if (code === role) {
      u[field]?.forEach((id) => set.add(id))
    }
  }
  return set
}

/** Filtra el árbol País→Área dejando solo las áreas cuyos IDs están en el Set */
function filterCountriesByAreas(areaIds: Set<number>) {
  return countryStore.countries
    .map((pais) => ({
      ...pais,
      areas: (pais.areas || []).filter((area) => areaIds.has(area.id)),
    }))
    .filter((pais) => pais.areas.length > 0)
}

/** Filtra el árbol País→Área→Hotel dejando solo los hoteles cuyos IDs están en el Set */
function filterCountriesByHotels(hotelIds: Set<number>) {
  return countryStore.countries
    .map((pais) => ({
      ...pais,
      areas: (pais.areas || [])
        .map((area) => ({
          ...area,
          hoteles: (area.hoteles || []).filter((hotel) => hotelIds.has(hotel.id)),
        }))
        .filter((area) => area.hoteles.length > 0),
    }))
    .filter((pais) => pais.areas.length > 0)
}

// --- Computed de exclusión (áreas/hoteles ya ocupados por otros usuarios) ---

const assignedAreaIdsByOtherGerentes = computed<Set<number>>(() =>
  getAssignedIdsByOtherUsers('GERENTE', 'areaIds'),
)

const assignedHotelIdsByOtherSupervisores = computed<Set<number>>(() =>
  getAssignedIdsByOtherUsers('SUPERVISOR', 'hotelIds'),
)

// --- Países disponibles en desplegables (según rol del usuario autenticado) ---

const availableCountriesForAreaSelect = computed(() => {
  const user = currentUser.value
  if (!user) return []

  const roleCode = user.roleCode?.toUpperCase()
  if (roleCode === 'SUPERUSUARIO' || roleCode === 'ADMIN') return countryStore.countries
  if (roleCode === 'GERENTE') return filterCountriesByAreas(new Set(user.areaIds || []))
  return []
})

const availableCountriesForHotelSelect = computed(() => {
  const user = currentUser.value
  if (!user) return []

  const roleCode = user.roleCode?.toUpperCase()
  if (roleCode === 'SUPERUSUARIO' || roleCode === 'ADMIN') return countryStore.countries
  if (roleCode === 'GERENTE') return filterCountriesByAreas(new Set(user.areaIds || []))
  if (roleCode === 'SUPERVISOR') return filterCountriesByHotels(new Set(user.hotelIds || []))
  return []
})

// --- Resolución de nombres para tags de autoedición (una sola pasada) ---

const assignedNames = computed(() => {
  const areaSet = new Set(formData.value.areaIds)
  const hotelSet = new Set(formData.value.hotelIds)
  const areas: { id: number; nombre: string; paisNombre: string }[] = []
  const hotels: { id: number; nombre: string; areaNombre: string; paisNombre: string }[] = []

  for (const pais of countryStore.countries) {
    for (const area of pais.areas || []) {
      if (areaSet.has(area.id)) {
        areas.push({ id: area.id, nombre: area.nombre, paisNombre: pais.nombre })
      }
      for (const hotel of area.hoteles || []) {
        if (hotelSet.has(hotel.id)) {
          hotels.push({
            id: hotel.id,
            nombre: hotel.nombre,
            areaNombre: area.nombre,
            paisNombre: pais.nombre,
          })
        }
      }
    }
  }
  return { areas, hotels }
})

const assignedAreaNames = computed(() => assignedNames.value.areas)
const assignedHotelNames = computed(() => assignedNames.value.hotels)

const isActivo = computed({
  get: () => formData.value.status === 'Activo',
  set: (val: boolean) => {
    formData.value.status = val ? 'Activo' : 'Inactivo'
  },
})

onMounted(async () => {
  await Promise.all([
    profileStore.fetchProfiles(),
    userStore.fetchUsers(),
    countryStore.fetchCountries(),
  ])

  if (isEditing.value && userId.value) {
    const existing = userStore.usersWithProfile.find((u) => u.id === userId.value)
    if (existing) {
      const targetRoleCode = existing.perfil?.code
      if (
        !canEditUser(
          currentUser.value?.roleCode,
          targetRoleCode,
          currentUser.value?.id,
          existing.id,
        )
      ) {
        ElMessage.error('No tienes permisos para editar este usuario')
        router.push('/usuarios')
        return
      }

      formData.value = {
        nombre: existing.nombre,
        apellidos: existing.apellidos,
        email: existing.email,
        password: '',
        telefono: existing.telefono,
        profileId: existing.profileId,
        status: existing.status,
        tipoContrato: existing.tipoContrato || 'ASALARIADO',
        fechaContratacion: existing.fechaContratacion || null,
        imagen: existing.imagen || null,
        color: existing.color || '#3b82f6',
        areaIds: existing.areaIds ? [...existing.areaIds] : [],
        hotelIds: existing.hotelIds ? [...existing.hotelIds] : [],
      }
    } else {
      ElMessage.error('Usuario no encontrado')
      router.push('/usuarios')
    }
  } else {
    const defaultProfile = assignableProfiles.value[0]
    if (defaultProfile) {
      formData.value.profileId = defaultProfile.id
    }
  }
})

function triggerFileInput() {
  fileInput.value?.click()
}

function onFileSelected(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    ElMessage.error('Por favor selecciona un archivo de imagen válido')
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

function applyCrop() {
  if (!cropperRef.value) return
  const { canvas } = cropperRef.value.getResult()
  if (canvas) {
    formData.value.imagen = canvas.toDataURL('image/png')
    cropperDialogVisible.value = false
    ElMessage.success('Imagen recortada y asignada correctamente')
  }
}

function removeAvatar() {
  formData.value.imagen = null
  imageToCrop.value = null
  cropperDialogVisible.value = false
  ElMessage.info('Imagen eliminada. Se usará el avatar por defecto.')
}

function zoom(factor: number) {
  cropperRef.value?.zoom(factor)
}

function rotate(angle: number) {
  cropperRef.value?.rotate(angle)
}

function handleCancel() {
  router.push('/usuarios')
}

async function handleSave() {
  if (!formData.value.nombre.trim()) {
    ElMessage.warning('El nombre es obligatorio')
    return
  }
  if (!formData.value.email.trim()) {
    ElMessage.warning('El email es obligatorio')
    return
  }
  if (!isEditing.value && !formData.value.password) {
    ElMessage.warning('La contraseña es obligatoria para nuevos usuarios')
    return
  }
  if (!formData.value.profileId) {
    ElMessage.warning('Debes seleccionar un perfil para el usuario')
    return
  }

  isSaving.value = true
  try {
    const payload: UserInput = {
      nombre: formData.value.nombre,
      apellidos: formData.value.apellidos,
      email: formData.value.email,
      telefono: formData.value.telefono,
      profileId: formData.value.profileId!,
      status: formData.value.status,
      tipoContrato: formData.value.tipoContrato || 'ASALARIADO',
      fechaContratacion: formData.value.fechaContratacion || null,
      imagen: formData.value.imagen,
      color: isFotografo.value ? formData.value.color : null,
      areaIds: isGerente.value ? formData.value.areaIds : [],
      hotelIds: isSupervisorOrFotografo.value ? formData.value.hotelIds : [],
      ...(formData.value.password ? { password: formData.value.password } : {}),
    }

    if (isEditing.value && userId.value) {
      await userStore.updateUser(userId.value, payload)
      ElMessage.success('Usuario actualizado correctamente')
    } else {
      await userStore.addUser(payload)
      ElMessage.success('Usuario creado correctamente')
    }
    router.push('/usuarios')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al conectar con la base de datos'
    ElMessage.error(message)
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="view-container">
    <!-- Header con botón Volver y Título -->
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" circle @click="handleCancel" class="back-btn" />
        <div>
          <h1 class="page-title">
            {{ isEditing ? 'Editar Usuario' : 'Nuevo Usuario' }}
          </h1>
          <p class="page-subtitle">
            {{
              isEditing
                ? 'Modifica los datos, perfil, accesos e imagen del usuario'
                : 'Completa la información para dar de alta a un nuevo usuario'
            }}
          </p>
        </div>
      </div>
    </div>

    <!-- Formulario alineado según documentación oficial de Element Plus -->
    <el-form
      :model="formData"
      label-width="150px"
      label-position="left"
      class="user-form"
      @submit.prevent="handleSave"
    >
      <!-- Campo Fotografía / Avatar de Usuario -->
      <el-form-item label="Imagen">
        <div class="avatar-field-container">
          <el-avatar
            :src="formData.imagen || undefined"
            shape="circle"
            :size="90"
            :style="{
              backgroundColor: getUserBgColor(isFotografo ? formData.color : null),
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '2rem',
            }"
            class="user-avatar"
          >
            {{ getUserInitials(formData.nombre, formData.apellidos) }}
          </el-avatar>
          <div class="avatar-actions">
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              style="display: none"
              @change="onFileSelected"
            />
            <div class="avatar-buttons">
              <el-button type="primary" :icon="Upload" @click="triggerFileInput">
                {{ formData.imagen ? 'Cambiar Imagen' : 'Subir Imagen' }}
              </el-button>
              <el-button
                v-if="formData.imagen"
                type="danger"
                plain
                :icon="Delete"
                @click="removeAvatar"
              >
                Quitar Imagen
              </el-button>
            </div>
            <small class="avatar-hint">
              {{
                formData.imagen
                  ? 'Imagen personalizada cargada.'
                  : 'Sin imagen asignada. Mostrando imagen por defecto según perfil seleccionado.'
              }}
            </small>
          </div>
        </div>
      </el-form-item>

      <!-- Tabs de Datos y Calendario Laboral -->
      <el-tabs v-model="activeTab" type="card" class="user-form-tabs">
        <el-tab-pane label="Datos del Usuario" name="datos">
          <div class="tab-pane-content">
            <el-form-item label="Nombre" required>
              <el-input v-model="formData.nombre" placeholder="Ej. Juan" />
            </el-form-item>

            <el-form-item label="Apellidos" required>
              <el-input v-model="formData.apellidos" placeholder="Ej. Pérez" />
            </el-form-item>

            <el-form-item :label="isEditing ? 'Contraseña' : 'Contraseña *'" :required="!isEditing">
              <el-input
                v-model="formData.password"
                type="password"
                show-password
                :placeholder="isEditing ? 'Dejar en blanco para no cambiar' : '••••••••'"
              />
            </el-form-item>

            <el-form-item label="Email" required>
              <el-input v-model="formData.email" placeholder="juan@ejemplo.es" />
            </el-form-item>

            <el-form-item label="Teléfono">
              <el-input v-model="formData.telefono" placeholder="+34 600 000 000" />
            </el-form-item>

            <el-form-item label="Fecha Contratación">
              <el-date-picker
                v-model="formData.fechaContratacion"
                type="date"
                placeholder="Selecciona la fecha de contratación"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
                clearable
              />
            </el-form-item>

            <el-form-item label="Perfil / Rol" required>
              <div v-if="isSelfEditingProfileReadonly">
                <el-tag
                  v-if="selectedProfile"
                  :type="getRoleTagType(selectedProfile.code)"
                  size="large"
                  effect="light"
                  class="role-tag"
                >
                  <img
                    :src="getRoleSvg(selectedProfile.code)"
                    class="role-tag-icon"
                    :alt="selectedProfile.name"
                  />
                  {{ selectedProfile.name }}
                </el-tag>
              </div>
              <el-select
                v-else
                v-model="formData.profileId"
                placeholder="Selecciona un perfil"
                style="width: 100%"
                filterable
                popper-class="profile-select-popper"
              >
                <template #prefix v-if="selectedProfile">
                  <img
                    :src="getRoleSvg(selectedProfile.code)"
                    class="select-role-prefix-icon"
                    :alt="selectedProfile.name"
                  />
                </template>
                <el-option
                  v-for="profile in assignableProfiles"
                  :key="profile.id"
                  :label="profile.name"
                  :value="profile.id"
                  class="profile-dropdown-option"
                >
                  <div class="profile-option-row">
                    <el-tag
                      :type="getRoleTagType(profile.code)"
                      size="default"
                      effect="light"
                      class="role-tag"
                    >
                      <img
                        :src="getRoleSvg(profile.code)"
                        class="role-tag-icon"
                        :alt="profile.name"
                      />
                      {{ profile.name }}
                    </el-tag>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>

            <el-form-item v-if="isFotografo" label="Color asignado">
              <div style="display: flex; align-items: center; gap: 12px">
                <el-color-picker v-model="formData.color" />
                <span
                  v-if="formData.color"
                  style="font-size: 0.9rem; font-weight: 500; font-family: monospace"
                >
                  {{ formData.color }}
                </span>
                <span v-else style="font-size: 0.85rem; color: var(--el-text-color-secondary)">
                  Sin color asignado
                </span>
              </div>
            </el-form-item>

            <!-- Asignaciones de accesos por Rol -->
            <template v-if="isGerente">
              <el-form-item label="Áreas asignadas">
                <small class="assignment-hint">
                  El gerente estará a cargo de las áreas seleccionadas y todos los hoteles dentro de
                  las mismas.
                </small>
                <div v-if="isSelfEditing" class="assigned-tags-container">
                  <el-tag
                    v-for="area in assignedAreaNames"
                    :key="area.id"
                    type="warning"
                    effect="light"
                    size="large"
                  >
                    <el-icon style="margin-right: 4px; vertical-align: middle"
                      ><Location
                    /></el-icon>
                    <span>{{ area.nombre }} ({{ area.paisNombre }})</span>
                  </el-tag>
                  <span v-if="assignedAreaNames.length === 0" class="empty-hint"
                    >Sin áreas asignadas</span
                  >
                </div>
                <el-select
                  v-else
                  v-model="formData.areaIds"
                  multiple
                  filterable
                  placeholder="Selecciona una o varias áreas"
                  style="width: 100%"
                  popper-class="custom-group-select-dropdown"
                >
                  <el-option-group
                    v-for="pais in availableCountriesForAreaSelect"
                    :key="pais.id"
                    :label="`${pais.nombre} (${pais.codigo})`"
                  >
                    <el-option
                      v-for="area in pais.areas || []"
                      :key="area.id"
                      :label="area.nombre"
                      :value="area.id"
                      :disabled="assignedAreaIdsByOtherGerentes.has(area.id)"
                    >
                      <div class="option-item-content">
                        <el-icon class="area-option-icon"><Location /></el-icon>
                        <span>{{ area.nombre }}</span>
                        <small
                          v-if="assignedAreaIdsByOtherGerentes.has(area.id)"
                          class="disabled-label"
                        >
                          (Asignada a otro gerente)
                        </small>
                      </div>
                    </el-option>
                  </el-option-group>
                </el-select>
              </el-form-item>
            </template>

            <template v-else-if="isSupervisorOrFotografo">
              <el-form-item label="Hoteles asignados">
                <small class="assignment-hint">
                  Indica los hoteles sobre los que este
                  {{ selectedRoleCode === 'SUPERVISOR' ? 'supervisor' : 'fotógrafo' }} podrá
                  gestionar u operar.
                </small>
                <div
                  v-if="isSelfEditing && selectedRoleCode === 'SUPERVISOR'"
                  class="assigned-tags-container"
                >
                  <el-tag
                    v-for="hotel in assignedHotelNames"
                    :key="hotel.id"
                    type="info"
                    effect="light"
                    size="large"
                  >
                    <el-icon style="margin-right: 4px; vertical-align: middle"
                      ><Building2 :size="16"
                    /></el-icon>
                    <span
                      >{{ hotel.nombre }} ({{ hotel.paisNombre }} — {{ hotel.areaNombre }})</span
                    >
                  </el-tag>
                  <span v-if="assignedHotelNames.length === 0" class="empty-hint"
                    >Sin hoteles asignados</span
                  >
                </div>

                <el-select
                  v-else
                  v-model="formData.hotelIds"
                  multiple
                  filterable
                  placeholder="Selecciona uno o varios hoteles"
                  style="width: 100%"
                  popper-class="custom-group-select-dropdown"
                >
                  <el-option-group
                    v-for="pais in availableCountriesForHotelSelect"
                    :key="pais.id"
                    :label="pais.codigo ? `${pais.nombre} (${pais.codigo})` : pais.nombre"
                  >
                    <template v-for="area in pais.areas || []" :key="area.id">
                      <!-- Item no seleccionable por cada Área -->
                      <el-option
                        :value="`area-${area.id}`"
                        :label="area.nombre"
                        disabled
                        class="area-header-option"
                      >
                        <div class="area-option-header">
                          <el-icon :size="18" class="area-icon"><Location /></el-icon>
                          <span class="area-title">{{ area.nombre }}</span>
                        </div>
                      </el-option>

                      <!-- Hoteles pertenecientes a este área -->
                      <el-option
                        v-for="hotel in area.hoteles || []"
                        :key="hotel.id"
                        :label="`${hotel.nombre} (${area.nombre})`"
                        :value="hotel.id"
                        class="hotel-sub-option"
                        :disabled="
                          selectedRoleCode === 'SUPERVISOR' &&
                          assignedHotelIdsByOtherSupervisores.has(hotel.id)
                        "
                      >
                        <div class="option-item-content hotel-option-item">
                          <el-icon :size="18" class="hotel-option-icon"><Building2 /></el-icon>
                          <span class="hotel-name">{{ hotel.nombre }}</span>
                          <small
                            v-if="
                              selectedRoleCode === 'SUPERVISOR' &&
                              assignedHotelIdsByOtherSupervisores.has(hotel.id)
                            "
                            class="disabled-label"
                          >
                            (Asignado a otro supervisor)
                          </small>
                        </div>
                      </el-option>
                    </template>
                  </el-option-group>
                </el-select>
              </el-form-item>
            </template>

            <template v-else-if="isGlobalAccess">
              <el-form-item label="Alcance">
                <el-alert
                  type="info"
                  :closable="false"
                  show-icon
                  title="Acceso Global"
                  description="Este usuario tendrá visibilidad y acceso total sobre todos los países, áreas y hoteles del sistema."
                />
              </el-form-item>
            </template>

            <el-form-item label="Tipo Contrato">
              <el-switch
                v-model="formData.tipoContrato"
                active-value="ASALARIADO"
                inactive-value="SIN_SALARIO"
                active-text="Contratado"
                inactive-text="Freelance"
              />
              <small class="assignment-hint"> &nbsp; *Necesario para calcular tipo comisión </small>
            </el-form-item>

            <el-form-item v-if="!isStatusDisabled" label="Estado">
              <el-switch v-model="isActivo" active-text="Activo" inactive-text="Inactivo" />
            </el-form-item>

            <el-form-item class="form-actions-item">
              <el-button type="primary" :icon="Check" :loading="isSaving" @click="handleSave">
                {{ isEditing ? 'Guardar Cambios' : 'Crear Usuario' }}
              </el-button>
              <el-button :icon="Close" @click="handleCancel">Cancelar</el-button>
            </el-form-item>
          </div>
        </el-tab-pane>

        <el-tab-pane label="Calendario Laboral" name="calendario" :disabled="!isEditing">
          <template #label>
            <span
              :title="
                !isEditing ? 'Debes guardar el usuario para gestionar su calendario laboral' : ''
              "
            >
              Calendario Laboral
            </span>
          </template>
          <div class="tab-pane-content">
            <CalendarioLaboral v-if="isEditing && userId" :usuario-id="userId" />
            <div v-else class="empty-hint" style="padding: 2.5rem; text-align: center">
              Debes guardar el nuevo usuario antes de poder gestionar su calendario laboral.
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-form>

    <!-- Diálogo para Recorte de Imagen -->
    <el-dialog
      v-model="cropperDialogVisible"
      title="Recortar Imagen de Usuario"
      width="550px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div class="cropper-container" v-if="imageToCrop">
        <cropper
          ref="cropperRef"
          class="cropper"
          :src="imageToCrop"
          :stencil-component="CircleStencil"
          :stencil-props="{
            aspectRatio: 1,
          }"
        />
        <div class="cropper-controls">
          <el-button-group>
            <el-button :icon="ZoomIn" @click="zoom(1.2)">Acercar</el-button>
            <el-button :icon="ZoomOut" @click="zoom(0.8)">Alejar</el-button>
            <el-button :icon="RefreshLeft" @click="rotate(-90)">Rotar Izq.</el-button>
            <el-button :icon="RefreshRight" @click="rotate(90)">Rotar Der.</el-button>
          </el-button-group>
        </div>
      </div>
      <template #footer>
        <el-button @click="cropperDialogVisible = false">Cancelar</el-button>
        <el-button type="primary" :icon="Check" @click="applyCrop"> Guardar Recorte </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.view-container {
  padding: 2rem;
  max-width: 780px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-btn {
  font-size: 1.1rem;
}

.page-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
  margin: 0 0 0.25rem 0;
}

.page-subtitle {
  font-size: 0.9rem;
  color: var(--nav-link-color, #64748b);
  margin: 0;
}

.user-form {
  margin-top: 1rem;
}

.avatar-field-container {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.5rem 0;
}

.user-avatar {
  border: 2px solid var(--el-border-color, #e2e8f0);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  object-fit: cover;
  flex-shrink: 0;
}

.avatar-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.avatar-buttons {
  display: flex;
  gap: 0.5rem;
}

.avatar-hint,
.assignment-hint {
  display: block;
  font-size: 0.8rem;
  color: var(--nav-link-color, #64748b);
  margin-top: 0.55rem;
  margin-bottom: 0.55rem;
  line-height: 1.3;
}

.form-actions-item {
  margin-top: 1.5rem;
}

.user-form-tabs {
  margin-top: 1.25rem;
  border-radius: 8px;
  overflow: hidden;
}

.tab-pane-content {
  padding: 1rem 0.5rem 0.5rem 0.5rem;
}

.profile-option {
  display: flex;
  flex-direction: column;
}

.profile-option-name {
  font-weight: 600;
  font-size: 0.9rem;
}

.profile-option-desc {
  font-size: 0.75rem;
  color: var(--nav-link-color, #64748b);
}

.cropper-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.cropper {
  height: 320px;
  width: 100%;
  background: #1e293b;
  border-radius: 8px;
  overflow: hidden;
}

.cropper-controls {
  display: flex;
  justify-content: center;
}

.option-item-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
}

.disabled-label {
  margin-left: auto;
  font-size: 0.75rem;
  color: #94a3b8;
  font-style: italic;
}

.area-option-icon {
  color: #e6a23c;
  font-size: 1.1rem;
}

.hotel-option-icon {
  color: #94a3b8;
  font-size: 1.1rem;
}

.assigned-tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  padding: 0.25rem 0;
}

.empty-hint {
  font-size: 0.85rem;
  color: #94a3b8;
  font-style: italic;
}

.read-only-profile-text {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--heading-color, #0f172a);
}

:deep(.el-tag.role-tag) {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  overflow: visible !important;
}

:deep(.el-tag.role-tag .el-tag__content) {
  overflow: visible !important;
  display: inline-flex;
  align-items: center;
}

.role-tag-icon {
  width: 32px;
  height: 32px;
  object-fit: contain;
  flex-shrink: 0;
  margin-top: -12px;
  margin-right: 3px;
  vertical-align: middle;
  position: relative;
  z-index: 1;
}

.role-tag {
  font-weight: 700 !important;
  text-transform: uppercase;
}

.select-role-prefix-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
  margin-right: 4px;
  flex-shrink: 0;
}

.profile-dropdown-option {
  height: auto !important;
  padding: 6px 12px !important;
  display: flex;
  align-items: center;
}

.profile-option-row {
  display: flex;
  align-items: center;
  width: 100%;
}

:deep(.el-select-group__title) {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
  padding-top: 0.6rem;
  padding-bottom: 0.3rem;
}

@media (max-width: 768px) {
  .user-form {
    padding: 1rem;
  }

  :deep(.user-form .el-form-item) {
    flex-direction: column;
    align-items: flex-start;
  }

  :deep(.user-form .el-form-item__label) {
    width: 100% !important;
    text-align: left !important;
    margin-bottom: 0.25rem;
  }

  .avatar-field-container {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .avatar-buttons {
    flex-direction: column;
    width: 100%;
  }

  .avatar-buttons .el-button {
    width: 100%;
  }

  .form-actions {
    flex-direction: column-reverse;
    gap: 0.75rem;
  }

  .form-actions .el-button {
    width: 100%;
  }

  :deep(.el-dialog) {
    width: 95% !important;
  }

  .cropper {
    height: 240px;
  }
}
</style>

<style>
/* Estilos globales para el dropdown de perfil en el select */
.profile-select-popper .el-select-dropdown__item {
  height: 50px !important;
  line-height: normal !important;
  display: flex !important;
  align-items: center !important;
  padding: 6px 16px !important;
  overflow: visible !important;
}

.profile-select-popper .profile-option-row {
  display: flex;
  align-items: center;
  width: 100%;
  padding-top: 4px;
}

.profile-select-popper .el-tag.role-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  overflow: visible !important;
}

.profile-select-popper .el-tag.role-tag .el-tag__content {
  overflow: visible !important;
  display: inline-flex;
  align-items: center;
}

.profile-select-popper .role-tag-icon {
  width: 34px;
  height: 34px;
  object-fit: contain;
  flex-shrink: 0;
  margin-top: -12px;
  margin-right: 3px;
  vertical-align: middle;
  position: relative;
  z-index: 1;
}

.profile-select-popper .role-tag {
  font-weight: 700 !important;
  text-transform: uppercase;
}
</style>
