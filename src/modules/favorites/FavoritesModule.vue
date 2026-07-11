<template>
  <ModuleShell max-width="960px" accent="favorites">
    <template #toolbar>
      <ModuleToolbar>
        <template #center>
          <SearchInput
            v-model="search"
            placeholder="Search favorites, apps, modules…"
          />
        </template>
        <template #trailing>
          <BaseButton :class="{ active: editMode }" @click="editMode = !editMode">
            {{ editMode ? 'Done' : 'Edit' }}
          </BaseButton>
          <BaseButton variant="primary" @click="openAdd">Add</BaseButton>
        </template>
      </ModuleToolbar>
    </template>

    <DesktopRequired>
      <div class="favorites-content" tabindex="0" @keydown="onKeydown">
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
                  <BaseButton size="sm" @click="openEdit(fav)">Edit</BaseButton>
                  <BaseButton size="sm" variant="danger" @click="onDelete(fav)">×</BaseButton>
                </div>
              </div>
            </div>
          </div>
        </section>

        <BaseEmptyState
          v-else
          title="No favorites match"
          description="Add shortcuts to modules, apps, links, or folders."
        >
          <template #action>
            <BaseButton variant="primary" @click="openAdd">Add favorite</BaseButton>
          </template>
        </BaseEmptyState>

        <BaseCard v-if="editMode && apps.length" variant="dashed" class="pin-apps">
          <h3>Pin from launcher</h3>
          <p class="hint">Quick-add registered apps to your Start panel.</p>
          <div class="app-chips">
            <BaseButton
              v-for="app in apps"
              :key="app.id"
              size="sm"
              variant="ghost"
              @click="onPinApp(app)"
            >
              + {{ app.title }}
            </BaseButton>
          </div>
        </BaseCard>
      </div>
    </DesktopRequired>

    <BaseModal
      :open="modalOpen"
      :title="modalMode === 'edit' ? 'Edit favorite' : 'Add favorite'"
      size="md"
      @update:open="modalOpen = $event"
      @close="closeModal"
    >
      <FavoriteFormModal
        :favorite="editing"
        :mode="modalMode"
        :apps="apps"
        :group-suggestions="groupNames"
        @save="onSave"
        @cancel="closeModal"
      />
    </BaseModal>
  </ModuleShell>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import FavoriteFormModal from '@/modules/favorites/components/FavoriteFormModal.vue'
import FavoriteTile from '@/modules/favorites/components/FavoriteTile.vue'
import ModuleShell from '@/components/ui/ModuleShell.vue'
import ModuleToolbar from '@/components/ui/ModuleToolbar.vue'
import SearchInput from '@/components/ui/SearchInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import DesktopRequired from '@/components/DesktopRequired.vue'
import { useToast } from '@/composables/useToast.js'
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
const { success, error: toastError, info } = useToast()

const favorites = ref([])
const hubTiles = ref([])
const apps = ref([])
const search = ref('')
const editMode = ref(false)
const focusIndex = ref(0)
const dragFrom = ref(null)
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
    success(`Saved "${payload.label}".`)
  } catch (e) {
    toastError(e.message)
  }
}

async function onDelete(fav) {
  if (!confirm(`Remove "${fav.label}" from favorites?`)) return
  await deleteFavorite(fav.id)
  await refresh()
  success(`Removed "${fav.label}".`)
}

async function onLaunch(fav) {
  if (editMode.value) return
  try {
    const result = await launchFavorite(fav, router)
    if (result.action === 'navigate') {
      success(`Opened ${fav.label}.`)
    } else if (result.action === 'start') {
      info(`Starting ${result.app}…`)
    } else {
      success(`Launched ${fav.label}.`)
    }
  } catch (e) {
    toastError(e.message)
  }
}

async function onPinApp(app) {
  try {
    await pinAppAsFavorite(app)
    await refresh()
    success(`Pinned "${app.title}" to Apps.`)
  } catch (e) {
    toastError(e.message)
  }
}

onMounted(async () => {
  await seedDefaultFavorites()
  apps.value = await getAppsForPicker()
  await refresh()
})
</script>

<style scoped>
.favorites-content {
  outline: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.base-btn.active {
  border-color: var(--accent-favorites);
  color: var(--accent-favorites);
}

.groups {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.group-title {
  font-size: var(--text-caption);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-faint);
  margin-bottom: var(--space-3);
}

.tile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(108px, 1fr));
  gap: var(--space-3);
}

.tile-wrap {
  position: relative;
}

.tile-wrap.focused :deep(.tile) {
  outline: 2px solid var(--accent-favorites);
  outline-offset: 2px;
}

.tile-wrap[draggable="true"] {
  cursor: grab;
}

.edit-actions {
  display: flex;
  justify-content: center;
  gap: var(--space-1);
  margin-top: var(--space-1);
}

.pin-apps {
  padding: var(--space-5);
}

.pin-apps h3 {
  font-size: var(--text-body);
  margin-bottom: var(--space-2);
}

.hint {
  font-size: var(--text-caption);
  color: var(--text-faint);
  margin-bottom: var(--space-3);
}

.app-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
</style>
