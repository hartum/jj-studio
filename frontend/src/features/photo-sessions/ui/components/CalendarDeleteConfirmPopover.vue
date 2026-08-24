<script setup lang="ts">
import { WarningFilled } from '@element-plus/icons-vue'

interface Props {
  visible: boolean
  target: HTMLElement | null
  isDeleting: boolean
  deleteAssociated: boolean
  hasAssociated: boolean
  associatedLabel: string
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'update:deleteAssociated', val: boolean): void
  (e: 'confirm'): void
}>()
</script>

<template>
  <el-popover
    :visible="visible"
    :virtual-ref="target"
    virtual-triggering
    trigger="click"
    width="270"
    placement="top"
    popper-class="delete-confirm-popover"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="delete-popconfirm-box">
      <div class="delete-popconfirm-header">
        <el-icon class="delete-warning-icon" :size="16" color="#e6a23c">
          <WarningFilled />
        </el-icon>
        <span class="delete-popconfirm-title">¿Eliminar este evento?</span>
      </div>

      <!-- Checkbox para evento asociado -->
      <div v-if="hasAssociated" class="delete-associated-row">
        <el-checkbox
          :model-value="deleteAssociated"
          size="default"
          @update:model-value="emit('update:deleteAssociated', Boolean($event))"
        >
          <span class="delete-checkbox-label">{{ associatedLabel }}</span>
        </el-checkbox>
      </div>

      <div class="delete-popconfirm-actions">
        <el-button size="small" plain @click="emit('update:visible', false)">
          Cancelar
        </el-button>
        <el-button
          size="small"
          type="danger"
          :loading="isDeleting"
          @click="emit('confirm')"
        >
          Sí, eliminar
        </el-button>
      </div>
    </div>
  </el-popover>
</template>

<style scoped>
.delete-popconfirm-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.delete-popconfirm-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.delete-warning-icon {
  flex-shrink: 0;
}

.delete-popconfirm-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--el-text-color-primary, #0f172a);
}

.delete-associated-row {
  background: var(--el-fill-color-light, #f8fafc);
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px dashed var(--el-border-color, #cbd5e1);
  display: flex;
  align-items: center;
}

.delete-checkbox-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--el-text-color-regular, #334155);
}

.delete-popconfirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}
</style>
