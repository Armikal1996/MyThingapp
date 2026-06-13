<template>
  <div class="app">
    <!-- Start screen -->
    <StartScreen
      v-if="view === 'start'"
      @select="onNarrationSelected"
    />

    <!-- Explorer view -->
    <div v-else class="explorer">
      <nav class="top-nav">
        <button class="back-btn" @click="goBack">← Back</button>
        <span class="nav-title">{{ narrationMeta?.title }}</span>
      </nav>

      <div class="explorer-body" :class="{ 'panel-open': !!selectedNode }">
        <GraphCanvas
          :narration="narrationMeta"
          :all-nodes="allNodes"
          :visible-node-ids="visibleNodeIds"
          :visible-edges="visibleEdges"
          :cross-link-nodes="crossLinkNodes"
          :loading="loading"
          :error="error"
          :is-expanded="isExpanded"
          :is-visited="isVisited"
          :is-leaf="isLeaf"
          class="canvas-area"
          @nodeSelected="onNodeSelected"
        />

        <DetailPanel
          :node="selectedNode"
          @close="selectedNode = null"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import StartScreen from '@/components/StartScreen.vue'
import GraphCanvas from '@/components/GraphCanvas.vue'
import DetailPanel from '@/components/DetailPanel.vue'
import { useNarration } from '@/composables/useNarration.js'

const view = ref('start')
const selectedNode = ref(null)

const {
  narrationMeta,
  allNodes,
  loading,
  error,
  visibleNodeIds,
  visibleEdges,
  crossLinkNodes,
  expandNode,
  visitNode,
  isLeaf,
  isExpanded,
  isVisited,
  loadNarration
} = useNarration()

async function onNarrationSelected(slug) {
  selectedNode.value = null
  await loadNarration(slug)
  view.value = 'explore'
}

function onNodeSelected(node) {
  visitNode(node.id)

  // Expand node if it hasn't been expanded yet (and it's not a leaf)
  if (!isLeaf(node.id) && !isExpanded(node.id)) {
    expandNode(node.id)
  }

  selectedNode.value = node
}

function goBack() {
  view.value = 'start'
  selectedNode.value = null
}
</script>

<style>
/* Global reset and base */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
  background: #0a0e1a;
  color: #e2e8f0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}

#app {
  height: 100vh;
  overflow: hidden;
}
</style>

<style scoped>
.app {
  height: 100vh;
  overflow: hidden;
}

/* Explorer layout */
.explorer {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.top-nav {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  background: #0d1420;
  border-bottom: 1px solid #1e293b;
  flex-shrink: 0;
  z-index: 30;
}

.back-btn {
  background: transparent;
  border: 1px solid #1e293b;
  color: #94a3b8;
  font-size: 13px;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.back-btn:hover {
  background: #1e293b;
  color: #e2e8f0;
}

.nav-title {
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.explorer-body {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.canvas-area {
  position: absolute;
  inset: 0;
  transition: right 0.25s ease;
}

/* Shrink canvas when panel is open */
.explorer-body.panel-open .canvas-area {
  right: 340px;
}
</style>
