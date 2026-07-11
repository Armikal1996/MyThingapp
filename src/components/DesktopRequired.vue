<template>
  <div class="desktop-wrap">
    <div v-if="!isDesktop && soft" class="soft-warning">
      <Monitor :size="16" />
      <span>{{ message }}</span>
    </div>
    <div v-if="!isDesktop && !soft" class="desktop-required">
      <Monitor :size="28" class="icon" />
      <h2>Desktop app required</h2>
      <p>{{ message }}</p>
      <p class="hint">
        Double-click <code>Launch-MyThing.exe</code> or run <code>npm run tauri:build</code> once.
      </p>
    </div>
    <slot v-if="isDesktop || soft" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Monitor } from 'lucide-vue-next'
import { isTauri } from '@/services/platform.js'

defineProps({
  message: {
    type: String,
    default: 'This module needs the MyThing desktop app for SQLite, notifications, and process access.'
  },
  soft: { type: Boolean, default: false }
})

const isDesktop = computed(() => isTauri())
</script>

<style scoped>
.desktop-required {
  margin: var(--space-6);
  padding: var(--space-6);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  background: var(--surface-raised);
  max-width: 520px;
  text-align: center;
}

.desktop-required .icon {
  color: var(--text-faint);
  margin-bottom: var(--space-3);
}

.desktop-required h2 {
  margin-bottom: var(--space-2);
  font-size: var(--text-heading);
}

.desktop-required p {
  color: var(--text-muted);
  line-height: 1.5;
}

.hint {
  margin-top: var(--space-3);
  font-size: var(--text-small);
}

.soft-warning {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-4);
  background: var(--status-warning-bg);
  border: 1px solid rgba(251, 191, 36, 0.3);
  border-radius: var(--radius-md);
  color: var(--status-warning);
  font-size: var(--text-small);
}
</style>
