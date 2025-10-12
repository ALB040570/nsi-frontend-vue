<template>
  <section class="relations-map">
    <header class="relations-map__header">
      <div class="relations-map__heading">
        <h2 class="relations-map__title">{{ title }}</h2>
        <NTooltip v-if="partial" placement="top">
          <template #trigger>
            <span class="relations-map__status">{{ partialLabel }}</span>
          </template>
          <span>{{ partialTooltip }}</span>
        </NTooltip>
      </div>
      <NPopover trigger="hover" placement="left">
        <template #trigger>
          <NButton quaternary size="small" class="relations-map__help">
            {{ helpLabel }}
          </NButton>
        </template>
        <div class="relations-map__help-content">
          <p class="relations-map__help-title">{{ helpTooltip }}</p>
          <ul>
            <li v-for="(point, index) in helpPoints" :key="index">{{ point }}</li>
          </ul>
        </div>
      </NPopover>
    </header>

    <div class="relations-map__canvas" role="presentation">
      <svg class="relations-map__edges" :viewBox="viewBox">
        <g v-for="edge in edges" :key="edge.id">
          <line
            :x1="edge.x1"
            :y1="edge.y1"
            :x2="edge.x2"
            :y2="edge.y2"
            class="relations-map__edge"
          >
            <title>{{ edge.tooltip }}</title>
          </line>
        </g>
      </svg>

      <div v-for="node in nodes" :key="node.id" class="relations-map__node" :style="node.style">
        <NTooltip placement="top">
          <template #trigger>
            <button
              type="button"
              class="relations-map__node-btn"
              :aria-label="`${node.label}: ${node.tooltip}`"
              @click="handleNodeClick(node.id)"
            >
              <span class="relations-map__node-label">{{ node.label }}</span>
              <span class="relations-map__node-count">{{ node.count }}</span>
            </button>
          </template>
          <span>{{ node.tooltip }}</span>
        </NTooltip>
      </div>

      <div v-if="loading" class="relations-map__overlay">
        <NSpin size="large" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NPopover, NSpin, NTooltip } from 'naive-ui'

import { useI18n } from '@shared/lib'
import type { RelationsCounts } from '@/services/nsiDashboard.api'

defineOptions({
  name: 'NsiDashboardRelationsMap',
})

const viewBoxWidth = 600
const viewBoxHeight = 360

const viewBox = `0 0 ${viewBoxWidth} ${viewBoxHeight}`

const props = defineProps<{ counts: RelationsCounts | null; loading?: boolean; partial?: boolean }>()
const emit = defineEmits<{ (e: 'select-node', id: keyof RelationsCounts): void }>()

const { t, tm } = useI18n()
const partial = computed(() => Boolean(props.partial))
const partialLabel = computed(() => t('nsi.dashboard.partial.label'))
const partialTooltip = computed(() => t('nsi.dashboard.partial.tooltip'))

const title = computed(() => t('nsi.dashboard.relations.title'))
const helpLabel = computed(() => t('nsi.dashboard.relations.helpLabel'))
const helpTooltip = computed(() => t('nsi.dashboard.relations.helpTooltip'))
const helpPoints = computed(() => tm<string>('nsi.dashboard.relations.helpPoints'))

const rawNodes = [
  {
    id: 'sources',
    x: 10,
    y: 60,
    labelKey: 'nsi.dashboard.relations.nodes.sources.label',
    tooltipKey: 'nsi.dashboard.relations.nodes.sources.tooltip',
  },
  {
    id: 'types',
    x: 32,
    y: 28,
    labelKey: 'nsi.dashboard.relations.nodes.types.label',
    tooltipKey: 'nsi.dashboard.relations.nodes.types.tooltip',
  },
  {
    id: 'components',
    x: 52,
    y: 28,
    labelKey: 'nsi.dashboard.relations.nodes.components.label',
    tooltipKey: 'nsi.dashboard.relations.nodes.components.tooltip',
  },
  {
    id: 'params',
    x: 74,
    y: 18,
    labelKey: 'nsi.dashboard.relations.nodes.params.label',
    tooltipKey: 'nsi.dashboard.relations.nodes.params.tooltip',
  },
  {
    id: 'defects',
    x: 74,
    y: 44,
    labelKey: 'nsi.dashboard.relations.nodes.defects.label',
    tooltipKey: 'nsi.dashboard.relations.nodes.defects.tooltip',
  },
  {
    id: 'works',
    x: 48,
    y: 70,
    labelKey: 'nsi.dashboard.relations.nodes.works.label',
    tooltipKey: 'nsi.dashboard.relations.nodes.works.tooltip',
  },
] as const

const nodeMap = computed(() => {
  const result = new Map<string, { x: number; y: number; label: string; tooltip: string; count: number }>()
  for (const node of rawNodes) {
    const label = t(node.labelKey)
    const tooltip = t(node.tooltipKey)
    const countKey = node.id as keyof RelationsCounts
    const count = props.counts?.[countKey] ?? 0
    result.set(node.id, { x: node.x, y: node.y, label, tooltip, count })
  }
  return result
})

const nodes = computed(() =>
  Array.from(nodeMap.value.entries()).map(([id, meta]) => ({
    id: id as keyof RelationsCounts,
    label: meta.label,
    tooltip: meta.tooltip,
    count: meta.count,
    style: {
      left: `${meta.x}%`,
      top: `${meta.y}%`,
    },
  })),
)

const rawEdges: Array<{ id: string; from: string; to: string; tooltipKey: string }> = [
  {
    id: 'sources-works',
    from: 'sources',
    to: 'works',
    tooltipKey: 'nsi.dashboard.relations.edges.sourcesWorks',
  },
  {
    id: 'types-components',
    from: 'types',
    to: 'components',
    tooltipKey: 'nsi.dashboard.relations.edges.typesComponents',
  },
  {
    id: 'components-params',
    from: 'components',
    to: 'params',
    tooltipKey: 'nsi.dashboard.relations.edges.componentsParams',
  },
  {
    id: 'components-defects',
    from: 'components',
    to: 'defects',
    tooltipKey: 'nsi.dashboard.relations.edges.componentsDefects',
  },
  {
    id: 'works-types',
    from: 'works',
    to: 'types',
    tooltipKey: 'nsi.dashboard.relations.edges.worksType',
  },
]

const edges = computed(() => {
  return rawEdges
    .map((edge) => {
      const start = nodeMap.value.get(edge.from)
      const end = nodeMap.value.get(edge.to)
      if (!start || !end) return null
      const x1 = (start.x / 100) * viewBoxWidth
      const y1 = (start.y / 100) * viewBoxHeight
      const x2 = (end.x / 100) * viewBoxWidth
      const y2 = (end.y / 100) * viewBoxHeight
      return { id: edge.id, x1, y1, x2, y2, tooltip: t(edge.tooltipKey) }
    })
    .filter((edge): edge is NonNullable<typeof edge> => Boolean(edge))
})

const loading = computed(() => Boolean(props.loading))

function handleNodeClick(id: keyof RelationsCounts) {
  emit('select-node', id)
}
</script>

<style scoped>
.relations-map {
  display: flex;
  flex-direction: column;
  gap: var(--s360-space-md);
  padding: var(--s360-space-xl);
  background: var(--s360-color-elevated);
  border-radius: var(--s360-radius-lg);
  box-shadow: var(--s360-shadow-lg);
  position: relative;
  min-height: 280px;
}

.relations-map__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s360-space-md);
}

.relations-map__heading {
  display: flex;
  align-items: center;
  gap: var(--s360-space-sm);
}

.relations-map__title {
  margin: 0;
  font-size: var(--s360-font-title-md);
  font-weight: 600;
}

.relations-map__status {
  display: inline-flex;
  align-items: center;
  padding: 0 var(--s360-space-sm);
  border-radius: var(--s360-radius);
  background: var(--s360-color-warning-soft);
  color: var(--s360-text-warning);
  font-size: var(--s360-font-caption);
  font-weight: 600;
  line-height: 1.6;
}

.relations-map__help {
  font-size: var(--s360-font-caption);
  border-radius: 20px;
  padding: var(--s360-space-xs) var(--s360-space-sm);
}

.relations-map__help-content {
  max-width: 260px;
  display: flex;
  flex-direction: column;
  gap: var(--s360-space-sm);
  font-size: var(--s360-font-caption);
}

.relations-map__help-title {
  margin: 0;
  font-weight: 600;
}

.relations-map__canvas {
  position: relative;
  min-height: 240px;
}

.relations-map__edges {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.relations-map__edge {
  stroke: var(--s360-color-primary-soft);
  stroke-width: 3;
  stroke-linecap: round;
}

.relations-map__node {
  position: absolute;
  transform: translate(-50%, -50%);
}

.relations-map__node-btn {
  display: flex;
  flex-direction: column;
  gap: var(--s360-space-xs);
  align-items: center;
  justify-content: center;
  padding: var(--s360-space-md) var(--s360-space-lg);
  border-radius: var(--s360-radius-lg);
  border: 1px solid var(--s360-color-border-subtle);
  min-width: 140px;
  background: var(--s360-color-neutral-soft);
  color: inherit;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  box-shadow: 0 4px 12px rgba(21, 46, 110, 0.12);
}

.relations-map__node-btn:hover,
.relations-map__node-btn:focus {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(21, 46, 110, 0.2);
  border-color: var(--s360-color-primary);
}

.relations-map__node-label {
  font-weight: 600;
}

.relations-map__node-count {
  font-size: var(--s360-font-caption);
  color: var(--s360-text-muted);
}

.relations-map__overlay {
  position: absolute;
  inset: 0;
  backdrop-filter: blur(2px);
  background: var(--s360-overlay-veil);
  border-radius: var(--s360-radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 768px) {
  .relations-map {
    padding: var(--s360-space-lg);
  }

  .relations-map__node-btn {
    min-width: 120px;
    padding: var(--s360-space-sm) var(--s360-space-md);
  }
}
</style>
