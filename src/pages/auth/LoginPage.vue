<template>
  <div class="login-page">
    <div class="login-card">
      <h1 class="login-title">Вход в Service 360</h1>
      <form class="login-form" @submit.prevent="handleSubmit">
        <label class="login-field">
          <span class="field-label">Имя пользователя</span>
          <input v-model="username" type="text" name="username" autocomplete="username" required />
        </label>

        <label class="login-field">
          <span class="field-label">Пароль</span>
          <input
            v-model="password"
            type="password"
            name="password"
            autocomplete="current-password"
            required
          />
        </label>

        <button type="submit" class="login-submit" :disabled="isSubmitting">
          <span v-if="isSubmitting">Входим...</span>
          <span v-else>Войти</span>
        </button>
      </form>

      <p class="login-hint">
        После входа вы будете перенаправлены на
        <strong>{{ redirectDescription }}</strong>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { resolveSafeRedirect } from '@/router/safeRedirect'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const isSubmitting = ref(false)

const redirectTarget = computed(() => resolveSafeRedirect(router, route.query.redirect, '/'))

const redirectDescription = computed(() =>
  redirectTarget.value === '/' ? 'главную страницу' : redirectTarget.value,
)

const handleSubmit = async () => {
  if (isSubmitting.value) {
    return
  }

  isSubmitting.value = true
  try {
    authStore.login()
    await router.replace(redirectTarget.value)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100%;
  padding: 48px 16px;
  background: linear-gradient(135deg, #f4f9fb 0%, #e6f2f2 100%);
}

.login-card {
  width: min(420px, 100%);
  background: #ffffff;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 16px 40px rgba(4, 54, 63, 0.08);
  box-sizing: border-box;
}

.login-title {
  margin: 0 0 24px;
  font-size: 24px;
  font-weight: 700;
  color: #0f3e44;
  text-align: center;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.login-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 14px;
  color: #345053;
}

.login-field input {
  border: 1px solid #d2dada;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 15px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.login-field input:focus {
  outline: none;
  border-color: #1b7c85;
  box-shadow: 0 0 0 3px rgba(0, 150, 162, 0.15);
}

.login-submit {
  margin-top: 8px;
  padding: 12px 18px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, #1b7c85, #22a6b3);
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.login-submit:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 22px rgba(30, 120, 128, 0.25);
}

.login-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.login-hint {
  margin-top: 20px;
  font-size: 14px;
  color: #345053;
  text-align: center;
}

.login-hint strong {
  color: #0f3e44;
}
</style>
