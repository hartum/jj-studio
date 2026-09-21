<script setup lang="ts">
import { ref } from 'vue'
import { Cropper, CircleStencil } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'
import { ZoomIn, ZoomOut, RefreshLeft, RefreshRight, Check } from '@element-plus/icons-vue'
import { useLocale } from '@/i18n/useLocale'

defineProps<{
  visible: boolean
  imageSrc: string | null
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'crop', base64: string): void
  (e: 'cancel'): void
}>()

const { t } = useLocale()
const cropperRef = ref<InstanceType<typeof Cropper> | null>(null)

function zoom(factor: number) {
  cropperRef.value?.zoom(factor)
}

function rotate(angle: number) {
  cropperRef.value?.rotate(angle)
}

function handleCancel() {
  emit('update:visible', false)
  emit('cancel')
}

function handleSave() {
  if (!cropperRef.value) return
  const { canvas } = cropperRef.value.getResult()
  if (canvas) {
    const base64 = canvas.toDataURL('image/png')
    emit('crop', base64)
  }
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="t('users.form.cropperTitle')"
    width="550px"
    class="avatar-cropper-dialog"
    :close-on-click-modal="false"
    destroy-on-close
    @update:model-value="emit('update:visible', $event)"
  >
    <div v-if="imageSrc" class="cropper-container">
      <cropper
        ref="cropperRef"
        class="cropper"
        :src="imageSrc"
        :stencil-component="CircleStencil"
        :stencil-props="{
          aspectRatio: 1,
        }"
      />
      <div class="cropper-controls">
        <el-button-group>
          <el-button :icon="ZoomIn" @click="zoom(1.2)">{{ t('users.form.zoomIn') }}</el-button>
          <el-button :icon="ZoomOut" @click="zoom(0.8)">{{ t('users.form.zoomOut') }}</el-button>
          <el-button :icon="RefreshLeft" @click="rotate(-90)">{{ t('users.form.rotateLeft') }}</el-button>
          <el-button :icon="RefreshRight" @click="rotate(90)">{{ t('users.form.rotateRight') }}</el-button>
        </el-button-group>
      </div>
    </div>
    <template #footer>
      <el-button :disabled="loading" @click="handleCancel">
        {{ t('users.form.cropperCancel') }}
      </el-button>
      <el-button type="primary" :icon="Check" :loading="loading" @click="handleSave">
        {{ t('users.form.saveCrop') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
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

@media (max-width: 640px) {
  :deep(.avatar-cropper-dialog) {
    width: 95% !important;
  }

  .cropper {
    height: 240px;
  }
}
</style>
