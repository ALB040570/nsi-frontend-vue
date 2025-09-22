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
        <el-input v-model="q" placeholder="Поиск…" clearable style="width: 260px" />
        <el-button @click="openCreate" class="btn-primary">+ Создать</el-button>
      </div>
    </header>

    <p class="text-body">
      Это перечень категорий инфраструктурных объектов, используемый для их классификации,
      планирования и учета работ. Вы можете редактировать существующие типы, удалять или привязывать
      компоненты.
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
        <!-- 1 колонка - самая большая -->
        <el-table-column prop="name" label="Название" width="400" class-name="col-name" />
        <!-- 2 колонка - по размеру самого длинного значения -->
        <el-table-column label="Геометрия" width="120" align="center">
          <template #default="{ row }">
            <el-tag effect="plain" size="small">
              {{
                row.geometry === 'точка' ? 'Точка' : row.geometry === 'линия' ? 'Линия' : 'Полигон'
              }}
            </el-tag>
          </template>
        </el-table-column>
        <!-- 3 колонка - вторая по ширине -->
        <el-table-column label="Компоненты" class-name="col-components">
          <template #default="{ row }">
            <div class="components-cell">
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
          </template>
        </el-table-column>
        <!-- 4 колонка - фиксированная ширина для кнопок -->
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

    <!-- Диалог создания/редактирования -->
    <el-dialog v-model="dialog" :title="editing ? 'Изменить тип' : 'Создать тип'" width="560">
      <el-form :model="form" label-width="120px">
        <el-form-item label="Название" :error="errors.name">
          <el-input v-model="form.name" />
          <div
            v-if="nameWarning"
            class="warning-text"
            style="color: #e6a23c; font-size: 12px; margin-top: 4px"
          >
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
            <el-option
              v-for="option in componentOptions"
              :key="option.id"
              :label="option.name"
              :value="option.name"
            />
          </el-select>
          <p class="text-small" style="margin-top: 6px">
            Можно выбрать несколько. Чтобы добавить новый компонент — введите название и нажмите
            Enter.
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
import { computed, reactive, ref, watch, watchEffect } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Delete } from '@element-plus/icons-vue'
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

const normalizeText = (value: string | null | undefined): string =>
  value?.trim().toLowerCase() ?? ''

const safeString = (value: unknown): string => (value ?? '').toString()

const trimmedString = (value: unknown): string => safeString(value).trim()

const toOptionalString = (value: unknown): string | null => {
  const valueString = trimmedString(value)
  return valueString ? valueString : null
}

function extractRecords<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[]
  }

  if (payload && typeof payload === 'object') {
    const envelope = payload as {
      result?: { records?: unknown; data?: unknown } | null
      records?: unknown
      data?: unknown
    }

    const records = envelope.result?.records
    if (Array.isArray(records)) {
      return records as T[]
    }

    const data = envelope.result?.data
    if (Array.isArray(data)) {
      return data as T[]
    }

    if (Array.isArray(envelope.records)) {
      return envelope.records as T[]
    }

    if (Array.isArray(envelope.data)) {
      return envelope.data as T[]
    }
  }

  return []
}

function getErrorMessage(error: unknown): string {
  if (!error) {
    return ''
  }

  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

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
    if (!fvId && !pvId) {
      continue
    }

    const geometryLabel =
      option.name ?? option.value ?? option.code ?? option.id ?? option.ID ?? ''
    const kind = normalizeGeometry(geometryLabel, geometryOptions)

    if (fvId) {
      geometryKindByFvId.set(fvId, kind)
      if (!geometryIdByKind[kind]) {
        geometryIdByKind[kind] = fvId
      }
    }

    if (pvId) {
      geometryKindByPvId.set(pvId, kind)
    }
  }

  const componentOptionsMap = new Map<string, ComponentOption>()
  const componentsByTypeMap = new Map<string, ComponentOption[]>()

  for (const link of rawComponents) {
    const typeId = toOptionalString(link.idrom1)
    const componentId = toOptionalString(link.idrom2)
    const componentName = toOptionalString(link.namerom2)

    if (!typeId || !componentId || !componentName) {
      continue
    }

    const normalizedName = normalizeText(componentName)
    let option = componentOptionsMap.get(normalizedName)

    if (!option) {
      option = { id: componentId, name: componentName }
      componentOptionsMap.set(normalizedName, option)
    }

    const list = componentsByTypeMap.get(typeId) ?? []
    list.push(option)
    componentsByTypeMap.set(typeId, list)
  }

  const componentOptions = Array.from(componentOptionsMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'ru'),
  )

  const componentsByType: ComponentsByType = {}
  for (const [typeId, componentList] of componentsByTypeMap.entries()) {
    const uniqueById = new Map<string, ComponentOption>()
    for (const component of componentList) {
      if (!uniqueById.has(component.id)) {
        uniqueById.set(component.id, component)
      }
    }

    componentsByType[typeId] = Array.from(uniqueById.values()).sort((a, b) =>
      a.name.localeCompare(b.name, 'ru'),
    )
  }

  const items: ObjectType[] = rawTypes.map((record) => {
    const id = safeString(record.id)
    const name = safeString(record.name ?? record.nameCls)

    const fvKey = toOptionalString(record.fvShape)
    const pvKey = toOptionalString(record.pvShape)
    const geometry =
      (fvKey ? geometryKindByFvId.get(fvKey) : undefined) ??
      (pvKey ? geometryKindByPvId.get(pvKey) : undefined) ??
      DEFAULT_GEOMETRY

    const componentNames =
      componentsByType[id]?.map((component) => component.name) ?? []

    return { id, name, geometry, component: componentNames }
  })

  return {
    items,
    componentOptions,
    componentsByType,
    geometryOptions,
    geometryIdByKind,
  }
}

const qc = useQueryClient()

const q = ref('')

const pagination = reactive<PaginationState>({ page: 1, pageSize: 10 })

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

const tableLoading = computed(
  () => fetchState.value.isLoading || fetchState.value.isFetching,
)

watch(
  () => fetchState.value.errorMessage,
  (message, previous) => {
    if (message && message !== previous) {
      ElMessage.error(message)
    }
  },
)

const objectTypes = computed(() => snapshot.value?.items ?? [])
const componentsByType = computed(
  () => snapshot.value?.componentsByType ?? {},
)
const componentOptions = computed(() => snapshot.value?.componentOptions ?? [])
const geometryOptions = computed(() => snapshot.value?.geometryOptions ?? [])
const geometryIdByKind = computed(
  () => snapshot.value?.geometryIdByKind ?? {},
)

const componentMapByName = computed(() => {
  const map = new Map<string, ComponentOption>()
  for (const option of componentOptions.value) {
    map.set(normalizeText(option.name), option)
  }
  return map
})

const filteredRows = computed(() => {
  const search = q.value.trim().toLowerCase()
  if (!search) {
    return objectTypes.value
  }

  return objectTypes.value.filter((item) =>
    Object.values(item).some((value) => {
      if (value === null || value === undefined) {
        return false
      }

      return String(value).toLowerCase().includes(search)
    }),
  )
})

const total = computed(() => filteredRows.value.length)

const paginatedRows = computed(() => {
  const start = Math.max(0, (pagination.page - 1) * pagination.pageSize)
  return filteredRows.value.slice(start, start + pagination.pageSize)
})

const maxPage = computed(() =>
  Math.max(1, Math.ceil(total.value / pagination.pageSize) || 1),
)

watch([q, objectTypes], () => {
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

const dialog = ref(false)
const editing = ref<ObjectType | null>(null)
const form = ref<FormState>({ name: '', geometry: DEFAULT_GEOMETRY, component: [] })
const errors = ref<FormErrors>({})
const saving = ref(false)

const checkExistingTypeName = (name: string, excludeId?: string): ObjectType | null => {
  const normalizedName = normalizeText(name)
  return (
    objectTypes.value.find(
      (type) => normalizeText(type.name) === normalizedName && type.id !== excludeId,
    ) ?? null
  )
}

const checkExistingComponentName = (
  name: string,
): { component: ComponentOption; usedInTypes: ObjectType[] } | null => {
  const normalizedName = normalizeText(name)
  if (!normalizedName) {
    return null
  }

  const existingComponent = componentMapByName.value.get(normalizedName)
  if (!existingComponent) {
    return null
  }

  const usedInTypes = objectTypes.value.filter((type) =>
    (componentsByType.value[type.id] ?? []).some(
      (component) => normalizeText(component.name) === normalizedName,
    ),
  )

  return { component: existingComponent, usedInTypes }
}

const isTypeCompletelyIdentical = (
  newType: { name: string; geometry: GeometryKind; component: string[] },
  existingType: ObjectType,
): boolean => {
  const newComponentsSorted = [...newType.component].sort()
  const existingComponentsSorted = [...existingType.component].sort()

  return (
    normalizeText(newType.name) === normalizeText(existingType.name) &&
    newType.geometry === existingType.geometry &&
    newComponentsSorted.length === existingComponentsSorted.length &&
    newComponentsSorted.every(
      (componentName, index) =>
        normalizeText(componentName) === normalizeText(existingComponentsSorted[index]),
    )
  )
}

const nameWarning = computed(() => {
  if (!form.value.name.trim()) {
    return ''
  }

  const existingType = checkExistingTypeName(form.value.name, editing.value?.id)
  if (existingType) {
    return `Предупреждение: тип с таким названием уже существует (${existingType.geometry})`
  }

  return ''
})

const checkComponent = (componentName: string) => {
  const existingComponentInfo = checkExistingComponentName(componentName)
  if (existingComponentInfo && existingComponentInfo.usedInTypes.length > 0) {
    ElMessage.warning(`Компонент "${componentName}" уже используется в других типах объектов`)
  }
}

const debouncedCheckComponent = debounce(checkComponent, 500)

const handleComponentBlur = (event: FocusEvent) => {
  const target = event.target as HTMLInputElement | null
  if (target) {
    debouncedCheckComponent(target.value)
  }
}

function openCreate() {
  editing.value = null
  form.value = { name: '', geometry: DEFAULT_GEOMETRY, component: [] }
  errors.value = {}
  dialog.value = true
}

function openEdit(row: ObjectType) {
  editing.value = row
  form.value = {
    name: row.name,
    geometry: row.geometry,
    component: [...row.component],
  }
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

  const compNames = Array.from(
    new Set(form.value.component.map((value) => value.trim()).filter(Boolean)),
  )

  const isEditing = Boolean(editing.value)
  const nameChanged =
    isEditing && normalizeText(editing.value!.name) !== normalizeText(nameTrimmed)

  if (!isEditing || nameChanged) {
    const existingType = checkExistingTypeName(nameTrimmed, editing.value?.id)
    if (existingType) {
      const newTypeData = {
        name: nameTrimmed,
        geometry: form.value.geometry,
        component: compNames,
      }

      if (isTypeCompletelyIdentical(newTypeData, existingType)) {
        ElMessage.error('Нельзя создать полностью идентичный тип объекта')
        return
      }

      const confirmOverwrite = await ElMessageBox.confirm(
        `Тип объекта "${nameTrimmed}" уже существует:<br><br>` +
          `• Геометрия: ${existingType.geometry}<br>` +
          `• Компоненты: ${existingType.component.join(', ') || 'нет'}<br><br>` +
          'Вы уверены, что хотите продолжить?',
        'Тип с таким названием уже есть',
        {
          confirmButtonText: 'Продолжить',
          cancelButtonText: 'Отмена',
          type: 'warning',
          dangerouslyUseHTMLString: true,
        },
      ).catch(() => false)

      if (!confirmOverwrite) {
        return
      }
    }
  }

  for (const componentName of compNames) {
    const existingComponentInfo = checkExistingComponentName(componentName)
    if (existingComponentInfo) {
      const { usedInTypes } = existingComponentInfo

      if (usedInTypes.length > 0) {
        const typeNames = usedInTypes.map((type) => type.name).join(', ')
        const confirmReuse = await ElMessageBox.confirm(
          `Компонент "${componentName}" уже используется в: ${typeNames}.<br>` +
            'Вы уверены, что хотите продолжить?',
          'Компонент уже используется',
          {
            confirmButtonText: 'Продолжить',
            cancelButtonText: 'Отмена',
            type: 'warning',
            dangerouslyUseHTMLString: true,
          },
        ).catch(() => false)

        if (!confirmReuse) {
          return
        }
      }
    }
  }

  const missingComponents = compNames.filter(
    (name) => !componentMapByName.value.has(normalizeText(name)),
  )

  if (missingComponents.length > 0) {
    const listText = missingComponents.join(', ')
    ElMessage.warning(
      listText
        ? `Новые компоненты пока нельзя добавить из интерфейса: ${listText}`
        : 'Новые компоненты пока нельзя добавить из интерфейса',
    )
    return
  }

  saving.value = true
  try {
    const componentIds = compNames.map(
      (name) => componentMapByName.value.get(normalizeText(name))!.id,
    )

    const geometryId =
      geometryIdByKind.value[form.value.geometry] ??
      geometryOptions.value.find(
        (option) =>
          normalizeGeometry(option.name ?? option.value ?? option.code ?? option.id, geometryOptions.value) ===
          form.value.geometry,
      )?.id ??
      null

    const payload: SaveTypeObjectRequest = {
      name: nameTrimmed,
      geometryId,
      componentIds,
    }

    if (editing.value?.id) {
      payload.id = editing.value.id
    }

    await callRpc<SaveTypeObjectResponse, SaveTypeObjectRequest>('saveTypeObject', payload)

    ElMessage.success(editing.value?.id ? 'Изменено' : 'Создано')

    await qc.invalidateQueries({ queryKey: ['object-types'] })

    dialog.value = false
  } catch (err) {
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
  } catch (err) {
    ElMessage.error('Не удалось удалить')
  }
}
</script>

<style scoped>
.table-stretch {
  width: 100%;
}

::v-deep(.el-table .cell) {
  display: block;
  width: 100%;
  box-sizing: border-box;
}

::v-deep(.el-table .col-name .cell),
::v-deep(.el-table .col-components .cell) {
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
}

.pagination-bar {
  display: flex;
  justify-content: flex-end;
  padding: 4px 0 0;
}

.components-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: flex-start;
  overflow: hidden;
}

.component-tag {
  max-width: 100%;
}

::v-deep(.component-tag .el-tag__content) {
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

/* твои кастомизации Element Plus */
::v-deep(.el-input__wrapper) {
border-color: #006d77;
box-shadow: 0 0 0 1px #006d77 inset;
}
::v-deep(.el-tooltip__wrapper) {
border-color: #006d77;
box-shadow: 0 0 0 1px #006d77 inset;
}

.warning-text {
color: #e6a23c;
font-size: 12px;
margin-top: 4px;
font-style: italic;
}
</style>
