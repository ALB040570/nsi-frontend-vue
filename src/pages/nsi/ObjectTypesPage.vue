<!-- Файл: src/pages/nsi/ObjectTypesPage.vue
     Назначение: страница CRUD для типов обслуживаемых объектов с управлением компонентами и геометрией.
     Использование: подключается в маршрутизаторе по пути /nsi/object-types. -->
<template>
  <section class="object-types-page">
    <NCard size="small" class="toolbar" content-style="padding: 10px 14px">
      <div class="toolbar__left">
        <h2 class="page-title">
          Справочник «Типы обслуживаемых объектов»
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
        <div class="subtext">Классифицируйте обслуживаемые объекты, объединяя их в типы и выделяя компоненты</div>
      </div>

      <div class="toolbar__controls">
        <NInput v-model:value="q" placeholder="Поиск…" clearable round style="width: 340px" />
        <NRadioGroup v-model:value="shapeFilter" class="geom-filter" size="small">
          <NRadioButton :value="'*'">Все</NRadioButton>
          <NRadioButton :value="'точка'">Точка</NRadioButton>
          <NRadioButton :value="'линия'">Линия</NRadioButton>
          <NRadioButton :value="'полигон'">Полигон</NRadioButton>
        </NRadioGroup>
        <NButton type="primary" @click="openCreate">+ Создать</NButton>
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
          aria-label="Постраничная навигация по типам объектов"
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
      :title="editing ? 'Изменить тип' : 'Создать тип'"
      style="width: 560px"
    >
      <NForm :model="form" label-width="120px">
        <NFormItem
          label="Тип обслуживаемого объекта"
          :feedback="errors.name ?? undefined"
          :validation-status="errors.name ? 'error' : undefined"
        >
          <NInput v-model:value="form.name" />
          <div v-if="nameWarning" class="warning-text" style="margin-top: 4px">
            {{ nameWarning }}
          </div>
        </NFormItem>

        <NFormItem label="Форма на карте">
          <NRadioGroup v-model:value="form.geometry">
            <NRadioButton value="точка">Точка</NRadioButton>
            <NRadioButton value="линия">Линия</NRadioButton>
            <NRadioButton value="полигон">Полигон</NRadioButton>
          </NRadioGroup>
        </NFormItem>

        <NFormItem label="Компоненты">
          <div class="field-stack">
            <ComponentsSelect
              :value="form.component"
              :options="componentSelectOptions"
              :placeholder="'Начните вводить, чтобы найти компонент'"
              @update:value="handleUpdateComponentValue"
              @blur="handleComponentBlur"
              @created="handleComponentCreated"
            />
            <p class="text-small">
              Выбирайте компоненты из списка. Если нужного нет, введите название (минимум 2 символа)
              и нажмите Enter для создания нового варианта.
            </p>
          </div>
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
      <p>Это список категорий инфраструктурных объектов. Он нужен, чтобы их удобнее классифицировать, планировать и учитывать работы.</p> <p>Чтобы создать категорию: задайте название, выберите форму на карте (точка, линия или полигон) и добавьте компоненты.</p> <p>Редактировать можно только те категории, на которые ещё нет ссылок в описаниях объектов и работ. В этом случае вы можете менять название, форму на карте и состав компонентов.</p>
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
  nextTick,
  h,
  defineComponent,
} from 'vue'
import { useRoute, useRouter } from 'vue-router'

import type { PropType, VNodeChild } from 'vue'

import { useQueryClient } from '@tanstack/vue-query'

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
  NPopover,
  NPopconfirm,
  NRadioButton,
  NRadioGroup,
  NTag,
  useDialog,
  useMessage,
} from 'naive-ui'
import type { DataTableColumn } from 'naive-ui'

import { CreateOutline, TrashOutline, InformationCircleOutline } from '@vicons/ionicons5'

import { debounce } from 'lodash-es'

import { ComponentsSelect } from '@features/components-select'
import { useObjectTypeMutations, useObjectTypesQuery, ensureComponentObjects, resolveRemoveLinkIds, type LinkEntry } from '@features/object-type-crud'
import {
  type GeometryKind,
  type GeometryPair,
  type LoadedObjectType,
  type ObjectType,
  type ObjectTypesSnapshot,
} from '@entities/object-type'
import { createComponentIfMissing, type ComponentOption } from '@entities/component'
import { getErrorMessage, normalizeText } from '@shared/lib'

const router = useRouter()
const route = useRoute()

const isMobile = ref(false)
if (typeof window !== 'undefined') {
  isMobile.value = window.matchMedia('(max-width: 768px)').matches
}
// аккуратные массовые пересчёты

onMounted(() => {
  if (typeof window === 'undefined') return
  mediaQueryList = window.matchMedia('(max-width: 768px)')
  handleMediaQueryChange(mediaQueryList)
  mediaQueryList.addEventListener('change', handleMediaQueryChange)
})

// при уходе со страницы выключим всё

onBeforeUnmount(() => {
  if (mediaQueryList) {
    mediaQueryList.removeEventListener('change', handleMediaQueryChange)
    mediaQueryList = null
  }
})

const clearActionQuery = () => {
  if (!route.query.action) return
  const nextQuery = { ...route.query }
  delete nextQuery.action
  void router.replace({ path: route.path, query: nextQuery, hash: route.hash })
}

watch(
  () => route.query.action,
  (value) => {
    const matches = Array.isArray(value) ? value.includes('create') : value === 'create'
    if (!matches) return
    nextTick(() => {
      openCreate()
      clearActionQuery()
    })
  },
  { immediate: true },
)

/* ---------- типы и утилиты ---------- */

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

  geometry: GeometryKind

  component: string[]
}

interface FormErrors {
  name?: string
}

const DEFAULT_GEOMETRY: GeometryKind = 'точка'

const geometryLabels: Record<GeometryKind, string> = {
  точка: 'Точка',
  линия: 'Линия',
  полигон: 'Полигон',
}

const geometryLabel = (geometry: GeometryKind | string) =>
  geometryLabels[geometry as GeometryKind] ?? String(geometry)

interface ConfirmDialogOptions {
  title?: string
  content: string
  positiveText?: string
  negativeText?: string
  html?: boolean
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

/* ---------- таблица/поиск/пагинация ---------- */

const qc = useQueryClient()
const message = useMessage()
const discreteDialog = useDialog()
const q = ref('')
const shapeFilter = ref<'*' | GeometryKind>('*')
const pagination = reactive<PaginationState>({ page: 1, pageSize: 10 })

let mediaQueryList: MediaQueryList | null = null
const handleMediaQueryChange = (e: MediaQueryList | MediaQueryListEvent) => {
  isMobile.value = 'matches' in e ? e.matches : false
}
const { data: snapshot, isLoading, isFetching, error } = useObjectTypesQuery()
const snapshotData = computed<ObjectTypesSnapshot | undefined>(() => snapshot.value ?? undefined)

const fetchState = computed<FetchState>(() => ({
  isLoading: isLoading.value,
  isFetching: isFetching.value,
  isError: Boolean(error.value),
  errorMessage: getErrorMessage(error.value),
}))

const tableLoading = computed(() => fetchState.value.isLoading || fetchState.value.isFetching)

const mutations = useObjectTypeMutations()
const createTypeMutation = mutations.create
const updateGeometryMutation = mutations.updateGeometry
const renameWithMigrationMutation = mutations.renameWithMigration
const updateComponentsDiffMutation = mutations.updateComponentsDiff
const removeCascadeMutation = mutations.removeCascade

watch(
  () => fetchState.value.errorMessage,
  (m, p) => {
    if (m && m !== p) message.error(m)
  },
)

const objectTypes = computed(() => snapshotData.value?.items ?? [])
const componentsByType = computed(() => snapshotData.value?.componentsByType ?? {})
const allComponents = computed(() => snapshotData.value?.allComponents ?? [])
const createdComponents = ref<ComponentOption[]>([])
const removingId = ref<string | null>(null)
const allComponentOptions = computed<ComponentOption[]>(() => {
  const byKey = new Map<string, ComponentOption>()
  for (const option of allComponents.value) byKey.set(normalizeText(option.name), option)
  for (const option of createdComponents.value) byKey.set(normalizeText(option.name), option)
  return Array.from(byKey.values()).sort((a, b) => a.name.localeCompare(b.name, 'ru'))
})

const componentSelectOptions = computed(() =>
  allComponentOptions.value.map((option) => ({ label: option.name, value: option.name })),
)

const geometryPairByKind = computed(() => snapshotData.value?.geometryPairByKind ?? {})
const linksByType = computed<Record<string, LinkEntry[]>>(
  () => snapshotData.value?.linksByType ?? {},
)
const componentMapByName = computed(() => {
  const map = new Map<string, ComponentOption>()
  for (const option of allComponentOptions.value) map.set(normalizeText(option.name), option)
  return map
})

const getGeometryPair = (kind: GeometryKind): GeometryPair =>
  geometryPairByKind.value[kind] ?? { fv: null, pv: null }






const handleUpdateComponentValue = (nextNames: string[]) => {
  form.value.component = nextNames
}

const handleComponentCreated = async (component: { id: string; cls: number; name: string }) => {
  if (!createdComponents.value.some((item) => item.id === component.id)) {
    createdComponents.value = [...createdComponents.value, { id: component.id, name: component.name }]
  }
  if (!form.value.component.includes(component.name)) {
    form.value.component = [...form.value.component, component.name]
  }
  await qc.invalidateQueries({ queryKey: ['object-types'] })
}

const filteredRows = computed(() => {
  const search = q.value.trim().toLowerCase()
  const gf = shapeFilter.value
  return objectTypes.value.filter((item) => {
    const geometryOk = gf === '*' ? true : item.geometry === gf
    if (!search) return geometryOk
    const hit = Object.values(item).some(
      (v) => v != null && String(v).toLowerCase().includes(search),
    )
    return geometryOk && hit
  })
})

const total = computed(() => filteredRows.value.length)
const paginatedRows = computed(() => {
  const start = Math.max(0, (pagination.page - 1) * pagination.pageSize)
  return filteredRows.value.slice(start, start + pagination.pageSize)
})
const rows = computed(() => paginatedRows.value || [])
const rowKey = (row: ObjectType) => row.id

const MAX_CHIPS = 4

function renderComponents(row: ObjectType): VNodeChild {
  const list = Array.isArray(row.component) ? row.component : []
  const chips = list.slice(0, MAX_CHIPS)
  const rest = Math.max(0, list.length - MAX_CHIPS)

  const chipsNodes = chips.map((name) =>
    h(
      NTag,
      { size: 'small', bordered: true, round: true, class: 'chip', key: name },
      { default: () => name },
    ),
  )

  const more =
    rest > 0
      ? h(
          NPopover,
          { trigger: 'hover' },
          {
            trigger: () =>
              h(NTag, { size: 'small', round: true, class: 'chip' }, { default: () => `+${rest}` }),
            default: () =>
              h(
                'div',
                { class: 'popover-list' },
                list.map((n) => h('div', { class: 'popover-item', key: n }, n)),
              ),
          },
        )
      : null

  return h('div', { class: 'chips-row' }, more ? [...chipsNodes, more] : chipsNodes)
}

const renderActions = (row: ObjectType): VNodeChild => {
  const editBtn = h(
    NButton,
    { quaternary: true, circle: true, size: 'small', onClick: () => openEdit(row), 'aria-label': 'Изменить тип' },
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
          { quaternary: true, circle: true, size: 'small', type: 'error', 'aria-label': 'Удалить тип' },
          { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) },
        ),
      default: () => 'Удалить тип и все связи?',
    },
  )

  return h('div', { class: 'table-actions' }, [editBtn, delBtn])
}

const columns = computed<DataTableColumn<ObjectType>[]>(() => [
  {
    title: 'Типы объектов',
    key: 'name',
    sorter: (a, b) => a.name.localeCompare(b.name, 'ru'),
    width: 400,
    ellipsis: { tooltip: true },
    className: 'col-name',
    render: (row) => row.name,
  },
  {
    title: 'Форма на карте',
    key: 'geometry',
    width: 150,
    align: 'center',
    render: (row) =>
      h(
        NTag,
        { size: 'small', bordered: false, type: 'info' },
        { default: () => geometryLabel(row.geometry) },
      ),
  },
  {
    title: 'Компоненты',
    key: 'component',
    className: 'col-components',
    minWidth: 420,
    align: 'left',
    render: renderComponents,
  },
  {
    title: 'Действия',
    key: 'actions',
    width: 120,
    align: 'center',
    render: renderActions,
  },
])

interface CardField {
  key: string
  label: string
  render: (row: ObjectType) => VNodeChild
  isPrimary?: boolean
  isStatus?: boolean
  isActions?: boolean
}

const cardFields = computed<CardField[]>(() => [
  {
    key: 'name',
    label: 'Типы объектов',
    render: (row) => row.name,
    isPrimary: true,
  },
  {
    key: 'geometry',
    label: 'Форма на карте',
    render: (row) => geometryLabel(row.geometry),
    isStatus: true,
  },
  {
    key: 'component',
    label: 'Компоненты',
    render: renderComponents,
  },
  {
    key: 'actions',
    label: 'Действия',
    render: renderActions,
    isActions: true,
  },
])

const primaryField = computed(
  () => cardFields.value.find((field) => field.isPrimary) ?? cardFields.value[0],
)
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

const primaryTitle = (row: ObjectType) =>
  toPlainText(primaryField.value ? primaryField.value.render(row) : '')
const statusText = (row: ObjectType) =>
  toPlainText(statusField.value ? statusField.value.render(row) : '')
const statusClass = (row: ObjectType) => {
  const text = statusText(row).toLowerCase()
  if (!text) return ''
  if (text.includes('точ')) return 'ok'
  if (text.includes('полиг')) return 'ok'
  if (text.includes('лин')) return 'warn'
  return ''
}

const FieldRenderer = defineComponent({
  name: 'FieldRenderer',
  props: {
    field: { type: Object as PropType<CardField>, required: true },
    row: { type: Object as PropType<ObjectType>, required: true },
  },
  setup(props) {
    return () => props.field.render(props.row)
  },
})

const ActionsRenderer = defineComponent({
  name: 'ActionsRenderer',
  props: {
    row: { type: Object as PropType<ObjectType>, required: true },
  },
  setup(props) {
    return () => renderActions(props.row)
  },
})

// TODO: подключить виртуализацию (VirtualList), если потребуется отображать более 100 карточек на мобильных устройствах

const maxPage = computed(() => Math.max(1, Math.ceil(total.value / pagination.pageSize) || 1))

watch([q, objectTypes], () => (pagination.page = 1))

watch(
  () => pagination.pageSize,

  () => (pagination.page = 1),
)

watchEffect(() => {
  if (pagination.page > maxPage.value) pagination.page = maxPage.value
})

/* ---------- CRUD формы ---------- */

const dialog = ref(false)
const infoOpen = ref(false)

const editing = ref<LoadedObjectType | null>(null)

const form = ref<FormState>({ name: '', geometry: DEFAULT_GEOMETRY, component: [] })

const errors = ref<FormErrors>({})

const saving = ref(false)

const checkExistingTypeName = (name: string, excludeId?: string): ObjectType | null => {
  const normalizedName = normalizeText(name)

  return (
    objectTypes.value.find((t) => normalizeText(t.name) === normalizedName && t.id !== excludeId) ??
    null
  )
}

const checkExistingComponentName = (
  name: string,
): { component: ComponentOption; usedInTypes: ObjectType[] } | null => {
  const n = normalizeText(name)

  if (!n) return null

  const existing = componentMapByName.value.get(n)

  if (!existing) return null

  const usedInTypes = objectTypes.value.filter((t) =>
    (componentsByType.value[t.id] ?? []).some((c) => normalizeText(c.name) === n),
  )

  return { component: existing, usedInTypes }
}

const isTypeCompletelyIdentical = (
  next: { name: string; geometry: GeometryKind; component: string[] },

  prev: ObjectType,
) => {
  const a = [...next.component].sort()

  const b = [...prev.component].sort()

  return (
    normalizeText(next.name) === normalizeText(prev.name) &&
    next.geometry === prev.geometry &&
    a.length === b.length &&
    a.every((v, i) => normalizeText(v) === normalizeText(b[i]))
  )
}

const nameWarning = computed(() => {
  if (!form.value.name.trim()) return ''

  const existing = checkExistingTypeName(form.value.name, editing.value?.id)

  return existing
    ? `Предупреждение: тип с таким названием уже существует (${existing.geometry})`
    : ''
})

const checkComponent = (componentName: string) => {
  const info = checkExistingComponentName(componentName)

  if (info && info.usedInTypes.length > 0)
    message.warning(`Компонент "${componentName}" уже используется в других типах объектов`)
}

const debouncedCheckComponent = debounce(checkComponent, 500)

const handleComponentBlur = (e: FocusEvent) => {
  const target = e.target as HTMLInputElement | null

  if (target) debouncedCheckComponent(target.value)
}

function openCreate() {
  editing.value = null

  form.value = { name: '', geometry: DEFAULT_GEOMETRY, component: [] }
  createdComponents.value = []

  errors.value = {}

  dialog.value = true
}

function openEdit(row: ObjectType) {
  editing.value = row

  form.value = { name: row.name, geometry: row.geometry, component: [...row.component] }
  createdComponents.value = []

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

  const compNames = Array.from(new Set(form.value.component.map((v) => v.trim()).filter(Boolean)))
  const isEditing = Boolean(editing.value)
  const current = editing.value
  const nameChanged = isEditing && normalizeText(current!.name) !== normalizeText(nameTrimmed)
  const geometryChanged = isEditing && current!.geometry !== form.value.geometry

  if (!isEditing || nameChanged) {
    const existingType = checkExistingTypeName(nameTrimmed, current?.id)
    if (existingType) {
      const next = { name: nameTrimmed, geometry: form.value.geometry, component: compNames }
      if (isTypeCompletelyIdentical(next, existingType)) {
        message.error('Нельзя создать полностью идентичный тип')
        return
      }

      const ok = await confirmDialog({
        title: 'Тип с таким названием уже есть',
        content:
          `Тип "${nameTrimmed}" уже существует:<br><br>` +
          `- Форма на карте: ${existingType.geometry}<br>` +
          `- Компоненты: ${existingType.component.join(', ') || 'нет'}<br><br>` +
          'Вы уверены, что хотите продолжить?',
        positiveText: 'Продолжить',
        negativeText: 'Отмена',
        html: true,
      })

      if (!ok) return
    }
  }

  for (const cn of compNames) {
    const info = checkExistingComponentName(cn)
    if (info && info.usedInTypes.length > 0) {
      const typeNames = info.usedInTypes.map((t) => t.name).join(', ')
      const ok = await confirmDialog({
        title: 'Компонент уже используется',
        content: `Компонент "${cn}" уже используется в: ${typeNames}.<br>Продолжить?`,
        positiveText: 'Продолжить',
        negativeText: 'Отмена',
        html: true,
      })
      if (!ok) return
    }
  }

  const missing = compNames.filter((n) => !componentMapByName.value.has(normalizeText(n)))
  if (missing.length > 0) {
    message.warning(`Некоторые компоненты будут созданы автоматически: ${missing.join(', ')}`)
  }

  const geometryPair = getGeometryPair(form.value.geometry)
  if (geometryPair.fv == null && geometryPair.pv == null) {
    message.error('Не найдены идентификаторы Формы на карте')
    return
  }

  saving.value = true
  try {
    if (!isEditing) {
      await createTypeMutation.mutateAsync({
        name: nameTrimmed,
        geometry: form.value.geometry,
        geometryPair,
        componentNames: compNames,
      })
      message.success('Создано')
    } else if (nameChanged) {
      const typeId = Number(current!.id)
      const typeCls = Number(current!.cls)
      if (!Number.isFinite(typeId) || !Number.isFinite(typeCls)) {
        throw new Error('Некорректные идентификаторы текущего типа')
      }
      const links = linksByType.value[String(current!.id)] ?? []
      const oldComponentIds = links
        .map((link) => Number(link.compId))
        .filter((id): id is number => Number.isFinite(id))

      await renameWithMigrationMutation.mutateAsync({
        oldId: typeId,
        oldCls: typeCls,
        oldName: current!.name,
        oldComponentIds,
        newName: nameTrimmed,
        geometryPair,
        componentNames: compNames,
      })
      message.success('Переименовано')
    } else {
      if (geometryChanged) {
        await updateGeometryMutation.mutateAsync({
          id: Number(current!.id),
          cls: Number(current!.cls),
          name: current!.name,
          geometryPair,
          idShape: current!.idShape,
          number: current!.number,
        })
      }

      const prevSet = new Set((current!.component ?? []).map(normalizeText))
      const nextSet = new Set(compNames.map(normalizeText))
      const removed = (current!.component ?? []).filter((name) => !nextSet.has(normalizeText(name)))
      const added = compNames.filter((name) => !prevSet.has(normalizeText(name)))

      if (removed.length || added.length) {
        const addComponents = added.length
          ? await ensureComponentObjects(added, createComponentIfMissing)
          : []
        if (addComponents.length) {
          const existingIds = new Set(allComponentOptions.value.map((option) => String(option.id)))
          const createdOptions = addComponents
            .filter((component) => !existingIds.has(String(component.id)))
            .map<ComponentOption>((component) => ({ id: String(component.id), name: component.name }))
          if (createdOptions.length) {
            createdComponents.value = [...createdComponents.value, ...createdOptions]
          }
        }
        const removeLinkIds = resolveRemoveLinkIds(
          String(current!.id),
          linksByType.value,
          allComponentOptions.value,
          removed,
        )
        await updateComponentsDiffMutation.mutateAsync({
          typeId: Number(current!.id),
          typeCls: Number(current!.cls),
          typeName: current!.name,
          add: addComponents,
          removeLinkIds,
        })
      }

      if (!geometryChanged && !removed.length && !added.length) {
        message.info('Изменений не выявлено')
      } else {
        message.success('Изменено')
      }
    }

    await qc.invalidateQueries({ queryKey: ['object-types'] })
    dialog.value = false
  } catch (error) {
    console.error(error)
    message.error('Не удалось сохранить')
  } finally {
    saving.value = false
  }
}

const removeRow = async (id: string | number) => {
  const typeIdStr = String(id)
  if (removingId.value) return

  const confirmed = await confirmDialog({
    title: 'Подтверждение',
    content: 'Удалить тип и все его связи с компонентами?',
    positiveText: 'Удалить',
    negativeText: 'Отмена',
  })
  if (!confirmed) return

  removingId.value = typeIdStr

  try {
    const typeIdNum = Number(typeIdStr)
    if (!Number.isFinite(typeIdNum)) throw new Error('Некорректный идентификатор типа')
    await removeCascadeMutation.mutateAsync({ typeId: typeIdNum })
    message.success('Тип удалён')
  } catch (e) {
    console.error(e)
    message.error('Не удалось удалить тип')
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

.object-types-page {
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

:deep(.n-data-table .n-data-table-td.col-components) {
  height: auto; /* снимаем глобальный height:24px */
  line-height: normal;
  padding-top: 0; /* при желании подправьте отступы */
  padding-bottom: 0;
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

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 12px;
  gap: 16px;
}

:deep(.n-card.toolbar) {
  max-width: 100%;
  box-sizing: border-box;
}

.toolbar__left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.toolbar__controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.page-title {
  margin: 0;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.page-title__info {
  padding: 0;
  background: #f5f7fa;
  color: var(--n-text-color);
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.04);
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.page-title__info :deep(.n-button__content) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
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

.geom-filter :deep(.n-radio-button) {
  min-width: 64px;
}

/* Компоненты — чипсы */
.chips-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  overflow: hidden;
}

.chip {
  background: #fff;
}

.popover-list {
  max-width: 280px;
  max-height: 240px;
  overflow: auto;
  padding: 4px 0;
}

.popover-item {
  padding: 2px 8px;
}

/* Действия — показывать по hover */
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

/* Toolbar адаптив */
@media (max-width: 900px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .toolbar__controls {
    justify-content: flex-start;
  }
}

/* Pagination layout */
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
  grid-template-columns: 110px 1fr;
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

.cards .chips-row {
  flex-wrap: wrap;
  min-width: 0;
  overflow: visible;
}

.cards .chip {
  max-width: 100%;
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

@media (max-width: 360px) {
  .card__grid {
    grid-template-columns: 96px 1fr;
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
.field-stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}
</style>
