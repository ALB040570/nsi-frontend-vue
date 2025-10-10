<template>
  <section class="sources-page">
    <NCard size="small" class="toolbar" content-style="padding: 16px 18px">
      <div class="toolbar__header">
        <h2 class="page-title">Справочник "Источники (нормативные документы)"</h2>
        <NButton type="primary" @click="openCreate">+ Добавить</NButton>
      </div>

      <div class="filters-grid">
        <NInput
          v-model:value="filterModel.search"
          placeholder="Поиск по наименованию или номеру"
          clearable
          class="filters-item filters-item--wide"
        />
        <NSelect
          v-model:value="filterModel.author"
          :options="authorOptions"
          placeholder="Орган (регулятор)"
          clearable
          class="filters-item"
        />
        <NDatePicker
          v-model:value="filterModel.approvalRange"
          type="daterange"
          format="dd.MM.yyyy"
          clearable
          placeholder="Дата утверждения"
          class="filters-item"
        />
        <NDatePicker
          v-model:value="filterModel.periodRange"
          type="daterange"
          format="dd.MM.yyyy"
          clearable
          placeholder="Период действия"
          class="filters-item"
        />
        <NSelect
          v-model:value="filterModel.departments"
          :options="departmentOptions"
          placeholder="Исполнитель (подразделение)"
          multiple
          filterable
          clearable
          class="filters-item filters-item--wide"
        />
        <div class="filters-actions">
          <NButton type="primary" @click="applyFilters">Применить</NButton>
          <NButton tertiary @click="resetFilters">Сбросить</NButton>
        </div>
      </div>
    </NCard>

    <div class="table-wrapper">
      <NDataTable
        class="sources-table"
        :columns="columns"
        :data="tableRows"
        :loading="tableLoading"
        :row-key="rowKey"
        :row-props="createRowProps"
        :bordered="false"
        size="small"
      />

      <div v-if="!tableLoading && !tableRows.length" class="empty-state">
        <NEmpty description="Нет данных" />
      </div>

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
  NSelect,
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

interface SourceTableRow extends SourceCollectionRecord {
  departmentIds: number[]
  files: SourceFileRecord[]
}

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
const sourceDetails = ref<Map<number, SourceDetailsResult>>(new Map())
const detailsLoading = ref<Record<number, boolean>>({})
const detailsRequests = new Map<number, Promise<SourceDetailsResult>>()

const filterModel = reactive<FiltersModel>({
  search: '',
  author: null,
  approvalRange: null,
  periodRange: null,
  departments: [],
})

const appliedFilters = ref<FiltersModel>({ ...filterModel })

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

function updateFormModel(value: SourcesFormModel) {
  formModel.value = value
}

const authorOptions = computed<SelectOption[]>(() => {
  const authors = new Set<string>()
  for (const item of sources.value) {
    if (item.DocumentAuthor) {
      authors.add(item.DocumentAuthor)
    }
  }
  return Array.from(authors)
    .map((author) => ({ label: author, value: author }))
    .sort((a, b) => String(a.label).localeCompare(String(b.label), 'ru'))
})

const enrichedSources = computed<SourceTableRow[]>(() => {
  return sources.value.map((item) => {
    const details = sourceDetails.value.get(item.id)
    return {
      ...item,
      departmentIds: details?.departmentIds ?? [],
      files: details?.files ?? [],
    }
  })
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

const filteredSources = computed(() => {
  const filters = appliedFilters.value
  const search = filters.search.trim().toLowerCase()

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

    if (filters.departments.length > 0) {
      if (!item.departmentIds.some((id) => filters.departments.includes(id))) {
        return false
      }
    }

    if (search) {
      const nameMatch = item.name?.toLowerCase().includes(search)
      const numberMatch = item.DocumentNumber?.toLowerCase().includes(search)
      if (!nameMatch && !numberMatch) return false
    }

    return true
  })
})

const sortedSources = computed(() =>
  [...filteredSources.value].sort((a, b) => a.name.localeCompare(b.name, 'ru')),
)

const total = computed(() => sortedSources.value.length)

const tableRows = computed(() => {
  const start = Math.max(0, (pagination.page - 1) * pagination.pageSize)
  return sortedSources.value.slice(start, start + pagination.pageSize)
})

const columns: DataTableColumns<SourceTableRow> = [
  {
    title: 'Наименование документа',
    key: 'name',
    sorter: (a, b) => a.name.localeCompare(b.name, 'ru'),
    render: (row) => row.name || '—',
  },
  {
    title: 'Номер',
    key: 'DocumentNumber',
    render: (row) => row.DocumentNumber || '—',
  },
  {
    title: 'Дата утверждения',
    key: 'DocumentApprovalDate',
    render: (row) => formatDateIsoToRu(row.DocumentApprovalDate),
  },
  {
    title: 'Орган (регулятор)',
    key: 'DocumentAuthor',
    render: (row) => row.DocumentAuthor || '—',
  },
  {
    title: 'Период действия',
    key: 'period',
    render: (row) => formatPeriod(row.DocumentStartDate, row.DocumentEndDate),
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

function rowKey(row: SourceTableRow): DataTableRowKey {
  return row.id
}

function createRowProps(row: SourceTableRow) {
  return {
    onClick: () => {
      void ensureSourceDetails(row.id)
    },
  }
}

function renderDepartments(row: SourceTableRow): VNodeChild {
  const loading = detailsLoading.value[row.id]
  if (loading) {
    return h('span', { class: 'cell-muted' }, 'Загрузка…')
  }

  const names = row.departmentIds
    .map((id) => deptById.value.get(id))
    .filter((name): name is string => Boolean(name))

  if (!names.length) {
    return '—'
  }

  const chips: VNodeChild[] = []
  const limit = 3
  const visible = names.slice(0, limit)
  const hidden = names.slice(limit)

  for (const name of visible) {
    chips.push(h('span', { class: 'executor-chip' }, name))
  }

  if (hidden.length) {
    chips.push(
      h(
        NTooltip,
        { placement: 'top' },
        {
          trigger: () => h('span', { class: 'executor-chip executor-chip--more' }, `+${hidden.length}`),
          default: () => hidden.join(', '),
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

function renderFile(row: SourceTableRow): VNodeChild {
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
      [h(NIcon, { component: DocumentTextOutline }), h('span', { class: 'file-link__text' }, name)],
    )
  }

  return h('span', { class: 'file-link' }, [
    h(NIcon, { component: DocumentTextOutline }),
    h('span', { class: 'file-link__text' }, name),
  ])
}

const actionOptions: DropdownOption[] = [
  { label: 'Редактировать', key: 'edit' },
  { label: 'Удалить', key: 'delete' },
]

function handleAction(key: string | number, row: SourceTableRow) {
  if (key === 'edit') {
    void openEdit(row)
  } else if (key === 'delete') {
    void handleDelete(row)
  }
}

function renderActions(row: SourceTableRow): VNodeChild {
  return h(
    NDropdown,
    {
      options: actionOptions,
      onSelect: (key: string | number) => handleAction(key, row),
    },
    {
      default: () =>
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            circle: true,
            loading: removingId.value === row.id,
            disabled: removingId.value === row.id,
            'aria-label': `Действия над документом ${row.name}`,
          },
          { icon: () => h(NIcon, { component: EllipsisVertical }) },
        ),
    },
  )
}

async function ensureSourceDetails(id: number): Promise<SourceDetailsResult | undefined> {
  const existing = sourceDetails.value.get(id)
  if (existing) return existing

  const pending = detailsRequests.get(id)
  if (pending) return pending

  const request = (async () => {
    detailsLoading.value = { ...detailsLoading.value, [id]: true }
    try {
      const details = await loadDepartmentsWithFile(id)
      const next = new Map(sourceDetails.value)
      next.set(id, details)
      sourceDetails.value = next
      return details
    } catch (error) {
      message.error(getErrorMessage(error))
      return undefined
    } finally {
      const rest = { ...detailsLoading.value }
      delete rest[id]
      detailsLoading.value = rest
      detailsRequests.delete(id)
    }
  })()

  detailsRequests.set(id, request)
  return request
}

function cloneFilters(source: FiltersModel): FiltersModel {
  return {
    search: source.search,
    author: source.author,
    approvalRange: source.approvalRange ? [...source.approvalRange] as [number, number] : null,
    periodRange: source.periodRange ? [...source.periodRange] as [number, number] : null,
    departments: [...source.departments],
  }
}

function applyFilters() {
  appliedFilters.value = cloneFilters(filterModel)
  pagination.page = 1
}

function resetFilters() {
  filterModel.search = ''
  filterModel.author = null
  filterModel.approvalRange = null
  filterModel.periodRange = null
  filterModel.departments = []
  applyFilters()
}

watch(
  () => pagination.pageSize,
  () => {
    pagination.page = 1
  },
)

watchEffect(() => {
  const maxPage = Math.max(1, Math.ceil((sortedSources.value.length || 0) / pagination.pageSize) || 1)
  if (pagination.page > maxPage) {
    pagination.page = maxPage
  }
})

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
    appliedFilters.value = cloneFilters(filterModel)
    pagination.page = 1
    void Promise.all(records.map((record) => ensureSourceDetails(record.id).catch(() => undefined)))
  } catch (error) {
    message.error(getErrorMessage(error))
  } finally {
    tableLoading.value = false
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

async function openEdit(row: SourceTableRow) {
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
  const details = sourceDetails.value.get(row.id)
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
      await saveDepartment(newId, state.departmentIds)
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

async function handleDelete(row: SourceTableRow) {
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
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.filters-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.filters-item {
  flex: 1 1 200px;
}

.filters-item--wide {
  flex-basis: 240px;
}

.filters-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
}

.table-wrapper {
  background: var(--n-color);
  border-radius: 12px;
  padding: 12px 16px 16px;
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

.executor-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.executor-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--n-color-hover);
  font-size: 12px;
}

.executor-chip--more {
  background: var(--n-color-pressed);
}

.file-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--n-primary-color);
  text-decoration: none;
}

.file-link__text {
  text-decoration: underline;
}

.cell-muted {
  color: var(--n-text-color-3);
}

@media (max-width: 768px) {
  .sources-page {
    padding: 8px;
  }

  .filters-grid {
    flex-wrap: wrap;
  }

  .filters-item {
    flex: 1 1 calc(50% - 12px);
  }

  .filters-item--wide {
    flex-basis: 100%;
  }

  .filters-actions {
    width: 100%;
    justify-content: space-between;
  }

  .pagination-bar {
    justify-content: center;
  }
}

@media (max-width: 360px) {
  .filters-item {
    flex: 1 1 100%;
  }

  .filters-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .filters-actions .n-button {
    width: 100%;
  }

  .executor-cell {
    flex-direction: column;
    align-items: flex-start;
  }

  .file-link__text {
    font-size: 13px;
  }
}
</style>
