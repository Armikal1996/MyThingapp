<template>
  <div v-if="!isDesktop" class="desktop-required">
    <h2>Desktop app required</h2>
    <p>{{ message }}</p>
    <p class="hint">Double-click <code>Launch-MyThing.exe</code> (uses built desktop app) or run <code>npm run tauri:build</code> once if you see this in the launcher.</p>
  </div>
  <slot v-else />
</template>

<script setup>
import { computed } from 'vue'
import { isTauri } from '@/services/platform.js'

defineProps({
  message: {
    type: String,
    default: 'This module needs the MyThing desktop app for SQLite, notifications, and process access.'
  }
})

const isDesktop = computed(() => isTauri())
</script>

<style scoped>
.desktop-required {
  margin: 24px;
  padding: 24px;
  border: 1px solid #334155;
  border-radius: 12px;
  background: #111827;
  max-width: 520px;
}

.desktop-required h2 {
  margin-bottom: 8px;
}

.desktop-required p {
  color: #94a3b8;
  line-height: 1.5;
}

.hint {
  margin-top: 12px;
  font-size: 13px;
}

code {
  background: #1e293b;
  padding: 2px 6px;
  border-radius: 4px;
}
</style>
