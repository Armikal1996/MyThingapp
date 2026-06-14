<template>
  <div class="crosslink-node">
    <Handle type="target" :position="Position.Top" class="handle" />
    <div class="crosslink-inner">
      <span class="crosslink-badge">Coming Soon</span>
      <div class="crosslink-label">{{ data.label }}</div>
    </div>
  </div>
</template>

<script setup>
import { Handle, Position } from '@vue-flow/core'

defineProps({
  data: { type: Object, required: true }
})
</script>

<style scoped>
.crosslink-node {
  border: 2px dashed #8b5cf6;
  border-radius: 10px;
  background: #1a0f2e;
  color: #c4b5fd;
  min-width: 160px;
  max-width: 180px;
  opacity: 0.75;
  cursor: default;
}
.crosslink-inner {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.crosslink-badge {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  background: #2e1065;
  color: #c4b5fd;
  padding: 2px 6px;
  border-radius: 4px;
  align-self: flex-start;
}
.crosslink-label {
  font-size: 12px;
  line-height: 1.4;
  color: #a78bfa;
  font-style: italic;
}
.handle {
  width: 8px;
  height: 8px;
  background: #4c1d95;
  border: 2px solid #8b5cf6;
}
</style>
