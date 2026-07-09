<template>
  <DesktopRequired>
  <div class="favorites-panel" tabindex="0" @keydown="onKeydown">
    <header class="start-header">
      <div class="search-wrap">
        <span class="search-icon">⌕</span>
        <input
          v-model="search"
          type="search"
          class="search"
          placeholder="Search favorites, apps, modules…"
          autofocus
        />
      </div>
      <div class="header-actions">
        <button class="btn" :class="{ active: editMode }" @click="editMode = !editMode">
          {{ editMode ? 'Done' : 'Edit' }}
        </button>
        <button class="btn primary" @click="openAdd">Add</button>
      </div>
    </header>

    <p v-if="message" class="message" :class="messageType">{{ message }}</p>

    <section v-if="filteredGroups.length" class="groups">
      <div v-for="group in filteredGroups" :key="group.name" class="group">
        <h3 class="group-title">{{ group.name }}</h3>
        <div class="tile-grid">
          <div
            v-for="(fav, idx) in group.items"
            :key="fav.id"
            class="tile-wrap"
            :class="{ focused: flatIndex(group.name, idx) === focusIndex }"
            :draggable="editMode && !fav.dynamic"
            @dragstart="onDragStart(group.name, idx)"
            @dragover.prevent
            @drop="onDrop(group.name, idx)"
          >
            <FavoriteTile :favorite="fav" @launch="onLaunch" />
            <div v-if="editMode" class="edit-actions">
              <button class="mini" @click="openEdit(fav)">Edit</button>
              <button class="mini danger" @click="onDelete(fav)">×</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section v-else class="empty">
      <h3>No favorites match</h3>
      <p>Add shortcuts to modules, apps, links, or folders.</p>
      <button class="btn primary" @click="openAdd">Add favorite</button>
    </section>

    <section v-if="editMode && apps.length" class="pin-apps">
      <h3>Pin from launcher</h3>
      <p class="hint">Quick-add registered apps to your Start panel.</p>
      <div class="app-chips">
        <button
          v-for="app in apps"
          :key="app.id"
          class="chip"
          @click="onPinApp(app)"
        >
          + {{ app.title }}
        </button>
      </div>
    </section>

    <div v-if="modalOpen" class="modal-backdrop" @click.self="closeModal">
      <div class="modal">
        <header>
          <h2>{{ modalMode === 'edit' ? 'Edit favorite' : 'Add favorite' }}</h2>
          <button class="close" @click="closeModal">×</button>
        </header>
        <FavoriteFormModal
          :favorite="editing"
          :mode="modalMode"
          :apps="apps"
          :group-suggestions="groupNames"
          @save="onSave"
          @cancel="closeModal"
        />
      </div>
    </div>
  </div>
  </DesktopRequired>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import FavoriteFormModal from '@/modules/favorites/components/FavoriteFormModal.vue'
import FavoriteTile from '@/modules/favorites/components/FavoriteTile.vue'
import DesktopRequired from '@/components/DesktopRequired.vue'
import { getHubDynamicTiles } from '@/services/hubContext.js'
import {
  createEmptyFavorite,
  deleteFavorite,
  groupFavorites,
  launchFavorite,
  listAllFavorites,
  newFavoriteId,
  pinAppAsFavorite,
  reorderFavorites,
  saveFavorite,
  seedDefaultFavorites,
  getAppsForPicker
} from '@/services/favorites.js'
import { pickProjectFolder } from '@/services/launcher.js'

const router = useRouter()
const favorites = ref([])
const hubTiles = ref([])
const apps = ref([])
const search = ref('')
const editMode = ref(false)
const focusIndex = ref(0)
const dragFrom = ref(null)
const message = ref('')
const messageType = ref('info')
const modalOpen = ref(false)
const modalMode = ref('add')
const editing = ref(createEmptyFavorite())

const groups = computed(() => {
  const base = groupFavorites(favorites.value)
  if (!hubTiles.value.length) return base

  const hubGroup = {
    name: 'From your hub',
    items: hubTiles.value
  }
  const withoutHub = base.filter(g => g.name !== 'From your hub')
  return [hubGroup, ...withoutHub]
})

const groupNames = computed(() => {
  const names = new Set(groups.value.map(g => g.name))
  ;['Pinned', 'Modules', 'Apps', 'Links'].forEach(n => names.add(n))
  return Array.from(names)
})

const filteredGroups = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return groups.value

  return groups.value
    .map(group => ({
      ...group,
      items: group.items.filter(fav =>
        [fav.label, fav.description, fav.groupName, fav.targetType, fav.targetId]
          .join(' ')
          .toLowerCase()
          .includes(q)
      )
    }))
    .filter(g => g.items.length > 0)
})

const flatTiles = computed(() =>
  filteredGroups.value.flatMap(g => g.items)
)

function flatIndex(groupName, itemIndex) {
  let idx = 0
  for (const group of filteredGroups.value) {
    if (group.name === groupName) return idx + itemIndex
    idx += group.items.length
  }
  return 0
}

function onKeydown(e) {
  const total = flatTiles.value.length
  if (!total) return

  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault()
    focusIndex.value = (focusIndex.value + 1) % total
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault()
    focusIndex.value = (focusIndex.value - 1 + total) % total
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const fav = flatTiles.value[focusIndex.value]
    if (fav) onLaunch(fav)
  }
}

function onDragStart(groupName, index) {
  dragFrom.value = { groupName, index }
}

async function onDrop(groupName, index) {
  if (!dragFrom.value || dragFrom.value.groupName !== groupName) return
  const group = favorites.value.filter(f => f.groupName === groupName && f.enabled)
  group.sort((a, b) => a.sortOrder - b.sortOrder)
  const from = dragFrom.value.index
  if (from === index) return
  const [moved] = group.splice(from, 1)
  group.splice(index, 0, moved)
  await reorderFavorites(group.map(f => f.id))
  dragFrom.value = null
  await refresh()
}

function setMessage(text, type = 'info') {
  message.value = text
  messageType.value = type
}

async function refresh() {
  favorites.value = await listAllFavorites()
  hubTiles.value = await getHubDynamicTiles()
}

function openAdd() {
  editing.value = createEmptyFavorite()
  modalMode.value = 'add'
  modalOpen.value = true
}

function openEdit(fav) {
  editing.value = { ...fav }
  modalMode.value = 'edit'
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
}

async function onSave(fav) {
  try {
    const payload = { ...fav }
    if (!payload.id) payload.id = newFavoriteId()

    if (payload.targetType === 'folder' && !payload.targetId) {
      const picked = await pickProjectFolder()
      if (!picked) return
      payload.targetId = picked
      if (!payload.label) {
        const parts = picked.replace(/\\/g, '/').split('/')
        payload.label = parts[parts.length - 1] || 'Folder'
      }
    }

    await saveFavorite(payload)
    await refresh()
    closeModal()
    setMessage(`Saved "${payload.label}".`, 'success')
  } catch (e) {
    setMessage(e.message, 'error')
  }
}

async function onDelete(fav) {
  if (!confirm(`Remove "${fav.label}" from favorites?`)) return
  await deleteFavorite(fav.id)
  await refresh()
  setMessage(`Removed "${fav.label}".`, 'success')
}

async function onLaunch(fav) {
  if (editMode.value) return
  try {
    const result = await launchFavorite(fav, router)
    if (result.action === 'navigate') {
      setMessage(`Opened ${fav.label}.`, 'success')
    } else if (result.action === 'start') {
      setMessage(`Starting ${result.app}…`, 'success')
    } else {
      setMessage(`Launched ${fav.label}.`, 'success')
    }
  } catch (e) {
    setMessage(e.message, 'error')
  }
}

async function onPinApp(app) {
  try {
    await pinAppAsFavorite(app)
    await refresh()
    setMessage(`Pinned "${app.title}" to Apps.`, 'success')
  } catch (e) {
    setMessage(e.message, 'error')
  }
}

onMounted(async () => {
  await seedDefaultFavorites()
  apps.value = await getAppsForPicker()
  await refresh()
})
</script>

<style scoped>
.favorites-panel {
  padding: 24px;
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  outline: none;
}

.start-header {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.search-wrap {
  flex: 1;
  min-width: 240px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 0 14px;
}

.search-icon {
  color: #64748b;
  font-size: 18px;
}

.search {
  flex: 1;
  background: transparent;
  border: none;
  color: #e2e8f0;
  font-size: 15px;
  padding: 14px 0;
  outline: none;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.btn {
  background: #1e293b;
  border: 1px solid #334155;
  color: #e2e8f0;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.btn.active {
  border-color: #3b82f6;
  color: #93c5fd;
}

.btn.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.message {
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
}

.message.success {
  background: rgba(22, 101, 52, 0.25);
  border: 1px solid #166534;
  color: #86efac;
}

.message.error {
  background: rgba(127, 29, 29, 0.25);
  border: 1px solid #991b1b;
  color: #fca5a5;
}

.groups {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.group-title {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #64748b;
  margin-bottom: 12px;
}

.tile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(108px, 1fr));
  gap: 10px;
}

.tile-wrap {
  position: relative;
}

.tile-wrap.focused :deep(.tile) {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.tile-wrap[draggable="true"] {
  cursor: grab;
}

.edit-actions {
  display: flex;
  justify-content: center;
  gap: 4px;
  margin-top: 4px;
}

.mini {
  background: #1e293b;
  border: 1px solid #334155;
  color: #94a3b8;
  border-radius: 6px;
  padding: 2px 8px;
  font-size: 11px;
  cursor: pointer;
}

.mini.danger {
  color: #fca5a5;
  border-color: #7f1d1d;
}

.empty {
  text-align: center;
  padding: 48px 24px;
  border: 1px dashed #334155;
  border-radius: 14px;
  color: #94a3b8;
}

.empty h3 {
  color: #e2e8f0;
  margin-bottom: 8px;
}

.pin-apps {
  border-top: 1px solid #1f2937;
  padding-top: 20px;
}

.pin-apps h3 {
  font-size: 14px;
  margin-bottom: 6px;
}

.hint {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 10px;
}

.app-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  background: #0f172a;
  border: 1px dashed #475569;
  color: #cbd5e1;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
}

.chip:hover {
  border-color: #3b82f6;
  color: #93c5fd;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.75);
  display: grid;
  place-items: center;
  z-index: 100;
  padding: 24px;
}

.modal {
  width: min(560px, 100%);
  background: #111827;
  border: 1px solid #334155;
  border-radius: 14px;
  padding: 20px;
  max-height: 90vh;
  overflow: auto;
}

.modal header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}

.close {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 24px;
  cursor: pointer;
}
</style>
