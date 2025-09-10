<template>
  <section>
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

    <el-table :data="filtered" border style="width: 100%">
      <el-table-column prop="name" label="Название" />

      <el-table-column label="Геометрия" width="140">
        <template #default="{ row }">
          <el-tag effect="plain">
            {{ geomLabel(row.geometry) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="Компоненты">
        <template #default="{ row }">
          <div style="display: flex; flex-wrap: wrap; gap: 6px">
            <el-tag v-for="n in row.component" :key="n" size="small" effect="plain">
              {{ n }}
            </el-tag>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="Действия" width="120" align="center">
        <template #default="{ row }">
          <el-tooltip content="Изменить">
            <el-button :icon="Edit" circle plain @click="openEdit(row)" />
          </el-tooltip>
          <el-tooltip content="Удалить">
            <el-button :icon="Delete" circle type="danger" plain @click="removeRow(row.id)" />
          </el-tooltip>
        </template>
      </el-table-column>
    </el-table>

    <!-- Диалог создания/редактирования -->
    <el-dialog v-model="dialog" :title="editing ? 'Изменить тип' : 'Создать тип'" width="560">
      <el-form :model="form" label-width="120px">
        <el-form-item label="Название" :error="errors.name">
          <el-input v-model="form.name" @blur="maybeWarnTypeDuplicate" />
        </el-form-item>

        <el-form-item label="Геометрия">
          <el-radio-group v-model="form.geometry">
            <el-radio-button label="point">Точка</el-radio-button>
            <el-radio-button label="line">Линия</el-radio-button>
            <el-radio-button label="polygon">Полигон</el-radio-button>
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
            @change="onComponentsChange"
          >
            <el-option
              v-for="c in components.data?.value ?? []"
              :key="c.id"
              :label="c.name"
              :value="c.name"
            />
          </el-select>
          <p class="text-small" style="margin-top: 6px">
            Можно выбирать несколько. Чтобы добавить новый компонент — введите название и нажмите
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
import { ref, computed, watch, nextTick } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { api } from '@/lib/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Delete } from '@element-plus/icons-vue'

/** ===== ЛОКАЛЬНЫЕ ТИПЫ под json-server ===== */
type ID = string
type GeometryKind = 'point' | 'line' | 'polygon'
type ObjectTypeApi = {
  id: ID
  name: string
  geometry: GeometryKind
  component: string[] // массив НАЗВАНИЙ компонентов
}
type ComponentApi = { id: ID; name: string }

/** ===== ВЫБОРКИ ===== */
const components = useQuery({
  queryKey: ['components'],
  queryFn: async (): Promise<ComponentApi[]> => (await api.get('/components')).data,
})

const list = useQuery({
  queryKey: ['object-types'],
  queryFn: async (): Promise<ObjectTypeApi[]> => (await api.get('/object-types')).data,
})

/** ===== ФИЛЬТР ПОИСКА ===== */
const q = ref('')
const filtered = computed(() =>
  (list.data?.value ?? []).filter((i) => i.name.toLowerCase().includes(q.value.toLowerCase())),
)

/** ===== ДИАЛОГ, ФОРМА ===== */
const dialog = ref(false)
const editing = ref<ObjectTypeApi | null>(null)
const form = ref<{ name: string; geometry: GeometryKind; component: string[] }>({
  name: '',
  geometry: 'point',
  component: [],
})
const errors = ref<{ name?: string }>({})
const saving = ref(false)

function openCreate() {
  editing.value = null
  form.value = { name: '', geometry: 'point', component: [] }
  errors.value = {}
  dialog.value = true
}
function openEdit(row: ObjectTypeApi) {
  editing.value = row
  form.value = { name: row.name, geometry: row.geometry, component: [...(row.component ?? [])] }
  errors.value = {}
  dialog.value = true
}

/** ===== УТИЛИТЫ ===== */
const geomLabel = (g: GeometryKind) =>
  g === 'point' ? 'Точка' : g === 'line' ? 'Линия' : 'Полигон'
const norm = (s: string) => (s ?? '').trim().toLowerCase()
const qc = useQueryClient()

function findTypeByName(name: string) {
  const val = list.data?.value ?? []
  return val.find((t) => norm(t.name) === norm(name) && t.id !== editing.value?.id)
}
function typesUsingComponent(compName: string) {
  const n = norm(compName)
  return (list.data?.value ?? []).filter((t) => (t.component ?? []).some((c) => norm(c) === n))
}

/** ===== ПРЕДУПРЕЖДЕНИЯ О ДУБЛИКАТАХ ===== */
async function maybeWarnTypeDuplicate(): Promise<boolean> {
  const nameTrimmed = (form.value.name ?? '').trim()
  if (!nameTrimmed) return true
  const dup = findTypeByName(nameTrimmed)
  if (!dup) return true

  const msg = [
    `Тип с названием «${dup.name}» уже существует.`,
    '',
    `Геометрия: ${geomLabel(dup.geometry)}`,
    `Компоненты: ${dup.component?.length ? dup.component.join(', ') : '—'}`,
    '',
    'Вы хотите продолжить с этим названием или изменить его?',
  ].join('\n')

  try {
    await ElMessageBox.confirm(msg, 'Дубликат названия типа', {
      confirmButtonText: 'Игнорировать и продолжить',
      cancelButtonText: 'Изменить название',
      type: 'warning',
      distinguishCancelAndClose: true,
    })
    return true
  } catch {
    return false
  }
}

async function maybeWarnComponentDuplicate(name: string): Promise<boolean> {
  const n = (name ?? '').trim()
  if (!n) return true

  const existsInCatalog = (components.data?.value ?? []).some((c) => norm(c.name) === norm(n))
  const usedIn = typesUsingComponent(n)
  if (!existsInCatalog && usedIn.length === 0) return true

  const lines: string[] = [
    `Компонент «${n}» уже существует.`,
    existsInCatalog ? 'Он есть в справочнике компонентов.' : '',
  ]
  if (usedIn.length) {
    lines.push('', 'Сейчас он встречается в типах:')
    for (const t of usedIn.slice(0, 8)) lines.push(`• ${t.name} (${geomLabel(t.geometry)})`)
    if (usedIn.length > 8) lines.push(`… и ещё ${usedIn.length - 8}`)
  }
  lines.push('', 'Продолжить с этим названием или изменить?')

  try {
    await ElMessageBox.confirm(lines.join('\n'), 'Дубликат компонента', {
      confirmButtonText: 'Игнорировать и продолжить',
      cancelButtonText: 'Изменить название',
      type: 'info',
      distinguishCancelAndClose: true,
    })
    return true
  } catch {
    return false
  }
}

/** Ловим последнее добавленное значение в мультиселекте */
let lastComponentsSnapshot: string[] = []
watch(
  () => form.value.component,
  (newVal) => {
    const prev = lastComponentsSnapshot
    const added = (newVal ?? []).find((v) => !(prev ?? []).includes(v))
    lastComponentsSnapshot = [...(newVal ?? [])]
    if (added) {
      nextTick(async () => {
        const ok = await maybeWarnComponentDuplicate(added)
        if (!ok) {
          form.value.component = (form.value.component ?? []).filter((v) => v !== added)
        }
      })
    }
  },
  { deep: true, immediate: true },
)
function onComponentsChange(_val: string[]) {
  /* можно не использовать — watch выше всё делает */
}

/** ===== СОХРАНЕНИЕ ===== */
async function save() {
  // базовая валидация
  errors.value = {}
  const nameTrimmed = (form.value.name ?? '').trim()
  if (nameTrimmed.length < 2) {
    errors.value.name = 'Мин. 2 символа'
    return
  }

  // предупреждение про дубликат имени типа
  const okType = await maybeWarnTypeDuplicate()
  if (!okType) return

  // предупреждение по каждому компоненту
  for (const compName of form.value.component ?? []) {
    const okComp = await maybeWarnComponentDuplicate(compName)
    if (!okComp) return
  }

  // нормализуем компоненты
  const compNames = Array.from(
    new Set((form.value.component ?? []).map((s) => (s ?? '').trim()).filter(Boolean)),
  )

  saving.value = true
  try {
    // 1) создаём недостающие компоненты в каталоге
    const existing = components.data?.value ?? []
    const existingByName = new Set(existing.map((c) => c.name.toLowerCase()))
    const toCreate = compNames.filter((n) => !existingByName.has(n.toLowerCase()))

    let created: ComponentApi[] = []
    if (toCreate.length) {
      created = await Promise.all(
        toCreate.map(async (name) => {
          const { data } = await api.post('/components', { name })
          return data as ComponentApi
        }),
      )
      // сразу обновим кэш, чтобы выпадающий список увидел новые
      qc.setQueryData<ComponentApi[] | undefined>(['components'], (old) => {
        const base = old ?? existing
        const merged = base.slice()
        for (const c of created) {
          if (!merged.some((x) => x.id === c.id || norm(x.name) === norm(c.name))) merged.push(c)
        }
        return merged
      })
    }

    // 2) сохраняем/обновляем тип
    const payload: Omit<ObjectTypeApi, 'id'> = {
      name: nameTrimmed,
      geometry: form.value.geometry,
      component: compNames, // сохраняем НАЗВАНИЯ
    }

    if (editing.value?.id) {
      await api.put(`/object-types/${editing.value.id}`, { id: editing.value.id, ...payload })
      ElMessage.success('Изменено')
    } else {
      await api.post('/object-types', payload)
      ElMessage.success('Создано')
    }

    // 3) обновим списки
    await qc.invalidateQueries({ queryKey: ['object-types'] })
    await qc.invalidateQueries({ queryKey: ['components'] })

    dialog.value = false
  } catch (e) {
    console.error(e)
    ElMessage.error('Не удалось сохранить')
  } finally {
    saving.value = false
  }
}

/** ===== УДАЛЕНИЕ ===== */
const removeRow = async (id: string) => {
  await ElMessageBox.confirm('Удалить запись?', 'Подтверждение', { type: 'warning' })
  await api.delete(`/object-types/${id}`)
  ElMessage.success('Удалено')
  await qc.invalidateQueries({ queryKey: ['object-types'] })
}
</script>

<style scoped>
/* подчёркнём инпуты и кружки-иконки в нашем цвете */
::v-deep(.el-input__wrapper) {
  border-color: #006d77;
  box-shadow: 0 0 0 1px #006d77 inset;
}
::v-deep(.el-tooltip__wrapper) {
  border-color: #006d77;
  box-shadow: 0 0 0 1px #006d77 inset;
}

/* необязательная косметика заголовка */
.page-header {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.page-title {
  display: grid;
  gap: 6px;
}
.page-actions {
  display: flex;
  gap: 8px;
}
</style>
