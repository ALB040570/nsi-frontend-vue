<template>
  <section class="object-types-page">
    <header class="page-header">
      <div class="page-title">
        <h2 class="h2">Справочник "Типы обслуживаемых объектов"</h2>

        <p class="text-small">
          Здесь отображаются все доступные типы обслуживаемых объектов и их компоненты. Используйте
          «Создать», чтобы добавить новый.
        </p>
      </div>

      <div class="page-actions">
        <NInput v-model:value="q" placeholder="Поиск…" clearable style="width: 260px" />
        <NButton type="primary" @click="openCreate">+ Создать</NButton>
      </div>
    </header>

    <p class="text-body">
      Это перечень категорий инфраструктурных объектов, используемый для их классификации,
      планирования и учёта работ. Вы можете редактировать существующие типы, удалять или привязывать
      компоненты.
    </p>

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
          :key="item.id || item._id || item.key"
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
            <template
              v-for="field in infoFields"
              :key="
                (item.id || item._id || item.key || item.uuid || '') +
                ':' +
                (field.key || field.label)
              "
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

        <NFormItem label="Геометрия">
          <NRadioGroup v-model:value="form.geometry">
            <NRadioButton value="точка">Точка</NRadioButton>
            <NRadioButton value="линия">Линия</NRadioButton>
            <NRadioButton value="полигон">Полигон</NRadioButton>
          </NRadioGroup>
        </NFormItem>

        <NFormItem label="Компоненты">
          <div class="field-stack">
            <NSelect
              v-model:value="form.component"
              multiple
              filterable
              placeholder="Начните вводить, чтобы найти компонент"
              :options="componentSelectOptions"
              @blur="handleComponentBlur"
            />
            <p class="text-small" style="margin-top: 6px">
              Выбирайте компоненты из списка. Чтобы добавить новый компонент, напишите его название
              и нажмите Enter.
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
  </section>
</template>
<script setup lang="ts">
import {
  computed,
  reactive,
  ref,
  watch,
  watchEffect,
  nextTick,
  onMounted,
  onUpdated,
  onBeforeUnmount,
  h,
  defineComponent,
} from 'vue'

import type { PropType, VNodeChild } from 'vue'

import { useQuery, useQueryClient } from '@tanstack/vue-query'

import {
  NButton,
  NDataTable,
  NForm,
  NFormItem,
  NIcon,
  NInput,
  NModal,
  NPagination,
  NRadioButton,
  NRadioGroup,
  NSelect,
  NTag,
  NTooltip,
  useDialog,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'

import {
  CreateOutline,
  TrashOutline,
  ChevronUpOutline,
  EllipsisHorizontal,
} from '@vicons/ionicons5'

import { debounce } from 'lodash-es'

import { callRpc } from '@/lib/api'

import type { GeometryKind, ObjectType } from '@/types/nsi'

import type {
  ComponentOption,
  ComponentsByType,
  LoadFvForSelectResponse,
  SaveTypeObjectRequest,
  SaveTypeObjectResponse,
  DeleteTypeObjectRequest,
} from '@/types/nsi-remote'

import { normalizeGeometry } from '@/types/nsi-remote'

/* ---------- состояние раскрытия/обрезания чипов ---------- */

const expandedRows = ref<Set<number | string>>(new Set())

const hasMore = ref<Record<string | number, boolean>>({})

const cellRefs = new Map<number | string, HTMLElement>()

const roById = new Map<number | string, ResizeObserver>()

function toggleRow(id: string | number) {
  const set = expandedRows.value

  if (set.has(id)) {
    set.delete(id)
  } else {
    set.add(id)
  }

  // пересчитать после раскрытия/сворачивания

  nextTick(() => rafCheck(id))
}

// ref-коллбек, который Vue вызывает при монтировании/размонтаже ячейки

function setCellRef(id: string | number) {
  return (el: HTMLElement | null) => {
    // если раньше что-то было — отцепим старый обсервер

    const prevRo = roById.get(id)

    if (prevRo) {
      prevRo.disconnect()

      roById.delete(id)
    }

    if (!el) {
      // ячейка размонтировалась

      cellRefs.delete(id)

      // сбросим индикатор «есть продолжение»

      if (hasMore.value[id]) {
        const clone = { ...hasMore.value }

        delete clone[id]

        hasMore.value = clone
      }

      return
    }

    // ячейка смонтировалась

    cellRefs.set(id, el)

    // подписка на изменения размера (если доступно в браузере)

    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(() => rafCheck(id))

      ro.observe(el)

      roById.set(id, ro)
    }

    // первичный пересчёт

    rafCheck(id)
  }
}

// задержим пересчёт до кадра анимации — меньше «дёрганий»

function rafCheck(id: string | number) {
  requestAnimationFrame(() => checkOverflowFor(id))
}

function checkOverflowFor(id: string | number) {
  const el = cellRefs.get(id)

  if (!el) return

  if (expandedRows.value.has(id)) {
    if (hasMore.value[id] !== true) {
      hasMore.value = { ...hasMore.value, [id]: true }
    }
    return
  }

  // одна строка — по line-height, запас в 1px на округления

  const lh = parseFloat(getComputedStyle(el).lineHeight || '24') || 24

  const oneLineHeight = Math.ceil(lh)

  // "есть продолжение", если контент выше видимой высоты первой строки

  const hasVerticalOverflow = el.scrollHeight - 1 > Math.min(el.clientHeight, oneLineHeight)
  const hasHorizontalOverflow = el.scrollWidth - el.clientWidth > 1
  const more = hasVerticalOverflow || hasHorizontalOverflow

  // обновляем только если реально поменялось (чтобы не зациклить рендер)

  if (hasMore.value[id] !== more) {
    hasMore.value = { ...hasMore.value, [id]: more }
  }
}

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

onMounted(() =>
  nextTick(() => {
    for (const [id] of cellRefs) rafCheck(id)
  }),
)

onUpdated(() =>
  nextTick(() => {
    for (const [id] of cellRefs) rafCheck(id)
  }),
)

// при уходе со страницы выключим всё

onBeforeUnmount(() => {
  if (mediaQueryList) {
    mediaQueryList.removeEventListener('change', handleMediaQueryChange)
    mediaQueryList = null
  }

  for (const [, ro] of roById) ro.disconnect()

  roById.clear()

  cellRefs.clear()
})

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

interface RawObjectTypeRecord {
  id?: string | number | null

  name?: string | null

  nameCls?: string | null

  fvShape?: string | number | null

  pvShape?: string | number | null
}

interface RawComponentRecord {
  idrom1?: string | number | null

  idrom2?: string | number | null

  namerom2?: string | null
}

interface RawGeometryRecord {
  id?: string | number | null

  ID?: string | number | null

  pv?: string | number | null

  PV?: string | number | null

  name?: string | null

  value?: string | null

  code?: string | null
}

interface ObjectTypesSnapshot {
  items: ObjectType[]

  componentOptions: ComponentOption[]

  componentsByType: ComponentsByType

  geometryOptions: LoadFvForSelectResponse

  geometryIdByKind: Partial<Record<GeometryKind, string | null>>
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

const normalizeText = (v: string | null | undefined) => v?.trim().toLowerCase() ?? ''

const safeString = (v: unknown) => (v ?? '').toString()

const trimmedString = (v: unknown) => safeString(v).trim()

const toOptionalString = (v: unknown): string | null => {
  const s = trimmedString(v)

  return s ? s : null
}

function extractRecords<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[]

  if (payload && typeof payload === 'object') {
    const env = payload as any

    const r = env?.result?.records ?? env?.result?.data ?? env?.records ?? env?.data

    if (Array.isArray(r)) return r as T[]
  }

  return []
}

function getErrorMessage(error: unknown): string {
  if (!error) return ''

  if (error instanceof Error) return error.message

  return String(error)
}

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

/* ---------- загрузка данных ---------- */

async function fetchObjectTypes(): Promise<ObjectTypesSnapshot> {
  const [typesResponse, geometryResponse, componentsResponse] = await Promise.all([
    callRpc<unknown>('data/loadTypesObjects', [0]),

    callRpc<unknown>('data/loadFvForSelect', ['Factor_Shape']),

    callRpc<unknown>('data/loadComponentsObject2', [
      'RT_Components',
      'Typ_ObjectTyp',
      'Typ_Components',
    ]),
  ])

  const rawTypes = extractRecords<RawObjectTypeRecord>(typesResponse)

  const rawGeometry = extractRecords<RawGeometryRecord>(geometryResponse)

  const rawComponents = extractRecords<RawComponentRecord>(componentsResponse)

  const geometryOptions: LoadFvForSelectResponse = rawGeometry.map((option) => {
    const id = safeString(option.id ?? option.ID)

    const displayName = trimmedString(option.name ?? option.value ?? option.code) || id

    return {
      id,

      name: displayName,

      code: toOptionalString(option.code),

      value: toOptionalString(option.value),
    }
  })

  const geometryKindByFvId = new Map<string, GeometryKind>()
  const geometryKindByPvId = new Map<string, GeometryKind>()
  const geometryIdByKind: Partial<Record<GeometryKind, string | null>> = {}

  for (const option of rawGeometry) {
    const fvId = toOptionalString(option.id ?? option.ID)
    const pvId = toOptionalString(option.pv ?? option.PV)
    if (!fvId && !pvId) continue
    const geometryLabel = option.name ?? option.value ?? option.code ?? option.id ?? option.ID ?? ''
    const kind = normalizeGeometry(geometryLabel, geometryOptions)

    if (fvId) {
      geometryKindByFvId.set(fvId, kind)
      if (!geometryIdByKind[kind]) geometryIdByKind[kind] = fvId
    }
    if (pvId) geometryKindByPvId.set(pvId, kind)
  }

  const componentOptionsMap = new Map<string, ComponentOption>()
  const componentsByTypeMap = new Map<string, ComponentOption[]>()

  for (const link of rawComponents) {
    const typeId = toOptionalString(link.idrom1)
    const componentId = toOptionalString(link.idrom2)
    const componentName = toOptionalString(link.namerom2)
    if (!typeId || !componentId || !componentName) continue

    const key = normalizeText(componentName)
    let option = componentOptionsMap.get(key)

    if (!option) {
      option = { id: componentId, name: componentName }
      componentOptionsMap.set(key, option)
    }

    const list = componentsByTypeMap.get(typeId) ?? []
    list.push(option)
    componentsByTypeMap.set(typeId, list)
  }

  const componentOptions = Array.from(componentOptionsMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'ru'),
  )

  const componentsByType: ComponentsByType = {}

  for (const [typeId, list] of componentsByTypeMap.entries()) {
    const uniqueById = new Map<string, ComponentOption>()
    for (const c of list) if (!uniqueById.has(c.id)) uniqueById.set(c.id, c)
    componentsByType[typeId] = Array.from(uniqueById.values()).sort((a, b) =>
      a.name.localeCompare(b.name, 'ru'),
    )
  }

  const items: ObjectType[] = rawTypes.map((r) => {
    const id = safeString(r.id)
    const name = safeString(r.name ?? r.nameCls)
    const fvKey = toOptionalString(r.fvShape)
    const pvKey = toOptionalString(r.pvShape)
    const geometry =
      (fvKey ? geometryKindByFvId.get(fvKey) : undefined) ??
      (pvKey ? geometryKindByPvId.get(pvKey) : undefined) ??
      DEFAULT_GEOMETRY
    const componentNames = componentsByType[id]?.map((c) => c.name) ?? []
    return { id, name, geometry, component: componentNames }
  })
  return { items, componentOptions, componentsByType, geometryOptions, geometryIdByKind }
}

/* ---------- таблица/поиск/пагинация ---------- */

const qc = useQueryClient()
const message = useMessage()
const discreteDialog = useDialog()
const q = ref('')
const pagination = reactive<PaginationState>({ page: 1, pageSize: 10 })

let mediaQueryList: MediaQueryList | null = null
const handleMediaQueryChange = (e: MediaQueryList | MediaQueryListEvent) => {
  isMobile.value = 'matches' in e ? e.matches : false
}
const {
  data: snapshot,
  isLoading,
  isFetching,
  error,
} = useQuery({
  queryKey: ['object-types'],
  queryFn: fetchObjectTypes,
})

const fetchState = computed<FetchState>(() => ({
  isLoading: isLoading.value,
  isFetching: isFetching.value,
  isError: Boolean(error.value),
  errorMessage: getErrorMessage(error.value),
}))

const tableLoading = computed(() => fetchState.value.isLoading || fetchState.value.isFetching)

watch(
  () => fetchState.value.errorMessage,
  (m, p) => {
    if (m && m !== p) message.error(m)
  },
)

const objectTypes = computed(() => snapshot.value?.items ?? [])
const componentsByType = computed(() => snapshot.value?.componentsByType ?? {})
const componentOptions = computed(() => snapshot.value?.componentOptions ?? [])
const componentSelectOptions = computed(() =>
  componentOptions.value.map((option) => ({ label: option.name, value: option.name })),
)

const geometryOptions = computed(() => snapshot.value?.geometryOptions ?? [])
const geometryIdByKind = computed(() => snapshot.value?.geometryIdByKind ?? {})
const componentMapByName = computed(() => {
  const map = new Map<string, ComponentOption>()
  for (const o of componentOptions.value) map.set(normalizeText(o.name), o)
  return map
})

const filteredRows = computed(() => {
  const search = q.value.trim().toLowerCase()
  if (!search) return objectTypes.value
  return objectTypes.value.filter((item) =>
    Object.values(item).some((v) => v != null && String(v).toLowerCase().includes(search)),
  )
})

const total = computed(() => filteredRows.value.length)
const paginatedRows = computed(() => {
  const start = Math.max(0, (pagination.page - 1) * pagination.pageSize)
  return filteredRows.value.slice(start, start + pagination.pageSize)
})
const rows = computed(() => paginatedRows.value || [])
const rowKey = (row: ObjectType) => row.id
const renderActions = (row: ObjectType) => {
  const editButton = h(
    NTooltip,
    { placement: 'top' },
    {
      trigger: () =>
        h(
          NButton,
          {
            quaternary: true,
            circle: true,
            size: 'small',
            onClick: () => openEdit(row),
            'aria-label': 'Изменить тип',
          },
          {
            icon: () => h(NIcon, null, { default: () => h(CreateOutline) }),
          },
        ),
      default: () => 'Изменить',
    },
  )

  const deleteButton = h(
    NTooltip,
    { placement: 'top' },
    {
      trigger: () =>
        h(
          NButton,
          {
            quaternary: true,
            circle: true,
            size: 'small',
            type: 'error',
            onClick: () => removeRow(row.id),
            'aria-label': 'Удалить тип',
          },
          {
            icon: () => h(NIcon, null, { default: () => h(TrashOutline) }),
          },
        ),
      default: () => 'Удалить',
    },
  )

  return h('div', { class: 'table-actions' }, [editButton, deleteButton])
}

const columns = computed<DataTableColumns<ObjectType>>(() => [
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
    title: 'Геометрия',
    key: 'geometry',
    width: 120,
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
    render: (row) => {
      const id = row.id
      const isExpanded = expandedRows.value.has(id)

      const content = h(
        'div',
        {
          class: ['components-content', { 'is-expanded': isExpanded }],
          id: `components-${id}`,
          ref: setCellRef(id),
        },
        row.component.map((name) =>
          h(
            NTag,
            { class: 'component-tag', size: 'small', bordered: true, key: name },
            { default: () => h('span', { class: 'tag-text' }, name) },
          ),
        ),
      )

      const toggle =
        hasMore.value[id] === true
          ? h(
              'button',
              {
                type: 'button',
                class: 'components-toggle',
                'aria-label': isExpanded
                  ? 'Свернуть список компонентов'
                  : 'Показать все компоненты',
                'aria-pressed': isExpanded,
                'aria-controls': `components-${id}`,
                onClick: () => toggleRow(id),
              },
              [
                h(NIcon, null, {
                  default: () => h(isExpanded ? ChevronUpOutline : EllipsisHorizontal),
                }),
              ],
            )
          : null

      return h(
        'div',
        { class: ['components-cell-wrap', { 'is-expanded': isExpanded }] },
        toggle ? [content, toggle] : [content],
      )
    },
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

const createFieldRenderer = (column: DataTableColumns<ObjectType>[number]) => {
  if (typeof column.render === 'function') {
    return (row: ObjectType) => column.render!(row as any)
  }

  const key = column.key as keyof ObjectType | undefined
  return (row: ObjectType) => {
    if (!key) return ''
    const value = row[key]
    return value == null ? '' : value
  }
}

const cardFields = computed<CardField[]>(() =>
  columns.value.map((column, index) => {
    const columnKey =
      (typeof column.key === 'string' && column.key) ||
      (typeof column.key === 'number' ? String(column.key) : undefined) ||
      (typeof column.title === 'string' ? column.title : `field-${index}`)

    const label = typeof column.title === 'string' ? column.title : columnKey

    const renderFn =
      column.key === 'geometry'
        ? (row: ObjectType) => geometryLabel(row.geometry)
        : column.key === 'actions'
          ? renderActions
          : createFieldRenderer(column)

    return {
      key: columnKey,
      label,
      render: renderFn,
      isPrimary: column.key === 'name',
      isStatus: column.key === 'geometry',
      isActions: column.key === 'actions',
    }
  }),
)

const primaryField = computed(
  () => cardFields.value.find((field) => field.isPrimary) ?? cardFields.value[0],
)
const statusField = computed(() => cardFields.value.find((field) => field.isStatus))
const actionsField = computed(() => cardFields.value.find((field) => field.isActions))
const infoFields = computed(() =>
  cardFields.value.filter((field) => !field.isPrimary && !field.isStatus && !field.isActions),
)

const toPlainText = (value: VNodeChild): string => {
  if (value == null || typeof value === 'boolean') return ''
  if (Array.isArray(value))
    return value
      .map((item) => toPlainText(item as VNodeChild))
      .filter(Boolean)
      .join(' ')
  if (typeof value === 'object') {
    const children = (value as any).children
    return children != null ? toPlainText(children as VNodeChild) : ''
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

const editing = ref<ObjectType | null>(null)

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

  errors.value = {}

  dialog.value = true
}

function openEdit(row: ObjectType) {
  editing.value = row

  form.value = { name: row.name, geometry: row.geometry, component: [...row.component] }

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

  const nameChanged = isEditing && normalizeText(editing.value!.name) !== normalizeText(nameTrimmed)

  if (!isEditing || nameChanged) {
    const existingType = checkExistingTypeName(nameTrimmed, editing.value?.id)

    if (existingType) {
      const next = { name: nameTrimmed, geometry: form.value.geometry, component: compNames }

      if (isTypeCompletelyIdentical(next, existingType)) {
        message.error('Нельзя создать полностью идентичный тип объекта')

        return
      }

      const ok = await confirmDialog({
        title: 'Тип с таким названием уже есть',
        content:
          `Тип объекта "${nameTrimmed}" уже существует:<br><br>` +
          `• Геометрия: ${existingType.geometry}<br>` +
          `• Компоненты: ${existingType.component.join(', ') || 'нет'}<br><br>` +
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
        content: `Компонент "${cn}" уже используется в: ${typeNames}.<br>Вы уверены, что хотите продолжить?`,
        positiveText: 'Продолжить',
        negativeText: 'Отмена',
        html: true,
      })

      if (!ok) return
    }
  }

  const missing = compNames.filter((n) => !componentMapByName.value.has(normalizeText(n)))

  if (missing.length > 0) {
    message.warning(`Новые компоненты пока нельзя добавить из интерфейса: ${missing.join(', ')}`)

    return
  }

  saving.value = true

  try {
    const componentIds = compNames.map((n) => componentMapByName.value.get(normalizeText(n))!.id)

    const geometryId =
      geometryIdByKind.value[form.value.geometry] ??
      geometryOptions.value.find(
        (o) =>
          normalizeGeometry(o.name ?? o.value ?? o.code ?? o.id, geometryOptions.value) ===
          form.value.geometry,
      )?.id ??
      null

    const payload: SaveTypeObjectRequest = { name: nameTrimmed, geometryId, componentIds }

    if (editing.value?.id) payload.id = editing.value.id

    await callRpc<SaveTypeObjectResponse, SaveTypeObjectRequest>('saveTypeObject', payload)

    message.success(editing.value?.id ? 'Изменено' : 'Создано')

    await qc.invalidateQueries({ queryKey: ['object-types'] })

    dialog.value = false
  } catch {
    message.error('Не удалось сохранить')
  } finally {
    saving.value = false
  }
}

const removeRow = async (id: string) => {
  const confirmed = await confirmDialog({
    title: 'Подтверждение',
    content: 'Удалить запись?',
    positiveText: 'Удалить',
    negativeText: 'Отмена',
  })

  if (!confirmed) return

  try {
    await callRpc<void, DeleteTypeObjectRequest>('deleteTypeObject', { id })

    message.success('Удалено')

    await qc.invalidateQueries({ queryKey: ['object-types'] })
  } catch {
    message.error('Не удалось удалить')
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

.table-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.pagination-bar {
  display: flex;
  justify-content: flex-end;
  padding: 4px 0 0;
}

.pagination-total {
  margin-right: 12px;
  font-size: 12px;
  color: var(--n-text-color-3);
}

.cards {
  display: grid;
  gap: 10px;
}

.card {
  border: 1px solid #eee;
  border-radius: 14px;
  padding: 12px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
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

@media (max-width: 360px) {
  .card__grid {
    grid-template-columns: 100px 1fr;
  }
}

.components-cell-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-width: 0;
  min-height: 24px;
  height: 24px;
}

.components-cell-wrap.is-expanded {
  align-items: flex-start;
  height: auto;
}

.components-content {
  /* было flex — делаем блочный поток + принудительно 1 строка */
  display: block;
  white-space: nowrap;
  line-height: 24px;
  max-height: 24px;
  overflow: hidden;
  width: 100%;
  min-width: 0;
  mask-image: linear-gradient(to right, black 85%, transparent 100%);
  -webkit-mask-image: linear-gradient(to right, black 85%, transparent 100%);
}

.components-content.is-expanded {
  white-space: normal; /* разрешаем переносы */
  max-height: none;
  overflow: visible;
  mask-image: none;
  -webkit-mask-image: none;
}

/* теги выстраиваем «в линию» */
.component-tag {
  display: inline-flex;
  vertical-align: top;
  margin: 2px 6px 2px 0;
  flex-shrink: 0;
}

:deep(.component-tag.n-tag.n-tag--bordered) {
  background-color: transparent;
}

.components-toggle {
  flex: 0 0 auto;
  height: 24px;
  width: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 9999px;
  background: var(--n-color, #fff);
  color: inherit;
  cursor: pointer;
}

.components-cell-wrap.is-expanded .components-toggle {
  margin-top: 4px;
  align-self: flex-start;
}

/* внутри тега текст не переносится */
:deep(.component-tag .n-tag__content) {
  white-space: nowrap;
}

.components-content.is-expanded :deep(.component-tag .n-tag__content) {
  white-space: normal;
  word-break: break-word;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.page-title {
  max-width: 60ch;
}

.page-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 900px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .page-actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
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
