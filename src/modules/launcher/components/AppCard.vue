<template>
  <article class="app-card" :class="{ disabled: !app.enabled }">
    <header class="card-head">
      <div>
        <h3>{{ app.title }}</h3>
        <p class="folder">{{ app.folderName || app.name }}</p>
      </div>
      <div class="badges">
        <span class="badge runtime">{{ app.runtime }}</span>
        <span v-if="app.autoDiscovered" class="badge auto">auto</span>
        <span v-if="!app.enabled" class="badge off">disabled</span>
      </div>
    </header>

    <p v-if="app.description" class="desc">{{ app.description }}</p>
    <p v-else class="desc muted">No description yet — click Edit to add one.</p>

    <dl class="meta">
      <div v-if="app.installCmd">
        <dt>Install</dt>
        <dd><code>{{ app.installCmd }}</code></dd>
      </div>
      <div v-if="app.startCmd">
        <dt>Start</dt>
        <dd><code>{{ app.startCmd }}</code></dd>
      </div>
      <div v-if="app.port">
        <dt>Port</dt>
        <dd>{{ app.port }}</dd>
      </div>
    </dl>

    <div v-if="app.tags?.length" class="tags">
      <span v-for="tag in app.tags" :key="tag" class="tag">{{ tag }}</span>
    </div>

    <footer class="card-actions">
      <button class="btn primary" :disabled="!app.startCmd" @click="$emit('start', app)">Start</button>
      <button class="btn" :disabled="!app.installCmd" @click="$emit('install', app)">Install</button>
      <button class="btn" @click="$emit('open-folder', app)">Folder</button>
      <button class="btn" @click="$emit('edit', app)">Edit</button>
      <button class="btn danger" @click="$emit('delete', app)">Delete</button>
    </footer>
  </article>
</template>

<script setup>
defineProps({
  app: { type: Object, required: true }
})

defineEmits(['start', 'install', 'open-folder', 'edit', 'delete'])
</script>

<style scoped>
.app-card {
  background: #0f172a;
  border: 1px solid #1f2937;
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.app-card.disabled {
  opacity: 0.65;
}

.card-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.card-head h3 {
  font-size: 16px;
  font-weight: 600;
}

.folder {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
  word-break: break-all;
}

.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
}

.badge {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-radius: 999px;
  padding: 3px 8px;
  border: 1px solid #334155;
  color: #94a3b8;
}

.badge.runtime {
  color: #93c5fd;
  border-color: #1d4ed8;
}

.badge.auto {
  color: #86efac;
  border-color: #166534;
}

.badge.off {
  color: #fca5a5;
  border-color: #991b1b;
}

.desc {
  font-size: 13px;
  color: #cbd5e1;
  line-height: 1.45;
}

.desc.muted {
  color: #64748b;
  font-style: italic;
}

.meta {
  display: grid;
  gap: 8px;
  font-size: 12px;
}

.meta dt {
  color: #64748b;
  margin-bottom: 2px;
}

.meta code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: #bfdbfe;
  word-break: break-all;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  font-size: 11px;
  background: #1e293b;
  color: #94a3b8;
  border-radius: 999px;
  padding: 3px 8px;
}

.card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: auto;
  padding-top: 4px;
}

.btn {
  background: #1e293b;
  border: 1px solid #334155;
  color: #e2e8f0;
  border-radius: 8px;
  padding: 7px 11px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.btn.danger {
  color: #fca5a5;
  border-color: #7f1d1d;
}
</style>
