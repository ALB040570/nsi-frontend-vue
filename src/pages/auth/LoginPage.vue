<template>
  <div class="login-page">
    <el-card class="login-card" shadow="hover">
      <h1 class="login-title">Вход в Service360</h1>
      <p class="login-subtitle">Введите корпоративный логин и пароль, чтобы продолжить работу в системе.</p>

      <el-alert
        v-if="errorMessage"
        :closable="false"
        type="error"
        class="login-alert"
        show-icon
        :title="errorMessage"
      />

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="onSubmit"
      >
        <el-form-item label="Логин" prop="login">
          <el-input
            v-model="form.login"
            placeholder="Введите логин"
            autocomplete="username"
            autofocus
          />
        </el-form-item>
        <el-form-item label="Пароль" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="Введите пароль"
            autocomplete="current-password"
            show-password
          />
        </el-form-item>
        <el-form-item>
          <el-button
            class="btn-primary"
            type="primary"
            native-type="submit"
            :loading="auth.loginPending"
          >
            Войти
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

interface LoginForm {
  login: string
  password: string
}

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const form = reactive<LoginForm>({
  login: '',
  password: '',
})

const formRef = ref<FormInstance>()
const errorMessage = ref<string>('')

const rules: FormRules<LoginForm> = {
  login: [
    { required: true, message: 'Укажите логин', trigger: 'blur' },
    { min: 3, message: 'Минимум 3 символа', trigger: 'blur' },
  ],
  password: [
    { required: true, message: 'Введите пароль', trigger: 'blur' },
    { min: 6, message: 'Минимум 6 символов', trigger: 'blur' },
  ],
}

watch(
  () => auth.error,
  (value) => {
    errorMessage.value = value ?? ''
  },
  { immediate: true },
)

const onSubmit = async () => {
  errorMessage.value = ''
  auth.clearError()

  const instance = formRef.value
  if (!instance) return

  try {
    await instance.validate()
  } catch (validationError) {
    console.warn('Форма заполнена некорректно', validationError)
    return
  }

  try {
    await auth.login({ login: form.login, password: form.password })
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect
      ? route.query.redirect
      : '/'
    await router.replace(redirect)
  } catch (err) {
    errorMessage.value =
      err instanceof Error
        ? err.message
        : 'Не удалось выполнить вход. Повторите попытку позднее.'
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: radial-gradient(circle at top left, rgba(0, 109, 119, 0.12), transparent 55%),
    radial-gradient(circle at bottom right, rgba(42, 157, 143, 0.1), transparent 55%),
    #f5f9f9;
}

.login-card {
  width: 100%;
  max-width: 420px;
  border-radius: 16px;
  box-shadow: 0 16px 32px rgba(15, 62, 68, 0.08);
  border: 1px solid rgba(0, 109, 119, 0.08);
}

.login-title {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 700;
  color: #0f3e44;
}

.login-subtitle {
  margin: 0 0 24px;
  color: #476568;
  font-size: 14px;
}

.login-alert {
  margin-bottom: 18px;
}

:deep(.el-form-item__label) {
  font-weight: 600;
  color: #0f3e44;
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #2a9d8f inset;
}

.btn-primary {
  width: 100%;
  font-weight: 600;
}
</style>
