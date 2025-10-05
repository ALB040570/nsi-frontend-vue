<!-- Файл: src/pages/nsi/ObjectParametersPage.vue
     Назначение: страница CRUD для параметров обслуживаемых объектов (пока только просмотр).
     Использование: подключается в маршрутизаторе по пути /nsi/object-parameters. -->
<template>
  <section class="object-parameters-page">
    <NCard size="small" class="toolbar" content-style="padding: 10px 14px">
      <div class="toolbar__left">
        <h2 class="page-title">
          Справочник «Параметры обслуживаемых объектов»
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
          Управляйте перечнем параметров обслуживаемых объектов и контролируйте их диапазоны значений
        </div>
      </div>

      <div class="toolbar__controls">
        <NInput v-model:value="q" placeholder="Поиск…" clearable round class="toolbar__search" />
        <NButton type="primary" @click="openCreate">+ Добавить параметр</NButton>
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
          aria-label="Постраничная навигация по параметрам"
        >
          <template #prefix>
            <span class="pagination-total">Всего: {{ total }}</span>
          </template>
        </NPagination>
      </div>
    </div>

    <NModal
      v-model:show="infoOpen"
      preset="card"
      title="О справочнике"
      style="max-width: 640px; width: 92vw"
    >
      <p>
        Здесь собраны параметры, необходимые для контроля состояния и эксплуатации обслуживаемых объектов. Указывайте единицу
        измерения, компонент и допустимые границы значений.
      </p>
      <p>
        Создание и редактирование параметров находятся в разработке. Пока можно просматривать информацию по существующим
        записям.
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
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
  type PropType,
  type VNodeChild,
} from 'vue'

import {
  NButton,
  NCard,
  NDataTable,
  NIcon,
  NInput,
  NModal,
  NPagination,
  NPopconfirm,
  NTag,
  useMessage,
  type DataTableColumn,
  type FormInst,
} from 'naive-ui'
import { CreateOutline, InformationCircleOutline, TrashOutline } from '@vicons/ionicons5'

import { useObjectParameterMutations, useObjectParametersQuery } from '@features/object-parameter-crud'
import type { LoadedObjectParameter } from '@entities/object-parameter'
import { getErrorMessage, normalizeText } from '@shared/lib'

interface PaginationState {
  page: number
  pageSize: number
}

interface CardField {
  key: string
  label: string
  render: (row: LoadedObjectParameter) => VNodeChild
  isPrimary?: boolean
  isStatus?: boolean
  isActions?: boolean
}

const message = useMessage()
const formRef = ref<FormInst | null>(null)
const infoOpen = ref(false)
const q = ref('')
const pagination = reactive<PaginationState>({ page: 1, pageSize: 10 })
const isMobile = ref(false)

const { data: snapshot, isLoading, isFetching, error } = useObjectParametersQuery()
const parameterMutations = useObjectParameterMutations()

if (typeof window !== 'undefined') {
  isMobile.value = window.matchMedia('(max-width: 768px)').matches
}

let mediaQueryList: MediaQueryList | null = null
const handleMediaQueryChange = (event: MediaQueryList | MediaQueryListEvent) => {
  isMobile.value = 'matches' in event ? event.matches : false
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

watch(q, () => {
  pagination.page = 1
})

const snapshotData = computed(() => snapshot.value ?? undefined)
const parameters = computed<LoadedObjectParameter[]>(() => snapshotData.value?.items ?? [])

const fetchErrorMessage = computed(() => getErrorMessage(error.value))
watch(fetchErrorMessage, (next, prev) => {
  if (next && next !== prev) message.error(next)
})

const tableLoading = computed(() => isLoading.value || isFetching.value)

const filteredRows = computed(() => {
  const search = normalizeText(q.value)

  if (!search) return parameters.value

  return parameters.value.filter((item) => {
    const fields = [item.name, item.unitName, item.sourceName, item.code, item.note]
    return fields.some((field) => normalizeText(field ?? '').includes(search))
  })
})

const total = computed(() => filteredRows.value.length)

watch(
  () => [total.value, pagination.pageSize],
  () => {
    const maxPage = Math.max(1, Math.ceil(total.value / pagination.pageSize))
    if (pagination.page > maxPage) pagination.page = maxPage
  },
)

const paginatedRows = computed(() => {
  const start = Math.max(0, (pagination.page - 1) * pagination.pageSize)
  return filteredRows.value.slice(start, start + pagination.pageSize)
})

const rows = computed(() => paginatedRows.value)
const rowKey = (row: LoadedObjectParameter) => row.id

const resetFormValidation = () => {
  formRef.value?.restoreValidation()
}

function formatNumber(value: number | null): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 4 }).format(value)
}

function renderUnit(row: LoadedObjectParameter): VNodeChild {
  if (!row.unitName) return '—'
  return h(
    NTag,
    { size: 'small', bordered: false, round: true, type: 'info', class: 'tag-unit' },
    { default: () => row.unitName },
  )
}

function renderSourceTag(row: LoadedObjectParameter): VNodeChild {
  if (!row.sourceName) return '—'
  return h(
    NTag,
    { size: 'small', bordered: true, round: true, class: 'tag-component' },
    { default: () => row.sourceName },
  )
}

function renderNameWithMeta(row: LoadedObjectParameter): VNodeChild {
  const unit = row.unitName ? renderUnit(row) : null
  const source = row.sourceName ? renderSourceTag(row) : null
  const metaContent = [unit, source].filter((child): child is VNodeChild => Boolean(child))

  return h('div', { class: 'name-cell' }, [
    h('div', null, row.name),
    metaContent.length ? h('div', { class: 'name-meta' }, metaContent) : null,
  ])
}

function renderLimit(value: number | null): string {
  return formatNumber(value)
}

function renderRange(row: LoadedObjectParameter): VNodeChild {
  const createItem = (label: string, value: string) =>
    h('div', { class: 'range-cell__item' }, [
      h('span', { class: 'range-cell__label' }, label),
      h('span', { class: 'range-cell__value' }, value),
    ])

  return h('div', { class: 'range-cell' }, [
    createItem('Макс: ', renderLimit(row.maxValue)),
    createItem('Мин: ', renderLimit(row.minValue)),
    createItem('Норм: ', renderLimit(null)),
  ])
}

function renderComments(row: LoadedObjectParameter): VNodeChild {
  if (!row.note) return '—'
  const lines = row.note.split(/\n+/).map((line, index) => h('div', { key: `${row.id}-note-${index}` }, line))
  return h('div', { class: 'note-text' }, lines)
}

function renderSourceDetails(row: LoadedObjectParameter): VNodeChild {
  if (row.sourceName?.trim()) return row.sourceName
  return row.code?.trim() ? row.code : '—'
}

function renderDescription(row: LoadedObjectParameter): VNodeChild {
  return row.valueType?.trim() ? `Тип значения: ${row.valueType}` : '—'
}

const renderActions = (row: LoadedObjectParameter): VNodeChild => {
  const editBtn = h(
    NButton,
    {
      quaternary: true,
      circle: true,
      size: 'small',
      onClick: () => openEdit(row),
      'aria-label': `Изменить параметр ${row.name}`,
    },
    { icon: () => h(NIcon, null, { default: () => h(CreateOutline) }) },
  )

  const delBtn = h(
    NPopconfirm,
    {
      positiveText: 'Удалить',
      negativeText: 'Отмена',
      onPositiveClick: () => deleteParameter(row),
    },
    {
      trigger: () =>
        h(
          NButton,
          {
            quaternary: true,
            circle: true,
            size: 'small',
            type: 'error',
            'aria-label': `Удалить параметр ${row.name}`,
          },
          { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) },
        ),
      default: () => 'Удалить параметр?',
    },
  )

  return h('div', { class: 'table-actions' }, [editBtn, delBtn])
}

const columns = computed<DataTableColumn<LoadedObjectParameter>[]>(() => [
  {
    title: 'Параметр ЕИ Источник',
    key: 'name',
    sorter: (a, b) => a.name.localeCompare(b.name, 'ru'),
    minWidth: 240,
    ellipsis: { tooltip: true },
    className: 'col-name',
    render: renderNameWithMeta,
  },
  {
    title: 'Диапазон',
    key: 'range',
    minWidth: 80,
    align: 'left',
    render: renderRange,
  },
  {
    title: 'Комментарии по диапазонам',
    key: 'note',
    minWidth: 200,
    ellipsis: { tooltip: true },
    className: 'col-note',
    render: renderComments,
  },
  {
    title: 'Источник',
    key: 'sourceName',
    minWidth: 140,
    sorter: (a, b) => (a.sourceName ?? '').localeCompare(b.sourceName ?? '', 'ru'),
    render: renderSourceDetails,
  },
  {
    title: 'Описание',
    key: 'description',
    minWidth: 200,
    ellipsis: { tooltip: true },
    render: renderDescription,
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
    label: 'Наименование',
    render: renderNameWithMeta,
    isPrimary: true,
  },
  {
    key: 'unit',
    label: 'Единица измерения',
    render: renderUnit,
  },
  {
    key: 'source-tag',
    label: 'Источник данных',
    render: renderSourceTag,
  },
  {
    key: 'range',
    label: 'Диапазон',
    render: renderRange,
  },
  {
    key: 'note',
    label: 'Комментарии по диапазонам',
    render: renderComments,
  },
  {
    key: 'source',
    label: 'Источник',
    render: renderSourceDetails,
  },
  {
    key: 'description',
    label: 'Описание',
    render: renderDescription,
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
  if (Array.isArray(value)) {
    return value
      .map((item) => toPlainText(item as VNodeChild | VNodeChild[]))
      .filter(Boolean)
      .join(' ')
  }
  if (typeof value === 'object') {
    const children = (value as { children?: unknown }).children
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

const primaryTitle = (row: LoadedObjectParameter) =>
  toPlainText(primaryField.value ? primaryField.value.render(row) : '')
const statusText = (row: LoadedObjectParameter) =>
  statusField.value ? toPlainText(statusField.value.render(row)) : ''
const statusClass = (row: LoadedObjectParameter) => {
  void row
  return ''
}

const FieldRenderer = defineComponent({
  name: 'FieldRenderer',
  props: {
    field: { type: Object as PropType<CardField>, required: true },
    row: { type: Object as PropType<LoadedObjectParameter>, required: true },
  },
  setup(props) {
    return () => props.field.render(props.row)
  },
})

const ActionsRenderer = defineComponent({
  name: 'ActionsRenderer',
  props: {
    row: { type: Object as PropType<LoadedObjectParameter>, required: true },
  },
  setup(props) {
    return () => renderActions(props.row)
  },
})

const openCreate = () => {
  resetFormValidation()
  parameterMutations.create.reset()
  message.info('Создание параметра будет доступно позднее')
}

const openEdit = (row: LoadedObjectParameter) => {
  resetFormValidation()
  parameterMutations.update.reset()
  message.info(`Редактирование параметра «${row.name}» пока недоступно`)
}

const deleteParameter = (row: LoadedObjectParameter) => {
  parameterMutations.remove.reset()
  message.warning(`Удаление параметра «${row.name}» временно недоступно`)
}
</script>

<style scoped lang="scss">
.object-parameters-page {
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

.name-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.name-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.toolbar__left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 18px;
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

.toolbar__search {
  width: 280px;
  max-width: 100%;
}

.tag-unit {
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

.range-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}

.range-cell__item {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.range-cell__label {
  color: #6b7280;
  font-size: 11px;
  line-height: 1.2;
}

.range-cell__value {
  font-weight: 500;
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
  grid-template-columns: 140px 1fr;
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
    grid-template-columns: 110px 1fr;
  }
}
</style>
