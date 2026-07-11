<template>
  <form class="app-form" novalidate @submit.prevent="onSubmit">
    <p v-if="error" class="form-error">{{ error }}</p>

    <div class="form-grid">
      <label class="field span-2">
        <span>Title (display name)</span>
        <input v-model="form.title" type="text" placeholder="Game Marketplace" />
      </label>

      <label class="field">
        <span>Internal name</span>
        <input v-model="form.name" type="text" placeholder="game-marketplace" />
      </label>

      <label class="field">
        <span>Runtime</span>
        <select v-model="form.runtime">
          <option value="node">Node</option>
          <option value="python">Python</option>
          <option value="rust">Rust</option>
          <option value="other">Other</option>
        </select>
      </label>

      <label class="field span-2">
        <span>Description</span>
        <textarea
          v-model="form.description"
          rows="3"
          placeholder="What this project does..."
        />
      </label>

      <label class="field span-2">
        <span>Project folder</span>
        <div class="path-row">
          <input v-model="form.rootPath" type="text" placeholder="C:/Users/.../WOrK/MyProject" />
          <button type="button" class="btn secondary" @click="$emit('pick-folder')">Browse</button>
        </div>
      </label>

      <label class="field span-2">
        <span>Install command</span>
        <input v-model="form.installCmd" type="text" placeholder="npm install" />
      </label>

      <label class="field span-2">
        <span>Start command</span>
        <input v-model="form.startCmd" type="text" placeholder="npm run dev" />
      </label>

      <label class="field">
        <span>Port (optional)</span>
        <input v-model="portInput" type="text" inputmode="numeric" placeholder="5173" />
      </label>

      <label class="field">
        <span>Tags (comma-separated)</span>
        <input v-model="tagsInput" type="text" placeholder="work, games" />
      </label>

      <label class="checkbox span-2">
        <input v-model="form.openTerminal" type="checkbox" />
        <span>Open in terminal window when running commands</span>
      </label>

      <label class="checkbox span-2">
        <input v-model="form.enabled" type="checkbox" />
        <span>Enabled (show in launcher)</span>
      </label>
    </div>

    <div class="actions">
      <button type="button" class="btn ghost" @click="$emit('cancel')">Cancel</button>
      <button type="button" class="btn primary" :disabled="saving" @click="onSubmit">
        {{ saving ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Add app' }}
      </button>
    </div>
  </form>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { slugify } from '@/services/launcher.js'

const props = defineProps({
  app: { type: Object, required: true },
  mode: { type: String, default: 'add' },
  error: { type: String, default: '' }
})

const emit = defineEmits(['save', 'cancel', 'pick-folder'])

const form = reactive({ ...props.app })
const saving = ref(false)

const tagsInput = computed({
  get: () => (Array.isArray(form.tags) ? form.tags.join(', ') : form.tags || ''),
  set: value => {
    form.tags = value.split(',').map(t => t.trim()).filter(Boolean)
  }
})

const portInput = computed({
  get: () => (form.port == null || form.port === '' ? '' : String(form.port)),
  set: value => {
    const trimmed = value.trim()
    if (!trimmed) {
      form.port = null
      return
    }
    const parsed = Number.parseInt(trimmed, 10)
    form.port = Number.isFinite(parsed) ? parsed : null
  }
})

watch(
  () => props.app,
  value => Object.assign(form, value),
  { deep: true }
)

watch(
  () => props.error,
  () => { saving.value = false }
)

function parsePort(value) {
  if (value == null || value === '') return null
  const parsed = Number.parseInt(String(value), 10)
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 65535 ? parsed : null
}

function onSubmit() {
  const title = form.title?.trim()
  const rootPath = form.rootPath?.trim()

  if (!title) {
    emit('save', null, 'Title is required.')
    return
  }
  if (!rootPath) {
    emit('save', null, 'Project folder is required.')
    return
  }

  const folderParts = rootPath.replace(/\\/g, '/').split('/')
  const folderName = folderParts[folderParts.length - 1] || title
  const internalName = slugify(form.name?.trim() || folderName || title) || slugify(title) || 'app'

  saving.value = true
  emit('save', {
    ...form,
    title,
    name: internalName,
    rootPath,
    folderName: form.folderName?.trim() || folderName,
    port: parsePort(form.port),
    autoDiscovered: false
  })
}
</script>

<style scoped>
.app-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-error {
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(127, 29, 29, 0.25);
  border: 1px solid #991b1b;
  color: #fca5a5;
  font-size: 13px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: #94a3b8;
}

.field input,
.field select,
.field textarea {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  color: #e2e8f0;
  padding: 10px 12px;
  font-size: 14px;
}

.field textarea {
  resize: vertical;
  min-height: 72px;
}

.span-2 {
  grid-column: span 2;
}

.path-row {
  display: flex;
  gap: 8px;
}

.path-row input {
  flex: 1;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #cbd5e1;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn {
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn.primary {
  background: #2563eb;
  color: #fff;
}

.btn.secondary {
  background: #1e293b;
  border-color: #334155;
  color: #e2e8f0;
}

.btn.ghost {
  background: transparent;
  border-color: #334155;
  color: #94a3b8;
}
</style>
