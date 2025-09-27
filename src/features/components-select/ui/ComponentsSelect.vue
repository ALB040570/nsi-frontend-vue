<!-- Файл: features/components-select/ui/ComponentsSelect.vue
     Назначение: мультиселект компонентов с загрузкой через vue-query и созданием нового по Enter.
     Использование: подключать в формах (ObjectTypeForm) через v-model:value для списка названий. -->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NButton, NSelect } from 'naive-ui'
import type { SelectOption } from 'naive-ui'
import { useComponentsOptions } from '../model/useComponentsOptions'
import type { Component } from '@entities/component/model/types'
import { normalizeText } from '@shared/lib/text'

const props = defineProps<{
  value: string[]
  placeholder?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:value', value: string[]): void
  (event: 'blur', event: FocusEvent): void
  (event: 'created', component: Component): void
}>()

const selectVisible = ref(false)
const search = ref('')

const { options, mapByName, isLoading, isFetching, createIfAgreed, creating } = useComponentsOptions()

const mergedLoading = computed(() => isLoading.value || isFetching.value)
const trimmedQuery = computed(() => search.value.trim())
const canCreate = computed(() => {
  const value = trimmedQuery.value
  if (value.length < 2) return false
  return !mapByName.value.has(normalizeText(value))
})

watch(selectVisible, (open) => {
  if (!open) search.value = ''
})

const handleSearch = (value: string) => {
  search.value = value
}

const emitValue = (next: string[]) => {
  emit('update:value', Array.from(new Set(next)))
}

const handleUpdateValue = (value: string[]) => {
  emitValue(value)
}

const handleBlur = (event: FocusEvent) => {
  emit('blur', event)
}

const createFromQuery = async () => {
  if (!canCreate.value || creating.value) return
  const component = await createIfAgreed(trimmedQuery.value)
  if (!component) return
  emit('created', component)
  if (!props.value.includes(component.name)) {
    emitValue([...props.value, component.name])
  }
  search.value = ''
}

const inputProps = computed(() => ({
  onKeyup: (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      void createFromQuery()
    }
  },
}))
</script>

<template>
  <NSelect
    :value="value"
    :options="(options as unknown as SelectOption[])"
    multiple
    filterable
    clearable
    :input-props="inputProps"
    :loading="mergedLoading || creating"
    :disabled="disabled"
    :placeholder="placeholder ?? 'Начните вводить, чтобы найти компонент'"
    v-model:show="selectVisible"
    @update:value="handleUpdateValue"
    @search="handleSearch"
    @blur="handleBlur"
  >
    <template #action>
      <div class="select-action">
        <NButton
          text
          type="primary"
          :loading="creating"
          :disabled="!canCreate || creating"
          @click="createFromQuery"
        >
          Создать «{{ trimmedQuery || '…' }}»
        </NButton>
      </div>
    </template>
    <template #empty>
      <div class="select-empty">Нет совпадений</div>
    </template>
  </NSelect>
</template>

<style scoped>
.select-action {
  padding: 6px 12px;
  border-top: 1px solid var(--n-border-color);
}

.select-empty {
  padding: 8px 12px;
  color: var(--n-text-color-3);
}
</style>
