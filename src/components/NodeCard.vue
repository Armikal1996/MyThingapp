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
      { 'is-answered': data.isAnswered },
      { 'is-correct': data.guessedCorrect },
      { 'has-prediction': nodeData.prediction && !data.researchMode },
    ]"
  >
    <Handle type="target" :position="Position.Top" class="handle handle-target" />

    <div class="node-inner">
      <div class="node-header">
        <span class="fact-badge">{{ factualityLabel }}</span>
        <div class="header-actions">
          <button
            v-if="data.isExpanded && !data.isLeaf"
            class="collapse-btn"
            title="Close this branch"
            @click.stop="data.onCollapseBranch?.()"
          >
            −
          </button>
          <span v-if="data.isVisited" class="visited-mark" title="Visited">✓</span>
        </div>
      </div>

      <div class="node-title">{{ nodeData.title }}</div>

      <!-- Expand hint — only for non-leaf, non-expanded nodes -->
      <div v-if="!data.isLeaf && !data.isExpanded" class="expand-hint">
        <span v-if="nodeData.prediction && !data.researchMode" class="guess-label">Guess to open</span>
        <template v-else>
          <span class="expand-dot" /><span class="expand-dot" /><span class="expand-dot" />
        </template>
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
  border: 2px solid var(--node-border, var(--theme-node-border, #4b5563));
  background: var(--node-bg, var(--theme-node, #1a2235));
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
  --node-border: var(--theme-accent, #f59e0b);
  --node-bg: color-mix(in srgb, var(--theme-accent) 15%, #0f172a);
  min-width: 210px;
  max-width: 230px;
  border-width: 2.5px;
  box-shadow: 0 0 18px rgba(245, 158, 11, 0.25);
}

.node-card.type-consequence {
  --node-border: var(--theme-accent-2, #f97316);
  --node-bg: color-mix(in srgb, var(--theme-accent-2) 14%, #0f172a);
}

.node-card.type-simple {
  --node-border: color-mix(in srgb, var(--theme-accent) 58%, #3b82f6);
  --node-bg: color-mix(in srgb, var(--theme-accent) 8%, #0f172a);
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

.node-card.has-prediction:not(.is-answered) {
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--theme-accent) 45%, transparent), 0 0 24px color-mix(in srgb, var(--theme-accent) 16%, transparent);
}

.node-card.is-correct {
  box-shadow: 0 0 0 1px rgba(34,197,94,0.45), 0 0 24px rgba(34,197,94,0.2);
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.collapse-btn {
  width: 20px;
  height: 20px;
  padding: 0;
  border: 1px solid #475569;
  border-radius: 4px;
  background: #1e293b;
  color: #94a3b8;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.collapse-btn:hover {
  background: #334155;
  color: #e2e8f0;
  border-color: #64748b;
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

.guess-label {
  border: 1px solid color-mix(in srgb, var(--theme-accent) 55%, #334155);
  border-radius: 999px;
  padding: 2px 7px;
  color: var(--theme-accent);
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.06em;
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
