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
        :data="paged"
        class="s360-cards table-full"
        style="width: 100%"
        height="100%"
      >
        <!-- 1 колонка - самая большая -->
        <el-table-column prop="name" label="Название" width="400" />
        <!-- 2 колонка - по размеру самого длинного значения -->
        <el-table-column label="Геометрия" width="120" min-width="120">
          <template #default="{ row }">
            <el-tag effect="plain" size="small">
              {{
                row.geometry === 'точка' ? 'Точка' : row.geometry === 'линия' ? 'Линия' : 'Полигон'
              }}
            </el-tag>
          </template>
        </el-table-column>
        <!-- 3 колонка - вторая по ширине -->
        <el-table-column label="Компоненты" width="400">
          <template #default="{ row }">
            <div class="components-cell">
              <el-tag
                v-for="name in row.component"
                :key="name"
                size="small"
                effect="plain"
                class="component-tag"
              >
                {{ name }}
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
          v-model:current-page="page"
          v-model:page-size="pageSize"
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
            @blur="(e) => debouncedCheckComponent(e.target.value)"
          >
            <el-option
              v-for="c in componentOptions.value"
              :key="c.id"
              :label="c.name"
              :value="c.name"
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
import { ref, computed, watch } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { callRpc } from '@/lib/api'
import type { ObjectType, GeometryKind } from '@/types/nsi'
import type {
  ComponentOption,
  LoadComponentsObject2Response,
  LoadFvForSelectResponse,
  LoadTypesObjectsResponse,
  SaveTypeObjectRequest,
  SaveTypeObjectResponse,
  DeleteTypeObjectRequest,
} from '@/types/nsi-remote'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Delete } from '@element-plus/icons-vue'
import { debounce } from 'lodash-es'

const qc = useQueryClient()
const q = ref('')

const componentOptions = ref<ComponentOption[]>([])
const componentsByType = ref<Record<string, ComponentOption[]>>({})
const geometryOptions = ref<LoadFvForSelectResponse>([])
const geometryIdByKind = ref<Partial<Record<GeometryKind, string | null>>>({})

const norm = (value: string | null | undefined) => (value ?? '').trim().toLowerCase()

const componentMapByName = computed(() => {
  const map = new Map<string, ComponentOption>()
  for (const option of componentOptions.value) {
    map.set(norm(option.name), option)
  }
  return map
})

// список типов
const recs = <T = any>(x: any): T[] =>
  Array.isArray(x) ? x : x?.result?.records ?? x?.records ?? x?.data ?? []

const toKind = (name: any): GeometryKind =>
  name === 'точка' ? 'точка' : name === 'линия' ? 'линия' : 'полигон'

const list = useQuery({
  queryKey: ['object-types'],
  queryFn: async (): Promise<ObjectType[]> => {
    const [typesRaw, shapesRaw, compsRaw] = await Promise.all([
      callRpc('data/loadTypesObjects', [0]),
      callRpc('data/loadFvForSelect', ['Factor_Shape']),
      callRpc('data/loadComponentsObject2', ['RT_Components', 'Typ_ObjectTyp', 'Typ_Components']),
    ])

    const typesList = recs<any>(typesRaw)
    const shapeOptions = recs<any>(shapesRaw)
    const compPairs = recs<any>(compsRaw)

    geometryOptions.value = shapeOptions

    const geomByFvId = new Map<string, GeometryKind>()
    const geomByPvId = new Map<string, GeometryKind>()
    const geometryMapping: Partial<Record<GeometryKind, string | null>> = {}

    for (const opt of shapeOptions) {
      const fvId = String(opt.id ?? opt.ID ?? '')
      const pvId = String(opt.pv ?? opt.PV ?? '')
      if (!fvId && !pvId) continue
      const kind = toKind(opt.name ?? opt.value ?? opt.code ?? '')
      if (fvId) geomByFvId.set(fvId, kind)
      if (pvId) geomByPvId.set(pvId, kind)
      if (!geometryMapping[kind] && fvId) geometryMapping[kind] = fvId
    }
    geometryIdByKind.value = geometryMapping

    const seenByName = new Map<string, ComponentOption>()
    const compsByType = new Map<string, ComponentOption[]>()

    for (const r of compPairs) {
      const typeId = r.idrom1
      const compId = r.idrom2
      const compName = (r.namerom2 ?? '').trim()
      if (typeId == null || !compId || !compName) continue

      const option: ComponentOption = { id: String(compId), name: compName }
      const keyName = norm(compName)
      if (!seenByName.has(keyName)) seenByName.set(keyName, option)

      const k = String(typeId)
      const arr = compsByType.get(k) ?? []
      arr.push(option)
      compsByType.set(k, arr)
    }

    componentOptions.value = Array.from(seenByName.values()).sort((a, b) =>
      a.name.localeCompare(b.name, 'ru'),
    )

    const groupedRecord: Record<string, ComponentOption[]> = {}
    for (const t of typesList) {
      const k = String(t.id ?? t.typeId)
      const arr = (compsByType.get(k) ?? [])
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
      groupedRecord[k] = arr
    }
    componentsByType.value = groupedRecord

    return typesList.map((item: any) => {
      const id = String(item.id)
      const name = item.name ?? item.nameCls ?? ''

      const geometry =
        geomByFvId.get(String(item.fvShape)) ??
        geomByPvId.get(String(item.pvShape)) ??
        ('точка' as GeometryKind)

      const comps = componentsByType.value[id] ?? []
      return { id, name, geometry, component: comps.map((c) => c.name) } as ObjectType
    })
  },
})


// фильтр по поиску
const filtered = computed(() =>
  (list.data?.value ?? []).filter((item) =>
    Object.values(item).some((value) => {
      if (value === null || value === undefined) return false
      return String(value).toLowerCase().includes(q.value.toLowerCase())
    }),
  ),
)

const page = ref(1)
const pageSize = ref(20)

const total = computed(() => filtered.value.length)

const paged = computed(() => {
  const arr = filtered.value
  const start = Math.max(0, (page.value - 1) * pageSize.value)
  return arr.slice(start, start + pageSize.value)
})

watch([q, () => filtered.value], () => {
  page.value = 1
})

watch(pageSize, () => {
  page.value = 1
})

watch(total, (newTotal) => {
  const maxPage = Math.max(1, Math.ceil((newTotal || 0) / pageSize.value) || 1)
  if (page.value > maxPage) {
    page.value = maxPage
  }
})
// ---- диалог / форма ----
const dialog = ref(false)
const editing = ref<ObjectType | null>(null)

const form = ref<{
  name: string
  geometry: GeometryKind
  component: string[] // СТРОКИ — названия компонентов
}>({
  name: '',
  geometry: 'точка',
  component: [],
})

const errors = ref<{ name?: string }>({})
const saving = ref(false)

// Функции проверки уникальности
const checkExistingTypeName = (name: string, excludeId?: string): ObjectType | null => {
  const types = list.data?.value ?? []
  const normalizedName = norm(name)
  return (
    types.find((t) => norm(t.name) === normalizedName && t.id !== excludeId) ?? null
  )
}

const checkExistingComponentName = (
  name: string,
): { component: ComponentOption; usedInTypes: ObjectType[] } | null => {
  const normalizedName = norm(name)
  if (!normalizedName) return null

  const existingComponent = componentMapByName.value.get(normalizedName)
  if (!existingComponent) return null

  const typesList = list.data?.value ?? []

  const typesUsingComponent = typesList.filter((t) =>
    (componentsByType.value[t.id] ?? []).some((comp) => norm(comp.name) === normalizedName),
  )

  return { component: existingComponent, usedInTypes: typesUsingComponent }
}

// Проверка на полное совпадение типа
const isTypeCompletelyIdentical = (
  newType: { name: string; geometry: GeometryKind; component: string[] },
  existingType: ObjectType,
): boolean => {
  const newComponentsSorted = [...newType.component].sort()
  const existingComponentsSorted = [...existingType.component].sort()

  return (
    norm(newType.name) === norm(existingType.name) &&
    newType.geometry === existingType.geometry &&
    newComponentsSorted.length === existingComponentsSorted.length &&
    newComponentsSorted.every(
      (comp, index) => norm(comp) === norm(existingComponentsSorted[index]),
    )
  )
}

// Предупреждение при вводе названия
const nameWarning = computed(() => {
  if (!form.value.name.trim()) return ''

  const existingType = checkExistingTypeName(form.value.name, editing.value?.id)
  if (existingType) {
    return `Внимание: тип с таким названием уже существует (${existingType.geometry})`
  }
  return ''
})

// Проверка компонентов при вводе
const checkComponent = (componentName: string) => {
  const existingComponentInfo = checkExistingComponentName(componentName)
  if (existingComponentInfo && existingComponentInfo.usedInTypes.length > 0) {
    ElMessage.warning(`Компонент "${componentName}" уже используется в других типах объектов`)
  }
}

const debouncedCheckComponent = debounce(checkComponent, 500)

function openCreate() {
  editing.value = null
  form.value = { name: '', geometry: 'точка', component: [] }
  errors.value = {}
  dialog.value = true
}

function openEdit(row: ObjectType) {
  editing.value = row
  form.value = {
    name: row.name,
    geometry: row.geometry,
    component: [...row.component], // копия массива строк
  }
  errors.value = {}
  dialog.value = true
}

async function save() {
  // простая валидация
  errors.value = {}
  const nameTrimmed = (form.value.name ?? '').trim()
  if (nameTrimmed.length < 2) {
    errors.value.name = 'Мин. 2 символа'
    return
  }

  // Нормализуем список компонентов: убираем пустые, пробелы, дубликаты
  const compNames = Array.from(
    new Set((form.value.component ?? []).map((s) => (s ?? '').trim()).filter(Boolean)),
  )

  // Проверка на существующее название типа объекта (только если название изменилось при редактировании)
  const isEditing = !!editing.value
  const nameChanged = isEditing && norm(editing.value!.name) !== norm(nameTrimmed)

  if (!isEditing || nameChanged) {
    const existingType = checkExistingTypeName(nameTrimmed, editing.value?.id)
    if (existingType) {
      const geometryMap: Record<GeometryKind, string> = {
        точка: 'Точка',
        линия: 'Линия',
        полигон: 'Полигон',
      }

      // Проверяем на полное совпадение
      const newTypeData = { name: nameTrimmed, geometry: form.value.geometry, component: compNames }
      if (isTypeCompletelyIdentical(newTypeData, existingType)) {
        ElMessage.error('Нельзя создать полностью идентичный тип объекта')
        return
      }

      const confirm = await ElMessageBox.confirm(
        `Тип объекта "${nameTrimmed}" уже существует:<br><br>` +
          `• Геометрия: ${geometryMap[existingType.geometry]}<br>` +
          `• Компоненты: ${existingType.component.join(', ') || 'нет'}<br><br>` +
          `Всё равно продолжить? Это создаст дубликат названия.`,
        'Такое название уже существует',
        {
          confirmButtonText: 'Продолжить',
          cancelButtonText: 'Отменить',
          type: 'warning',
          dangerouslyUseHTMLString: true,
        },
      ).catch(() => false)

      if (!confirm) return
    }
  }

  // Проверяем каждый компонент на существование
  for (const componentName of compNames) {
    const existingComponentInfo = checkExistingComponentName(componentName)
    if (existingComponentInfo) {
      const { component, usedInTypes } = existingComponentInfo

      if (usedInTypes.length > 0) {
        const typeNames = usedInTypes.map((t) => t.name).join(', ')
        const confirm = await ElMessageBox.confirm(
          `Компонент "${componentName}" уже используется в:<br><br>` +
            `• Типах объектов: ${typeNames}<br><br>` +
            `Всё равно использовать этот компонент?`,
          'Компонент уже существует',
          {
            confirmButtonText: 'Использовать',
            cancelButtonText: 'Изменить название',
            type: 'warning',
            dangerouslyUseHTMLString: true,
          },
        ).catch(() => false)

        if (!confirm) return
      }
    }
  }

  saving.value = true
  try {
    const missingComponents = compNames.filter(
      (name) => !componentMapByName.value.has(norm(name)),
    )

    if (missingComponents.length) {
      const listText = missingComponents.join(', ')
      ElMessage.warning(
        listText
          ? `Новые компоненты пока нельзя добавить из интерфейса: ${listText}`
          : 'Новые компоненты пока нельзя добавить из интерфейса',
      )
      return
    }

    const componentIds = compNames.map(
      (name) => componentMapByName.value.get(norm(name))!.id,
    )

    const geometryId =
      geometryIdByKind.value[form.value.geometry] ??
      geometryOptions.value.find(
        (option) =>
          normalizeGeometry(
            option.name ?? option.value ?? option.code ?? option.id,
            geometryOptions.value,
          ) === form.value.geometry,
      )?.id ??
      null

    const payload: SaveTypeObjectRequest = {
      name: nameTrimmed,
      geometryId,
      componentIds,
    }

    if (editing.value?.id) payload.id = editing.value.id

    await callRpc<SaveTypeObjectResponse, SaveTypeObjectRequest>('saveTypeObject', payload)

    ElMessage.success(editing.value?.id ? 'Изменено' : 'Создано')

    await qc.invalidateQueries({ queryKey: ['object-types'] })

    dialog.value = false
  } catch (err) {
    console.error(err)
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
    console.error(err)
    ElMessage.error('Не удалось удалить')
  }
}
</script>

<style scoped>
.object-types-page {
  height: 100vh;
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
  gap: 4px;
  align-items: flex-start;
}

.component-tag {
  max-width: 100%;
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
