<!-- Файл: src/pages/nsi/ObjectDefectsPage.vue
     Назначение: страница CRUD для дефектов обслуживаемых объектов с управлением компонентами и категориями.
     Использование: подключается в маршрутизаторе по пути /nsi/object-defects. -->
<template>
  <section class="object-defects-page">
    <NCard size="small" class="toolbar" content-style="padding: 10px 14px">
      <div class="toolbar__left">
        <h2 class="page-title">
          Справочник «Дефекты обслуживаемых объектов»
          <NButton
            quaternary
            circle
            size="small"
            class="page-title__info"
            aria-label="Справка о справочнике"
            @click="infoOpen = true"
          >
            <template #icon>
              <NIcon><InformationCircleOutline /></NIcon>
            </template>
          </NButton>
        </h2>
        <div class="subtext">
          Ведите перечень дефектов обслуживаемых объектов с указанием категории, компонента, индекса и статуса
        </div>
      </div>

      <div class="toolbar__controls">
        <NInput v-model:value="q" placeholder="Поиск…" clearable round class="toolbar__search" />
        <div class="toolbar__filters">
          <NSelect
            v-model:value="categoryFilter"
            :options="categoryFilterOptions"
            placeholder="Категория"
            clearable
            size="small"
            class="toolbar__select"
          />
          <NSelect
            v-model:value="componentFilter"
            :options="componentFilterOptions"
            placeholder="Компонент объекта"
            clearable
            size="small"
            class="toolbar__select"
          />
        </div>
        <NButton type="primary" @click="openCreate">+ Добавить дефект</NButton>
      </div>
    </NCard>

    <div class="table-area">
      <NDataTable
        v-if="!isMobile"
        class="s360-cards table-full table-stretch"
        :columns="columns"
        :data="rows"
        :loading="tableLoading"
        :row-key="rowKey"
        :bordered="false"
      />

      <div v-else class="cards">
        <article
          v-for="item in rows"
          :key="item.id"
          class="card"
          role="group"
          :aria-label="primaryTitle(item)"
        >
          <header class="card__header">
            <h4 class="card__title">{{ primaryTitle(item) }}</h4>
            <span v-if="statusText(item)" class="badge" :class="statusClass(item)">
              {{ statusText(item) }}
            </span>
          </header>

          <dl class="card__grid">
            <template v-for="(field, fieldIndex) in infoFields" :key="`${item.id}:${field.key || field.label || fieldIndex}`">
              <dt>{{ field.label }}</dt>
              <dd>
                <FieldRenderer :field="field" :row="item" />
              </dd>
            </template>
          </dl>

          <footer v-if="actionsField" class="card__actions">
            <ActionsRenderer :row="item" />
          </footer>
        </article>
      </div>

      <div class="pagination-bar">
        <NPagination
          v-model:page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :item-count="total"
          show-size-picker
          show-quick-jumper
          aria-label="Постраничная навигация по дефектам объектов"
        >
          <template #prefix>
            <span class="pagination-total">Всего: {{ total }}</span>
          </template>
        </NPagination>
      </div>
    </div>

    <NModal
      v-model:show="dialog"
      preset="card"
      :title="editing ? 'Изменить дефект' : 'Создать дефект'"
      style="width: 560px"
    >
      <NForm :model="form" label-width="140px">
        <NFormItem
          label="Название"
          :feedback="errors.name ?? undefined"
          :validation-status="errors.name ? 'error' : undefined"
        >
          <NInput v-model:value="form.name" placeholder="Введите название дефекта" />
          <div v-if="nameWarning" class="warning-text" style="margin-top: 4px">
            {{ nameWarning }}
          </div>
        </NFormItem>

        <NFormItem label="Категория">
          <NSelect
            v-model:value="form.categoryFvId"
            :options="categorySelectOptions"
            placeholder="Выберите категорию"
            clearable
            filterable
            @update:value="handleCategoryChange"
          />
          <div v-if="categoryWarning" class="warning-text" style="margin-top: 4px">
            {{ categoryWarning }}
          </div>
        </NFormItem>

        <NFormItem label="Компонент">
          <NSelect
            v-model:value="form.componentId"
            :options="componentSelectOptions"
            placeholder="Выберите компонент"
            clearable
            filterable
            @update:value="handleComponentChange"
          />
          <div v-if="componentWarning" class="warning-text" style="margin-top: 4px">
            {{ componentWarning }}
          </div>
        </NFormItem>

        <NFormItem label="Индекс">
          <NInput v-model:value="form.index" placeholder="Например, D-01" />
        </NFormItem>

        <NFormItem label="Комментарий / статус">
          <NInput
            v-model:value="form.note"
            type="textarea"
            placeholder="Уточните статус или важные примечания"
            :autosize="{ minRows: 2, maxRows: 5 }"
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <div class="modal-footer">
          <NButton @click="dialog = false">Отмена</NButton>
          <NButton type="primary" class="btn-primary" :loading="saving" @click="save">
            Сохранить
          </NButton>
        </div>
      </template>
    </NModal>

    <NModal
      v-model:show="infoOpen"
      preset="card"
      title="О справочнике"
      style="max-width: 640px; width: 92vw"
    >
      <p>
        Это список дефектов инфраструктурных объектов. Он помогает фиксировать состояние, планировать обслуживание и вести
        аналитику по категориям и компонентам.
      </p>
      <p>
        Чтобы добавить дефект: укажите название, выберите категорию и компонент (при необходимости), задайте индекс и опишите
        статус в комментарии.
      </p>
      <p>
        Редактировать можно только те дефекты, с которыми нет ограничений на стороне подсистем. Вносите изменения внимательно,
        чтобы не потерять связь с категориями и компонентами.
      </p>
      <template #footer>
        <NButton type="primary" @click="infoOpen = false">Понятно</NButton>
      </template>
    </NModal>
  </section>
</template>

<script setup lang="ts">
import {
  computed,
  reactive,
  ref,
  watch,
  watchEffect,
  onMounted,
  onBeforeUnmount,
  h,
  defineComponent,
} from 'vue'

import type { PropType, VNodeChild } from 'vue'

import {
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NIcon,
  NInput,
  NModal,
  NPagination,
  NPopconfirm,
  NSelect,
  NTag,
  useDialog,
  useMessage,
} from 'naive-ui'
import type { DataTableColumn } from 'naive-ui'

import { CreateOutline, TrashOutline, InformationCircleOutline } from '@vicons/ionicons5'

import {
  useObjectDefectsQuery,
  useObjectDefectMutations,
  createDefectComponentLookup,
  createDefectCategoryLookup,
} from '@features/object-defect-crud'
import type {
  DefectCategoryOption,
  DefectComponentOption,
  LoadedObjectDefect,
  ObjectDefectsSnapshot,
} from '@entities/object-defect'
import { getErrorMessage, normalizeText } from '@shared/lib'

const isMobile = ref(false)
if (typeof window !== 'undefined') {
  isMobile.value = window.matchMedia('(max-width: 768px)').matches
}

onMounted(() => {
  if (typeof window === 'undefined') return
  mediaQueryList = window.matchMedia('(max-width: 768px)')
  handleMediaQueryChange(mediaQueryList)
  mediaQueryList.addEventListener('change', handleMediaQueryChange)
})

onBeforeUnmount(() => {
  if (mediaQueryList) {
    mediaQueryList.removeEventListener('change', handleMediaQueryChange)
    mediaQueryList = null
  }
})

interface PaginationState {
  page: number
  pageSize: number
}

interface FetchState {
  isLoading: boolean
  isFetching: boolean
  isError: boolean
  errorMessage: string
}

interface FormState {
  name: string
  componentId: string | null
  componentPvId: string | null
  categoryFvId: string | null
  categoryPvId: string | null
  index: string
  note: string
}

interface FormErrors {
  name?: string
}

interface CardField {
  key: string
  label: string
  render: (row: LoadedObjectDefect) => VNodeChild
  isPrimary?: boolean
  isStatus?: boolean
  isActions?: boolean
}

interface ConfirmDialogOptions {
  title?: string
  content: string
  positiveText?: string
  negativeText?: string
  html?: boolean
}

const message = useMessage()
const discreteDialog = useDialog()
const q = ref('')
const categoryFilter = ref<string | null>(null)
const componentFilter = ref<string | null>(null)
const pagination = reactive<PaginationState>({ page: 1, pageSize: 10 })

let mediaQueryList: MediaQueryList | null = null
const handleMediaQueryChange = (e: MediaQueryList | MediaQueryListEvent) => {
  isMobile.value = 'matches' in e ? e.matches : false
}

const { data: snapshot, isLoading, isFetching, error } = useObjectDefectsQuery()
const snapshotData = computed<ObjectDefectsSnapshot | undefined>(() => snapshot.value ?? undefined)

const fetchState = computed<FetchState>(() => ({
  isLoading: isLoading.value,
  isFetching: isFetching.value,
  isError: Boolean(error.value),
  errorMessage: getErrorMessage(error.value),
}))

const tableLoading = computed(() => fetchState.value.isLoading || fetchState.value.isFetching)

const { create, update, remove } = useObjectDefectMutations()

watch(
  () => fetchState.value.errorMessage,
  (next, prev) => {
    if (next && next !== prev) message.error(next)
  },
)

const defects = computed(() => snapshotData.value?.items ?? [])
const categoryOptions = computed<DefectCategoryOption[]>(() => snapshotData.value?.categories ?? [])
const componentOptions = computed<DefectComponentOption[]>(() => snapshotData.value?.components ?? [])

const componentLookup = computed(() =>
  createDefectComponentLookup(defects.value, componentOptions.value),
)

const categoryLookup = computed(() =>
  createDefectCategoryLookup(defects.value, categoryOptions.value),
)

const categoryFilterOptions = computed(() =>
  categoryOptions.value.map((option) => ({ label: option.name, value: option.fvId })),
)

const componentFilterOptions = computed(() => {
  const values = new Map<string, string>()
  for (const defect of defects.value) {
    const component = defect.componentId?.trim()
    if (!component || component.length > 60) continue
    const key = normalizeText(component)
    if (!key || values.has(key)) continue
    values.set(key, component)
  }
  return Array.from(values.values()).map((label) => ({ label, value: label }))
})

const componentSelectOptions = computed(() =>
  componentOptions.value.map((option) => ({ label: option.name, value: option.id })),
)

const categorySelectOptions = computed(() =>
  categoryOptions.value.map((option) => ({ label: option.name, value: option.fvId })),
)

const filteredRows = computed(() => {
  const search = normalizeText(q.value)
  const selectedCategory = categoryFilter.value
  const selectedComponent = componentFilter.value ? normalizeText(componentFilter.value) : ''

  return defects.value.filter((item) => {
    if (selectedCategory) {
      if (item.categoryFvId !== selectedCategory && item.categoryPvId !== selectedCategory) {
        return false
      }
    }

    if (selectedComponent) {
      const componentName = normalizeText(item.componentName ?? '')
      const componentId = componentName ? '' : normalizeText(item.componentId ?? '')
      const componentKey = componentName || componentId

      if (!componentKey || componentKey !== selectedComponent) {
        return false
      }
    }

    if (!search) return true

    const fields = [item.name, item.categoryName, item.componentName, item.index, item.note]
    return fields.some((field) => normalizeText(field ?? '').includes(search))
  })
})

const total = computed(() => filteredRows.value.length)
const paginatedRows = computed(() => {
  const start = Math.max(0, (pagination.page - 1) * pagination.pageSize)
  return filteredRows.value.slice(start, start + pagination.pageSize)
})
const rows = computed(() => paginatedRows.value || [])
const rowKey = (row: LoadedObjectDefect) => row.id

function renderCategory(row: LoadedObjectDefect): VNodeChild {
  if (!row.categoryName) return '—'
  return h(
    NTag,
    { size: 'small', bordered: false, round: true, type: 'info', class: 'tag-category' },
    { default: () => row.categoryName },
  )
}

function renderComponent(row: LoadedObjectDefect): VNodeChild {
  if (!row.componentName) return '—'
  return h(
    NTag,
    { size: 'small', bordered: true, round: true, class: 'tag-component' },
    { default: () => row.componentName },
  )
}

function renderIndex(row: LoadedObjectDefect): VNodeChild {
  return row.index && row.index.trim() ? row.index : '—'
}

function renderNote(row: LoadedObjectDefect): VNodeChild {
  if (!row.note) return '—'
  const lines = row.note.split(/\n+/).map((line, idx) => h('div', { key: `${row.id}-note-${idx}` }, line))
  return h('div', { class: 'note-text' }, lines)
}

const renderActions = (row: LoadedObjectDefect): VNodeChild => {
  const editBtn = h(
    NButton,
    { quaternary: true, circle: true, size: 'small', onClick: () => openEdit(row), 'aria-label': 'Изменить дефект' },
    { icon: () => h(NIcon, null, { default: () => h(CreateOutline) }) },
  )

  const delBtn = h(
    NPopconfirm,
    {
      positiveText: 'Удалить',
      negativeText: 'Отмена',
      onPositiveClick: () => removeRow(row.id),
    },
    {
      trigger: () =>
        h(
          NButton,
          { quaternary: true, circle: true, size: 'small', type: 'error', 'aria-label': 'Удалить дефект' },
          { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) },
        ),
      default: () => 'Удалить дефект?',
    },
  )

  return h('div', { class: 'table-actions' }, [editBtn, delBtn])
}

const columns = computed<DataTableColumn<LoadedObjectDefect>[]>(() => [
    {
    title: 'Индекс',
    key: 'index',
    sorter: (a, b) => a.index.localeCompare(b.index, 'ru'),
    width:120,
    align: 'center',
    render: renderIndex,
  },
  {
    title: 'Название дефекта',
    key: 'name',
    sorter: (a, b) => a.name.localeCompare(b.name, 'ru'),
    width: 500,
    ellipsis: { tooltip: true },
    className: 'col-name',
    render: (row) => row.name,
  },
  {
    title: 'Категория',
    key: 'categoryName',
    minWidth: 80,
    align: 'center',
    className: 'col-category',
    render: renderCategory,
  },
  {
    title: 'Компонент',
    key: 'componentName',
    minWidth: 100,
    className: 'col-component',
    render: renderComponent,
  },
  {
    title: 'Комментарий',
    key: 'note',
    width: 300,
    className: 'col-note',

    ellipsis: { tooltip: true },
    render: (row) => row.note,
  },
  {
    title: 'Действия',
    key: 'actions',
    width: 120,
    align: 'center',
    render: renderActions,
  },
])

const cardFields = computed<CardField[]>(() => [
  {
    key: 'name',
    label: 'Название дефекта',
    render: (row) => row.name,
    isPrimary: true,
  },
  {
    key: 'category',
    label: 'Категория',
    render: renderCategory,
    isStatus: true,
  },
  {
    key: 'component',
    label: 'Компонент',
    render: renderComponent,
  },
  {
    key: 'index',
    label: 'Индекс',
    render: renderIndex,
  },
  {
    key: 'note',
    label: 'Комментарий',
    render: renderNote,
  },
  {
    key: 'actions',
    label: 'Действия',
    render: renderActions,
    isActions: true,
  },
])

const primaryField = computed(() => cardFields.value.find((field) => field.isPrimary) ?? cardFields.value[0])
const statusField = computed(() => cardFields.value.find((field) => field.isStatus))
const actionsField = computed(() => cardFields.value.find((field) => field.isActions))
const infoFields = computed(() =>
  cardFields.value.filter((field) => !field.isPrimary && !field.isStatus && !field.isActions),
)

const toPlainText = (value: VNodeChild | VNodeChild[]): string => {
  if (value == null || typeof value === 'boolean') return ''
  if (Array.isArray(value))
    return value
      .map((item) => toPlainText(item as VNodeChild | VNodeChild[]))
      .filter(Boolean)
      .join(' ')
  if (typeof value === 'object' && value !== null) {
    const childContainer = value as { children?: unknown }
    const { children } = childContainer
    if (Array.isArray(children)) {
      return toPlainText(children as VNodeChild[])
    }
    if (children != null) {
      return toPlainText(children as VNodeChild)
    }
    return ''
  }
  return String(value)
}

const primaryTitle = (row: LoadedObjectDefect) =>
  toPlainText(primaryField.value ? primaryField.value.render(row) : '')
const statusText = (row: LoadedObjectDefect) =>
  toPlainText(statusField.value ? statusField.value.render(row) : '')
const statusClass = (row: LoadedObjectDefect) => {
  const text = statusText(row).toLowerCase()
  if (!text) return ''
  if (text.includes('устран')) return 'ok'
  if (text.includes('крит') || text.includes('авар')) return 'warn'
  return ''
}

const FieldRenderer = defineComponent({
  name: 'FieldRenderer',
  props: {
    field: { type: Object as PropType<CardField>, required: true },
    row: { type: Object as PropType<LoadedObjectDefect>, required: true },
  },
  setup(props) {
    return () => props.field.render(props.row)
  },
})

const ActionsRenderer = defineComponent({
  name: 'ActionsRenderer',
  props: {
    row: { type: Object as PropType<LoadedObjectDefect>, required: true },
  },
  setup(props) {
    return () => renderActions(props.row)
  },
})

const maxPage = computed(() => Math.max(1, Math.ceil(total.value / pagination.pageSize) || 1))

watch([q, categoryFilter, componentFilter, defects], () => (pagination.page = 1))

watch(
  () => pagination.pageSize,
  () => (pagination.page = 1),
)

watchEffect(() => {
  if (pagination.page > maxPage.value) pagination.page = maxPage.value
})

const dialog = ref(false)
const infoOpen = ref(false)

const editing = ref<LoadedObjectDefect | null>(null)

const form = ref<FormState>({
  name: '',
  componentId: null,
  componentPvId: null,
  categoryFvId: null,
  categoryPvId: null,
  index: '',
  note: '',
})

const errors = ref<FormErrors>({})

const saving = ref(false)

const checkExistingDefectName = (name: string, excludeId?: string): LoadedObjectDefect | null => {
  const normalizedName = normalizeText(name)
  if (!normalizedName) return null
  return (
    defects.value.find(
      (defect) => normalizeText(defect.name) === normalizedName && String(defect.id) !== String(excludeId ?? ''),
    ) ?? null
  )
}

const nameWarning = computed(() => {
  if (!form.value.name.trim()) return ''

  const existing = checkExistingDefectName(form.value.name, editing.value?.id)

  if (!existing) return ''

  const category = existing.categoryName ? `, категория: ${existing.categoryName}` : ''
  return `Предупреждение: дефект с таким названием уже существует${category}`
})

const filterOtherDefects = (items: LoadedObjectDefect[]): LoadedObjectDefect[] => {
  if (!editing.value) return items
  const currentId = String(editing.value.id)
  return items.filter((item) => String(item.id) !== currentId)
}

const dedupeDefects = (items: LoadedObjectDefect[]): LoadedObjectDefect[] => {
  const map = new Map<string, LoadedObjectDefect>()
  for (const item of items) {
    map.set(String(item.id), item)
  }
  return Array.from(map.values())
}

const formatUsageList = (items: LoadedObjectDefect[]): string => {
  if (!items.length) return ''
  const names = items
    .slice(0, 3)
    .map((item) => (item.name ? `«${item.name}»` : 'без названия'))
    .join(', ')
  if (!names) return ''
  if (items.length > 3) {
    return `${names} и ещё ${items.length - 3}`
  }
  return names
}

const componentWarning = computed(() => {
  const componentId = form.value.componentId
  if (!componentId) return ''

  const option = componentLookup.value.byId.get(componentId)
  if (!option) return ''

  const usageById = componentLookup.value.usageById.get(componentId) ?? []
  const nameKey = normalizeText(option.name)
  const usageByName = nameKey ? componentLookup.value.usageByName.get(nameKey) ?? [] : []

  const related = dedupeDefects(filterOtherDefects([...usageById, ...usageByName]))
  if (!related.length) return ''

  const usageText = formatUsageList(related)
  if (!usageText) return ''

  return `Предупреждение: выбранный компонент уже используется в дефектах ${usageText}.`
})

const categoryWarning = computed(() => {
  const categoryFvId = form.value.categoryFvId
  const categoryPvId = form.value.categoryPvId
  if (!categoryFvId && !categoryPvId) return ''

  const usageByFvId = categoryFvId ? categoryLookup.value.usageByFvId.get(categoryFvId) ?? [] : []
  const usageByPvId = categoryPvId ? categoryLookup.value.usageByPvId.get(categoryPvId) ?? [] : []

  let nameUsage: LoadedObjectDefect[] = []
  if (categoryFvId) {
    const option = categoryLookup.value.byFvId.get(categoryFvId)
    const nameKey = option ? normalizeText(option.name) : ''
    nameUsage = nameKey ? categoryLookup.value.usageByName.get(nameKey) ?? [] : []
  }

  const related = dedupeDefects(filterOtherDefects([...usageByFvId, ...usageByPvId, ...nameUsage]))
  if (!related.length) return ''

  const usageText = formatUsageList(related)
  if (!usageText) return ''

  return `Предупреждение: выбранная категория уже привязана к дефектам ${usageText}.`
})

const handleComponentChange = (nextId: string | null) => {
  form.value.componentId = nextId
  if (!nextId) {
    form.value.componentPvId = null
    return
  }
  const option = componentLookup.value.byId.get(nextId)
  form.value.componentPvId = option?.pvId ?? null
}

const handleCategoryChange = (nextFvId: string | null) => {
  form.value.categoryFvId = nextFvId
  if (!nextFvId) {
    form.value.categoryPvId = null
    return
  }
  const option = categoryLookup.value.byFvId.get(nextFvId)
  form.value.categoryPvId = option?.pvId ?? null
}

const confirmDialog = (options: ConfirmDialogOptions): Promise<boolean> => {
  return new Promise((resolve) => {
    let resolved = false

    const finish = (result: boolean) => {
      if (resolved) return
      resolved = true
      resolve(result)
    }

    discreteDialog.warning({
      title: options.title ?? 'Подтверждение',
      content: options.html ? () => h('div', { innerHTML: options.content }) : options.content,
      positiveText: options.positiveText ?? 'Подтвердить',
      negativeText: options.negativeText ?? 'Отмена',
      maskClosable: false,

      onPositiveClick: () => {
        finish(true)
      },

      onNegativeClick: () => {
        finish(false)
      },

      onClose: () => {
        finish(false)
      },
    })
  })
}

function openCreate() {
  editing.value = null

  form.value = {
    name: '',
    componentId: null,
    componentPvId: null,
    categoryFvId: null,
    categoryPvId: null,
    index: '',
    note: '',
  }

  errors.value = {}

  dialog.value = true
}

function openEdit(row: LoadedObjectDefect) {
  const actual =
    defects.value.find((item) => String(item.id) === String(row.id)) ?? row

  editing.value = actual

  form.value = {
    name: actual.name,
    componentId: actual.componentId ?? null,
    componentPvId: actual.componentPvId ?? null,
    categoryFvId: actual.categoryFvId ?? null,
    categoryPvId: actual.categoryPvId ?? null,
    index: actual.index ?? '',
    note: actual.note ?? '',
  }

  if (form.value.componentId) handleComponentChange(form.value.componentId)
  if (form.value.categoryFvId) handleCategoryChange(form.value.categoryFvId)

  errors.value = {}

  dialog.value = true
}

async function save() {
  errors.value = {}

  const nameTrimmed = form.value.name.trim()
  if (nameTrimmed.length < 2) {
    errors.value = { name: 'Минимум 2 символа' }
    return
  }

  const duplicate = checkExistingDefectName(nameTrimmed, editing.value?.id)
  if (duplicate) {
    errors.value = { name: 'Дефект с таким названием уже существует' }
    return
  }

  const trimmedIndex = form.value.index?.trim() ?? ''
  const trimmedNote = form.value.note?.trim() ?? ''

  const payload = {
    name: nameTrimmed,
    componentId: form.value.componentId,
    componentPvId: form.value.componentPvId,
    categoryFvId: form.value.categoryFvId,
    categoryPvId: form.value.categoryPvId,
    index: trimmedIndex ? trimmedIndex : null,
    note: trimmedNote ? trimmedNote : null,
  }

  saving.value = true
  try {
    if (!editing.value) {
      await create.mutateAsync(payload)
      message.success('Дефект создан')
    } else {
      await update.mutateAsync({ id: editing.value.id, ...payload })
      message.success('Дефект обновлён')
    }

    dialog.value = false
  } catch (err) {
    const errorText = getErrorMessage(err)
    message.error(errorText || 'Не удалось сохранить дефект')
  } finally {
    saving.value = false
  }
}

const removingId = ref<string | null>(null)

const removeRow = async (id: string | number) => {
  const defectId = String(id)
  if (removingId.value) return

  const confirmed = await confirmDialog({
    title: 'Подтверждение',
    content: 'Удалить дефект?',
    positiveText: 'Удалить',
    negativeText: 'Отмена',
  })
  if (!confirmed) return

  removingId.value = defectId

  try {
    await remove.mutateAsync({ id })
    message.success('Дефект удалён')
  } catch (err) {
    const errorText = getErrorMessage(err)
    message.error(errorText || 'Не удалось удалить дефект')
  } finally {
    removingId.value = null
  }
}
</script>

<style scoped>
.table-stretch {
  width: 100%;
}

:deep(.n-data-table .n-data-table-td.col-name) {
  white-space: normal;
  word-break: break-word;
}

.object-defects-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow-x: hidden;
}

.table-area {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.table-full {
  flex: 1;
  min-width: 0;
}

:deep(.n-data-table .n-data-table-table) {
  border-collapse: separate;
  border-spacing: 0 12px;
  width: 100%;
}

:deep(.n-data-table .n-data-table-tbody .n-data-table-tr) {
  background: var(--n-card-color, #fff);
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  overflow: hidden;
}

:deep(.n-data-table .n-data-table-tbody .n-data-table-td) {
  border-bottom: none;
  padding: 0 12px;
  height: auto;
  line-height: 24px;
  vertical-align: middle;
}

:deep(.n-data-table thead th) {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--n-table-header-color, var(--n-card-color, #fff));
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.08);
}

:deep(.n-pagination) {
  font-size: 14px;
}

.pagination-total {
  margin-right: 12px;
  font-size: 14px;
  color: var(--n-text-color-3);
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.toolbar__left {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.page-title__info :deep(.n-icon) {
  font-size: 16px;
}

.page-title__info:hover,
.page-title__info:focus {
  background: #edf1f7;
  color: var(--n-text-color);
}

.page-title__info:active {
  background: #e2e8f0;
}

.subtext {
  font-size: 12px;
  color: var(--n-text-color-3);
}

.toolbar__controls {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar__filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.toolbar__search {
  width: 280px;
  max-width: 100%;
}

.toolbar__select {
  min-width: 160px;
}

.tag-category {
  background: #eff6ff;
  color: #1d4ed8;
}

.tag-component {
  background: #fff;
}

.note-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  white-space: normal;
  word-break: break-word;
}

.table-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  opacity: 0;
  transition: 0.15s ease;
}

:deep(.n-data-table .n-data-table-tr:hover) .table-actions {
  opacity: 1;
}

.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.cards {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
}

.card {
  border: 1px solid #eee;
  border-radius: 14px;
  padding: 12px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  max-width: 100%;
  width: 100%;
  box-sizing: border-box;
}

.card__header,
.card__actions {
  min-width: 0;
}

.card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.card__title {
  margin: 0;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.card__grid {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 6px 10px;
  margin: 10px 0;
}

.card__grid dt {
  color: #6b7280;
  font-size: 12px;
}

.card__grid dd {
  margin: 0;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.card__actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.card__actions .table-actions {
  justify-content: flex-start;
}

.badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f3f4f6;
}

.badge.ok {
  background: #ecfdf5;
}

.badge.warn {
  background: #fff7ed;
}

@media (max-width: 900px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar__controls {
    justify-content: flex-start;
  }

  .toolbar__search {
    width: 100%;
  }
}

@media (max-width: 360px) {
  .card__grid {
    grid-template-columns: 100px 1fr;
  }
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.warning-text {
  color: #e6a23c;
  font-size: 12px;
  font-style: italic;
}
</style>
