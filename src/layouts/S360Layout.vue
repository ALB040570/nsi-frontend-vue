<template>
  <el-container class="s360-layout">
    <!-- ЛЕВАЯ КОЛОНКА -->
    <el-aside width="240px" class="s360-aside">
      <div class="s360-logo">Service360</div>

      <nav class="s360-nav">
        <router-link to="/" class="nav-item">Главная</router-link>
        <router-link to="/nsi/object-types" class="nav-item">Типы объектов</router-link>
        <router-link to="/nsi/components" class="nav-item">Компоненты</router-link>
        <!-- добавляй пункты по мере роста проекта -->
      </nav>

      <div v-if="auth.isAuthenticated" class="s360-user">
        <div class="user-details">
          <span class="user-name">{{ userName }}</span>
          <span v-if="userLogin" class="user-login">@{{ userLogin }}</span>
        </div>
        <el-button link type="primary" size="small" @click="handleLogout">Выйти</el-button>
      </div>
    </el-aside>

    <!-- ПРАВАЯ КОЛОНКА -->
    <el-container>
      <el-main class="s360-main">
        <slot />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const userName = computed(() => {
  const user = auth.user
  return (
    (typeof user?.name === 'string' && user.name) ||
    (typeof user?.displayName === 'string' && user.displayName) ||
    (typeof user?.login === 'string' && user.login) ||
    'Пользователь'
  )
})

const userLogin = computed(() => {
  const login = typeof auth.user?.login === 'string' ? auth.user?.login : ''
  return userName.value !== login ? login : ''
})

const handleLogout = async () => {
  await auth.logout()
  router.replace({ name: 'login' })
}
</script>

<style scoped>
.s360-layout {
  height: 100vh;
  width: 100vw;
  display: flex;
  overflow: hidden; /* убираем горизонтальный скролл у каркаса */
}

/* левая колонка */
.s360-aside {
  flex: 0 0 240px;
  width: 240px;
  min-height: 100vh;
  box-sizing: border-box;
  padding: 16px 12px;
  background: #f7fbfb;
  border-right: 1px solid #e6eaea;
  display: flex;
  flex-direction: column;
}

/* логотип/заголовок слева */
.s360-logo {
  font-weight: 700;
  font-size: 18px;
  color: #006d77;
  margin: 4px 8px 16px;
}

/* вертикальная навигация */
.s360-nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.nav-item {
  display: block;
  padding: 10px 12px;
  border-radius: 8px;
  color: #0f3e44;
  text-decoration: none;
}

/* hover + активная ссылка (router добавляет .router-link-active) */
.nav-item:hover,
.router-link-active.nav-item {
  background: #e6f2f2; /* светлый морской */
  color: #006d77;
  font-weight: 600;
}

/* правая колонка (контент) */
.s360-main {
  flex: 1 1 auto;
  min-width: 0;
  width: auto;
  max-width: none;
  padding: 24px 28px;
  background: #fff;
  overflow: auto; /* скролл только внутри контента при необходимости */
}

/* таблица пусть занимает всю доступную ширину */
.s360-main .el-table {
  width: 100%;
}

.s360-user {
  margin-top: auto;
  padding: 16px 12px;
  border-radius: 12px;
  background: rgba(0, 109, 119, 0.08);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: #0f3e44;
}

.user-name {
  font-weight: 600;
}

.user-login {
  font-size: 12px;
  color: #476568;
}
</style>
