<template>
  <Transition name="panel-slide">
    <aside v-if="node" class="detail-panel" role="complementary" aria-label="Node details">
      <button class="close-btn" @click="$emit('close')" title="Close panel">✕</button>

      <!-- Title + factuality badge -->
      <div class="panel-header">
        <span class="fact-badge" :class="`fact-${node.factuality}`">
          {{ factualityLabel }}
        </span>
        <span class="node-type-badge" :class="`ntype-${node.type}`">
          {{ typeLabelMap[node.type] || node.type }}
        </span>
      </div>

      <h2 class="panel-title">{{ node.title }}</h2>
      <p v-if="!researchMode && narrator" class="story-guide">
        {{ narrator.name }} says: read the clue, then follow the branch.
      </p>

      <section v-if="answer" class="panel-section guess-recap">
        <h3 class="section-label">Your Guess</h3>
        <div class="guess-card" :class="{ correct: answer.correct }">
          <strong>{{ answer.correct ? 'Correct prediction' : 'Brave guess' }}</strong>
          <p>{{ answer.choiceText }}</p>
          <small>{{ answer.feedback }}</small>
        </div>
      </section>

      <!-- Summary -->
      <section class="panel-section">
        <h3 class="section-label">{{ researchMode ? 'Research Notes' : 'Story Card' }}</h3>
        <ul class="summary-list">
          <li v-for="(line, i) in summaryBullets" :key="i">{{ line }}</li>
        </ul>
      </section>

      <section v-if="!researchMode && powerUp" class="panel-section power-up-section">
        <h3 class="section-label">History Power-Up</h3>
        <div class="power-up-card">
          <strong>{{ powerUp.title }}</strong>
          <p>{{ powerUp.text }}</p>
        </div>
      </section>

      <section v-if="!researchMode && isLeaf && path.length > 1" class="panel-section path-recap-section">
        <h3 class="section-label">End-of-Branch Recap</h3>
        <div class="path-recap">
          <p class="path-intro">You reached an end node. Your path was:</p>
          <ol>
            <li v-for="step in path" :key="step.id">{{ step.title }}</li>
          </ol>
          <p class="try-again">Close a branch or go back to try a different route.</p>
        </div>
      </section>

      <!-- Sources -->
      <section v-if="node.sources && node.sources.length" class="panel-section">
        <h3 class="section-label">Sources</h3>
        <ul class="sources-list">
          <li v-for="src in node.sources" :key="src.url">
            <a :href="src.url" target="_blank" rel="noopener noreferrer" class="source-link">
              {{ src.label }}
              <span class="ext-icon">↗</span>
            </a>
          </li>
        </ul>
      </section>

      <!-- Consequences collapsible -->
      <section v-if="node.consequences" class="panel-section">
        <button class="consequences-toggle" @click="consequencesOpen = !consequencesOpen">
          <span class="bang">!</span>
          Consequences
          <span class="chevron" :class="{ open: consequencesOpen }">›</span>
        </button>
        <Transition name="expand">
          <div v-if="consequencesOpen" class="consequences-body">
            {{ node.consequences }}
          </div>
        </Transition>
      </section>

      <!-- Branch controls -->
      <section v-if="isExpanded && !isLeaf" class="panel-section branch-controls">
        <button class="collapse-branch-btn" @click="$emit('collapseBranch')">
          Close this branch
        </button>
        <p class="branch-hint">Hides this node's children and any deeper open paths.</p>
      </section>

      <!-- Cross-links -->
      <section v-if="node.crossLinks && node.crossLinks.length" class="panel-section">
        <h3 class="section-label">Cross-Narration Links</h3>
        <div class="crosslinks-list">
          <div
            v-for="link in node.crossLinks"
            :key="link.targetNodeId"
            class="crosslink-card"
            title="This narration is not yet available"
          >
            <span class="crosslink-coming">Coming Soon</span>
            <div class="crosslink-text">{{ link.label }}</div>
            <div class="crosslink-id">{{ link.targetNodeId }}</div>
          </div>
        </div>
      </section>

      <!-- Node ID (dev reference) -->
      <div class="panel-footer">
        <span class="node-id-label">{{ researchMode ? `research id: ${node.id}` : `id: ${node.id}` }}</span>
      </div>
    </aside>
  </Transition>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  node: { type: Object, default: null },
  isExpanded: { type: Boolean, default: false },
  isLeaf: { type: Boolean, default: true },
  researchMode: { type: Boolean, default: false },
  answer: { type: Object, default: null },
  narrator: { type: Object, default: null },
  path: { type: Array, default: () => [] }
})

defineEmits(['close', 'collapseBranch'])

const summaryBullets = computed(() => {
  if (!props.node?.summary) return []
  const lines = props.node.summary.split('\n').map(s => s.trim()).filter(Boolean)
  return lines.length ? lines : [props.node.summary]
})

const powerUp = computed(() => {
  if (!props.node) return null
  if (props.node.powerUp) return props.node.powerUp

  const fallbacks = {
    historical: {
      title: 'Evidence Radar',
      text: 'You found a branch grounded in real sources. Watch for dates, places, and primary evidence.'
    },
    speculative: {
      title: 'Careful What-If',
      text: 'You tested a plausible historical guess. The skill is separating evidence from possibility.'
    },
    alternate: {
      title: 'Counterfactual Compass',
      text: 'You entered an alternate path. Ask what changed, what stayed the same, and what evidence still matters.'
    }
  }
  return fallbacks[props.node.factuality] || null
})

const consequencesOpen = ref(false)

// Reset consequences toggle when a different node is selected
watch(() => props.node?.id, () => {
  consequencesOpen.value = false
})

const factualityLabel = {
  historical: 'Historical',
  speculative: 'Speculative',
  alternate: 'Alternate'
}

const typeLabelMap = {
  root: 'Root',
  simple: 'Event',
  consequence: 'Consequence'
}
</script>

<style scoped>
.detail-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: 340px;
  height: 100%;
  background: var(--theme-panel);
  border-left: 1px solid color-mix(in srgb, var(--theme-accent) 25%, #1e293b);
  overflow-y: auto;
  padding: 20px 20px 40px;
  z-index: 20;
  box-shadow: -8px 0 32px rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
  gap: 0;
}

.close-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  background: transparent;
  border: none;
  color: #6b7280;
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: color 0.15s, background 0.15s;
}
.close-btn:hover {
  color: #e2e8f0;
  background: #1e293b;
}

.panel-header {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
  padding-right: 32px;
}

.fact-badge {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 5px;
}
.fact-badge.fact-historical { background: #14532d; color: #86efac; }
.fact-badge.fact-speculative { background: #1e3a5f; color: #93c5fd; }
.fact-badge.fact-alternate   { background: #2e1065; color: #c4b5fd; }

.node-type-badge {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 3px 8px;
  border-radius: 5px;
  background: #1e293b;
  color: #64748b;
}
.node-type-badge.ntype-root      { background: #1c1a0d; color: #fbbf24; }
.node-type-badge.ntype-consequence { background: #1c110a; color: #fb923c; }

.panel-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--theme-text);
  line-height: 1.3;
  margin: 0 0 10px;
}

.story-guide {
  margin: 0 0 18px;
  color: var(--theme-accent);
  font-size: 13px;
  line-height: 1.45;
}

.guess-card {
  border: 1px solid #7f1d1d;
  border-radius: 12px;
  padding: 12px;
  background: rgba(127, 29, 29, 0.2);
}

.guess-card.correct {
  border-color: #166534;
  background: rgba(20, 83, 45, 0.22);
}

.guess-card strong {
  color: #f8fafc;
  font-size: 13px;
}

.guess-card p {
  margin: 6px 0;
  color: #cbd5e1;
  font-size: 13px;
  line-height: 1.45;
}

.guess-card small {
  color: #94a3b8;
  line-height: 1.4;
}

.panel-section {
  margin-bottom: 20px;
  border-top: 1px solid #1e293b;
  padding-top: 16px;
}

.section-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--theme-muted);
  margin: 0 0 10px;
}

.summary-list {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.summary-list li {
  font-size: 14px;
  line-height: 1.65;
  color: #94a3b8;
}

.power-up-card {
  border: 1px solid color-mix(in srgb, var(--theme-accent) 52%, #334155);
  border-radius: 14px;
  padding: 12px;
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--theme-accent) 18%, transparent), transparent 55%),
    rgba(15, 23, 42, 0.62);
}

.power-up-card strong {
  color: var(--theme-accent);
  font-size: 13px;
}

.power-up-card p {
  margin: 6px 0 0;
  color: #cbd5e1;
  font-size: 13px;
  line-height: 1.5;
}

.path-recap {
  border: 1px solid color-mix(in srgb, var(--theme-accent-2) 42%, #334155);
  border-radius: 14px;
  padding: 12px;
  background: rgba(15, 23, 42, 0.48);
}

.path-intro,
.try-again {
  margin: 0;
  color: #94a3b8;
  font-size: 13px;
  line-height: 1.45;
}

.path-recap ol {
  margin: 10px 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.path-recap li {
  color: #e2e8f0;
  font-size: 13px;
  line-height: 1.35;
}

/* Sources */
.sources-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.source-link {
  font-size: 13px;
  color: var(--theme-accent-2);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: color 0.15s;
}
.source-link:hover { color: #93c5fd; text-decoration: underline; }
.ext-icon { font-size: 11px; opacity: 0.7; }

/* Consequences */
.consequences-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 7px;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 12px;
  cursor: pointer;
  width: 100%;
  transition: background 0.15s, color 0.15s;
}
.consequences-toggle:hover {
  background: #273549;
  color: #e2e8f0;
}
.bang {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #f97316;
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  flex-shrink: 0;
}
.chevron {
  margin-left: auto;
  font-size: 18px;
  display: inline-block;
  transition: transform 0.2s;
}
.chevron.open { transform: rotate(90deg); }

.consequences-body {
  margin-top: 10px;
  font-size: 13px;
  line-height: 1.65;
  color: #94a3b8;
  padding: 10px 12px;
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 6px;
}

/* Branch controls */
.branch-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.collapse-branch-btn {
  width: 100%;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 7px;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.collapse-branch-btn:hover {
  background: #273549;
  color: #e2e8f0;
}
.branch-hint {
  font-size: 11px;
  color: #475569;
  margin: 0;
  line-height: 1.4;
}

/* Cross-links */
.crosslinks-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.crosslink-card {
  border: 1px dashed #7c3aed;
  border-radius: 8px;
  padding: 10px 12px;
  background: #1a0f2e;
  cursor: default;
}
.crosslink-coming {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  background: #2e1065;
  color: #c4b5fd;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
  margin-bottom: 6px;
}
.crosslink-text {
  font-size: 13px;
  color: #a78bfa;
  font-style: italic;
  line-height: 1.4;
}
.crosslink-id {
  margin-top: 4px;
  font-size: 11px;
  color: #4c1d95;
  font-family: monospace;
}

/* Footer */
.panel-footer {
  margin-top: auto;
  padding-top: 24px;
  border-top: 1px solid #1e293b;
}
.node-id-label {
  font-size: 11px;
  color: #334155;
  font-family: monospace;
}

/* Panel slide transition */
.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: transform 0.25s ease, opacity 0.2s ease;
}
.panel-slide-enter-from,
.panel-slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

/* Consequences expand transition */
.expand-enter-active,
.expand-leave-active {
  transition: max-height 0.25s ease, opacity 0.2s ease;
  max-height: 300px;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
