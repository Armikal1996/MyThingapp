// Browser-side narration validator.
// Mirrors the structural laws enforced by scripts/validateNarration.js, but
// returns structured { errors, warnings, stats } instead of printing/exiting.
// Errors block import; warnings are advisory (web-shape / authoring quality).

export const NODE_ID_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*::[a-z0-9]+(?:-[a-z0-9]+)*$/
const VALID_EDGE_TYPES = new Set(['causal', 'consequence'])
const VALID_NODE_TYPES = new Set(['root', 'simple', 'consequence'])
const VALID_FACTUALITY = new Set(['historical', 'speculative', 'alternate'])
const VALID_BRANCH_SIDES = new Set(['left', 'right', 'center'])

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validatePrediction(node, allNodeIds, errors) {
  if (node.prediction === undefined) return
  const id = node.id
  if (!isPlainObject(node.prediction)) {
    errors.push(`${id}: prediction must be an object when present`)
    return
  }
  if (typeof node.prediction.question !== 'string' || !node.prediction.question.trim()) {
    errors.push(`${id}: prediction.question must be a non-empty string`)
  }
  const choices = node.prediction.choices
  if (!Array.isArray(choices) || choices.length < 2 || choices.length > 4) {
    errors.push(`${id}: prediction.choices must contain 2–4 choices`)
    return
  }
  let correctCount = 0
  const ids = new Set()
  for (const choice of choices) {
    if (!isPlainObject(choice)) {
      errors.push(`${id}: each prediction choice must be an object`)
      continue
    }
    if (typeof choice.id !== 'string' || !choice.id.trim()) {
      errors.push(`${id}: prediction choice id must be a non-empty string`)
    } else if (ids.has(choice.id)) {
      errors.push(`${id}: duplicate prediction choice id "${choice.id}"`)
    } else {
      ids.add(choice.id)
    }
    if (typeof choice.text !== 'string' || !choice.text.trim()) {
      errors.push(`${id}: prediction choice "${choice.id}" text must be non-empty`)
    }
    if (typeof choice.correct !== 'boolean') {
      errors.push(`${id}: prediction choice "${choice.id}" correct must be boolean`)
    }
    if (choice.correct === true) correctCount++
    if (typeof choice.feedback !== 'string' || !choice.feedback.trim()) {
      errors.push(`${id}: prediction choice "${choice.id}" feedback must be non-empty`)
    }
    if (choice.leadsTo !== undefined) {
      if (!NODE_ID_REGEX.test(choice.leadsTo)) {
        errors.push(`${id}: prediction choice "${choice.id}" leadsTo is not a valid node id`)
      } else if (!allNodeIds.has(choice.leadsTo)) {
        errors.push(`${id}: prediction choice "${choice.id}" leadsTo does not resolve in this narration`)
      }
    }
  }
  if (correctCount < 1) errors.push(`${id}: prediction must include at least one correct choice`)
}

function detectCycle(nodes, allNodeIds, errors) {
  const WHITE = 0, GREY = 1, BLACK = 2
  const color = {}
  for (const id of allNodeIds) color[id] = WHITE
  let cycleFound = false

  function dfs(id) {
    if (color[id] === GREY) {
      errors.push(`cycle detected at "${id}" — narrations must be acyclic (DAG)`)
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

  for (const id of allNodeIds) if (color[id] === WHITE && !cycleFound) dfs(id)
}

function longestChainWithoutSplit(nodes, rootIds) {
  // Longest run of single-child nodes (a boring "click straight down" ladder).
  let worst = 0
  const memo = new Map()

  function walk(id, runLen) {
    const node = nodes[id]
    if (!node) return
    const childCount = (node.children || []).length
    const nextRun = childCount === 1 ? runLen + 1 : 1
    if (nextRun > worst) worst = nextRun
    if (memo.get(id) >= nextRun) return
    memo.set(id, nextRun)
    for (const edge of (node.children || [])) {
      walk(edge.targetId, childCount === 1 ? nextRun : 1)
    }
  }

  for (const rootId of rootIds) walk(rootId, 0)
  return worst
}

/**
 * Validate a parsed narration object.
 * @param {object} narration parsed JSON
 * @param {{ existingSlugs?: string[] }} [opts]
 * @returns {{ errors: string[], warnings: string[], stats: object }}
 */
export function validateNarration(narration, opts = {}) {
  const errors = []
  const warnings = []
  const existingSlugs = new Set(opts.existingSlugs || [])

  if (!isPlainObject(narration)) {
    return { errors: ['Top-level JSON must be an object.'], warnings, stats: {} }
  }

  const { slug, nodes, rootNodeIds } = narration

  if (typeof slug !== 'string' || !slug.trim()) {
    errors.push('Missing or invalid top-level "slug" (string).')
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    errors.push(`Slug "${slug}" must be lowercase words separated by single hyphens.`)
  } else if (existingSlugs.has(slug)) {
    errors.push(`Slug "${slug}" already exists. Choose a unique slug.`)
  }

  if (typeof narration.title !== 'string' || !narration.title.trim()) {
    errors.push('Missing or invalid top-level "title" (string).')
  }

  if (!isPlainObject(nodes)) {
    errors.push('Missing or invalid "nodes" (object map).')
    return { errors, warnings, stats: {} }
  }

  if (!Array.isArray(rootNodeIds) || rootNodeIds.length === 0) {
    errors.push('Missing or invalid "rootNodeIds" (non-empty array).')
  }

  const allNodeIds = new Set(Object.keys(nodes))

  for (const rootId of (rootNodeIds || [])) {
    if (!allNodeIds.has(rootId)) {
      errors.push(`rootNodeIds entry "${rootId}" does not resolve in nodes.`)
    }
  }

  let expandableNonRoot = 0
  let oneChildNonRoot = 0

  for (const [mapKey, node] of Object.entries(nodes)) {
    if (!isPlainObject(node)) {
      errors.push(`Node "${mapKey}" must be an object.`)
      continue
    }
    if (mapKey !== node.id) errors.push(`map key "${mapKey}" ≠ node.id "${node.id}"`)
    if (typeof node.id !== 'string' || !NODE_ID_REGEX.test(node.id)) {
      errors.push(`"${mapKey}": id is not a valid node id (expected slug::local-id)`)
    }
    if (node.narration !== slug) errors.push(`"${node.id}": narration "${node.narration}" ≠ slug "${slug}"`)
    const idSlug = (node.id || '').split('::')[0]
    if (idSlug !== node.narration) errors.push(`"${node.id}": id slug "${idSlug}" ≠ narration "${node.narration}"`)
    if (!VALID_NODE_TYPES.has(node.type)) errors.push(`"${node.id}": type "${node.type}" is invalid`)
    if (!VALID_FACTUALITY.has(node.factuality)) errors.push(`"${node.id}": factuality "${node.factuality}" is invalid`)
    if (typeof node.title !== 'string' || !node.title.trim()) errors.push(`"${node.id}": title must be non-empty`)
    if (typeof node.summary !== 'string' || !node.summary.trim()) errors.push(`"${node.id}": summary must be non-empty`)

    const children = node.children || []
    if (!Array.isArray(children)) {
      errors.push(`"${node.id}": children must be an array`)
    } else {
      if (node.type === 'root' && (children.length < 2 || children.length > 3)) {
        errors.push(`"${node.id}": root node has ${children.length} children (required: 2–3)`)
      } else if ((node.type === 'simple' || node.type === 'consequence') && children.length > 2) {
        errors.push(`"${node.id}": ${node.type} node has ${children.length} children (max: 2)`)
      }

      if (node.type !== 'root' && children.length >= 1) {
        expandableNonRoot++
        if (children.length === 1) oneChildNonRoot++
      }

      for (const edge of children) {
        if (!isPlainObject(edge)) {
          errors.push(`"${node.id}": a children entry is not an object`)
          continue
        }
        if (!VALID_EDGE_TYPES.has(edge.edgeType)) errors.push(`"${node.id}": edgeType "${edge.edgeType}" is invalid`)
        if (!NODE_ID_REGEX.test(edge.targetId)) errors.push(`"${node.id}": children targetId "${edge.targetId}" is not a valid node id`)
        else if (!allNodeIds.has(edge.targetId)) errors.push(`"${node.id}": children targetId "${edge.targetId}" does not resolve`)
        if (edge.branchSide !== undefined && !VALID_BRANCH_SIDES.has(edge.branchSide)) {
          errors.push(`"${node.id}": branchSide "${edge.branchSide}" must be left, right, or center`)
        }
      }
    }

    for (const link of (node.crossLinks || [])) {
      if (!isPlainObject(link) || !NODE_ID_REGEX.test(link.targetNodeId)) {
        errors.push(`"${node.id}": crossLinks targetNodeId is not a valid node id`)
      }
    }

    validatePrediction(node, allNodeIds, errors)
  }

  detectCycle(nodes, allNodeIds, errors)

  // ---- Web-shape warnings (advisory only) ----
  if (expandableNonRoot >= 4) {
    const oneChildRatio = oneChildNonRoot / expandableNonRoot
    if (oneChildRatio > 0.6) {
      warnings.push(
        `Narration is one-sided: ${Math.round(oneChildRatio * 100)}% of branching nodes have only 1 child. ` +
        'Give more nodes 2 children so the web spreads left and right.'
      )
    }
  }

  const longestChain = longestChainWithoutSplit(nodes, (rootNodeIds || []).filter(id => allNodeIds.has(id)))
  if (longestChain >= 6) {
    warnings.push(
      `There is a straight chain of ${longestChain} single-child nodes. ` +
      'Add a split (2 children) somewhere along it so the path is not just "click straight down".'
    )
  }

  const stats = {
    nodeCount: allNodeIds.size,
    rootCount: (rootNodeIds || []).length,
    expandableNonRoot,
    oneChildNonRoot,
    twoChildShare: expandableNonRoot ? Math.round(((expandableNonRoot - oneChildNonRoot) / expandableNonRoot) * 100) : 0,
    longestChain
  }

  return { errors, warnings, stats }
}
