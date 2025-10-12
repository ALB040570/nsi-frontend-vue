<template>
  <section class="kpi-tiles">
    <header class="kpi-tiles__header">
      <h2 class="kpi-tiles__title">{{ title }}</h2>
    </header>
    <div class="kpi-tiles__grid">
      <NCard v-for="tile in tiles" :key="tile.id" size="small" class="kpi-tile">
        <div class="kpi-tile__body">
          <div class="kpi-tile__heading">
            <h3 class="kpi-tile__name">{{ tile.title }}</h3>
            <NTooltip>
              <template #trigger>
                <NButton quaternary size="small" class="kpi-tile__cta" @click="emitSelect(tile.id)">
                  {{ tile.cta }}
                </NButton>
              </template>
              <span>{{ tooltipHint(tile.percent) }}</span>
            </NTooltip>
          </div>
          <p class="kpi-tile__summary">{{ tile.summary }}</p>
          <p class="kpi-tile__filled">{{ tile.filled }}</p>
          <div class="kpi-tile__progress">
            <NProgress :percentage="tile.percent" :show-indicator="false" size="small" />
            <span class="kpi-tile__percent">{{ tile.percent }}%</span>
          </div>
        </div>
      </NCard>
    </div>
    <div v-if="loading" class="kpi-tiles__overlay">
      <NSpin size="large" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NCard, NProgress, NSpin, NTooltip } from 'naive-ui'

import { useI18n } from '@shared/lib/i18n'
import type { NsiCoverage } from '@/services/nsiDashboard.api'

type TileId = keyof NsiCoverage

const props = defineProps<{ coverage: NsiCoverage | null; loading?: boolean }>()
const emit = defineEmits<{ (e: 'select', id: TileId): void }>()

const { t } = useI18n()

const title = computed(() => t('nsi.dashboard.kpi.title'))
const genericTooltip = computed(() => t('nsi.dashboard.kpi.genericTooltip'))

function tooltipHint(percent: number) {
  return genericTooltip.value.replace('{percent}', String(percent))
}

const formatter = new Intl.NumberFormat('ru-RU')

function percent(part: number, total: number) {
  if (total <= 0 || part <= 0) return 0
  return Math.round((part / total) * 100)
}

function combinedPercent(parts: number[], total: number) {
  if (total <= 0) return 0
  const normalized = parts.map((value) => (value <= 0 ? 0 : value / total))
  const ratio = normalized.reduce((acc, value) => acc + Math.min(1, value), 0) / parts.length
  return Math.round(ratio * 100)
}

const tiles = computed(() => {
  const coverage = props.coverage
  if (!coverage) {
    return [
      'sources',
      'types',
      'components',
      'params',
      'defects',
      'works',
    ].map((id) => ({
      id: id as TileId,
      title: t(`nsi.dashboard.kpi.tiles.${id}.title`),
      summary: t(`nsi.dashboard.kpi.tiles.${id}.summary`, { count: formatter.format(0) }),
      filled: t(`nsi.dashboard.kpi.tiles.${id}.filled`),
      cta: t(`nsi.dashboard.kpi.tiles.${id}.cta`),
      percent: 0,
    }))
  }

  return [
    {
      id: 'sources' as const,
      percent: percent(coverage.sources.withIssuerDateExec, coverage.sources.total),
      summary: t('nsi.dashboard.kpi.tiles.sources.summary', {
        count: formatter.format(coverage.sources.total),
      }),
      filled: t('nsi.dashboard.kpi.tiles.sources.filled'),
      title: t('nsi.dashboard.kpi.tiles.sources.title'),
      cta: t('nsi.dashboard.kpi.tiles.sources.cta'),
    },
    {
      id: 'types' as const,
      percent: combinedPercent(
        [coverage.types.withShape, coverage.types.withComponents],
        coverage.types.total,
      ),
      summary: t('nsi.dashboard.kpi.tiles.types.summary', {
        count: formatter.format(coverage.types.total),
      }),
      filled: t('nsi.dashboard.kpi.tiles.types.filled'),
      title: t('nsi.dashboard.kpi.tiles.types.title'),
      cta: t('nsi.dashboard.kpi.tiles.types.cta'),
    },
    {
      id: 'components' as const,
      percent: combinedPercent(
        [coverage.components.withParams, coverage.components.withDefects],
        coverage.components.total,
      ),
      summary: t('nsi.dashboard.kpi.tiles.components.summary', {
        count: formatter.format(coverage.components.total),
      }),
      filled: t('nsi.dashboard.kpi.tiles.components.filled'),
      title: t('nsi.dashboard.kpi.tiles.components.title'),
      cta: t('nsi.dashboard.kpi.tiles.components.cta'),
    },
    {
      id: 'params' as const,
      percent: percent(coverage.params.withUnitsAndBounds, coverage.params.total),
      summary: t('nsi.dashboard.kpi.tiles.params.summary', {
        count: formatter.format(coverage.params.total),
      }),
      filled: t('nsi.dashboard.kpi.tiles.params.filled'),
      title: t('nsi.dashboard.kpi.tiles.params.title'),
      cta: t('nsi.dashboard.kpi.tiles.params.cta'),
    },
    {
      id: 'defects' as const,
      percent: percent(
        coverage.defects.withCategoryAndComponent,
        coverage.defects.total,
      ),
      summary: t('nsi.dashboard.kpi.tiles.defects.summary', {
        count: formatter.format(coverage.defects.total),
      }),
      filled: t('nsi.dashboard.kpi.tiles.defects.filled'),
      title: t('nsi.dashboard.kpi.tiles.defects.title'),
      cta: t('nsi.dashboard.kpi.tiles.defects.cta'),
    },
    {
      id: 'works' as const,
      percent: percent(
        coverage.works.withTypePeriodSource,
        coverage.works.total,
      ),
      summary: t('nsi.dashboard.kpi.tiles.works.summary', {
        count: formatter.format(coverage.works.total),
      }),
      filled: t('nsi.dashboard.kpi.tiles.works.filled'),
      title: t('nsi.dashboard.kpi.tiles.works.title'),
      cta: t('nsi.dashboard.kpi.tiles.works.cta'),
    },
  ]
})

const loading = computed(() => Boolean(props.loading))

function emitSelect(id: TileId) {
  emit('select', id)
}
</script>

<style scoped>
.kpi-tiles {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.kpi-tiles__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.kpi-tiles__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.kpi-tiles__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.kpi-tile__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.kpi-tile__heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.kpi-tile__name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.kpi-tile__summary {
  margin: 0;
  color: var(--n-text-color-2);
  font-size: 13px;
}

.kpi-tile__filled {
  margin: 0;
  font-size: 13px;
}

.kpi-tile__progress {
  display: flex;
  align-items: center;
  gap: 12px;
}

.kpi-tile__progress :deep(.n-progress) {
  flex: 1;
}

.kpi-tile__percent {
  font-weight: 600;
}

.kpi-tile__cta {
  border-radius: 12px;
}

.kpi-tiles__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 12px;
}
</style>
