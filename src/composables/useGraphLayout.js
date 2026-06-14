import dagre from 'dagre'

// Node dimensions (must stay in sync with NodeCard.vue sizing)
const ROOT_W = 230
const ROOT_H = 90
const NODE_W = 200
const NODE_H = 72
const CROSS_W = 180
const CROSS_H = 60

export function computeLayout(vfNodes, vfEdges) {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 70, ranksep: 90, marginx: 40, marginy: 40 })

  for (const node of vfNodes) {
    let w = NODE_W
    let h = NODE_H
    if (node.data?.isRoot) { w = ROOT_W; h = ROOT_H }
    else if (node.data?.isCrossLink) { w = CROSS_W; h = CROSS_H }

    // Honour manual position hints from the JSON data (if present)
    if (node.data?.positionHint) {
      g.setNode(node.id, { width: w, height: h, ...node.data.positionHint })
    } else {
      g.setNode(node.id, { width: w, height: h })
    }
  }

  for (const edge of vfEdges) {
    g.setEdge(edge.source, edge.target)
  }

  dagre.layout(g)

  return vfNodes.map(node => {
    const pos = g.node(node.id)
    if (!pos) return node

    let w = NODE_W
    let h = NODE_H
    if (node.data?.isRoot) { w = ROOT_W; h = ROOT_H }
    else if (node.data?.isCrossLink) { w = CROSS_W; h = CROSS_H }

    return {
      ...node,
      position: {
        x: pos.x - w / 2,
        y: pos.y - h / 2
      }
    }
  })
}
