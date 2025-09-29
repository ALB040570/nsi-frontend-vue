<!-- Файл: src/layouts/S360Layout.vue
     Назначение: основной макет интерфейса Service 360 (хедер, навигация, слот контента).
     Использование: импортируйте через @layouts/S360Layout и оборачивайте страницы. -->
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
      <aside
        v-if="showNavigation && !isAsideCollapsed"
        class="s360-aside sider"
        :style="{ width: siderWidth + 'px', flexBasis: siderWidth + 'px' }"
      >
        <div class="s360-aside-inner">
          <nav class="s360-nav">
            <NMenu :options="menuOptions" :value="menuValue" @update:value="handleMenuSelect" />
          </nav>
        </div>
      </aside>

      <div
        v-if="showNavigation && !isAsideCollapsed"
        class="sider-resizer"
        @mousedown="startResize"
        @touchstart="startResize"
      ></div>

      <main class="s360-main">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onBeforeUnmount, ref, watch, type Component as VueComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { DropdownDividerOption, DropdownOption, MenuOption } from 'naive-ui'
import { NAvatar, NDropdown, NIcon, NMenu, NTooltip } from 'naive-ui'
import {
  ChevronDown,
  CloseOutline,
  MenuOutline,
  NotificationsOutline,
  SettingsOutline,
  HomeOutline,
  AlbumsOutline,
  ConstructOutline,
} from '@vicons/ionicons5'

import logoMark from '@/assets/logo.svg'
import { useAuth } from '@features/auth'

interface LanguageOption {
  label: string
  code: string
}

const languages: LanguageOption[] = [
  { label: 'Русский', code: 'ru' },
  { label: 'English', code: 'en' },
]

const currentLanguage = ref<LanguageOption>(languages[0])
const languageOptions = computed<DropdownOption[]>(() =>
  languages.map((item) => ({ label: item.label, key: item.code })),
)

const auth = useAuth()
const router = useRouter()
const route = useRoute()

const renderIcon = (icon: VueComponent) => () => h(NIcon, null, { default: () => h(icon) })

const withTooltip = (text: string) => () =>
  h(
    NTooltip,
    { placement: 'right' },
    {
      trigger: () => h('span', { class: 'menu-title', title: text }, text),
      default: () => text,
    },
  )

const menuRouteByKey: Record<string, string> = {
  dashboard: '/',
  'object-types': '/nsi/object-types',
  components: '/nsi/components',
}

const menuOptions: MenuOption[] = [
  { label: withTooltip('Главная панель'), key: 'dashboard', icon: renderIcon(HomeOutline) },
  {
    label: withTooltip('Справочник типов объектов'),
    key: 'object-types',
    icon: renderIcon(AlbumsOutline),
  },
  { label: withTooltip('Компоненты объектов'), key: 'components', icon: renderIcon(ConstructOutline) },
]

const MIN_W = 200
const MAX_W = 360
const KEY = 's360.sidebar.width'
const startX = ref(0)
const startW = ref(0)
function clamp(n: number) {
  return Math.min(MAX_W, Math.max(MIN_W, n))
}

const initialSiderWidth = clamp(
  typeof window !== 'undefined' ? Number(localStorage.getItem(KEY)) || 240 : 240,
)
const siderWidth = ref<number>(initialSiderWidth)

const handleMouseMove = (event: MouseEvent) => onPointerMove(event)
const handleTouchMove = (event: TouchEvent) => onPointerMove(event)
const handleMouseUp = () => stopResizeTracking()
const handleTouchEnd = () => stopResizeTracking()

function onPointerMove(e: MouseEvent | TouchEvent) {
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  if ('touches' in e && e.cancelable) {
    e.preventDefault()
  }
  siderWidth.value = clamp(startW.value + (clientX - startX.value))
}

function stopResizeTracking() {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  document.removeEventListener('touchmove', handleTouchMove)
  document.removeEventListener('touchend', handleTouchEnd)
  if (typeof window !== 'undefined') {
    localStorage.setItem(KEY, String(siderWidth.value))
  }
}

function startResize(e: MouseEvent | TouchEvent) {
  startX.value = 'touches' in e ? e.touches[0].clientX : e.clientX
  startW.value = siderWidth.value
  if (e.cancelable) {
    e.preventDefault()
  }
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  document.addEventListener('touchmove', handleTouchMove, { passive: false })
  document.addEventListener('touchend', handleTouchEnd)
}

const menuValue = ref<string | null>(null)

const handleMenuSelect = (key: string | number | null) => {
  if (key == null) return
  const normalized = String(key)
  const target = menuRouteByKey[normalized]
  if (!target) return
  if (target !== route.path) {
    void router.push(target)
  }
}

const syncMenuValue = () => {
  const current = route.path
  const match = Object.entries(menuRouteByKey).find(([, path]) => path === current)
  menuValue.value = match ? match[0] : null
}

watch(
  () => route.path,
  () => {
    syncMenuValue()
  },
  { immediate: true },
)

const isAuthenticated = auth.isAuthenticated
const user = auth.user

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

const profileOptions = computed<Array<DropdownOption | DropdownDividerOption>>(() => {
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
      await auth.logout()
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

onBeforeUnmount(() => {
  stopResizeTracking()
})
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
  flex: 0 0 auto;
  width: 240px;
  min-height: 100%;
  box-sizing: border-box;
  background: #f7fbfb;
  border-right: 1px solid #e6eaea;
}

.sider {
  position: relative;
}

.sider-resizer {
  flex: 0 0 6px;
  width: 6px;
  cursor: col-resize;
  background: transparent;
  transition: background 0.15s ease;
  align-self: stretch;
}

.sider-resizer:hover {
  background: rgba(0, 0, 0, 0.06);
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

.s360-nav :deep(.n-menu) {
  border: none;
  background: transparent;
}

.s360-nav :deep(.n-menu-item-content) {
  border-radius: 8px;
  padding: 10px 12px;
  color: #0f3e44;
  overflow: hidden;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.s360-nav :deep(.n-menu-item-content .n-menu-item-content__title) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.s360-nav :deep(.n-menu-item-content:hover),
.s360-nav :deep(.n-menu-item-content--selected) {
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

.menu-title {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .sider-resizer {
    display: none;
  }
}
</style>
