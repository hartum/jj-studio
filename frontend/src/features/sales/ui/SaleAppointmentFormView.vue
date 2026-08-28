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
