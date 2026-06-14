const fallbackDistractors = [
  'A totally unrelated magical shortcut appears.',
  'Everyone agrees and nothing changes.',
  'The story ends here with no consequences.',
  'A mystery army solves the problem overnight.'
]

export function resolvePrediction(node, allNodes = {}) {
  if (!node || (node.children || []).length === 0) return null
  if (node.prediction) return node.prediction

  const realChoices = (node.children || []).map((edge, index) => {
    const target = allNodes[edge.targetId]
    return {
      id: `real-${index + 1}`,
      text: target?.title || edge.targetId,
      correct: true,
      feedback: `Yes. "${target?.title || edge.targetId}" is one real branch that grows from this moment.`,
      leadsTo: edge.targetId,
      generated: true
    }
  })

  return {
    generated: true,
    question: 'Which of these is a real next branch in this history web?',
    choices: [
      ...realChoices,
      {
        id: 'fallback-distractor',
        text: fallbackDistractors[Math.abs(node.id.length) % fallbackDistractors.length],
        correct: false,
        feedback: 'That would be funny, but it is not one of this branch’s real next steps.',
        generated: true
      }
    ].slice(0, 4)
  }
}

export function nodeWithResolvedPrediction(node, allNodes = {}) {
  const prediction = resolvePrediction(node, allNodes)
  return prediction ? { ...node, prediction } : node
}
