<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import HotelCalendarDesktop from './HotelCalendarDesktop.vue'
import HotelCalendarMobile from './HotelCalendarMobile.vue'

const isMobile = ref(typeof window !== 'undefined' ? window.innerWidth <= 768 : false)

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
  <HotelCalendarMobile v-if="isMobile" />
  <HotelCalendarDesktop v-else />
</template>
