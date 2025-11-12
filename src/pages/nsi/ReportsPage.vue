<!-- Файл: src/pages/nsi/ReportsPage.vue
     Назначение: справочник «Отчёты» с поиском, фильтрами, таблицей и генерацией отчётов. -->
<template>
  <section class="reports-page">
    <NCard size="small" class="toolbar" content-style="padding: 10px 14px">
      <div class="toolbar__left">
        <h2 class="page-title">
          {{ t('nsi.reports.title', {}, { default: 'Справочник «Отчёты»' }) }}
        </h2>
        <div class="subtext">
          {{
            t(
              'nsi.reports.subtitle',
              {},
              {
                default:
                  'Ведите перечень стандартных аналитических отчётов, фильтруйте по оргструктуре и запускайте генерацию в пару кликов.',
              },
            )
          }}
        </div>
      </div>

      <div class="toolbar__controls">
        <NInput
          v-model:value="searchQuery"
          round
          clearable
          size="small"
          class="toolbar__search"
          :placeholder="
            t('nsi.reports.searchPlaceholder', {}, { default: 'Поиск по названию или описанию…' })
          "
        >
          <template #suffix>
            <NIcon :component="SearchOutline" />
          </template>
        </NInput>

        <div class="toolbar__filters">
          <NSelect
            v-model:value="orgUnitFilter"
            :options="orgUnitOptions"
            multiple
            filterable
            clearable
            size="small"
            class="toolbar__select"
            :placeholder="
              t('nsi.reports.filter.orgUnit', {}, { default: 'Организационная единица' })
            "
          />

        </div>

        <NButton type="primary" size="small" @click="openCreateDialog">
          {{ t('nsi.reports.createReport', {}, { default: 'Добавить отчёт' }) }}
        </NButton>
      </div>
    </NCard>

    <div class="table-area">
      <NDataTable
        v-if="!isMobile"
        class="reports-table s360-cards table-full table-stretch"
        :columns="columns"
        :data="desktopRows"
        :row-key="rowKey"
        :loading="tableLoading"
        :bordered="false"
        :flex-height="false"
      >
        <template #empty>
          <NEmpty :description="t('nsi.reports.empty', {}, { default: 'Отчёты не найдены' })" />
        </template>
      </NDataTable>

      <template v-else>
        <div class="list-info">
          {{
            t(
              'nsi.reports.listInfo',
              { shown: visibleCount, total },
              { default: 'Показано: ' + visibleCount + ' из ' + total },
            )
          }}
        </div>

        <div v-if="mobileRows.length" class="cards" role="list">
          <article
            v-for="item in mobileRows"
            :key="item.rowKey"
            class="card"
            role="group"
            :aria-label="item.name"
          >
            <header class="card__header">
              <div class="card__title" role="heading" aria-level="4">
                {{ item.name }}
              </div>
              <span class="index-chip">№ {{ item.index }}</span>
            </header>

            <dl class="card__grid">
              <dt>{{ t('nsi.reports.table.orgUnit', {}, { default: 'Орг. единица' }) }}</dt>
              <dd>{{ item.orgUnit }}</dd>
              <dt>{{ t('nsi.reports.form.periodType', {}, { default: 'Период отчёта' }) }}</dt>
              <dd>
                <span class="period-chip">
                  {{
                    getPeriodTypeLabel(item.periodTypeId) ||
                    t('nsi.reports.form.periodTypeEmpty', {}, { default: 'Не указан' })
                  }}
                </span>
              </dd>
            </dl>

            <footer class="card__actions">
              <ActionsRenderer :row="item" />
            </footer>
          </article>
        </div>

        <NEmpty
          v-else
          class="cards-empty"
          :description="t('nsi.reports.empty', {}, { default: 'Отчёты не найдены' })"
        />
      </template>

      <div class="pagination-bar" v-if="total">
        <NPagination
          v-model:page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :item-count="total"
          :page-sizes="[10, 20, 50]"
          show-size-picker
          show-quick-jumper
          :aria-label="
            t('nsi.reports.pagination', {}, { default: 'Постраничная навигация по отчётам' })
          "
        >
          <template #prefix>
            <span class="pagination-total">
              {{ t('nsi.reports.total', { total }, { default: 'Всего: ' + total }) }}
            </span>
          </template>
        </NPagination>
      </div>
    </div>

    <NModal
      v-model:show="generator.open"
      preset="card"
      :title="
        generator.report?.name ??
        t('nsi.reports.actions.generate', {}, { default: 'Сформировать отчёт' })
      "
      style="width: min(520px, 96vw)"
    >
      <template v-if="generator.report" #header-extra>
        <span class="modal-subtitle">{{ generator.report.orgUnit }}</span>
      </template>

      <p v-if="generator.report?.description" class="modal-description">
        {{ generator.report.description }}
      </p>

      <NForm
        ref="generatorFormRef"
        :model="generatorForm"
        :rules="generatorRules"
        size="small"
        label-placement="top"
        class="generator-form"
      >
        <NFormItem
          :label="t('nsi.reports.form.date', {}, { default: 'Дата отчёта' })"
          path="date"
        >
          <NDatePicker
            v-model:value="generatorForm.date"
            type="date"
            format="dd.MM.yyyy"
            value-format="yyyy-MM-dd"
            :placeholder="t('nsi.reports.form.datePlaceholder', {}, { default: 'Выберите дату' })"
            clearable
            style="width: 100%"
          />
        </NFormItem>

        <NFormItem
          :label="t('nsi.reports.form.client', {}, { default: 'Организация заказчика' })"
          path="objClient"
        >
          <NSelect
            v-model:value="generatorForm.objClient"
            :options="clientOptions"
            :loading="clientsLoading"
            filterable
            clearable
            :placeholder="
              t('nsi.reports.form.clientPlaceholder', {}, { default: 'Выберите организацию' })
            "
            @update:value="handleClientSelect"
            style="width: 100%"
          />
        </NFormItem>

        <NFormItem
          :label="
            t(
              'nsi.reports.form.director',
              {},
              { default: 'Ответственный со стороны подрядчика' },
            )
          "
          path="directorId"
        >
          <NSelect
            v-model:value="generatorForm.directorId"
            :options="filteredPersonnelOptions"
            :loading="personnelLoading"
            filterable
            clearable
            :placeholder="
              t('nsi.reports.form.directorPlaceholder', {}, { default: 'Выберите ответственного' })
            "
            @update:value="handleDirectorSelect"
            style="width: 100%"
          />
        </NFormItem>

        <NFormItem
          :label="
            t('nsi.reports.form.executor', {}, { default: 'Исполнитель со стороны подрядчика' })
          "
          path="executorId"
        >
          <NSelect
            v-model:value="generatorForm.executorId"
            :options="personnelOptions"
            :loading="personnelLoading"
            filterable
            clearable
            :placeholder="
              t('nsi.reports.form.executorPlaceholder', {}, { default: 'Выберите исполнителя' })
            "
            @update:value="handleExecutorSelect"
            style="width: 100%"
          />
        </NFormItem>
      </NForm>

      <div class="modal-footer">
        <NButton quaternary @click="generator.open = false">
          {{ t('common.cancel', {}, { default: 'Отмена' }) }}
        </NButton>
        <NButton type="primary" :loading="generator.submitting" @click="handleGenerate">
          {{ t('nsi.reports.actions.generate', {}, { default: 'Сформировать' }) }}
        </NButton>
      </div>
    </NModal>

    <NModal
      v-model:show="preview.open"
      preset="card"
      :draggable="true"
      transform-origin-disabled
      :style="previewModalStyle"
      :title="
        preview.report?.name ??
        t('nsi.reports.preview.title', {}, { default: 'Предпросмотр отчёта' })
      "
    >
      <template v-if="preview.report" #header-extra>
        <span class="modal-subtitle">{{ preview.report.orgUnit }}</span>
      </template>

      <div class="preview-bar">
        <div class="preview-meta">
          <div class="preview-meta__title">
            {{ t('nsi.reports.form.periodType', {}, { default: 'Период' }) }}:
            {{ previewPeriodLabel }}
          </div>
          <div class="preview-meta__subtitle">
            {{
              t(
                'nsi.reports.preview.format',
                { format: preview.format.toUpperCase() },
                { default: 'Формат: ' + preview.format.toUpperCase() },
              )
            }}
          </div>
        </div>
        <div class="preview-actions">
          <NButton tertiary size="small" @click="refreshPreview" :loading="preview.loading">
            <template #icon>
              <NIcon :component="RefreshOutline" />
            </template>
            {{ t('nsi.reports.preview.refresh', {}, { default: 'Обновить' }) }}
          </NButton>
          <NButton
            tertiary
            size="small"
            :disabled="!preview.report || preview.loading"
            :loading="excelExportLoading"
            @click="downloadExcel"
          >
            <template #icon>
              <NIcon :component="CloudDownloadOutline" />
            </template>
            {{ t('nsi.reports.preview.downloadXlsx', {}, { default: 'Выгрузить в Excel' }) }}
          </NButton>
        </div>
      </div>

      <div class="preview-body" :style="previewBodyStyle">
        <NSpin :show="preview.loading">
          <div v-if="preview.format === 'pdf' && preview.url" class="preview-frame">
            <iframe
              :key="preview.url"
              ref="previewFrameRef"
              class="preview-iframe"
              :src="preview.url"
              title="Просмотр отчёта"
            />
          </div>
          <NEmpty
            v-else
            class="preview-empty"
            :description="
              t(
                'nsi.reports.preview.empty',
                {},
                { default: 'Сформируйте отчёт, чтобы увидеть превью' },
              )
            "
          />
        </NSpin>
        <button
          class="modal-resize-handle"
          type="button"
          aria-label="Изменить размер"
          @mousedown="startModalResize"
        />
      </div>
    </NModal>

    <NModal
      v-model:show="editDialog.open"
      preset="card"
      :title="
        editDialog.mode === 'create'
          ? t('nsi.reports.create.title', {}, { default: 'Новый отчёт' })
          : t('nsi.reports.edit.title', {}, { default: 'Редактирование отчёта' })
      "
      style="width: min(520px, 96vw)"
    >
      <NForm
        ref="editFormRef"
        :model="editDialog.form"
        :rules="editFormRules"
        size="small"
        label-placement="top"
        class="edit-form"
      >
        <NFormItem :label="t('nsi.reports.table.index', {}, { default: 'Индекс' })" path="index">
          <NInput v-model:value="editDialog.form.index" />
        </NFormItem>
        <NFormItem
          :label="t('nsi.reports.table.name', {}, { default: 'Наименование' })"
          path="name"
        >
          <NInput v-model:value="editDialog.form.name" />
        </NFormItem>
        <NFormItem
          :label="t('nsi.reports.table.orgUnit', {}, { default: 'Организационная единица' })"
          path="orgUnitId"
        >
          <NSelect
            v-model:value="editDialog.form.orgUnitId"
            :options="orgStructureOptions"
            :loading="orgStructureLoading"
            filterable
            clearable
            :placeholder="
              t('nsi.reports.form.orgUnitPlaceholder', {}, { default: 'Выберите орг. единицу' })
            "
            @update:value="handleEditOrgUnitSelect"
          />
        </NFormItem>
        <NFormItem
          :label="t('nsi.reports.form.periodType', {}, { default: 'Период отчёта' })"
          path="periodTypeId"
        >
          <NSelect
            v-model:value="editDialog.form.periodTypeId"
            :options="periodTypeOptions"
            :loading="periodTypesLoading"
            filterable
            clearable
            :placeholder="
              t('nsi.reports.form.periodTypePlaceholder', {}, { default: 'Выберите период' })
            "
          />
        </NFormItem>
      </NForm>

      <div class="modal-footer">
        <NButton quaternary @click="editDialog.open = false">
          {{ t('common.cancel', {}, { default: 'Отмена' }) }}
        </NButton>
        <NButton type="primary" :loading="editDialog.submitting" @click="handleEditSave">
          {{
            editDialog.mode === 'create'
              ? t('common.create', {}, { default: 'Создать' })
              : t('common.save', {}, { default: 'Сохранить' })
          }}
        </NButton>
      </div>
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
  type Component as VueComponent,
  type PropType,
} from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NButton,
  NCard,
  NDataTable,
  NDatePicker,
  NEmpty,
  NForm,
  NFormItem,
  NIcon,
  NInput,
  NModal,
  NPagination,
  NSelect,
  NSpin,
  NTooltip,
  type DataTableColumns,
  type FormInst,
  type FormRules,
  type SelectOption,
  type DatePickerProps,
  useDialog,
  useMessage,
} from 'naive-ui'
import {
  CloudDownloadOutline,
  CreateOutline,
  DocumentTextOutline,
  RefreshOutline,
  SearchOutline,
  TrashOutline,
} from '@vicons/ionicons5'

import { useIsMobile } from '@/shared/composables/useIsMobile'
import { normalizeText } from '@shared/lib'
import {
  fetchReportFile,
  reportRpc,
  objectsRpc,
  personnalRpc,
  orgStructureRpc,
  type FetchReportFileParams,
} from '@shared/api'
import { type ReportFileDescriptor, type ReportFormat } from '@entities/report'

type DatePickerValue = DatePickerProps['value']

type SortOrder = 'index-asc' | 'index-desc' | 'name-asc' | 'name-desc'

interface ReportTemplate {
  id: string
  index: string
  name: string
  orgUnit: string
  orgUnitId: number | null
  periodTypeId: number | null
  description: string
  rpc: ReportRpcConfig
}

type ReportRow = ReportTemplate & { rowKey: string }
type ReportFileResult = ReportFileDescriptor & { jobId?: string | null; remoteUrl?: string | null }

interface ReportRpcConfig {
  tml: string
  generateMethod: string
  defaultFormat?: ReportFormat
  previewFormat?: ReportFormat
  mapPayload?: (payload: Record<string, unknown>, report: ReportTemplate) => Record<string, unknown>
  buildGenerateParams?: (payload: Record<string, unknown>, report: ReportTemplate) => unknown
  buildLoadParams?: (options: {
    payload: Record<string, unknown>
    report: ReportTemplate
    jobId: string
    format: ReportFormat
  }) => FetchReportFileParams
}

const BASE_REPORT_RPC: ReportRpcConfig = {
  tml: 'ПО-4',
  generateMethod: 'report/generateReport',
  defaultFormat: 'pdf',
  previewFormat: 'pdf',
  mapPayload: (payload, report) => ({
    ...payload,
    tml: (payload.tml as string | null) ?? report.index ?? 'ПО-4',
  }),
  buildGenerateParams: (payload) => [payload],
  buildLoadParams: ({ jobId, payload, format }) => ({
    tml: (payload.tml as string) ?? 'ПО-4',
    id: jobId,
    ...(format === 'pdf' ? { ext: 'pdf' } : {}),
  }),
}

interface RpcRecordsEnvelope<T> {
  records?: T[] | null
}

interface PeriodTypeRecord {
  id: number
  text: string
}

interface ClientRecord {
  id: number
  fullName?: string | null
  name?: string | null
  pv?: number | null
}

interface PersonnelRecord {
  id: number
  fullName: string
  namePosition?: string | null
  nameLocation?: string | null
  UserPhone?: string | null
  objLocation?: number | null
}

interface OrgUnitRecord {
  id: number
  name: string
  parent?: number | null
}

interface GeneratorFormModel {
  date: DatePickerValue | null
  objClient: number | null
  objLocation: number | null
  fullNameClient: string | null
  directorId: number | null
  fullNameDirector: string | null
  nameDirectorPosition: string | null
  nameDirectorLocation: string | null
  executorId: number | null
  fulNameUser: string | null
  nameUserPosition: string | null
  UserPhone: string | null
  tml: string | null
}

interface StoredReport {
  id: string
  index: string
  name: string
  orgUnit: string
  orgUnitId: number | null
  periodTypeId: number | null
  description?: string
}

const REPORTS_STORAGE_KEY = 'nsi.reports.list'

const INITIAL_REPORTS: ReportTemplate[] = [
  {
    id: 'report-1',
    index: 'ПО-4',
    name: 'Отчёт о рельсах, снятых с путей вследствие изломов, дефектов и повреждений',
    orgUnit: 'Дистанция пути',
    orgUnitId: 1073,
    periodTypeId: 11,
    description:
      'Генерация шаблона ПО-4 по списанию рельсов. Пока используем фиксированные параметры из ТЗ.',
    rpc: BASE_REPORT_RPC,
  },
  /* {
    id: 'report-10',
    code: 'INFRA_SUMMARY',
    index: 'ИНФ-10',
    name: 'Сводный отчёт по инфраструктуре',
    orgUnit: 'Управление эксплуатации',
    component: 'Силовой трансформатор ТДН',
    description: 'Актуальная информация о состоянии объектов, степени готовности и ключевых KPI.',
    apiPath: '/reports/infrastructure/summary',
    method: 'POST',
    availableFormats: ['xlsx', 'pdf'],
    objectTypes: ['Подстанция 110 кВ', 'Распределительный пункт'],
    parameters: [
      {
        key: 'periodStart',
        label: 'Начало периода',
        type: 'date',
        placeholder: 'YYYY-MM-DD',
        required: true,
      },
      {
        key: 'periodEnd',
        label: 'Окончание периода',
        type: 'date',
        placeholder: 'YYYY-MM-DD',
        required: true,
      },
      {
        key: 'region',
        label: 'Регион',
        type: 'select',
        options: REGION_OPTIONS,
        placeholder: 'Выберите регион',
      },
    ],
  },
  {
    id: 'report-2',
    code: 'DEFECTS_CRITICALITY',
    index: 'ИНФ-2',
    name: 'Отчёт по дефектам и критичности',
    orgUnit: 'Служба качества',
    component: 'Линия электропередачи 220 кВ',
    description: 'Статистика дефектов, динамика выявления и уровень критичности по объектам.',
    apiPath: '/reports/quality/defects-criticality',
    method: 'POST',
    availableFormats: ['xlsx', 'pdf'],
    objectTypes: ['ЛЭП-110', 'ЛЭП-220'],
    parameters: [
      {
        key: 'period',
        label: 'Отчётный месяц',
        type: 'date',
        placeholder: 'Выберите дату',
        required: true,
      },
      {
        key: 'objectType',
        label: 'Тип объекта',
        type: 'text',
        placeholder: 'Например, ЛЭП, ПС и т.д.',
      },
      {
        key: 'status',
        label: 'Статус',
        type: 'select',
        options: STATUS_OPTIONS,
        defaultValue: 'all',
      },
    ],
  },
  {
    id: 'report-3',
    code: 'REPAIRS_PLAN_FACT',
    index: 'ИНФ-3',
    name: 'План ремонтов по объектам',
    orgUnit: 'Производственный департамент',
    component: 'Щит управления РУ-6',
    description:
      'Сравнение плановых и фактических сроков ремонтов, ответственная команда, бюджет и статусы.',
    apiPath: '/reports/planning/repairs-plan-fact',
    method: 'POST',
    availableFormats: ['xlsx', 'pdf'],
    objectTypes: ['ЩУ', 'КРУ'],
    parameters: [
      {
        key: 'year',
        label: 'Год',
        type: 'number',
        placeholder: 'Например, 2025',
        required: true,
        defaultValue: new Date().getFullYear(),
      },
      {
        key: 'orgUnit',
        label: 'Подразделение',
        type: 'text',
        placeholder: 'Укажите подразделение',
      },
      {
        key: 'region',
        label: 'Регион',
        type: 'select',
        options: REGION_OPTIONS,
      },
    ],
  },
  {
    id: 'report-4',
    code: 'CONTRACT_EXECUTION',
    index: 'ИНФ-4',
    name: 'Исполнение работ по договорам',
    orgUnit: 'Центр проектного управления',
    component: 'Модуль КИПиА и телеметрии',
    description: 'Фактические объёмы выполненных работ, сумма договоров и процент исполнения.',
    apiPath: '/reports/contracts/execution',
    method: 'POST',
    availableFormats: ['xlsx', 'pdf'],
    objectTypes: ['КТП', 'ТП-110'],
    parameters: [
      {
        key: 'contractNumber',
        label: 'Номер договора',
        type: 'text',
        placeholder: 'DTJ-2025-001',
      },
      {
        key: 'periodStart',
        label: 'Начало периода',
        type: 'date',
        required: true,
      },
      {
        key: 'periodEnd',
        label: 'Окончание периода',
        type: 'date',
        required: true,
      },
    ],
  },
  {
    id: 'report-5',
    code: 'PROCUREMENT_PIPELINE',
    index: 'ИНФ-5',
    name: 'Отчёт по закупкам и поставкам',
    orgUnit: 'Департамент снабжения',
    component: 'Комплект снабжения ТМЦ',
    description: 'Пул закупок, статус поставок, сроки и ответственные по каждой заявке.',
    apiPath: '/reports/procurement/pipeline',
    method: 'POST',
    availableFormats: ['xlsx', 'pdf'],
    objectTypes: ['Склад ТМЦ', 'Логистический центр'],
    parameters: [
      {
        key: 'direction',
        label: 'Направление',
        type: 'select',
        options: [
          { label: 'Материалы', value: 'materials' },
          { label: 'Оборудование', value: 'equipment' },
          { label: 'Техника', value: 'vehicles' },
        ],
        placeholder: 'Выберите направление',
      },
      {
        key: 'status',
        label: 'Статус заявки',
        type: 'select',
        options: STATUS_OPTIONS,
        defaultValue: 'active',
      },
      {
        key: 'period',
        label: 'Отчётный месяц',
        type: 'date',
        required: true,
      },
    ],
  },
  {
    id: 'report-6',
    code: 'RESOURCE_UTILIZATION',
    index: 'ИНФ-6',
    name: 'Загрузка ресурсов и техники',
    orgUnit: 'Логистический центр',
    component: 'Автопарк специализированной техники',
    description: 'Загрузка техники, сменность, простои и прогноз по обеспечению ресурсами.',
    apiPath: '/reports/resources/utilization',
    method: 'POST',
    availableFormats: ['xlsx', 'pdf'],
    objectTypes: ['Спецтехника', 'Автоколонна'],
    parameters: [
      {
        key: 'planner',
        label: 'Планировщик',
        type: 'text',
        placeholder: 'ФИО или ID',
      },
      {
        key: 'region',
        label: 'Регион',
        type: 'select',
        options: REGION_OPTIONS,
      },
      {
        key: 'periodStart',
        label: 'Начало периода',
        type: 'date',
        required: true,
      },
      {
        key: 'periodEnd',
        label: 'Окончание периода',
        type: 'date',
        required: true,
      },
    ],
  },
  {
    id: 'report-7',
    code: 'REQUEST_STATUS',
    index: 'ИНФ-7',
    name: 'Статус заявок на ТМЦ',
    orgUnit: 'Складской комплекс',
    component: 'Складской модуль ТМЦ',
    description: 'Очередь заявок на материально-технические ценности и SLA обработки.',
    apiPath: '/reports/procurement/requests-status',
    method: 'POST',
    availableFormats: ['xlsx', 'pdf'],
    objectTypes: ['Складской узел', 'Цех снабжения'],
    parameters: [
      {
        key: 'warehouse',
        label: 'Склад',
        type: 'text',
        placeholder: 'Например, Москва-1',
      },
      {
        key: 'status',
        label: 'Статус заявки',
        type: 'select',
        options: STATUS_OPTIONS,
        defaultValue: 'all',
      },
    ],
  },
  {
    id: 'report-8',
    code: 'FINANCE_OVERVIEW',
    index: 'ФБ-3',
    name: 'Финансовый мониторинг проектов',
    orgUnit: 'Финансово-экономический блок',
    component: 'Финансовый блок проекта',
    description: 'Исполнение бюджетов проектов, кассовые разрывы и прогнозы на квартал.',
    apiPath: '/reports/finance/overview',
    method: 'POST',
    availableFormats: ['xlsx', 'pdf'],
    objectTypes: ['Проектный офис', 'Площадка строительства'],
    parameters: [
      {
        key: 'quarter',
        label: 'Квартал',
        type: 'select',
        options: [
          { label: 'Q1', value: 'Q1' },
          { label: 'Q2', value: 'Q2' },
          { label: 'Q3', value: 'Q3' },
          { label: 'Q4', value: 'Q4' },
        ],
        defaultValue: 'Q1',
      },
      {
        key: 'year',
        label: 'Год',
        type: 'number',
        placeholder: 'Например, 2025',
        defaultValue: new Date().getFullYear(),
      },
    ],
  }, */
]

function cloneInitialReport(report: ReportTemplate): ReportTemplate {
  return {
    ...report,
    rpc: BASE_REPORT_RPC,
  }
}

function normalizeStoredReport(entry: unknown): ReportTemplate | null {
  if (!entry || typeof entry !== 'object') return null
  const { id, index, name, orgUnit } = entry as Record<string, unknown>
  if (
    typeof id !== 'string' ||
    !id.trim() ||
    typeof index !== 'string' ||
    !index.trim() ||
    typeof name !== 'string' ||
    !name.trim() ||
    typeof orgUnit !== 'string' ||
    !orgUnit.trim()
  ) {
    return null
  }

  const orgUnitId =
    typeof (entry as { orgUnitId?: unknown }).orgUnitId === 'number' &&
    Number.isFinite((entry as { orgUnitId?: number }).orgUnitId as number)
      ? ((entry as { orgUnitId: number }).orgUnitId as number)
      : null
  const periodTypeId =
    typeof (entry as { periodTypeId?: unknown }).periodTypeId === 'number' &&
    Number.isFinite((entry as { periodTypeId?: number }).periodTypeId as number)
      ? ((entry as { periodTypeId: number }).periodTypeId as number)
      : null
  const description =
    typeof (entry as { description?: unknown }).description === 'string'
      ? ((entry as { description: string }).description as string)
      : ''

  return {
    id: id.trim(),
    index: index.trim(),
    name: name.trim(),
    orgUnit: orgUnit.trim(),
    orgUnitId,
    periodTypeId,
    description,
    rpc: BASE_REPORT_RPC,
  }
}

function loadReportsFromStorage(): ReportTemplate[] {
  const fallback = INITIAL_REPORTS.map(cloneInitialReport)
  if (typeof window === 'undefined') {
    return fallback
  }
  try {
    const raw = window.localStorage.getItem(REPORTS_STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return fallback
    const normalized = parsed
      .map((item) => normalizeStoredReport(item))
      .filter((item): item is ReportTemplate => Boolean(item))
    return normalized.length ? normalized : fallback
  } catch (error) {
    console.error('[ReportsPage] loadReportsFromStorage failed:', error)
    return fallback
  }
}

function toStoredReport(report: ReportTemplate): StoredReport {
  return {
    id: report.id,
    index: report.index,
    name: report.name,
    orgUnit: report.orgUnit,
    orgUnitId: report.orgUnitId ?? null,
    periodTypeId: report.periodTypeId ?? null,
    description: report.description ?? '',
  }
}

function saveReportsToStorage(list: ReportTemplate[] = reports.value) {
  if (typeof window === 'undefined') return
  try {
    const payload = list.map((report) => toStoredReport(report))
    window.localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(payload))
  } catch (error) {
    console.error('[ReportsPage] saveReportsToStorage failed:', error)
  }
}

const reports = ref<ReportTemplate[]>(INITIAL_REPORTS.map(cloneInitialReport))

const { t } = useI18n()
const { isMobile } = useIsMobile('(max-width: 768px)')
const message = useMessage()
const dialog = useDialog()

const searchQuery = ref('')
const orgUnitFilter = ref<string[]>([])
const sortOrder = ref<SortOrder>('index-asc')

const pagination = reactive({
  page: 1,
  pageSize: 10,
})

const tableLoading = ref(false)
const deletingId = ref<string | null>(null)

const orgUnitOptions = computed<SelectOption[]>(() => {
  const values = Array.from(new Set(reports.value.map((item) => item.orgUnit))).filter(Boolean)
  return values.map((value) => ({ label: value, value }))
})

const periodTypes = ref<PeriodTypeRecord[]>([])
const periodTypesLoading = ref(false)
let periodTypesPromise: Promise<void> | null = null

const periodTypeOptions = computed<SelectOption[]>(() =>
  periodTypes.value.map((item) => ({
    label: item.text,
    value: item.id,
  })),
)

const periodTypeLabelMap = computed(() => {
  const map = new Map<number, string>()
  periodTypes.value.forEach((item) => {
    if (typeof item.id === 'number') {
      map.set(item.id, item.text)
    }
  })
  return map
})

function getPeriodTypeLabel(id: number | null | undefined) {
  if (id == null) return ''
  return periodTypeLabelMap.value.get(id) ?? ''
}

const filteredReports = computed(() => {
  const search = normalizeText(searchQuery.value)
  const orgSet = new Set(orgUnitFilter.value)

  const rows = reports.value.filter((report) => {
    const periodLabel = normalizeText(getPeriodTypeLabel(report.periodTypeId))
    const matchesSearch =
      !search ||
      normalizeText(report.index).includes(search) ||
      normalizeText(report.name).includes(search) ||
      normalizeText(report.orgUnit).includes(search) ||
      periodLabel.includes(search)
    const matchesOrg = !orgSet.size || orgSet.has(report.orgUnit)
    return matchesSearch && matchesOrg
  })

  const order = sortOrder.value
  if (order === 'name-asc') {
    rows.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  } else if (order === 'name-desc') {
    rows.sort((a, b) => b.name.localeCompare(a.name, 'ru'))
  } else if (order === 'index-desc') {
    rows.sort((a, b) => compareIndexValues(b.index, a.index))
  } else {
    rows.sort((a, b) => compareIndexValues(a.index, b.index))
  }

  return rows
})

const sortedReports = computed(() => filteredReports.value)

const processedRows = computed<ReportRow[]>(() =>
  sortedReports.value.map((report) => ({ ...report, rowKey: report.id })),
)

const total = computed(() => processedRows.value.length)

const paginatedRows = computed<ReportRow[]>(() => {
  const start = (pagination.page - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  return processedRows.value.slice(start, end)
})

const desktopRows = computed(() => paginatedRows.value)
const mobileRows = computed(() => processedRows.value)
const visibleCount = computed(() =>
  isMobile.value ? mobileRows.value.length : desktopRows.value.length,
)

const maxPage = computed(() => Math.max(1, Math.ceil(total.value / pagination.pageSize)))

watch([searchQuery, orgUnitFilter], () => {
  pagination.page = 1
})

watch([total, () => pagination.pageSize], () => {
  if (pagination.page > maxPage.value) {
    pagination.page = maxPage.value
  }
})

watch(
  reports,
  () => {
    saveReportsToStorage()
  },
  { deep: true },
)

const rowKey = (row: ReportRow) => row.id

type ActionButtonVariant = 'default' | 'error' | 'primary'

interface ActionButtonOptions {
  label: string
  icon: VueComponent
  onClick: () => void
  variant?: ActionButtonVariant
  loading?: boolean
}

function createActionButton(options: ActionButtonOptions) {
  const { label, icon, onClick, variant = 'default', loading } = options
  const buttonType = variant === 'primary' ? 'primary' : variant === 'error' ? 'error' : undefined
  const button = h(
    NButton,
    {
      quaternary: variant !== 'primary',
      circle: true,
      size: 'small',
      type: buttonType,
      loading,
      'aria-label': label,
      onClick,
    },
    {
      icon: () => h(NIcon, null, { default: () => h(icon) }),
    },
  )

  return h(
    NTooltip,
    { placement: 'top' },
    {
      default: () => label,
      trigger: () => button,
    },
  )
}

function splitIndexValue(value: string) {
  const normalized = value.trim()
  const match = normalized.match(/^([^\d]*?)(\d+)?$/)
  const prefixSource = match?.[1] ?? ''
  const prefix =
    prefixSource
      .replace(/\s*-\s*/g, '-')
      .replace(/\s+/g, ' ')
      .trim() || normalized
  const number = match?.[2] ? Number(match[2]) : Number.NaN
  return {
    prefix: prefix.toLocaleUpperCase('ru'),
    number,
    raw: normalized,
  }
}

function compareIndexValues(leftValue: string, rightValue: string) {
  const left = splitIndexValue(leftValue)
  const right = splitIndexValue(rightValue)
  const prefixCompare = left.prefix.localeCompare(right.prefix, 'ru')
  if (prefixCompare !== 0) {
    return prefixCompare
  }

  const leftHasNumber = Number.isFinite(left.number)
  const rightHasNumber = Number.isFinite(right.number)
  if (leftHasNumber && rightHasNumber) {
    if (left.number !== right.number) {
      return left.number - right.number
    }
  } else if (leftHasNumber) {
    return -1
  } else if (rightHasNumber) {
    return 1
  }

  return left.raw.localeCompare(right.raw, 'ru')
}

function renderIndexCell(row: ReportRow) {
  return h('span', { class: 'index-chip' }, row.index)
}

function renderNameCell(row: ReportRow) {
  return h('div', { class: 'name-cell' }, [
    h('div', { class: 'name-cell__title' }, row.name),
    renderPeriodChip(row.periodTypeId),
  ])
}

function renderPeriodChip(periodTypeId: number | null | undefined) {
  const label =
    getPeriodTypeLabel(periodTypeId) ||
    t('nsi.reports.form.periodTypeEmpty', {}, { default: 'Не указан' })
  return h('div', { class: 'name-cell__chips' }, [
    h('span', { class: 'period-chip' }, label),
  ])
}

function renderOrgCell(row: ReportRow) {
  return h('div', { class: 'org-cell' }, [
    h('div', { class: 'org-cell__primary' }, row.orgUnit),
  ])
}

function renderActionsCell(row: ReportRow) {
  const editButton = createActionButton({
    label: t('nsi.reports.actions.edit', {}, { default: 'Редактировать' }),
    icon: CreateOutline,
    onClick: () => openEdit(row),
  })

  const deleteButton = createActionButton({
    label: t('nsi.reports.actions.remove', {}, { default: 'Удалить' }),
    icon: TrashOutline,
    onClick: () => confirmDelete(row),
    variant: 'error',
    loading: deletingId.value === row.id,
  })

  const generateButton = createActionButton({
    label: t('nsi.reports.actions.generate', {}, { default: 'Сформировать' }),
    icon: DocumentTextOutline,
    onClick: () => openGenerator(row),
    variant: 'primary',
  })

  return h('div', { class: 'table-actions' }, [editButton, deleteButton, generateButton])
}

const columns = computed<DataTableColumns<ReportRow>>(() => [
  {
    title: t('nsi.reports.table.index', {}, { default: 'Индекс' }),
    key: 'index',
    width: 110,
    align: 'center',
    sorter: (a, b) => compareIndexValues(a.index, b.index),
    render: (row) => renderIndexCell(row),
  },
  {
    title: t('nsi.reports.table.name', {}, { default: 'Наименование отчёта' }),
    key: 'name',
    minWidth: 320,
    sorter: (a, b) => a.name.localeCompare(b.name, 'ru'),
    render: (row) => renderNameCell(row),
  },
  {
    title: t('nsi.reports.table.orgUnit', {}, { default: 'Организационная единица' }),
    key: 'orgUnit',
    width: 240,
    render: (row) => renderOrgCell(row),
  },
  {
    title: t('nsi.reports.table.actions', {}, { default: 'Действия' }),
    key: 'actions',
    width: 220,
    align: 'center',
    className: 'actions-column',
    render: (row) => renderActionsCell(row),
  },
])

const generatorFormRef = ref<FormInst | null>(null)
const generatorForm = reactive<GeneratorFormModel>({
  date: null,
  objClient: null,
  objLocation: null,
  fullNameClient: null,
  directorId: null,
  fullNameDirector: null,
  nameDirectorPosition: null,
  nameDirectorLocation: null,
  executorId: null,
  fulNameUser: null,
  nameUserPosition: null,
  UserPhone: null,
  tml: null,
})
const generator = reactive({
  open: false,
  submitting: false,
  report: null as ReportTemplate | null,
})

const clients = ref<ClientRecord[]>([])
const clientsLoading = ref(false)
let clientsPromise: Promise<void> | null = null
const personnel = ref<PersonnelRecord[]>([])
const personnelLoading = ref(false)
let personnelPromise: Promise<void> | null = null
const orgUnits = ref<OrgUnitRecord[]>([])
const orgStructureLoading = ref(false)
let orgStructurePromise: Promise<void> | null = null

const clientOptions = computed<SelectOption[]>(() =>
  clients.value.map((item) => ({
    label: item.fullName ?? item.name ?? `ID ${item.id}`,
    value: item.id,
  })),
)

const personnelOptions = computed<SelectOption[]>(() =>
  personnel.value.map((item) => ({
    label: item.namePosition ? `${item.fullName} (${item.namePosition})` : item.fullName,
    value: item.id,
  })),
)

const filteredPersonnelOptions = computed<SelectOption[]>(() => {
  const targetOrgId = generator.report?.orgUnitId ?? null
  const collection =
    targetOrgId != null
      ? personnel.value.filter((item) => item.objLocation === targetOrgId)
      : personnel.value
  return collection.map((item) => ({
    label: item.namePosition ? `${item.fullName} (${item.namePosition})` : item.fullName,
    value: item.id,
  }))
})

const orgStructureOptions = computed<SelectOption[]>(() =>
  orgUnits.value.map((unit) => ({
    label: unit.name,
    value: unit.id,
  })),
)

const generatorRules: FormRules = {
  date: {
    required: true,
    trigger: ['blur', 'change'],
    validator: (_, value) => {
      if (!hasDateValue(value as DatePickerValue | null)) {
        return new Error(
          t('nsi.reports.validation.date', {}, { default: 'Укажите дату отчёта' }),
        )
      }
      return true
    },
  },
  objClient: {
    type: 'number',
    required: true,
    trigger: ['blur', 'change'],
    message: t(
      'nsi.reports.validation.objClient',
      {},
      { default: 'Выберите организацию заказчика' },
    ),
  },
  directorId: {
    type: 'number',
    required: true,
    trigger: ['blur', 'change'],
    message: t(
      'nsi.reports.validation.director',
      {},
      { default: 'Выберите ответственного со стороны подрядчика' },
    ),
  },
  executorId: {
    type: 'number',
    required: true,
    trigger: ['blur', 'change'],
    message: t(
      'nsi.reports.validation.executor',
      {},
      { default: 'Выберите исполнителя со стороны подрядчика' },
    ),
  },
}

const previewFrameRef = ref<HTMLIFrameElement | null>(null)

const preview = reactive<{
  open: boolean
  loading: boolean
  format: ReportFormat
  fileName: string
  blob: Blob | null
  url: string
  report: ReportTemplate | null
  payload: Record<string, unknown>
  jobId: string | null
  remoteUrl: string | null
}>({
  open: false,
  loading: false,
  format: 'pdf',
  fileName: '',
  blob: null,
  url: '',
  report: null,
  payload: {},
  jobId: null,
  remoteUrl: null,
})

const previewPeriodLabel = computed(() => {
  const label = getPeriodTypeLabel(preview.report?.periodTypeId ?? null)
  return label || t('nsi.reports.form.periodTypeEmpty', {}, { default: 'Не указан' })
})

const excelExportLoading = ref(false)
const MODAL_MIN_WIDTH = 640
const MODAL_MIN_HEIGHT = 420

const modalSize = reactive({
  width: Math.min(960, typeof window === 'undefined' ? 960 : window.innerWidth - 80),
  height: Math.min(640, typeof window === 'undefined' ? 640 : window.innerHeight - 160),
})

const previewModalStyle = computed(() => {
  const maxWidth = typeof window === 'undefined' ? modalSize.width : window.innerWidth - 32
  const width = clamp(modalSize.width, MODAL_MIN_WIDTH, maxWidth)
  return {
    width: `${width}px`,
    maxWidth: '95vw',
  }
})

const previewBodyStyle = computed(() => {
  const maxHeight = typeof window === 'undefined' ? modalSize.height : window.innerHeight - 120
  const height = clamp(modalSize.height, MODAL_MIN_HEIGHT, maxHeight)
  return {
    minHeight: `${height}px`,
  }
})

const editFormRef = ref<FormInst | null>(null)
const editDialog = reactive({
  open: false,
  submitting: false,
  mode: 'edit' as 'edit' | 'create',
  reportId: null as string | null,
  form: {
    index: '',
    name: '',
    orgUnit: '',
    orgUnitId: null as number | null,
    periodTypeId: null as number | null,
  },
})

const editFormRules: FormRules = {
  index: {
    required: true,
    trigger: ['blur', 'input'],
    message: t('nsi.reports.validation.index', {}, { default: 'Укажите индекс отчёта' }),
  },
  name: {
    required: true,
    trigger: ['blur', 'input'],
    message: t('nsi.reports.validation.name', {}, { default: 'Укажите наименование отчёта' }),
  },
  orgUnitId: {
    type: 'number',
    required: true,
    trigger: ['blur', 'change'],
    message: t(
      'nsi.reports.validation.orgUnit',
      {},
      { default: 'Выберите организационную единицу' },
    ),
  },
  periodTypeId: {
    type: 'number',
    required: true,
    trigger: ['blur', 'change'],
    message: t(
      'nsi.reports.validation.periodType',
      {},
      { default: 'Укажите период отчёта' },
    ),
  },
}

function openCreateDialog() {
  editDialog.mode = 'create'
  editDialog.reportId = null
  editDialog.form.index = ''
  editDialog.form.name = ''
  editDialog.form.orgUnit = ''
  editDialog.form.orgUnitId = null
  editDialog.form.periodTypeId = null
  editDialog.open = true
  editFormRef.value?.restoreValidation()
  void Promise.all([loadOrgUnits(), loadPeriodTypes()])
}

function openGenerator(report: ReportTemplate) {
  generator.report = report
  resetGeneratorForm(report)
  generator.open = true
  generatorFormRef.value?.restoreValidation()
  void ensureReferenceDataLoaded()
}

async function ensureReferenceDataLoaded() {
  await Promise.all([
    loadPeriodTypes(),
    loadClients(),
    loadPersonnel(),
  ])
}

function resetGeneratorForm(report: ReportTemplate) {
  generatorForm.date = Date.now()
  generatorForm.objClient = null
  generatorForm.fullNameClient = null
  generatorForm.objLocation = report.orgUnitId ?? null
  generatorForm.directorId = null
  generatorForm.fullNameDirector = null
  generatorForm.nameDirectorPosition = null
  generatorForm.nameDirectorLocation = null
  generatorForm.executorId = null
  generatorForm.fulNameUser = null
  generatorForm.nameUserPosition = null
  generatorForm.UserPhone = null
  generatorForm.tml = report.index ?? report.rpc?.tml ?? null
}

function handleClientSelect(value: number | null) {
  generatorForm.objClient = value
  if (value == null) {
    generatorForm.fullNameClient = null
    return
  }
  const client = clients.value.find((item) => item.id === value)
  generatorForm.fullNameClient = client?.fullName ?? client?.name ?? null
}

function handleDirectorSelect(value: number | null) {
  generatorForm.directorId = value
  if (value == null) {
    generatorForm.fullNameDirector = null
    generatorForm.nameDirectorPosition = null
    generatorForm.nameDirectorLocation = null
    generatorForm.objLocation = generator.report?.orgUnitId ?? null
    return
  }
  const person = personnel.value.find((item) => item.id === value)
  generatorForm.fullNameDirector = person?.fullName ?? null
  generatorForm.nameDirectorPosition = person?.namePosition ?? null
  generatorForm.nameDirectorLocation = person?.nameLocation ?? null
}

function handleExecutorSelect(value: number | null) {
  generatorForm.executorId = value
  if (value == null) {
    generatorForm.fulNameUser = null
    generatorForm.nameUserPosition = null
    generatorForm.UserPhone = null
    return
  }
  const person = personnel.value.find((item) => item.id === value)
  generatorForm.fulNameUser = person?.fullName ?? null
  generatorForm.nameUserPosition = person?.nameLocation ?? null
  generatorForm.UserPhone = person?.UserPhone ?? null
}

function handleEditOrgUnitSelect(value: number | null) {
  editDialog.form.orgUnitId = value
  if (value == null) {
    editDialog.form.orgUnit = ''
    return
  }
  const unit = orgUnits.value.find((item) => item.id === value)
  editDialog.form.orgUnit = unit?.name ?? ''
}

async function loadPeriodTypes() {
  if (periodTypes.value.length || periodTypesPromise) {
    return periodTypesPromise
  }
  periodTypesPromise = (async () => {
    periodTypesLoading.value = true
    try {
      const response = await objectsRpc<RpcRecordsEnvelope<PeriodTypeRecord>>(
        'data/loadPeriodType',
        [],
      )
      periodTypes.value = dedupeById(response?.records ?? [])
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      console.error('[ReportsPage] loadPeriodTypes failed:', reason)
      message.error(
        t('nsi.reports.errors.periodTypeLoad', {}, { default: 'Не удалось загрузить типы периодов' }),
      )
    } finally {
      periodTypesLoading.value = false
      periodTypesPromise = null
    }
  })()
  return periodTypesPromise
}

async function loadClients() {
  if (clients.value.length || clientsPromise) {
    return clientsPromise
  }
  clientsPromise = (async () => {
    clientsLoading.value = true
    try {
      const response = await objectsRpc<RpcRecordsEnvelope<ClientRecord>>(
        'data/loadObjList',
        ['Cls_Client', 'Prop_Client', 'clientdata'],
      )
      clients.value = dedupeById(response?.records ?? [])
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      console.error('[ReportsPage] loadClients failed:', reason)
      message.error(
        t(
          'nsi.reports.errors.clientsLoad',
          {},
          { default: 'Не удалось загрузить организации заказчиков' },
        ),
      )
    } finally {
      clientsLoading.value = false
      clientsPromise = null
    }
  })()
  return clientsPromise
}

async function loadPersonnel() {
  if (personnel.value.length || personnelPromise) {
    return personnelPromise
  }
  personnelPromise = (async () => {
    personnelLoading.value = true
    try {
      const response = await personnalRpc<RpcRecordsEnvelope<PersonnelRecord>>(
        'data/loadPersonnal',
        [0],
      )
      personnel.value = dedupeById(response?.records ?? [])
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      console.error('[ReportsPage] loadPersonnel failed:', reason)
      message.error(
        t(
          'nsi.reports.errors.personnelLoad',
          {},
          { default: 'Не удалось загрузить список сотрудников' },
        ),
      )
    } finally {
      personnelLoading.value = false
      personnelPromise = null
    }
  })()
  return personnelPromise
}

async function loadOrgUnits() {
  if (orgUnits.value.length || orgStructurePromise) {
    return orgStructurePromise
  }
  orgStructurePromise = (async () => {
    orgStructureLoading.value = true
    try {
      const response = await orgStructureRpc<RpcRecordsEnvelope<OrgUnitRecord>>(
        'data/loadObjForSelect',
        ['Cls_LocationSection'],
      )
      orgUnits.value = dedupeById(response?.records ?? [])
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      console.error('[ReportsPage] loadOrgUnits failed:', reason)
      message.error(
        t(
          'nsi.reports.errors.orgUnitsLoad',
          {},
          { default: 'Не удалось загрузить организационные единицы' },
        ),
      )
    } finally {
      orgStructureLoading.value = false
      orgStructurePromise = null
    }
  })()
  return orgStructurePromise
}

function buildPayload(report: ReportTemplate) {
  return {
    tml: generatorForm.tml ?? report.index ?? report.rpc?.tml ?? null,
    date: normalizeDateValue(generatorForm.date),
    periodType: report.periodTypeId,
    objClient: generatorForm.objClient,
    objLocation: generatorForm.objLocation,
    fullNameClient: generatorForm.fullNameClient,
    fullNameDirector: generatorForm.fullNameDirector,
    nameDirectorPosition: generatorForm.nameDirectorPosition,
    nameDirectorLocation: generatorForm.nameDirectorLocation,
    fulNameUser: generatorForm.fulNameUser,
    nameUserPosition: generatorForm.nameUserPosition,
    UserPhone: generatorForm.UserPhone,
  }
}

function normalizeDateValue(value: DatePickerValue | null): string | null {
  if (value == null) return null
  if (typeof value === 'number') {
    return formatDateInputValue(new Date(value))
  }
  if (typeof value === 'string') {
    return value
  }
  return null
}

function formatDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function hasDateValue(value: DatePickerValue | null): boolean {
  if (value == null) return false
  if (typeof value === 'number') {
    return Number.isFinite(value)
  }
  if (typeof value === 'string') {
    const stringValue = value as unknown as string
    return stringValue.trim().length > 0
  }
  if (Array.isArray(value)) {
    return value.some((item) => hasDateValue(item))
  }
  return false
}

function dedupeById<T extends { id: number }>(records: T[] = []): T[] {
  const unique = new Map<number, T>()
  records.forEach((record) => {
    if (typeof record.id === 'number') {
      unique.set(record.id, record)
    }
  })
  return Array.from(unique.values())
}

async function generateReportViaRpc(
  report: ReportTemplate,
  payload: Record<string, unknown>,
  format: ReportFormat = report.rpc?.previewFormat ?? report.rpc?.defaultFormat ?? 'pdf',
): Promise<ReportFileResult> {
  if (!report.rpc) {
    throw new Error('RPC-конфигурация для отчёта не найдена')
  }

  const mappedPayload = report.rpc.mapPayload ? report.rpc.mapPayload(payload, report) : payload
  const params = report.rpc.buildGenerateParams?.(mappedPayload, report) ?? [mappedPayload]
  const result = await reportRpc(report.rpc.generateMethod, params)
  const jobId = extractJobId(result)
  if (!jobId) {
    throw new Error('Report API не вернул идентификатор сформированного отчёта')
  }

  const loadParams = report.rpc.buildLoadParams?.({
    payload: mappedPayload,
    report,
    jobId,
    format,
  }) ?? {
    tml: report.rpc.tml,
    id: jobId,
    ...(format === 'pdf' ? { ext: 'pdf' } : {}),
  }

  const loadResult = await fetchReportFile(loadParams)
  const detectedFormat = format ?? detectReportFormat(loadResult)
  const normalizedBlob =
    detectedFormat === 'pdf'
      ? new Blob([loadResult.blob], { type: 'application/pdf' })
      : loadResult.blob

  return {
    blob: normalizedBlob,
    format: detectedFormat,
    fileName: loadResult.fileName ?? resolveReportFileName(report, detectedFormat),
    jobId,
    remoteUrl: loadResult.absoluteUrl,
  }
}

function extractJobId(result: unknown): string | null {
  if (typeof result === 'string') {
    return result
  }
  if (result && typeof result === 'object') {
    if ('id' in result && typeof (result as { id?: unknown }).id === 'string') {
      return (result as { id: string }).id
    }
    if ('result' in result && typeof (result as { result?: unknown }).result === 'string') {
      return (result as { result: string }).result
    }
  }
  return null
}

function detectReportFormat(meta: { contentType?: string; fileName?: string }): ReportFormat {
  const name = meta.fileName?.toLowerCase() ?? ''
  const type = meta.contentType?.toLowerCase() ?? ''
  if (name.endsWith('.pdf') || type.includes('pdf')) return 'pdf'
  if (name.endsWith('.xlsx') || type.includes('spreadsheet') || type.includes('excel')) {
    return 'xlsx'
  }
  return 'pdf'
}

async function handleGenerate() {
  if (!generator.report) return
  try {
    await generatorFormRef.value?.validate()
  } catch {
    return
  }

  generator.submitting = true
  const report = generator.report
  const payload = buildPayload(report)

  try {
    const file = await generateReportViaRpc(report, payload, 'pdf')
    await openPreview(report, file, payload)
    message.success(t('nsi.reports.generate.success', {}, { default: 'Отчёт успешно сформирован' }))
    generator.open = false
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    message.error(reason)
  } finally {
    generator.submitting = false
  }
}

async function openPreview(
  report: ReportTemplate,
  file: ReportFileResult,
  payload: Record<string, unknown>,
) {
  preview.report = report
  preview.payload = { ...payload }
  preview.jobId = file.jobId ?? null
  preview.remoteUrl = file.remoteUrl ?? null
  preview.open = true
  await applyPreviewFile(file)
}

async function applyPreviewFile(file: ReportFileResult) {
  releasePreviewUrl()
  preview.format = file.format
  preview.fileName = resolveReportFileName(preview.report, file.format, file.fileName)
  const normalizedBlob =
    file.format === 'pdf' && file.blob.type !== 'application/pdf'
      ? new Blob([file.blob], { type: 'application/pdf' })
      : file.blob
  preview.blob = normalizedBlob

  if (file.format === 'pdf') {
    preview.url = URL.createObjectURL(normalizedBlob)
    return
  }

  preview.url = ''
}

async function refreshPreview() {
  if (!preview.report) return
  preview.loading = true
  try {
    const file = await generateReportViaRpc(preview.report, preview.payload, 'pdf')
    preview.jobId = file.jobId ?? preview.jobId
    preview.remoteUrl = file.remoteUrl ?? preview.remoteUrl
    await applyPreviewFile(file)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    message.error(reason)
  } finally {
    preview.loading = false
  }
}

async function downloadExcel() {
  if (!preview.report) return
  excelExportLoading.value = true
  try {
    const file = await generateReportViaRpc(preview.report, preview.payload, 'xlsx')
    const fileName = resolveReportFileName(preview.report, 'xlsx', file.fileName)
    await saveBlobToDisk(file.blob, fileName)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    if (error instanceof Error && error.message === 'user-abort') return
    const reason = error instanceof Error ? error.message : String(error)
    message.error(reason)
  } finally {
    excelExportLoading.value = false
  }
}

function releasePreviewUrl() {
  if (preview.url && preview.url.startsWith('blob:')) {
    URL.revokeObjectURL(preview.url)
  }
  preview.url = ''
}

watch(
  () => preview.open,
  (open) => {
    if (!open) {
      releasePreviewUrl()
      preview.report = null
      preview.payload = {}
      preview.jobId = null
      preview.remoteUrl = null
      preview.blob = null
      preview.fileName = ''
      preview.format = 'pdf'
      stopModalResize()
    }
  },
)

onMounted(() => {
  reports.value = loadReportsFromStorage()
  void loadPeriodTypes()
  if (typeof window === 'undefined') return
  syncModalBounds()
  window.addEventListener('resize', syncModalBounds)
})

onBeforeUnmount(() => {
  releasePreviewUrl()
  stopModalResize()
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', syncModalBounds)
  }
})

function openEdit(report: ReportTemplate) {
  editDialog.mode = 'edit'
  editDialog.reportId = report.id
  editDialog.form.index = report.index
  editDialog.form.name = report.name
  editDialog.form.orgUnit = report.orgUnit
  editDialog.form.orgUnitId = report.orgUnitId ?? null
  editDialog.form.periodTypeId = report.periodTypeId ?? null
  editDialog.open = true
  editFormRef.value?.restoreValidation()
  void Promise.all([loadOrgUnits(), loadPeriodTypes()])
}

async function handleEditSave() {
  try {
    await editFormRef.value?.validate()
  } catch {
    return
  }

  editDialog.submitting = true
  try {
  const payload = {
    index: editDialog.form.index.trim(),
    name: editDialog.form.name.trim(),
    orgUnit: editDialog.form.orgUnit.trim(),
    orgUnitId: editDialog.form.orgUnitId ?? null,
    periodTypeId: editDialog.form.periodTypeId ?? null,
  }

  if (editDialog.mode === 'create') {
    const newReport: ReportTemplate = {
      id: createReportId(),
        index: payload.index,
        name: payload.name,
      orgUnit: payload.orgUnit,
      orgUnitId: payload.orgUnitId,
      periodTypeId: payload.periodTypeId,
      description: '',
      rpc: BASE_REPORT_RPC,
    }
      reports.value = [...reports.value, newReport]
      message.success(
        t('nsi.reports.create.success', {}, { default: 'Отчёт добавлен в справочник' }),
      )
    } else {
      if (!editDialog.reportId) return
      const target = reports.value.find((item) => item.id === editDialog.reportId)
      if (!target) return
      target.index = payload.index
      target.name = payload.name
      target.orgUnit = payload.orgUnit
      target.orgUnitId = payload.orgUnitId
      target.periodTypeId = payload.periodTypeId
      message.success(t('common.saved', {}, { default: 'Изменения сохранены' }))
    }

    editDialog.open = false
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    message.error(reason)
  } finally {
    editDialog.submitting = false
  }
}

function createReportId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `report-${Date.now()}`
}

function confirmDelete(report: ReportTemplate) {
  const d = dialog.warning({
    title: t('nsi.reports.actions.remove', {}, { default: 'Удалить отчёт?' }),
    content: t(
      'nsi.reports.actions.removeConfirm',
      { name: report.name },
      { default: `Отчёт «${report.name}» будет удалён из справочника.` },
    ),
    positiveText: t('common.delete', {}, { default: 'Удалить' }),
    negativeText: t('common.cancel', {}, { default: 'Отмена' }),
    onPositiveClick: async () => {
      deletingId.value = report.id
      reports.value = reports.value.filter((item) => item.id !== report.id)
      deletingId.value = null
      message.success(t('nsi.reports.actions.removeSuccess', {}, { default: 'Отчёт удалён' }))
    },
  })
  return d
}

function ensureFileName(name: string, format: ReportFormat) {
  const lower = name.toLowerCase()
  if (lower.endsWith(`.${format}`)) {
    return name
  }
  return `${name}.${format}`
}

function resolveReportFileName(
  report: ReportTemplate | null,
  format: ReportFormat,
  provided?: string | null,
) {
  if (provided && provided.trim()) {
    return ensureFileName(provided.trim(), format)
  }
  if (report?.rpc?.tml) {
    return ensureFileName(report.rpc.tml, format)
  }
  if (report?.index) {
    return ensureFileName(report.index, format)
  }
  if (report?.name) {
    return `${slugify(report.name)}.${format}`
  }
  return `report.${format}`
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

async function saveBlobToDisk(blob: Blob, defaultName: string) {
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const handle = await (window as WindowWithFilePicker).showSaveFilePicker({
        suggestedName: defaultName,
        types: [
          {
            description: 'Excel Workbook',
            accept: {
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            },
          },
        ],
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('user-abort')
      }
      throw error
    }
  }
  downloadBlob(blob, defaultName)
}

const resizeState = reactive({
  active: false,
  startX: 0,
  startY: 0,
  startWidth: 0,
  startHeight: 0,
})

function startModalResize(event: MouseEvent) {
  if (typeof window === 'undefined') return
  event.preventDefault()
  resizeState.active = true
  resizeState.startX = event.clientX
  resizeState.startY = event.clientY
  resizeState.startWidth = modalSize.width
  resizeState.startHeight = modalSize.height
  window.addEventListener('mousemove', handleModalResize)
  window.addEventListener('mouseup', stopModalResize)
}

function handleModalResize(event: MouseEvent) {
  if (!resizeState.active) return
  const maxWidth = typeof window === 'undefined' ? modalSize.width : window.innerWidth - 32
  const maxHeight = typeof window === 'undefined' ? modalSize.height : window.innerHeight - 120
  modalSize.width = clamp(
    resizeState.startWidth + (event.clientX - resizeState.startX),
    MODAL_MIN_WIDTH,
    maxWidth,
  )
  modalSize.height = clamp(
    resizeState.startHeight + (event.clientY - resizeState.startY),
    MODAL_MIN_HEIGHT,
    maxHeight,
  )
}

function stopModalResize() {
  if (typeof window !== 'undefined') {
    window.removeEventListener('mousemove', handleModalResize)
    window.removeEventListener('mouseup', stopModalResize)
  }
  resizeState.active = false
}

function syncModalBounds() {
  if (typeof window === 'undefined') return
  modalSize.width = clamp(modalSize.width, MODAL_MIN_WIDTH, window.innerWidth - 32)
  modalSize.height = clamp(modalSize.height, MODAL_MIN_HEIGHT, window.innerHeight - 120)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

type WindowWithFilePicker = Window &
  typeof globalThis & {
    showSaveFilePicker?: (options: ExcelSavePickerOptions) => Promise<FileSystemFileHandle>
  }

type ExcelSavePickerOptions = {
  suggestedName?: string
  types?: Array<{ description?: string; accept: Record<string, string[]> }>
}

type FileSystemFileHandle = {
  createWritable: () => Promise<FileSystemWritableFileStream>
}

type FileSystemWritableFileStream = {
  write: (data: Blob) => Promise<void>
  close: () => Promise<void>
}

const ActionsRenderer = defineComponent({
  name: 'ReportsActionsRenderer',
  props: {
    row: {
      type: Object as PropType<ReportRow>,
      required: true,
    },
  },
  setup(props) {
    return () => renderActionsCell(props.row)
  },
})
</script>

<style scoped>
.reports-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.toolbar__left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.subtext {
  font-size: 14px;
  color: var(--s360-color-text-subtle, rgba(0, 0, 0, 0.6));
}

.toolbar__controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.toolbar__filters {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar__select {
  min-width: 200px;
}

.toolbar__search {
  width: clamp(200px, 22vw, 320px);
}

.table-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

:deep(.n-data-table .n-data-table-table) {
  border-collapse: separate;
  border-spacing: 0 12px;
}

:deep(.n-data-table .n-data-table-tbody .n-data-table-tr) {
  background: var(--n-card-color, var(--s360-bg));
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
  border-radius: 12px;
}

:deep(.n-data-table .n-data-table-td) {
  border-bottom: none;
  padding: 12px;
  vertical-align: middle;
}

:deep(.n-data-table .n-data-table-tr:hover) .table-actions {
  opacity: 1;
}

.index-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--s360-chip-bg, rgba(0, 0, 0, 0.06));
  font-weight: 600;
}

.name-cell__title {
  font-weight: 600;
  margin-bottom: 6px;
}

.name-cell__chips {
  margin-top: 6px;
}

.period-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--s360-chip-bg, rgba(0, 0, 0, 0.06));
  font-size: 12px;
  font-weight: 500;
  color: var(--s360-color-text, rgba(0, 0, 0, 0.8));
}


.org-cell__primary {
  font-weight: 500;
}

.table-actions {
  display: inline-flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.actions-column :deep(.n-data-table-th__title),
.actions-column :deep(.n-data-table-td__content) {
  justify-content: center;
}

.list-info {
  font-size: 13px;
  color: var(--s360-color-text-subtle, rgba(0, 0, 0, 0.6));
  padding-left: 4px;
}

.cards {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
}

.card {
  border: 1px solid var(--s360-border, rgba(0, 0, 0, 0.08));
  border-radius: 14px;
  padding: 12px;
  background: var(--s360-bg, #fff);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.card__title {
  font-weight: 600;
  margin: 0;
}

.card__description {
  margin: 0;
  color: var(--s360-color-text-subtle, rgba(0, 0, 0, 0.7));
  font-size: 14px;
}

.card__grid {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 6px 10px;
  margin: 0;
}

.card__grid dt {
  font-size: 12px;
  color: var(--n-text-color-3);
}

.card__grid dd {
  margin: 0;
  font-weight: 500;
}

.card__actions {
  display: flex;
  justify-content: flex-end;
}

.card .table-actions {
  opacity: 1;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.pagination-bar {
  display: flex;
  justify-content: flex-end;
}

.pagination-total {
  font-size: 13px;
  color: var(--s360-color-text-subtle, rgba(0, 0, 0, 0.6));
}

.modal-subtitle {
  font-size: 13px;
  color: var(--s360-color-text-subtle, rgba(0, 0, 0, 0.6));
}

.modal-description {
  font-size: 14px;
  color: var(--s360-color-text-subtle, rgba(0, 0, 0, 0.7));
  margin-bottom: 12px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}

.preview-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}

.preview-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.preview-body {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 520px;
}

.preview-frame {
  border: 1px solid var(--s360-border, rgba(0, 0, 0, 0.08));
  border-radius: 12px;
  overflow: auto;
  flex: 1;
  min-height: 520px;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
  min-height: 520px;
}

.modal-resize-handle {
  position: absolute;
  width: 16px;
  height: 16px;
  right: 8px;
  bottom: 8px;
  border: none;
  background: transparent;
  cursor: nwse-resize;
  padding: 0;
}

.modal-resize-handle::after {
  content: '';
  position: absolute;
  right: 2px;
  bottom: 2px;
  width: 12px;
  height: 12px;
  border-right: 2px solid rgba(0, 0, 0, 0.2);
  border-bottom: 2px solid rgba(0, 0, 0, 0.2);
  pointer-events: none;
}

.preview-meta__title {
  font-weight: 600;
}

.preview-meta__subtitle {
  font-size: 13px;
  color: var(--s360-color-text-subtle, rgba(0, 0, 0, 0.7));
}

.field-hint {
  font-size: 12px;
  color: var(--s360-color-text-subtle, rgba(0, 0, 0, 0.6));
}

@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar__controls {
    justify-content: stretch;
  }

  .toolbar__search,
  .toolbar__select,
  .toolbar__filters {
    width: 100%;
  }

  .card__grid {
    grid-template-columns: 1fr;
  }
}
</style>
