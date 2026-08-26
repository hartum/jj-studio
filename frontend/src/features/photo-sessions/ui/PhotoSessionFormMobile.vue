<script setup lang="ts">
import type { PhotoSessionFormContext } from '../composables/usePhotoSessionForm'
import { ArrowLeft, Check, Close } from '@element-plus/icons-vue'

const props = defineProps<{
  form: PhotoSessionFormContext
}>()

const {
  formData,
  isEditing,
  isSaving,
  isReadOnly,
  handleGoBack,
  handleSaveSession,
} = props.form
</script>

<template>
  <div class="session-form-mobile">
    <!-- Mobile Header -->
    <div class="mobile-header">
      <el-button :icon="ArrowLeft" circle class="back-btn" @click="handleGoBack" />
      <h1 class="mobile-title">
        {{ isEditing ? 'Editar Sesión' : 'Nueva Sesión' }}
      </h1>
    </div>

    <div class="mobile-content">
      <!-- Placeholder mientras definimos el diseño móvil detallado -->
      <div class="mobile-placeholder-card">
        <p class="placeholder-text">
          Vista móvil lista para implementar el nuevo diseño solicitado.
        </p>
      </div>
    </div>

    <!-- Barra de acciones inferior móvil (Sticky Bottom Bar) -->
    <div class="mobile-bottom-actions">
      <el-button size="large" :icon="Close" @click="handleGoBack">
        Cancelar
      </el-button>
      <el-button
        type="primary"
        size="large"
        :icon="Check"
        :loading="isSaving"
        :disabled="isReadOnly"
        @click="handleSaveSession"
      >
        {{ isEditing ? 'Guardar' : 'Agendar' }}
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.session-form-mobile {
  padding: 1rem;
  padding-bottom: 5.5rem;
  min-height: 100vh;
  box-sizing: border-box;
}

.mobile-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.mobile-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
  margin: 0;
}

.back-btn {
  background-color: var(--toolbar-bg, #ffffff);
  border: 1px solid var(--toolbar-border, #e2e8f0);
}

.mobile-placeholder-card {
  padding: 1.5rem;
  border-radius: 12px;
  background: var(--toolbar-bg, #ffffff);
  border: 1px solid var(--toolbar-border, #e2e8f0);
  text-align: center;
}

.placeholder-text {
  color: var(--nav-link-color, #64748b);
  font-size: 0.95rem;
  margin: 0;
}

.mobile-bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0.85rem 1rem;
  background: var(--toolbar-bg, #ffffff);
  border-top: 1px solid var(--toolbar-border, #e2e8f0);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  z-index: 100;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.05);
}
</style>
