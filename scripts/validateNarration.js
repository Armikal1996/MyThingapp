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

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

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

  if (narration.theme !== undefined && !isPlainObject(narration.theme)) {
    console.error(`[ERROR] ${fileName}: optional "theme" must be an object when present`)
    totalErrors++
  }

  if (narration.narrator !== undefined) {
    if (!isPlainObject(narration.narrator)) {
      console.error(`[ERROR] ${fileName}: optional "narrator" must be an object when present`)
      totalErrors++
    } else {
      for (const key of ['name', 'persona', 'intro']) {
        if (typeof narration.narrator[key] !== 'string' || !narration.narrator[key].trim()) {
          console.error(`[ERROR] ${fileName}: narrator.${key} must be a non-empty string`)
          totalErrors++
        }
      }
      for (const key of ['correctLines', 'wrongLines']) {
        if (!Array.isArray(narration.narrator[key])) {
          console.error(`[ERROR] ${fileName}: narrator.${key} must be an array`)
          totalErrors++
        }
      }
    }
  }

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

    // Optional game schema: authored predict-then-reveal prompts.
    if (node.prediction !== undefined) {
      if (!isPlainObject(node.prediction)) {
        err(node.id, 'Game', 'prediction must be an object when present')
      } else {
        if (typeof node.prediction.question !== 'string' || !node.prediction.question.trim()) {
          err(node.id, 'Game', 'prediction.question must be a non-empty string')
        }

        const choices = node.prediction.choices
        if (!Array.isArray(choices) || choices.length < 2 || choices.length > 4) {
          err(node.id, 'Game', 'prediction.choices must contain 2–4 choices')
        } else {
          let correctCount = 0
          const ids = new Set()

          for (const choice of choices) {
            if (!isPlainObject(choice)) {
              err(node.id, 'Game', 'each prediction choice must be an object')
              continue
            }
            if (typeof choice.id !== 'string' || !choice.id.trim()) {
              err(node.id, 'Game', 'prediction choice id must be a non-empty string')
            } else if (ids.has(choice.id)) {
              err(node.id, 'Game', `duplicate prediction choice id "${choice.id}"`)
            } else {
              ids.add(choice.id)
            }
            if (typeof choice.text !== 'string' || !choice.text.trim()) {
              err(node.id, 'Game', `prediction choice "${choice.id}" text must be non-empty`)
            }
            if (typeof choice.correct !== 'boolean') {
              err(node.id, 'Game', `prediction choice "${choice.id}" correct must be boolean`)
            }
            if (choice.correct === true) correctCount++
            if (typeof choice.feedback !== 'string' || !choice.feedback.trim()) {
              err(node.id, 'Game', `prediction choice "${choice.id}" feedback must be non-empty`)
            }
            if (choice.leadsTo !== undefined) {
              if (!NODE_ID_REGEX.test(choice.leadsTo)) {
                err(node.id, 'Game', `prediction choice "${choice.id}" leadsTo does not match NODE_ID_REGEX`)
              } else if (!allNodeIds.has(choice.leadsTo)) {
                err(node.id, 'Game', `prediction choice "${choice.id}" leadsTo does not resolve in this narration`)
              }
            }
          }

          if (correctCount < 1) {
            err(node.id, 'Game', 'prediction must include at least one correct choice')
          }
        }
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
