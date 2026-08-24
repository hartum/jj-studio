<script setup lang="ts">
import { User, Calendar, Delete, InfoFilled } from '@element-plus/icons-vue'
import { Building2 } from '@lucide/vue'
import { getUserInitials, getUserBgColor } from '@/features/users/utils/user-avatar'
import type { EventTooltipInfo } from '../../composables/useCalendarEvents'

interface Props {
  visible: boolean
  info: EventTooltipInfo | null
  canDelete?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'edit', info: EventTooltipInfo): void
  (e: 'delete', info: EventTooltipInfo, event: MouseEvent): void
}>()
</script>

<template>
  <el-dialog
    :model-value="visible"
    width="90%"
    class="mobile-event-dialog"
    append-to-body
    destroy-on-close
    @update:model-value="emit('update:visible', $event)"
  >
    <template #header>
      <div v-if="info" class="dialog-custom-header">
        <div class="header-hotel" title="Hotel">
          <el-icon :size="18"><Building2 /></el-icon>
          <span>{{ info.hotelNombre }}</span>
        </div>
        <div class="header-photographer" title="Fotógrafo asignado">
          <el-avatar
            v-if="info.fotografoPrimerNombre !== 'Sin asignar'"
            :src="info.fotografoImagen || undefined"
            shape="circle"
            :size="22"
            :style="{
              backgroundColor: getUserBgColor(info.fotografoColor),
              color: '#ffffff',
              fontWeight: '600',
              fontSize: '11px',
            }"
          >
            {{ getUserInitials(info.fotografoNombre, info.fotografoApellidos) }}
          </el-avatar>
          <el-icon v-else :size="16"><User /></el-icon>
          <span>{{ info.fotografoPrimerNombre }}</span>
        </div>
        <div class="sub-header">
          <el-icon :size="16"><Calendar /></el-icon>
          <span>{{ info.fechaCabecera }}</span>
        </div>
      </div>
    </template>

    <div v-if="info" class="tooltip-body">
      <div class="info-row">
        <span class="info-label">Habitación:</span>
        <span class="info-value">{{ info.habitacion }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Nombre cliente:</span>
        <span class="info-value">{{ info.clienteNombre }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Checkout:</span>
        <span class="info-value">{{ info.checkout }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Fecha cita venta:</span>
        <span class="info-value">{{ info.fechaCitaVenta }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Adultos y niños:</span>
        <span class="info-value">{{ info.adultosYNinos }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Teléfono:</span>
        <span class="info-value">{{ info.telefono }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Email:</span>
        <span class="info-value email-text">{{ info.email }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Agendado por:</span>
        <span class="info-value">{{ info.agendadoPor }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Fotógrafo:</span>
        <span class="info-value">{{ info.fotografoNombreCompleto }}</span>
      </div>
    </div>

    <template #footer>
      <div v-if="info" class="dialog-footer-actions">
        <el-button
          type="primary"
          size="large"
          style="width: 100%"
          @click="emit('edit', info)"
        >
          Editar {{ info.type === 'sale' ? 'Cita Venta' : 'Sesión' }}
        </el-button>

        <!-- Botón de Borrar en Diálogo Móvil para ADMIN y SUPERUSUARIO -->
        <div v-if="canDelete" style="margin-top: 10px; width: 100%">
          <el-button
            type="danger"
            size="large"
            plain
            style="width: 100%"
            @click="emit('delete', info, $event)"
          >
            <el-icon style="margin-right: 4px"><Delete /></el-icon>
            Eliminar {{ info.type === 'sale' ? 'Cita Venta' : 'Sesión' }}
          </el-button>
        </div>
      </div>
      <div class="double-click-hint">
        <el-icon style="vertical-align: middle; margin-right: 4px"><InfoFilled /></el-icon>
        O haz doble clic en el evento para editar
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.dialog-custom-header {
  display: flex;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--el-border-color-light, #f1f5f9);
  gap: 5px;
  padding-bottom: 0.5rem;
  width: 100%;
}

.header-hotel,
.header-photographer {
  font-size: 1.2rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 5px;
}

.sub-header {
  display: flex;
  align-items: center;
  gap: 5px;
  width: 100%;
  margin-top: 0.25rem;
  font-weight: bold;
}

.tooltip-body {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.85rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 4px 0;
  border-bottom: 1px dashed var(--el-border-color-lighter, #f1f5f9);
}

.info-label {
  color: var(--el-text-color-secondary, #64748b);
  font-weight: 500;
  white-space: nowrap;
}

.info-value {
  color: var(--el-text-color-primary, #0f172a);
  font-weight: 500;
  text-align: right;
  word-break: break-word;
}

.email-text {
  font-size: 0.8rem;
}

.dialog-footer-actions {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.double-click-hint {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: var(--el-text-color-placeholder, #94a3b8);
  text-align: center;
}
</style>
