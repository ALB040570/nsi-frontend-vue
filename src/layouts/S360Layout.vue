<!-- Файл: src/layouts/S360Layout.vue
     Назначение: основной макет интерфейса Service 360 (хедер, навигация, слот контента).
     Использование: импортируйте через @layouts/S360Layout и оборачивайте страницы. -->
<template>
  <div class="s360-layout">
    <header class="s360-top-bar">
      <div class="s360-top-left">
        <button
          v-if="showDesktopNavigation"
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
        v-if="showDesktopNavigation && !isAsideCollapsed"
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
        v-if="showDesktopNavigation && !isAsideCollapsed"
        class="sider-resizer"
        @mousedown="startResize"
        @touchstart="startResize"
      ></div>

      <main class="s360-main">
        <slot />
      </main>
    </div>

    <nav v-if="showMobileNavigation" class="s360-bottom-nav" aria-label="Основная навигация">
      <button
        v-for="item in bottomNavItems"
        :key="item.key"
        type="button"
        class="bottom-nav-item"
        :class="{ active: item.isActive }"
        :aria-label="item.label"
        @click="handleMenuSelect(item.key)"
      >
        <NIcon :component="item.icon" />
        <span class="bottom-nav-label">{{ item.mobileLabel }}</span>
      </button>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onBeforeUnmount, onMounted, ref, watch, type Component as VueComponent } from 'vue'
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
  BugOutline,
  OptionsOutline,
  ConstructOutline,
  ClipboardOutline,
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

const withTooltip = (text: string, tooltip?: string) => () =>
  h(
    NTooltip,
    { placement: 'right' },
    {
      trigger: () => h('span', { class: 'menu-title', title: tooltip ?? text }, text),
      default: () => tooltip ?? text,
    },
  )

const menuRouteByKey: Record<string, string> = {
  dashboard: '/',
  'object-types': '/nsi/object-types',
  'object-defects': '/nsi/object-defects',
  'object-parameters': '/nsi/object-parameters',
  works: '/nsi/works',
  components: '/nsi/components',
}

const MENU_ITEMS = [
  {
    key: 'dashboard',
    icon: HomeOutline,
    menuLabel: 'Главная',
    mobileLabel: 'Главная',
    tooltip: 'Главная панель',
  },
  {
    key: 'object-types',
    icon: AlbumsOutline,
    menuLabel: 'Типы',
    mobileLabel: 'Типы',
    tooltip: 'Справочник типов обслуживаемых объектов',
  },
  {
    key: 'object-defects',
    icon: BugOutline,
    menuLabel: 'Дефекты',
    mobileLabel: 'Дефекты',
    tooltip: 'Справочник дефектов обслуживаемых объектов',
  },
  {
    key: 'object-parameters',
    icon: OptionsOutline,
    menuLabel: 'Параметры',
    mobileLabel: 'Параметры',
    tooltip: 'Справочник параметров обслуживаемых объектов',
  },
  {
    key: 'works',
    icon: ClipboardOutline,
    menuLabel: 'Работы',
    mobileLabel: 'Работы',
    tooltip: 'Справочник технологических работ',
  },
  {
    key: 'components',
    icon: ConstructOutline,
    menuLabel: 'Компоненты',
    mobileLabel: 'Компоненты',
    tooltip: 'Справочник компонентов обслуживаемых объектов',
  },
] satisfies Array<{
  key: string
  icon: VueComponent
  menuLabel: string
  mobileLabel: string
  tooltip: string
}>

const menuOptions: MenuOption[] = MENU_ITEMS.map((item) => ({
  label: withTooltip(item.menuLabel, item.tooltip),
  key: item.key,
  icon: renderIcon(item.icon),
}))

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

const showNavigation = computed(() => isAuthenticated.value)

const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)
const updateViewportWidth = () => {
  if (typeof window === 'undefined') return
  viewportWidth.value = window.innerWidth
}

const isMobile = computed(() => viewportWidth.value <= 768)
const showDesktopNavigation = computed(() => showNavigation.value && !isMobile.value)
const showMobileNavigation = computed(() => showNavigation.value && isMobile.value)

const bottomNavItems = computed(() =>
  MENU_ITEMS.map((item) => ({
    key: item.key,
    label: item.tooltip,
    mobileLabel: item.mobileLabel,
    icon: item.icon,
    isActive: menuValue.value === item.key,
  })),
)

const toggleAriaLabel = computed(() =>
  isAsideCollapsed.value ? 'Открыть навигацию' : 'Скрыть навигацию',
)

const toggleAside = () => {
  if (isMobile.value) return
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

onMounted(() => {
  updateViewportWidth()
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateViewportWidth)
  }
})

onBeforeUnmount(() => {
  stopResizeTracking()
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateViewportWidth)
  }
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

.s360-bottom-nav {
  display: none;
}

.bottom-nav-item {
  appearance: none;
}

.bottom-nav-label {
  font-size: 12px;
}

@media (max-width: 900px) {
  .sider-resizer {
    display: none;
  }
}

@media (max-width: 768px) {
  .s360-top-bar {
    min-height: 56px;
    padding: 0 16px;
  }

  .s360-top-left {
    gap: 12px;
  }

  .s360-top-right {
    gap: 8px;
  }

  .s360-lang-switcher,
  .s360-icon-btn {
    display: none;
  }

  .logo-text {
    display: none;
  }

  .s360-body {
    flex-direction: column;
  }

  .s360-main {
    padding: 16px;
    padding-bottom: calc(16px + 72px + env(safe-area-inset-bottom));
  }

  .s360-bottom-nav {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: space-around;
    gap: 8px;
    padding: 8px 12px calc(env(safe-area-inset-bottom) + 12px);
    background: #ffffff;
    border-top: 1px solid #e6eaea;
    box-shadow: 0 -4px 16px rgba(15, 62, 68, 0.12);
    z-index: 1100;
  }

  .bottom-nav-item {
    flex: 1 1 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 6px 4px;
    border-radius: 12px;
    color: #5f7f84;
    background: transparent;
    border: none;
    font-size: 11px;
    font-weight: 600;
    transition:
      color 0.2s ease,
      background-color 0.2s ease;
  }

  .bottom-nav-item.active {
    color: #006d77;
    background: rgba(0, 109, 119, 0.14);
  }

  .bottom-nav-item:focus-visible {
    outline: 2px solid #006d77;
    outline-offset: 2px;
  }

  .bottom-nav-label {
    font-size: 11px;
    line-height: 1;
  }
}
</style>
