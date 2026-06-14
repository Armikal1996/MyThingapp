const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const oldPath = path.join(root, 'src/data/narrations/physiology and psychology.json')
const newSlug = 'history-of-physiology-and-psychology'
const newPath = path.join(root, `src/data/narrations/${newSlug}.json`)

const raw = JSON.parse(fs.readFileSync(oldPath, 'utf8'))

function localId(id) {
  return String(id)
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function nodeId(id) {
  return `${newSlug}::${localId(id)}`
}

const sourceNodes = raw.nodes || []
const sourceById = new Map(sourceNodes.map(node => [node.id, node]))

const referenceFixes = new Map([
  ['part2_behaviorism', 'behaviorism'],
  ['interpretation_dreams', 'book_freud']
])

function resolveReference(id) {
  return referenceFixes.get(id) || id
}

function edgeTypeFor(targetId) {
  const target = sourceById.get(resolveReference(targetId))
  if (target?.type === 'consequence' || target?.factuality === 'alternate') return 'consequence'
  return 'causal'
}

const correctChoiceByNode = {
  root: 'Galen',
  galen: 'Progress slows',
  cognitive_revolution: 'Computers',
  future_consciousness: 'Eventually'
}

function predictionFor(node) {
  if (!node.predictionQuestion) return undefined

  const correctText = correctChoiceByNode[node.id] || node.predictionQuestion.options?.[0]
  const choices = (node.predictionQuestion.options || []).slice(0, 4).map((option, index) => {
    const correct = option === correctText
    return {
      id: `choice-${index + 1}`,
      text: option,
      correct,
      feedback: correct
        ? `Correct. "${option}" is the strongest answer for this historical moment.`
        : `Good guess, but "${option}" is not the strongest answer here.`
    }
  })

  if (!choices.some(choice => choice.correct) && choices[0]) choices[0].correct = true
  return { question: node.predictionQuestion.question, choices }
}

function powerUpFor(node) {
  const map = {
    historical: {
      title: 'Evidence Radar',
      text: 'You found a historically grounded step. Watch how observation, texts, and experiments build knowledge.'
    },
    speculative: {
      title: 'Future Lens',
      text: 'You explored a plausible future. Separate what science can do now from what it may do later.'
    },
    alternate: {
      title: 'Counterfactual Compass',
      text: 'You tested a what-if path. Ask what changed, what stayed the same, and what evidence still matters.'
    }
  }
  return map[node.factuality] || map.historical
}

function convertNode(node) {
  const children = (node.children || [])
    .map(resolveReference)
    .filter(childId => sourceById.has(childId))
    .filter((childId, index) => node.id !== 'books_hub' || index === 0)
    .map(childId => ({
      targetId: nodeId(childId),
      edgeType: edgeTypeFor(childId)
    }))

  // Integrate disconnected generated paths into the playable graph where useful.
  if (node.id === 'root' && !children.some(edge => edge.targetId === nodeId('books_hub'))) {
    children.push({ targetId: nodeId('books_hub'), edgeType: 'causal' })
  }
  if (node.id === 'future_medicine' && !children.some(edge => edge.targetId === nodeId('alternate_ai_doctors'))) {
    children.push({ targetId: nodeId('alternate_ai_doctors'), edgeType: 'consequence' })
  }

  const crossLinks = (node.crossLinks || [])
    .map(resolveReference)
    .filter(linkId => sourceById.has(linkId))
    .map(linkId => ({
      targetNodeId: nodeId(linkId),
      label: `Related idea: ${sourceById.get(linkId).title}`
    }))

  const converted = {
    id: nodeId(node.id),
    narration: newSlug,
    type: node.type || 'simple',
    title: node.title,
    summary: node.content || node.summary || '',
    factuality: node.factuality || 'historical',
    sources: Array.isArray(node.sources) ? node.sources : [],
    consequences: node.consequences || null,
    children,
    crossLinks,
    powerUp: powerUpFor(node)
  }

  const prediction = predictionFor(node)
  if (prediction) converted.prediction = prediction

  return converted
}

const nodes = {}
for (const node of sourceNodes) {
  const converted = convertNode(node)
  nodes[converted.id] = converted
}

const output = {
  slug: newSlug,
  title: raw.title || 'How Did Humans Learn How the Body and Mind Work?',
  version: 1,
  description: raw.description || 'An interactive branching history of physiology, psychology, and neuroscience.',
  theme: {
    era: 'archive',
    accent: '#2563eb',
    accent2: '#7c3aed',
    motif: 'laboratories, anatomy sketches, brain maps, and scientific instruments'
  },
  narrator: {
    name: raw.narrator?.name || 'Dr. Sophia',
    persona: raw.narrator?.role || 'Historian of Science',
    intro: 'I am Dr. Sophia. Read the clue, guess the next discovery, then reveal how body and mind science grew.',
    correctLines: ['Excellent diagnosis!', 'You followed the evidence.'],
    wrongLines: ['Good hypothesis, but the evidence points elsewhere.', 'Not quite — science took another path.']
  },
  rootNodeIds: [nodeId('root')],
  missions: [
    {
      id: 'mission-foundations',
      title: 'The Search Begins',
      description: 'Discover how ancient thinkers tried to explain body and mind.',
      nodeIds: ['root', 'hippocrates', 'aristotle', 'alexandria_school', 'galen'].map(nodeId)
    },
    {
      id: 'mission-scientific-method',
      title: 'Evidence Replaces Authority',
      description: 'See observation and experiments transform medicine.',
      nodeIds: ['renaissance', 'vesalius', 'harvey', 'bernard', 'experimental_medicine'].map(nodeId)
    },
    {
      id: 'mission-books',
      title: 'Books That Changed Everything',
      description: 'Follow ideas that survived through texts and teaching.',
      nodeIds: ['books_hub', 'book_hippocratic', 'book_galen', 'book_canon', 'book_fabrica', 'book_harvey'].map(nodeId)
    },
    {
      id: 'mission-neuroscience',
      title: 'The Brain Reveals Its Secrets',
      description: 'Trace discoveries that turned mind study into neuroscience.',
      nodeIds: ['neuron_doctrine', 'golgi', 'ramon_cajal', 'brain_localization', 'mri', 'cognitive_neuroscience'].map(nodeId)
    },
    {
      id: 'mission-future',
      title: 'The Next Frontier',
      description: 'Explore possible futures of physiology, psychology, and medicine.',
      nodeIds: ['future_medicine', 'digital_twins', 'gene_editing', 'alternate_ai_doctors', 'future_ethics', 'future_consciousness'].map(nodeId)
    }
  ],
  nodes
}

fs.writeFileSync(newPath, JSON.stringify(output, null, 2) + '\n')
console.log(`Wrote ${newPath}`)
