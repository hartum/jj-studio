<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHotelStore } from '../stores/hotel.store'
import { useCountryStore } from '@/features/countries/stores/country.store'
import { getFlagEmoji } from '@/shared/flagEmoji'
import { ArrowLeft, Check, Close } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const hotelStore = useHotelStore()
const countryStore = useCountryStore()

const hotelId = computed(() => {
  const param = route.params.id as string | undefined
  return param ? Number(param) : undefined
})

const isEditing = computed(() => !!hotelId.value)
const isSaving = ref(false)

const isMobile = ref(false)

function checkMobile() {
  isMobile.value = window.innerWidth <= 768
}

const formData = ref({
  areaId: null as number | null,
  nombre: '',
  direccion: '',
  estrellas: 5,
  cadenaHotelera: '',
  personaContacto: '',
  email: '',
  telefono: '',
  latitud: null as number | null,
  longitud: null as number | null,
})

onMounted(async () => {
  checkMobile()
  window.addEventListener('resize', checkMobile)

  await countryStore.fetchCountries()
  await hotelStore.fetchHotels()

  if (isEditing.value && hotelId.value) {
    const existing = hotelStore.hotels.find((h) => h.id === hotelId.value)
    if (existing) {
      formData.value = {
        areaId: existing.areaId,
        nombre: existing.nombre,
        direccion: existing.direccion || '',
        estrellas: existing.estrellas || 5,
        cadenaHotelera: existing.cadenaHotelera || '',
        personaContacto: existing.personaContacto || '',
        email: existing.email || '',
        telefono: existing.telefono || '',
        latitud: existing.latitud || null,
        longitud: existing.longitud || null,
      }
    } else {
      ElMessage.error('Hotel no encontrado')
      router.push('/configuracion?tab=hoteles')
    }
  } else {
    // Si es nuevo hotel, seleccionar por defecto la primera área si existe
    const firstArea = allAreasFlat.value[0]
    if (firstArea) {
      formData.value.areaId = firstArea.id
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

// Lista plana de todas las áreas activas con su país para el selector
const allAreasFlat = computed(() => {
  const result: Array<{ id: number; nombre: string; paisNombre: string; paisCodigo: string }> = []
  for (const pais of countryStore.countries) {
    if (pais.areas) {
      for (const area of pais.areas) {
        result.push({
          id: area.id,
          nombre: area.nombre,
          paisNombre: pais.nombre,
          paisCodigo: pais.codigo,
        })
      }
    }
  }
  return result
})

function handleCancel() {
  router.push('/configuracion?tab=hoteles')
}

async function handleSave() {
  if (!formData.value.nombre.trim() || !formData.value.areaId) {
    ElMessage.warning('Por favor completa todos los campos requeridos (*)')
    return
  }

  isSaving.value = true
  try {
    if (isEditing.value && hotelId.value) {
      await hotelStore.updateHotel(hotelId.value, {
        areaId: formData.value.areaId,
        nombre: formData.value.nombre.trim(),
        direccion: formData.value.direccion,
        estrellas: formData.value.estrellas,
        cadenaHotelera: formData.value.cadenaHotelera,
        personaContacto: formData.value.personaContacto,
        email: formData.value.email,
        telefono: formData.value.telefono,
      })
      ElMessage.success('Hotel actualizado correctamente')
    } else {
      await hotelStore.addHotel({
        areaId: formData.value.areaId,
        nombre: formData.value.nombre.trim(),
        direccion: formData.value.direccion,
        estrellas: formData.value.estrellas,
        cadenaHotelera: formData.value.cadenaHotelera,
        personaContacto: formData.value.personaContacto,
        email: formData.value.email,
        telefono: formData.value.telefono,
      })
      ElMessage.success('Hotel creado correctamente')
    }
    router.push('/configuracion?tab=hoteles')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al guardar el hotel'
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
        <el-button :icon="ArrowLeft" circle class="back-btn" @click="handleCancel" />
        <div>
          <h1 class="page-title">
            {{ isEditing ? 'Editar Hotel' : 'Nuevo Hotel' }}
          </h1>
          <p class="page-subtitle">
            {{
              isEditing
                ? 'Modifica los datos operativos y área asignada al hotel'
                : 'Completa la información para dar de alta un nuevo hotel'
            }}
          </p>
        </div>
      </div>
    </div>

    <!-- Formulario alineado -->
    <el-form
      :model="formData"
      :label-width="isMobile ? 'auto' : '170px'"
      :label-position="isMobile ? 'top' : 'left'"
      :size="isMobile ? 'large' : 'default'"
      class="hotel-form"
      @submit.prevent="handleSave"
    >
      <el-form-item label="Nombre del Hotel *" required>
        <el-input v-model="formData.nombre" placeholder="Ej. Riu Cancún" />
      </el-form-item>

      <el-form-item label="Área Asignada *" required>
        <el-select v-model="formData.areaId" placeholder="Selecciona un área" style="width: 100%">
          <el-option
            v-for="area in allAreasFlat"
            :key="area.id"
            :label="`${getFlagEmoji(area.paisCodigo)} ${area.nombre} (${area.paisNombre})`"
            :value="area.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="Cadena Hotelera">
        <el-input
          v-model="formData.cadenaHotelera"
          placeholder="Ej. RIU, Iberostar, Hyatt, Secrets"
        />
      </el-form-item>

      <el-form-item label="Categoría / Estrellas">
        <el-rate v-model="formData.estrellas" />
      </el-form-item>

      <el-form-item label="Persona de Contacto">
        <el-input
          v-model="formData.personaContacto"
          placeholder="Ej. Director de Animación / Gerente"
        />
      </el-form-item>

      <el-form-item label="Teléfono de Contacto">
        <el-input v-model="formData.telefono" placeholder="+52 998 000 0000" />
      </el-form-item>

      <el-form-item label="Correo Electrónico">
        <el-input v-model="formData.email" placeholder="contacto@hotel.com" />
      </el-form-item>

      <el-form-item label="Dirección Física">
        <el-input
          v-model="formData.direccion"
          type="textarea"
          :rows="3"
          placeholder="Dirección completa del hotel"
        />
      </el-form-item>

      <el-form-item class="form-actions-item">
        <el-button
          type="primary"
          :size="isMobile ? 'large' : 'default'"
          :icon="Check"
          :loading="isSaving"
          @click="handleSave"
        >
          {{ isEditing ? 'Guardar Cambios' : 'Crear Hotel' }}
        </el-button>
        <el-button
          :size="isMobile ? 'large' : 'default'"
          :icon="Close"
          @click="handleCancel"
        >
          Cancelar
        </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<style scoped>
.view-container {
  max-width: 720px;
}

.page-header {
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

.hotel-form {
  margin-top: 1rem;
}

.form-actions-item {
  margin-top: 2rem;
}

@media (max-width: 768px) {

  :deep(.hotel-form .el-form-item) {
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
  }

  :deep(.hotel-form .el-form-item__label) {
    width: 100% !important;
    text-align: left !important;
    margin-bottom: 0.25rem;
  }

  :deep(.hotel-form .el-form-item__content) {
    width: 100% !important;
    margin-left: 0 !important;
  }

  :deep(.hotel-form .el-input),
  :deep(.hotel-form .el-select),
  :deep(.hotel-form .el-textarea) {
    width: 100% !important;
  }

  :deep(.form-actions-item .el-form-item__content) {
    display: flex;
    flex-direction: column-reverse;
    gap: 0.75rem;
    width: 100%;
    margin-left: 0 !important;
  }

  :deep(.form-actions-item .el-button) {
    width: 100%;
    margin-left: 0 !important;
  }
}
</style>
