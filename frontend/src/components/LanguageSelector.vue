<script setup lang="ts">
import { useLocale } from '@/i18n/useLocale'

const { locale, setLocale } = useLocale()
</script>

<template>
  <div class="lang-selector-group" role="group" aria-label="Seleccionar idioma">
    <button
      type="button"
      class="lang-pill-btn"
      :class="{ active: locale === 'es' }"
      title="Español"
      aria-label="Español"
      @click="setLocale('es')"
    >
      <span class="flag-icon">🇪🇸</span>
      <span class="lang-code">ES</span>
    </button>
    <button
      type="button"
      class="lang-pill-btn"
      :class="{ active: locale === 'en' }"
      title="English"
      aria-label="English"
      @click="setLocale('en')"
    >
      <span class="flag-icon">🇬🇧</span>
      <span class="lang-code">EN</span>
    </button>
  </div>
</template>

<style scoped>
.lang-selector-group {
  display: inline-flex;
  align-items: center;
  background-color: var(--el-fill-color-light, #f1f5f9);
  border: 1px solid var(--sidebar-border, #e2e8f0);
  border-radius: 20px;
  padding: 2px;
  gap: 2px;
  user-select: none;
}

.lang-pill-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 3px 8px;
  border: none;
  background: transparent;
  border-radius: 16px;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--nav-link-color, #64748b);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  line-height: 1.2;
}

.flag-icon {
  font-size: 0.85rem;
  line-height: 1;
}

.lang-code {
  letter-spacing: 0.5px;
}

.lang-pill-btn:hover:not(.active) {
  color: var(--heading-color, #0f172a);
  background-color: var(--el-fill-color, #e2e8f0);
}

.lang-pill-btn.active {
  background-color: var(--toolbar-bg, #ffffff);
  color: var(--color-primary, #3b82f6);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Dark mode adjustments via variables */
:deep(.dark) .lang-pill-btn.active {
  background-color: var(--sidebar-bg, #1d1e1f);
  color: #60a5fa;
}
</style>
