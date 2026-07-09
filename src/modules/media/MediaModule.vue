<template>
  <div class="media-module">
    <section class="toolbar">
      <div class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
          <span class="count">{{ tab.count }}</span>
        </button>
      </div>
      <div class="toolbar-actions">
        <input v-model="search" class="search" type="search" placeholder="Search…" />
        <button class="btn primary" @click="openAdd">Add {{ activeTab === 'games' ? 'game' : 'title' }}</button>
      </div>
    </section>

    <p v-if="message" class="message" :class="messageType">{{ message }}</p>

    <!-- Games -->
    <section v-if="activeTab === 'games'" class="panel">
      <div class="filters">
        <button
          v-for="s in gameStatuses"
          :key="s.id"
          class="filter"
          :class="{ active: gameFilter === s.id }"
          @click="gameFilter = s.id"
        >
          {{ s.label }} ({{ countGames(s.id) }})
        </button>
      </div>
      <div class="card-grid">
        <article v-for="game in filteredGames" :key="game.id" class="card">
          <header>
            <h3>{{ game.title }}</h3>
            <span class="badge">{{ game.platform || 'PC' }}</span>
          </header>
          <p v-if="game.description" class="desc">{{ game.description }}</p>
          <div class="meta">
            <span class="pill status">{{ statusLabel(gameStatuses, game.status) }}</span>
            <span v-if="game.hoursPlayed" class="pill">{{ game.hoursPlayed }}h</span>
            <span v-for="tag in game.tags" :key="tag" class="pill tag">{{ tag }}</span>
          </div>
          <p v-if="game.notes" class="notes">{{ game.notes }}</p>
          <footer>
            <select :value="game.status" @change="onGameStatus(game, $event.target.value)">
              <option v-for="s in gameStatuses" :key="s.id" :value="s.id">{{ s.label }}</option>
            </select>
            <button class="btn-sm" @click="openEditGame(game)">Edit</button>
            <button class="btn-sm danger" @click="onDeleteGame(game)">Delete</button>
          </footer>
        </article>
      </div>
      <p v-if="!filteredGames.length" class="empty">No games in this view.</p>
    </section>

    <!-- Watchlist -->
    <section v-else class="panel">
      <div class="filters">
        <button
          v-for="s in watchStatuses"
          :key="s.id"
          class="filter"
          :class="{ active: watchFilter === s.id }"
          @click="watchFilter = s.id"
        >
          {{ s.label }} ({{ countWatch(s.id) }})
        </button>
      </div>
      <div class="card-grid">
        <article v-for="item in filteredWatch" :key="item.id" class="card">
          <header>
            <h3>{{ item.title }}</h3>
            <span class="badge">{{ item.mediaType === 'series' ? 'Series' : 'Movie' }}</span>
          </header>
          <p v-if="item.description" class="desc">{{ item.description }}</p>
          <div class="meta">
            <span class="pill status">{{ statusLabel(watchStatuses, item.status) }}</span>
            <span v-if="item.mediaType === 'series' && item.season" class="pill">
              S{{ item.season }}{{ item.episode ? `E${item.episode}` : '' }}
            </span>
            <span v-if="item.rating" class="pill">★ {{ item.rating }}/10</span>
            <span v-for="tag in item.tags" :key="tag" class="pill tag">{{ tag }}</span>
          </div>
          <p v-if="item.notes" class="notes">{{ item.notes }}</p>
          <footer>
            <select :value="item.status" @change="onWatchStatus(item, $event.target.value)">
              <option v-for="s in watchStatuses" :key="s.id" :value="s.id">{{ s.label }}</option>
            </select>
            <button class="btn-sm" @click="openEditWatch(item)">Edit</button>
            <button class="btn-sm danger" @click="onDeleteWatch(item)">Delete</button>
          </footer>
        </article>
      </div>
      <p v-if="!filteredWatch.length" class="empty">Nothing in this watchlist view.</p>
    </section>

    <div v-if="modalOpen" class="modal-backdrop" @click.self="closeModal">
      <div class="modal">
        <header>
          <h2>{{ modalTitle }}</h2>
          <button class="close" @click="closeModal">×</button>
        </header>
        <GameFormModal
          v-if="modalKind === 'game'"
          :game="editingGame"
          :mode="modalMode"
          @save="onSaveGame"
          @cancel="closeModal"
        />
        <WatchFormModal
          v-else
          :item="editingWatch"
          :mode="modalMode"
          @save="onSaveWatch"
          @cancel="closeModal"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import GameFormModal from '@/modules/media/components/GameFormModal.vue'
import WatchFormModal from '@/modules/media/components/WatchFormModal.vue'
import {
  GAME_STATUSES,
  WATCH_STATUSES,
  createEmptyGame,
  createEmptyWatchItem,
  deleteGame,
  deleteWatchItem,
  listGames,
  listWatchlist,
  newGameId,
  newWatchId,
  saveGame,
  saveWatchItem
} from '@/services/media.js'

const activeTab = ref('games')
const gameFilter = ref('backlog')
const watchFilter = ref('backlog')
const search = ref('')
const games = ref([])
const watchlist = ref([])
const message = ref('')
const messageType = ref('info')

const gameStatuses = GAME_STATUSES
const watchStatuses = WATCH_STATUSES

const modalOpen = ref(false)
const modalKind = ref('game')
const modalMode = ref('add')
const editingGame = ref(createEmptyGame())
const editingWatch = ref(createEmptyWatchItem())

const tabs = computed(() => [
  { id: 'games', label: 'Games', count: games.value.length },
  { id: 'watchlist', label: 'Movies & Series', count: watchlist.value.length }
])

const modalTitle = computed(() => {
  if (modalKind.value === 'game') {
    return modalMode.value === 'edit' ? 'Edit game' : 'Add game'
  }
  return modalMode.value === 'edit' ? 'Edit watchlist item' : 'Add to watchlist'
})

const filteredGames = computed(() => {
  const q = search.value.trim().toLowerCase()
  return games.value.filter(g => {
    if (gameFilter.value !== 'all' && g.status !== gameFilter.value) return false
    if (!q) return true
    return [g.title, g.description, g.platform, g.notes, ...(g.tags || [])]
      .join(' ').toLowerCase().includes(q)
  })
})

const filteredWatch = computed(() => {
  const q = search.value.trim().toLowerCase()
  return watchlist.value.filter(w => {
    if (watchFilter.value !== 'all' && w.status !== watchFilter.value) return false
    if (!q) return true
    return [w.title, w.description, w.mediaType, w.notes, ...(w.tags || [])]
      .join(' ').toLowerCase().includes(q)
  })
})

function setMessage(text, type = 'info') {
  message.value = text
  messageType.value = type
}

function statusLabel(statuses, id) {
  return statuses.find(s => s.id === id)?.label || id
}

function countGames(status) {
  return games.value.filter(g => g.status === status).length
}

function countWatch(status) {
  return watchlist.value.filter(w => w.status === status).length
}

async function refresh() {
  games.value = await listGames()
  watchlist.value = await listWatchlist()
}

function openAdd() {
  if (activeTab.value === 'games') {
    editingGame.value = createEmptyGame()
    modalKind.value = 'game'
  } else {
    editingWatch.value = createEmptyWatchItem()
    modalKind.value = 'watch'
  }
  modalMode.value = 'add'
  modalOpen.value = true
}

function openEditGame(game) {
  editingGame.value = { ...game, tags: [...(game.tags || [])] }
  modalKind.value = 'game'
  modalMode.value = 'edit'
  modalOpen.value = true
}

function openEditWatch(item) {
  editingWatch.value = { ...item, tags: [...(item.tags || [])] }
  modalKind.value = 'watch'
  modalMode.value = 'edit'
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
}

async function onSaveGame(game) {
  try {
    const payload = { ...game }
    if (!payload.id) payload.id = newGameId()
    await saveGame(payload)
    await refresh()
    closeModal()
    setMessage(`Saved "${payload.title}".`, 'success')
  } catch (e) {
    setMessage(e.message, 'error')
  }
}

async function onSaveWatch(item) {
  try {
    const payload = { ...item }
    if (!payload.id) payload.id = newWatchId()
    await saveWatchItem(payload)
    await refresh()
    closeModal()
    setMessage(`Saved "${payload.title}".`, 'success')
  } catch (e) {
    setMessage(e.message, 'error')
  }
}

async function onDeleteGame(game) {
  if (!confirm(`Delete "${game.title}"?`)) return
  await deleteGame(game.id)
  await refresh()
  setMessage('Game removed.', 'success')
}

async function onDeleteWatch(item) {
  if (!confirm(`Delete "${item.title}"?`)) return
  await deleteWatchItem(item.id)
  await refresh()
  setMessage('Removed from watchlist.', 'success')
}

async function onGameStatus(game, status) {
  await saveGame({ ...game, status })
  await refresh()
}

async function onWatchStatus(item, status) {
  await saveWatchItem({ ...item, status })
  await refresh()
}

onMounted(refresh)
</script>

<style scoped>
.media-module { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.toolbar { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; align-items: center; }
.tabs { display: flex; gap: 6px; }
.tab {
  display: flex; align-items: center; gap: 8px;
  background: #1e293b; border: 1px solid #334155; color: #94a3b8;
  border-radius: 8px; padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer;
}
.tab.active { background: #2563eb; border-color: #2563eb; color: #fff; }
.count { font-size: 11px; background: rgba(0,0,0,.2); border-radius: 999px; padding: 1px 7px; }
.toolbar-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.search {
  background: #0f172a; border: 1px solid #334155; border-radius: 8px;
  color: #e2e8f0; padding: 8px 12px; min-width: 160px;
}
.btn { background: #1e293b; border: 1px solid #334155; color: #e2e8f0; border-radius: 8px; padding: 8px 12px; font-size: 13px; font-weight: 600; cursor: pointer; }
.btn.primary { background: #2563eb; border-color: #2563eb; color: #fff; }
.message { padding: 10px 14px; border-radius: 8px; font-size: 13px; }
.message.success { background: rgba(22,101,52,.25); border: 1px solid #166534; color: #86efac; }
.message.error { background: rgba(127,29,29,.25); border: 1px solid #991b1b; color: #fca5a5; }
.filters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
.filter {
  background: #0f172a; border: 1px solid #334155; color: #94a3b8;
  border-radius: 999px; padding: 6px 12px; font-size: 12px; cursor: pointer;
}
.filter.active { background: #1d4ed8; border-color: #1d4ed8; color: #fff; }
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
.card {
  background: #0f172a; border: 1px solid #1f2937; border-radius: 14px;
  padding: 14px; display: flex; flex-direction: column; gap: 8px;
}
.card header { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; }
.card h3 { font-size: 15px; font-weight: 600; }
.badge { font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #94a3b8; border: 1px solid #334155; border-radius: 999px; padding: 2px 8px; white-space: nowrap; }
.desc { font-size: 13px; color: #64748b; line-height: 1.4; }
.notes { font-size: 12px; color: #475569; font-style: italic; }
.meta { display: flex; flex-wrap: wrap; gap: 6px; }
.pill { font-size: 11px; background: #1e293b; color: #94a3b8; border-radius: 999px; padding: 3px 8px; }
.pill.status { color: #93c5fd; }
.card footer { display: flex; gap: 6px; margin-top: auto; padding-top: 4px; flex-wrap: wrap; }
.card footer select {
  flex: 1; min-width: 100px; background: #0b1220; border: 1px solid #334155;
  border-radius: 6px; color: #cbd5e1; font-size: 12px; padding: 6px 8px;
}
.btn-sm { background: #1e293b; border: 1px solid #334155; color: #e2e8f0; border-radius: 6px; padding: 6px 10px; font-size: 12px; cursor: pointer; }
.btn-sm.danger { color: #fca5a5; border-color: #7f1d1d; }
.empty { color: #64748b; text-align: center; padding: 32px; }
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(2,6,23,.75);
  display: grid; place-items: center; z-index: 100; padding: 24px;
}
.modal {
  width: min(560px, 100%); background: #111827; border: 1px solid #334155;
  border-radius: 14px; padding: 20px; max-height: 90vh; overflow: auto;
}
.modal header { display: flex; justify-content: space-between; margin-bottom: 16px; }
.close { background: none; border: none; color: #94a3b8; font-size: 24px; cursor: pointer; }
</style>
