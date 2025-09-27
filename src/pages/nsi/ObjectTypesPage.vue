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
              :value="form.component"
              multiple
              filterable
              placeholder="Начните вводить, чтобы найти компонент"
              :options="componentSelectOptions"
              v-model:show="selectOpen"
              @search="selectQuery = $event"
              @update:value="handleUpdateComponentValue"
              @blur="handleComponentBlur"
            >
              <template #action>
                <div class="select-action">
                  <NButton
                    text
                    type="primary"
                    :loading="creatingComponent"
                    :disabled="!canCreateFromQuery || creatingComponent"
                    @click="tryCreateFromQuery"
                  >
                    Создать «{{ selectQueryTrimmed || '…' }}»
                  </NButton>
                </div>
              </template>
              <template #empty>
                <div class="select-empty">Нет совпадений</div>
              </template>
            </NSelect>
            <p class="text-small">
              Выбирайте компоненты из списка. Если нужного нет, введите название (минимум 2 символа)
              и нажмите «Создать» внизу выпадающего списка.
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

import type { ComponentOption, ComponentsByType, LoadFvForSelectResponse } from '@/types/nsi-remote'

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

  cls?: string | number | null

  idShape?: string | number | null

  number?: string | number | null
}

interface RawRelRecord {
  idro?: string | number | null

  idrom1?: string | number | null

  clsrom1?: string | number | null

  namerom1?: string | null

  idrom2?: string | number | null

  clsrom2?: string | number | null

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

type LoadedObjectType = ObjectType & { cls?: string | null; idShape?: string | null; number?: string | null }

type GeometryPair = { fv: string | null; pv: string | null }

type LinkEntry = { compId: string; linkId: string }

interface ObjectTypesSnapshot {
  items: LoadedObjectType[]

  componentOptions: ComponentOption[]

  componentsByType: ComponentsByType

  geometryOptions: LoadFvForSelectResponse

  geometryPairByKind: Partial<Record<GeometryKind, { fv: string | null; pv: string | null }>>

  allComponents: ComponentOption[]

  linksByType: Record<string, LinkEntry[]>
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

function firstRecord(resp: any): any {
  const recs = extractRecords<any>(resp)
  if (recs && recs.length) return recs[0]
  return resp?.result?.records?.[0] ?? null
}

function getLinkIdFromResp(resp: any): number | null {
  const r = firstRecord(resp)
  const v = r?.id ?? r?.number ?? r?.idRel ?? r?.idrel
  return v != null ? Number(v) : null
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
  const [typesResponse, geometryResponse, componentsRelResponse, componentsAllResponse] = await Promise.all([
    callRpc<unknown>('data/loadTypesObjects', [0]),

    callRpc<unknown>('data/loadFvForSelect', ['Factor_Shape']),

    callRpc<unknown>('data/loadComponentsObject2', [
      'RT_Components',
      'Typ_ObjectTyp',
      'Typ_Components',
    ]),

    callRpc<unknown>('data/loadComponents', [0]),
  ])

  const rawTypes = extractRecords<RawObjectTypeRecord>(typesResponse)

  const rawGeometry = extractRecords<RawGeometryRecord>(geometryResponse)
  const rawComponents = extractRecords<RawRelRecord>(componentsRelResponse)
  type RawFullComponent = { id?: string | number | null; cls?: string | number | null; name?: string | null }
  const rawAll = extractRecords<RawFullComponent>(componentsAllResponse)

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
  const geometryPairByKind: Partial<Record<GeometryKind, GeometryPair>> = {}

  for (const option of rawGeometry) {
    const fvId = toOptionalString(option.id ?? option.ID)
    const pvId = toOptionalString(option.pv ?? option.PV)
    const geometryLabel = option.name ?? option.value ?? option.code ?? option.id ?? option.ID ?? ''
    const kind = normalizeGeometry(geometryLabel, geometryOptions)
    const prev = geometryPairByKind[kind] ?? { fv: null, pv: null }
    geometryPairByKind[kind] = { fv: prev.fv ?? fvId ?? null, pv: prev.pv ?? pvId ?? null }

    if (!fvId && !pvId) continue

    if (fvId) geometryKindByFvId.set(fvId, kind)
    if (pvId) geometryKindByPvId.set(pvId, kind)
  }

  const componentOptionsMap = new Map<string, ComponentOption>()
  const componentsByTypeMap = new Map<string, ComponentOption[]>()
  const linksByTypeMap = new Map<string, LinkEntry[]>()

  for (const rel of rawComponents) {
    const typeId = toOptionalString(rel.idrom1)
    const compId = toOptionalString(rel.idrom2)
    const compName = toOptionalString(rel.namerom2)
    const idro = toOptionalString(rel.idro)
    if (!typeId || !compId || !compName) continue

    const key = normalizeText(compName)
    let option = componentOptionsMap.get(key)

    if (!option) {
      option = { id: compId, name: compName }
      componentOptionsMap.set(key, option)
    }

    const list = componentsByTypeMap.get(typeId) ?? []
    list.push(option)
    componentsByTypeMap.set(typeId, list)

    if (!idro) continue
    const arr = linksByTypeMap.get(typeId) ?? []
    arr.push({ compId, linkId: idro })
    linksByTypeMap.set(typeId, arr)
  }

  const linksByType: Record<string, LinkEntry[]> = {}
  for (const [k, v] of linksByTypeMap) linksByType[k] = v

  const componentOptions = Array.from(componentOptionsMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'ru'),
  )

  const allComponentsMap = new Map<string, ComponentOption>()
  for (const record of rawAll) {
    const id = toOptionalString(record?.id)
    const name = toOptionalString(record?.name)
    if (!id || !name) continue
    const key = normalizeText(name) || id
    if (!allComponentsMap.has(key)) {
      allComponentsMap.set(key, { id, name })
    }
  }
  const allComponentsList = Array.from(allComponentsMap.values()).sort((a, b) =>
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

  const items: LoadedObjectType[] = rawTypes.map((r) => {
    const id = safeString(r.id)
    const name = safeString(r.name ?? r.nameCls)
    const fvKey = toOptionalString(r.fvShape)
    const pvKey = toOptionalString(r.pvShape)
    const geometry =
      (fvKey ? geometryKindByFvId.get(fvKey) : undefined) ??
      (pvKey ? geometryKindByPvId.get(pvKey) : undefined) ??
      DEFAULT_GEOMETRY
    const componentNames = componentsByType[id]?.map((c) => c.name) ?? []
    const cls = toOptionalString(r.cls)
    const idShape = toOptionalString((r as any)?.idShape)
    const number = toOptionalString(r.number)
    return { id, name, geometry, component: componentNames, cls, idShape, number }
  })
  return {
    items,
    componentOptions,
    componentsByType,
    geometryOptions,
    geometryPairByKind,
    allComponents: allComponentsList,
    linksByType,
  }
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
const allComponents = computed(() => snapshot.value?.allComponents ?? [])
const createdComponents = ref<ComponentOption[]>([])
const creatingComponent = ref(false)
const linkOpInProgress = ref(false)
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

const geometryOptions = computed(() => snapshot.value?.geometryOptions ?? [])
const geometryPairByKind = computed(() => snapshot.value?.geometryPairByKind ?? {})
const linksByType = computed<Record<string, LinkEntry[]>>(
  () => snapshot.value?.linksByType ?? {},
)
const linksByTypeRef = ref<Record<string, LinkEntry[]>>({})
const effectiveLinksByType = computed<Record<string, LinkEntry[]>>(() => {
  const cache = linksByTypeRef.value
  return Object.keys(cache).length ? cache : linksByType.value
})
const componentMapByName = computed(() => {
  const map = new Map<string, ComponentOption>()
  for (const option of allComponentOptions.value) map.set(normalizeText(option.name), option)
  return map
})

const selectOpen = ref(false)
const selectQuery = ref('')
const selectQueryTrimmed = computed(() => selectQuery.value.trim())
const canCreateFromQuery = computed(() => {
  const q = selectQueryTrimmed.value
  if (q.length < 2) return false
  return !componentMapByName.value.has(normalizeText(q))
})

watch(selectOpen, (open) => {
  if (!open) selectQuery.value = ''
})

const tryCreateFromQuery = async () => {
  const name = selectQueryTrimmed.value
  if (!canCreateFromQuery.value || creatingComponent.value) return

  const ok = await confirmDialog({
    title: 'Создать компонент',
    content: `Создать новый компонент «${name}»?`,
    positiveText: 'Создать',
    negativeText: 'Отмена',
  })
  if (!ok) return

  try {
    creatingComponent.value = true

    const resp = await callRpc<unknown>('data/saveComponents', [
      'ins',
      {
        accessLevel: 1,
        cls: 1027,
        name,
      },
    ])

    const rec = extractRecords<any>(resp)[0] ?? (resp as any)?.result?.records?.[0]
    const newId = String(rec?.id ?? rec?.ID ?? rec?.number)
    if (!newId) throw new Error('Нет id созданного компонента')

    const normalized = normalizeText(name)
    if (!createdComponents.value.some((item) => normalizeText(item.name) === normalized)) {
      createdComponents.value = [...createdComponents.value, { id: newId, name }]
    }

    if (!form.value.component.includes(name)) {
      form.value.component = [...form.value.component, name]
    }

    message.success('Компонент создан')
    void qc.invalidateQueries({ queryKey: ['object-types'] })
    selectQuery.value = ''
  } catch (error) {
    console.error(error)
    message.error('Не удалось создать компонент')
  } finally {
    creatingComponent.value = false
  }
}

const getGeometryPair = (kind: GeometryKind): GeometryPair =>
  geometryPairByKind.value[kind] ?? { fv: null, pv: null }

const relName = (typeName: string, compName: string) => `${typeName} <=> ${compName}`

const toRpcId = (value: string): string | number => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : value
}

const toRpcValue = (value: string | null): string | number | undefined => {
  if (value == null) return undefined
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : value
}

const toNumericOrUndefined = (value: string | null): number | undefined => {
  if (value == null) return undefined
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : undefined
}

async function ensureComponentIds(names: string[]): Promise<string[]> {
  const ids: string[] = []
  const knownByName = new Map(componentMapByName.value)
  const newlyCreated: ComponentOption[] = []

  for (const rawName of names) {
    const trimmed = rawName.trim()
    if (!trimmed) throw new Error('Пустое имя компонента')

    const key = normalizeText(trimmed)
    const existing = knownByName.get(key)

    if (existing) {
      ids.push(existing.id)
      continue
    }

    const resp = await callRpc<unknown>('data/saveComponents', [
      'ins',
      { accessLevel: 1, cls: 1027, name: trimmed },
    ])

    const record = extractRecords<any>(resp)[0] ?? (resp as any)?.result?.records?.[0]
    const newId = toOptionalString(record?.id ?? record?.ID ?? record?.number)

    if (!newId) throw new Error('Не удалось создать компонент: ' + trimmed)

    const option: ComponentOption = { id: newId, name: trimmed }
    knownByName.set(key, option)
    newlyCreated.push(option)
    ids.push(newId)
  }

  if (newlyCreated.length > 0) {
    const current = new Map<string, ComponentOption>()
    for (const option of createdComponents.value) current.set(normalizeText(option.name), option)
    for (const option of newlyCreated) current.set(normalizeText(option.name), option)
    createdComponents.value = Array.from(current.values())
  }

  return ids
}

async function reloadLinksForType(typeId: string): Promise<void> {
  const resp = await callRpc<unknown>('data/loadComponentsObject2', [
    'RT_Components',
    'Typ_ObjectTyp',
    'Typ_Components',
  ])
  const rels = extractRecords<any>(resp)
  const map = new Map<string, Array<{ compId: string; linkId: string }>>()
  for (const r of rels) {
    const t = toOptionalString((r as any).idrom1)
    const c = toOptionalString((r as any).idrom2)
    const idro = toOptionalString((r as any).idro)
    if (!t || !c || !idro) continue
    const arr = map.get(t) ?? []
    arr.push({ compId: c, linkId: idro })
    map.set(t, arr)
  }
  if (!map.has(typeId)) {
    map.set(typeId, map.get(typeId) ?? [])
  }
  const obj: Record<string, Array<{ compId: string; linkId: string }>> = {}
  for (const [k, v] of map) obj[k] = v
  linksByTypeRef.value = obj
}

const createTypeRecord = async (
  name: string,
  fvShape: string | number | undefined,
  pvShape: string | number | undefined,
): Promise<{ typeId: string; typeCls: string }> => {
  const payload: Record<string, unknown> = {
    accessLevel: 1,
    name,
    fullName: name,
    fvShape,
    pvShape,
  }

  const response = await callRpc<unknown>('data/saveTypesObjects', ['ins', payload])
  const record = extractRecords<any>(response)[0] ?? (response as any)?.result?.records?.[0]
  const typeId = toOptionalString(record?.id ?? record?.ID ?? record?.number)
  const typeCls = toOptionalString(record?.cls ?? record?.CLS)

  if (!typeId || !typeCls) {
    throw new Error('Не удалось создать тип')
  }

  return { typeId, typeCls }
}

const handleUpdateComponentValue = async (nextNames: string[]) => {
  const prevNames = form.value.component
  const prevSet = new Set(prevNames.map(normalizeText))
  const nextSet = new Set(nextNames.map(normalizeText))
  const removed = [...prevSet].filter((n) => !nextSet.has(n))

  if (!editing.value || removed.length === 0) {
    form.value.component = nextNames
    return
  }

  if (linkOpInProgress.value) return
  linkOpInProgress.value = true

  try {
    const typeId = String(editing.value.id)
    let links = effectiveLinksByType.value[typeId] ?? []

    const needReload = removed.some((name) => {
      const opt = componentMapByName.value.get(normalizeText(name))
      if (!opt) return false
      return !links.some((l) => String(l.compId) === String(opt.id))
    })

    if (needReload) {
      await reloadLinksForType(typeId)
      links = effectiveLinksByType.value[typeId] ?? []
    }

    const ops: Promise<any>[] = []
    const toRemoveIdx: number[] = []

    for (const rName of removed) {
      const opt = componentMapByName.value.get(normalizeText(rName))
      const compId = opt?.id
      if (!compId) continue
      const idx = links.findIndex((l) => String(l.compId) === String(compId))
      if (idx < 0) continue
      const idro = links[idx].linkId
      ops.push(callRpc('data/deleteOwnerWithProperties', [Number(idro), 0]))
      toRemoveIdx.push(idx)
    }

    if (ops.length) {
      await Promise.all(ops)

      if (toRemoveIdx.length) {
        const updated = [...links]
        toRemoveIdx.sort((a, b) => b - a).forEach((i) => {
          if (i >= 0) updated.splice(i, 1)
        })
        const clone = { ...effectiveLinksByType.value }
        clone[typeId] = updated
        linksByTypeRef.value = clone
      }

      message.success('Связь удалена')
    }

    form.value.component = nextNames
  } catch (e) {
    console.error(e)
    message.error('Не удалось удалить связь')
    form.value.component = prevNames
  } finally {
    linkOpInProgress.value = false
  }
}

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
            loading: removingId.value === String(row.id),
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
  const old = editing.value
  const nameChanged = isEditing && normalizeText(old!.name) !== normalizeText(nameTrimmed)
  const geometryChanged = isEditing && old!.geometry !== form.value.geometry

  if (!isEditing || nameChanged) {
    const existingType = checkExistingTypeName(nameTrimmed, editing.value?.id)

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
          `- Геометрия: ${existingType.geometry}<br>` +
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

  const pair = getGeometryPair(form.value.geometry)
  const fvShape = toRpcValue(pair.fv)
  const pvShape = toRpcValue(pair.pv)

  if (pair.fv == null && pair.pv == null) {
    message.error('Не найдены идентификаторы геометрии')
    return
  }

  const newNamesMap = new Map(compNames.map((n) => [normalizeText(n), n]))

  saving.value = true

  try {
    if (!isEditing) {
      const componentIds = await ensureComponentIds(compNames)
      const { typeId, typeCls } = await createTypeRecord(nameTrimmed, fvShape, pvShape)

      await Promise.all(
        componentIds.map((compId, index) => {
          const sourceName = compNames[index] ?? compId
          const normalized = normalizeText(sourceName)
          const relationName = newNamesMap.get(normalized) ?? sourceName

          return callRpc('data/saveRelObj', [
            {
              uch1: toRpcId(typeId),
              cls1: toRpcId(typeCls),
              uch2: toRpcId(compId),
              cls2: 1027,
              codRelTyp: 'RT_Components',
              name: relName(nameTrimmed, relationName),
            },
          ])
        }),
      )
    } else if (nameChanged) {
      const oldIdStr = String(editing.value!.id)
      const oldId = Number(editing.value!.id)
      const oldCls = Number(editing.value!.cls)
      const oldName = editing.value!.name

      await reloadLinksForType(oldIdStr)
      const existingLinks = effectiveLinksByType.value[oldIdStr] ?? []
      const oldCompIds = existingLinks
        .map((link) => Number(link.compId))
        .filter((cid) => Number.isFinite(cid))

      let newId: number | undefined
      let newCls: number | undefined
      const newLinkIds: number[] = []
      let oldLinksRemoved = false

      try {
        if (!Number.isFinite(oldId) || !Number.isFinite(oldCls)) {
          throw new Error('Некорректные идентификаторы старого типа')
        }

        const pair = getGeometryPair(form.value.geometry)
        const fvShape = pair.fv ? Number(pair.fv) : undefined
        const pvShape = pair.pv ? Number(pair.pv) : undefined

        const createResp = await callRpc<unknown>('data/saveTypesObjects', [
          'ins',
          {
            accessLevel: 1,
            name: nameTrimmed,
            fullName: nameTrimmed,
            fvShape,
            pvShape,
          },
        ])

        const newRec = firstRecord(createResp)
        newId = Number(newRec?.id)
        newCls = Number(newRec?.cls)
        if (!newId || !newCls) throw new Error('Нет id/cls нового типа')

        const compIds = await ensureComponentIds(compNames)
        const linkResps = await Promise.all(
          compIds.map((cid, index) => {
            const compIdNumber = Number(cid)
            if (!Number.isFinite(compIdNumber)) {
              throw new Error('Некорректный идентификатор компонента: ' + cid)
            }
            const option = allComponentOptions.value.find((c) => String(c.id) === String(cid))
            const componentLabel = compNames[index] ?? option?.name ?? String(cid)
            return callRpc('data/saveRelObj', [
              {
                uch1: newId!,
                cls1: newCls!,
                uch2: compIdNumber,
                cls2: 1027,
                codRelTyp: 'RT_Components',
                name: `${nameTrimmed} <=> ${componentLabel}`,
              },
            ])
          }),
        )

        for (const resp of linkResps) {
          const lid = getLinkIdFromResp(resp)
          if (lid) newLinkIds.push(lid)
        }

        const oldLinks = existingLinks
        if (oldLinks.length) {
          await Promise.all(
            oldLinks.map((link) => callRpc('data/deleteOwnerWithProperties', [Number(link.linkId), 0])),
          )
          const nextLinksState = { ...effectiveLinksByType.value }
          nextLinksState[oldIdStr] = []
          linksByTypeRef.value = nextLinksState
        }
        oldLinksRemoved = true

        await callRpc('data/deleteTypesObjects', [oldId])

        message.success('Переименовано')
        await qc.invalidateQueries({ queryKey: ['object-types'] })
        dialog.value = false
        return
      } catch (e) {
        console.error('Ошибка миграции переименования', e)

        try {
          if (newLinkIds.length) {
            await Promise.all(
              newLinkIds.map((lid) => callRpc('data/deleteOwnerWithProperties', [lid, 0])),
            )
          }

          if (newId) {
            await callRpc('data/deleteTypesObjects', [newId])
          }

          if (oldLinksRemoved && oldCompIds.length && Number.isFinite(oldId) && Number.isFinite(oldCls)) {
            await Promise.all(
              oldCompIds.map((cid) =>
                callRpc('data/saveRelObj', [
                  {
                    uch1: oldId,
                    cls1: oldCls,
                    uch2: Number(cid),
                    cls2: 1027,
                    codRelTyp: 'RT_Components',
                    name: `${oldName} <=> ${
                      allComponentOptions.value.find((c) => String(c.id) === String(cid))?.name ?? cid
                    }`,
                  },
                ]),
              ),
            )
            await reloadLinksForType(oldIdStr)
          }
        } catch (rb) {
          console.warn('Откат не полностью удался', rb)
        }

        await qc.invalidateQueries({ queryKey: ['object-types'] })
        message.error('Не удалось сохранить (переименование откатено)')
        return
      }
    } else {
      const oldTypeId = toOptionalString(old!.id)
      if (!oldTypeId) throw new Error('Некорректный идентификатор типа: ' + old!.id)

      if (geometryChanged) {
        const payload: Record<string, unknown> = {
          accessLevel: 1,
          number: toRpcValue(toOptionalString(old?.number)),
          id: toRpcId(oldTypeId),
          cls: toRpcValue(toOptionalString(old?.cls)),
          name: old!.name,
          nameCls: old!.name,
          idShape: toRpcValue(toOptionalString(old?.idShape)),
          fvShape,
          pvShape,
        }

        await callRpc('data/saveTypesObjects', ['upd', payload])
      }

      // Добавляем только новые связи (удаления уже произошли в handleUpdateComponentValue)
      const typeIdStr = String(editing.value!.id)
      await reloadLinksForType(typeIdStr)
      const typeIdNum = Number(editing.value!.id)
      const linked = new Set(
        (effectiveLinksByType.value[typeIdStr] ?? []).map((l) => String(l.compId)),
      )

      const selectedIds = new Set(await ensureComponentIds(form.value.component))
      const toAdd = [...selectedIds].filter((id) => !linked.has(String(id)))

      if (toAdd.length) {
        await Promise.all(
          toAdd.map((cid) =>
            callRpc('data/saveRelObj', [
              {
                uch1: typeIdNum,
                cls1: Number(editing.value!.cls),
                uch2: Number(cid),
                cls2: 1027,
                codRelTyp: 'RT_Components',
                name: `${editing.value!.name} <=> ${
                  allComponentOptions.value.find((c) => String(c.id) === String(cid))?.name ?? cid
                }`,
              },
            ]),
          ),
        )
      }
    }

    message.success(isEditing ? 'Изменено' : 'Создано')

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
    await reloadLinksForType(typeIdStr)
    const links = effectiveLinksByType.value[typeIdStr] ?? []

    if (links.length) {
      await Promise.all(
        links
          .map((l) => Number(l.linkId))
          .filter((n) => Number.isFinite(n))
          .map((idro) => callRpc('data/deleteOwnerWithProperties', [idro, 0])),
      )
      const clone = { ...effectiveLinksByType.value }
      clone[typeIdStr] = []
      linksByTypeRef.value = clone
    }

    const typeIdNum = Number(typeIdStr)
    await callRpc('data/deleteTypesObjects', [Number.isFinite(typeIdNum) ? typeIdNum : typeIdStr])

    message.success('Тип удалён')
    await qc.invalidateQueries({ queryKey: ['object-types'] })
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

.select-action {
  padding: 6px 12px;
  border-top: 1px solid var(--n-border-color);
}

.select-empty {
  padding: 8px 12px;
  color: var(--n-text-color-3);
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
