<template>
  <ModuleShell sticky-toolbar accent="media">
    <template #toolbar>
      <ModuleToolbar>
        <template #leading>
          <BaseTabs v-model="activeTab" :tabs="tabs" />
        </template>
        <template #center>
          <SearchInput v-model="search" placeholder="Search…" />
        </template>
        <template #trailing>
          <BaseButton variant="primary" @click="openAdd">
            Add {{ activeTab === 'games' ? 'game' : 'title' }}
          </BaseButton>
        </template>
      </ModuleToolbar>
    </template>

    <DesktopRequired>
      <div ref="listRef" class="media-content">
        <!-- Games -->
        <section v-if="activeTab === 'games'" class="panel">
          <div class="filters">
            <BasePill :active="gameFilter === 'all'" @click="gameFilter = 'all'">
              All ({{ games.length }})
            </BasePill>
            <BasePill
              v-for="s in gameStatuses"
              :key="s.id"
              :active="gameFilter === s.id"
              @click="gameFilter = s.id"
            >
              {{ s.label }} ({{ countGames(s.id) }})
            </BasePill>
          </div>
          <div v-if="filteredGames.length" class="card-grid">
            <BaseCard
              v-for="game in filteredGames"
              :key="game.id"
              class="media-card"
              accent="var(--accent-media)"
              :data-highlight-id="game.id"
            >
              <header class="card-head">
                <h3>{{ game.title }}</h3>
                <div class="card-head-actions">
                  <BaseBadge>{{ game.platform || 'PC' }}</BaseBadge>
                  <HubActionMenu item-type="game" :item="game" @done="onHubAction" @error="onHubError" />
                </div>
              </header>
              <p v-if="game.description" class="desc">{{ game.description }}</p>
              <div class="meta">
                <BaseBadge variant="primary">{{ statusLabel(gameStatuses, game.status) }}</BaseBadge>
                <BaseBadge v-if="game.hoursPlayed">{{ game.hoursPlayed }}h</BaseBadge>
                <BaseBadge v-for="tag in game.tags" :key="tag">{{ tag }}</BaseBadge>
              </div>
              <p v-if="game.notes" class="notes">{{ game.notes }}</p>
              <footer class="card-footer">
                <select :value="game.status" @change="onGameStatus(game, $event.target.value)">
                  <option v-for="s in gameStatuses" :key="s.id" :value="s.id">{{ s.label }}</option>
                </select>
                <BaseButton size="sm" @click="openEditGame(game)">Edit</BaseButton>
                <BaseButton size="sm" variant="danger" @click="onDeleteGame(game)">Delete</BaseButton>
              </footer>
            </BaseCard>
          </div>
          <BaseEmptyState
            v-else
            variant="inline"
            title="No games in this view."
          />
        </section>

        <!-- Watchlist -->
        <section v-else class="panel">
          <div class="filters">
            <BasePill :active="watchFilter === 'all'" @click="watchFilter = 'all'">
              All ({{ watchlist.length }})
            </BasePill>
            <BasePill
              v-for="s in watchStatuses"
              :key="s.id"
              :active="watchFilter === s.id"
              @click="watchFilter = s.id"
            >
              {{ s.label }} ({{ countWatch(s.id) }})
            </BasePill>
          </div>
          <div v-if="filteredWatch.length" class="card-grid">
            <BaseCard
              v-for="item in filteredWatch"
              :key="item.id"
              class="media-card"
              accent="var(--accent-media)"
              :data-highlight-id="item.id"
            >
              <header class="card-head">
                <h3>{{ item.title }}</h3>
                <div class="card-head-actions">
                  <BaseBadge>{{ item.mediaType === 'series' ? 'Series' : 'Movie' }}</BaseBadge>
                  <HubActionMenu item-type="watch" :item="item" @done="onHubAction" @error="onHubError" />
                </div>
              </header>
              <p v-if="item.description" class="desc">{{ item.description }}</p>
              <div class="meta">
                <BaseBadge variant="primary">{{ statusLabel(watchStatuses, item.status) }}</BaseBadge>
                <BaseBadge v-if="item.mediaType === 'series' && item.season">
                  S{{ item.season }}{{ item.episode ? `E${item.episode}` : '' }}
                </BaseBadge>
                <BaseBadge v-if="item.rating">★ {{ item.rating }}/10</BaseBadge>
                <BaseBadge v-for="tag in item.tags" :key="tag">{{ tag }}</BaseBadge>
              </div>
              <p v-if="item.notes" class="notes">{{ item.notes }}</p>
              <footer class="card-footer">
                <select :value="item.status" @change="onWatchStatus(item, $event.target.value)">
                  <option v-for="s in watchStatuses" :key="s.id" :value="s.id">{{ s.label }}</option>
                </select>
                <BaseButton size="sm" @click="openEditWatch(item)">Edit</BaseButton>
                <BaseButton size="sm" variant="danger" @click="onDeleteWatch(item)">Delete</BaseButton>
              </footer>
            </BaseCard>
          </div>
          <BaseEmptyState
            v-else
            variant="inline"
            title="Nothing in this watchlist view."
          />
        </section>
      </div>
    </DesktopRequired>

    <BaseModal
      :open="modalOpen"
      :title="modalTitle"
      @update:open="modalOpen = $event"
      @close="closeModal"
    >
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
    </BaseModal>
  </ModuleShell>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import GameFormModal from '@/modules/media/components/GameFormModal.vue'
import WatchFormModal from '@/modules/media/components/WatchFormModal.vue'
import HubActionMenu from '@/components/HubActionMenu.vue'
import DesktopRequired from '@/components/DesktopRequired.vue'
import ModuleShell from '@/components/ui/ModuleShell.vue'
import ModuleToolbar from '@/components/ui/ModuleToolbar.vue'
import BaseTabs from '@/components/ui/BaseTabs.vue'
import BasePill from '@/components/ui/BasePill.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import SearchInput from '@/components/ui/SearchInput.vue'
import { useToast } from '@/composables/useToast.js'
import { useHubHighlight } from '@/composables/useHubHighlight.js'
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

const route = useRoute()
const { success, error: toastError } = useToast()
const { applyHighlight } = useHubHighlight()

const activeTab = ref('games')
const gameFilter = ref('all')
const watchFilter = ref('all')
const search = ref('')
const games = ref([])
const watchlist = ref([])
const listRef = ref(null)

const gameStatuses = GAME_STATUSES
const watchStatuses = WATCH_STATUSES

const modalOpen = ref(false)
const modalKind = ref('game')
const modalMode = ref('add')
const editingGame = ref(createEmptyGame())
const editingWatch = ref(createEmptyWatchItem())

const tabs = computed(() => [
  { id: 'games', label: 'Games', badge: games.value.length },
  { id: 'watchlist', label: 'Movies & Series', badge: watchlist.value.length }
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
    success(`Saved "${payload.title}".`)
  } catch (e) {
    toastError(e.message)
  }
}

async function onSaveWatch(item) {
  try {
    const payload = { ...item }
    if (!payload.id) payload.id = newWatchId()
    await saveWatchItem(payload)
    await refresh()
    closeModal()
    success(`Saved "${payload.title}".`)
  } catch (e) {
    toastError(e.message)
  }
}

async function onDeleteGame(game) {
  if (!confirm(`Delete "${game.title}"?`)) return
  await deleteGame(game.id)
  await refresh()
  success('Game removed.')
}

async function onDeleteWatch(item) {
  if (!confirm(`Delete "${item.title}"?`)) return
  await deleteWatchItem(item.id)
  await refresh()
  success('Removed from watchlist.')
}

async function onGameStatus(game, status) {
  await saveGame({ ...game, status })
  await refresh()
}

async function onWatchStatus(item, status) {
  await saveWatchItem({ ...item, status })
  await refresh()
}

function onHubAction(action) {
  success(`Done: ${action}`)
  refresh()
}

function onHubError(err) {
  toastError(err)
}

onMounted(async () => {
  await refresh()
  if (route.query.action === 'add') openAdd()
  await applyHighlight(listRef)
})

watch(() => route.query.highlight, () => applyHighlight(listRef))
</script>

<style scoped>
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-3);
}

.media-card {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.card-head {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
  align-items: flex-start;
}

.card-head h3 {
  font-size: var(--text-body);
  font-weight: 600;
}

.card-head-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}

.desc {
  font-size: var(--text-small);
  color: var(--text-faint);
  line-height: 1.4;
}

.notes {
  font-size: var(--text-caption);
  color: var(--text-faint);
  font-style: italic;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.card-footer {
  display: flex;
  gap: var(--space-2);
  margin-top: auto;
  padding-top: var(--space-1);
  flex-wrap: wrap;
}

.card-footer select {
  flex: 1;
  min-width: 100px;
  background: var(--surface-base);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: var(--text-caption);
  padding: 6px 8px;
}
</style>
