<template>
  <div class="canvas-wrapper">
    <VueFlow
      v-if="!loading && !error"
      :nodes="flowNodes"
      :edges="flowEdges"
      :node-types="nodeTypes"
      :default-viewport="{ zoom: 1 }"
      :min-zoom="0.2"
      :max-zoom="2.5"
      fit-view-on-init
      class="vue-flow-canvas"
      @nodeClick="onNodeClick"
    >
      <Background :gap="28" :size="1" pattern-color="#1e2a3a" />
      <Controls position="bottom-right" />
    </VueFlow>

    <div v-if="loading" class="canvas-state">
      <div class="spinner" />
      <span>Loading narration…</span>
    </div>
    <div v-if="error" class="canvas-state canvas-error">{{ error }}</div>

    <Legend class="legend-overlay" />
  </div>
</template>

<script setup>
import { computed, watch, shallowRef, markRaw } from 'vue'
import { VueFlow, MarkerType } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'

import NodeCard from './NodeCard.vue'
import CrossLinkNode from './CrossLinkNode.vue'
import Legend from './Legend.vue'
import { computeLayout } from '@/composables/useGraphLayout.js'

const props = defineProps({
  narration: { type: Object, default: null },
  allNodes: { type: Object, default: () => ({}) },
  visibleNodeIds: { type: Object, default: () => new Set() },
  visibleEdges: { type: Array, default: () => [] },
  crossLinkNodes: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: null },
  isExpanded: { type: Function, required: true },
  isVisited: { type: Function, required: true },
  isLeaf: { type: Function, required: true }
})

const emit = defineEmits(['nodeSelected'])

// Register custom node types (use markRaw to avoid Vue reactivity on component def)
const nodeTypes = {
  historyNode: markRaw(NodeCard),
  crossLinkNode: markRaw(CrossLinkNode)
}

// Build Vue Flow node objects from visible in-narration nodes
const rawFlowNodes = computed(() => {
  const nodes = []

  for (const id of props.visibleNodeIds) {
    const node = props.allNodes[id]
    if (!node) continue
    nodes.push({
      id,
      type: 'historyNode',
      position: { x: 0, y: 0 },   // dagre will overwrite
      data: {
        nodeData: node,
        isRoot: node.type === 'root',
        isExpanded: props.isExpanded(id),
        isVisited: props.isVisited(id),
        isLeaf: props.isLeaf(id),
        positionHint: node.position ?? null
      }
    })
  }

  // Add ghost nodes for cross-links
  for (const ghost of props.crossLinkNodes) {
    nodes.push({
      id: ghost.id,
      type: 'crossLinkNode',
      position: { x: 0, y: 0 },
      data: {
        isCrossLink: true,
        label: ghost.label,
        targetNodeId: ghost.targetNodeId
      }
    })
  }

  return nodes
})

// Build Vue Flow edge objects
const rawFlowEdges = computed(() => {
  return props.visibleEdges.map(e => {
    const isCross = e.edgeType === 'cross-narration'
    const isConsequence = e.edgeType === 'consequence'

    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'smoothstep',
      animated: isCross,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isCross ? '#8b5cf6' : isConsequence ? '#f97316' : '#6b7280'
      },
      style: {
        stroke: isCross ? '#8b5cf6' : isConsequence ? '#f97316' : '#6b7280',
        strokeWidth: isCross ? 1.5 : 2,
        strokeDasharray: isCross ? '6 4' : isConsequence ? '4 3' : 'none'
      },
      label: e.edgeType,
      labelStyle: { fill: '#6b7280', fontSize: 10 },
      labelBgStyle: { fill: 'transparent' }
    }
  })
})

// Apply dagre layout every time the raw nodes/edges change
const flowNodes = shallowRef([])
const flowEdges = shallowRef([])

watch(
  [rawFlowNodes, rawFlowEdges],
  ([nodes, edges]) => {
    flowNodes.value = computeLayout(nodes, edges)
    flowEdges.value = edges
  },
  { immediate: true, deep: false }
)

function onNodeClick({ node }) {
  // Cross-link ghost nodes are not interactive
  if (node.data?.isCrossLink) return

  const histNode = props.allNodes[node.id]
  if (histNode) emit('nodeSelected', histNode)
}
</script>

<style scoped>
.canvas-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  background: #0a0e1a;
}

.vue-flow-canvas {
  width: 100%;
  height: 100%;
}

.canvas-state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  gap: 16px;
  font-size: 14px;
}

.canvas-error {
  color: #f87171;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #1e2a3a;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.legend-overlay {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
}

</style>
