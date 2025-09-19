<template>
  <section class="login-page">
    <el-card class="login-card" shadow="hover">
      <header class="login-header">
        <h1 class="login-title">Вход в Service 360</h1>
        <p class="login-subtitle">
          Используйте учетные данные вашей организации, чтобы продолжить работу в системе.
        </p>
      </header>

      <el-form class="login-form" label-position="top" @submit.prevent="handleSubmit">
        <el-alert
          v-if="errorMessage"
          class="login-error"
          type="error"
          show-icon
          :closable="false"
          :title="errorMessage"
        />

        <el-form-item label="Логин" :error="fieldErrors.username ?? undefined">
          <el-input
            v-model="form.username"
            placeholder="Введите логин"
            autocomplete="username"
          />
        </el-form-item>

        <el-form-item label="Пароль" :error="fieldErrors.password ?? undefined">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="Введите пароль"
            autocomplete="current-password"
            show-password
          />
        </el-form-item>

        <div class="login-actions">
          <el-button
            class="btn-primary"
            type="primary"
            native-type="submit"
            :loading="isAuthenticating"
            :disabled="isAuthenticating"
          >
            Войти
          </el-button>
        </div>
      </el-form>
    </el-card>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import type { LoginCredentials } from '@/lib/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const { isAuthenticating, error: authError } = storeToRefs(auth)

const form = reactive<LoginCredentials>({ username: '', password: '' })

const fieldErrors = reactive<{ username: string | null; password: string | null }>({
  username: null,
  password: null,
})

const submitError = ref<string | null>(null)
const errorMessage = computed(() => submitError.value ?? authError.value ?? null)

const validate = () => {
  fieldErrors.username = form.username.trim() ? null : 'Введите логин'
  fieldErrors.password = form.password ? null : 'Введите пароль'
  return !fieldErrors.username && !fieldErrors.password
}

watch(() => form.username, (value) => {
  if (value && fieldErrors.username) {
    fieldErrors.username = null
  }
})

watch(() => form.password, (value) => {
  if (value && fieldErrors.password) {
    fieldErrors.password = null
  }
})

watch(
  () => route.query.redirect,
  (val) => {
    const redirect = Array.isArray(val) ? val[0] : val
    auth.setRedirectPath(typeof redirect === 'string' ? redirect : null)
  },
  { immediate: true },
)

const handleSubmit = async () => {
  if (isAuthenticating.value) return

  submitError.value = null
  auth.clearError()

  if (!validate()) {
    submitError.value = 'Проверьте правильность заполнения формы'
    return
  }

  try {
    const res = await auth.login({ ...form })
    if (res?.ok) {
      form.password = ''
      const target = auth.consumeRedirectPath?.() ?? (route.query.redirect as string) ?? '/'
      await router.replace(target)
    }
  } catch (err) {
    submitError.value = err instanceof Error ? err.message : 'Не удалось выполнить вход'
  }
}
</script>

<style scoped>
.login-page {
  width: 100%;
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  box-sizing: border-box;
}

.login-card {
  width: 100%;
  max-width: 420px;
  border-radius: 16px;
  box-shadow: 0 12px 28px rgba(15, 62, 68, 0.12);
}

.login-header {
  margin-bottom: 24px;
  text-align: center;
}

.login-title {
  margin: 0 0 12px;
  font-size: 26px;
  font-weight: 700;
  color: #0f3e44;
}

.login-subtitle {
  margin: 0;
  color: #506266;
  font-size: 14px;
  line-height: 1.5;
}

.login-error {
  margin-bottom: 16px;
}

.login-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

.login-actions .el-button {
  min-width: 120px;
}
</style>
