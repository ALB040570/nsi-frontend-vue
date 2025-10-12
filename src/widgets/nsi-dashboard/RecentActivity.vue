<template>
  <section class="nsi-activity">
    <header class="nsi-activity__header">
      <h2 class="nsi-activity__title">{{ title }}</h2>
    </header>

    <ul class="nsi-activity__list">
      <li v-if="!items.length" class="nsi-activity__empty">{{ emptyText }}</li>
      <li v-for="item in items" :key="item.id" class="nsi-activity__item">
        <button type="button" class="nsi-activity__button" @click="emitSelect(item)">
          <span class="nsi-activity__primary">{{ item.title }}</span>
          <span class="nsi-activity__meta">
            <strong>{{ item.actor }}</strong>
            <span>{{ formatTime(item.ts) }}</span>
          </span>
        </button>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import type { ActivityItem } from '@/services/nsiDashboard.api'

const props = defineProps<{
  title: string
  emptyText: string
  items: ActivityItem[]
}>()

const emit = defineEmits<{ (e: 'select', item: ActivityItem): void }>()

const formatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return formatter.format(date)
}

function emitSelect(item: ActivityItem) {
  emit('select', item)
}
</script>

<style scoped>
.nsi-activity {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  background: var(--n-color);
  border-radius: 16px;
  box-shadow: var(--n-box-shadow);
}

.nsi-activity__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.nsi-activity__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nsi-activity__item {
  display: flex;
}

.nsi-activity__button {
  border: none;
  background: rgba(64, 128, 255, 0.06);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
  cursor: pointer;
  color: inherit;
  width: 100%;
}

.nsi-activity__button:hover,
.nsi-activity__button:focus {
  background: rgba(64, 128, 255, 0.12);
}

.nsi-activity__primary {
  font-weight: 500;
}

.nsi-activity__meta {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: var(--n-text-color-2);
}

.nsi-activity__meta strong {
  color: var(--n-text-color);
}

.nsi-activity__empty {
  padding: 16px;
  text-align: center;
  color: var(--n-text-color-2);
  background: rgba(64, 128, 255, 0.05);
  border-radius: 12px;
}
</style>
