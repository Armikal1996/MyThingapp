import { ref, computed, readonly } from 'vue'

// Pre-import all narration JSON files so Vite can bundle them.
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
  const narrationMeta = ref(null)   // { slug, title, description, rootNodeIds, ... }
  const allNodes = ref({})          // { [id]: node }
  const loading = ref(false)
  const error = ref(null)

  // Sets of string IDs
  const visitedNodeIds = ref(new Set())
  const expandedNodeIds = ref(new Set())

  // visibleNodeIds: root nodes + all targetIds of expanded nodes' children
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

  // All edges between currently visible in-narration nodes,
  // plus cross-narration edges from visible nodes.
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

      // Cross-narration edges — shown as ghost edges to a placeholder node
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

  // Ghost nodes for cross-narration targets visible from expanded nodes
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

  async function loadNarration(slug) {
    loading.value = true
    error.value = null

    const key = `../data/narrations/${slug}.json`
    const loader = narrationModules[key]
    if (!loader) {
      error.value = `Narration file not found: ${slug}`
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
        rootNodeIds: data.rootNodeIds
      }
      allNodes.value = data.nodes

      // Restore persisted state
      const saved = loadState(slug)
      visitedNodeIds.value = new Set(saved.visitedNodeIds)
      expandedNodeIds.value = new Set(saved.expandedNodeIds)
    } catch (e) {
      error.value = `Failed to load narration "${slug}": ${e.message}`
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
    if (isLeaf(id)) return   // leaf nodes cannot be expanded
    expandedNodeIds.value = new Set([...expandedNodeIds.value, id])
    persistState()
  }

  function visitNode(id) {
    if (visitedNodeIds.value.has(id)) return
    visitedNodeIds.value = new Set([...visitedNodeIds.value, id])
    persistState()
  }

  function persistState() {
    if (!narrationMeta.value) return
    saveState(narrationMeta.value.slug, visitedNodeIds.value, expandedNodeIds.value)
  }

  return {
    narrationMeta: readonly(narrationMeta),
    allNodes: readonly(allNodes),
    loading: readonly(loading),
    error: readonly(error),
    visibleNodeIds,
    visibleEdges,
    crossLinkNodes,
    expandNode,
    visitNode,
    isLeaf,
    isExpanded,
    isVisible,
    isVisited,
    loadNarration
  }
}
