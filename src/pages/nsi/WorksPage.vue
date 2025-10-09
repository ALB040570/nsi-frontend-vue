<!-- Файл: src/pages/nsi/WorksPage.vue
     Назначение: справочник технологических работ по содержанию и восстановлению объектов.
     Использование: подключается в маршрутизаторе по пути /nsi/works. -->
<template>
  <section class="works-page">
    <NCard size="small" class="toolbar" content-style="padding: 10px 14px">
      <div class="toolbar__left">
        <h2 class="page-title">
          Справочник «Технологические работы»
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
          Перечень работ по текущему содержанию и восстановлению работоспособности обслуживаемых объектов
        </div>
      </div>

      <div class="toolbar__controls">
        <NInput v-model:value="q" placeholder="Поиск…" clearable round class="toolbar__search" />
        <div class="toolbar__filters">
          <NSelect
            v-model:value="workTypeFilter"
            :options="workTypeOptions"
            placeholder="Вид работы"
            clearable
            size="small"
            class="toolbar__select"
          />
          <NSelect
            v-model:value="objectTypeFilter"
            :options="objectTypeOptions"
            placeholder="Тип объекта"
            clearable
            size="small"
            class="toolbar__select"
          />
          <NSelect
            v-model:value="sourceFilter"
            :options="sourceOptions"
            placeholder="Источник"
            clearable
            size="small"
            class="toolbar__select"
          />
          <NSelect
            v-model:value="periodTypeFilter"
            :options="periodTypeOptions"
            placeholder="Периодичность"
            clearable
            size="small"
            class="toolbar__select"
          />
        </div>
        <NButton type="primary" @click="openCreate">+ Добавить работу</NButton>
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

      <div v-else class="cards" role="list">
        <article
          v-for="item in rows"
          :key="item.id"
          class="card"
          role="group"
          :aria-label="primaryTitle(item)"
        >
          <header class="card__header">
            <h4 class="card__title">{{ primaryTitle(item) }}</h4>
          </header>

          <dl class="card__grid">
            <template
              v-for="(field, fieldIndex) in infoFields"
              :key="`${item.id}:${field.key || field.label || fieldIndex}`"
            >
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
          aria-label="Постраничная навигация по технологическим работам"
        >
          <template #prefix>
            <span class="pagination-total">Всего: {{ total }}</span>
          </template>
        </NPagination>
      </div>
    </div>

    <NModal v-model:show="infoOpen" preset="card" title="О справочнике работ" style="max-width: 520px">
      <p class="text-body">
        Справочник содержит технологические работы по содержанию и восстановлению обслуживаемых объектов.
        В таблице указаны вид работы, тип объекта, источник регламента и периодичность выполнения.
      </p>
      <template #footer>
        <div class="modal-footer">
          <NButton type="primary" @click="infoOpen = false">Понятно</NButton>
        </div>
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
  watchEffect,
  type PropType,
  type VNodeChild,
} from 'vue'
import type { DataTableColumns } from 'naive-ui'
import {
  NButton,
  NCard,
  NDataTable,
  NIcon,
  NInput,
  NModal,
  NPagination,
  NSelect,
  NTag,
  NTooltip,
  useMessage,
} from 'naive-ui'
import { InformationCircleOutline, PencilOutline, TrashOutline } from '@vicons/ionicons5'

import { rpc } from '@shared/api'
import { extractRecords, normalizeText, toOptionalString } from '@shared/lib'

interface RawWorkTypeRecord {
  id?: number | string
  ID?: number | string
  name?: string
  NAME?: string
}

interface RawSourceRecord {
  id?: number | string
  ID?: number | string
  name?: string
  NAME?: string
}

interface RawPeriodTypeRecord {
  id?: number | string
  ID?: number | string
  name?: string
  NAME?: string
}

interface RawObjectTypeRelationRecord {
  idrom1?: number | string
  idrom2?: number | string
  namerom2?: string
}

interface RawWorkRecord {
  obj?: number | string
  cls?: number | string
  name?: string
  fullName?: string
  nameCollections?: string
  NumberSource?: string | number
  pvCollections?: number | string
  idCollections?: number | string
  fvPeriodType?: number | string
  pvPeriodType?: number | string
  Periodicity?: number | string
}

interface WorkTableRow {
  id: string
  name: string
  fullName: string | null
  workTypeId: string | null
  workTypeName: string | null
  objectTypeName: string | null
  sourceId: string | null
  sourceName: string | null
  sourceNumber: string | null
  periodTypeId: string | null
  periodTypeName: string | null
  periodicityValue: number | null
  periodicityText: string
}

interface PaginationState {
  page: number
  pageSize: number
}

interface CardField {
  key: string
  label: string
  render: (row: WorkTableRow) => VNodeChild
  isPrimary?: boolean
  isActions?: boolean
}

const tableLoading = ref(false)
const q = ref('')
const infoOpen = ref(false)
const workTypeFilter = ref<string | null>(null)
const objectTypeFilter = ref<string | null>(null)
const sourceFilter = ref<string | null>(null)
const periodTypeFilter = ref<string | null>(null)

const workTypeOptions = ref<Array<{ label: string; value: string }>>([])
const objectTypeOptions = ref<Array<{ label: string; value: string }>>([])
const sourceOptions = ref<Array<{ label: string; value: string }>>([])
const periodTypeOptions = ref<Array<{ label: string; value: string }>>([])

const pagination = reactive<PaginationState>({ page: 1, pageSize: 10 })
const works = ref<WorkTableRow[]>([])

const message = useMessage()

const directories = {
  workTypes: new Map<string, string>(),
  objectTypes: new Map<string, string>(),
  sources: new Map<string, string>(),
  periodTypes: new Map<string, string>(),
}

const isMobile = ref(false)
if (typeof window !== 'undefined') {
  isMobile.value = window.matchMedia('(max-width: 768px)').matches
}

let mediaQueryList: MediaQueryList | null = null
const handleMediaQueryChange = (event: MediaQueryList | MediaQueryListEvent) => {
  isMobile.value = 'matches' in event ? event.matches : false
}

const filteredRows = computed(() => {
  const search = normalizeText(q.value)

  return works.value.filter((item) => {
    if (workTypeFilter.value && item.workTypeId !== workTypeFilter.value) return false
    if (objectTypeFilter.value && item.objectTypeName !== objectTypeFilter.value) return false
    if (sourceFilter.value && item.sourceId !== sourceFilter.value) return false
    if (periodTypeFilter.value && item.periodTypeId !== periodTypeFilter.value) return false

    if (search) {
      const inName = normalizeText(item.name).includes(search)
      const inFullName = normalizeText(item.fullName ?? '').includes(search)
      if (!inName && !inFullName) return false
    }

    return true
  })
})

const sortedRows = computed(() =>
  [...filteredRows.value].sort((a, b) => a.name.localeCompare(b.name, 'ru')),
)

const total = computed(() => sortedRows.value.length)
const paginatedRows = computed(() => {
  const start = Math.max(0, (pagination.page - 1) * pagination.pageSize)
  return sortedRows.value.slice(start, start + pagination.pageSize)
})
const rows = computed(() => paginatedRows.value)

const maxPage = computed(() => Math.max(1, Math.ceil(total.value / pagination.pageSize) || 1))

watch([q, workTypeFilter, objectTypeFilter, sourceFilter, periodTypeFilter], () => {
  pagination.page = 1
})

watch(
  () => pagination.pageSize,
  () => {
    pagination.page = 1
  },
)

watchEffect(() => {
  if (pagination.page > maxPage.value) {
    pagination.page = maxPage.value
  }
})

const renderName = (row: WorkTableRow): VNodeChild => {
  if (!row.fullName) {
    return h('span', { class: 'table-cell__primary' }, row.name)
  }

  return h(
    NTooltip,
    { placement: 'top' },
    {
      trigger: () => h('span', { class: 'table-cell__primary' }, row.name),
      default: () => row.fullName,
    },
  )
}

const renderSource = (row: WorkTableRow): VNodeChild => {
  if (!row.sourceName && !row.sourceNumber) return '—'

  const chip =
    row.sourceName != null
      ? h(
          NTag,
          {
            size: 'small',
            round: true,
            bordered: false,
            class: 'source-chip',
          },
          { default: () => row.sourceName },
        )
      : null

  const number = row.sourceNumber
    ? h('span', { class: 'source-number' }, `№ ${row.sourceNumber}`)
    : null

  if (!chip) return number ?? '—'
  if (!number) return chip

  return h('div', { class: 'source-cell' }, [chip, number])
}

const renderPeriodicity = (row: WorkTableRow): VNodeChild => row.periodicityText || '—'

const renderActions = (row: WorkTableRow): VNodeChild =>
  h('div', { class: 'table-actions' }, [
    h(
      NButton,
      {
        quaternary: true,
        size: 'small',
        onClick: () => editWork(row),
      },
      {
        icon: () =>
          h(NIcon, null, {
            default: () => h(PencilOutline),
          }),
      },
    ),
    h(
      NButton,
      {
        quaternary: true,
        size: 'small',
        type: 'error',
        onClick: () => removeWork(row),
      },
      {
        icon: () =>
          h(NIcon, null, {
            default: () => h(TrashOutline),
          }),
      },
    ),
  ])

const columns: DataTableColumns<WorkTableRow> = [
  {
    title: 'Работа',
    key: 'name',
    className: 'col-name',
    sorter: (a, b) => a.name.localeCompare(b.name, 'ru'),
    width: 240,
    render: renderName,
  },
  {
    title: 'Вид работы',
    key: 'workTypeName',
    render: (row) => row.workTypeName ?? '—',
  },
  {
    title: 'Тип объекта',
    key: 'objectTypeName',
    render: (row) => row.objectTypeName ?? '—',
  },
  {
    title: 'Источник и номер',
    key: 'sourceName',
    render: renderSource,
  },
  {
    title: 'Периодичность',
    key: 'periodicityText',
    render: renderPeriodicity,
  },
  {
    title: 'Действия',
    key: 'actions',
    className: 'col-actions',
    render: renderActions,
  },
]

const rowKey = (row: WorkTableRow) => row.id

const cardFields = computed<CardField[]>(() => [
  {
    key: 'name',
    label: 'Работа',
    render: renderName,
    isPrimary: true,
  },
  {
    key: 'workTypeName',
    label: 'Вид работы',
    render: (row) => row.workTypeName ?? '—',
  },
  {
    key: 'objectTypeName',
    label: 'Тип объекта',
    render: (row) => row.objectTypeName ?? '—',
  },
  {
    key: 'sourceName',
    label: 'Источник и номер',
    render: renderSource,
  },
  {
    key: 'periodicityText',
    label: 'Периодичность',
    render: renderPeriodicity,
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
const actionsField = computed(() => cardFields.value.find((field) => field.isActions))
const infoFields = computed(() =>
  cardFields.value.filter((field) => !field.isPrimary && !field.isActions),
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
    const childContainer = value as { children?: unknown }
    const { children } = childContainer
    if (Array.isArray(children)) return toPlainText(children as VNodeChild[])
    if (children != null) return toPlainText(children as VNodeChild)
    return ''
  }
  return String(value)
}

const primaryTitle = (row: WorkTableRow) =>
  toPlainText(primaryField.value ? primaryField.value.render(row) : '')

const FieldRenderer = defineComponent({
  name: 'FieldRenderer',
  props: {
    field: { type: Object as PropType<CardField>, required: true },
    row: { type: Object as PropType<WorkTableRow>, required: true },
  },
  setup(props) {
    return () => props.field.render(props.row)
  },
})

const ActionsRenderer = defineComponent({
  name: 'ActionsRenderer',
  props: {
    row: { type: Object as PropType<WorkTableRow>, required: true },
  },
  setup(props) {
    return () => renderActions(props.row)
  },
})

function openCreate() {
  message.info('Создание работ пока недоступно в прототипе')
}

function editWork(row: WorkTableRow) {
  message.info(`Редактирование работы «${row.name}» пока недоступно`)
}

function removeWork(row: WorkTableRow) {
  message.info(`Удаление работы «${row.name}» пока недоступно`)
}

function formatPeriodicityText(value: number | null, periodTypeName: string | null): string {
  if (value == null && !periodTypeName) return ''

  if (value == null || Number.isNaN(value)) {
    return periodTypeName ?? ''
  }

  const abs = Math.abs(value)
  const int = Math.trunc(abs)
  const decimals = Math.abs(value - int) > Number.EPSILON
  const base = decimals ? value.toString() : int.toString()

  const mod10 = int % 10
  const mod100 = int % 100
  const ending =
    !decimals && mod10 === 1 && mod100 !== 11
      ? 'раз'
      : !decimals && mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? 'раза'
        : 'раз'

  const times = `${base} ${ending}`
  if (periodTypeName) {
    return `${times} в ${periodTypeName}`
  }

  return times
}

async function loadWorks() {
  tableLoading.value = true
  try {
    const [workTypePayload, sourcePayload, periodTypePayload, objectTypePayload, worksPayload] =
      await Promise.all([
        rpc('data/loadClsForSelect', ['Typ_Work']),
        rpc('data/loadFvForSelect', ['Factor_Source']),
        rpc('data/loadFvForSelect', ['Factor_PeriodType']),
        rpc('data/loadComponentsObject2', ['RT_Works', 'Typ_Work', 'Typ_ObjectTyp']),
        rpc('data/loadProcessCharts', [0]),
      ])

    const workTypeRecords = extractRecords<RawWorkTypeRecord>(workTypePayload)
    const sourceRecords = extractRecords<RawSourceRecord>(sourcePayload)
    const periodTypeRecords = extractRecords<RawPeriodTypeRecord>(periodTypePayload)
    const objectTypeRecords = extractRecords<RawObjectTypeRelationRecord>(objectTypePayload)
    const workRecords = extractRecords<RawWorkRecord>(worksPayload)

    directories.workTypes.clear()
    directories.sources.clear()
    directories.periodTypes.clear()
    directories.objectTypes.clear()

    workTypeOptions.value = workTypeRecords
      .map((item) => {
        const id = toOptionalString(item.id ?? item.ID)
        const name = toOptionalString(item.name ?? item.NAME)
        if (!id || !name) return null
        directories.workTypes.set(id, name)
        return { label: name, value: id }
      })
      .filter((item): item is { label: string; value: string } => Boolean(item))
      .sort((a, b) => a.label.localeCompare(b.label, 'ru'))

    sourceOptions.value = sourceRecords
      .map((item) => {
        const id = toOptionalString(item.id ?? item.ID)
        const name = toOptionalString(item.name ?? item.NAME)
        if (!id || !name) return null
        directories.sources.set(id, name)
        return { label: name, value: id }
      })
      .filter((item): item is { label: string; value: string } => Boolean(item))
      .sort((a, b) => a.label.localeCompare(b.label, 'ru'))

    periodTypeOptions.value = periodTypeRecords
      .map((item) => {
        const id = toOptionalString(item.id ?? item.ID)
        const name = toOptionalString(item.name ?? item.NAME)
        if (!id || !name) return null
        directories.periodTypes.set(id, name)
        return { label: name, value: id }
      })
      .filter((item): item is { label: string; value: string } => Boolean(item))
      .sort((a, b) => a.label.localeCompare(b.label, 'ru'))

    const uniqueObjectTypes = new Map<string, string>()
    for (const record of objectTypeRecords) {
      const workId = toOptionalString(record.idrom1)
      const name = toOptionalString(record.namerom2)
      if (workId && name) {
        directories.objectTypes.set(workId, name)
        uniqueObjectTypes.set(name, name)
      }
    }

    objectTypeOptions.value = Array.from(uniqueObjectTypes.values())
      .map((name) => ({ label: name, value: name }))
      .sort((a, b) => a.label.localeCompare(b.label, 'ru'))

    const rowsData: WorkTableRow[] = []

    for (const record of workRecords) {
      const id = toOptionalString(record.obj)
      if (!id) continue

      const name = toOptionalString(record.name) ?? id
      const fullName = toOptionalString(record.fullName)
      const workTypeId = toOptionalString(record.cls)
      const objectTypeName = directories.objectTypes.get(id) ?? null

      let sourceId = toOptionalString(record.idCollections ?? record.pvCollections)
      const directorySourceName = sourceId ? directories.sources.get(sourceId) ?? null : null
      const fallbackSourceName = toOptionalString(record.nameCollections)
      const sourceName = directorySourceName ?? fallbackSourceName
      if (!sourceId && sourceName) {
        sourceId = `name:${sourceName}`
      }
      const sourceNumber = toOptionalString(record.NumberSource)

      const periodTypeId =
        toOptionalString(record.fvPeriodType ?? record.pvPeriodType) ?? null
      const periodTypeName = (periodTypeId && directories.periodTypes.get(periodTypeId)) || null

      const periodicityValueRaw = record.Periodicity
      const periodicityValue =
        typeof periodicityValueRaw === 'number'
          ? periodicityValueRaw
          : periodicityValueRaw != null
            ? Number(periodicityValueRaw)
            : null
      const periodicity =
        periodicityValue != null && Number.isFinite(periodicityValue)
          ? Number(periodicityValue)
          : null
      const periodicityText = formatPeriodicityText(periodicity, periodTypeName)

      rowsData.push({
        id,
        name,
        fullName,
        workTypeId,
        workTypeName: (workTypeId && directories.workTypes.get(workTypeId)) || null,
        objectTypeName,
        sourceId,
        sourceName,
        sourceNumber,
        periodTypeId,
        periodTypeName,
        periodicityValue: periodicity,
        periodicityText,
      })
    }

    const existingValues = new Set(sourceOptions.value.map((option) => option.value))
    let sourcesChanged = false
    for (const row of rowsData) {
      if (!row.sourceId || existingValues.has(row.sourceId)) continue
      const label = row.sourceName ?? row.sourceNumber ?? row.sourceId.replace(/^name:/, '')
      sourceOptions.value.push({ label, value: row.sourceId })
      existingValues.add(row.sourceId)
      sourcesChanged = true
    }
    if (sourcesChanged) {
      sourceOptions.value.sort((a, b) => a.label.localeCompare(b.label, 'ru'))
    }

    works.value = rowsData
  } catch (error) {
    message.error(error instanceof Error ? error.message : 'Не удалось загрузить работы')
  } finally {
    tableLoading.value = false
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    mediaQueryList = window.matchMedia('(max-width: 768px)')
    handleMediaQueryChange(mediaQueryList)
    mediaQueryList.addEventListener('change', handleMediaQueryChange)
  }
  void loadWorks()
})

onBeforeUnmount(() => {
  if (mediaQueryList) {
    mediaQueryList.removeEventListener('change', handleMediaQueryChange)
    mediaQueryList = null
  }
})
</script>

<style scoped>
.works-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.table-stretch {
  width: 100%;
}

.table-area {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
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

:deep(.n-data-table .n-data-table-th[data-col-key='name']),
:deep(.n-data-table .n-data-table-td.col-name) {
  width: 220px;
  max-width: 260px;
}

:deep(.n-data-table .n-data-table-th[data-col-key='actions']),
:deep(.n-data-table .n-data-table-td.col-actions) {
  width: 120px;
  text-align: right;
}

:deep(.n-data-table thead th) {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--n-table-header-color, var(--n-card-color, #fff));
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.08);
}

.toolbar {
  display: flex;
  gap: 16px;
}

.toolbar__left {
  flex: 1;
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

.page-title__info {
  margin-left: 4px;
}

.subtext {
  margin-top: 4px;
  color: var(--text-color-3);
  font-size: 14px;
  max-width: 680px;
}

.toolbar__controls {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px;
  align-items: center;
}

.toolbar__search {
  width: 240px;
}

.toolbar__filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.toolbar__select {
  width: 160px;
}

.table-actions {
  display: flex;
  gap: 4px;
}

.table-cell__primary {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.source-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}

.source-chip {
  background: #eef2ff;
  color: #312e81;
  font-weight: 500;
}

.source-number {
  color: var(--text-color-2);
  font-size: 13px;
  line-height: 1.4;
  white-space: normal;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.text-body {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}

.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.pagination-total {
  margin-right: 12px;
  font-size: 14px;
  color: var(--n-text-color-3);
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

@media (max-width: 768px) {
  .toolbar__controls {
    justify-content: stretch;
  }

  .toolbar__search {
    flex: 1 1 100%;
  }

  .toolbar__filters {
    width: 100%;
  }

  .toolbar__select {
    flex: 1 1 150px;
  }
}

@media (max-width: 360px) {
  .card__grid {
    grid-template-columns: 100px 1fr;
  }
}
</style>
