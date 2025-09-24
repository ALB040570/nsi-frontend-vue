<template>
  <section class="object-types-page">
    <header class="page-header">
      <div class="page-title">
        <h2 class="h2">Справочник "Типы обслуживаемых объектов"</h2>
        <p class="text-small">
          Здесь отображаются все доступные типы обслуживаемых объектов и их компоненты.
          Используйте «Создать», чтобы добавить новый.
        </p>
      </div>

      <div class="page-actions">
        <el-input v-model="q" placeholder="Поиск…" clearable style="width: 260px" />
        <el-button @click="openCreate" class="btn-primary">+ Создать</el-button>
      </div>
    </header>

    <p class="text-body">
      Это перечень категорий инфраструктурных объектов, используемый для их классификации,
      планирования и учета работ. Вы можете редактировать существующие типы, удалять или
      привязывать компоненты.
    </p>

    <div class="table-area">
      <el-table
        :data="paginatedRows"
        class="s360-cards table-full table-stretch"
        style="width: 100%"
        height="100%"
        v-loading="tableLoading"
        table-layout="fixed"
      >
        <!-- 1 колонка -->
        <el-table-column prop="name" label="Типы объектов" width="400" class-name="col-name" />

        <!-- 2 колонка -->
        <el-table-column label="Геометрия" width="120" align="center">
          <template #default="{ row }">
            <el-tag effect="plain" size="small">
              {{ row.geometry === 'точка' ? 'Точка' : row.geometry === 'линия' ? 'Линия' : 'Полигон' }}
            </el-tag>
          </template>
        </el-table-column>

        <!-- 3 колонка -->
        <el-table-column label="Компоненты" class-name="col-components">
          <template #default="{ row }">
            <div class="components-cell-wrap">
              <div
                class="components-cell"
                :id="`components-${row.id}`"
                :class="{ 'is-expanded': expandedRows.has(row.id) }"
                :ref="setCellRef(row.id)"
              >
                <el-tag
                  v-for="name in row.component"
                  :key="name"
                  class="component-tag"
                  size="small"
                  effect="plain"
                >
                  <span class="tag-text">{{ name }}</span>
                </el-tag>
              </div>

              <button
                v-if="hasMore[row.id]"
                type="button"
                class="components-toggle"
                :aria-label="expandedRows.has(row.id) ? 'Свернуть список компонентов' : 'Показать ещё компоненты'"
                :aria-pressed="expandedRows.has(row.id)"
                :aria-controls="`components-${row.id}`"
                @click="toggleRow(row.id)"
              >
                <el-icon v-if="expandedRows.has(row.id)"><ArrowUp /></el-icon>
                <el-icon v-else><MoreFilled /></el-icon>
              </button>
            </div>
          </template>
        </el-table-column>

        <!-- 4 колонка -->
        <el-table-column label="Действия" width="120" align="center">
          <template #default="{ row }">
            <div style="display: flex; gap: 8px; justify-content: center;">
              <el-tooltip content="Изменить">
                <el-button :icon="Edit" circle plain size="small" @click="openEdit(row)" />
              </el-tooltip>
              <el-tooltip content="Удалить">
                <el-button :icon="Delete" circle type="danger" plain size="small" @click="removeRow(row.id)" />
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-bar">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          prev-text="Назад"
          next-text="Вперёд"
          aria-label="Пагинация типов объектов"
        />
      </div>
    </div>

    <!-- Диалог -->
    <el-dialog v-model="dialog" :title="editing ? 'Изменить тип' : 'Создать тип'" width="560">
      <el-form :model="form" label-width="120px">
        <el-form-item label="Название" :error="errors.name">
          <el-input v-model="form.name" />
          <div v-if="nameWarning" class="warning-text" style="margin-top: 4px">
            {{ nameWarning }}
          </div>
        </el-form-item>

        <el-form-item label="Геометрия">
          <el-radio-group v-model="form.geometry">
            <el-radio-button value="точка">Точка</el-radio-button>
            <el-radio-button value="линия">Линия</el-radio-button>
            <el-radio-button value="полигон">Полигон</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="Компоненты">
          <el-select
            v-model="form.component"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="Выберите или введите новый"
            style="width: 100%"
            @blur="handleComponentBlur"
          >
            <el-option v-for="option in componentOptions" :key="option.id" :label="option.name" :value="option.name" />
          </el-select>
          <p class="text-small" style="margin-top: 6px">
            Можно выбрать несколько. Чтобы добавить новый компонент — введите название и нажмите Enter.
          </p>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialog = false">Отмена</el-button>
        <el-button class="btn-primary" :loading="saving" @click="save">Сохранить</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch, watchEffect, nextTick, onMounted, onUpdated, onBeforeUnmount } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Delete, ArrowUp, MoreFilled } from '@element-plus/icons-vue'
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
  set.has(id) ? set.delete(id) : set.add(id)
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

  // одна строка — по line-height, запас в 1px на округления
  const lh = parseFloat(getComputedStyle(el).lineHeight || '24') || 24
  const oneLineHeight = Math.ceil(lh)

  // "есть продолжение", если контент выше видимой высоты первой строки
  const more = el.scrollHeight - 1 > Math.min(el.clientHeight, oneLineHeight)

  // обновляем только если реально поменялось (чтобы не зациклить рендер)
  if (hasMore.value[id] !== more) {
    hasMore.value = { ...hasMore.value, [id]: more }
  }
}

// аккуратные массовые пересчёты
onMounted(() => nextTick(() => { for (const [id] of cellRefs) rafCheck(id) }))
onUpdated(() => nextTick(() => { for (const [id] of cellRefs) rafCheck(id) }))

// при уходе со страницы выключим всё
onBeforeUnmount(() => {
  for (const [, ro] of roById) ro.disconnect()
  roById.clear()
  cellRefs.clear()
})

/* ---------- типы и утилиты ---------- */
interface PaginationState { page: number; pageSize: number }
interface FetchState { isLoading: boolean; isFetching: boolean; isError: boolean; errorMessage: string }
interface RawObjectTypeRecord { id?: string | number | null; name?: string | null; nameCls?: string | null; fvShape?: string | number | null; pvShape?: string | number | null }
interface RawComponentRecord { idrom1?: string | number | null; idrom2?: string | number | null; namerom2?: string | null }
interface RawGeometryRecord { id?: string | number | null; ID?: string | number | null; pv?: string | number | null; PV?: string | number | null; name?: string | null; value?: string | null; code?: string | null }
interface ObjectTypesSnapshot {
  items: ObjectType[];
  componentOptions: ComponentOption[];
  componentsByType: ComponentsByType;
  geometryOptions: LoadFvForSelectResponse;
  geometryIdByKind: Partial<Record<GeometryKind, string | null>>;
}

interface FormState { name: string; geometry: GeometryKind; component: string[] }
interface FormErrors { name?: string }

const DEFAULT_GEOMETRY: GeometryKind = 'точка'
const normalizeText = (v: string | null | undefined) => v?.trim().toLowerCase() ?? ''
const safeString = (v: unknown) => (v ?? '').toString()
const trimmedString = (v: unknown) => safeString(v).trim()
const toOptionalString = (v: unknown): string | null => {
  const s = trimmedString(v); return s ? s : null
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

/* ---------- загрузка данных ---------- */
async function fetchObjectTypes(): Promise<ObjectTypesSnapshot> {
  const [typesResponse, geometryResponse, componentsResponse] = await Promise.all([
    callRpc<unknown>('data/loadTypesObjects', [0]),
    callRpc<unknown>('data/loadFvForSelect', ['Factor_Shape']),
    callRpc<unknown>('data/loadComponentsObject2', ['RT_Components', 'Typ_ObjectTyp', 'Typ_Components']),
  ])

  const rawTypes = extractRecords<RawObjectTypeRecord>(typesResponse)
  const rawGeometry = extractRecords<RawGeometryRecord>(geometryResponse)
  const rawComponents = extractRecords<RawComponentRecord>(componentsResponse)

  const geometryOptions: LoadFvForSelectResponse = rawGeometry.map((option) => {
    const id = safeString(option.id ?? option.ID)
    const displayName = trimmedString(option.name ?? option.value ?? option.code) || id
    return { id, name: displayName, code: toOptionalString(option.code), value: toOptionalString(option.value) }
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

    if (fvId) { geometryKindByFvId.set(fvId, kind); if (!geometryIdByKind[kind]) geometryIdByKind[kind] = fvId }
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
    if (!option) { option = { id: componentId, name: componentName }; componentOptionsMap.set(key, option) }

    const list = componentsByTypeMap.get(typeId) ?? []
    list.push(option)
    componentsByTypeMap.set(typeId, list)
  }

  const componentOptions = Array.from(componentOptionsMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  const componentsByType: ComponentsByType = {}

  for (const [typeId, list] of componentsByTypeMap.entries()) {
    const uniqueById = new Map<string, ComponentOption>()
    for (const c of list) if (!uniqueById.has(c.id)) uniqueById.set(c.id, c)
    componentsByType[typeId] = Array.from(uniqueById.values()).sort((a, b) => a.name.localeCompare(b.name, 'ru'))
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
const q = ref('')
const pagination = reactive<PaginationState>({ page: 1, pageSize: 10 })

const { data: snapshot, isLoading, isFetching, error } = useQuery({
  queryKey: ['object-types'], queryFn: fetchObjectTypes,
})

const fetchState = computed<FetchState>(() => ({
  isLoading: isLoading.value, isFetching: isFetching.value,
  isError: Boolean(error.value), errorMessage: getErrorMessage(error.value),
}))
const tableLoading = computed(() => fetchState.value.isLoading || fetchState.value.isFetching)

watch(() => fetchState.value.errorMessage, (m, p) => { if (m && m !== p) ElMessage.error(m) })

const objectTypes = computed(() => snapshot.value?.items ?? [])
const componentsByType = computed(() => snapshot.value?.componentsByType ?? {})
const componentOptions = computed(() => snapshot.value?.componentOptions ?? [])
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
const maxPage = computed(() => Math.max(1, Math.ceil(total.value / pagination.pageSize) || 1))

watch([q, objectTypes], () => (pagination.page = 1))
watch(() => pagination.pageSize, () => (pagination.page = 1))
watchEffect(() => { if (pagination.page > maxPage.value) pagination.page = maxPage.value })

/* ---------- CRUD формы ---------- */
const dialog = ref(false)
const editing = ref<ObjectType | null>(null)
const form = ref<FormState>({ name: '', geometry: DEFAULT_GEOMETRY, component: [] })
const errors = ref<FormErrors>({})
const saving = ref(false)

const checkExistingTypeName = (name: string, excludeId?: string): ObjectType | null => {
  const normalizedName = normalizeText(name)
  return objectTypes.value.find((t) => normalizeText(t.name) === normalizedName && t.id !== excludeId) ?? null
}

const checkExistingComponentName = (name: string):
  | { component: ComponentOption; usedInTypes: ObjectType[] } | null => {
  const n = normalizeText(name); if (!n) return null
  const existing = componentMapByName.value.get(n); if (!existing) return null
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
  return normalizeText(next.name) === normalizeText(prev.name) &&
    next.geometry === prev.geometry &&
    a.length === b.length &&
    a.every((v, i) => normalizeText(v) === normalizeText(b[i]))
}

const nameWarning = computed(() => {
  if (!form.value.name.trim()) return ''
  const existing = checkExistingTypeName(form.value.name, editing.value?.id)
  return existing ? `Предупреждение: тип с таким названием уже существует (${existing.geometry})` : ''
})

const checkComponent = (componentName: string) => {
  const info = checkExistingComponentName(componentName)
  if (info && info.usedInTypes.length > 0)
    ElMessage.warning(`Компонент "${componentName}" уже используется в других типах объектов`)
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
  if (nameTrimmed.length < 2) { errors.value = { name: 'Минимум 2 символа' }; return }

  const compNames = Array.from(new Set(form.value.component.map((v) => v.trim()).filter(Boolean)))
  const isEditing = Boolean(editing.value)
  const nameChanged = isEditing && normalizeText(editing.value!.name) !== normalizeText(nameTrimmed)

  if (!isEditing || nameChanged) {
    const existingType = checkExistingTypeName(nameTrimmed, editing.value?.id)
    if (existingType) {
      const next = { name: nameTrimmed, geometry: form.value.geometry, component: compNames }
      if (isTypeCompletelyIdentical(next, existingType)) { ElMessage.error('Нельзя создать полностью идентичный тип объекта'); return }
      const ok = await ElMessageBox
        .confirm(
          `Тип объекта "${nameTrimmed}" уже существует:<br><br>` +
            `• Геометрия: ${existingType.geometry}<br>` +
            `• Компоненты: ${existingType.component.join(', ') || 'нет'}<br><br>` +
            'Вы уверены, что хотите продолжить?',
          'Тип с таким названием уже есть',
          { confirmButtonText: 'Продолжить', cancelButtonText: 'Отмена', type: 'warning', dangerouslyUseHTMLString: true },
        ).catch(() => false)
      if (!ok) return
    }
  }

  for (const cn of compNames) {
    const info = checkExistingComponentName(cn)
    if (info && info.usedInTypes.length > 0) {
      const typeNames = info.usedInTypes.map((t) => t.name).join(', ')
      const ok = await ElMessageBox
        .confirm(
          `Компонент "${cn}" уже используется в: ${typeNames}.<br>Вы уверены, что хотите продолжить?`,
          'Компонент уже используется',
          { confirmButtonText: 'Продолжить', cancelButtonText: 'Отмена', type: 'warning', dangerouslyUseHTMLString: true },
        ).catch(() => false)
      if (!ok) return
    }
  }

  const missing = compNames.filter((n) => !componentMapByName.value.has(normalizeText(n)))
  if (missing.length > 0) { ElMessage.warning(`Новые компоненты пока нельзя добавить из интерфейса: ${missing.join(', ')}`); return }

  saving.value = true
  try {
    const componentIds = compNames.map((n) => componentMapByName.value.get(normalizeText(n))!.id)
    const geometryId =
      geometryIdByKind.value[form.value.geometry] ??
      geometryOptions.value.find(
        (o) => normalizeGeometry(o.name ?? o.value ?? o.code ?? o.id, geometryOptions.value) === form.value.geometry,
      )?.id ?? null

    const payload: SaveTypeObjectRequest = { name: nameTrimmed, geometryId, componentIds }
    if (editing.value?.id) payload.id = editing.value.id

    await callRpc<SaveTypeObjectResponse, SaveTypeObjectRequest>('saveTypeObject', payload)
    ElMessage.success(editing.value?.id ? 'Изменено' : 'Создано')
    await qc.invalidateQueries({ queryKey: ['object-types'] })
    dialog.value = false
  } catch {
    ElMessage.error('Не удалось сохранить')
  } finally {
    saving.value = false
  }
}

const removeRow = async (id: string) => {
  await ElMessageBox.confirm('Удалить запись?', 'Подтверждение', { type: 'warning' })
  try {
    await callRpc<void, DeleteTypeObjectRequest>('deleteTypeObject', { id })
    ElMessage.success('Удалено')
    await qc.invalidateQueries({ queryKey: ['object-types'] })
  } catch {
    ElMessage.error('Не удалось удалить')
  }
}
</script>

<style scoped>
.table-stretch { width: 100%; }

:deep(.el-table .cell) { display: block; width: 100%; box-sizing: border-box; }

:deep(.el-table .col-name .cell),
:deep(.el-table .col-components .cell) { white-space: normal; word-break: break-word; }

.object-types-page { height: 100%; display: flex; flex-direction: column; box-sizing: border-box; }

.table-area { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 8px; }
.table-full { flex: 1; }

.pagination-bar { display: flex; justify-content: flex-end; padding: 4px 0 0; }

/* Колонка "Компоненты" */
.components-cell-wrap { position: relative; padding-right: 28px; }
.components-cell {
  display: block; position: relative; line-height: 24px; max-height: 24px; overflow: hidden;
  mask-image: linear-gradient(to right, black 85%, transparent 100%);
  -webkit-mask-image: linear-gradient(to right, black 85%, transparent 100%);
}
.components-cell.is-expanded { max-height: none; mask-image: none; -webkit-mask-image: none; }
.component-tag { margin: 2px 6px 2px 0; }
.components-toggle {
  position: absolute; top: 0; right: 2px; height: 24px; width: 24px;
  display: inline-flex; align-items: center; justify-content: center;
  border: none; border-radius: 9999px; background: var(--el-bg-color, #fff); cursor: pointer;
}
:deep(.component-tag .el-tag__content) { white-space: normal; word-break: break-word; }

/* Верхушка */
.page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.page-title { max-width: 60ch; }
.page-actions { display: flex; gap: 8px; align-items: center; }

/* Адаптив */
@media (max-width: 900px) {
  .page-header { flex-direction: column; align-items: stretch; gap: 12px; }
  .page-actions { justify-content: flex-start; flex-wrap: wrap; }
}

/* Небольшие кастомизации EP */
:deep(.el-input__wrapper) { border-color: #006d77; box-shadow: 0 0 0 1px #006d77 inset; }
:deep(.el-tooltip__wrapper) { border-color: #006d77; box-shadow: 0 0 0 1px #006d77 inset; }

.warning-text { color: #e6a23c; font-size: 12px; font-style: italic; }
</style>
