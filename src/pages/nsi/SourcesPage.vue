<template>
  <section class="sources-page">
    <NCard size="small" class="toolbar" content-style="padding: 10px 14px">
      <div class="toolbar__header">
        <div class="toolbar__info">
          <h2 class="page-title">Справочник «Источники (нормативные документы)»</h2>
          <p class="subtext">
            Управляйте перечнем нормативных документов, регламентирующих сервисную деятельность.
          </p>
        </div>
        <NButton type="primary" class="toolbar__add" @click="openCreate">Добавить документ</NButton>
      </div>

      <div class="toolbar__filters">
        <NInput
          v-model:value="filterModel.search"
          placeholder="Поиск..."
          clearable
          round
          class="toolbar__search"
        />
        <NSelect
          v-model:value="filterModel.author"
          :options="authorOptions"
          placeholder="Орган (регулятор)"
          clearable
          size="small"
          class="toolbar__control"
        />
        <NDatePicker
          v-model:value="filterModel.approvalRange"
          type="daterange"
          format="dd.MM.yyyy"
          clearable
          size="small"
          placeholder="Дата утверждения"
          class="toolbar__control"
        />
        <NDatePicker
          v-model:value="filterModel.periodRange"
          type="daterange"
          format="dd.MM.yyyy"
          clearable
          size="small"
          placeholder="Период действия"
          class="toolbar__control"
        />
        <NSelect
          v-model:value="filterModel.departments"
          :options="departmentOptions"
          placeholder="Исполнитель (подразделение)"
          multiple
          filterable
          clearable
          size="small"
          class="toolbar__control toolbar__control--wide"
        />
      </div>
    </NCard>

    <div class="table-wrapper">
      <template v-if="isMobile">
        <div v-if="tableLoading" class="cards-loading">Загрузка...</div>
        <div v-else-if="!normalizedRows.length" class="empty-state">
          <NEmpty description="Нет данных" />
        </div>
        <div v-else class="cards-list">
          <NCard v-for="row in normalizedRows" :key="row.id" class="source-card">
            <template #header>
              <div class="card-header">
                <span class="card-title">{{ row.name || '—' }}</span>
              </div>
            </template>
            <template #header-extra>
              <NDropdown :options="actionOptions" trigger="click" @select="(key) => handleAction(key, row)">
                <NButton quaternary circle size="small">
                  <template #icon>
                    <NIcon>
                      <EllipsisVertical />
                    </NIcon>
                  </template>
                </NButton>
              </NDropdown>
            </template>

            <div class="card-section">
              <h4 class="card-section__title">Реквизиты</h4>
              <div class="requisites">
                <div class="requisites__row">
                  <span class="requisites__label">Номер:</span>
                  <NTag size="small" round class="requisites__tag">{{ row.DocumentNumber || '—' }}</NTag>
                </div>
                <div class="requisites__row">
                  <span class="requisites__label">Утвержд.:</span>
                  <NTag size="small" round type="info" class="requisites__tag">{{ row.formattedApprovalDate }}</NTag>
                </div>
                <div class="requisites__row">
                  <span class="requisites__label">Орган:</span>
                  <NTag size="small" round class="requisites__tag">{{ row.authorLabel }}</NTag>
                </div>
              </div>
            </div>

            <div class="card-section">
              <span class="card-section__title">Период действия</span>
              <span class="card-section__value">{{ row.periodText }}</span>
            </div>

            <div class="card-section">
              <span class="card-section__title">Исполнители</span>
              <div class="card-executors">
                <template v-if="row.detailsLoading">
                  <span class="cell-muted">Загрузка...</span>
                </template>
                <template v-else-if="row.deptLoadError">
                  <NTooltip trigger="hover">
                    <template #trigger>
                      <span class="cell-muted">—</span>
                    </template>
                    <span>Исполнители недоступны (ошибка сервера)</span>
                  </NTooltip>
                </template>
                <template v-else-if="!row.deptNames.length">
                  <span class="cell-muted">—</span>
                </template>
                <template v-else>
                  <NTag v-for="name in row.deptNames" :key="name" size="small" round class="executor-tag">
                    {{ name }}
                  </NTag>
                </template>
              </div>
            </div>

            <div class="card-section card-section--file">
              <span class="card-section__title">Файл</span>
              <div class="card-file">
                <template v-if="row.files[0]">
                  <a
                    v-if="row.files[0] && resolveFileUrl(row.files[0])"
                    class="file-link"
                    :href="resolveFileUrl(row.files[0])!"
                    target="_blank"
                    rel="noopener"
                  >
                    <NIcon size="18" class="file-link__icon">
                      <DocumentTextOutline />
                    </NIcon>
                    <span class="file-link__text">{{ resolveFileName(row.files[0]) }}</span>
                  </a>
                  <span v-else class="file-link__text">{{ resolveFileName(row.files[0]) }}</span>
                </template>
                <template v-else>
                  <span class="cell-muted">—</span>
                </template>
              </div>
            </div>
          </NCard>
        </div>
      </template>

      <template v-else>
        <NDataTable
          class="sources-table"
          :columns="columns"
          :data="normalizedRows"
          :loading="tableLoading"
          :row-key="rowKey"
          :row-props="createRowProps"
          :bordered="false"
          size="small"
        />

        <div v-if="!tableLoading && !normalizedRows.length" class="empty-state">
          <NEmpty description="Нет данных" />
        </div>
      </template>

      <div class="pagination-bar">
        <NPagination
          v-model:page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :item-count="total"
          :page-sizes="[10, 20, 50]"
          show-size-picker
          show-quick-jumper
        >
          <template #prefix>
            <span class="pagination-total">Всего: {{ total }}</span>
          </template>
        </NPagination>
      </div>
    </div>

    <NModal v-model:show="modalOpen" preset="card" :title="modalTitle" style="width: min(680px, 96vw)">
      <SourcesForm
        :model-value="formModel"
        :department-options="departmentOptions"
        :saving="formSaving"
        :errors="formErrors"
        @update:model-value="updateFormModel"
        @submit="handleSubmit"
        @cancel="handleCancel"
      />
    </NModal>
  </section>
</template>

<script setup lang="ts">
import { computed, h, onMounted, reactive, ref, watch, watchEffect, type VNodeChild } from 'vue'
import { useIsMobile } from '@/shared/composables/useIsMobile'

import {
  NButton,
  NCard,
  NDataTable,
  NDatePicker,
  NDropdown,
  NEmpty,
  NIcon,
  NInput,
  NModal,
  NPagination,
  NPopover,
  NSelect,
  NTag,
  NTooltip,
  useDialog,
  useMessage,
  type DataTableColumns,
  type DataTableRowKey,
  type DropdownOption,
  type SelectOption,
} from 'naive-ui'
import { DocumentTextOutline, EllipsisVertical } from '@vicons/ionicons5'

import SourcesForm, { type SourcesFormModel } from '@/components/nsi/SourcesForm.vue'
import {
  deleteSourceCollection,
  loadDepartments,
  loadDepartmentsWithFile,
  loadSourceCollections,
  saveDepartment,
  saveSourceCollectionIns,
  saveSourceCollectionUpd,
  type DepartmentRecord,
  type SaveSourceCollectionInsPayload,
  type SaveSourceCollectionUpdPayload,
  type SourceCollectionRecord,
  type SourceDetailsResult,
  type SourceFileRecord,
} from '@/api/rpc'
import { formatDateIsoToRu, formatPeriod, getErrorMessage, timestampToIsoDate } from '@shared/lib'


interface FiltersModel {
  search: string
  author: string | null
  approvalRange: [number, number] | null
  periodRange: [number, number] | null
  departments: number[]
}

interface SourceIdMeta {
  idDocumentNumber: number | null
  idDocumentApprovalDate: number | null
  idDocumentAuthor: number | null
  idDocumentStartDate: number | null
  idDocumentEndDate: number | null
}

interface SourceDetailsEntry extends SourceDetailsResult {
  loaded: boolean
  error: boolean
}

interface NormalizedRow extends SourceCollectionRecord {
  formattedApprovalDate: string
  periodText: string
  formattedStartDate: string
  formattedEndDate: string
  deptNames: string[]
  deptLoadError: boolean
  detailsLoading: boolean
  authorLabel: string
  files: SourceFileRecord[]
  departmentIds: number[]
}

interface SourceRow extends SourceCollectionRecord {
  formattedApprovalDate: string
  periodText: string
}

const { isMobile } = useIsMobile('(max-width: 720px)')


const message = useMessage()
const dialog = useDialog()

const departments = ref<DepartmentRecord[]>([])
const deptById = computed(() => {
  const map = new Map<number, string>()
  for (const item of departments.value) {
    map.set(item.id, item.name)
  }
  return map
})

const departmentOptions = computed<SelectOption[]>(() =>
  departments.value
    .map((item) => ({ label: item.name, value: item.id }))
    .sort((a, b) => String(a.label).localeCompare(String(b.label), 'ru')),
)

const sources = ref<SourceCollectionRecord[]>([])
const detailsCache = ref(new Map<number, SourceDetailsEntry>())
const detailsQueue: Array<() => void> = []
const detailsInFlight = new Map<number, Promise<SourceDetailsEntry>>()
let activeDetailsRequests = 0
const DETAILS_CONCURRENCY_LIMIT = 3

const filterModel = reactive<FiltersModel>({
  search: '',
  author: null,
  approvalRange: null,
  periodRange: null,
  departments: [],
})

const pagination = reactive({ page: 1, pageSize: 10 })
const tableLoading = ref(false)
const removingId = ref<number | null>(null)

const modalOpen = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const modalTitle = computed(() => (modalMode.value === 'edit' ? 'Редактирование документа' : 'Создание документа'))
let editingMeta: SourceIdMeta | null = null
let editingId: number | null = null
let initialDepartmentIds: number[] = []

const emptyFormState = (): SourcesFormModel => ({
  name: '',
  DocumentNumber: '',
  DocumentApprovalDate: null,
  DocumentAuthor: '',
  DocumentStartDate: null,
  DocumentEndDate: null,
  departmentIds: [],
  fileList: [],
})

const formErrors = ref<Partial<Record<keyof SourcesFormModel, string>>>({})
const formSaving = ref(false)
const formModel = ref<SourcesFormModel>(emptyFormState())

const actionOptions: DropdownOption[] = [
  { label: 'Редактировать', key: 'edit' },
  { label: 'Удалить', key: 'delete' },
]

function updateFormModel(value: SourcesFormModel) {
  formModel.value = value
}

const authorOptions = computed<SelectOption[]>(() => {
  const authors = new Set<string>()
  for (const item of sources.value) {
    if (item.DocumentAuthor) {
      const trimmed = item.DocumentAuthor.trim()
      if (trimmed) {
        authors.add(trimmed)
      }
    }
  }
  return Array.from(authors)
    .map((author) => ({ label: author, value: author }))
    .sort((a, b) => String(a.label).localeCompare(String(b.label), 'ru'))
})

function normalizeRange(range: [number, number] | null): [string, string] | null {
  if (!range) return null
  const [start, end] = range
  const startIso = timestampToIsoDate(start)
  const endIso = timestampToIsoDate(end)
  if (!startIso || !endIso) return null
  if (startIso <= endIso) return [startIso, endIso]
  return [endIso, startIso]
}

function normalizeText(value: string | null | undefined): string {
  if (value == null) return ''

  return value
    .toString()
    .toLocaleLowerCase('ru-RU')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function toSourceRow(record: SourceCollectionRecord): SourceRow {
  return {
    ...record,
    formattedApprovalDate: formatDateIsoToRu(record.DocumentApprovalDate),
    periodText: formatPeriod(record.DocumentStartDate, record.DocumentEndDate),
  }
}

function matchesQuery(row: SourceRow, query: string, deptNames: string[]): boolean {
  if (!query) return true
  const haystack = [
    row.name,
    row.DocumentNumber,
    row.DocumentAuthor,
    row.formattedApprovalDate,
    row.periodText,
    ...deptNames,
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => normalizeText(value))

  return haystack.some((value) => value.includes(query))
}

watch(
  () => pagination.pageSize,
  () => {
    pagination.page = 1
  },
)

watch(
  () => filterModel.departments.slice().sort((a, b) => a - b),
  (ids) => {
    if (ids.length) {
      ensureDetailsForIds(sources.value.map((item) => item.id))
    }
  },
)

watch(
  () => normalizeText(filterModel.search),
  (query) => {
    if (query) {
      ensureDetailsForIds(sources.value.map((item) => item.id))
    }
  },
)

watch(
  filterModel,
  () => {
    pagination.page = 1
  },
  { deep: true },
)

const enrichedSources = computed(() => sources.value.map(toSourceRow))

const filteredSources = computed(() => {
  const filters = filterModel
  const query = normalizeText(filters.search)

  return enrichedSources.value.filter((item) => {
    if (filters.author && item.DocumentAuthor !== filters.author) return false

    if (filters.approvalRange) {
      const normalized = normalizeRange(filters.approvalRange)
      if (!normalized) return false
      const [startIso, endIso] = normalized
      const date = item.DocumentApprovalDate
      if (!date || date < startIso || date > endIso) return false
    }

    if (filters.periodRange) {
      const normalized = normalizeRange(filters.periodRange)
      if (!normalized) return false
      const [rangeStart, rangeEnd] = normalized
      const docStart = item.DocumentStartDate ?? '0000-00-00'
      const docEnd = item.DocumentEndDate ?? '9999-12-31'
      if (docStart > rangeEnd || docEnd < rangeStart) return false
    }

    if (filters.departments.length) {
      const details = detailsCache.value.get(item.id)
      if (!details || (!details.loaded && !details.error)) {
        return false
      }
      if (details.error) {
        return false
      }
      if (!details.departmentIds.some((id) => filters.departments.includes(id))) {
        return false
      }
    }

    const details = detailsCache.value.get(item.id)
    const deptNames = details
      ? details.departmentIds
          .map((id) => deptById.value.get(id))
          .filter((name): name is string => Boolean(name))
      : []

    if (query && !matchesQuery(item, query, deptNames)) {
      return false
    }

    return true
  })
})

const sortedSources = computed(() =>
  [...filteredSources.value].sort((a, b) => a.name.localeCompare(b.name, 'ru')),
)

const total = computed(() => sortedSources.value.length)

const pagedSources = computed(() => {
  const start = Math.max(0, (pagination.page - 1) * pagination.pageSize)
  return sortedSources.value.slice(start, start + pagination.pageSize)
})
watchEffect(() => {
  const maxPage = Math.max(1, Math.ceil((sortedSources.value.length || 0) / pagination.pageSize) || 1)
  if (pagination.page > maxPage) {
    pagination.page = maxPage
  }
})
watchEffect(() => {
  const ids = pagedSources.value.map((item) => item.id)
  ensureDetailsForIds(ids)
})

const normalizedRows = computed<NormalizedRow[]>(() => {
  return pagedSources.value.map((row) => {
    const details = detailsCache.value.get(row.id)
    const departmentIds = details?.departmentIds ?? []
    const deptNames = departmentIds
      .map((id) => deptById.value.get(id))
      .filter((name): name is string => Boolean(name))
    const files = details?.files ?? []

    return {
      ...row,
      formattedApprovalDate: formatDateIsoToRu(row.DocumentApprovalDate),
      formattedStartDate: formatDateIsoToRu(row.DocumentStartDate),
      formattedEndDate: formatDateIsoToRu(row.DocumentEndDate),
      periodText: formatPeriod(row.DocumentStartDate, row.DocumentEndDate),
      deptNames,
      deptLoadError: Boolean(details?.error),
      detailsLoading: Boolean(detailsInFlight.get(row.id)),
      authorLabel: row.DocumentAuthor?.trim() || 'Не указан',
      files,
      departmentIds,
    }
  })
})

function ensureDetailsForIds(ids: number[]) {
  for (const id of ids) {
    void ensureSourceDetails(id)
  }
}

function enqueueDetails(task: () => void) {
  detailsQueue.push(task)
  processDetailsQueue()
}

function processDetailsQueue() {
  while (activeDetailsRequests < DETAILS_CONCURRENCY_LIMIT && detailsQueue.length) {
    const task = detailsQueue.shift()
    if (!task) continue
    activeDetailsRequests += 1
    task()
  }
}

function setDetails(id: number, entry: SourceDetailsEntry) {
  const next = new Map(detailsCache.value)
  next.set(id, entry)
  detailsCache.value = next
}

function ensureSourceDetails(id: number): Promise<SourceDetailsEntry> {
  if (!Number.isFinite(id)) {
    return Promise.resolve({ departmentIds: [], files: [], loaded: true, error: true })
  }

  if (detailsInFlight.has(id)) {
    return detailsInFlight.get(id)!
  }

  const cached = detailsCache.value.get(id)
  if (cached && (cached.loaded || cached.error)) {
    return Promise.resolve(cached)
  }

  const promise = new Promise<SourceDetailsEntry>((resolve) => {
    enqueueDetails(() => {
      void (async () => {
        try {
          const result = await loadDepartmentsWithFile(Number(id))
          const entry: SourceDetailsEntry = { ...result, loaded: true, error: false }
          setDetails(id, entry)
          resolve(entry)
        } catch (error) {
          console.debug('Failed to load departments for source', id, error)
          const entry: SourceDetailsEntry = { departmentIds: [], files: [], loaded: true, error: true }
          setDetails(id, entry)
          resolve(entry)
        } finally {
          activeDetailsRequests = Math.max(0, activeDetailsRequests - 1)
          detailsInFlight.delete(id)
          processDetailsQueue()
        }
      })()
    })
  })

  detailsInFlight.set(id, promise)
  return promise
}

const columns: DataTableColumns<NormalizedRow> = [
  {
    title: 'Наименование документа',
    key: 'name',
    sorter: (a, b) => a.name.localeCompare(b.name, 'ru'),
    render: (row) => row.name || '—',
  },
  {
    title: 'Реквизиты',
    key: 'requisites',
    render: renderRequisites,
  },
  {
    title: 'Период действия',
    key: 'period',
    render: (row) => row.periodText,
  },
  {
    title: 'Исполнители',
    key: 'departments',
    render: renderDepartments,
  },
  {
    title: 'Файл',
    key: 'file',
    render: renderFile,
  },
  {
    title: 'Действия',
    key: 'actions',
    render: renderActions,
  },
]

function rowKey(row: NormalizedRow): DataTableRowKey {
  return row.id
}

function createRowProps(row: NormalizedRow) {
  return {
    onClick: () => {
      void ensureSourceDetails(row.id)
    },
  }
}

function renderRequisites(row: NormalizedRow): VNodeChild {
  const rows = [
    { label: 'Номер', value: row.DocumentNumber || '—', type: 'default' as const },
    { label: 'Утвержд.', value: row.formattedApprovalDate, type: 'info' as const },
    { label: 'Орган', value: row.authorLabel, type: 'default' as const },
  ]

  return h(
    'div',
    { class: 'requisites' },
    rows.map((item) =>
      h('div', { class: 'requisites__row' }, [
        h('span', { class: 'requisites__label' }, `${item.label}:`),
        h(
          NTag,
          { size: 'small', round: true, type: item.type === 'info' ? 'info' : 'default', class: 'requisites__tag' },
          { default: () => item.value },
        ),
      ]),
    ),
  )
}

function renderDepartments(row: NormalizedRow): VNodeChild {
  if (row.detailsLoading) {
    return h('span', { class: 'cell-muted' }, 'Загрузка...')
  }

  if (row.deptLoadError) {
    return h(
      NTooltip,
      { placement: 'top' },
      {
        trigger: () => h('span', { class: 'cell-muted' }, '—'),
        default: () => 'Исполнители недоступны (ошибка сервера)',
      },
    )
  }

  if (!row.deptNames.length) {
    return '—'
  }

  const chips: VNodeChild[] = []
  const limit = 3
  const visible = row.deptNames.slice(0, limit)
  const hidden = row.deptNames.slice(limit)

  for (const name of visible) {
    chips.push(
      h(
        NTag,
        { size: 'small', round: true, class: 'executor-tag' },
        { default: () => name },
      ),
    )
  }

  if (hidden.length) {
    chips.push(
      h(
        NPopover,
        { placement: 'top', trigger: 'hover' },
        {
          trigger: () =>
            h(
              NTag,
              { size: 'small', round: true, class: 'executor-tag executor-tag--more' },
              { default: () => `+${hidden.length}` },
            ),
          default: () =>
            h(
              'div',
              { class: 'executor-popover' },
              hidden.map((name) => h('div', { class: 'executor-popover__item' }, name)),
            ),
        },
      ),
    )
  }

  return h('div', { class: 'executor-cell' }, chips)
}

function resolveFileName(file: SourceFileRecord): string {
  return (
    (typeof file.name === 'string' && file.name) ||
    (typeof file.fileName === 'string' && file.fileName) ||
    (typeof file.FileName === 'string' && file.FileName) ||
    (typeof file.title === 'string' && file.title) ||
    'Файл'
  )
}

function resolveFileUrl(file: SourceFileRecord): string | null {
  const candidates = [file.url, file.href, file.link, file.path, file.FilePath]
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate) {
      return candidate
    }
  }
  return null
}

function renderFile(row: NormalizedRow): VNodeChild {
  const file = row.files[0]
  if (!file) {
    return '—'
  }

  const name = resolveFileName(file)
  const url = resolveFileUrl(file)

  if (url) {
    return h(
      'a',
      {
        class: 'file-link',
        href: url,
        target: '_blank',
        rel: 'noopener',
      },
      [
        h(
          NIcon,
          { class: 'file-link__icon', size: 18 },
          { default: () => h(DocumentTextOutline) },
        ),
        h('span', { class: 'file-link__text' }, name),
      ],
    )
  }

  return h('span', { class: 'file-link__text' }, name)
}

function renderActions(row: NormalizedRow): VNodeChild {
  return h(
    NDropdown,
    {
      options: actionOptions,
      trigger: 'click',
      onSelect: (key: string) => handleAction(key, row),
    },
    {
      default: () =>
        h(
          NButton,
          { size: 'small', quaternary: true, circle: true, loading: removingId.value === row.id },
          {
            icon: () =>
              h(
                NIcon,
                null,
                { default: () => h(EllipsisVertical) },
              ),
          },
        ),
    },
  )
}

function handleAction(action: string, row: NormalizedRow) {
  if (action === 'edit') {
    void openEdit(row)
  }
  if (action === 'delete') {
    void handleDelete(row)
  }
}

function validateForm(): boolean {
  const errors: Partial<Record<keyof SourcesFormModel, string>> = {}
  const state = formModel.value

  if (!state.name.trim()) {
    errors.name = 'Укажите наименование'
  }
  if (!state.DocumentNumber.trim()) {
    errors.DocumentNumber = 'Укажите номер документа'
  }
  if (!state.DocumentApprovalDate) {
    errors.DocumentApprovalDate = 'Выберите дату утверждения'
  }
  if (!state.DocumentAuthor.trim()) {
    errors.DocumentAuthor = 'Укажите орган (регулятор)'
  }
  if (!state.departmentIds.length) {
    errors.departmentIds = 'Выберите хотя бы одного исполнителя'
  }

  formErrors.value = errors
  return Object.keys(errors).length === 0
}

function openCreate() {
  modalMode.value = 'create'
  formModel.value = emptyFormState()
  formErrors.value = {}
  modalOpen.value = true
  editingId = null
  editingMeta = null
  initialDepartmentIds = []
}

async function openEdit(row: NormalizedRow) {
  modalMode.value = 'edit'
  editingId = row.id
  editingMeta = {
    idDocumentNumber: row.idDocumentNumber ?? null,
    idDocumentApprovalDate: row.idDocumentApprovalDate ?? null,
    idDocumentAuthor: row.idDocumentAuthor ?? null,
    idDocumentStartDate: row.idDocumentStartDate ?? null,
    idDocumentEndDate: row.idDocumentEndDate ?? null,
  }
  await ensureSourceDetails(row.id)
  const details = detailsCache.value.get(row.id)
  initialDepartmentIds = details?.departmentIds ? [...details.departmentIds] : []
  formModel.value = {
    name: row.name ?? '',
    DocumentNumber: row.DocumentNumber ?? '',
    DocumentApprovalDate: row.DocumentApprovalDate ?? null,
    DocumentAuthor: row.DocumentAuthor ?? '',
    DocumentStartDate: row.DocumentStartDate ?? null,
    DocumentEndDate: row.DocumentEndDate ?? null,
    departmentIds: details?.departmentIds ? [...details.departmentIds] : [],
    fileList: [],
  }
  formErrors.value = {}
  modalOpen.value = true
}

function handleCancel() {
  modalOpen.value = false
}

async function handleSubmit() {
  if (!validateForm()) {
    message.error('Проверьте заполнение обязательных полей')
    return
  }

  formSaving.value = true
  try {
    const state = formModel.value
    if (modalMode.value === 'create') {
      const payload: SaveSourceCollectionInsPayload = {
        accessLevel: 1,
        name: state.name.trim(),
        DocumentNumber: state.DocumentNumber.trim(),
        DocumentApprovalDate: state.DocumentApprovalDate!,
        DocumentAuthor: state.DocumentAuthor.trim(),
        DocumentStartDate: state.DocumentStartDate,
        DocumentEndDate: state.DocumentEndDate,
      }
      const result = await saveSourceCollectionIns(payload)
      const newId = result.id
      if (typeof newId !== 'number') {
        throw new Error('Не удалось определить идентификатор созданного документа')
      }
      await saveDepartment(newId, state.departmentIds)
      await ensureSourceDetails(newId)
      await fetchSources()
      message.success('Документ создан')
    } else if (modalMode.value === 'edit' && editingId != null && editingMeta) {
      const payload: SaveSourceCollectionUpdPayload = {
        accessLevel: 1,
        id: editingId,
        cls: 1039,
        name: state.name.trim(),
        idDocumentNumber: editingMeta.idDocumentNumber,
        DocumentNumber: state.DocumentNumber.trim(),
        idDocumentApprovalDate: editingMeta.idDocumentApprovalDate,
        DocumentApprovalDate: state.DocumentApprovalDate!,
        idDocumentAuthor: editingMeta.idDocumentAuthor,
        DocumentAuthor: state.DocumentAuthor.trim(),
        idDocumentStartDate: editingMeta.idDocumentStartDate,
        DocumentStartDate: state.DocumentStartDate,
        idDocumentEndDate: editingMeta.idDocumentEndDate,
        DocumentEndDate: state.DocumentEndDate,
      }
      await saveSourceCollectionUpd(payload)
      const departmentsChanged =
        initialDepartmentIds.length !== state.departmentIds.length ||
        initialDepartmentIds.some((id) => !state.departmentIds.includes(id))
      if (departmentsChanged) {
        await saveDepartment(editingId, state.departmentIds)
        const existing = detailsCache.value.get(editingId)
        const entry: SourceDetailsEntry = {
          departmentIds: [...state.departmentIds],
          files: existing?.files ?? [],
          loaded: true,
          error: false,
        }
        setDetails(editingId, entry)
      }
      await fetchSources()
      message.success('Документ обновлён')
    }

    modalOpen.value = false
  } catch (error) {
    message.error(getErrorMessage(error))
  } finally {
    formSaving.value = false
  }
}

async function handleDelete(row: NormalizedRow) {
  const confirmed = await new Promise<boolean>((resolve) => {
    let resolved = false
    const finish = (result: boolean) => {
      if (resolved) return
      resolved = true
      resolve(result)
    }

    dialog.warning({
      title: 'Удаление документа',
      content: `Удалить документ “${row.name}”? Действие необратимо.`,
      positiveText: 'Удалить',
      negativeText: 'Отмена',
      maskClosable: false,
      onPositiveClick: () => finish(true),
      onNegativeClick: () => finish(false),
      onClose: () => finish(false),
    })
  })

  if (!confirmed) return

  removingId.value = row.id
  try {
    await deleteSourceCollection(row.id)
    await fetchSources()
    message.success('Документ удалён')
  } catch (error) {
    message.error(getErrorMessage(error))
  } finally {
    removingId.value = null
  }
}

async function fetchDepartments() {
  try {
    const data = await loadDepartments()
    departments.value = data
  } catch (error) {
    message.error(getErrorMessage(error))
  }
}

async function fetchSources() {
  tableLoading.value = true
  try {
    const records = await loadSourceCollections()
    sources.value = records
    pagination.page = 1
  } catch (error) {
    message.error(getErrorMessage(error))
  } finally {
    tableLoading.value = false
  }
}

onMounted(() => {
  void fetchDepartments()
  void fetchSources()
})
</script>

<style scoped>
.sources-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 12px;
}

.toolbar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar__header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}

.toolbar__info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.subtext {
  margin: 0;
  font-size: 12px;
  color: var(--n-text-color-3);
  max-width: 720px;
}

.toolbar__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.toolbar__search {
  flex: 1 1 260px;
  min-width: 220px;
  max-width: 100%;
}

.toolbar__control {
  flex: 0 0 auto;
  min-width: 200px;
}

.toolbar__control--wide {
  min-width: 240px;
}

.table-wrapper {
  background: var(--n-color);
  border-radius: 16px;
  padding: 16px 20px 20px;
  box-shadow: var(--n-box-shadow);
}

.sources-table {
  min-height: 280px;
}

.empty-state {
  margin-top: 24px;
}

.pagination-bar {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.pagination-total {
  margin-right: 12px;
  color: var(--n-text-color-3);
}

.requisites {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.requisites__row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.requisites__label {
  color: var(--n-text-color-3);
  font-size: 12px;
}

.requisites__tag {
  white-space: normal;
  max-width: 100%;
}

.executor-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.executor-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.executor-tag--more {
  background: var(--n-color-pressed);
}

.executor-popover {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.executor-popover__item {
  white-space: nowrap;
}

.file-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--n-primary-color);
  text-decoration: none;
}

.file-link__icon {
  display: inline-flex;
}

.file-link__text {
  text-decoration: underline;
}

.cell-muted {
  color: var(--n-text-color-3);
}

.cards-loading {
  padding: 32px 0;
  text-align: center;
  color: var(--n-text-color-3);
}

.cards-list {
  display: grid;
  gap: 12px;
}

.source-card {
  border-radius: 16px;
  box-shadow: var(--n-box-shadow);
}

.card-header {
  display: flex;
  align-items: center;
}

.card-title {
  font-weight: 600;
  font-size: 16px;
}

.card-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.card-section__title {
  font-size: 13px;
  color: var(--n-text-color-3);
}

.card-section__value {
  font-weight: 500;
}

.card-section--file {
  gap: 6px;
}

.card-executors {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.card-file {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

@media (max-width: 720px) {
  .sources-page {
    padding: 8px;
  }

  .toolbar {
    padding: 16px;
  }

  .toolbar__header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .toolbar__filters {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar__search,
  .toolbar__control {
    width: 100%;
    min-width: 0;
  }

  .card-title {
    font-size: 15px;
  }
}

@media (max-width: 360px) {
  .card-section {
    margin-top: 10px;
  }
}
</style>
