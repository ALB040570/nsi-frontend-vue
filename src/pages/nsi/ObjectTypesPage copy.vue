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
             @change="onComponentsChange"></el-select>
            <!-- ВАЖНО: будем ловить последнее добавленное -->
          >
            <el-option
              v-for="c in components.data?.value ?? []"
              :key="c.id"
              :label="c.name"
              :value="c.name"
            />
            <!-- сохраняем НАЗВАНИЯ -->
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
  geometry: 'point',
  component: [],
})

const errors = ref<{ name?: string }>({})
const saving = ref(false)

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

  // нормализуем список компонентов: убираем пустые, пробелы, дубликаты
  const compNames = Array.from(
    new Set((form.value.component ?? []).map((s) => (s ?? '').trim()).filter(Boolean)),
  )

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
  }
  .page-actions {
    justify-content: flex-start;
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
</style>
