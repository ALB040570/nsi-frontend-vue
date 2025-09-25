<template>
  <div class="s360-layout">
    <header class="s360-top-bar">
      <div class="s360-top-left">
        <button
          v-if="showNavigation"
          type="button"
          class="s360-toggle"
          :aria-label="toggleAriaLabel"
          @click="toggleAside"
        >
          <NIcon v-if="isAsideCollapsed" :component="MenuOutline" />
          <NIcon v-else :component="CloseOutline" />
        </button>

        <router-link to="/" class="s360-logo">
          <img :src="logoMark" alt="Service 360" class="logo-mark" />
          <span class="logo-text">Service 360</span>
        </router-link>
      </div>

      <div class="s360-top-right">
        <NDropdown trigger="click" :options="languageOptions" @select="handleLanguageSelect">
          <span class="s360-lang-switcher">
            {{ currentLanguage.code }}
            <NIcon class="lang-arrow" :component="ChevronDown" />
          </span>
        </NDropdown>

        <button v-if="isAuthenticated" type="button" class="s360-icon-btn" aria-label="Уведомления">
          <NIcon :component="NotificationsOutline" />
        </button>

        <button v-if="isAuthenticated" type="button" class="s360-icon-btn" aria-label="Настройки">
          <NIcon :component="SettingsOutline" />
        </button>

        <NDropdown trigger="click" :options="profileOptions" @select="handleProfileSelect">
          <span class="s360-profile" :aria-label="profileAriaLabel" :title="profileName">
            <NAvatar :size="36" class="s360-profile-avatar">{{ profileInitials }}</NAvatar>
          </span>
        </NDropdown>
      </div>
    </header>

    <div class="s360-body">
      <aside v-if="showNavigation && !isAsideCollapsed" class="s360-aside">
        <div class="s360-aside-inner">
          <nav class="s360-nav">
            <router-link to="/" class="nav-item">Главная панель</router-link>
            <router-link to="/nsi/object-types" class="nav-item">
              Справочник типов объектов
            </router-link>
            <router-link to="/nsi/components" class="nav-item">Компоненты объектов</router-link>
          </nav>
        </div>
      </aside>

      <main class="s360-main">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import type { DropdownDividerOption, DropdownMixedOption } from 'naive-ui'
import { NAvatar, NDropdown, NIcon } from 'naive-ui'
import {
  ChevronDown,
  CloseOutline,
  MenuOutline,
  NotificationsOutline,
  SettingsOutline,
} from '@vicons/ionicons5'

import logoMark from '@/assets/logo.svg'
import { useAuthStore } from '@/stores/auth'

interface LanguageOption {
  label: string
  code: string
}

const languages: LanguageOption[] = [
  { label: 'Русский', code: 'ru' },
  { label: 'English', code: 'en' },
]

const currentLanguage = ref<LanguageOption>(languages[0])
const languageOptions = computed<DropdownMixedOption[]>(() =>
  languages.map((item) => ({ label: item.label, key: item.code })),
)

const auth = useAuthStore()
const router = useRouter()
const { isAuthenticated, user } = storeToRefs(auth)

const isAsideCollapsed = ref(false)

const toggleAriaLabel = computed(() =>
  isAsideCollapsed.value ? 'Открыть навигацию' : 'Скрыть навигацию',
)

const showNavigation = computed(() => isAuthenticated.value)

const toggleAside = () => {
  isAsideCollapsed.value = !isAsideCollapsed.value
}

const handleLanguageSelect = (key: string | number | null) => {
  if (key == null) return
  const normalized = String(key)
  const nextLanguage = languages.find((item) => item.code === normalized)
  if (nextLanguage) {
    currentLanguage.value = nextLanguage
  }
}

const buildInitials = (source: string): string => {
  const words = source
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)

  const letters: string[] = []
  for (const word of words) {
    const firstLetter = word[0]
    if (firstLetter) {
      letters.push(firstLetter)
    }
  }

  if (letters.length === 1) {
    const [firstWord] = words
    if (firstWord) {
      const chars = Array.from(firstWord)
      if (chars.length > 1) {
        letters.push(chars[1])
      }
    }
  }

  const result = letters.slice(0, 2).join('')
  return result ? result.toLocaleUpperCase('ru-RU') : ''
}

const profileName = computed(() => {
  const current = user.value
  if (!current) return 'Гость'

  const fullName = typeof current.fullName === 'string' ? current.fullName.trim() : ''
  const fromParts = [current.lastName, current.firstName]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    .join(' ')
  const shortName = typeof current.name === 'string' ? current.name.trim() : ''
  const email = typeof current.email === 'string' ? current.email.trim() : ''

  return fullName || fromParts || shortName || email || 'Сотрудник'
})

const profileAriaLabel = computed(() => {
  if (!isAuthenticated.value) return 'Меню профиля'
  const name = profileName.value
  return name && name !== 'Сотрудник' ? `Меню профиля: ${name}` : 'Меню профиля'
})

const profileInitials = computed(() => {
  const current = user.value
  if (current) {
    const candidates = [profileName.value, current.email ?? '']
    for (const candidate of candidates) {
      if (typeof candidate === 'string') {
        const initials = buildInitials(candidate)
        if (initials) return initials
      }
    }
  }

  const fallback = buildInitials('Service 360')
  return fallback || 'S3'
})

const PROFILE_NAME_KEY = 'profile-name'
const PROFILE_DIVIDER_KEY = 'profile-divider'

const profileOptions = computed<DropdownMixedOption[]>(() => {
  if (!isAuthenticated.value) {
    return [{ label: 'Войти', key: 'login' }]
  }

  const divider = { type: 'divider', key: PROFILE_DIVIDER_KEY } as DropdownDividerOption
  return [
    {
      label: profileName.value,
      key: PROFILE_NAME_KEY,
      disabled: true,
      props: { class: 's360-profile-name' },
    },
    divider,
    { label: 'Выйти', key: 'logout' },
  ]
})

const handleProfileSelect = async (key: string | number | null) => {
  if (key == null) return
  const normalized = String(key)
  switch (normalized) {
    case PROFILE_NAME_KEY:
    case PROFILE_DIVIDER_KEY:
      return
    case 'logout':
      auth.logout()
      isAsideCollapsed.value = true
      await router.push({ name: 'login' })
      break
    case 'login':
      await router.push({ name: 'login' })
      break
    default:
      break
  }
}

watch(
  isAuthenticated,
  (value) => {
    isAsideCollapsed.value = value ? false : true
  },
  { immediate: true },
)
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
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease;
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
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
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

:deep(.s360-profile-name) {
  font-weight: 600;
  color: #0f3e44;
  opacity: 1;
  cursor: default;
  pointer-events: none;
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
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
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

.s360-main table {
  width: 100%;
}
</style>
