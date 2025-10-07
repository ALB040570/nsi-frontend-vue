<!-- Файл: src/pages/nsi/ObjectParametersPage.vue
     Назначение: страница CRUD для параметров обслуживаемых объектов (пока только просмотр).
     Использование: подключается в маршрутизаторе по пути /nsi/object-parameters. -->
<template>
  <section class="object-parameters-page">
    <NCard size="small" class="toolbar" content-style="padding: 10px 14px">
      <div class="toolbar__left">
        <h2 class="page-title">
          Справочник «Параметры обслуживаемых объектов»
          <NButton
            quaternary
            circle
            size="small"
            class="page-title__info"
            aria-label="Справка о справочнике"
            @click="infoOpen = true"
          >
            <template #icon>
              <NIcon><InformationCircleOutline /></NIcon>
            </template>
          </NButton>
        </h2>
        <div class="subtext">
          Управляйте перечнем параметров обслуживаемых объектов и контролируйте их диапазоны
          значений
        </div>
      </div>

      <div class="toolbar__controls">
        <NInput v-model:value="q" placeholder="Поиск…" clearable round class="toolbar__search" />
        <NButton type="primary" @click="openCreate">+ Добавить параметр</NButton>
      </div>
    </NCard>

    <div class="table-area">
      <NDataTable
        v-if="!isMobile"
        class="s360-cards table-full table-stretch"
        :columns="columns"
        :data="rows"
        :loading="tableLoading"
        :row-key="rowKey"
        :bordered="false"
        :max-height="tableMaxHeight || undefined"
      />

      <div v-else class="cards">
        <article
          v-for="item in rows"
          :key="item.id"
          class="card"
          role="group"
          :aria-label="primaryTitle(item)"
        >
          <header class="card__header">
            <div class="card__title" role="heading" aria-level="4">
              <FieldRenderer v-if="primaryField" :field="primaryField" :row="item" />
              <span v-else class="card__title-text">{{ item.name }}</span>
            </div>
            <span v-if="statusText(item)" class="badge" :class="statusClass(item)">
              {{ statusText(item) }}
            </span>
          </header>

          <dl class="card__grid">
            <template
              v-for="(field, fieldIndex) in infoFields"
              :key="`${item.id}:${field.key || field.label || fieldIndex}`"
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
          aria-label="Постраничная навигация по параметрам"
        >
          <template #prefix>
            <span class="pagination-total">Всего: {{ total }}</span>
          </template>
        </NPagination>
      </div>
    </div>

    <NModal
      v-model:show="infoOpen"
      preset="card"
      title="О справочнике"
      style="max-width: 640px; width: 92vw"
    >
      <p>
        Здесь собраны параметры, необходимые для контроля состояния и эксплуатации обслуживаемых
        объектов. Указывайте единицу измерения, компонент и допустимые границы значений.
      </p>
      <p>
        Используйте кнопку «Добавить параметр», чтобы создать запись, выбрать компонент и задать
        допустимые границы значений. Возможность редактирования и удаления существующих записей
        появится позднее.
      </p>
      <template #footer>
        <NButton type="primary" @click="infoOpen = false">Понятно</NButton>
      </template>
    </NModal>

    <NModal
      v-model:show="createModalOpen"
      preset="card"
      :title="modalTitle"
      style="max-width: 640px; width: 92vw"
    >
      <NSpin :show="directoriesLoading && !directoriesLoaded">
        <NForm
          ref="formRef"
          :model="creationForm"
          :rules="creationRules"
          label-width="200px"
          label-placement="left"
          size="small"
          class="creation-form"
        >
          <NFormItem label="Наименование параметра" path="name">
            <NInput
              v-model:value="creationForm.name"
              placeholder="Введите наименование нового параметра"
            />
          </NFormItem>

          <NFormItem label="Единица измерения" path="measureId">
            <NSelect
              v-model:value="creationForm.measureId"
              :options="measureSelectOptions"
              :loading="directoriesLoading && !directoriesLoaded"
              placeholder="Выберите единицу измерения"
            />
          </NFormItem>

          <NFormItem label="Источник" path="sourceId">
            <NSelect
              v-model:value="creationForm.sourceId"
              :options="sourceSelectOptions"
              :loading="directoriesLoading && !directoriesLoaded"
              placeholder="Выберите источник данных"
            />
          </NFormItem>

          <NFormItem label="Описание">
            <NInput
              v-model:value="creationForm.description"
              type="textarea"
              :autosize="{ minRows: 2, maxRows: 4 }"
              placeholder="Добавьте описание параметра"
            />
          </NFormItem>

          <NFormItem label="Компонент" path="componentEnt">
            <NSelect
              v-model:value="creationForm.componentEnt"
              :options="componentSelectOptions"
              :loading="directoriesLoading && !directoriesLoaded"
              filterable
              placeholder="Выберите компонент"
              :disabled="isEditMode"
            />
            <p class="field-hint">
              Показываются компоненты с признаками rcm = 1149.
              <span v-if="isEditMode">Компонент пока нельзя изменить.</span>
            </p>
          </NFormItem>

          <NFormItem label="Предельные значения">
            <div class="limits-grid">
              <div class="limits-grid__item">
                <span class="limits-grid__label">Максимум</span>
                <NInputNumber
                  v-model:value="creationForm.limitMax"
                  :show-button="false"
                  placeholder="Максимальное значение"
                  clearable
                />
              </div>
              <div class="limits-grid__item">
                <span class="limits-grid__label">Минимум</span>
                <NInputNumber
                  v-model:value="creationForm.limitMin"
                  :show-button="false"
                  placeholder="Минимальное значение"
                  clearable
                />
              </div>
              <div class="limits-grid__item">
                <span class="limits-grid__label">Норма</span>
                <NInputNumber
                  v-model:value="creationForm.limitNorm"
                  :show-button="false"
                  placeholder="Нормативное значение"
                  clearable
                />
              </div>
            </div>
            <p class="field-hint">Оставьте пустыми, если значение не требуется.</p>
          </NFormItem>

          <NFormItem label="Комментарий">
            <NInput
              v-model:value="creationForm.comment"
              type="textarea"
              :autosize="{ minRows: 2, maxRows: 4 }"
              placeholder="Комментарий к диапазону"
            />
          </NFormItem>
        </NForm>
      </NSpin>

      <template #footer>
        <div class="modal-footer">
          <NButton @click="handleCancelCreate" :disabled="creationPending">Отмена</NButton>
          <NButton
            type="primary"
            :loading="creationPending"
            :disabled="creationPending || saveDisabled"
            @click="handleSubmit"
          >
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
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
  nextTick,
  type PropType,
  type VNodeChild,
} from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NIcon,
  NInput,
  NInputNumber,
  NModal,
  NPagination,
  NPopconfirm,
  NSelect,
  NSpin,
  NTag,
  NTooltip,
  useMessage,
  type DataTableColumn,
  type FormInst,
  type FormRules,
} from 'naive-ui'
import { CreateOutline, InformationCircleOutline, TrashOutline } from '@vicons/ionicons5'

import {
  useObjectParameterMutations,
  useObjectParametersQuery,
} from '@features/object-parameter-crud'
import type { CreateObjectParameterPayload, UpdateObjectParameterPayload } from '@features/object-parameter-crud'
import {
  loadParameterComponents,
  loadParameterMeasures,
  loadParameterSources,
} from '@entities/object-parameter'
import type {
  LoadedObjectParameter,
  ParameterComponentOption,
  ParameterMeasureOption,
  ParameterSourceOption,
} from '@entities/object-parameter'
import { getErrorMessage, normalizeText } from '@shared/lib'

interface PaginationState {
  page: number
  pageSize: number
}

interface CardField {
  key: string
  label: string
  render: (row: LoadedObjectParameter) => VNodeChild
  isPrimary?: boolean
  isStatus?: boolean
  isActions?: boolean
}

interface CreateParameterForm {
  name: string
  measureId: string | null
  sourceId: string | null
  description: string
  componentEnt: string | null
  limitMax: number | null
  limitMin: number | null
  limitNorm: number | null
  comment: string
}

const router = useRouter()
const route = useRoute()

const message = useMessage()
const formRef = ref<FormInst | null>(null)
const infoOpen = ref(false)
const q = ref('')
const pagination = reactive<PaginationState>({ page: 1, pageSize: 10 })
const isMobile = ref(false)
const tableMaxHeight = ref<number | null>(null)

const { data: snapshot, isLoading, isFetching, error } = useObjectParametersQuery()
const parameterMutations = useObjectParameterMutations()

const createModalOpen = ref(false)
const directoriesLoading = ref(false)
const directoriesLoaded = ref(false)
const measureOptions = ref<ParameterMeasureOption[]>([])
const sourceOptions = ref<ParameterSourceOption[]>([])
const componentOptions = ref<ParameterComponentOption[]>([])
const editingParameter = ref<LoadedObjectParameter | null>(null)

const creationForm = reactive<CreateParameterForm>({
  name: '',
  measureId: null,
  sourceId: null,
  description: '',
  componentEnt: null,
  limitMax: null,
  limitMin: null,
  limitNorm: null,
  comment: '',
})

const selectedMeasure = computed(() => {
  if (!creationForm.measureId) return null
  return measureOptions.value.find((item) => String(item.id) === creationForm.measureId) ?? null
})
const selectedSource = computed(() => {
  if (!creationForm.sourceId) return null
  return sourceOptions.value.find((item) => String(item.id) === creationForm.sourceId) ?? null
})
const selectedComponent = computed(() => {
  if (!creationForm.componentEnt) return null
  return componentOptions.value.find((item) => String(item.ent) === creationForm.componentEnt) ?? null
})

const measureSelectOptions = computed(() =>
  measureOptions.value.map((item) => ({ label: item.name, value: String(item.id) })),
)
const sourceSelectOptions = computed(() =>
  sourceOptions.value.map((item) => ({ label: item.name, value: String(item.id) })),
)
const componentSelectOptions = computed(() =>
  componentOptions.value.map((item) => ({ label: item.name, value: String(item.ent) })),
)

const isEditMode = computed(() => editingParameter.value !== null)
const modalTitle = computed(() => (isEditMode.value ? 'Изменить параметр' : 'Добавить параметр'))

const creationRules = computed<FormRules>(() => {
  const rules: FormRules = {
    name: [
      { required: true, message: 'Укажите наименование', trigger: ['input', 'blur'] },
      {
        validator: (_rule, value: string) => {
          return Boolean(value && value.trim().length >= 3)
            ? Promise.resolve()
            : Promise.reject(new Error('Минимум 3 символа'))
        },
        trigger: ['blur'],
      },
    ],
    measureId: [{ required: true, message: 'Выберите единицу измерения', trigger: ['change', 'blur'] }],
    sourceId: [{ required: true, message: 'Выберите источник', trigger: ['change', 'blur'] }],
  }

  if (!isEditMode.value) {
    rules.componentEnt = [{ required: true, message: 'Выберите компонент', trigger: ['change', 'blur'] }]
  }

  return rules
})

const creationPending = computed(
  () =>
    parameterMutations.create.isPending.value || parameterMutations.update.isPending.value,
)
const saveDisabled = computed(() => {
  if (directoriesLoading.value && !directoriesLoaded.value) return true
  return (
    measureOptions.value.length === 0 ||
    sourceOptions.value.length === 0 ||
    componentOptions.value.length === 0
  )
})

const resetCreationForm = () => {
  if (formRef.value) formRef.value.restoreValidation()
  creationForm.name = ''
  creationForm.measureId = null
  creationForm.sourceId = null
  creationForm.description = ''
  creationForm.componentEnt = null
  creationForm.limitMax = null
  creationForm.limitMin = null
  creationForm.limitNorm = null
  creationForm.comment = ''
}

const loadCreationDirectories = async (force = false) => {
  if (directoriesLoading.value) return
  if (directoriesLoaded.value && !force) return

  directoriesLoading.value = true
  try {
    const [measures, sources, components] = await Promise.all([
      loadParameterMeasures(),
      loadParameterSources(),
      loadParameterComponents(),
    ])

    measureOptions.value = measures
    sourceOptions.value = sources
    componentOptions.value = components
    directoriesLoaded.value = true
  } catch (err) {
    message.error(getErrorMessage(err) ?? 'Не удалось загрузить справочники')
  } finally {
    directoriesLoading.value = false
  }
}

const handleCancelCreate = () => {
  createModalOpen.value = false
  editingParameter.value = null
}

const revalidateFieldOnChange = (path: keyof CreateParameterForm, value: unknown) => {
  if (!createModalOpen.value) return
  if (path === 'componentEnt' && isEditMode.value) return
  if (value === null || value === undefined || value === '') return
  const form = formRef.value
  if (!form || typeof form.validate !== 'function') return
  void form
    .validate(undefined, (rule) => rule?.key === String(path))
    .catch(() => undefined)
}

const applyParameterToForm = (parameter: LoadedObjectParameter) => {
  creationForm.name = parameter.name
  creationForm.description = parameter.description ?? ''
  creationForm.measureId = parameter.details.measureId
    ? String(parameter.details.measureId)
    : null
  creationForm.sourceId = parameter.details.sourceObjId
    ? String(parameter.details.sourceObjId)
    : null
  const componentEntValue =
    parameter.details.componentEnt ??
    (parameter.componentId ? Number(parameter.componentId) : null)
  creationForm.componentEnt = componentEntValue !== null ? String(componentEntValue) : null
  creationForm.limitMax = parameter.maxValue ?? null
  creationForm.limitMin = parameter.minValue ?? null
  creationForm.limitNorm = parameter.normValue ?? null
  creationForm.comment = parameter.note ?? ''
}

const handleSubmit = async () => {
  if (saveDisabled.value) return
  if (!formRef.value) return

  try {
    await formRef.value.validate(undefined, (rule) => {
      if (isEditMode.value && rule?.key === 'componentEnt') {
        return false
      }
      return true
    })
  } catch {
    return
  }

  const measure = selectedMeasure.value
  const source = selectedSource.value
  const componentOption = (() => {
    if (selectedComponent.value) return selectedComponent.value
    if (!isEditMode.value || !editingParameter.value) return null
    const details = editingParameter.value.details
    if (
      details.componentCls === null ||
      details.componentRelcls === null ||
      details.componentRcm === null ||
      details.componentEnt === null
    ) {
      return null
    }
    return {
      cls: Number(details.componentCls),
      relcls: Number(details.componentRelcls),
      rcm: Number(details.componentRcm),
      ent: Number(details.componentEnt),
      name: editingParameter.value.componentName ?? details.componentRelationName ?? '',
    }
  })()

  if (!measure || !source || !componentOption) {
    message.error('Заполните обязательные поля формы')
    return
  }

  const basePayload = {
    name: creationForm.name.trim(),
    description: creationForm.description.trim() || null,
    measure: { id: Number(measure.id), pv: Number(measure.pv), name: measure.name },
    source: { id: Number(source.id), pv: Number(source.pv), name: source.name },
    component: componentOption,
    limits: {
      max: creationForm.limitMax,
      min: creationForm.limitMin,
      norm: creationForm.limitNorm,
      comment: creationForm.comment.trim() || null,
    },
    accessLevel: 1,
  }

  try {
    if (isEditMode.value && editingParameter.value) {
      const parameterId = Number(
        editingParameter.value.details.id ?? editingParameter.value.id,
      )
      if (!Number.isFinite(parameterId)) {
        message.error('Не удалось определить идентификатор параметра')
        return
      }
      const updatePayload: UpdateObjectParameterPayload = {
        ...basePayload,
        id: parameterId,
        details: editingParameter.value.details,
      }
      await parameterMutations.update.mutateAsync(updatePayload)
      message.success('Параметр успешно обновлён')
    } else {
      const createPayload: CreateObjectParameterPayload = basePayload
      await parameterMutations.create.mutateAsync(createPayload)
      message.success('Параметр успешно создан')
    }
    createModalOpen.value = false
  } catch (err) {
    const fallbackMessage = isEditMode.value
      ? 'Не удалось обновить параметр'
      : 'Не удалось создать параметр'
    message.error(getErrorMessage(err) ?? fallbackMessage)
  }
}

if (typeof window !== 'undefined') {
  isMobile.value = window.matchMedia('(max-width: 768px)').matches
}

let mediaQueryList: MediaQueryList | null = null
const handleMediaQueryChange = (event: MediaQueryList | MediaQueryListEvent) => {
  isMobile.value = 'matches' in event ? event.matches : false
}

onMounted(() => {
  if (typeof window === 'undefined') return
  mediaQueryList = window.matchMedia('(max-width: 768px)')
  handleMediaQueryChange(mediaQueryList)
  mediaQueryList.addEventListener('change', handleMediaQueryChange)

  const computeTableHeight = () => {
    // Примерная высота под таблицу: высота окна минус тулбар + отступы и пагинация
    const headerReserve = 260 // тулбар, подзаголовок, отступы
    const paginationReserve = 80
    const totalReserve = headerReserve + paginationReserve
    const h = Math.max(320, window.innerHeight - totalReserve)
    tableMaxHeight.value = h
  }
  computeTableHeight()
  window.addEventListener('resize', computeTableHeight)
})

onBeforeUnmount(() => {
  if (mediaQueryList) {
    mediaQueryList.removeEventListener('change', handleMediaQueryChange)
    mediaQueryList = null
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', () => void 0)
  }
})

const clearActionQuery = () => {
  if (!route.query.action) return
  const nextQuery = { ...route.query }
  delete nextQuery.action
  void router.replace({ path: route.path, query: nextQuery, hash: route.hash })
}

watch(
  () => route.query.action,
  (value) => {
    const matches = Array.isArray(value) ? value.includes('create') : value === 'create'
    if (!matches) return
    nextTick(() => {
      openCreate()
      clearActionQuery()
    })
  },
  { immediate: true },
)

watch(q, () => {
  pagination.page = 1
})

watch(createModalOpen, (isOpen) => {
  if (!isOpen) {
    resetCreationForm()
    editingParameter.value = null
  }
})

watch(
  () => creationForm.measureId,
  (value) => revalidateFieldOnChange('measureId', value),
)
watch(
  () => creationForm.sourceId,
  (value) => revalidateFieldOnChange('sourceId', value),
)
watch(
  () => creationForm.componentEnt,
  (value) => revalidateFieldOnChange('componentEnt', value),
)

const snapshotData = computed(() => snapshot.value ?? undefined)
const parameters = computed<LoadedObjectParameter[]>(() => snapshotData.value?.items ?? [])

const fetchErrorMessage = computed(() => getErrorMessage(error.value))
watch(fetchErrorMessage, (next, prev) => {
  if (next && next !== prev) message.error(next)
})

const tableLoading = computed(() => isLoading.value || isFetching.value)

const filteredRows = computed(() => {
  const search = normalizeText(q.value)

  if (!search) return parameters.value

  return parameters.value.filter((item) => {
    const fields = [item.name, item.unitName, item.sourceName, item.code, item.note]
    return fields.some((field) => normalizeText(field ?? '').includes(search))
  })
})

const total = computed(() => filteredRows.value.length)

watch(
  () => [total.value, pagination.pageSize],
  () => {
    const maxPage = Math.max(1, Math.ceil(total.value / pagination.pageSize))
    if (pagination.page > maxPage) pagination.page = maxPage
  },
)

const paginatedRows = computed(() => {
  const start = Math.max(0, (pagination.page - 1) * pagination.pageSize)
  return filteredRows.value.slice(start, start + pagination.pageSize)
})

const rows = computed(() => paginatedRows.value)
const rowKey = (row: LoadedObjectParameter) => row.id

const resetFormValidation = () => {
  formRef.value?.restoreValidation()
}

function formatNumber(value: number | null): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 4 }).format(value)
}

function renderComponentTag(row: LoadedObjectParameter): VNodeChild {
  if (!row.componentName) return '—'
  return h(
    NTag,
    { size: 'small', bordered: true, round: true, class: 'tag-component' },
    { default: () => row.componentName },
  )
}

const renderTooltipLines = (value: string) =>
  value.split(/\n+/).map((line, index) => h('div', { key: `tooltip-line-${index}` }, line || ' '))

const renderMultilineCell = (
  value: string | null | undefined,
  className = 'cell-multiline',
  withTooltip = true,
): VNodeChild => {
  const text = value?.trim()
  if (!text) return '—'

  const renderBlock = () => h('div', { class: className }, text)

  if (!withTooltip) return renderBlock()

  return h(
    NTooltip,
    { placement: 'top', delay: 100 },
    {
      trigger: renderBlock,
      default: () => renderTooltipLines(text),
    },
  )
}

function renderNameWithMeta(row: LoadedObjectParameter): VNodeChild {
  const component = row.componentName ? renderComponentTag(row) : null

  const titleText = row.name?.trim() ?? ''
  const titleNode = renderMultilineCell(titleText || null, 'name-cell__title')

  if (!component) {
    return h('div', { class: 'name-cell' }, [titleNode])
  }

  return h('div', { class: 'name-cell' }, [
    titleNode,
    h('div', { class: 'name-meta' }, [component]),
  ])
}

function renderLimit(value: number | null): string {
  return formatNumber(value)
}

function renderRange(row: LoadedObjectParameter): VNodeChild {
  const items = [
    { label: 'ЕИ', value: row.unitName ?? '—', type: 'info' as const },
    { label: 'Мин', value: renderLimit(row.minValue), type: 'warning' as const },
    { label: 'Макс', value: renderLimit(row.maxValue), type: 'error' as const },
    { label: 'Норм', value: renderLimit(row.normValue), type: 'success' as const },
  ]

  const rows = items.map(({ label, value, type }) => {
    const labelNode = h('span', { class: 'range-row__label' }, label)
    const tagContent = h('span', { class: 'tag-range__value' }, value)
    const tagNode = h(
      NTag,
      {
        size: 'small',
        bordered: true,
        round: true,
        type,
        class: 'tag-range',
      },
      { default: () => tagContent },
    )

    const maybeTooltip =
      value === '—'
        ? tagNode
        : h(
            NTooltip,
            { placement: 'top', delay: 100 },
            {
              trigger: () => tagNode,
              default: () => value,
            },
          )

    return h('div', { class: 'range-row', key: `${row.id}-${label}` }, [labelNode, maybeTooltip])
  })

  return h('div', { class: 'range-cell' }, rows)
}

function renderComments(row: LoadedObjectParameter): VNodeChild {
  return renderMultilineCell(row.note)
}

function renderSourceDetails(row: LoadedObjectParameter): VNodeChild {
  const source = row.sourceName ?? row.code
  return renderMultilineCell(source)
}

function renderDescription(row: LoadedObjectParameter): VNodeChild {
  return renderMultilineCell(row.description)
}

const renderActions = (row: LoadedObjectParameter): VNodeChild => {
  const editBtn = h(
    NButton,
    {
      quaternary: true,
      circle: true,
      size: 'small',
      onClick: () => openEdit(row),
      'aria-label': `Изменить параметр ${row.name}`,
    },
    { icon: () => h(NIcon, null, { default: () => h(CreateOutline) }) },
  )

  const delBtn = h(
    NPopconfirm,
    {
      positiveText: 'Удалить',
      negativeText: 'Отмена',
      onPositiveClick: () => deleteParameter(row),
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
            'aria-label': `Удалить параметр ${row.name}`,
          },
          { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) },
        ),
      default: () => 'Удалить параметр?',
    },
  )

  return h('div', { class: 'table-actions' }, [editBtn, delBtn])
}

const columns = computed<DataTableColumn<LoadedObjectParameter>[]>(() => [
  {
    title: 'Параметр и компонент',
    key: 'name',
    sorter: (a, b) => a.name.localeCompare(b.name, 'ru'),
    minWidth: 360,
    className: 'col-name',
    render: renderNameWithMeta,
  },
  {
    title: 'ЕИ и границы',
    key: 'range',
    minWidth: 80,
    align: 'left',
    render: renderRange,
  },
  {
    title: 'Комментарии по диапазонам',
    key: 'note',
    minWidth: 200,
    className: 'col-note',
    render: renderComments,
  },
  {
    title: 'Источник',
    key: 'sourceName',
    minWidth: 140,
    sorter: (a, b) => (a.sourceName ?? '').localeCompare(b.sourceName ?? '', 'ru'),
    render: renderSourceDetails,
  },
  {
    title: 'Описание',
    key: 'description',
    minWidth: 200,
    render: renderDescription,
  },
  {
    title: 'Действия',
    key: 'actions',
    width: 120,
    align: 'center',
    render: renderActions,
  },
])

const cardFields = computed<CardField[]>(() => [
  {
    key: 'name',
    label: 'Наименование',
    render: renderNameWithMeta,
    isPrimary: true,
  },
  {
    key: 'range',
    label: 'ЕИ и границы',
    render: renderRange,
  },
  {
    key: 'note',
    label: 'Комментарии по диапазонам',
    render: renderComments,
  },
  {
    key: 'source',
    label: 'Источник',
    render: renderSourceDetails,
  },
  {
    key: 'description',
    label: 'Описание',
    render: renderDescription,
  },
  {
    key: 'actions',
    label: 'Действия',
    render: renderActions,
    isActions: true,
  },
])

const primaryField = computed<CardField | null>(
  () => cardFields.value.find((field) => field.isPrimary) ?? cardFields.value[0] ?? null,
)
const statusField = computed(() => cardFields.value.find((field) => field.isStatus))
const actionsField = computed(() => cardFields.value.find((field) => field.isActions))
const infoFields = computed(() =>
  cardFields.value.filter((field) => !field.isPrimary && !field.isStatus && !field.isActions),
)

const toPlainText = (value: VNodeChild | VNodeChild[]): string => {
  if (value == null || typeof value === 'boolean') return ''
  if (Array.isArray(value)) {
    return value
      .map((item) => toPlainText(item as VNodeChild | VNodeChild[]))
      .filter(Boolean)
      .join(' ')
  }
  if (typeof value === 'object') {
    const children = (value as { children?: unknown }).children
    if (Array.isArray(children)) {
      return toPlainText(children as VNodeChild[])
    }
    if (children != null) {
      return toPlainText(children as VNodeChild)
    }
    return ''
  }
  return String(value)
}

const primaryTitle = (row: LoadedObjectParameter) =>
  [row.name, row.componentName].filter(Boolean).join(' - ')
const statusText = (row: LoadedObjectParameter) =>
  statusField.value ? toPlainText(statusField.value.render(row)) : ''
const statusClass = (row: LoadedObjectParameter) => {
  void row
  return ''
}

const FieldRenderer = defineComponent({
  name: 'FieldRenderer',
  props: {
    field: { type: Object as PropType<CardField>, required: true },
    row: { type: Object as PropType<LoadedObjectParameter>, required: true },
  },
  setup(props) {
    return () => props.field.render(props.row)
  },
})

const ActionsRenderer = defineComponent({
  name: 'ActionsRenderer',
  props: {
    row: { type: Object as PropType<LoadedObjectParameter>, required: true },
  },
  setup(props) {
    return () => renderActions(props.row)
  },
})

const openCreate = () => {
  resetFormValidation()
  resetCreationForm()
  editingParameter.value = null
  parameterMutations.create.reset()
  parameterMutations.update.reset()
  createModalOpen.value = true
  void loadCreationDirectories(!directoriesLoaded.value)
}

const openEdit = async (row: LoadedObjectParameter) => {
  resetFormValidation()
  resetCreationForm()
  editingParameter.value = row
  parameterMutations.update.reset()
  parameterMutations.create.reset()
  createModalOpen.value = true
  try {
    await loadCreationDirectories(true)
  } finally {
    applyParameterToForm(row)
  }
}

defineExpose({
  openCreate,
  openEdit,
  handleSubmit,
  createModalOpen,
  creationForm,
  editingParameter,
  isEditMode,
})

const deleteParameter = async (row: LoadedObjectParameter) => {
  parameterMutations.remove.reset()

  const rawId = row.details.id ?? Number(row.id)
  if (!rawId || !Number.isFinite(rawId)) {
    message.error('Не удалось определить идентификатор параметра для удаления')
    return
  }

  try {
    await parameterMutations.remove.mutateAsync({
      id: Number(rawId),
      relationId: row.details.componentRelationId ?? null,
    })
    message.success(`Параметр «${row.name}» удалён`)
  } catch (err) {
    message.error(getErrorMessage(err) ?? `Не удалось удалить параметр «${row.name}»`)
  }
}
</script>

<style scoped lang="scss">
.object-parameters-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow-x: hidden;
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
  vertical-align: top;
}

:deep(.n-data-table thead th) {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--n-table-header-color, var(--n-card-color, #fff));
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.08);
}

:deep(.n-pagination) {
  font-size: 14px;
}

.pagination-total {
  margin-right: 12px;
  font-size: 14px;
  color: var(--n-text-color-3);
}

.name-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 100%;
}
.name-cell__title {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  word-break: break-word;
  font-weight: 600;
  line-height: 1.4;
}

.name-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}


.cell-multiline {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  word-break: break-word;
  line-height: 1.4;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.toolbar__left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.page-title__info :deep(.n-icon) {
  font-size: 16px;
}

.page-title__info:hover,
.page-title__info:focus {
  background: #edf1f7;
  color: var(--n-text-color);
}

.page-title__info:active {
  background: #e2e8f0;
}

.subtext {
  font-size: 12px;
  color: var(--n-text-color-3);
}

.toolbar__controls {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar__search {
  width: 280px;
  max-width: 100%;
}

.tag-unit {
  background: #eff6ff;
  color: #1d4ed8;
}

.tag-component {
  background: #fff;
}

.note-text {
  display: block;
  max-width: 100%;
}

.note-text__clamped {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  word-break: break-word;
  line-height: 1.4;
}

.creation-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.field-hint {
  margin-top: 6px;
  font-size: 12px;
  color: var(--n-text-color-3);
}

.limits-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.limits-grid__item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.limits-grid__label {
  font-size: 12px;
  color: var(--n-text-color-3);
}

.range-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.range-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.range-row__label {
  color: #6b7280;
  font-size: 12px;
  text-transform: uppercase;
  width: 72px;
  text-align: right;
}

.range-row__label::after {
  content: ':';
  margin-left: 2px;
}

.range-row > :nth-child(2) {
  flex: 1;
  display: flex;
  min-width: 0;
}

.range-row > :nth-child(2) :deep(*) {
  max-width: 100%;
}

.tag-range {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f3f4f6;
  max-width: 100%;
  min-width: 0;
  flex-shrink: 1;
}

.tag-range__value {
  font-weight: 600;
  font-size: 12px;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  opacity: 0;
  transition: 0.15s ease;
}

:deep(.n-data-table .n-data-table-tr:hover) .table-actions {
  opacity: 1;
}

.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.cards {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
}

.card {
  border: 1px solid #eee;
  border-radius: 14px;
  padding: 12px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  max-width: 100%;
  width: 100%;
  box-sizing: border-box;
}

.card__header,
.card__actions {
  min-width: 0;
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
  overflow-wrap: anywhere;
}

.card__title-text {
  display: block;
  font-weight: 600;
}

.card__title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card__title :deep(.name-cell) {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card__title :deep(.name-cell__title) {
  font-weight: 600;
  display: block;
}

.card__title :deep(.name-meta) {
  font-weight: 600;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.card__title :deep(.name-meta .n-tag__content) {
  font-weight: 600;
}
.card__title .name-meta {
  font-weight: 600;
}

.card__title :deep(.n-tag__content) {
  font-weight: 600;
}

.card__grid {
  display: grid;
  grid-template-columns: 140px 1fr;
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
  overflow-wrap: anywhere;
}

.card__actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.card__actions .table-actions {
  justify-content: flex-start;
  opacity: 1;
}

.badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f3f4f6;
}

@media (max-width: 900px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar__controls {
    justify-content: flex-start;
  }

  .toolbar__search {
    width: 100%;
  }
}

@media (max-width: 360px) {
  .card__grid {
    grid-template-columns: 110px 1fr;
  }
}
</style>
