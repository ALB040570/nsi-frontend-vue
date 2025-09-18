<template>
  <el-container class="s360-layout">
    <header class="s360-top-bar">
      <div class="s360-top-left">
        <button
          type="button"
          class="s360-toggle"
          :aria-label="toggleAriaLabel"
          @click="toggleAside"
        >
          <el-icon v-if="isAsideCollapsed"><Expand /></el-icon>
          <el-icon v-else><Fold /></el-icon>
        </button>

        <router-link to="/" class="s360-logo">
          <img :src="logoMark" alt="Service 360" class="logo-mark" />
          <span class="logo-text">Service 360</span>
        </router-link>
      </div>

      <div class="s360-top-right">
        <el-dropdown trigger="click" @command="handleLanguageCommand">
          <span class="s360-lang-switcher">
            {{ currentLanguage.code }}
            <el-icon class="lang-arrow"><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-for="lang in languages"
                :key="lang.code"
                :command="lang.code"
              >
                {{ lang.label }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <button type="button" class="s360-icon-btn" aria-label="Уведомления">
          <el-icon><Bell /></el-icon>
        </button>

        <button type="button" class="s360-icon-btn" aria-label="Настройки">
          <el-icon><Setting /></el-icon>
        </button>

        <el-dropdown trigger="click">
          <span class="s360-profile" aria-label="Профиль">
            <el-avatar :size="36" class="s360-profile-avatar">{{ userInitials }}</el-avatar>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item>Войти</el-dropdown-item>
              <el-dropdown-item>Регистрация</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <el-container class="s360-body">
      <el-aside v-show="!isAsideCollapsed" width="240px" class="s360-aside">
        <div class="s360-aside-inner">
          <nav class="s360-nav">
            <router-link to="/" class="nav-item">Главная</router-link>
            <router-link to="/nsi/object-types" class="nav-item">Типы объектов</router-link>
            <router-link to="/nsi/components" class="nav-item">Компоненты</router-link>
          </nav>
        </div>
      </el-aside>

      <el-main class="s360-main">
        <slot />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowDown, Bell, Expand, Fold, Setting } from '@element-plus/icons-vue'
import logoMark from '@/assets/logo.svg'

interface LanguageOption {
  label: string
  code: string
}

const languages: LanguageOption[] = [
  { label: 'Русский', code: 'РУС' },
  { label: 'English', code: 'ENG' },
]

const currentLanguage = ref<LanguageOption>(languages[0])
const isAsideCollapsed = ref(false)
const userInitials = 'KC'

const toggleAriaLabel = computed(() =>
  isAsideCollapsed.value ? 'Открыть левую колонку' : 'Скрыть левую колонку',
)

const toggleAside = () => {
  isAsideCollapsed.value = !isAsideCollapsed.value
}

const handleLanguageCommand = (command: LanguageOption['code']) => {
  const language = languages.find((item) => item.code === command)
  if (language) {
    currentLanguage.value = language
  }
}
</script>

<style scoped>
.s360-layout {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f3f6f6;
}

.s360-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  min-height: 64px;
  background: #ffffff;
  border-bottom: 1px solid #e6eaea;
  box-sizing: border-box;
  gap: 16px;
}

.s360-top-left,
.s360-top-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.s360-top-right {
  gap: 12px;
}

.s360-toggle,
.s360-icon-btn {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: none;
  background: #f5f7f8;
  color: #0f3e44;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
  outline: none;
}

.s360-toggle {
  border: 1px solid #d2dada;
  background: #ffffff;
}

.s360-toggle:hover,
.s360-toggle:focus-visible {
  background: #eef4f5;
  border-color: #c0d4d4;
  color: #006d77;
}

.s360-icon-btn:hover,
.s360-icon-btn:focus-visible {
  background: #e6f2f2;
  color: #006d77;
}

.s360-toggle:focus-visible,
.s360-icon-btn:focus-visible,
.s360-lang-switcher:focus-visible,
.s360-profile:focus-visible {
  outline: 2px solid #006d77;
  outline-offset: 2px;
}

.s360-logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #0f3e44;
  text-decoration: none;
  font-weight: 700;
  font-size: 18px;
}

.s360-logo:hover {
  color: #006d77;
}

.logo-mark {
  width: 34px;
  height: 34px;
}

.logo-text {
  white-space: nowrap;
}

.s360-lang-switcher {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 999px;
  background: #f5f7f8;
  color: #0f3e44;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.s360-lang-switcher:hover {
  background: #e6f2f2;
  color: #006d77;
}

.lang-arrow {
  font-size: 14px;
}

.s360-profile {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.s360-profile-avatar {
  font-weight: 600;
  text-transform: uppercase;
  color: #0f3e44;
  background: #e7f1ff;
}

.s360-body {
  flex: 1 1 auto;
  display: flex;
  min-height: 0;
}

.s360-aside {
  flex: 0 0 240px;
  width: 240px;
  min-height: 100%;
  box-sizing: border-box;
  background: #f7fbfb;
  border-right: 1px solid #e6eaea;
}

.s360-aside-inner {
  padding: 20px 16px;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

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
  transition: background-color 0.2s ease, color 0.2s ease;
}

.nav-item:hover,
.router-link-active.nav-item {
  background: #e6f2f2;
  color: #006d77;
  font-weight: 600;
}

.s360-main {
  flex: 1 1 auto;
  min-width: 0;
  width: auto;
  max-width: none;
  padding: 24px 28px;
  background: #fff;
  overflow: auto;
}

.s360-main .el-table {
  width: 100%;
}
</style>
