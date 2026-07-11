<template>
  <div class="empty-state" :class="variant">
    <div v-if="icon" class="icon">{{ icon }}</div>
    <h3 v-if="title">{{ title }}</h3>
    <p v-if="description">{{ description }}</p>
    <div v-if="$slots.action" class="action">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  variant: { type: String, default: 'illustrated' }, // illustrated | inline
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  icon: { type: String, default: '' }
})
</script>

<style scoped>
.empty-state.illustrated {
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-xl);
  padding: var(--space-8) var(--space-6);
  text-align: center;
  background: rgba(15, 23, 42, 0.4);
}

.empty-state.inline {
  padding: var(--space-4) 0;
  color: var(--text-faint);
  font-size: var(--text-small);
}

.empty-state h3 {
  font-size: var(--text-heading);
  font-weight: 600;
  margin-bottom: var(--space-2);
}

.empty-state p {
  color: var(--text-muted);
  font-size: var(--text-small);
  line-height: 1.5;
  max-width: 360px;
  margin: 0 auto;
}

.empty-state .icon {
  font-size: 32px;
  margin-bottom: var(--space-3);
  opacity: 0.6;
}

.empty-state .action {
  margin-top: var(--space-4);
}
</style>
