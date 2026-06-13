<template>
  <div class="legend">
    <button class="legend-toggle" @click="open = !open" title="Toggle legend">
      <span>Legend</span>
      <span class="chevron" :class="{ open }">›</span>
    </button>

    <Transition name="legend-expand">
      <div v-if="open" class="legend-body">

        <div class="legend-group">
          <div class="legend-group-label">Node Type</div>
          <div class="legend-row">
            <span class="swatch swatch-root" />
            <span>Root / Starting point</span>
          </div>
          <div class="legend-row">
            <span class="swatch swatch-simple" />
            <span>Event</span>
          </div>
          <div class="legend-row">
            <span class="swatch swatch-consequence" />
            <span>Consequence</span>
          </div>
          <div class="legend-row">
            <span class="swatch swatch-crosslink" />
            <span>Cross-narration (coming soon)</span>
          </div>
        </div>

        <div class="legend-group">
          <div class="legend-group-label">Factuality</div>
          <div class="legend-row">
            <span class="fact-dot fact-historical" />
            <span>Historical</span>
          </div>
          <div class="legend-row">
            <span class="fact-dot fact-speculative" />
            <span>Speculative</span>
          </div>
          <div class="legend-row">
            <span class="fact-dot fact-alternate" />
            <span>Alternate history</span>
          </div>
        </div>

        <div class="legend-group">
          <div class="legend-group-label">Edge / Connection</div>
          <div class="legend-row">
            <span class="edge-sample edge-causal" />
            <span>Causal</span>
          </div>
          <div class="legend-row">
            <span class="edge-sample edge-consequence" />
            <span>Consequence</span>
          </div>
          <div class="legend-row">
            <span class="edge-sample edge-cross" />
            <span>Cross-narration</span>
          </div>
        </div>

        <div class="legend-group">
          <div class="legend-group-label">Interaction</div>
          <div class="legend-row small">
            <span class="dot-hint" /><span class="dot-hint" /><span class="dot-hint" />
            <span style="margin-left:6px">Click to expand</span>
          </div>
          <div class="legend-row small">
            <span class="visited-check">✓</span>
            <span>Already visited</span>
          </div>
        </div>

      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const open = ref(false)
</script>

<style scoped>
.legend {
  background: rgba(10, 14, 26, 0.92);
  border: 1px solid #1e293b;
  border-radius: 10px;
  backdrop-filter: blur(8px);
  min-width: 200px;
  overflow: hidden;
}

.legend-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 14px;
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  cursor: pointer;
  gap: 8px;
}
.legend-toggle:hover { color: #e2e8f0; }

.chevron {
  font-size: 16px;
  display: inline-block;
  transition: transform 0.2s;
  transform: rotate(90deg);
}
.chevron.open { transform: rotate(-90deg); }

.legend-body {
  padding: 4px 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.legend-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.legend-group-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: #475569;
  margin-bottom: 2px;
}
.legend-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #94a3b8;
}
.legend-row.small { font-size: 11px; }

/* Node swatches */
.swatch {
  width: 22px;
  height: 14px;
  border-radius: 3px;
  border: 2px solid transparent;
  flex-shrink: 0;
}
.swatch-root       { background: #1c1a0d; border-color: #f59e0b; }
.swatch-simple     { background: #0f1829; border-color: #3b82f6; }
.swatch-consequence { background: #1c110a; border-color: #f97316; }
.swatch-crosslink  { background: #1a0f2e; border-color: #8b5cf6; border-style: dashed; }

/* Factuality dots */
.fact-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.fact-historical { background: #22c55e; }
.fact-speculative { background: #60a5fa; }
.fact-alternate   { background: #a78bfa; }

/* Edge samples */
.edge-sample {
  width: 30px;
  height: 2px;
  flex-shrink: 0;
}
.edge-causal     { background: #6b7280; }
.edge-consequence {
  background: #f97316;
  background-image: repeating-linear-gradient(
    90deg, #f97316 0, #f97316 4px, transparent 4px, transparent 7px
  );
}
.edge-cross {
  background: #8b5cf6;
  background-image: repeating-linear-gradient(
    90deg, #8b5cf6 0, #8b5cf6 6px, transparent 6px, transparent 10px
  );
}

/* Expand hint dots */
.dot-hint {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #4b5563;
}

.visited-check {
  font-size: 11px;
  color: #6b7280;
  min-width: 14px;
}

/* Transition */
.legend-expand-enter-active,
.legend-expand-leave-active {
  transition: max-height 0.2s ease, opacity 0.15s ease;
  max-height: 400px;
  overflow: hidden;
}
.legend-expand-enter-from,
.legend-expand-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
