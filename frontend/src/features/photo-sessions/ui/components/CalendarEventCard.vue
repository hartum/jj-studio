<script setup lang="ts">
import type { EventContentArg } from '@fullcalendar/core'
import { User, Delete } from '@element-plus/icons-vue'
import { getUserInitials, getUserBgColor } from '@/features/users/utils/user-avatar'
import iconoCamara from '@/assets/icono_camara.png'
import iconoCita from '@/assets/icono_cita.png'

interface Props {
  arg: EventContentArg
  canDelete?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'delete', event: MouseEvent): void
}>()

function getEventTimeText(arg: EventContentArg): string {
  if (arg.event.start) {
    const hours = String(arg.event.start.getHours()).padStart(2, '0')
    const minutes = String(arg.event.start.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }
  return arg.timeText ?? ''
}
</script>

<template>
  <div class="jj-event-card-content" :data-event-id="arg.event.id">
    <!-- Icono de Cámara para Sesiones -->
    <img
      v-if="arg.event.extendedProps.type !== 'sale'"
      :src="iconoCamara"
      alt="Sesión Fotográfica"
      class="jj-event-type-badge jj-badge-camara"
    />
    <!-- Icono de Cita para Citas de Venta -->
    <img
      v-else
      :src="iconoCita"
      alt="Cita de Venta"
      class="jj-event-type-badge jj-badge-cita"
    />

    <!-- Cabecera: Avatar + (Hora y Nombre Fotógrafo) -->
    <div class="jj-event-header">
      <div class="jj-event-header-left">
        <!-- Avatar del fotógrafo (Foto o Iniciales con color de fondo) -->
        <el-avatar
          v-if="arg.event.extendedProps.fotografoPrimerNombre"
          :src="arg.event.extendedProps.fotografoImagen || undefined"
          shape="circle"
          :size="30"
          :style="{
            backgroundColor: getUserBgColor(arg.event.extendedProps.fotografoColor),
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: '700',
            flexShrink: 0,
            border: '1.5px solid rgba(255, 255, 255, 0.85)',
          }"
          class="jj-event-avatar"
        >
          {{
            getUserInitials(
              arg.event.extendedProps.fotografoNombre,
              arg.event.extendedProps.fotografoApellidos,
            )
          }}
        </el-avatar>
        <el-avatar
          v-else
          shape="circle"
          :size="30"
          :style="{
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: '700',
            flexShrink: 0,
            border: '1.5px solid rgba(255, 255, 255, 0.6)',
          }"
          class="jj-event-avatar"
        >
          <el-icon :size="16"><User /></el-icon>
        </el-avatar>

        <!-- Hora y Fotógrafo apilados -->
        <div class="jj-event-header-titles">
          <span v-if="getEventTimeText(arg)" class="jj-event-time">
            {{ getEventTimeText(arg) }}
          </span>
          <span
            v-if="arg.event.extendedProps.fotografoPrimerNombre"
            class="jj-event-photographer"
          >
            {{ arg.event.extendedProps.fotografoPrimerNombre }}
          </span>
          <span v-else class="jj-event-photographer jj-event-unassigned">Sin asignar</span>
        </div>
      </div>

      <!-- Icono Cubo de Basura (Solo ADMIN y SUPERUSUARIO) -->
      <div v-if="canDelete" class="jj-event-delete-wrapper" @click.stop>
        <button
          type="button"
          class="jj-event-trash-btn"
          title="Eliminar evento"
          @click.stop="emit('delete', $event)"
        >
          <el-icon :size="12"><Delete /></el-icon>
        </button>
      </div>
    </div>

    <!-- Separador punteado -->
    <div class="jj-event-divider"></div>

    <!-- Cuerpo: Habitación, Cliente y PAX -->
    <div class="jj-event-body">
      <div v-if="arg.event.extendedProps.roomStr" class="jj-event-room">
        {{ arg.event.extendedProps.roomStr }}
      </div>
      <div class="jj-event-client">
        {{ arg.event.extendedProps.clienteNombre || arg.event.title }}
      </div>
      <div v-if="arg.event.extendedProps.paxStr" class="jj-event-pax">
        {{ arg.event.extendedProps.paxStr }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.jj-event-card-content {
  display: flex;
  flex-direction: column;
  width: 100%;
  position: relative;
  line-height: 1.25;
  box-sizing: border-box;
}

.jj-event-type-badge {
  position: absolute;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.28));
  pointer-events: none;
  z-index: 1;
}

/* Offset y dimensiones para el icono de Cámara (Sesiones) */
.jj-badge-camara {
  top: -20px;
  right: -14px;
  width: 38px;
  height: 38px;
}

/* Offset y dimensiones para el icono de Cita (Ventas) */
.jj-badge-cita {
  top: -22px;
  right: -16px;
  width: 42px;
  height: 42px;
}

.jj-event-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  position: relative;
  z-index: 2;
}

.jj-event-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.jj-event-avatar {
  flex-shrink: 0;
}

.jj-event-header-titles {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  line-height: 1.15;
}

.jj-event-time {
  font-size: 0.82rem;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.3px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.jj-event-photographer {
  font-size: 0.76rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.95);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.jj-event-unassigned {
  color: rgba(255, 255, 255, 0.65);
  font-style: italic;
}

.jj-event-delete-wrapper {
  position: relative;
  z-index: 10;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  margin-top: 10px;
}

.jj-event-trash-btn {
  position: relative;
  z-index: 10;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.95);
  cursor: pointer;
  padding: 3px 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  line-height: 1;
}

.jj-event-trash-btn:hover {
  background: #f56c6c;
  border-color: #f56c6c;
  color: #ffffff;
  transform: scale(1.1);
}

.jj-event-divider {
  border-bottom: 1px dashed rgba(255, 255, 255, 0.35);
  margin: 5px 0 4px 0;
}

.jj-event-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.jj-event-room {
  font-size: 0.74rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.jj-event-client {
  font-size: 0.78rem;
  font-weight: 600;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.jj-event-pax {
  font-size: 0.72rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 1px;
}
</style>
