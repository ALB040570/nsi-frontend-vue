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

    <el-table
      :data="filtered"
      class="s360-cards"
      style="width: 100%"
      :cell-style="{ padding: '0' }"
      :header-cell-style="{ padding: '0' }"
    >
      <el-table-column prop="name" label="Название" />
      <el-table-column label="Геометрия" width="120">
        <template #default="{ row }">
          <el-tag effect="plain">
            {{
              row.geometry === 'точка' ? 'Точка' : row.geometry === 'линия' ? 'Линия' : 'Полигон'
            }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="Компоненты">
        <template #default="{ row }">
          <div style="display: flex; flex-wrap: wrap; gap: 6px">
            <el-tag v-for="name in row.component" :key="name" size="small" effect="plain">
              {{ name }}
            </el-tag>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="Действия" width="180">
        <template #default="{ row }">
          <div style="display: flex; gap: 8px; justify-content: center">
            <el-tooltip content="Изменить">
              <el-button :icon="Edit" circle plain @click="openEdit(row)" />
            </el-tooltip>
            <el-tooltip content="Удалить">
              <el-button :icon="Delete" circle type="danger" plain @click="removeRow(row.id)" />
            </el-tooltip>
          </div>
        </template>
      </el-table-column>
    </el-table>

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
              v-for="c in components.data?.value ?? []"
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
import { ref, computed } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { api } from '@/lib/api'
import type { ObjectType, GeometryKind, Component } from '@/types/nsi'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Delete } from '@element-plus/icons-vue'
import { debounce } from 'lodash-es'

const qc = useQueryClient()
const q = ref('')

// список компонентов (для выпадашки — только имена нужны)
const components = useQuery({
  queryKey: ['components'],
  queryFn: async (): Promise<Component[]> => {
    const { data } = await api.get('/components') // [{id,name}]
    return data
  },
})

// список типов
const list = useQuery({
  queryKey: ['object-types'],
  queryFn: async (): Promise<ObjectType[]> => {
    const { data } = await api.get('/object-types')
    return data
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
  const normalizedName = name.trim().toLowerCase()
  return types.find((t) => t.name.toLowerCase() === normalizedName && t.id !== excludeId) || null
}

const checkExistingComponentName = (
  name: string,
): { component: Component; usedInTypes: ObjectType[] } | null => {
  const componentsList = components.data?.value ?? []
  const typesList = list.data?.value ?? []
  const normalizedName = name.trim().toLowerCase()

  const existingComponent = componentsList.find((c) => c.name.toLowerCase() === normalizedName)

  if (!existingComponent) return null

  // Находим типы объектов, которые используют этот компонент
  const typesUsingComponent = typesList.filter((t) =>
    t.component.some((comp) => comp.toLowerCase() === normalizedName),
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
    newType.name.toLowerCase() === existingType.name.toLowerCase() &&
    newType.geometry === existingType.geometry &&
    newComponentsSorted.length === existingComponentsSorted.length &&
    newComponentsSorted.every(
      (comp, index) => comp.toLowerCase() === existingComponentsSorted[index].toLowerCase(),
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
  const nameChanged = isEditing && editing.value!.name.toLowerCase() !== nameTrimmed.toLowerCase()

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
    // 1) создаём недостающие компоненты в /components
    // текущий список из кэша vue-query
    const existing: Component[] = components.data?.value ?? []
    const existingByName = new Set(existing.map((c) => c.name.toLowerCase()))

    const toCreate = compNames.filter((n) => !existingByName.has(n.toLowerCase()))

    let created: Component[] = []
    if (toCreate.length) {
      // создаём все недостающие компоненты
      created = await Promise.all(
        toCreate.map(async (name) => {
          const { data } = await api.post('/components', { name })
          return data as Component
        }),
      )

      // 1a) сразу обновим локальный кэш, чтобы выпадающий список видел новые элементы
      qc.setQueryData<Component[] | undefined>(['components'], (old) => {
        const base = old ?? existing
        const merged = base.slice()
        for (const c of created) {
          if (!merged.some((x) => x.id === c.id || x.name.toLowerCase() === c.name.toLowerCase())) {
            merged.push(c)
          }
        }
        return merged
      })
    }

    // 2) формируем payload и сохраняем тип
    const payload = {
      name: nameTrimmed,
      geometry: form.value.geometry,
      component: compNames, // МАССИВ СТРОК — названия
    }

    if (editing.value?.id) {
      await api.put(`/object-types/${editing.value.id}`, {
        id: editing.value.id,
        ...payload,
      })
      ElMessage.success('Изменено')
    } else {
      await api.post('/object-types', payload)
      ElMessage.success('Создано')
    }

    // 3) обновим списки
    await qc.invalidateQueries({ queryKey: ['object-types'] })
    // на всякий случай тоже инвалидация компонентов (рефетч с сервера)
    await qc.invalidateQueries({ queryKey: ['components'] })

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
  await api.delete(`/object-types/${id}`)
  ElMessage.success('Удалено')
  await qc.invalidateQueries({ queryKey: ['object-types'] })
}
</script>

<style scoped>
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
