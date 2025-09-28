<!-- Файл: features/components-select/ui/ComponentsSelect.vue
     Назначение: мультиселект компонентов с кнопкой быстрого создания и подтверждением.
     Использование: подключайте в формах через v-model:value и передавайте полный список через :options. -->
<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { NButton, NSelect, useDialog, useMessage } from 'naive-ui'
import type { SelectOption } from 'naive-ui'
import { normalizeText } from '@shared/lib/text'
import { createComponentIfMissing } from '@entities/component/api/repository'

interface ComponentCreatedPayload {
  id: string
  cls: number
  name: string
}

const props = defineProps<{
  value: string[]
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:value', value: string[]): void
  (event: 'blur', event: FocusEvent): void
  (event: 'created', component: ComponentCreatedPayload): void
}>()

const selectRef = ref<InstanceType<typeof NSelect> | null>(null)
const selectVisible = ref(false)
const search = ref('')
const creating = ref(false)

const dialog = useDialog()
const message = useMessage()

const extraOptions = ref<SelectOption[]>([])

const normalized = (value: string) => normalizeText(value ?? '')

watch(
  () => props.options,
  () => {
    const base = props.options ?? []
    extraOptions.value = extraOptions.value.filter((option) => {
      const optionKey = normalized(option.value as string)
      return !base.some((baseOption) => normalized(baseOption.value as string) === optionKey)
    })
  },
  { deep: true },
)

const combinedOptions = computed<SelectOption[]>(() => {
  const map = new Map<string, SelectOption>()
  for (const option of props.options ?? []) {
    const key = normalized(option?.value as string)
    if (!key) continue
    map.set(key, option)
  }
  for (const option of extraOptions.value) {
    const key = normalized(option?.value as string)
    if (!key || map.has(key)) continue
    map.set(key, option)
  }
  return Array.from(map.values()).sort((a, b) =>
    String(a.label).localeCompare(String(b.label), 'ru'),
  )
})

const normalizedOptions = computed(() => {
  const map = new Map<string, SelectOption>()
  for (const option of combinedOptions.value) {
    map.set(normalized(option.value as string), option)
  }
  return map
})

const trimmedQuery = computed(() => search.value.trim())
const normalizedQuery = computed(() => normalized(trimmedQuery.value))

const canCreate = computed(() => {
  if (normalizedQuery.value.length < 2) return false
  return !normalizedOptions.value.has(normalizedQuery.value)
})

watch(selectVisible, (open) => {
  if (!open) search.value = ''
})

const emitValue = (next: string[]) => {
  emit('update:value', Array.from(new Set(next)))
}

const handleUpdateValue = (value: string[]) => {
  emitValue(value)
}

const handleBlur = (event: FocusEvent) => {
  emit('blur', event)
}

const keepFocus = async () => {
  await nextTick()
  selectVisible.value = true
  await nextTick()
  selectRef.value?.focus()
}

const confirmCreate = (name: string) => {
  return new Promise<boolean>((resolve) => {
    let settled = false
    const finish = (value: boolean) => {
      if (settled) return
      settled = true
      resolve(value)
    }

    dialog.warning({
      title: 'Создать компонент',
      content: `Создать компонент «${name}»?`,
      positiveText: 'Создать',
      negativeText: 'Отмена',
      maskClosable: false,
      onPositiveClick: () => finish(true),
      onNegativeClick: () => finish(false),
      onClose: () => finish(false),
    })
  })
}

const handleCreate = async () => {
  if (!canCreate.value || creating.value) return
  const name = trimmedQuery.value
  const ok = await confirmCreate(name)
  if (!ok) return

  creating.value = true
  try {
    const created = await createComponentIfMissing(name)
    const payload: ComponentCreatedPayload = {
      id: String(created.id),
      cls: created.cls,
      name: created.name,
    }
    const option = { label: payload.name, value: payload.name }
    const existsInExtras = extraOptions.value.some(
      (item) => normalized(item.value as string) === normalized(payload.name),
    )
    const existsInProps = (props.options ?? []).some(
      (item) => normalized(item.value as string) === normalized(payload.name),
    )
    if (!existsInExtras && !existsInProps) {
      extraOptions.value = [...extraOptions.value, option]
    }
    emit('created', payload)
    if (!props.value.includes(payload.name)) {
      emitValue([...props.value, payload.name])
    }
    message.success('Компонент создан')
    search.value = ''
    await keepFocus()
  } catch (error) {
    console.error(error)
    message.error('Не удалось создать компонент')
  } finally {
    creating.value = false
  }
}

const handleSearch = (value: string) => {
  search.value = value
}

const inputProps = computed(() => ({
  onKeyup: (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      void handleCreate()
    }
  },
}))
</script>

<template>
  <NSelect
    ref="selectRef"
    :value="value"
    :options="combinedOptions"
    multiple
    filterable
    clearable
    :input-props="inputProps"
    :loading="creating"
    :disabled="disabled"
    :placeholder="placeholder ?? 'Начните вводить, чтобы найти компонент'"
    v-model:show="selectVisible"
    @update:value="handleUpdateValue"
    @search="handleSearch"
    @blur="handleBlur"
  >
    <template v-if="canCreate" #action>
      <div class="select-action">
        <NButton
          type="primary"
          text
          block
          :loading="creating"
          :disabled="creating"
          @click="handleCreate"
        >
          Создать «{{ trimmedQuery }}»
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
