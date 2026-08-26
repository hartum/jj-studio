<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { usePhotoSessionForm } from '../composables/usePhotoSessionForm'
import PhotoSessionFormDesktop from './PhotoSessionFormDesktop.vue'
import PhotoSessionFormMobile from './PhotoSessionFormMobile.vue'

const form = usePhotoSessionForm()

const isMobile = ref(false)

function checkMobile() {
  isMobile.value = window.innerWidth <= 768
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<template>
  <PhotoSessionFormMobile v-if="isMobile" :form="form" />
  <PhotoSessionFormDesktop v-else :form="form" />
</template>

<style>
/* Global CSS for DatePickerPanel highlighted absence cells in PhotoSessionForm */
.el-date-table td.cell-highlight-baja .el-date-table-cell {
  background-color: rgba(239, 68, 68, 0.18) !important;
  color: #b91c1c !important;
  font-weight: 700;
}

.el-date-table td.cell-highlight-vacaciones .el-date-table-cell {
  background-color: rgba(59, 130, 246, 0.18) !important;
  color: #1d4ed8 !important;
  font-weight: 700;
}

.el-date-table td.cell-highlight-permiso .el-date-table-cell {
  background-color: rgba(245, 158, 11, 0.2) !important;
  color: #b45309 !important;
  font-weight: 700;
}

.el-date-table td.cell-highlight-otro .el-date-table-cell {
  background-color: rgba(148, 163, 184, 0.2) !important;
  color: #334155 !important;
  font-weight: 700;
}

/* Bordes redondeados solo al principio y al final del rango de ausencia */
.el-date-table td.cell-range-start .el-date-table-cell {
  border-top-left-radius: 14px !important;
  border-bottom-left-radius: 14px !important;
  border-top-right-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
}

.el-date-table td.cell-range-end .el-date-table-cell {
  border-top-right-radius: 14px !important;
  border-bottom-right-radius: 14px !important;
  border-top-left-radius: 0 !important;
  border-bottom-left-radius: 0 !important;
}

.el-date-table td.cell-range-middle .el-date-table-cell {
  border-radius: 0 !important;
}

.el-date-table td.cell-range-single .el-date-table-cell {
  border-radius: 14px !important;
}

html.dark .el-date-table td.cell-highlight-baja .el-date-table-cell {
  background-color: rgba(239, 68, 68, 0.35) !important;
  color: #fca5a5 !important;
}

html.dark .el-date-table td.cell-highlight-vacaciones .el-date-table-cell {
  background-color: rgba(59, 130, 246, 0.35) !important;
  color: #93c5fd !important;
}

html.dark .el-date-table td.cell-highlight-permiso .el-date-table-cell {
  background-color: rgba(245, 158, 11, 0.35) !important;
  color: #fde68a !important;
}

/* Badge indicador de número de sesiones en DatePicker (pseudo-elemento ::after) */
.el-date-table td[class*='has-sessions-'] .el-date-table-cell::after {
  position: absolute;
  top: 1px;
  right: 2px;
  min-width: 15px;
  height: 15px;
  padding: 0 3px;
  border-radius: 999px;
  background-color: #475569;
  color: #ffffff;
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 15px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  z-index: 4;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  pointer-events: none;
  box-sizing: border-box;
}

.el-date-table td.has-sessions-1 .el-date-table-cell::after {
  content: '1';
}
.el-date-table td.has-sessions-2 .el-date-table-cell::after {
  content: '2';
}
.el-date-table td.has-sessions-3 .el-date-table-cell::after {
  content: '3';
}
.el-date-table td.has-sessions-4 .el-date-table-cell::after {
  content: '4';
}
.el-date-table td.has-sessions-5 .el-date-table-cell::after {
  content: '5';
}
.el-date-table td.has-sessions-6 .el-date-table-cell::after {
  content: '6';
}
.el-date-table td.has-sessions-7 .el-date-table-cell::after {
  content: '7';
}
.el-date-table td.has-sessions-8 .el-date-table-cell::after {
  content: '8';
}
.el-date-table td.has-sessions-9 .el-date-table-cell::after {
  content: '9';
}
.el-date-table td.has-sessions-10 .el-date-table-cell::after {
  content: '10';
}
.el-date-table td.has-sessions-11 .el-date-table-cell::after {
  content: '11';
}
.el-date-table td.has-sessions-12 .el-date-table-cell::after {
  content: '12';
}
.el-date-table td.has-sessions-13 .el-date-table-cell::after {
  content: '13';
}
.el-date-table td.has-sessions-14 .el-date-table-cell::after {
  content: '14';
}
.el-date-table td.has-sessions-15 .el-date-table-cell::after {
  content: '15';
}
.el-date-table td.has-sessions-16 .el-date-table-cell::after {
  content: '16';
}
.el-date-table td.has-sessions-17 .el-date-table-cell::after {
  content: '17';
}
.el-date-table td.has-sessions-18 .el-date-table-cell::after {
  content: '18';
}
.el-date-table td.has-sessions-19 .el-date-table-cell::after {
  content: '19';
}
.el-date-table td.has-sessions-20 .el-date-table-cell::after {
  content: '20';
}
.el-date-table td.has-sessions-21 .el-date-table-cell::after {
  content: '21';
}
.el-date-table td.has-sessions-22 .el-date-table-cell::after {
  content: '22';
}
.el-date-table td.has-sessions-23 .el-date-table-cell::after {
  content: '23';
}
.el-date-table td.has-sessions-24 .el-date-table-cell::after {
  content: '24';
}
.el-date-table td.has-sessions-25 .el-date-table-cell::after {
  content: '25';
}
.el-date-table td.has-sessions-26 .el-date-table-cell::after {
  content: '26';
}
.el-date-table td.has-sessions-27 .el-date-table-cell::after {
  content: '27';
}
.el-date-table td.has-sessions-28 .el-date-table-cell::after {
  content: '28';
}
.el-date-table td.has-sessions-29 .el-date-table-cell::after {
  content: '29';
}
.el-date-table td.has-sessions-30 .el-date-table-cell::after {
  content: '30';
}
.el-date-table td.has-sessions-plus .el-date-table-cell::after {
  content: '30+';
}
</style>
