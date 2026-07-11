<template>
  <span class="base-badge" :class="[variant, size]">
    <slot />
  </span>
</template>

<script setup>
defineProps({
  variant: { type: String, default: 'default' }, // default | primary | danger | success
  size: { type: String, default: 'sm' }
})
</script>

<style scoped>
.base-badge {
  display: inline-flex;
  align-items: center;
  border-radius: var(--radius-pill);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.base-badge.sm {
  font-size: 10px;
  padding: 2px 8px;
}

.base-badge.default {
  background: var(--surface-overlay);
  color: var(--text-muted);
  border: 1px solid var(--border-strong);
}

.base-badge.primary {
  background: var(--accent-primary);
  color: #fff;
}

.base-badge.danger {
  background: #dc2626;
  color: #fff;
}

.base-badge.success {
  background: var(--status-success-bg);
  color: var(--status-success);
  border: 1px solid rgba(34, 197, 94, 0.3);
}
</style>
