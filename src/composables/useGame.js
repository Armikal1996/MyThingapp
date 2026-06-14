import { computed, ref } from 'vue'
import { emit as emitPluginEvent } from '@/plugins/pluginHost.js'

const STORAGE_PREFIX = 'history-explorer:game:'
const MODE_KEY = `${STORAGE_PREFIX}researchMode`
const DIFFICULTY_KEY = `${STORAGE_PREFIX}difficulty`

const BADGES = {
  firstGuess: { id: 'firstGuess', label: 'First Guess', description: 'Make your first prediction.' },
  streak3: { id: 'streak3', label: '3-Streak', description: 'Get 3 predictions right in a row.' },
  historian: { id: 'historian', label: 'Historian', description: 'Answer 10 predictions correctly.' },
  mythbuster: { id: 'mythbuster', label: 'Mythbuster', description: 'Reveal an alternate-history node.' },
  chapterComplete: { id: 'chapterComplete', label: 'Chapter Complete', description: 'Discover every node in a narration.' }
}

function defaultState() {
  return {
    score: 0,
    streak: 0,
    bestStreak: 0,
    correctCount: 0,
    attemptCount: 0,
    answeredPredictions: {},
    badges: []
  }
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch { /* localStorage may be unavailable */ }
}

function keyFor(slug) {
  return `${STORAGE_PREFIX}${slug}`
}

export function useGame() {
  const slug = ref(null)
  const totalNodes = ref(0)
  const discoveredCount = ref(0)
  const lastBadge = ref(null)
  const lastGuess = ref(null)
  const researchMode = ref(readJson(MODE_KEY, false))
  const difficulty = ref(readJson(DIFFICULTY_KEY, 'easy'))
  const state = ref(defaultState())

  const progressPercent = computed(() => {
    if (!totalNodes.value) return 0
    return Math.round((discoveredCount.value / totalNodes.value) * 100)
  })

  const badgeList = computed(() => {
    return state.value.badges.map(id => BADGES[id]).filter(Boolean)
  })

  function initGame(narrationSlug, nodeCount) {
    slug.value = narrationSlug
    totalNodes.value = nodeCount
    discoveredCount.value = 0
    state.value = { ...defaultState(), ...readJson(keyFor(narrationSlug), defaultState()) }
    lastBadge.value = null
    lastGuess.value = null
  }

  function persist() {
    if (!slug.value) return
    writeJson(keyFor(slug.value), state.value)
  }

  function setResearchMode(value) {
    researchMode.value = value === true
    writeJson(MODE_KEY, researchMode.value)
    emitPluginEvent('mode:changed', { researchMode: researchMode.value })
  }

  function setDifficulty(value) {
    difficulty.value = value === 'hard' ? 'hard' : 'easy'
    writeJson(DIFFICULTY_KEY, difficulty.value)
    emitPluginEvent('mode:changed', { difficulty: difficulty.value, researchMode: researchMode.value })
  }

  function syncDiscovered(count) {
    discoveredCount.value = count
    if (totalNodes.value > 0 && count >= totalNodes.value) {
      awardBadge('chapterComplete')
    }
  }

  function isAnswered(nodeId) {
    return Boolean(state.value.answeredPredictions[nodeId])
  }

  function answerFor(nodeId) {
    return state.value.answeredPredictions[nodeId] || null
  }

  function guessedCorrect(nodeId) {
    return state.value.answeredPredictions[nodeId]?.correct === true
  }

  function recordGuess(node, choice) {
    if (!node || !choice || isAnswered(node.id)) return answerFor(node?.id)

    const correct = choice.correct === true
    const points = correct ? (difficulty.value === 'hard' ? 150 : 100) : (difficulty.value === 'hard' ? 0 : 25)
    const next = {
      ...state.value,
      score: state.value.score + points,
      attemptCount: state.value.attemptCount + 1,
      correctCount: state.value.correctCount + (correct ? 1 : 0),
      streak: correct ? state.value.streak + 1 : 0,
      answeredPredictions: {
        ...state.value.answeredPredictions,
        [node.id]: {
          choiceId: choice.id,
          choiceText: choice.text,
          correct,
          feedback: choice.feedback,
          points,
          answeredAt: Date.now()
        }
      }
    }
    next.bestStreak = Math.max(next.bestStreak, next.streak)
    state.value = next
    lastGuess.value = state.value.answeredPredictions[node.id]

    if (state.value.attemptCount === 1) awardBadge('firstGuess')
    if (state.value.streak >= 3) awardBadge('streak3')
    if (state.value.correctCount >= 10) awardBadge('historian')
    if (node.factuality === 'alternate') awardBadge('mythbuster')

    persist()
    emitPluginEvent('guess:made', {
      slug: slug.value,
      nodeId: node.id,
      title: node.title,
      choiceId: choice.id,
      correct,
      points,
      streak: state.value.streak,
      difficulty: difficulty.value
    })

    return state.value.answeredPredictions[node.id]
  }

  function awardBadge(id) {
    if (!BADGES[id] || state.value.badges.includes(id)) return
    state.value = { ...state.value, badges: [...state.value.badges, id] }
    lastBadge.value = BADGES[id]
    persist()
    emitPluginEvent('badge:earned', { slug: slug.value, badge: BADGES[id] })
  }

  function clearLastBadge() {
    lastBadge.value = null
  }

  return {
    state,
    totalNodes,
    discoveredCount,
    progressPercent,
    researchMode,
    difficulty,
    badgeList,
    lastBadge,
    lastGuess,
    initGame,
    setResearchMode,
    setDifficulty,
    syncDiscovered,
    isAnswered,
    answerFor,
    guessedCorrect,
    recordGuess,
    clearLastBadge
  }
}
