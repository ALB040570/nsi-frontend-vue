<!-- Страница: src/pages/nsi/ResourcesPage.vue
     Назначение: Верстка справочника «Ресурсы» с единым списком и типом ресурса, CRUD на фронте (пока без API).
     Использование: роут /nsi/resources (с фильтром по типу через query ?type=materials|equipment|tools|third-party). -->
<template>
  <section class="resources-page">
    <NCard size="small" class="toolbar" content-style="padding: 10px 14px">
      <div class="toolbar__left">
        <h2 class="page-title">
          Ресурсы
          <NButton
            quaternary
            circle
            size="small"
            class="page-title__info"
            aria-label="Подсказка по разделу"
            @click="infoOpen = true"
          >
            <template #icon>
              <NIcon><InformationCircleOutline /></NIcon>
            </template>
          </NButton>
        </h2>
        <div class="subtext">Ведите единые списки ресурсов</div>
      </div>

      <div class="toolbar__controls">
        <NInput
          v-model:value="search"
          placeholder="Поиск по названию и описанию"
          clearable
          round
          class="toolbar__search"
        />

        <div class="toolbar__filters">
          <NSelect
            v-model:value="typeFilter"
            :options="typeOptions"
            clearable
            filterable
            size="small"
            class="toolbar__select"
            placeholder="Вид ресурса"
            @update:value="handleTypeFilterUpdate"
          />
        </div>

        <NSelect
          v-if="isMobile"
          v-model:value="sortOrder"
          :options="sortOptions"
          size="small"
          class="toolbar__select"
          aria-label="Сортировка"
        />

        <NButton type="primary" @click="openCreate">+ Добавить ресурс</NButton>
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
        size="small"
      />

      <div v-else class="cards" role="list">
        <div class="list-info">Показано: {{ visibleCount }} из {{ total }}</div>
        <article
          v-for="item in rows"
          :key="item.id"
          class="card"
          role="group"
          :aria-label="item.name"
        >
          <header class="card__header">
            <h4 class="card__title">{{ item.name }}</h4>
            <NTag size="small" :bordered="false" round type="info">{{ typeLabels[item.type] }}</NTag>
          </header>

          <dl class="card__grid">
            <dt>Ед. изм.</dt>
            <dd>{{ item.unit }}</dd>
            <dt>Описание</dt>
            <dd>{{ item.description || '-' }}</dd>
          </dl>

          <footer class="card__actions">
            <NButton quaternary circle size="small" title="Редактировать" @click="openEdit(item.id)">
              <template #icon><NIcon><PencilOutline /></NIcon></template>
            </NButton>
            <NPopconfirm @positive-click="() => remove(item.id)" positive-text="Удалить" negative-text="Отмена">
              <template #trigger>
                <NButton quaternary circle size="small" type="error" title="Удалить">
                  <template #icon><NIcon><TrashOutline /></NIcon></template>
                </NButton>
              </template>
              Удалить запись «{{ item.name }}»?
            </NPopconfirm>
          </footer>
        </article>
      </div>

      <div v-if="isMobile && pagination.page < maxPage" class="show-more-bar">
        <NButton tertiary @click="showMore" :loading="tableLoading">Показать ещё</NButton>
      </div>

      <div class="pagination-bar" v-if="!isMobile">
        <NPagination
          v-model:page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50]"
          :item-count="total"
          show-size-picker
          show-quick-jumper
        >
          <template #prefix>
            <span class="pagination-total">Всего: {{ total }}</span>
          </template>
        </NPagination>
      </div>
    </div>

    <!-- Инфо -->
    <NModal v-model:show="infoOpen" preset="card" title="О справочнике" style="max-width: 640px">
      <p>
        Справочник «Ресурсы» объединяет материалы, технику, инструменты и услуги сторонних в единую таблицу с полем «Вид ресурса». В меню доступны
        быстрые фильтры по видам.
      </p>
      <template #footer>
        <NButton type="primary" @click="infoOpen = false">Понятно</NButton>
      </template>
    </NModal>

    <!-- Форма создания/редактирования -->
    <NModal v-model:show="dialogOpen" preset="card" :title="dialogTitle" style="width: min(560px, 96vw)">
      <NForm :model="form" label-width="160px">
        <NFormItem label="Вид ресурса" :feedback="errors.type ?? undefined" :validation-status="errors.type ? 'error' : undefined">
          <NSelect v-model:value="form.type" :options="typeOptions" placeholder="Выберите вид ресурса" />
        </NFormItem>
        <NFormItem label="Название" :feedback="errors.name ?? undefined" :validation-status="errors.name ? 'error' : undefined">
          <NInput v-model:value="form.name" placeholder="Например: Щебень фр. 5-20" />
        </NFormItem>
        <NFormItem label="Единица измерения" :feedback="errors.unit ?? undefined" :validation-status="errors.unit ? 'error' : undefined">
          <NInput v-model:value="form.unit" placeholder="Например: т, м², ч" />
        </NFormItem>
        <NFormItem label="Описание">
          <NInput v-model:value="form.description" type="textarea" :autosize="{ minRows: 3, maxRows: 6 }" placeholder="Краткое описание" />
        </NFormItem>
      </NForm>
      <template #footer>
        <div class="modal-footer">
          <NButton @click="dialogOpen = false">Отмена</NButton>
          <NButton type="primary" class="btn-primary" @click="save">Сохранить</NButton>
        </div>
      </template>
    </NModal>
  </section>
  
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch, onMounted, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
  type DataTableColumn,
  type SelectOption,
  useMessage,
} from 'naive-ui'
import { InformationCircleOutline, CreateOutline, TrashOutline, PencilOutline } from '@vicons/ionicons5'
import { resourceRpc, rpc as nsiRpc } from '@shared/api'

type ResourceType = 'materials' | 'equipment' | 'tools' | 'third-party'

interface PaginationState { page: number; pageSize: number }

const router = useRouter()
const route = useRoute()

const infoOpen = ref(false)
const dialogOpen = ref(false)
const editingId = ref<string | null>(null)
const search = ref('')
const typeFilter = ref<ResourceType | null>(null)
const pagination = reactive<PaginationState>({ page: 1, pageSize: 10 })
const tableLoading = ref(false)
const sortOrder = ref<'name-asc' | 'name-desc'>('name-asc')
const sortOptions = [
  { label: 'По названию (А→Я)', value: 'name-asc' },
  { label: 'По названию (Я→А)', value: 'name-desc' },
]

const typeLabels: Record<ResourceType, string> = {
  materials: 'Материалы',
  equipment: 'Техника',
  tools: 'Инструменты',
  'third-party': 'Услуги сторонних',
}

const typeOptions = Object.entries(typeLabels).map(([value, label]) => ({ label, value })) as SelectOption[]

const message = useMessage()

type ResourceSource = 'remote' | 'custom'

interface ResourceRow {
  id: string
  type: ResourceType
  name: string
  unit: string
  description?: string
  source: ResourceSource
}

interface ResourceFormState {
  id: string
  type: ResourceType
  name: string
  unit: string
  description: string
}

interface ResourcePayloadBase {
  [key: string]: unknown
  name?: string | null
  Description?: string | null
}

interface MaterialResponse extends ResourcePayloadBase {
  meaMeasure?: string | number | null
  pvMeasure?: string | number | null
}

interface ServiceResponse extends ResourcePayloadBase {
  meaMeasure?: string | number | null
  pvMeasure?: string | number | null
}

type EquipmentResponse = ResourcePayloadBase

type ToolResponse = ResourcePayloadBase

interface MeasureResponse {
  id?: string | number | null
  pv?: string | number | null
  name?: string | null
}

const ARRAY_WRAPPER_KEYS = [
  'result',
  'Result',
  'data',
  'Data',
  'value',
  'Value',
  'items',
  'Items',
  'rows',
  'Rows',
]

const CUSTOM_LS_KEY = 'nsi.resources.custom'

const remoteItems = ref<ResourceRow[]>([])
const customItems = ref<ResourceRow[]>([])
const allItems = computed(() => [...customItems.value, ...remoteItems.value])

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function loadCustomFromStorage() {
  if (typeof localStorage === 'undefined') return
  try {
    const raw = localStorage.getItem(CUSTOM_LS_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as Array<Partial<ResourceRow>>
    if (!Array.isArray(parsed)) return
    customItems.value = parsed
      .filter((item): item is Partial<ResourceRow> & { id: string } => {
        return !!item && typeof item === 'object' && typeof item.id === 'string'
      })
      .map((item) => ({
        id: item.id,
        type: (item.type as ResourceType) ?? 'materials',
        name: formatText(item.name) || 'Без названия',
        unit: formatText(item.unit),
        description: item.description ? formatText(item.description) : '',
        source: 'custom',
      }))
  } catch (error) {
    console.warn('Не удалось прочитать пользовательские ресурсы из localStorage', error)
  }
}

function saveCustomToStorage() {
  if (typeof localStorage === 'undefined') return
  try {
    const payload = customItems.value.map((item) => {
      const { source: _ignored, ...rest } = item
      void _ignored
      return rest
    })
    localStorage.setItem(CUSTOM_LS_KEY, JSON.stringify(payload))
  } catch (error) {
    console.warn('Не удалось сохранить пользовательские ресурсы', error)
  }
}

type MeasureLookup = Map<string, string>

function formatText(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (value == null) return ''
  return String(value).trim()
}

function resolveName(value: unknown): string {
  const text = formatText(value)
  return text || 'Без названия'
}

function resolveDescription(value: unknown): string {
  return formatText(value)
}

function createMeasureKey(id?: unknown, pv?: unknown): string {
  const idPart = formatText(id)
  const pvPart = formatText(pv)
  return `${idPart}__${pvPart}`
}

function buildMeasureLookup(records: MeasureResponse[]): MeasureLookup {
  const map: MeasureLookup = new Map()
  for (const record of records) {
    const key = createMeasureKey(record.id, record.pv)
    if (!key) continue
    const name = formatText(record.name)
    if (!name) continue
    map.set(key, name)
  }
  return map
}

function unwrapArrayPayload<T>(payload: unknown): T[] {
  const visited = new Set<unknown>()
  const queue: unknown[] = [payload]
  let fallback: T[] | null = null

  while (queue.length) {
    const current = queue.shift()
    if (current == null) continue
    if (visited.has(current)) continue
    visited.add(current)

    if (Array.isArray(current)) {
      if (current.length) return current as T[]
      if (!fallback) fallback = current as T[]
      continue
    }

    if (typeof current === 'object') {
      const record = current as Record<string, unknown>

      for (const key of ARRAY_WRAPPER_KEYS) {
        if (key in record) {
          queue.push(record[key])
        }
      }

      for (const value of Object.values(record)) {
        queue.push(value)
      }
    }
  }

  return fallback ?? []
}

function resolveMeasureName(lookup: MeasureLookup, id?: unknown, pv?: unknown): string {
  const key = createMeasureKey(id, pv)
  if (!key) return ''
  return lookup.get(key) ?? ''
}

const ID_CANDIDATES = [
  'id',
  'Id',
  'ID',
  'idMaterial',
  'IdMaterial',
  'ID_Material',
  'idService',
  'IdService',
  'idEquipment',
  'IdEquipment',
  'idTool',
  'IdTool',
  'code',
  'Code',
  'guid',
  'Guid',
  'GUID',
  'Ref_Key',
  'refKey',
]

function resolveRowId(prefix: string, record: ResourcePayloadBase, fallbackIndex: number): string {
  for (const key of ID_CANDIDATES) {
    const value = record[key]
    const text = formatText(value)
    if (text) {
      return `${prefix}-${text}`
    }
  }

  return `${prefix}-${fallbackIndex}`
}

function createMaterialRows(materials: MaterialResponse[], measures: MeasureLookup): ResourceRow[] {
  return materials.map((material, index) => {
    const id = resolveRowId('material', material, index)
    const unit = resolveMeasureName(measures, material.meaMeasure, material.pvMeasure) || '—'
    return {
      id,
      type: 'materials',
      name: resolveName(material.name),
      unit,
      description: resolveDescription(material.Description),
      source: 'remote',
    }
  })
}

function createServiceRows(services: ServiceResponse[], measures: MeasureLookup): ResourceRow[] {
  return services.map((service, index) => {
    const id = resolveRowId('service', service, index)
    const unit = resolveMeasureName(measures, service.meaMeasure, service.pvMeasure) || '—'
    return {
      id,
      type: 'third-party',
      name: resolveName(service.name),
      unit,
      description: resolveDescription(service.Description),
      source: 'remote',
    }
  })
}

function createEquipmentRows(equipment: EquipmentResponse[]): ResourceRow[] {
  return equipment.map((item, index) => {
    const id = resolveRowId('equipment', item, index)
    return {
      id,
      type: 'equipment',
      name: resolveName(item.name),
      unit: 'единица',
      description: resolveDescription(item.Description),
      source: 'remote',
    }
  })
}

function createToolRows(tools: ToolResponse[]): ResourceRow[] {
  return tools.map((item, index) => {
    const id = resolveRowId('tool', item, index)
    return {
      id,
      type: 'tools',
      name: resolveName(item.name),
      unit: 'единица',
      description: resolveDescription(item.Description),
      source: 'remote',
    }
  })
}

async function fetchResources() {
  tableLoading.value = true
  try {
    const [materialsRaw, servicesRaw, equipmentRaw, toolsRaw, measuresRaw] = await Promise.all([
      resourceRpc<unknown>('data/loadMaterial', [0]),
      resourceRpc<unknown>('data/loadTpService', [0]),
      resourceRpc<unknown>('data/loadEquipment', [0]),
      resourceRpc<unknown>('data/loadTool', [0]),
      nsiRpc<unknown>('data/loadMeasure', ['Prop_Measure']),
    ])

    const measureLookup = buildMeasureLookup(unwrapArrayPayload<MeasureResponse>(measuresRaw))

    remoteItems.value = [
      ...createMaterialRows(unwrapArrayPayload<MaterialResponse>(materialsRaw), measureLookup),
      ...createServiceRows(unwrapArrayPayload<ServiceResponse>(servicesRaw), measureLookup),
      ...createEquipmentRows(unwrapArrayPayload<EquipmentResponse>(equipmentRaw)),
      ...createToolRows(unwrapArrayPayload<ToolResponse>(toolsRaw)),
    ]
  } catch (error) {
    console.error('Не удалось загрузить справочник ресурсов', error)
    const text = error instanceof Error ? error.message : 'Не удалось загрузить ресурсы'
    message.error(text)
    remoteItems.value = []
  } finally {
    tableLoading.value = false
  }
}

function setTypeFromQuery() {
  const q = String(route.query.type || '')
  if (q && ['materials', 'equipment', 'tools', 'third-party'].includes(q)) {
    typeFilter.value = q as ResourceType
  } else {
    typeFilter.value = null
  }
}

onMounted(() => {
  loadCustomFromStorage()
  setTypeFromQuery()
  void fetchResources()
})

watch(
  () => route.query.type,
  () => setTypeFromQuery(),
)

function handleTypeFilterUpdate(next: ResourceType | null) {
  const query = { ...route.query }
  if (next) {
    query.type = next
  } else {
    delete query.type
  }
  void router.replace({ path: route.path, query })
}

const normalizedSearch = computed(() => search.value.trim().toLocaleLowerCase('ru-RU'))

const filtered = computed(() => {
  const byType = typeFilter.value
    ? allItems.value.filter((r) => r.type === typeFilter.value)
    : allItems.value

  if (!normalizedSearch.value) return byType

  return byType.filter((r) => {
    const hay = `${r.name}\n${r.description || ''}`.toLocaleLowerCase('ru-RU')
    return hay.includes(normalizedSearch.value)
  })
})

const sortedRows = computed(() => {
  const arr = [...filtered.value]
  arr.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  return sortOrder.value === 'name-asc' ? arr : arr.reverse()
})

const total = computed(() => sortedRows.value.length)
const paginatedRows = computed(() => {
  const start = Math.max(0, (pagination.page - 1) * pagination.pageSize)
  return sortedRows.value.slice(start, start + pagination.pageSize)
})
const mobileRows = computed(() => sortedRows.value.slice(0, pagination.page * pagination.pageSize))
const rows = computed(() => (isMobile.value ? mobileRows.value : paginatedRows.value))
const visibleCount = computed(() => rows.value.length)
const maxPage = computed(() => Math.max(1, Math.ceil(total.value / pagination.pageSize) || 1))

watch([search, typeFilter], () => {
  pagination.page = 1
})

watch(
  () => pagination.pageSize,
  () => {
    pagination.page = 1
  },
)

watch(
  () => [pagination.page, total.value],
  () => {
    if (pagination.page > maxPage.value) pagination.page = maxPage.value
  },
  { immediate: true },
)

function showMore() {
  if (pagination.page < maxPage.value) pagination.page += 1
}

const rowKey = (row: ResourceRow) => row.id

const columns = computed<DataTableColumn<ResourceRow>[]>(() => [
  // порядок столбцов как на других страницах: сначала название
  {
    title: 'Название',
    key: 'name',
    sorter: (a, b) => a.name.localeCompare(b.name, 'ru'),
    width: 400,
    ellipsis: { tooltip: true },
    render: (row) => h('span', { class: 'table-cell__primary' }, row.name),
  },
  {
    title: 'Вид ресурса',
    key: 'type',
    width: 180,
    render: (row) => h(NTag, { size: 'small', bordered: false, round: true, type: 'info' }, { default: () => typeLabels[row.type] }),
  },
  { title: 'Ед. изм.', key: 'unit', width: 120 },
  { title: 'Описание', key: 'description', ellipsis: { tooltip: true } },
  {
    title: 'Действия',
    key: 'actions',
    width: 120,
    render(row) {
      const isCustom = row.source === 'custom'

      const editButton = h(
        NButton,
        {
          quaternary: true,
          circle: true,
          size: 'small',
          title: isCustom ? 'Редактировать' : 'Ресурс доступен только для чтения',
          disabled: !isCustom,
          onClick: () => (isCustom ? openEdit(row.id) : undefined),
        },
        { icon: () => h(NIcon, null, { default: () => h(CreateOutline) }) },
      )

      const removeButton = isCustom
        ? h(
            NPopconfirm,
            { onPositiveClick: () => remove(row.id), 'positive-text': 'Удалить', 'negative-text': 'Отмена' },
            {
              trigger: () =>
                h(
                  NButton,
                  {
                    quaternary: true,
                    circle: true,
                    size: 'small',
                    type: 'error',
                    title: 'Удалить',
                  },
                  { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) },
                ),
              default: () => `Удалить запись «${row.name}»?`,
            },
          )
        : h(
            NButton,
            {
              quaternary: true,
              circle: true,
              size: 'small',
              type: 'error',
              title: 'Ресурс доступен только для чтения',
              disabled: true,
            },
            { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) },
          )

      return h('div', { class: 'table-actions' }, [editButton, removeButton])
    },
  },
])

// CRUD для пользовательских записей (хранятся только на фронте)
const form = reactive<ResourceFormState>({ id: '', type: 'materials', name: '', unit: '', description: '' })
const errors = reactive<{ [K in keyof ResourceFormState]?: string | null }>({})

const dialogTitle = computed(() => (editingId.value ? 'Редактировать ресурс' : 'Добавить ресурс'))

function resetForm(partial?: Partial<ResourceFormState>) {
  form.id = partial?.id ?? ''
  form.type = partial?.type ?? (typeFilter.value ?? 'materials')
  form.name = partial?.name ?? ''
  form.unit = partial?.unit ?? ''
  form.description = partial?.description ?? ''
  errors.id = null
  errors.type = null
  errors.name = null
  errors.unit = null
  errors.description = null
}

function openCreate() {
  editingId.value = null
  resetForm()
  dialogOpen.value = true
}

function openEdit(id: string) {
  const row = customItems.value.find((r) => r.id === id)
  if (!row) {
    message.warning('Редактировать можно только добавленные вручную записи')
    return
  }

  editingId.value = id
  resetForm({
    id: row.id,
    type: row.type,
    name: row.name,
    unit: row.unit,
    description: row.description ?? '',
  })
  dialogOpen.value = true
}

function validate(): boolean {
  let ok = true
  errors.type = form.type ? null : 'Выберите вид'
  errors.name = formatText(form.name) ? null : 'Заполните название'
  errors.unit = formatText(form.unit) ? null : 'Заполните единицу измерения'
  if (errors.type || errors.name || errors.unit) ok = false
  return ok
}

function save() {
  if (!validate()) return

  const payload: ResourceRow = {
    id: editingId.value ?? `custom-${uid()}`,
    type: form.type,
    name: formatText(form.name),
    unit: formatText(form.unit),
    description: resolveDescription(form.description),
    source: 'custom',
  }

  if (editingId.value) {
    const idx = customItems.value.findIndex((r) => r.id === editingId.value)
    if (idx !== -1) {
      customItems.value.splice(idx, 1, payload)
    }
  } else {
    customItems.value = [payload, ...customItems.value]
  }

  saveCustomToStorage()
  dialogOpen.value = false
  editingId.value = null
}

function remove(id: string) {
  const next = customItems.value.filter((r) => r.id !== id)
  if (next.length === customItems.value.length) {
    message.warning('Удалять можно только добавленные вручную записи')
    return
  }
  customItems.value = next
  saveCustomToStorage()
}

const isMobile = computed(() => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false))
</script>

<style scoped>
.resources-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 12px;
}

.toolbar {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.toolbar__left { display: flex; flex-direction: column; gap: 6px; }
.page-title { display: flex; align-items: center; gap: 6px; margin: 0; font-size: 18px; }
.page-title__info { margin-left: 2px; }
.subtext { color: rgba(0,0,0,0.6); font-size: 12px; }

.toolbar__controls { display: flex; align-items: center; gap: 10px; }
.toolbar__search { width: 320px; max-width: 50vw; }
.toolbar__filters { display: inline-flex; align-items: center; gap: 8px; }
.toolbar__select { width: 240px; }

.table-area { display: flex; flex-direction: column; gap: 8px; }
.pagination-bar { display: flex; justify-content: flex-end; }

.table-actions { display: inline-flex; align-items: center; gap: 4px; }
.table-cell__primary { display: inline-flex; align-items: center; gap: 4px; }

/* Desktop table look-alike of other NSI pages */
.table-full { flex: 1; min-width: 0; }
:deep(.n-data-table .n-data-table-table) {
  border-collapse: separate;
  border-spacing: 0 12px;
  width: 100%;
}
:deep(.n-data-table .n-data-table-tbody .n-data-table-tr) {
  background: var(--n-card-color, var(--s360-bg));
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  overflow: hidden;
}
:deep(.n-data-table .n-data-table-tbody .n-data-table-td) {
  border-bottom: none; /* убираем двойные линии */
  padding: 0 12px;
  height: auto;
  line-height: 24px;
  vertical-align: middle;
}
:deep(.n-data-table thead th) {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--n-table-header-color, var(--n-card-color, var(--s360-bg)));
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.08);
}
:deep(.n-pagination) { font-size: 14px; }
.pagination-total { margin-right: 12px; font-size: 14px; color: var(--n-text-color-3); }

/* Mobile cards (как на других страницах) */
.cards { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; }
.list-info { font-size: 12px; color: var(--n-text-color-3); padding: 2px 2px 0; }
.card { border: 1px solid var(--s360-border); border-radius: 14px; padding: 12px; background: var(--s360-bg); box-shadow: 0 1px 4px rgba(0,0,0,0.04); max-width: 100%; width: 100%; box-sizing: border-box; }
.card__header, .card__actions { min-width: 0; }
.card__header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.card__title { margin: 0; font-weight: 600; overflow-wrap: anywhere; }
.card__grid { display: grid; grid-template-columns: 110px 1fr; gap: 6px 10px; margin: 10px 0; }
.card__grid dt { color: #6b7280; font-size: 12px; }
.card__grid dd { margin: 0; word-break: break-word; overflow-wrap: anywhere; }
.card__actions { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
.card__actions .table-actions { justify-content: flex-start; opacity: 1; }
.show-more-bar { display: flex; justify-content: center; margin-top: 10px; }

@media (max-width: 768px) {
  .toolbar { flex-direction: column; align-items: stretch; gap: 10px; }
  .toolbar__controls { flex-wrap: wrap; }
  .toolbar__search { width: 100%; max-width: none; }
  .toolbar__select { width: 100%; }
}
</style>
