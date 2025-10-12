<!-- Файл: src/pages/nsi/ComponentsPage.vue
     Назначение: страница справочника «Компоненты» с таблицей, фильтрами и CRUD-модалкой.
     Использование: доступна по маршруту /nsi/components. -->
<template>
  <section class="components-page">
    <NCard size="small" class="toolbar" content-style="padding: 10px 14px">
      <div class="toolbar__left">
        <h2 class="page-title">
          Справочник «Компоненты обслуживаемых объектов»
          <NButton
            quaternary
            circle
            size="small"
            class="page-title__info"
            aria-label="Информация о справочнике"
            @click="infoOpen = true"
          >
            <template #icon>
              <NIcon><InformationCircleOutline /></NIcon>
            </template>
          </NButton>
        </h2>
        <div class="subtext">
          Управляйте перечнем компонентов и их связями с типами объектов, параметрами и дефектами
        </div>
      </div>

      <div class="toolbar__controls">
        <NInput
          v-model:value="search"
          placeholder="Поиск…"
          clearable
          round
          class="toolbar__search"
        />

        <div class="toolbar__filters">
          <NSelect
            size="small"
            class="toolbar__filter"
            :options="objectTypeFilterOptions"
            :value="objectTypeFilter"
            multiple
            clearable
            placeholder="Типы объектов"
            @update:value="handleObjectTypeFilterChange"
          />
          <NSelect
            size="small"
            class="toolbar__filter"
            :options="parameterFilterOptions"
            :value="parameterFilter"
            multiple
            clearable
            placeholder="Параметры"
            @update:value="handleParameterFilterChange"
          />
          <NSelect
            size="small"
            class="toolbar__filter"
            :options="defectFilterOptions"
            :value="defectFilter"
            multiple
            clearable
            placeholder="Дефекты"
            @update:value="handleDefectFilterChange"
          />
        </div>

        <NButton type="primary" @click="openCreate">+ Добавить компонент</NButton>
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

    <NModal v-model:show="infoOpen" preset="card" title="О справочнике" style="max-width: 640px">
      <p>
        Компоненты описывают элементы обслуживаемых объектов и используются при настройке параметров,
        дефектов и работ. Здесь можно посмотреть текущие связи и быстро дополнить справочник новыми
        сущностями.
      </p>
      <p>
        Используйте фильтры, чтобы сузить список по типам объектов, параметрам или дефектам. Для
        добавления новых значений воспользуйтесь кнопкой «Добавить компонент» или создавайте связанные
        сущности непосредственно из формы.
      </p>
      <template #footer>
        <NButton type="primary" @click="infoOpen = false">Понятно</NButton>
      </template>
    </NModal>

    <NModal
      v-model:show="modalOpen"
      preset="card"
      :title="modalTitle"
      style="max-width: 640px; width: 92vw"
    >
      <NSpin :show="saving">
        <NForm ref="formRef" :model="form" :rules="rules" label-width="200" size="small">
          <NFormItem label="Наименование" path="name">
            <NInput v-model:value="form.name" placeholder="Введите наименование компонента" />
          </NFormItem>

          <NFormItem label="Типы объектов" path="objectTypeIds">
            <CreatableSelect
              :options="objectTypeSelectOptions"
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
              :options="parameterSelectOptions"
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
              :options="defectSelectOptions"
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
import { computed, h, reactive, ref, watch, type VNodeChild } from 'vue'
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
  NPopover,
  NSelect,
  NSpin,
  NTag,
  useMessage,
  type DataTableColumns,
  type FormInst,
  type FormRules,
  type SelectOption,
} from 'naive-ui'
import { InformationCircleOutline, TrashOutline, CreateOutline } from '@vicons/ionicons5'

import {
  createDefectOnTheFly,
  createObjectTypeOnTheFly,
  createParameterOnTheFly,
  type ComponentsSnapshot,
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
const infoOpen = ref(false)
const search = ref('')
const objectTypeFilter = ref<string[]>([])
const parameterFilter = ref<string[]>([])
const defectFilter = ref<string[]>([])
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

const toSelectOptions = (items: ComponentsSnapshot['objectTypes']): SelectOption[] =>
  items.map((item) => ({ label: item.name, value: item.id }))

const objectTypeSelectOptions = computed<SelectOption[]>(() =>
  toSelectOptions(snapshot.value?.objectTypes ?? []),
)
const parameterSelectOptions = computed<SelectOption[]>(() =>
  toSelectOptions(snapshot.value?.parameters ?? []),
)
const defectSelectOptions = computed<SelectOption[]>(() =>
  (snapshot.value?.defects ?? []).map((item) => ({
    label: item.categoryName ? `${item.name} (${item.categoryName})` : item.name,
    value: item.id,
  })),
)

const objectTypeFilterOptions = objectTypeSelectOptions
const parameterFilterOptions = parameterSelectOptions
const defectFilterOptions = defectSelectOptions

const isEditMode = computed(() => editingComponent.value != null)
const modalTitle = computed(() =>
  isEditMode.value ? 'Редактировать компонент' : 'Добавить компонент',
)

const normalize = (value: string) => normalizeText(value ?? '')

const filteredRows = computed(() => {
  const q = normalize(search.value)
  const typeSet = new Set(objectTypeFilter.value.map(String))
  const parameterSet = new Set(parameterFilter.value.map(String))
  const defectSet = new Set(defectFilter.value.map(String))
  const base = snapshot.value?.items ?? []

  const hasAll = (relations: LoadedComponentWithRelations['objectTypes'], selected: Set<string>) => {
    if (!selected.size) return true
    const relationIds = relations.map((rel) => rel.id)
    return Array.from(selected).every((id) => relationIds.includes(id))
  }

  return base
    .filter((item) => {
      if (!hasAll(item.objectTypes, typeSet)) return false
      if (!hasAll(item.parameters, parameterSet)) return false
      if (!hasAll(item.defects, defectSet)) return false

      if (!q) return true
      const haystack = [
        item.name,
        ...item.objectTypes.map((rel) => rel.name),
        ...item.parameters.map((rel) => rel.name),
        ...item.defects.map((rel) => rel.name),
        ...item.defects.map((rel) => rel.categoryName ?? ''),
      ]
      return haystack.some((part) => part && normalize(part).includes(q))
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
})

const total = computed(() => filteredRows.value.length)

const paginatedRows = computed(() => {
  const start = (pagination.page - 1) * pagination.pageSize
  return filteredRows.value.slice(start, start + pagination.pageSize)
})

watch([search, objectTypeFilter, parameterFilter, defectFilter], () => {
  pagination.page = 1
})

watch(total, (value) => {
  const maxPage = Math.max(1, Math.ceil(value / pagination.pageSize))
  if (pagination.page > maxPage) pagination.page = maxPage
})

const rowKey = (row: LoadedComponentWithRelations) => row.id

const MAX_CHIPS = 4

const renderChipLabel = (rel: { name: string; categoryName?: string | null }) =>
  rel.categoryName ? `${rel.name} (${rel.categoryName})` : rel.name

const renderRelations = (
  relations: LoadedComponentWithRelations['objectTypes'],
  formatter: (rel: LoadedComponentWithRelations['objectTypes'][number]) => string = (rel) => rel.name,
): VNodeChild => {
  if (!relations.length) return h('span', { class: 'empty-cell' }, '—')

  const chips = relations.slice(0, MAX_CHIPS)
  const rest = relations.slice(MAX_CHIPS)

  const chipNodes = chips.map((rel) =>
    h(
      NTag,
      { size: 'small', round: true, bordered: true, class: 'chip', key: `${rel.id}-${rel.name}` },
      { default: () => formatter(rel) },
    ),
  )

  if (!rest.length) return h('div', { class: 'chips-row' }, chipNodes)

  const more = h(
    NPopover,
    { trigger: 'hover' },
    {
      trigger: () =>
        h(NTag, { size: 'small', round: true, class: 'chip chip--more' }, { default: () => `+${rest.length}` }),
      default: () =>
        h(
          'div',
          { class: 'popover-list' },
          rest.map((rel) =>
            h('div', { class: 'popover-item', key: `${rel.id}-${rel.name}` }, formatter(rel)),
          ),
        ),
    },
  )

  return h('div', { class: 'chips-row' }, [...chipNodes, more])
}

const handleEdit = (row: LoadedComponentWithRelations) => {
  editingComponent.value = row
  form.name = row.name
  form.objectTypeIds = row.objectTypes.map((item) => item.id)
  form.parameterIds = row.parameters.map((item) => item.id)
  form.defectIds = row.defects.map((item) => item.id)
  if (formRef.value) formRef.value.restoreValidation()
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
    render: (row) =>
      renderRelations(
        row.defects,
        (rel) => renderChipLabel({ name: rel.name, categoryName: rel.categoryName ?? null }),
      ),
  },
  {
    title: 'Действия',
    key: 'actions',
    width: 120,
    render: (row) => {
      const editBtn = h(
        NButton,
        {
          quaternary: true,
          circle: true,
          size: 'small',
          onClick: () => handleEdit(row),
          'aria-label': `Редактировать компонент «${row.name}»`,
        },
        { icon: () => h(NIcon, null, { default: () => h(CreateOutline) }) },
      )

      const deleteBtn = h(
        NPopconfirm,
        {
          onPositiveClick: () => handleDelete(row),
          positiveText: 'Удалить',
          negativeText: 'Отмена',
        },
        {
          trigger: () =>
            h(
              NButton,
              {
                quaternary: true,
                circle: true,
                size: 'small',
                type: 'error',
                'aria-label': `Удалить компонент «${row.name}»`,
              },
              { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) },
            ),
          default: () => 'Удалить компонент и его связи?',
        },
      )

      return h('div', { class: 'actions' }, [editBtn, deleteBtn])
    },
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

const toArray = (value: string[] | string | null): string[] => {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string' && value) return [value]
  return []
}

const handleObjectTypeFilterChange = (value: Array<string | number> | null) => {
  objectTypeFilter.value = Array.isArray(value) ? value.map(String) : []
}

const handleParameterFilterChange = (value: Array<string | number> | null) => {
  parameterFilter.value = Array.isArray(value) ? value.map(String) : []
}

const handleDefectFilterChange = (value: Array<string | number> | null) => {
  defectFilter.value = Array.isArray(value) ? value.map(String) : []
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

const handleObjectTypeCreated = (option: { value: string | number }) => {
  const id = String(option.value)
  if (!form.objectTypeIds.includes(id)) form.objectTypeIds.push(id)
}

const handleParameterCreated = (option: { value: string | number }) => {
  const id = String(option.value)
  if (!form.parameterIds.includes(id)) form.parameterIds.push(id)
}

const handleDefectCreated = (option: { value: string | number }) => {
  const id = String(option.value)
  if (!form.defectIds.includes(id)) form.defectIds.push(id)
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
  max-width: 640px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  line-height: 24px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.page-title__info {
  margin-left: 4px;
}

.subtext {
  color: var(--neutral-500);
  max-width: 640px;
}

.toolbar__controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
  flex: 1 1 auto;
}

.toolbar__search {
  min-width: 240px;
}

.toolbar__filters {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.toolbar__filter {
  min-width: 180px;
}

.table-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chips-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
}

.chip {
  background-color: var(--surface-100);
}

.chip--more {
  cursor: pointer;
}

.popover-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 320px;
}

.popover-item {
  white-space: nowrap;
}

.empty-cell {
  color: var(--neutral-500);
}

.actions {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
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
