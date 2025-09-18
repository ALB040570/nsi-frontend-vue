<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import S360Layout from '@/layouts/S360Layout.vue'

const route = useRoute()
const useDefaultLayout = computed(() => route.meta.layout !== 'auth')
</script>

<template>
  <component :is="useDefaultLayout ? S360Layout : 'div'">
    <router-view />
  </component>
</template>

<style scoped></style>
