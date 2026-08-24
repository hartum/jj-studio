<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import AdminDashboard from './dashboards/AdminDashboard.vue'
import GerenteDashboard from './dashboards/GerenteDashboard.vue'
import SupervisorDashboard from './dashboards/SupervisorDashboard.vue'
import FotografoDashboard from './dashboards/FotografoDashboard.vue'
import AgendadorDashboard from './dashboards/AgendadorDashboard.vue'
import ContableDashboard from './dashboards/ContableDashboard.vue'

const authStore = useAuthStore()
const currentUser = computed(() => authStore.user)
const userRole = computed(() => currentUser.value?.roleCode?.toUpperCase() || '')
</script>

<template>
  <div class="inicio-container">
    <!-- CABECERA PRINCIPAL -->
    <div class="welcome-banner">
      <div class="banner-overlay"></div>
      <div class="welcome-text">
        <h1 class="welcome-title">¡Hola, {{ currentUser?.nombre }}!</h1>
        <p class="welcome-subtitle">
          Bienvenido a tu panel de control personalizado de <strong>JJ Studio</strong>. Perfil:
          <el-tag effect="dark" type="primary" size="large" class="role-badge">
            {{ currentUser?.roleName }}
          </el-tag>
        </p>
      </div>
    </div>

    <!-- Dashboard por rol -->
    <AdminDashboard v-if="userRole === 'SUPERUSUARIO' || userRole === 'ADMIN'" />
    <GerenteDashboard v-else-if="userRole === 'GERENTE'" />
    <SupervisorDashboard v-else-if="userRole === 'SUPERVISOR'" />
    <FotografoDashboard v-else-if="userRole === 'FOTOGRAFO'" />
    <AgendadorDashboard v-else-if="userRole === 'AGENDADOR'" />
    <ContableDashboard v-else-if="userRole === 'CONTABLE'" />
  </div>
</template>

<style scoped>
.inicio-container {
  padding: 1.5rem;
}

/* BANNER DE BIENVENIDA */
.welcome-banner {
  position: relative;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border-radius: 12px;
  padding: 2rem 2.5rem;
  margin-bottom: 2rem;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.15);
}

.banner-overlay {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background-image: radial-gradient(
    circle at 80% 20%,
    rgba(64, 158, 255, 0.15) 0%,
    transparent 50%
  );
  pointer-events: none;
}

.welcome-text {
  position: relative;
  z-index: 1;
}

.welcome-title {
  font-size: 2.2rem;
  font-weight: 800;
  color: #ffffff;
  margin: 0 0 0.5rem 0;
  letter-spacing: -0.025em;
}

.welcome-subtitle {
  font-size: 1rem;
  color: #94a3b8;
  margin: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.role-badge {
  font-weight: 700;
  letter-spacing: 0.05em;
}
</style>

<style>
/* ========================================
   ESTILOS GLOBALES COMPARTIDOS POR DASHBOARDS
   (no scoped para que los hereden los hijos)
   ======================================== */

/* SECCIONES Y CONTROLES */
.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.section-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
  margin: 0;
}

.subsection-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
  margin: 1.5rem 0 1rem 0;
}

.controls-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: nowrap;
}

@media (max-width: 640px) {
  .controls-bar {
    flex-wrap: wrap;
  }
}

.goals-summary-block {
  margin-bottom: 1.5rem;
}

/* TABLA PROGRESO CELDA */
.table-progress-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.table-progress-cell .el-progress {
  flex: 1;
}

.progress-pct-label {
  font-size: 0.75rem;
  font-weight: 700;
  min-width: 40px;
  color: var(--heading-color, #0f172a);
}

.stats-row {
  margin-bottom: 1.5rem;
}

.dashboard-card {
  border-radius: 10px;
  border: 1px solid var(--el-border-color-light, #e4e7ed);
  background-color: var(--el-bg-color-overlay, #ffffff);
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.01);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  margin-bottom: 1rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  }
}

.mb-4 {
  margin-bottom: 1.5rem;
}

.mt-4 {
  margin-top: 1.5rem;
}

.mt-3 {
  margin-top: 1rem;
}

.ml-1 {
  margin-left: 0.25rem;
}

/* TARJETAS DE ESTADÍSTICAS RÁPIDAS */
.stat-card .el-card__body {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.25rem;
}

.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: #ffffff;
  flex-shrink: 0;
}

.bg-primary {
  background-color: #409eff;
}
.bg-warning {
  background-color: #e6a23c;
}
.bg-success {
  background-color: #67c23a;
}
.bg-info {
  background-color: #909399;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.stat-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--nav-link-color, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
}

.stat-value small {
  font-size: 0.9rem;
  font-weight: 400;
  color: var(--nav-link-color, #64748b);
}

.quick-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.25rem;
}

/* FOTÓGRAFO GRID */
.hotel-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.hotel-title-area {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.hotel-header-icon {
  color: #409eff;
}

.hotel-name {
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--heading-color, #0f172a);
}

.instructions-header {
  display: flex;
  align-items: center;
}

.instructions-title-area {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.instructions-icon {
  color: #409eff;
  font-size: 1.15rem;
}

.instructions-name {
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--heading-color, #0f172a);
}

.info-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--nav-link-color, #64748b);
  margin-bottom: 0.4rem;
}

.contact-box {
  margin-top: 0.75rem;
  padding: 0.65rem;
  background-color: var(--app-bg, #f8fafc);
  border-radius: 6px;
  font-size: 0.8rem;
}

.contact-title {
  font-weight: 600;
  color: var(--heading-color, #0f172a);
}

.contact-name {
  margin: 0.2rem 0;
  font-weight: 500;
}

.contact-links {
  display: flex;
  gap: 1rem;
  color: var(--nav-link-color, #64748b);
}

.instructions-list {
  padding-left: 1.25rem;
  font-size: 0.85rem;
  color: var(--nav-link-color, #475569);
  line-height: 1.6;
}

.hotel-sub-info {
  font-size: 0.8rem;
}

.hotel-work-body {
  padding: 0.25rem 0;
}

.work-block-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  margin-bottom: 0.5em;
}

.work-icon {
  font-size: 1.1rem;
}

.work-block-title {
  color: var(--heading-color, #0f172a);
}

.work-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.work-item-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 0.75rem 1.25rem;
  background-color: var(--app-bg, #f8fafc);
  border-radius: 8px;
  font-size: 0.85rem;
  border: 1px solid var(--el-border-color-lighter, #f1f5f9);
  gap: 1.25rem;
}

.work-time-badge {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: #3b82f6;
  font-size: 0.85rem;
}

.client-name {
  color: var(--heading-color, #0f172a);
}

.room-tag {
  background-color: rgba(59, 130, 246, 0.1);
  color: #2563eb;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.work-empty-hint {
  font-size: 0.82rem;
  padding-left: 1.6rem;
}

.work-block-divider {
  height: 1px;
  background-color: var(--el-border-color-lighter, #f1f5f9);
  margin: 0.85rem 0;
}

.text-muted {
  color: #94a3b8;
}

.text-success {
  color: #10b981;
}

.text-warning {
  color: #e6a23c;
}

.text-primary {
  color: #3b82f6;
}
.font-semibold {
  font-weight: 600;
}
.font-bold {
  font-weight: 700;
}

.btn-agenda-hotel {
  font-weight: 600;
}

.stat-box-comm {
  background: var(--app-bg, #f8fafc);
  padding: 1rem 1.25rem;
  border-radius: 10px;
  border: 1px solid var(--border-color, #e2e8f0);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-box-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted, #64748b);
}

.stat-box-val {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--heading-color, #0f172a);
}

.commission-banner-card {
  border-left: 4px solid #10b981;
}

.commission-banner-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.commission-banner-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.comm-icon-wrapper {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  font-size: 1.8rem;
  padding: 0.75rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.comm-card-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-muted, #64748b);
}

.comm-card-amount {
  font-size: 1.75rem;
  font-weight: 800;
  line-height: 1.2;
}

.comm-card-hint {
  font-size: 0.8rem;
  color: var(--text-muted, #64748b);
  margin-top: 0.2rem;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.commission-banner-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.stat-pill {
  background: var(--app-bg, #f8fafc);
  padding: 0.4rem 0.85rem;
  border-radius: 20px;
  font-size: 0.85rem;
  border: 1px solid var(--border-color, #e2e8f0);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pill-label {
  color: var(--text-muted, #64748b);
}

.pill-val {
  font-weight: 700;
  color: var(--heading-color, #0f172a);
}

@media (max-width: 768px) {
  .photographer-header-row {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .photographer-controls,
  .btn-agenda-hotel {
    width: 100%;
  }

  .work-item-row {
    flex-direction: column;
    align-items: flex-start;
    padding: 0.85rem 1rem;
    gap: 0.35rem;
  }
}
</style>
