<template>
  <header class="nsi-dashboard-cta">
    <div class="nsi-dashboard-cta__top">
      <div class="nsi-dashboard-cta__titles">
        <h1 class="nsi-dashboard-cta__title">{{ title }}</h1>
        <p class="nsi-dashboard-cta__subtitle">{{ subtitle }}</p>
      </div>
      <NTooltip trigger="hover" :disabled="assistantTooltip === ''">
        <template #trigger>
          <label class="nsi-dashboard-cta__assistant" :aria-pressed="assistantEnabled">
            <span class="assistant-label">{{ assistantLabel }}</span>
            <NSwitch
              :value="assistantEnabled"
              size="small"
              :aria-label="assistantLabel"
              @update:value="emitToggle"
            />
          </label>
        </template>
        <span>{{ assistantTooltip }}</span>
      </NTooltip>
    </div>

    <div v-if="assistantEnabled" class="nsi-dashboard-cta__assistant-banner" role="status">
      <strong>{{ assistantBannerTitle }}</strong>
      <span>{{ assistantBannerText }}</span>
    </div>

    <div class="nsi-dashboard-cta__controls">
      <div ref="searchRef" class="nsi-dashboard-cta__search">
        <NInput
          v-model:value="searchQuery"
          class="search-input"
          size="large"
          :placeholder="searchPlaceholder"
          clearable
          @focus="handleFocus"
          @blur="handleBlur"
          @keydown.enter.prevent="handleSubmit"
        >
          <template #prefix>
            <NIcon :component="SearchOutline" />
          </template>
        </NInput>

        <transition name="fade">
          <div v-if="showDropdown" class="search-dropdown" role="listbox">
            <div v-if="searchLoading" class="search-state search-state--loading">
              <NSpin size="small" />
              <span>{{ searchLoadingText }}</span>
            </div>
            <div v-else-if="shouldSuggest">{{ searchTypingHint }}</div>
            <template v-else>
              <button
                v-for="item in searchResults"
                :key="item.id + item.type"
                type="button"
                class="search-result"
                role="option"
                @mousedown.prevent="handleResultSelect(item)"
              >
                <span class="search-result__title">{{ item.title }}</span>
                <span class="search-result__meta">
                  <span class="search-result__type">{{ searchTypes[item.type] }}</span>
                  <span v-if="item.extra" class="search-result__extra">{{ item.extra }}</span>
                </span>
                <span class="search-result__action">{{ searchOpenLabel }}</span>
              </button>
              <div v-if="!searchResults.length" class="search-state">{{ searchEmpty }}</div>
            </template>
          </div>
        </transition>
      </div>

      <div class="nsi-dashboard-cta__actions" role="group" :aria-label="actionsAriaLabel">
        <template v-for="action in actions" :key="action.id">
          <NTooltip placement="bottom">
            <template #trigger>
              <NButton quaternary size="large" class="cta-action" @click="navigate(action.to)">
                {{ action.label }}
              </NButton>
            </template>
            <span>{{ action.tooltip }}</span>
          </NTooltip>
        </template>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter, type RouteLocationRaw } from 'vue-router'
import { NButton, NIcon, NInput, NSpin, NSwitch, NTooltip } from 'naive-ui'
import { SearchOutline } from '@vicons/ionicons5'

import { searchNsi, type NsiSearchResult } from '@/services/nsiDashboard.api'

interface ActionItem {
  id: string
  label: string
  tooltip: string
  to: RouteLocationRaw
}

interface CtaRowProps {
  title: string
  subtitle: string
  actions: ActionItem[]
  assistantEnabled: boolean
  assistantLabel: string
  assistantTooltip: string
  assistantBannerTitle: string
  assistantBannerText: string
  searchPlaceholder: string
  searchTypingHint: string
  searchEmpty: string
  searchLoadingText: string
  searchOpenLabel: string
  searchTypes: Record<string, string>
  actionsAriaLabel: string
}

defineProps<CtaRowProps>()

const emit = defineEmits<{
  (e: 'toggle-assistant', value: boolean): void
  (e: 'select-search', payload: NsiSearchResult): void
}>()

const router = useRouter()

const searchQuery = ref('')
const searchLoading = ref(false)
const searchResults = ref<NsiSearchResult[]>([])
const searchFocused = ref(false)
const searchRef = ref<HTMLElement | null>(null)

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let requestToken = 0

const trimmedQuery = computed(() => searchQuery.value.trim())
const shouldSuggest = computed(() => trimmedQuery.value.length > 0 && trimmedQuery.value.length < 2)

const showDropdown = computed(() => {
  if (!searchFocused.value) return false
  if (searchLoading.value) return true
  if (shouldSuggest.value) return true
  if (trimmedQuery.value.length >= 2) return true
  return false
})

watch(trimmedQuery, (value) => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }

  if (value.length < 2) {
    searchResults.value = []
    searchLoading.value = false
    return
  }

  debounceTimer = setTimeout(() => {
    void runSearch(value)
  }, 250)
})

async function runSearch(query: string) {
  requestToken += 1
  const currentToken = requestToken
  searchLoading.value = true
  try {
    const data = await searchNsi(query)
    if (currentToken === requestToken) {
      searchResults.value = data
    }
  } catch (error) {
    if (currentToken === requestToken) {
      searchResults.value = []
      console.error('Failed to search NSI', error)
    }
  } finally {
    if (currentToken === requestToken) {
      searchLoading.value = false
    }
  }
}

function handleFocus() {
  searchFocused.value = true
}

function handleBlur() {
  setTimeout(() => {
    searchFocused.value = false
  }, 150)
}

function handleSubmit() {
  if (searchResults.value.length > 0) {
    handleResultSelect(searchResults.value[0])
  }
}

function handleResultSelect(item: NsiSearchResult) {
  emit('select-search', item)
  searchQuery.value = ''
  searchResults.value = []
  searchFocused.value = false
}

function emitToggle(value: boolean) {
  emit('toggle-assistant', value)
}

function navigate(target: RouteLocationRaw) {
  void router.push(target)
}

function handleDocumentClick(event: MouseEvent) {
  const root = searchRef.value
  if (!root) return
  if (!root.contains(event.target as Node)) {
    searchFocused.value = false
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleDocumentClick)
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
})
</script>

<style scoped>
.nsi-dashboard-cta {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px 28px;
  background: var(--n-color);
  border-radius: 16px;
  box-shadow: var(--n-box-shadow);
}

.nsi-dashboard-cta__top {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
}

.nsi-dashboard-cta__titles {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nsi-dashboard-cta__title {
  margin: 0;
  font-size: 24px;
  line-height: 32px;
  font-weight: 600;
}

.nsi-dashboard-cta__subtitle {
  margin: 0;
  color: var(--n-text-color-2);
}

.nsi-dashboard-cta__assistant {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: var(--n-text-color);
}

.nsi-dashboard-cta__assistant .assistant-label {
  font-size: 14px;
  font-weight: 500;
}

.nsi-dashboard-cta__assistant-banner {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(24, 160, 88, 0.08);
  color: var(--n-success-color);
  font-size: 14px;
}

.nsi-dashboard-cta__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: stretch;
}

.nsi-dashboard-cta__search {
  position: relative;
  flex: 1 1 320px;
  min-width: 260px;
}

.search-input :deep(.n-input__border) {
  border-radius: 12px;
}

.search-dropdown {
  position: absolute;
  inset: calc(100% + 4px) 0 auto;
  background: var(--n-color);
  border-radius: 12px;
  box-shadow: var(--n-box-shadow);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 10;
  max-height: 320px;
  overflow-y: auto;
}

.search-result {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 10px;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  color: inherit;
}

.search-result:hover,
.search-result:focus {
  background: rgba(51, 112, 255, 0.08);
}

.search-result__title {
  font-weight: 600;
}

.search-result__meta {
  display: flex;
  gap: 8px;
  font-size: 13px;
  color: var(--n-text-color-2);
}

.search-result__type {
  font-weight: 500;
}

.search-result__action {
  font-size: 12px;
  color: var(--n-primary-color);
}

.search-state {
  padding: 8px 0;
  font-size: 13px;
  color: var(--n-text-color-2);
}

.search-state--loading {
  display: flex;
  gap: 8px;
  align-items: center;
}

.nsi-dashboard-cta__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cta-action {
  min-width: 140px;
  justify-content: center;
  border-radius: 12px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .nsi-dashboard-cta {
    padding: 20px;
  }

  .nsi-dashboard-cta__controls {
    flex-direction: column;
  }

  .nsi-dashboard-cta__actions {
    justify-content: stretch;
  }

  .cta-action {
    width: 100%;
  }
}
</style>
