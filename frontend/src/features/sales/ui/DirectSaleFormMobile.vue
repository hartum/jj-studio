<script setup lang="ts">
import { ref, computed } from 'vue'
import type { DirectSaleFormContext } from '../composables/useDirectSaleForm'
import {
  ArrowLeft,
  Check,
  Close,
  Plus,
  Delete,
  User,
} from '@element-plus/icons-vue'
import { Zap, ChevronDown } from '@lucide/vue'
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

// Dynamic step numbering based on whether Hotel selector is visible
const stepHotel = computed(() => (userHotels.value.length > 1 ? 1 : null))
const stepSeller = computed(() => (userHotels.value.length > 1 ? 2 : 1))
const stepPhotos = computed(() => (userHotels.value.length > 1 ? 3 : 2))
const stepPayments = computed(() => (userHotels.value.length > 1 ? 4 : 3))
const stepNotes = computed(() => (userHotels.value.length > 1 ? 5 : 4))

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
  <div class="direct-sale-mobile-page">
    <!-- Top Bar -->
    <header class="mobile-top-bar">
      <el-button
        type="default"
        :icon="ArrowLeft"
        circle
        class="mobile-back-btn"
        @click="handleGoBack"
      />
      <div class="mobile-header-title">
        <img :src="iconoVentaDirecta" alt="Venta Directa" class="mobile-title-icon" />
        <h1 class="mobile-title">{{ t('sales.directSaleTitle') }}</h1>
      </div>
      <div class="top-bar-placeholder"></div>
    </header>

    <!-- Main Content -->
    <main class="mobile-content">
      <!-- 1. Hotel Selector (Solo si hay más de 1 hotel) -->
      <section v-if="userHotels.length > 1" class="mobile-section-block">
        <div class="mobile-card-section-label">
          <span class="step-badge-num">{{ stepHotel }}</span>
          <span>{{ t('sales.hotel') }}</span>
        </div>
        <div class="mobile-hotel-selector">
          <el-select
            v-model="formData.hotelId"
            size="large"
            class="w-full"
            placeholder="Seleccionar hotel"
          >
            <el-option
              v-for="h in userHotels"
              :key="h.id"
              :label="h.nombre"
              :value="h.id"
            />
          </el-select>
        </div>
      </section>

      <!-- 2 / 1. Vendedor -->
      <section class="mobile-section-block">
        <div class="mobile-card-section-label">
          <span class="step-badge-num">{{ stepSeller }}</span>
          <span>{{ t('sales.seller') }}</span>
        </div>

        <div
          class="mobile-seller-selector-card"
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
                class="seller-title-label"
                :class="{ 'text-white': isSellerPhotographer }"
              >
                {{
                  selectedSeller
                    ? selectedSeller.nombre
                    : t('sales.sellerPicker.selectSeller')
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
      </section>

      <!-- 3 / 2. Venta (Fotos Vendidas) -->
      <section class="mobile-section-block">
        <div class="mobile-card-section-label">
          <span class="step-badge-num">{{ stepPhotos }}</span>
          <span>{{ t('sales.steps.sale') }}</span>
        </div>

        <div class="mobile-subfield">
          <label class="mobile-subfield-label">{{ t('sales.form.photosSold') }}</label>
          <el-input-number
            v-model="formData.numFotosVendidas"
            :min="0"
            :step="1"
            style="width: 100%"
            placeholder="0"
            size="large"
          />
        </div>
      </section>

      <!-- 4 / 3. Desglose del Pago & Total Verde -->
      <section class="mobile-section-block">
        <div class="mobile-card-section-label">
          <span class="step-badge-num">{{ stepPayments }}</span>
          <span>{{ t('sales.steps.paymentBreakdown') }}</span>
        </div>

        <div class="mobile-payment-lines-list">
          <div
            v-for="(pago, index) in formData.pagos"
            :key="index"
            class="mobile-payment-line-item"
          >
            <div class="mobile-payment-line-inputs">
              <el-select
                v-model="pago.metodoPago"
                :placeholder="t('sales.form.paymentMethod')"
                style="flex: 1.15"
                size="large"
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
                size="large"
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
                class="mobile-remove-pago-btn"
                @click="removePago(index)"
              />
            </div>
          </div>
        </div>

        <div class="mobile-payment-actions-row">
          <el-button
            v-if="canAddPago"
            type="primary"
            link
            :icon="Plus"
            class="mobile-add-pago-btn"
            @click="addPago"
          >
            {{ t('sales.form.addPaymentMethod') }}
          </el-button>
          <span v-else class="mobile-max-pagos-hint">
            {{ t('sales.form.maxPaymentMethodsReached') }}
          </span>
        </div>

        <!-- Total Verde (total_verde.png) -->
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
      </section>

      <!-- 5 / 4. Notas -->
      <section class="mobile-section-block">
        <div class="mobile-card-section-label">
          <span class="step-badge-num">{{ stepNotes }}</span>
          <span>{{ t('sales.steps.notes') }}</span>
        </div>
        <el-input
          v-model="formData.notas"
          type="textarea"
          :rows="4"
          placeholder="Notas sobre la cita de venta..."
          resize="none"
        />
      </section>
    </main>

    <!-- Bottom Sticky Action Bar -->
    <footer class="mobile-bottom-bar">
      <div class="bottom-total-summary">
        <span class="summary-lbl">Total</span>
        <span class="summary-val">${{ totalCalculado.toFixed(2) }}</span>
      </div>
      <div class="bottom-actions-group">
        <el-button
          type="primary"
          size="large"
          :loading="isSaving"
          :disabled="isSubmitDisabled"
          class="mobile-save-btn"
          @click="handleSave"
        >
          <el-icon><Check /></el-icon>
          <span>Guardar</span>
        </el-button>
        <el-button
          size="large"
          :icon="Close"
          class="mobile-cancel-btn"
          @click="handleGoBack"
        >
          Cancelar
        </el-button>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.direct-sale-mobile-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--app-bg, #f8fafc);
  padding-bottom: 90px;
}

/* Mobile Top Bar */
.mobile-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: var(--toolbar-bg, #ffffff);
  border-bottom: 1px solid var(--toolbar-border, #e2e8f0);
  position: sticky;
  top: 0;
  z-index: 10;
}

.mobile-back-btn {
  font-size: 1rem;
}

.mobile-header-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  flex: 1;
  text-align: center;
}

.mobile-title-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
}

.mobile-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
  margin: 0;
}

.top-bar-placeholder {
  width: 32px;
  flex-shrink: 0;
}

/* Content */
.mobile-content {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.mobile-section-block {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.mobile-card-section-label {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: 0.15rem;
}

.step-badge-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--el-color-primary, #3b82f6);
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}

.w-full {
  width: 100%;
}

.mobile-hotel-selector {
  width: 100%;
}

/* Card Selector de Vendedores */
.mobile-seller-selector-card {
  background: var(--toolbar-bg, #ffffff);
  border: 1px solid var(--toolbar-border, #e2e8f0);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  transition:
    background-color 0.25s ease,
    box-shadow 0.25s ease;
}

.mobile-seller-selector-card.is-seller-colored {
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

.seller-title-label {
  font-size: 0.98rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
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
  font-size: 0.88rem;
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

/* Venta (Fotos Vendidas) */
.mobile-subfield {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.mobile-subfield-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--nav-link-color, #64748b);
}

/* Desglose del Pago */
.mobile-payment-lines-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.mobile-payment-line-inputs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.mobile-remove-pago-btn {
  padding: 4px;
}

.mobile-payment-actions-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-top: 0.15rem;
  margin-bottom: 0.5rem;
}

.mobile-add-pago-btn {
  font-weight: 600;
  padding: 0;
  font-size: 0.9rem;
}

.mobile-max-pagos-hint {
  font-size: 0.8rem;
  color: var(--el-text-color-secondary, #909399);
}

/* Total KPI Card Verde (total_verde.png) */
.total-kpi-card {
  padding: 1.25rem 1.35rem;
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  border: 1.5px solid #a7f3d0;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: 0.5rem;
}

.kpi-label-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.kpi-label {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #065f46;
  text-transform: uppercase;
}

.currency-tag {
  font-weight: 700;
  border-color: #a7f3d0;
  color: #059669;
}

.kpi-value-row {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
}

.kpi-currency-symbol {
  font-size: 1.4rem;
  font-weight: 700;
  color: #059669;
}

.kpi-amount {
  font-size: 2.2rem;
  font-weight: 800;
  color: #065f46;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.kpi-footer {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
  color: #047857;
  margin-top: 0.25rem;
}

.kpi-check-icon {
  font-size: 0.95rem;
  color: #059669;
  flex-shrink: 0;
}

/* Bottom Bar */
.mobile-bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: var(--toolbar-bg, #ffffff);
  border-top: 1px solid var(--toolbar-border, #e2e8f0);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  z-index: 20;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
}

.bottom-total-summary {
  display: flex;
  flex-direction: column;
}

.summary-lbl {
  font-size: 0.75rem;
  color: var(--nav-link-color, #64748b);
}

.summary-val {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--heading-color, #0f172a);
}

.bottom-actions-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.mobile-cancel-btn {
  font-weight: 600;
  border-radius: 8px;
  padding: 0 1rem;
}

.mobile-save-btn {
  padding: 0 1.25rem;
  font-weight: 600;
  border-radius: 8px;
}
</style>
