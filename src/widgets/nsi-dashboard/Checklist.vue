<template>
  <section class="nsi-checklist">
    <header class="nsi-checklist__header">
      <h2 class="nsi-checklist__title">{{ title }}</h2>
    </header>
    <ol class="nsi-checklist__list">
      <li v-for="(step, index) in steps" :key="step.id" class="nsi-checklist__item">
        <span class="nsi-checklist__index" :class="{ done: step.done }">
          <NIcon v-if="step.done" :component="CheckmarkCircleOutline" class="nsi-checklist__status" />
          <span v-else>{{ index + 1 }}</span>
        </span>
        <div class="nsi-checklist__content">
          <h3 class="nsi-checklist__name">{{ step.title }}</h3>
          <p class="nsi-checklist__description">{{ step.description }}</p>
          <div class="nsi-checklist__actions">
            <NButton text size="small" class="nsi-checklist__link" @click="emitSelect(step.id)">
              {{ goLabel }}
            </NButton>
            <NTooltip placement="top">
              <template #trigger>
                <button type="button" class="nsi-checklist__info" :aria-label="infoLabel">
                  <NIcon :component="InformationCircleOutline" />
                </button>
              </template>
              <span>{{ step.info }}</span>
            </NTooltip>
          </div>
        </div>
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
import { NButton, NIcon, NTooltip } from 'naive-ui'
import { CheckmarkCircleOutline, InformationCircleOutline } from '@vicons/ionicons5'

const props = defineProps<{
  title: string
  steps: Array<{
    id: string
    title: string
    description: string
    info: string
    done: boolean
  }>
  goLabel: string
  infoLabel: string
}>()

const emit = defineEmits<{
  (e: 'select', id: string): void
}>()

function emitSelect(id: string) {
  emit('select', id)
}
</script>

<style scoped>
.nsi-checklist {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  border-radius: 16px;
  background: var(--n-color);
  box-shadow: var(--n-box-shadow);
}

.nsi-checklist__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.nsi-checklist__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.nsi-checklist__item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.nsi-checklist__index {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(64, 128, 255, 0.1);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: var(--n-primary-color);
}

.nsi-checklist__index.done {
  background: rgba(24, 160, 88, 0.1);
  color: var(--n-success-color);
}

.nsi-checklist__status {
  font-size: 20px;
}

.nsi-checklist__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.nsi-checklist__name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.nsi-checklist__description {
  margin: 0;
  color: var(--n-text-color-2);
  font-size: 13px;
}

.nsi-checklist__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nsi-checklist__link {
  padding: 0;
  height: auto;
}

.nsi-checklist__info {
  background: none;
  border: none;
  padding: 0;
  color: var(--n-text-color-2);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
}

.nsi-checklist__info:hover,
.nsi-checklist__info:focus {
  background: rgba(64, 128, 255, 0.1);
  color: var(--n-primary-color);
}
</style>
