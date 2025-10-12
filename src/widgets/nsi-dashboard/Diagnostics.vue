<template>
  <section class="nsi-diagnostics">
    <header class="nsi-diagnostics__header">
      <div>
        <h2 class="nsi-diagnostics__title">{{ title }}</h2>
        <p class="nsi-diagnostics__description">{{ description }}</p>
      </div>
    </header>

    <div v-if="loading" class="nsi-diagnostics__loading">
      <NSpin size="small" />
    </div>

    <ul v-else class="nsi-diagnostics__list">
      <li v-if="!items.length" class="nsi-diagnostics__empty">{{ emptyText }}</li>
      <li
        v-for="item in items"
        :key="item.code"
        class="nsi-diagnostics__item"
      >
        <span class="nsi-diagnostics__severity" :class="severityClass(item.severity)">
          {{ severityLabel(item.severity) }}
        </span>
        <button type="button" class="nsi-diagnostics__content" @click="emitSelect(item)">
          <span class="nsi-diagnostics__name">{{ item.title }}</span>
          <span class="nsi-diagnostics__count">{{ item.count }}</span>
        </button>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NSpin } from 'naive-ui'

import type { DiagnosticItem, DiagnosticSeverity } from '@/services/nsiDashboard.api'

const props = defineProps<{
  title: string
  description: string
  emptyText: string
  loading?: boolean
  items: DiagnosticItem[]
  severityLabels: Record<DiagnosticSeverity, string>
}>()

const emit = defineEmits<{ (e: 'select', item: DiagnosticItem): void }>()

const loading = computed(() => Boolean(props.loading))

function severityClass(severity: DiagnosticSeverity) {
  return `is-${severity}`
}

function severityLabel(severity: DiagnosticSeverity) {
  return props.severityLabels[severity]
}

function emitSelect(item: DiagnosticItem) {
  emit('select', item)
}
</script>

<style scoped>
.nsi-diagnostics {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  border-radius: 16px;
  background: var(--n-color);
  box-shadow: var(--n-box-shadow);
}

.nsi-diagnostics__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.nsi-diagnostics__description {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--n-text-color-2);
}

.nsi-diagnostics__loading {
  display: flex;
  justify-content: center;
  padding: 24px 0;
}

.nsi-diagnostics__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nsi-diagnostics__item {
  display: flex;
  gap: 12px;
  align-items: stretch;
}

.nsi-diagnostics__severity {
  min-width: 80px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.nsi-diagnostics__severity.is-info {
  background: rgba(64, 128, 255, 0.1);
  color: var(--n-primary-color);
}

.nsi-diagnostics__severity.is-warning {
  background: rgba(250, 173, 20, 0.12);
  color: #c99700;
}

.nsi-diagnostics__severity.is-critical {
  background: rgba(255, 77, 79, 0.12);
  color: #d03050;
}

.nsi-diagnostics__content {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  border: none;
  background: rgba(64, 128, 255, 0.06);
  border-radius: 12px;
  padding: 10px 14px;
  cursor: pointer;
  text-align: left;
  color: inherit;
}

.nsi-diagnostics__content:hover,
.nsi-diagnostics__content:focus {
  background: rgba(64, 128, 255, 0.12);
}

.nsi-diagnostics__name {
  font-weight: 500;
}

.nsi-diagnostics__count {
  font-weight: 600;
}

.nsi-diagnostics__empty {
  padding: 16px;
  text-align: center;
  color: var(--n-text-color-2);
  font-size: 14px;
  border-radius: 12px;
  background: rgba(64, 128, 255, 0.05);
}
</style>
