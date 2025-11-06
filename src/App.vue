<!-- Файл: src/App.vue
     Назначение: корневой компонент приложения, оборачивает контент в основной лейаут.
     Использование: импортируется в main.ts и монтируется в #app. -->
<script setup lang="ts">
import { onMounted } from 'vue'
import S360Layout from '@layouts/S360Layout.vue'
import { useAuth } from '@features/auth'
const auth = useAuth()
onMounted(async () => {
  if (auth.isAuthenticated.value || auth.isAuthenticating.value) return
  try {
    await auth.fetchMe()
  } catch (error) {
    if (import.meta.env.DEV) {
      console.debug('[app] session restore skipped', error)
    }
  }
})
</script>
<template>
  <S360Layout>
    <router-view />
  </S360Layout>
</template>

<style scoped></style>
