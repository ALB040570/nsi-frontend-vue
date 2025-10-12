<template>
  <section class="nsi-dashboard-page">
    <div class="nsi-dashboard-page__container">
      <nav class="nsi-dashboard-page__breadcrumbs" :aria-label="breadcrumbsA11y">
        <span class="breadcrumbs__link">{{ breadcrumbSettings }}</span>
        <span class="breadcrumbs__sep" aria-hidden="true">/</span>
        <span class="breadcrumbs__current">{{ breadcrumbHome }}</span>
      </nav>

      <CtaRow
        :title="pageTitle"
        :subtitle="pageSubtitle"
        :actions="quickActions"
        :assistant-enabled="assistantEnabled"
        :assistant-label="assistantLabel"
        :assistant-tooltip="assistantTooltip"
        :assistant-banner-title="assistantBannerTitle"
        :assistant-banner-text="assistantBannerText"
        :search-placeholder="searchPlaceholder"
        :search-typing-hint="searchTypingHint"
        :search-empty="searchEmpty"
        :search-loading-text="searchLoadingText"
        :search-open-label="searchOpenLabel"
        :search-types="searchTypes"
        :actions-aria-label="actionsAriaLabel"
        @toggle-assistant="assistantEnabled = $event"
        @select-search="handleSearchSelect"
      />

      <div class="nsi-dashboard-page__layout">
        <div class="nsi-dashboard-page__left">
          <RelationsMap
            :counts="relationsCounts"
            :partial="relationsPartial"
            :loading="relationsLoading"
            @select-node="handleNavigate"
          />

          <Checklist
            :title="checklistTitle"
            :steps="checklistSteps"
            :go-label="checklistGo"
            :info-label="checklistInfo"
            :partial="coveragePartial"
            @select="handleNavigate"
          />
        </div>

        <div class="nsi-dashboard-page__right">
          <KpiTiles
            :coverage="coverage"
            :partial="coveragePartial"
            :loading="coverageLoading"
            @select="handleTileSelect"
          />

          <Diagnostics
            :title="diagnosticsTitle"
            :description="diagnosticsDescription"
            :empty-text="diagnosticsEmpty"
            :items="diagnosticsItems"
            :partial="diagnosticsPartial"
            :loading="diagnosticsLoading"
            :severity-labels="severityLabels"
            @select="handleDiagnosticSelect"
          />

          <RecentActivity
            :title="activityTitle"
            :empty-text="activityEmpty"
            :items="activityItems"
            :partial="activityPartial"
            @select="handleActivitySelect"
          />

          <NCard size="small" class="nsi-dashboard-page__templates">
            <h3 class="templates__title">{{ templatesTitle }}</h3>
            <div class="templates__actions">
              <NButton quaternary @click="handleImport('import')">{{ templatesImport }}</NButton>
              <NButton tertiary @click="handleImport('download')">{{ templatesDownload }}</NButton>
            </div>
            <p class="templates__hint">{{ templatesHint }}</p>
          </NCard>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { NButton, NCard } from 'naive-ui'

import { useI18n } from '@shared/lib'
import CtaRow from '@/widgets/nsi-dashboard/CtaRow.vue'
import RelationsMap from '@/widgets/nsi-dashboard/RelationsMap.vue'
import KpiTiles from '@/widgets/nsi-dashboard/KpiTiles.vue'
import Checklist from '@/widgets/nsi-dashboard/Checklist.vue'
import Diagnostics from '@/widgets/nsi-dashboard/Diagnostics.vue'
import RecentActivity from '@/widgets/nsi-dashboard/RecentActivity.vue'
import {
  fetchNsiActivity,
  fetchNsiCoverage,
  fetchNsiDiagnostics,
  fetchNsiRelationsCounts,
  type ActivityItem,
  type ActivityResponse,
  type DiagnosticItem,
  type DiagnosticsResponse,
  type NsiCoverage,
  type NsiCoverageResponse,
  type NsiSearchResult,
  type RelationsCountsResponse,
} from '@/services/nsiDashboard.api'

type TargetKey = 'sources' | 'types' | 'components' | 'params' | 'defects' | 'works'

type TileId = keyof NsiCoverage

const router = useRouter()
const { t } = useI18n()

const assistantEnabled = ref(false)

const coverageQuery = useQuery({ queryKey: ['nsi-dashboard', 'coverage'], queryFn: fetchNsiCoverage })
const diagnosticsQuery = useQuery({ queryKey: ['nsi-dashboard', 'diagnostics'], queryFn: fetchNsiDiagnostics })
const activityQuery = useQuery({
  queryKey: ['nsi-dashboard', 'activity'],
  queryFn: () => fetchNsiActivity(7),
})
const relationsQuery = useQuery({
  queryKey: ['nsi-dashboard', 'relations'],
  queryFn: fetchNsiRelationsCounts,
})

const coverageResponse = computed<NsiCoverageResponse | null>(() => coverageQuery.data.value ?? null)
const coverage = computed(() => coverageResponse.value ?? null)
const coveragePartial = computed(() => Boolean(coverageResponse.value?.partial))
const coverageLoading = computed(() => coverageQuery.isLoading.value)

const diagnosticsResponse = computed<DiagnosticsResponse | null>(() => diagnosticsQuery.data.value ?? null)
const diagnosticsItems = computed(() => diagnosticsResponse.value?.items ?? [])
const diagnosticsPartial = computed(() => Boolean(diagnosticsResponse.value?.partial))
const diagnosticsLoading = computed(() => diagnosticsQuery.isLoading.value)

const activityResponse = computed<ActivityResponse | null>(() => activityQuery.data.value ?? null)
const activityItems = computed(() => activityResponse.value?.items ?? [])
const activityPartial = computed(() => Boolean(activityResponse.value?.partial))
const activityEmpty = computed(() => t('nsi.dashboard.activity.empty'))
const activityTitle = computed(() => t('nsi.dashboard.activity.title'))

const relationsResponse = computed<RelationsCountsResponse | null>(() => relationsQuery.data.value ?? null)
const relationsCounts = computed(() => relationsResponse.value ?? null)
const relationsPartial = computed(() => Boolean(relationsResponse.value?.partial))
const relationsLoading = computed(() => relationsQuery.isLoading.value)

const pageTitle = computed(() => t('nsi.dashboard.title'))
const pageSubtitle = computed(() => t('nsi.dashboard.subtitle'))
const assistantLabel = computed(() => t('nsi.dashboard.actions.assistant.label'))
const assistantTooltip = computed(() => t('nsi.dashboard.actions.assistant.tooltip'))
const assistantBannerTitle = computed(() => t('nsi.dashboard.actions.assistant.bannerTitle'))
const assistantBannerText = computed(() => t('nsi.dashboard.actions.assistant.bannerText'))

const searchPlaceholder = computed(() => t('nsi.dashboard.search.placeholder'))
const searchTypingHint = computed(() => t('nsi.dashboard.search.typingHint'))
const searchEmpty = computed(() => t('nsi.dashboard.search.empty'))
const searchLoadingText = computed(() => t('nsi.dashboard.search.loading'))
const searchOpenLabel = computed(() => t('nsi.dashboard.searchResults.open'))
const searchTypes = computed<Record<string, string>>(() => ({
  sources: t('nsi.dashboard.search.types.sources'),
  types: t('nsi.dashboard.search.types.types'),
  components: t('nsi.dashboard.search.types.components'),
  params: t('nsi.dashboard.search.types.params'),
  defects: t('nsi.dashboard.search.types.defects'),
  works: t('nsi.dashboard.search.types.works'),
}))

const actionsAriaLabel = computed(() => t('nsi.dashboard.actions.groupLabel'))

const quickActions = computed(() => [
  {
    id: 'add-document',
    label: t('nsi.dashboard.actions.addDocument.label'),
    tooltip: t('nsi.dashboard.actions.addDocument.tooltip'),
    to: { name: 'sources', query: { action: 'create' } },
  },
  {
    id: 'add-type',
    label: t('nsi.dashboard.actions.addObjectType.label'),
    tooltip: t('nsi.dashboard.actions.addObjectType.tooltip'),
    to: { name: 'object-types', query: { action: 'create' } },
  },
  {
    id: 'add-component',
    label: t('nsi.dashboard.actions.addComponent.label'),
    tooltip: t('nsi.dashboard.actions.addComponent.tooltip'),
    to: { name: 'components', query: { action: 'create' } },
  },
  {
    id: 'add-parameter',
    label: t('nsi.dashboard.actions.addParameter.label'),
    tooltip: t('nsi.dashboard.actions.addParameter.tooltip'),
    to: { name: 'object-parameters', query: { action: 'create' } },
  },
  {
    id: 'add-defect',
    label: t('nsi.dashboard.actions.addDefect.label'),
    tooltip: t('nsi.dashboard.actions.addDefect.tooltip'),
    to: { name: 'object-defects', query: { action: 'create' } },
  },
  {
    id: 'add-work',
    label: t('nsi.dashboard.actions.addWork.label'),
    tooltip: t('nsi.dashboard.actions.addWork.tooltip'),
    to: { name: 'works', query: { action: 'create' } },
  },
])

const checklistTitle = computed(() => t('nsi.dashboard.checklist.title'))
const checklistGo = computed(() => t('nsi.dashboard.checklistActions.go'))
const checklistInfo = computed(() => t('nsi.dashboard.checklistActions.info'))

const checklistSteps = computed(() => {
  const data = coverage.value
  const totalSources = data?.sources.total ?? 0
  const sourcesFilled = data?.sources.withIssuerDateExec ?? 0
  const totalTypes = data?.types.total ?? 0
  const typesWithShape = data?.types.withShape ?? 0
  const typesWithComponents = data?.types.withComponents ?? 0
  const totalComponents = data?.components.total ?? 0
  const componentsWithParams = data?.components.withParams ?? 0
  const componentsWithDefects = data?.components.withDefects ?? 0
  const totalParams = data?.params.total ?? 0
  const paramsFilled = data?.params.withUnitsAndBounds ?? 0
  const totalDefects = data?.defects.total ?? 0
  const defectsFilled = data?.defects.withCategoryAndComponent ?? 0
  const totalWorks = data?.works.total ?? 0
  const worksFilled = data?.works.withTypePeriodSource ?? 0

  return [
    {
      id: 'sources',
      title: t('nsi.dashboard.checklist.steps.sources.title'),
      description: t('nsi.dashboard.checklist.steps.sources.description'),
      info: t('nsi.dashboard.checklist.steps.sources.info'),
      done: totalSources > 0 && sourcesFilled >= totalSources,
    },
    {
      id: 'types',
      title: t('nsi.dashboard.checklist.steps.types.title'),
      description: t('nsi.dashboard.checklist.steps.types.description'),
      info: t('nsi.dashboard.checklist.steps.types.info'),
      done: totalTypes > 0 && typesWithShape >= totalTypes && typesWithComponents >= totalTypes,
    },
    {
      id: 'components',
      title: t('nsi.dashboard.checklist.steps.components.title'),
      description: t('nsi.dashboard.checklist.steps.components.description'),
      info: t('nsi.dashboard.checklist.steps.components.info'),
      done:
        totalComponents > 0 &&
        componentsWithParams >= totalComponents &&
        componentsWithDefects >= totalComponents,
    },
    {
      id: 'params',
      title: t('nsi.dashboard.checklist.steps.params.title'),
      description: t('nsi.dashboard.checklist.steps.params.description'),
      info: t('nsi.dashboard.checklist.steps.params.info'),
      done: totalParams > 0 && paramsFilled >= totalParams,
    },
    {
      id: 'defects',
      title: t('nsi.dashboard.checklist.steps.defects.title'),
      description: t('nsi.dashboard.checklist.steps.defects.description'),
      info: t('nsi.dashboard.checklist.steps.defects.info'),
      done: totalDefects > 0 && defectsFilled >= totalDefects,
    },
    {
      id: 'works',
      title: t('nsi.dashboard.checklist.steps.works.title'),
      description: t('nsi.dashboard.checklist.steps.works.description'),
      info: t('nsi.dashboard.checklist.steps.works.info'),
      done: totalWorks > 0 && worksFilled >= totalWorks,
    },
  ]
})

const diagnosticsTitle = computed(() => t('nsi.dashboard.diagnostics.title'))
const diagnosticsDescription = computed(() => t('nsi.dashboard.diagnostics.description'))
const diagnosticsEmpty = computed(() => t('nsi.dashboard.diagnostics.empty'))

const severityLabels = computed(() => ({
  info: t('nsi.dashboard.diagnostics.severity.info'),
  warning: t('nsi.dashboard.diagnostics.severity.warning'),
  critical: t('nsi.dashboard.diagnostics.severity.critical'),
}))

const templatesTitle = computed(() => t('nsi.dashboard.templates.title'))
const templatesImport = computed(() => t('nsi.dashboard.templates.import'))
const templatesDownload = computed(() => t('nsi.dashboard.templates.download'))
const templatesHint = computed(() => t('nsi.dashboard.templates.hint'))

const breadcrumbSettings = computed(() => t('nsi.dashboard.breadcrumbs.settings'))
const breadcrumbHome = computed(() => t('nsi.dashboard.breadcrumbs.home'))
const breadcrumbsA11y = computed(() => t('nsi.dashboard.breadcrumbsA11y'))

const targetRoutes: Record<TargetKey, { name: string }> = {
  sources: { name: 'sources' },
  types: { name: 'object-types' },
  components: { name: 'components' },
  params: { name: 'object-parameters' },
  defects: { name: 'object-defects' },
  works: { name: 'works' },
}

const missingQueries: Partial<Record<TileId, Record<string, string>>> = {
  sources: { missing: 'issuer-date' },
  types: { missing: 'components' },
  components: { missing: 'params' },
  params: { missing: 'norms' },
  defects: { missing: 'category' },
  works: { missing: 'source' },
}

function handleNavigate(target: TargetKey) {
  const route = targetRoutes[target]
  if (!route) return
  void router.push({ name: route.name })
}

function handleTileSelect(id: TileId) {
  const routeKey = id as TargetKey
  const route = targetRoutes[routeKey]
  if (!route) return
  void router.push({ name: route.name, query: missingQueries[id] })
}

function handleDiagnosticSelect(item: DiagnosticItem) {
  const route = targetRoutes[item.target]
  if (!route) return
  void router.push({ name: route.name, query: item.linkQuery })
}

function handleActivitySelect(item: ActivityItem) {
  const route = targetRoutes[item.target]
  if (!route) return
  void router.push({ name: route.name, query: { highlight: item.targetId } })
}

function handleSearchSelect(result: NsiSearchResult) {
  const route = targetRoutes[result.type]
  if (!route) return
  void router.push({ name: route.name, query: { highlight: result.id } })
}

function handleImport(action: 'import' | 'download') {
  if (action === 'import') {
    void router.push({ name: 'sources', query: { action: 'import' } })
    return
  }
  void router.push({ name: 'sources', query: { action: 'download-template' } })
}
</script>

<style scoped>
.nsi-dashboard-page {
  padding: var(--s360-space-xxl) var(--s360-space-xl);
}

.nsi-dashboard-page__container {
  display: flex;
  flex-direction: column;
  gap: var(--s360-space-xl);
  max-width: var(--s360-container-max-width);
  margin: 0 auto;
}

.nsi-dashboard-page__breadcrumbs {
  display: inline-flex;
  align-items: center;
  gap: var(--s360-space-sm);
  color: var(--s360-text-muted);
  font-size: var(--s360-font-caption);
}

.breadcrumbs__link {
  color: var(--s360-text-muted);
}

.breadcrumbs__current {
  color: var(--s360-text-primary);
  font-weight: 600;
}

.nsi-dashboard-page__layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: var(--s360-space-xl);
  align-items: start;
}

.nsi-dashboard-page__left,
.nsi-dashboard-page__right {
  display: flex;
  flex-direction: column;
  gap: var(--s360-space-xl);
}

.nsi-dashboard-page__templates {
  display: flex;
  flex-direction: column;
  gap: var(--s360-space-sm);
}

.templates__title {
  margin: 0;
  font-size: var(--s360-font-title-md);
  font-weight: 600;
}

.templates__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s360-space-sm);
}

.templates__hint {
  margin: 0;
  color: var(--s360-text-muted);
  font-size: var(--s360-font-caption);
}

@media (max-width: 1024px) {
  .nsi-dashboard-page__layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .nsi-dashboard-page {
    padding: var(--s360-space-lg);
  }

  .templates__actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
