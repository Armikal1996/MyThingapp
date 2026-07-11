<template>
  <ModuleShell sticky-toolbar accent="launcher">
    <template #toolbar>
      <ModuleToolbar>
        <template #leading>
          <div class="work-folder">
            <BaseField label="WOrK folder">
              <div class="path-row">
                <input v-model="workFolder" type="text" class="field-input" />
                <BaseButton :disabled="!isDesktop" @click="browseWorkFolder">Browse</BaseButton>
                <BaseButton variant="primary" :disabled="loading || !isDesktop" @click="onScan">
                  {{ loading ? 'Scanning…' : 'Scan for new projects' }}
                </BaseButton>
              </div>
            </BaseField>
            <p class="hint">
              Scans subfolders in WOrK and adds new repos automatically. Existing apps keep your custom commands.
            </p>
          </div>
        </template>
        <template #center>
          <SearchInput v-model="search" placeholder="Search apps…" />
        </template>
        <template #trailing>
          <BaseButton variant="primary" @click="openAdd">Add app</BaseButton>
        </template>
      </ModuleToolbar>
    </template>

    <DesktopRequired soft message="Launcher scan and run commands need the desktop app.">
      <div ref="listRef" class="launcher-content">
        <section v-if="filteredApps.length" class="app-grid">
          <AppCard
            v-for="app in filteredApps"
            :key="app.id"
            :app="app"
            @start="onStart"
            @install="onInstall"
            @open-folder="onOpenFolder"
            @edit="openEdit"
            @delete="onDelete"
            @hub-error="onHubError"
          />
        </section>

        <BaseEmptyState
          v-else
          title="No apps yet"
          description="Scan your WOrK folder or add a project manually."
        >
          <template #action>
            <BaseButton variant="primary" :disabled="!isDesktop" @click="onScan">Scan WOrK folder</BaseButton>
          </template>
        </BaseEmptyState>
      </div>
    </DesktopRequired>

    <BaseModal
      :open="modalOpen"
      :title="modalMode === 'edit' ? 'Edit app' : 'Add app'"
      size="lg"
      @update:open="modalOpen = $event"
      @close="closeModal"
    >
      <AppFormModal
        :app="editingApp"
        :mode="modalMode"
        :error="modalError"
        @save="onSave"
        @cancel="closeModal"
        @pick-folder="onPickFolderForForm"
      />
    </BaseModal>
  </ModuleShell>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppCard from '@/modules/launcher/components/AppCard.vue'
import AppFormModal from '@/modules/launcher/components/AppFormModal.vue'
import ModuleShell from '@/components/ui/ModuleShell.vue'
import ModuleToolbar from '@/components/ui/ModuleToolbar.vue'
import SearchInput from '@/components/ui/SearchInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import DesktopRequired from '@/components/DesktopRequired.vue'
import { isTauri } from '@/services/platform.js'
import { useToast } from '@/composables/useToast.js'
import { useHubHighlight } from '@/composables/useHubHighlight.js'
import {
  createEmptyApp,
  deleteApp,
  getWorkFolder,
  listApps,
  openAppFolder,
  pickProjectFolder,
  pickWorkFolder,
  runAppCommand,
  saveApp,
  setWorkFolder,
  slugify,
  syncWorkFolder
} from '@/services/launcher.js'

const route = useRoute()
const { success, error: toastError, info } = useToast()
const { applyHighlight } = useHubHighlight()

const isDesktop = isTauri()
const apps = ref([])
const workFolder = ref('')
const search = ref('')
const loading = ref(false)
const listRef = ref(null)

const modalOpen = ref(false)
const modalMode = ref('add')
const modalError = ref('')
const editingApp = ref(createEmptyApp())

const filteredApps = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return apps.value
  return apps.value.filter(app =>
    [app.title, app.name, app.description, app.folderName, app.runtime, ...(app.tags || [])]
      .join(' ')
      .toLowerCase()
      .includes(q)
  )
})

async function refresh() {
  apps.value = await listApps()
}

async function loadWorkFolder() {
  workFolder.value = await getWorkFolder()
}

async function onScan() {
  loading.value = true
  try {
    await setWorkFolder(workFolder.value)
    const result = await syncWorkFolder()
    await refresh()
    success(`Scan complete — ${result.added} added, ${result.updated} updated (${result.total} folders found).`)
  } catch (err) {
    toastError(err.message || String(err))
  } finally {
    loading.value = false
  }
}

async function browseWorkFolder() {
  const picked = await pickWorkFolder()
  if (picked) {
    workFolder.value = picked
    await setWorkFolder(picked)
  }
}

function openAdd() {
  modalError.value = ''
  editingApp.value = createEmptyApp({
    id: '',
    installCmd: 'npm install',
    startCmd: 'npm run dev'
  })
  modalMode.value = 'add'
  modalOpen.value = true
}

function openEdit(app) {
  modalError.value = ''
  editingApp.value = { ...app, tags: [...(app.tags || [])] }
  modalMode.value = 'edit'
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  modalError.value = ''
}

async function onPickFolderForForm() {
  const picked = await pickProjectFolder()
  if (!picked) return
  editingApp.value.rootPath = picked
  const parts = picked.replace(/\\/g, '/').split('/')
  const folder = parts[parts.length - 1] || ''
  if (!editingApp.value.name) editingApp.value.name = slugify(folder)
  if (!editingApp.value.title) editingApp.value.title = folder
  if (!editingApp.value.folderName) editingApp.value.folderName = folder
  if (!editingApp.value.id) editingApp.value.id = slugify(folder)
}

async function onSave(app, validationError = null) {
  if (validationError) {
    modalError.value = validationError
    return
  }
  if (!app) return
  modalError.value = ''
  try {
    const payload = { ...app }
    if (!payload.id) payload.id = slugify(payload.name || payload.title || 'app')
    if (!payload.folderName) {
      const parts = payload.rootPath.replace(/\\/g, '/').split('/')
      payload.folderName = parts[parts.length - 1] || payload.name
    }
    await saveApp(payload)
    await refresh()
    closeModal()
    success(`Saved "${payload.title}".`)
  } catch (err) {
    modalError.value = err.message || String(err)
    toastError(modalError.value)
  }
}

async function onDelete(app) {
  if (!confirm(`Delete "${app.title}" from the launcher?`)) return
  try {
    await deleteApp(app.id)
    await refresh()
    success(`Deleted "${app.title}".`)
  } catch (err) {
    toastError(err.message || String(err))
  }
}

async function onStart(app) {
  try {
    await runAppCommand(app, 'start')
    success(`Started "${app.title}" in terminal.`)
  } catch (err) {
    toastError(err.message || String(err))
  }
}

async function onInstall(app) {
  try {
    await runAppCommand(app, 'install')
    info(`Running install for "${app.title}".`)
  } catch (err) {
    toastError(err.message || String(err))
  }
}

async function onOpenFolder(app) {
  try {
    await openAppFolder(app)
  } catch (err) {
    toastError(err.message || String(err))
  }
}

function onHubError(msg) {
  toastError(msg)
}

onMounted(async () => {
  await loadWorkFolder()
  await refresh()
  if (route.query.action === 'add') openAdd()
  await applyHighlight(listRef)
  if (isDesktop) {
    try {
      if (apps.value.length === 0) await onScan()
    } catch (err) {
      toastError(err.message || String(err))
    }
  }
})

watch(() => route.query.highlight, () => applyHighlight(listRef))
</script>

<style scoped>
.work-folder {
  width: 100%;
}

.path-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.path-row input {
  flex: 1;
  min-width: 240px;
}

.hint {
  margin-top: var(--space-2);
  font-size: var(--text-caption);
  color: var(--text-faint);
  line-height: 1.45;
}

.app-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-3);
}
</style>
