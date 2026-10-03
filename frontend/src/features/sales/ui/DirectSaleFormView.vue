<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useDirectSaleForm } from '../composables/useDirectSaleForm'
import DirectSaleFormDesktop from './DirectSaleFormDesktop.vue'
import DirectSaleFormMobile from './DirectSaleFormMobile.vue'

const form = useDirectSaleForm()

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
  <DirectSaleFormMobile v-if="isMobile" :form="form" />
  <DirectSaleFormDesktop v-else :form="form" />
</template>
