/** Collect all descendant node IDs reachable from startId (children only, not startId itself). */
export function collectDescendantIds(allNodes, startId) {
  const descendants = new Set()
  const start = allNodes[startId]
  if (!start) return descendants

  const stack = (start.children || []).map(e => e.targetId)

  while (stack.length) {
    const id = stack.pop()
    if (descendants.has(id)) continue
    descendants.add(id)

    const node = allNodes[id]
    if (!node) continue
    for (const edge of node.children || []) {
      stack.push(edge.targetId)
    }
  }

  return descendants
}

/** True if nodeId is visible given roots and expanded set. */
export function isNodeVisible(nodeId, rootNodeIds, expandedNodeIds, allNodes) {
  if (rootNodeIds.includes(nodeId)) return true

  for (const expandedId of expandedNodeIds) {
    const node = allNodes[expandedId]
    if (!node) continue
    for (const edge of node.children || []) {
      if (edge.targetId === nodeId) return true
    }
  }
  return false
}
