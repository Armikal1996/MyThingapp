<template>
  <div
    class="node-card"
    :class="[
      `type-${nodeData.type}`,
      `fact-${nodeData.factuality}`,
      { 'is-root': nodeData.type === 'root' },
      { 'is-expanded': data.isExpanded },
      { 'is-visited': data.isVisited },
      { 'is-leaf': data.isLeaf },
    ]"
  >
    <Handle type="target" :position="Position.Top" class="handle handle-target" />

    <div class="node-inner">
      <div class="node-header">
        <span class="fact-badge">{{ factualityLabel }}</span>
        <span v-if="data.isVisited" class="visited-mark" title="Visited">✓</span>
      </div>

      <div class="node-title">{{ nodeData.title }}</div>

      <!-- Expand hint — only for non-leaf, non-expanded nodes -->
      <div v-if="!data.isLeaf && !data.isExpanded" class="expand-hint">
        <span class="expand-dot" /><span class="expand-dot" /><span class="expand-dot" />
      </div>
    </div>

    <Handle type="source" :position="Position.Bottom" class="handle handle-source" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'

const props = defineProps({
  data: {
    type: Object,
    required: true
  }
})

const nodeData = computed(() => props.data.nodeData || {})

const factualityLabel = computed(() => {
  const map = { historical: 'Historical', speculative: 'Speculative', alternate: 'Alternate' }
  return map[nodeData.value.factuality] || nodeData.value.factuality
})
</script>

<style scoped>
.node-card {
  border-radius: 10px;
  border: 2px solid var(--node-border, #4b5563);
  background: var(--node-bg, #1a2235);
  color: #e2e8f0;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
  min-width: 180px;
  max-width: 200px;
  padding: 0;
  box-shadow: 0 2px 12px rgba(0,0,0,0.4);
  position: relative;
}

.node-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(0,0,0,0.6);
}

/* ── Type variants ── */
.node-card.type-root {
  --node-border: #f59e0b;
  --node-bg: #1c1a0d;
  min-width: 210px;
  max-width: 230px;
  border-width: 2.5px;
  box-shadow: 0 0 18px rgba(245, 158, 11, 0.25);
}

.node-card.type-consequence {
  --node-border: #f97316;
  --node-bg: #1c110a;
}

.node-card.type-simple {
  --node-border: #3b82f6;
  --node-bg: #0f1829;
}

/* ── Factuality ring ── */
.node-card.fact-historical { border-left: 4px solid #22c55e; }
.node-card.fact-speculative { border-left: 4px solid #60a5fa; }
.node-card.fact-alternate { border-left: 4px solid #a78bfa; }

/* ── Visited state ── */
.node-card.is-visited {
  opacity: 0.75;
}
.node-card.is-visited .node-title {
  color: #94a3b8;
}

/* ── Leaf — subtle dim, no cursor change ── */
.node-card.is-leaf {
  border-style: dashed;
}

/* ── Inner layout ── */
.node-inner {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.node-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.fact-badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 4px;
}

.fact-historical .fact-badge { background: #14532d; color: #86efac; }
.fact-speculative .fact-badge { background: #1e3a5f; color: #93c5fd; }
.fact-alternate .fact-badge   { background: #2e1065; color: #c4b5fd; }

.visited-mark {
  font-size: 11px;
  color: #6b7280;
}

.node-title {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  color: #e2e8f0;
}

.type-root .node-title {
  font-size: 14px;
  font-weight: 700;
  color: #fde68a;
}

/* Expand dots hint */
.expand-hint {
  display: flex;
  gap: 4px;
  justify-content: center;
  padding-top: 2px;
}
.expand-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #4b5563;
}

/* Vue Flow handles */
.handle {
  width: 8px;
  height: 8px;
  background: #374151;
  border: 2px solid #6b7280;
}
.handle-target { top: -5px; }
.handle-source { bottom: -5px; }
</style>
