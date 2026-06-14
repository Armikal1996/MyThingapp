import { ref, computed, readonly } from 'vue'
import { collectDescendantIds, isNodeVisible } from '@/utils/graphTraversal.js'
import { emit as emitPluginEvent } from '@/plugins/pluginHost.js'

const narrationModules = import.meta.glob('../data/narrations/*.json')

const LS_PREFIX = 'history-explorer:state:'

function lsKey(slug) {
  return `${LS_PREFIX}${slug}`
}

function loadState(slug) {
  try {
    const raw = localStorage.getItem(lsKey(slug))
    if (!raw) return { visitedNodeIds: [], expandedNodeIds: [] }
    return JSON.parse(raw)
  } catch {
    return { visitedNodeIds: [], expandedNodeIds: [] }
  }
}

function saveState(slug, visited, expanded) {
  try {
    localStorage.setItem(lsKey(slug), JSON.stringify({
      visitedNodeIds: [...visited],
      expandedNodeIds: [...expanded]
    }))
  } catch { /* storage full or unavailable */ }
}

export function useNarration() {
  const narrationMeta = ref(null)
  const allNodes = ref({})
  const loading = ref(false)
  const error = ref(null)

  const visitedNodeIds = ref(new Set())
  const expandedNodeIds = ref(new Set())

  const hasExpandedBranches = computed(() => expandedNodeIds.value.size > 0)

  const visibleNodeIds = computed(() => {
    const visible = new Set()
    if (!narrationMeta.value) return visible

    for (const id of narrationMeta.value.rootNodeIds) {
      visible.add(id)
    }
    for (const expandedId of expandedNodeIds.value) {
      const node = allNodes.value[expandedId]
      if (!node) continue
      for (const edge of (node.children || [])) {
        visible.add(edge.targetId)
      }
    }
    return visible
  })

  const visibleEdges = computed(() => {
    const edges = []
    if (!narrationMeta.value) return edges

    for (const nodeId of visibleNodeIds.value) {
      const node = allNodes.value[nodeId]
      if (!node) continue

      for (const edge of (node.children || [])) {
        if (visibleNodeIds.value.has(edge.targetId)) {
          edges.push({
            id: `${nodeId}-->${edge.targetId}`,
            source: nodeId,
            target: edge.targetId,
            edgeType: edge.edgeType
          })
        }
      }

      for (const link of (node.crossLinks || [])) {
        edges.push({
          id: `${nodeId}-->xlink-->${link.targetNodeId}`,
          source: nodeId,
          target: `xlink::${link.targetNodeId}`,
          edgeType: 'cross-narration',
          crossLinkLabel: link.label,
          targetNodeId: link.targetNodeId
        })
      }
    }
    return edges
  })

  const crossLinkNodes = computed(() => {
    const ghosts = new Map()
    for (const edge of visibleEdges.value) {
      if (edge.edgeType !== 'cross-narration') continue
      const ghostId = `xlink::${edge.targetNodeId}`
      if (!ghosts.has(ghostId)) {
        ghosts.set(ghostId, {
          id: ghostId,
          isCrossLink: true,
          targetNodeId: edge.targetNodeId,
          label: edge.crossLinkLabel
        })
      }
    }
    return [...ghosts.values()]
  })

  function slug() {
    return narrationMeta.value?.slug ?? null
  }

  async function loadNarration(narrationSlug) {
    loading.value = true
    error.value = null

    const key = `../data/narrations/${narrationSlug}.json`
    const loader = narrationModules[key]
    if (!loader) {
      error.value = `Narration file not found: ${narrationSlug}`
      loading.value = false
      return
    }

    try {
      const module = await loader()
      const data = module.default

      narrationMeta.value = {
        slug: data.slug,
        title: data.title,
        description: data.description,
        version: data.version,
        rootNodeIds: data.rootNodeIds,
        theme: data.theme || null,
        narrator: data.narrator || null,
        missions: data.missions || []
      }
      allNodes.value = data.nodes

      const saved = loadState(narrationSlug)
      visitedNodeIds.value = new Set(saved.visitedNodeIds)
      expandedNodeIds.value = new Set(saved.expandedNodeIds)

      emitPluginEvent('narration:loaded', {
        slug: data.slug,
        title: data.title,
        nodeCount: Object.keys(data.nodes).length,
        restoredExpanded: saved.expandedNodeIds.length
      })
    } catch (e) {
      error.value = `Failed to load narration "${narrationSlug}": ${e.message}`
    } finally {
      loading.value = false
    }
  }

  function isLeaf(id) {
    const node = allNodes.value[id]
    if (!node) return true
    return (node.children || []).length === 0
  }

  function isExpanded(id) {
    return expandedNodeIds.value.has(id)
  }

  function isVisible(id) {
    return visibleNodeIds.value.has(id)
  }

  function isVisited(id) {
    return visitedNodeIds.value.has(id)
  }

  function expandNode(id) {
    if (isLeaf(id) || isExpanded(id)) return false

    expandedNodeIds.value = new Set([...expandedNodeIds.value, id])
    persistState()

    emitPluginEvent('node:expanded', {
      slug: slug(),
      nodeId: id,
      title: allNodes.value[id]?.title
    })
    return true
  }

  /** Collapse one branch: hide this node's children and all deeper expanded descendants. */
  function collapseBranch(id) {
    if (!isExpanded(id)) return []

    const descendants = collectDescendantIds(allNodes.value, id)
    const removed = [id, ...descendants]

    const next = new Set(expandedNodeIds.value)
    for (const nodeId of removed) {
      next.delete(nodeId)
    }
    expandedNodeIds.value = next
    persistState()

    emitPluginEvent('node:collapsed', {
      slug: slug(),
      nodeId: id,
      title: allNodes.value[id]?.title,
      removedExpandedCount: removed.length
    })

    return removed
  }

  /** Collapse every open branch; root nodes stay on canvas. */
  function collapseAllBranches() {
    const count = expandedNodeIds.value.size
    if (count === 0) return 0

    expandedNodeIds.value = new Set()
    persistState()

    emitPluginEvent('branches:collapsed-all', {
      slug: slug(),
      collapsedCount: count
    })

    return count
  }

  function visitNode(id) {
    if (visitedNodeIds.value.has(id)) return
    visitedNodeIds.value = new Set([...visitedNodeIds.value, id])
    persistState()

    emitPluginEvent('node:visited', {
      slug: slug(),
      nodeId: id,
      title: allNodes.value[id]?.title
    })
  }

  function persistState() {
    if (!narrationMeta.value) return
    saveState(narrationMeta.value.slug, visitedNodeIds.value, expandedNodeIds.value)
  }

  function isStillVisible(nodeId) {
    if (!narrationMeta.value) return false
    return isNodeVisible(
      nodeId,
      narrationMeta.value.rootNodeIds,
      expandedNodeIds.value,
      allNodes.value
    )
  }

  function pathToNode(targetId) {
    if (!narrationMeta.value || !targetId) return []

    const queue = narrationMeta.value.rootNodeIds.map(id => [id])
    const seen = new Set()

    while (queue.length) {
      const path = queue.shift()
      const id = path[path.length - 1]
      if (id === targetId) {
        return path.map(nodeId => allNodes.value[nodeId]).filter(Boolean)
      }
      if (seen.has(id)) continue
      seen.add(id)

      const node = allNodes.value[id]
      for (const edge of node?.children || []) {
        queue.push([...path, edge.targetId])
      }
    }

    return []
  }

  return {
    narrationMeta: readonly(narrationMeta),
    allNodes: readonly(allNodes),
    loading: readonly(loading),
    error: readonly(error),
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
    isVisible,
    isVisited,
    isStillVisible,
    pathToNode,
    loadNarration
  }
}
