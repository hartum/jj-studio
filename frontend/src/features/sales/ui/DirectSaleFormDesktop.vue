<script setup lang="ts">
import { ref, computed } from 'vue'
import type { DirectSaleFormContext } from '../composables/useDirectSaleForm'
import { ArrowLeft, Check, Close, Plus, Delete, User, Money } from '@element-plus/icons-vue'
import { Building2, Zap, ChevronDown } from '@lucide/vue'
import { getUserInitials, getUserBgColor } from '@/features/users/utils/user-avatar'
import iconoVentaDirecta from '@/assets/icono_venta_directa.png'

const props = defineProps<{
  form: DirectSaleFormContext
}>()

const {
  formData,
  isSaving,
  userHotels,
  sellers,
  selectedSeller,
  modoCobroOptions,
  totalCalculado,
  canAddPago,
  addPago,
  removePago,
  isSubmitDisabled,
  handleGoBack,
  handleSave,
  t,
} = props.form

const showSellersList = ref(false)

function toggleSellersList() {
  showSellersList.value = !showSellersList.value
}

function selectSeller(sellerId: string) {
  formData.value.vendedorId = sellerId
  showSellersList.value = false
}

const isSellerPhotographer = computed(() => {
  if (!selectedSeller.value) return false
  return !!selectedSeller.value.color
})

function getRoleTagType(role?: string): 'success' | 'primary' | 'warning' | 'info' {
  switch (role?.toUpperCase()) {
    case 'FOTOGRAFO':
      return 'success'
    case 'AGENDADOR':
      return 'primary'
    case 'SUPERVISOR':
      return 'warning'
    default:
      return 'info'
  }
}
</script>

<template>
  <div class="direct-sale-desktop-page">
    <!-- 1. Cabecera Estándar (.page-header) -->
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" circle class="back-circle-btn" @click="handleGoBack" />
        <div class="header-title-box">
          <div class="title-with-icon">
            <img :src="iconoVentaDirecta" alt="Venta Directa" class="header-type-icon" />
            <h1 class="page-title">{{ t('sales.directSaleTitle') }}</h1>
          </div>
          <p class="page-subtitle">
            {{ t('sales.directSaleSubtitle') }}
          </p>
        </div>
      </div>
    </div>

    <!-- 2. Contenedor Unificado Clean Minimalist -->
    <div class="form-container-card">
      <div class="form-grid">
        <!-- Columna Izquierda: Información General & Vendedor -->
        <div class="form-col left-col">
          <div class="section-header">
            <el-icon :size="20" class="section-icon"><Building2 /></el-icon>
            <h2 class="section-title">{{ t('sales.directSaleGeneralInfo') }}</h2>
          </div>

          <!-- Selector de Hotel (si tiene varios) o display (si tiene 1) -->
          <div class="form-field">
            <label class="field-label">
              {{ t('sales.hotel') }}
              <span class="required-star">*</span>
            </label>
            <el-select
              v-if="userHotels.length > 1"
              v-model="formData.hotelId"
              size="large"
              class="w-full"
              filterable
              placeholder="Seleccionar hotel"
            >
              <el-option v-for="h in userHotels" :key="h.id" :label="h.nombre" :value="h.id" />
            </el-select>
            <div v-else class="read-only-box">
              <el-icon :size="18"><Building2 /></el-icon>
              <span class="box-text">{{ userHotels[0]?.nombre || 'Sin hotel asignado' }}</span>
            </div>
          </div>

          <!-- Selector de Vendedor Estilo Card (Idéntico a Cita de Venta) -->
          <div class="form-field">
            <label class="field-label">
              {{ t('sales.seller') }}
              <span class="required-star">*</span>
            </label>

            <div
              class="desktop-seller-selector-card"
              :class="{ 'is-seller-colored': isSellerPhotographer }"
              :style="
                isSellerPhotographer
                  ? { backgroundColor: getUserBgColor(selectedSeller?.color) || '#8b5cf6' }
                  : {}
              "
            >
              <div class="seller-card-main">
                <div class="seller-avatar-circle">
                  <el-avatar
                    v-if="selectedSeller"
                    :src="selectedSeller.avatar || undefined"
                    :size="44"
                    :style="{
                      backgroundColor: isSellerPhotographer
                        ? 'rgba(255, 255, 255, 0.25)'
                        : getUserBgColor(selectedSeller.color),
                      color: '#ffffff',
                      fontWeight: '600',
                      fontSize: '13px',
                    }"
                    :class="
                      isSellerPhotographer ? 'seller-header-avatar-colored' : 'seller-header-avatar'
                    "
                  >
                    {{ getUserInitials(selectedSeller.nombre) }}
                  </el-avatar>
                  <div v-else class="seller-default-circle">
                    <el-icon :size="22"><User /></el-icon>
                  </div>
                </div>
                <div class="seller-info-box">
                  <span
                    class="seller-subtitle-label"
                    :class="{ 'text-white-subtle': isSellerPhotographer }"
                  >
                    {{ t('sales.steps.seller') }}
                  </span>
                  <span class="seller-title-label" :class="{ 'text-white': isSellerPhotographer }">
                    {{
                      selectedSeller ? selectedSeller.nombre : t('sales.sellerPicker.selectSeller')
                    }}
                  </span>
                </div>
              </div>

              <!-- Barra toggle VER VENDEDORES -->
              <div
                class="seller-toggle-bar"
                :class="{ 'is-open': showSellersList, 'is-selected-toggle': isSellerPhotographer }"
                role="button"
                tabindex="0"
                @click="toggleSellersList"
              >
                <span class="toggle-text">
                  {{
                    showSellersList
                      ? t('sales.sellerPicker.hideSellers')
                      : t('sales.sellerPicker.viewSellers')
                  }}
                </span>
                <el-icon class="toggle-icon" :class="{ 'is-rotated': showSellersList }">
                  <ChevronDown :size="18" />
                </el-icon>
              </div>

              <!-- Lista colapsable de vendedores -->
              <el-collapse-transition>
                <div v-if="showSellersList" class="seller-dropdown-container">
                  <div v-if="sellers.length === 0" class="seller-empty-state">
                    {{ t('sales.sellerPicker.noSellersInHotel') }}
                  </div>
                  <div v-else class="seller-dropdown-list">
                    <div
                      v-for="seller in sellers"
                      :key="seller.id"
                      class="seller-pick-item"
                      :class="{
                        'is-selected': String(formData.vendedorId) === String(seller.id),
                      }"
                      @click="selectSeller(seller.id)"
                    >
                      <div class="pick-item-left">
                        <el-avatar
                          :src="seller.avatar || undefined"
                          :size="36"
                          :style="{
                            backgroundColor: getUserBgColor(seller.color),
                            color: '#ffffff',
                            fontWeight: '600',
                            fontSize: '11px',
                          }"
                          class="pick-seller-avatar"
                        >
                          {{ getUserInitials(seller.nombre) }}
                        </el-avatar>

                        <div class="pick-item-info">
                          <div class="pick-item-client">{{ seller.nombre }}</div>
                          <div class="pick-item-meta">
                            <el-tag
                              size="small"
                              :type="getRoleTagType(seller.role)"
                              effect="light"
                              class="seller-role-tag"
                            >
                              {{ seller.role }}
                            </el-tag>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </el-collapse-transition>
            </div>
          </div>

          <!-- Notas Adicionales -->
          <div class="form-field">
            <label class="field-label">{{ t('sales.notes') }}</label>
            <el-input
              v-model="formData.notas"
              type="textarea"
              :rows="4"
              placeholder="Detalles sobre las fotos seleccionadas, huésped o transacción (opcional)..."
              resize="none"
            />
          </div>
        </div>

        <!-- Columna Derecha: Fotos Vendidas, Cobros y Total (Idéntico a Cita de Venta) -->
        <div class="form-col right-col">
          <div class="section-header">
            <el-icon :size="20" class="section-icon"><Money /></el-icon>
            <h2 class="section-title">{{ t('sales.paymentBreakdown') }}</h2>
          </div>

          <!-- Input de Fotos Vendidas (Mismo aspecto y tamaño 50% que en Cita de Venta) -->
          <div class="sales-inputs-row">
            <div class="form-field">
              <label class="field-label">
                {{ t('sales.form.photosSoldRequired') }}
              </label>
              <el-input-number
                v-model="formData.numFotosVendidas"
                :min="0"
                :step="1"
                style="width: 100%"
                placeholder="0"
              />
            </div>
          </div>

          <!-- Desglose de Métodos de Pago (Idéntico a Cita de Venta) -->
          <div class="main-payment-breakdown-section">
            <div class="main-payment-breakdown-header">
              <span class="main-payment-breakdown-title">
                {{ t('sales.steps.paymentBreakdown') }}
              </span>
            </div>

            <div class="payment-lines-list">
              <div v-for="(pago, index) in formData.pagos" :key="index" class="payment-line-row">
                <el-select
                  v-model="pago.metodoPago"
                  :placeholder="t('sales.form.paymentMethod')"
                  style="flex: 1.15"
                >
                  <el-option
                    v-for="opt in modoCobroOptions"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                  />
                </el-select>

                <el-input-number
                  v-model="pago.importeUsd"
                  :min="0"
                  :step="1"
                  :precision="2"
                  :placeholder="t('sales.form.paymentAmount')"
                  style="flex: 1"
                >
                  <template #suffix>
                    <span>$</span>
                  </template>
                </el-input-number>

                <el-button
                  v-if="formData.pagos.length > 1"
                  type="danger"
                  link
                  :icon="Delete"
                  :title="t('sales.form.removePayment')"
                  class="remove-pago-btn"
                  @click="removePago(index)"
                />
              </div>

              <div class="payment-actions-col">
                <el-button
                  v-if="canAddPago"
                  type="primary"
                  plain
                  size="default"
                  :icon="Plus"
                  class="add-pago-btn"
                  @click="addPago"
                >
                  {{ t('sales.form.addPaymentMethod') }}
                </el-button>
                <span class="max-payments-hint">{{ formData.pagos.length }}/4 métodos</span>
              </div>
            </div>
          </div>

          <!-- Data-First: Total Gigante Verde (Idéntico a Cita de Venta) -->
          <div class="total-kpi-card">
            <div class="kpi-label-box">
              <span class="kpi-label">{{ t('sales.totalSale') }}</span>
              <el-tag size="small" type="success" effect="plain" class="currency-tag">USD</el-tag>
            </div>
            <div class="kpi-value-row">
              <span class="kpi-currency-symbol">$</span>
              <span class="kpi-amount">{{ totalCalculado.toFixed(2) }}</span>
            </div>
            <div class="kpi-footer">
              <el-icon class="kpi-check-icon"><Zap /></el-icon>
              <span>{{ t('sales.directSaleCommissionsNotice') }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Acciones Inferiores -->
      <div class="form-actions-footer">
        <el-button
          type="primary"
          size="large"
          :loading="isSaving"
          :disabled="isSubmitDisabled"
          class="save-btn"
          @click="handleSave"
        >
          <el-icon><Check /></el-icon>
          <span>Guardar</span>
        </el-button>
        <el-button size="large" :icon="Close" class="cancel-btn" @click="handleGoBack">
          {{ t('sales.actions.cancel') }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.direct-sale-desktop-page {
  padding: 1.5rem 2rem 3rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

/* Page Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1.5rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.back-circle-btn {
  border-color: var(--toolbar-border, #e2e8f0);
  background: var(--toolbar-bg, #ffffff);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  font-size: 1.1rem;
}

.header-title-box {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.title-with-icon {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-type-icon {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.page-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
  margin: 0;
  line-height: 1.2;
}

.page-subtitle {
  font-size: 0.9rem;
  color: var(--nav-link-color, #64748b);
  margin: 0;
}

.form-actions-footer {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--toolbar-border, #e2e8f0);
}

/* Form Container Card */
.form-container-card {
  background: var(--toolbar-bg, #ffffff);
  border: 1px solid var(--toolbar-border, #e2e8f0);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
}

.form-col {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px dashed var(--toolbar-border, #e2e8f0);
  margin-bottom: 0.5rem;
}

.section-icon {
  color: var(--el-color-primary, #409eff);
}

.section-title {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--heading-color, #0f172a);
  margin: 0;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field-label {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--heading-color, #0f172a);
}

.required-star {
  color: #f56c6c;
}

.w-full {
  width: 100%;
}

.read-only-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background-color: var(--app-bg, #f8fafc);
  border: 1px solid var(--toolbar-border, #e2e8f0);
  border-radius: 8px;
  color: var(--heading-color, #0f172a);
  font-weight: 600;
}

/* Card Selector de Vendedores (Idéntico a Cita de Venta) */
.desktop-seller-selector-card {
  background: var(--toolbar-bg, #ffffff);
  border: 1px solid var(--toolbar-border, #e2e8f0);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  transition:
    background-color 0.25s ease,
    box-shadow 0.25s ease;
}

.desktop-seller-selector-card.is-seller-colored {
  border: none;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
  color: #ffffff;
}

.seller-card-main {
  padding: 0.95rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.seller-avatar-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.seller-default-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(59, 130, 246, 0.25);
  color: #3b82f6;
  display: flex;
  align-items: center;
  justify-content: center;
}

.seller-header-avatar {
  border: 1px solid var(--toolbar-border, #e2e8f0);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.seller-header-avatar-colored {
  border: 2px solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.seller-info-box {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.seller-subtitle-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--nav-link-color, #64748b);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.seller-subtitle-label.text-white-subtle {
  color: rgba(255, 255, 255, 0.88) !important;
}

.seller-title-label {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
  margin-top: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.seller-title-label.text-white {
  color: #ffffff !important;
}

.seller-toggle-bar {
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--toolbar-border, #f1f5f9);
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  background: var(--toolbar-bg, #ffffff);
  transition: background 0.15s ease;
}

.seller-toggle-bar:active {
  background: var(--el-fill-color-light, #f8fafc);
}

.seller-toggle-bar.is-selected-toggle {
  background: rgba(0, 0, 0, 0.1);
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.seller-toggle-bar.is-selected-toggle .toggle-text,
.seller-toggle-bar.is-selected-toggle .toggle-icon {
  color: rgba(255, 255, 255, 0.92);
}

.toggle-text {
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.toggle-icon {
  color: #64748b;
  font-size: 1.05rem;
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.toggle-icon.is-rotated {
  transform: rotate(180deg);
}

.seller-dropdown-container {
  padding: 0.5rem 1rem 1rem 1rem;
  border-top: 1px dashed var(--toolbar-border, #e2e8f0);
  background: var(--toolbar-bg, #ffffff);
}

.seller-dropdown-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 280px;
  overflow-y: auto;
}

.seller-pick-item {
  padding: 0.65rem 0.75rem;
  border-radius: 10px;
  border: 1px solid var(--toolbar-border, #e2e8f0);
  background: var(--toolbar-bg, #ffffff);
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.seller-pick-item:hover {
  border-color: var(--el-color-primary-light-5, #93c5fd);
}

.seller-pick-item.is-selected {
  border-color: var(--el-color-primary, #3b82f6);
  background: rgba(59, 130, 246, 0.06);
}

.pick-item-left {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
  flex: 1;
}

.pick-seller-avatar {
  flex-shrink: 0;
  border: 1px solid var(--toolbar-border, #e2e8f0);
}

.pick-item-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.pick-item-client {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--heading-color, #0f172a);
}

.pick-item-meta {
  font-size: 0.75rem;
  color: var(--nav-link-color, #64748b);
  margin-top: 2px;
}

.seller-empty-state {
  font-size: 0.85rem;
  color: var(--nav-link-color, #64748b);
  text-align: center;
  padding: 1rem 0;
}

/* Sales Inputs Row (50% de ancho igual que Cita de Venta) */
.sales-inputs-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 0.5rem;
}

.sales-inputs-row :deep(.el-form-item) {
  margin-bottom: 0;
}

/* Payment Breakdown (Idéntico a Cita de Venta) */
.main-payment-breakdown-section {
  margin-top: 0.75rem;
}

.main-payment-breakdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.6rem;
}

.main-payment-breakdown-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
}

.payment-lines-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.payment-line-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.remove-pago-btn {
  padding: 4px;
  font-size: 1.1rem;
}

.payment-actions-col {
  display: flex;
  align-items: center;
  min-height: 32px;
  margin-top: 0.5rem;
}

.add-pago-btn {
  font-size: 0.82rem;
  font-weight: 600;
  padding: 0 12px;
  height: 32px;
}

.max-payments-hint {
  font-size: 0.8rem;
  color: var(--nav-link-color, #64748b);
  margin-left: 0.75rem;
}

/* Data-First: Total KPI Card (Verde) */
.total-kpi-card {
  margin-top: 1.25rem;
  padding: 1.25rem 1.5rem;
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  border: 1.5px solid #a7f3d0;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.kpi-label-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.kpi-label {
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #065f46;
}

.kpi-value-row {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
}

.kpi-currency-symbol {
  font-size: 1.6rem;
  font-weight: 700;
  color: #059669;
}

.kpi-amount {
  font-size: 2.5rem;
  font-weight: 800;
  color: #065f46;
  line-height: 1;
}

.kpi-footer {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: #047857;
  margin-top: 0.25rem;
}

.kpi-check-icon {
  font-size: 1rem;
}

/* Dark Mode Overrides */
html.dark .desktop-seller-selector-card,
html.dark .seller-toggle-bar,
html.dark .seller-dropdown-container {
  background-color: var(--toolbar-bg, #1d1e1f);
  border-color: var(--toolbar-border, #363637);
}

html.dark .seller-pick-item {
  background-color: var(--content-bg, #121212);
  border-color: var(--toolbar-border, #363637);
}
</style>
