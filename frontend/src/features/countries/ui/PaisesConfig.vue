<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCountryStore } from '../stores/country.store'
import { WORLD_COUNTRIES } from '../domain/world-countries.data'
import type { Pais, AreaItem, HotelItem } from '../domain/country.model'
import { getFlagEmoji } from '@/shared/flagEmoji'
import {
  Plus,
  Delete,
  Location,
  Check,
  Close,
} from '@element-plus/icons-vue'
import { Building2 } from '@lucide/vue'
import { ElMessage } from 'element-plus'

interface TreeNode {
  id: string
  label: string
  type: 'pais' | 'area' | 'hotel'
  rawPais?: Pais
  rawArea?: AreaItem
  rawHotel?: HotelItem
  children?: TreeNode[]
}

const countryStore = useCountryStore()

const selectedCountryCode = ref<string>('')
const isAdding = ref(false)

// Estado para formulario de creación de área inline
const addingAreaCountryId = ref<number | null>(null)
const newAreaName = ref('')
const isCreatingArea = ref(false)

onMounted(async () => {
  await countryStore.fetchCountries()
})

// Filtrar el listado del select para que NO muestre países que ya están añadidos en la BBDD
const availableSelectCountries = computed(() => {
  return WORLD_COUNTRIES.filter((worldCountry) => {
    return !countryStore.countries.some(
      (active) => active.codigo.toUpperCase() === worldCountry.codigo.toUpperCase(),
    )
  })
})

// Convertir los países (con áreas y hoteles anidados) en la estructura de árbol para el el-tree
const treeData = computed<TreeNode[]>(() => {
  return countryStore.countries.map((pais) => ({
    id: `pais-${pais.id}`,
    label: pais.nombre,
    type: 'pais',
    rawPais: pais,
    children: (pais.areas || []).map((area) => ({
      id: `area-${area.id}`,
      label: area.nombre,
      type: 'area',
      rawArea: area,
      children: (area.hoteles || []).map((hotel) => ({
        id: `hotel-${hotel.id}`,
        label: hotel.nombre,
        type: 'hotel',
        rawHotel: hotel,
      })),
    })),
  }))
})

async function handleAddCountry() {
  if (!selectedCountryCode.value) {
    ElMessage.warning('Por favor selecciona un país de la lista')
    return
  }

  const target = WORLD_COUNTRIES.find((c) => c.codigo === selectedCountryCode.value)
  if (!target) return

  const alreadyExists = countryStore.countries.some(
    (c) => c.codigo.toUpperCase() === target.codigo.toUpperCase(),
  )
  if (alreadyExists) {
    ElMessage.warning('El país seleccionado ya se encuentra en el sistema')
    return
  }

  isAdding.value = true
  try {
    await countryStore.addCountry({
      codigo: target.codigo,
      nombre: target.nombre,
      codigoTelefono: target.codigoTelefono,
    })
    ElMessage.success(`País "${target.nombre}" añadido correctamente`)
    selectedCountryCode.value = ''
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al añadir el país'
    ElMessage.error(message)
  } finally {
    isAdding.value = false
  }
}

async function handleDeleteCountry(pais: Pais) {
  try {
    await countryStore.deleteCountry(pais.id)
    ElMessage.success(`País "${pais.nombre}" eliminado correctamente`)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al eliminar el país'
    ElMessage.error(message)
  }
}

function showAddAreaForm(paisId: number) {
  addingAreaCountryId.value = paisId
  newAreaName.value = ''
}

function cancelAddAreaForm() {
  addingAreaCountryId.value = null
  newAreaName.value = ''
}

async function handleCreateArea(paisId: number) {
  if (!newAreaName.value.trim()) {
    ElMessage.warning('Por favor introduce el nombre del área')
    return
  }

  isCreatingArea.value = true
  try {
    await countryStore.addArea({
      paisId,
      nombre: newAreaName.value.trim(),
    })
    ElMessage.success(`Área "${newAreaName.value.trim()}" creada correctamente`)
    cancelAddAreaForm()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al crear el área'
    ElMessage.error(message)
  } finally {
    isCreatingArea.value = false
  }
}

async function handleDeleteArea(area: AreaItem) {
  try {
    await countryStore.deleteArea(area.id)
    ElMessage.success(`Área "${area.nombre}" eliminada correctamente`)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al eliminar el área'
    ElMessage.error(message)
  }
}
</script>

<template>
  <div v-loading="countryStore.isLoading" class="paises-config-container">
    <!-- Barra superior de selección y botón para añadir país -->
    <div class="add-country-bar">
      <el-select
        v-model="selectedCountryCode"
        filterable
        placeholder="Buscar y seleccionar país para añadir..."
        size="large"
        class="country-select"
      >
        <el-option
          v-for="country in availableSelectCountries"
          :key="country.codigo"
          :label="`${getFlagEmoji(country.codigo)} ${country.nombre} (${country.codigo})`"
          :value="country.codigo"
        >
          <div class="select-option-row">
            <span class="option-flag">{{ getFlagEmoji(country.codigo) }}</span>
            <span class="option-name">{{ country.nombre }}</span>
            <span class="option-code">({{ country.codigo }})</span>
            <el-tag size="small" type="success" effect="plain" class="option-phone">
              {{ country.codigoTelefono }}
            </el-tag>
          </div>
        </el-option>
      </el-select>

      <el-button
        type="primary"
        size="large"
        :icon="Plus"
        :loading="isAdding"
        :disabled="!selectedCountryCode"
        @click="handleAddCountry"
      >
        Añadir País
      </el-button>
    </div>

    <!-- Árbol de dependencias (País -> Área -> Hotel) -->
    <div class="tree-wrapper">
      <el-tree :data="treeData" node-key="id" :expand-on-click-node="false" class="country-tree">
        <template #default="{ data }">
          <div class="tree-node-content">
            <!-- Nodo País (Raíz) -->
            <template v-if="data.type === 'pais' && data.rawPais">
              <span class="node-flag">{{ getFlagEmoji(data.rawPais.codigo) }}</span>
              <span class="node-title country-title">{{ data.rawPais.nombre }}</span>

              <!-- Botones de Acción / Formulario de Área Inline -->
              <div class="node-actions" @click.stop>
                <!-- Si NO se está creando área: se muestra el botón de añadir área y borrar país -->
                <div v-if="addingAreaCountryId !== data.rawPais.id" class="buttons-container">
                  <el-button
                    type="primary"
                    link
                    :icon="Plus"
                    title="Añadir área"
                    class="action-btn"
                    @click.stop="showAddAreaForm(data.rawPais.id)"
                  />
                  <el-popconfirm
                    :title="`¿Eliminar el país ${data.rawPais.nombre}?`"
                    confirm-button-text="Eliminar"
                    cancel-button-text="Cancelar"
                    confirm-button-type="danger"
                    :width="240"
                    @confirm="handleDeleteCountry(data.rawPais)"
                  >
                    <template #reference>
                      <el-button
                        type="danger"
                        link
                        :icon="Delete"
                        title="Eliminar país"
                        class="action-btn delete-btn"
                        @click.stop
                      />
                    </template>
                  </el-popconfirm>
                </div>

                <!-- Si SÍ se está creando área: los botones se ocultan y se muestra el formulario de 1 campo -->
                <div v-else class="forms-container" @click.stop>
                  <el-input
                    v-model="newAreaName"
                    placeholder="Nombre del área..."
                    size="small"
                    class="area-inline-input"
                    @keyup.enter="handleCreateArea(data.rawPais.id)"
                    @click.stop
                  />
                  <el-button
                    type="success"
                    size="small"
                    :icon="Check"
                    :loading="isCreatingArea"
                    @click.stop="handleCreateArea(data.rawPais.id)"
                  />
                  <el-button size="small" :icon="Close" @click.stop="cancelAddAreaForm" />
                </div>
              </div>
            </template>

            <!-- Nodo Área (Hijo de País) -->
            <template v-else-if="data.type === 'area' && data.rawArea">
              <el-icon class="node-icon area-icon"><Location /></el-icon>
              <span class="node-title area-title">{{ data.rawArea.nombre }}</span>
              <span class="count-badge">({{ (data.rawArea.hoteles || []).length }} hoteles)</span>

              <!-- Botón Eliminar Área (Icono Papelera) -->
              <div class="node-actions" @click.stop>
                <el-popconfirm
                  :title="`¿Eliminar el área ${data.rawArea.nombre}?`"
                  confirm-button-text="Eliminar"
                  cancel-button-text="Cancelar"
                  confirm-button-type="danger"
                  :width="240"
                  @confirm="handleDeleteArea(data.rawArea)"
                >
                  <template #reference>
                    <el-button
                      type="danger"
                      link
                      :icon="Delete"
                      title="Eliminar área"
                      class="action-btn delete-btn"
                      @click.stop
                    />
                  </template>
                </el-popconfirm>
              </div>
            </template>

            <!-- Nodo Hotel (Hijo de Área) -->
            <template v-else-if="data.type === 'hotel' && data.rawHotel">
              <el-icon class="node-icon hotel-icon"><Building2 /></el-icon>
              <span class="node-title hotel-title">{{ data.rawHotel.nombre }}</span>
            </template>
          </div>
        </template>
      </el-tree>
    </div>
  </div>
</template>

<style scoped>
.paises-config-container {
  padding-top: 0.5rem;
}

/* Barra de selección de países */
.add-country-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.country-select {
  flex: 1;
  max-width: 420px;
}

.select-option-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
}

.option-flag {
  font-size: 1.1rem;
}

.option-name {
  font-weight: 600;
}

.option-code {
  color: var(--nav-link-color, #64748b);
  font-size: 0.85rem;
}

.option-phone {
  margin-left: auto;
}

/* Contenedor del Árbol */
.tree-wrapper {
  background-color: var(--toolbar-bg, #ffffff);
  border: 1px solid var(--toolbar-border, #e2e8f0);
  border-radius: 10px;
  padding: 1rem;
}

.country-tree {
  font-size: 0.95rem;
  background: transparent;
}

.tree-node-content {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.25rem 0;
}

.node-flag {
  font-size: 1.2rem;
}

.node-icon {
  font-size: 1.1rem;
}

.area-icon {
  color: #e6a23c;
}

.hotel-icon {
  color: #94a3b8;
}

.node-title {
  color: var(--heading-color, #0f172a);
}

.country-title {
  font-weight: 450;
}

.area-title {
  /*font-weight: 600;*/
}

.hotel-title {
  color: var(--nav-link-color, #475569);
}

.count-badge {
  font-size: 0.8rem;
  color: var(--nav-link-color, #94a3b8);
}

.node-actions {
  margin-left: auto;
  margin-right: 0.5rem;
  display: flex;
  align-items: center;
}

.buttons-container {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.forms-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.area-inline-input {
  width: 180px;
}

.action-btn {
  font-size: 1.1rem;
}

.delete-btn {
  font-size: 1.1rem;
}

@media (max-width: 768px) {
  .paises-config-container {
    padding: 1rem;
  }

  .add-country-card {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .country-select {
    width: 100%;
  }

  .add-country-card .el-button {
    width: 100%;
  }

  .area-inline-input {
    width: 130px;
  }

  :deep(.el-dialog) {
    width: 92% !important;
    max-width: 400px;
  }
}
</style>
