<template>
  <div class="launcher">
    <section class="toolbar">
      <div class="work-folder">
        <label>WOrK folder</label>
        <div class="path-row">
          <input v-model="workFolder" type="text" />
          <button class="btn" :disabled="!isDesktop" @click="browseWorkFolder">Browse</button>
          <button class="btn primary" :disabled="loading || !isDesktop" @click="onScan">
            {{ loading ? 'Scanning…' : 'Scan for new projects' }}
          </button>
        </div>
        <p class="hint">
          Scans subfolders in WOrK and adds new repos automatically. Existing apps keep your custom commands.
        </p>
      </div>

      <div class="toolbar-actions">
        <input
          v-model="search"
          class="search"
          type="search"
          placeholder="Search apps…"
        />
        <button class="btn primary" @click="openAdd">Add app</button>
      </div>
    </section>

    <p v-if="message" class="message" :class="messageType">{{ message }}</p>
    <p v-if="!isDesktop" class="warning">
      Launcher scan and run commands need the desktop app. Use <code>npm run tauri:dev</code>.
    </p>

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
      />
    </section>

    <section v-else class="empty">
      <h3>No apps yet</h3>
      <p>Scan your WOrK folder or add a project manually.</p>
      <button class="btn primary" :disabled="!isDesktop" @click="onScan">Scan WOrK folder</button>
    </section>

    <div v-if="modalOpen" class="modal-backdrop" @click.self="closeModal">
      <div class="modal">
        <header>
          <h2>{{ modalMode === 'edit' ? 'Edit app' : 'Add app' }}</h2>
          <button class="close" @click="closeModal">×</button>
        </header>
        <AppFormModal
          :app="editingApp"
          :mode="modalMode"
          :error="modalError"
          @save="onSave"
          @cancel="closeModal"
          @pick-folder="onPickFolderForForm"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import AppCard from '@/modules/launcher/components/AppCard.vue'
import AppFormModal from '@/modules/launcher/components/AppFormModal.vue'
import { isTauri } from '@/services/platform.js'
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

const isDesktop = isTauri()
const apps = ref([])
const workFolder = ref('')
const search = ref('')
const loading = ref(false)
const message = ref('')
const messageType = ref('info')

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

function setMessage(text, type = 'info') {
  message.value = text
  messageType.value = type
}

async function refresh() {
  apps.value = await listApps()
}

async function loadWorkFolder() {
  workFolder.value = await getWorkFolder()
}

async function onScan() {
  loading.value = true
  setMessage('')
  try {
    await setWorkFolder(workFolder.value)
    const result = await syncWorkFolder()
    await refresh()
    setMessage(
      `Scan complete — ${result.added} added, ${result.updated} updated (${result.total} folders found).`,
      'success'
    )
  } catch (error) {
    setMessage(error.message || String(error), 'error')
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
    if (!payload.id) {
      payload.id = slugify(payload.name || payload.title || 'app')
    }
    if (!payload.folderName) {
      const parts = payload.rootPath.replace(/\\/g, '/').split('/')
      payload.folderName = parts[parts.length - 1] || payload.name
    }
    await saveApp(payload)
    await refresh()
    closeModal()
    setMessage(`Saved "${payload.title}".`, 'success')
  } catch (error) {
    const msg = error.message || String(error)
    modalError.value = msg
    setMessage(msg, 'error')
  }
}

async function onDelete(app) {
  if (!confirm(`Delete "${app.title}" from the launcher?`)) return
  try {
    await deleteApp(app.id)
    await refresh()
    setMessage(`Deleted "${app.title}".`, 'success')
  } catch (error) {
    setMessage(error.message || String(error), 'error')
  }
}

async function onStart(app) {
  try {
    await runAppCommand(app, 'start')
    setMessage(`Started "${app.title}" in terminal.`, 'success')
  } catch (error) {
    setMessage(error.message || String(error), 'error')
  }
}

async function onInstall(app) {
  try {
    await runAppCommand(app, 'install')
    setMessage(`Running install for "${app.title}".`, 'success')
  } catch (error) {
    setMessage(error.message || String(error), 'error')
  }
}

async function onOpenFolder(app) {
  try {
    await openAppFolder(app)
  } catch (error) {
    setMessage(error.message || String(error), 'error')
  }
}

onMounted(async () => {
  await loadWorkFolder()
  await refresh()
  if (isDesktop) {
    try {
      if (apps.value.length === 0) {
        await onScan()
      }
    } catch (error) {
      setMessage(error.message || String(error), 'error')
    }
  }
})
</script>

<style scoped>
.launcher {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.toolbar {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #0f172a;
  border: 1px solid #1f2937;
  border-radius: 14px;
  padding: 16px;
}

.work-folder label {
  display: block;
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 8px;
}

.path-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.path-row input {
  flex: 1;
  min-width: 240px;
  background: #0b1220;
  border: 1px solid #334155;
  border-radius: 8px;
  color: #e2e8f0;
  padding: 10px 12px;
}

.hint {
  margin-top: 8px;
  font-size: 12px;
  color: #64748b;
  line-height: 1.45;
}

.toolbar-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.search {
  flex: 1;
  min-width: 200px;
  background: #0b1220;
  border: 1px solid #334155;
  border-radius: 8px;
  color: #e2e8f0;
  padding: 10px 12px;
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

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.message.info {
  background: rgba(30, 58, 138, 0.25);
  border: 1px solid #1d4ed8;
  color: #93c5fd;
}

.warning {
  background: rgba(120, 53, 15, 0.25);
  border: 1px solid #92400e;
  color: #fcd34d;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
}

.warning code {
  color: #fde68a;
}

.app-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 14px;
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

.empty p {
  margin-bottom: 16px;
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
  width: min(720px, 100%);
  max-height: 90vh;
  overflow: auto;
  background: #111827;
  border: 1px solid #334155;
  border-radius: 14px;
  padding: 20px;
}

.modal header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.modal h2 {
  font-size: 18px;
}

.close {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 24px;
  cursor: pointer;
  line-height: 1;
}
</style>
