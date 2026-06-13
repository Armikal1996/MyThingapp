#!/usr/bin/env node
// Validates every narration JSON in /src/data/narrations/ against the 5 structural laws.
// Exit code 0 = all valid. Exit code 1 = at least one violation.

const fs = require('fs')
const path = require('path')

const NODE_ID_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*::[a-z0-9]+(?:-[a-z0-9]+)*$/
const NARRATIONS_DIR = path.resolve(__dirname, '../src/data/narrations')
const VALID_EDGE_TYPES = new Set(['causal', 'consequence'])
const VALID_NODE_TYPES = new Set(['root', 'simple', 'consequence'])
const VALID_FACTUALITY = new Set(['historical', 'speculative', 'alternate'])

let totalErrors = 0

function err(nodeId, ruleNum, msg) {
  console.error(`  [ERROR] Node "${nodeId}" — Law ${ruleNum}: ${msg}`)
  totalErrors++
}

function validateFile(filePath) {
  const fileName = path.basename(filePath)
  let narration

  try {
    narration = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch (e) {
    console.error(`[ERROR] Cannot parse ${fileName}: ${e.message}`)
    totalErrors++
    return
  }

  const { slug, nodes } = narration
  if (!slug || typeof slug !== 'string') {
    console.error(`[ERROR] ${fileName}: missing or invalid "slug" field`)
    totalErrors++
    return
  }

  const allNodeIds = new Set(Object.keys(nodes || {}))
  console.log(`\nValidating "${fileName}"  (slug: ${slug}, ${allNodeIds.size} nodes)`)

  for (const [mapKey, node] of Object.entries(nodes || {})) {

    // Law 5: map key must equal node.id
    if (mapKey !== node.id) {
      err(mapKey, 5, `map key "${mapKey}" ≠ node.id "${node.id}"`)
    }

    // Law 4: id must match NODE_ID_REGEX
    if (!NODE_ID_REGEX.test(node.id)) {
      err(node.id, 4, `id "${node.id}" does not match NODE_ID_REGEX`)
    }

    // Law 4: narration field must match file slug
    if (node.narration !== slug) {
      err(node.id, 4, `narration "${node.narration}" ≠ file slug "${slug}"`)
    }

    // Law 4: slug portion of id must equal narration
    const idSlug = (node.id || '').split('::')[0]
    if (idSlug !== node.narration) {
      err(node.id, 4, `id slug portion "${idSlug}" ≠ narration "${node.narration}"`)
    }

    // Basic schema checks
    if (!VALID_NODE_TYPES.has(node.type)) {
      err(node.id, 4, `type "${node.type}" is not one of: root, simple, consequence`)
    }
    if (!VALID_FACTUALITY.has(node.factuality)) {
      err(node.id, 4, `factuality "${node.factuality}" is not one of: historical, speculative, alternate`)
    }

    const children = node.children || []

    // Law 1: out-degree limits (children = outgoing edges only)
    if (node.type === 'root') {
      if (children.length < 2 || children.length > 3) {
        err(node.id, 1, `root node has ${children.length} children (required: 2–3)`)
      }
    } else if (node.type === 'simple' || node.type === 'consequence') {
      if (children.length > 2) {
        err(node.id, 1, `${node.type} node has ${children.length} children (max: 2)`)
      }
      // 0 children = leaf node — always valid, no check needed (Law 1 explicitly allows it)
    }

    // Law 3 + Law 5: validate each child edge object
    for (const edge of children) {
      if (typeof edge !== 'object' || edge === null) {
        err(node.id, 5, `children entry is not an object — expected { targetId, edgeType }`)
        continue
      }

      // Law 5: edgeType must be causal or consequence
      if (!VALID_EDGE_TYPES.has(edge.edgeType)) {
        err(node.id, 5, `children[].edgeType "${edge.edgeType}" must be "causal" or "consequence"`)
      }

      // Law 3: targetId must match regex
      if (!NODE_ID_REGEX.test(edge.targetId)) {
        err(node.id, 3, `children[].targetId "${edge.targetId}" does not match NODE_ID_REGEX`)
      }

      // Law 3: targetId must resolve in THIS narration
      if (!allNodeIds.has(edge.targetId)) {
        err(node.id, 3, `children[].targetId "${edge.targetId}" does not resolve to any node in this narration`)
      }
    }

    // Law 3: crossLinks.targetNodeId must match NODE_ID_REGEX (need not resolve)
    for (const link of (node.crossLinks || [])) {
      if (!NODE_ID_REGEX.test(link.targetNodeId)) {
        err(node.id, 3, `crossLinks[].targetNodeId "${link.targetNodeId}" does not match NODE_ID_REGEX`)
      }
    }
  }

  // Law 3: DAG — no cycles (iterative DFS with grey/black colouring)
  const WHITE = 0, GREY = 1, BLACK = 2
  const color = {}
  for (const id of allNodeIds) color[id] = WHITE
  let cycleFound = false

  function dfs(id) {
    if (color[id] === GREY) {
      console.error(`  [ERROR] Law 3: cycle detected — node "${id}" is on its own ancestor path`)
      totalErrors++
      cycleFound = true
      return
    }
    if (color[id] === BLACK) return
    color[id] = GREY
    for (const edge of ((nodes[id] || {}).children || [])) {
      if (allNodeIds.has(edge.targetId)) dfs(edge.targetId)
    }
    color[id] = BLACK
  }

  for (const id of allNodeIds) {
    if (color[id] === WHITE) dfs(id)
  }

  if (!cycleFound) console.log('  DAG (no cycles): ✓')

  // Law 2: in-degree is unrestricted — no check needed; this message confirms we don't reject convergence
  console.log('  In-degree (convergence): unrestricted ✓')
}

// ── main ──────────────────────────────────────────────────────────────────────

if (!fs.existsSync(NARRATIONS_DIR)) {
  console.error(`[ERROR] Narrations directory not found: ${NARRATIONS_DIR}`)
  process.exit(1)
}

const files = fs.readdirSync(NARRATIONS_DIR).filter(f => f.endsWith('.json'))
if (files.length === 0) {
  console.error('[ERROR] No .json files found in ' + NARRATIONS_DIR)
  process.exit(1)
}

for (const file of files) {
  validateFile(path.join(NARRATIONS_DIR, file))
}

console.log('\n' + '═'.repeat(52))
if (totalErrors === 0) {
  console.log('All narrations valid ✓')
  process.exit(0)
} else {
  console.error(`Validation FAILED — ${totalErrors} error(s).`)
  process.exit(1)
}
