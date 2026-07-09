<template>
  <div class="app" :style="activeThemeVars">
    <StartScreen
      v-if="view === 'start'"
      :research-mode="researchMode"
      @select="onNarrationSelected"
      @toggle-research-mode="setResearchMode"
    />

    <div v-else class="explorer" :data-era="activeTheme.era">
      <nav class="top-nav">
        <button class="back-btn" @click="goBack">← Back</button>
        <span class="nav-title">{{ narrationMeta?.title }}</span>

        <div class="nav-actions">
          <GameHud
            :score="state.score"
            :streak="state.streak"
            :progress-percent="progressPercent"
            :badges="badgeList"
            :research-mode="researchMode"
            :difficulty="difficulty"
            @toggle-research-mode="setResearchMode"
            @change-difficulty="setDifficulty"
          />
          <button
            v-if="hasExpandedBranches"
            class="nav-action-btn"
            title="Hide all expanded branches — roots stay visible"
            @click="onCollapseAll"
          >
            Close all branches
          </button>
        </div>
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
          :is-answered="isAnswered"
          :guessed-correct="guessedCorrect"
          :research-mode="researchMode"
          class="canvas-area"
          @nodeClicked="onNodeClicked"
          @collapseBranch="onCollapseBranch"
        />

        <NarratorBubble
          :narrator="narrationMeta?.narrator"
          :last-guess="lastGuess"
          :research-mode="researchMode"
        />

        <MissionBoard
          :missions="narrationMeta?.missions || []"
          :visible-node-ids="visibleNodeIds"
        />

        <DetailPanel
          :node="selectedNode"
          :is-expanded="selectedNode ? isExpanded(selectedNode.id) : false"
          :is-leaf="selectedNode ? isLeaf(selectedNode.id) : true"
          :research-mode="researchMode"
          :answer="selectedNode ? answerFor(selectedNode.id) : null"
          :narrator="narrationMeta?.narrator"
          :path="selectedNode ? pathToNode(selectedNode.id) : []"
          @close="closePanel"
          @collapse-branch="onCollapseBranchFromPanel"
        />

        <PredictionOverlay
          :node="pendingPredictionNode"
          :narrator="narrationMeta?.narrator"
          :difficulty="difficulty"
          @continue="onPredictionContinue"
          @cancel="cancelPrediction"
        />

        <BadgeToast
          :badge="lastBadge"
          @close="clearLastBadge"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import StartScreen from '@/components/StartScreen.vue'
import GraphCanvas from '@/components/GraphCanvas.vue'
import DetailPanel from '@/components/DetailPanel.vue'
import GameHud from '@/components/GameHud.vue'
import PredictionOverlay from '@/components/PredictionOverlay.vue'
import NarratorBubble from '@/components/NarratorBubble.vue'
import BadgeToast from '@/components/BadgeToast.vue'
import MissionBoard from '@/components/MissionBoard.vue'
import { useNarration } from '@/composables/useNarration.js'
import { useGame } from '@/composables/useGame.js'
import { useTheme } from '@/composables/useTheme.js'
import { emit as emitPluginEvent } from '@/plugins/pluginHost.js'
import { resolvePrediction, nodeWithResolvedPrediction } from '@/utils/predictionResolver.js'

const view = ref('start')
const selectedNode = ref(null)
const pendingPredictionNode = ref(null)

const {
  narrationMeta,
  allNodes,
  loading,
  error,
  hasExpandedBranches,
  visibleNodeIds,
  visibleEdges,
  crossLinkNodes,
  expandNode,
  collapseBranch,
  collapseAllBranches,
  visitNode,
  isLeaf,
  isExpanded,
  isVisited,
  isStillVisible,
  pathToNode,
  loadNarration
} = useNarration()

const {
  state,
  researchMode,
  badgeList,
  lastBadge,
  lastGuess,
  progressPercent,
  initGame,
  setResearchMode,
  setDifficulty,
  syncDiscovered,
  isAnswered,
  answerFor,
  guessedCorrect,
  recordGuess,
  difficulty,
  clearLastBadge
} = useGame()

const { activeTheme, activeThemeVars } = useTheme(narrationMeta)

watch(visibleNodeIds, ids => {
  syncDiscovered(ids.size)
}, { immediate: true })

async function onNarrationSelected(slug) {
  selectedNode.value = null
  pendingPredictionNode.value = null
  await loadNarration(slug)
  initGame(slug, Object.keys(allNodes.value).length)
  syncDiscovered(visibleNodeIds.value.size)
  view.value = 'explore'
  emitPluginEvent('view:changed', { view: 'explore', slug })
}

function onNodeClicked(node) {
  if (shouldAskPrediction(node)) {
    pendingPredictionNode.value = nodeWithResolvedPrediction(node, allNodes.value)
    return
  }

  revealNode(node)
}

function shouldAskPrediction(node) {
  return !researchMode.value &&
    Boolean(resolvePrediction(node, allNodes.value)) &&
    !isAnswered(node.id) &&
    !isLeaf(node.id) &&
    !isExpanded(node.id)
}

function onPredictionContinue(choice) {
  if (!pendingPredictionNode.value) return
  recordGuess(pendingPredictionNode.value, choice)
  revealNode(pendingPredictionNode.value)
  pendingPredictionNode.value = null
}

function cancelPrediction() {
  pendingPredictionNode.value = null
}

function revealNode(node) {
  visitNode(node.id)

  if (!isLeaf(node.id) && !isExpanded(node.id)) {
    expandNode(node.id)
  }

  selectedNode.value = node
  emitPluginEvent('panel:opened', { nodeId: node.id, title: node.title })
}

function onCollapseBranch(nodeId) {
  collapseBranch(nodeId)
  if (selectedNode.value && !isStillVisible(selectedNode.value.id)) {
    closePanel()
  }
}

function onCollapseBranchFromPanel() {
  if (!selectedNode.value) return
  onCollapseBranch(selectedNode.value.id)
}

function onCollapseAll() {
  collapseAllBranches()
  pendingPredictionNode.value = null
  if (selectedNode.value && !isStillVisible(selectedNode.value.id)) {
    closePanel()
  }
}

function closePanel() {
  if (selectedNode.value) {
    emitPluginEvent('panel:closed', { nodeId: selectedNode.value.id })
  }
  selectedNode.value = null
}

function goBack() {
  closePanel()
  pendingPredictionNode.value = null
  view.value = 'start'
  emitPluginEvent('view:changed', { view: 'start' })
}
</script>

<style scoped>
.app {
  height: 100%;
  overflow: hidden;
  background: var(--theme-bg);
}

.explorer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--theme-bg);
}

.top-nav {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  background: rgba(2, 6, 23, 0.8);
  border-bottom: 1px solid color-mix(in srgb, var(--theme-accent) 22%, #1e293b);
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
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: var(--theme-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.nav-action-btn {
  background: #1e293b;
  border: 1px solid #334155;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.nav-action-btn:hover {
  background: #273549;
  color: #e2e8f0;
  border-color: #475569;
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

.explorer-body.panel-open .canvas-area {
  right: 340px;
}
</style>
