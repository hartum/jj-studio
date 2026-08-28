<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useSaleAppointmentForm } from '../composables/useSaleAppointmentForm'
import SaleAppointmentFormDesktop from './SaleAppointmentFormDesktop.vue'
import SaleAppointmentFormMobile from './SaleAppointmentFormMobile.vue'

const form = useSaleAppointmentForm()

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
  <SaleAppointmentFormMobile v-if="isMobile" :form="form" />
  <SaleAppointmentFormDesktop v-else :form="form" />
</template>

<style>
/* Badge indicador de número de citas/sesiones en DatePicker (pseudo-elemento ::after) */
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

.el-date-table td.has-sessions-1 .el-date-table-cell::after { content: '1'; }
.el-date-table td.has-sessions-2 .el-date-table-cell::after { content: '2'; }
.el-date-table td.has-sessions-3 .el-date-table-cell::after { content: '3'; }
.el-date-table td.has-sessions-4 .el-date-table-cell::after { content: '4'; }
.el-date-table td.has-sessions-5 .el-date-table-cell::after { content: '5'; }
.el-date-table td.has-sessions-6 .el-date-table-cell::after { content: '6'; }
.el-date-table td.has-sessions-7 .el-date-table-cell::after { content: '7'; }
.el-date-table td.has-sessions-8 .el-date-table-cell::after { content: '8'; }
.el-date-table td.has-sessions-9 .el-date-table-cell::after { content: '9'; }
.el-date-table td.has-sessions-10 .el-date-table-cell::after { content: '10'; }
.el-date-table td.has-sessions-11 .el-date-table-cell::after { content: '11'; }
.el-date-table td.has-sessions-12 .el-date-table-cell::after { content: '12'; }
.el-date-table td.has-sessions-13 .el-date-table-cell::after { content: '13'; }
.el-date-table td.has-sessions-14 .el-date-table-cell::after { content: '14'; }
.el-date-table td.has-sessions-15 .el-date-table-cell::after { content: '15'; }
.el-date-table td.has-sessions-16 .el-date-table-cell::after { content: '16'; }
.el-date-table td.has-sessions-17 .el-date-table-cell::after { content: '17'; }
.el-date-table td.has-sessions-18 .el-date-table-cell::after { content: '18'; }
.el-date-table td.has-sessions-19 .el-date-table-cell::after { content: '19'; }
.el-date-table td.has-sessions-20 .el-date-table-cell::after { content: '20'; }
.el-date-table td.has-sessions-21 .el-date-table-cell::after { content: '21'; }
.el-date-table td.has-sessions-22 .el-date-table-cell::after { content: '22'; }
.el-date-table td.has-sessions-23 .el-date-table-cell::after { content: '23'; }
.el-date-table td.has-sessions-24 .el-date-table-cell::after { content: '24'; }
.el-date-table td.has-sessions-25 .el-date-table-cell::after { content: '25'; }
.el-date-table td.has-sessions-26 .el-date-table-cell::after { content: '26'; }
.el-date-table td.has-sessions-27 .el-date-table-cell::after { content: '27'; }
.el-date-table td.has-sessions-28 .el-date-table-cell::after { content: '28'; }
.el-date-table td.has-sessions-29 .el-date-table-cell::after { content: '29'; }
.el-date-table td.has-sessions-30 .el-date-table-cell::after { content: '30'; }
.el-date-table td.has-sessions-plus .el-date-table-cell::after { content: '30+'; }
</style>
