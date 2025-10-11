<!-- Файл: src/pages/nsi/ComponentsPage.vue
     Назначение: страница CRUD справочника «Компоненты» с таблицей, фильтрами и модалкой редактирования.
     Использование: доступна по маршруту /nsi/components. -->
<template>
  <section class="components-page">
    <NCard size="small" class="toolbar" content-style="padding: 10px 14px">
      <div class="toolbar__left">
        <h2 class="page-title">
          Справочник «Компоненты обслуживаемых объектов»
        </h2>
        <div class="subtext">
          Управляйте перечнем компонентов и их связями с типами объектов, параметрами и дефектами
        </div>
      </div>

      <div class="toolbar__controls">
        <NInput
          v-model:value="search"
          placeholder="Поиск по названию и связям"
          clearable
          round
          class="toolbar__search"
        />
        <CreatableSelect
          class="toolbar__filter"
          :options="objectTypeOptions"
          :value="objectTypeFilter"
          :multiple="true"
          placeholder="Фильтр по типам объектов"
          @update:value="handleObjectTypeFilterChange"
        />
        <NButton type="primary" @click="openCreate">+ Создать компонент</NButton>
      </div>
    </NCard>

    <div class="table-area">
      <NDataTable
        class="s360-cards table-full table-stretch"
        :columns="columns"
        :data="paginatedRows"
        :loading="isLoading"
        :row-key="rowKey"
        :bordered="false"
        size="small"
      />

      <div class="pagination-bar">
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

    <NModal
      v-model:show="modalOpen"
      preset="card"
      :title="isEditMode ? 'Редактировать компонент' : 'Создать компонент'"
      style="max-width: 640px; width: 92vw"
    >
      <NSpin :show="saving">
        <NForm ref="formRef" :model="form" :rules="rules" label-width="200" size="small">
          <NFormItem label="Наименование" path="name">
            <NInput v-model:value="form.name" placeholder="Введите наименование компонента" />
          </NFormItem>

          <NFormItem label="Типы объектов" path="objectTypeIds">
            <CreatableSelect
              :options="objectTypeOptions"
              :value="form.objectTypeIds"
              :multiple="true"
              placeholder="Выберите типы объектов"
              :create="createObjectTypeOption"
              @update:value="(value) => (form.objectTypeIds = toArray(value))"
              @created="handleObjectTypeCreated"
            />
          </NFormItem>

          <NFormItem label="Параметры" path="parameterIds">
            <CreatableSelect
              :options="parameterOptions"
              :value="form.parameterIds"
              :multiple="true"
              placeholder="Выберите параметры"
              :create="createParameterOption"
              @update:value="(value) => (form.parameterIds = toArray(value))"
              @created="handleParameterCreated"
            />
          </NFormItem>

          <NFormItem label="Дефекты" path="defectIds">
            <CreatableSelect
              :options="defectOptions"
              :value="form.defectIds"
              :multiple="true"
              placeholder="Выберите дефекты"
              :create="createDefectOption"
              @update:value="(value) => (form.defectIds = toArray(value))"
              @created="handleDefectCreated"
            />
          </NFormItem>
        </NForm>
      </NSpin>

      <template #footer>
        <div class="modal-footer">
          <NButton @click="closeModal">Отмена</NButton>
          <NButton type="primary" class="btn-primary" :loading="saving" @click="handleSave">
            Сохранить
          </NButton>
        </div>
      </template>
    </NModal>
  </section>
</template>

<script setup lang="ts">
import { computed, h, reactive, ref } from 'vue'
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
  NSpin,
  useMessage,
  type DataTableColumns,
  type FormInst,
  type FormRules,
} from 'naive-ui'
import { TrashOutline, CreateOutline } from '@vicons/ionicons5'

import {
  createDefectOnTheFly,
  createObjectTypeOnTheFly,
  createParameterOnTheFly,
  type ComponentsSnapshot,
  type DirectoryOptionWithMeta,
  type LoadedComponentWithRelations,
} from '@entities/component'
import { useComponentMutations, useComponentsQuery } from '@features/component-crud'
import { CreatableSelect } from '@features/creatable-select'
import { normalizeText } from '@shared/lib'

interface PaginationState {
  page: number
  pageSize: number
}

interface ComponentForm {
  name: string
  objectTypeIds: string[]
  parameterIds: string[]
  defectIds: string[]
}

const message = useMessage()
const search = ref('')
const objectTypeFilter = ref<string[]>([])
const pagination = reactive<PaginationState>({ page: 1, pageSize: 10 })
const formRef = ref<FormInst | null>(null)
const modalOpen = ref(false)
const editingComponent = ref<LoadedComponentWithRelations | null>(null)
const saving = ref(false)

const form = reactive<ComponentForm>({
  name: '',
  objectTypeIds: [],
  parameterIds: [],
  defectIds: [],
})

const rules: FormRules = {
  name: [
    { required: true, message: 'Укажите наименование', trigger: ['input', 'blur'] },
    {
      validator: (_rule, value: string) => {
        return value && value.trim().length >= 3
          ? Promise.resolve()
          : Promise.reject(new Error('Минимум 3 символа'))
      },
      trigger: ['blur'],
    },
  ],
}

const { data, isLoading } = useComponentsQuery()
const mutations = useComponentMutations()

const snapshot = computed<ComponentsSnapshot | null>(() => data.value ?? null)

const objectTypeOptions = computed(() =>
  (snapshot.value?.objectTypes ?? []).map((item) => ({ label: item.name, value: item.id })),
)

const parameterOptions = computed(() =>
  (snapshot.value?.parameters ?? []).map((item) => ({ label: item.name, value: item.id })),
)

const defectOptions = computed(() =>
  (snapshot.value?.defects ?? []).map((item) => ({ label: item.name, value: item.id })),
)

const isEditMode = computed(() => editingComponent.value != null)

const normalize = (value: string) => normalizeText(value ?? '')

const filteredRows = computed(() => {
  const q = normalize(search.value)
  const filterSet = new Set(objectTypeFilter.value.map(String))
  const base = snapshot.value?.items ?? []

  return base
    .filter((item) => {
      if (filterSet.size) {
        const hasType = item.objectTypes.some((rel) => filterSet.has(rel.id))
        if (!hasType) return false
      }
      if (!q) return true
      const haystack = [item.name]
      haystack.push(...item.objectTypes.map((rel) => rel.name))
      haystack.push(...item.parameters.map((rel) => rel.name))
      haystack.push(...item.defects.map((rel) => rel.name))
      return haystack.some((part) => normalize(part).includes(q))
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
})

const total = computed(() => filteredRows.value.length)

const paginatedRows = computed(() => {
  const start = (pagination.page - 1) * pagination.pageSize
  return filteredRows.value.slice(start, start + pagination.pageSize)
})

const rowKey = (row: LoadedComponentWithRelations) => row.id

const renderRelations = (relations: LoadedComponentWithRelations['objectTypes']) => {
  if (!relations.length) return '—'
  if (relations.length <= 2) return relations.map((item) => item.name).join(', ')
  const head = relations.slice(0, 2).map((item) => item.name).join(', ')
  return `${head} и ещё ${relations.length - 2}`
}

const handleEdit = (row: LoadedComponentWithRelations) => {
  editingComponent.value = row
  form.name = row.name
  form.objectTypeIds = row.objectTypes.map((item) => item.id)
  form.parameterIds = row.parameters.map((item) => item.id)
  form.defectIds = row.defects.map((item) => item.id)
  modalOpen.value = true
}

const handleDelete = async (row: LoadedComponentWithRelations) => {
  try {
    await mutations.remove.mutateAsync(row.details.id)
    message.success('Компонент удалён')
  } catch (error) {
    message.error(String(error))
  }
}

const columns = computed<DataTableColumns<LoadedComponentWithRelations>>(() => [
  { title: 'Наименование', key: 'name' },
  {
    title: 'Типы объектов',
    key: 'objectTypes',
    render: (row) => renderRelations(row.objectTypes),
  },
  {
    title: 'Параметры',
    key: 'parameters',
    render: (row) => renderRelations(row.parameters),
  },
  {
    title: 'Дефекты',
    key: 'defects',
    render: (row) => renderRelations(row.defects),
  },
  {
    title: 'Действия',
    key: 'actions',
    width: 160,
    render: (row) =>
      h(
        'div',
        { class: 'actions' },
        [
          h(
            NButton,
            {
              size: 'small',
              tertiary: true,
              onClick: () => handleEdit(row),
            },
            {
              default: () => [h(NIcon, { component: CreateOutline }), ' Редактировать'],
            },
          ),
          h(
            NPopconfirm,
            {
              onPositiveClick: () => handleDelete(row),
              positiveText: 'Удалить',
              negativeText: 'Отмена',
              type: 'warning',
              positiveButtonProps: { type: 'error', size: 'small' },
            },
            {
              trigger: () =>
                h(
                  NButton,
                  { size: 'small', quaternary: true, type: 'error' },
                  { default: () => [h(NIcon, { component: TrashOutline }), ' Удалить'] },
                ),
              default: () => 'Удалить компонент и его связи?',
            },
          ),
        ],
      ),
  },
])

const openCreate = () => {
  editingComponent.value = null
  form.name = ''
  form.objectTypeIds = []
  form.parameterIds = []
  form.defectIds = []
  if (formRef.value) formRef.value.restoreValidation()
  modalOpen.value = true
}

const closeModal = () => {
  modalOpen.value = false
  editingComponent.value = null
}

const handleSave = async () => {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  const payloadBase = {
    name: form.name,
    objectTypeIds: [...form.objectTypeIds],
    parameterIds: [...form.parameterIds],
    defectIds: [...form.defectIds],
  }

  saving.value = true
  try {
    if (isEditMode.value && editingComponent.value) {
      await mutations.update.mutateAsync({
        ...payloadBase,
        id: editingComponent.value.details.id,
        cls: editingComponent.value.details.cls,
        details: editingComponent.value.details,
      })
      message.success('Компонент обновлён')
    } else {
      await mutations.create.mutateAsync(payloadBase)
      message.success('Компонент создан')
    }
    modalOpen.value = false
  } catch (error) {
    message.error(String(error))
  } finally {
    saving.value = false
  }
}

const handleObjectTypeFilterChange = (value: string[] | string | null) => {
  objectTypeFilter.value = toArray(value)
}

const toArray = (value: string[] | string | null): string[] => {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string' && value) return [value]
  return []
}

const createObjectTypeOption = async (name: string) => {
  const created = await createObjectTypeOnTheFly(name)
  return { label: created.name, value: created.id }
}

const createParameterOption = async (name: string) => {
  const created = await createParameterOnTheFly(name)
  return { label: created.name, value: created.id }
}

const createDefectOption = async (name: string) => {
  const created = await createDefectOnTheFly(name)
  return { label: created.name, value: created.id }
}

const handleObjectTypeCreated = (option: DirectoryOptionWithMeta) => {
  if (!form.objectTypeIds.includes(option.id)) form.objectTypeIds.push(option.id)
}

const handleParameterCreated = (option: DirectoryOptionWithMeta) => {
  if (!form.parameterIds.includes(option.id)) form.parameterIds.push(option.id)
}

const handleDefectCreated = (option: DirectoryOptionWithMeta) => {
  if (!form.defectIds.includes(option.id)) form.defectIds.push(option.id)
}
</script>

<style scoped>
.components-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar {
  border: none;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 16px;
}

.toolbar__left {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  line-height: 24px;
}

.subtext {
  color: var(--neutral-500);
  max-width: 560px;
}

.toolbar__controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar__search {
  min-width: 260px;
}

.toolbar__filter {
  min-width: 240px;
}

.table-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.pagination-bar {
  display: flex;
  justify-content: flex-end;
}

.pagination-total {
  margin-right: 12px;
  color: var(--neutral-500);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-primary {
  min-width: 120px;
}
</style>
