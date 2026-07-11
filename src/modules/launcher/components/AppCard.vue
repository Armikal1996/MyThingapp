<template>
  <BaseCard
    class="app-card"
    :class="{ disabled: !app.enabled }"
    accent="var(--accent-launcher)"
    :data-highlight-id="app.id"
  >
    <header class="card-head">
      <div>
        <h3>{{ app.title }}</h3>
        <p class="folder">{{ app.folderName || app.name }}</p>
      </div>
      <div class="head-right">
        <HubActionMenu item-type="app" :item="app" @error="$emit('hub-error', $event)" />
        <div class="badges">
          <BaseBadge>{{ app.runtime }}</BaseBadge>
          <BaseBadge v-if="app.autoDiscovered" variant="success">auto</BaseBadge>
          <BaseBadge v-if="!app.enabled" variant="danger">off</BaseBadge>
        </div>
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
      <BaseButton variant="primary" size="sm" :disabled="!app.startCmd" @click="$emit('start', app)">Start</BaseButton>
      <BaseButton size="sm" :disabled="!app.installCmd" @click="$emit('install', app)">Install</BaseButton>
      <BaseButton size="sm" @click="$emit('open-folder', app)">Folder</BaseButton>
      <BaseButton size="sm" @click="$emit('edit', app)">Edit</BaseButton>
      <BaseButton size="sm" variant="danger" @click="$emit('delete', app)">Delete</BaseButton>
    </footer>
  </BaseCard>
</template>

<script setup>
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import HubActionMenu from '@/components/HubActionMenu.vue'

defineProps({
  app: { type: Object, required: true }
})

defineEmits(['start', 'install', 'open-folder', 'edit', 'delete', 'hub-error'])
</script>

<style scoped>
.app-card {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.app-card.disabled {
  opacity: 0.65;
}

.card-head {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
}

.card-head h3 {
  font-size: 16px;
  font-weight: 600;
}

.folder {
  font-size: var(--text-caption);
  color: var(--text-faint);
  margin-top: 2px;
  word-break: break-all;
}

.head-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-2);
}

.badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  justify-content: flex-end;
}

.desc {
  font-size: var(--text-small);
  color: var(--text-secondary);
  line-height: 1.45;
}

.desc.muted {
  color: var(--text-faint);
  font-style: italic;
}

.meta {
  display: grid;
  gap: var(--space-2);
  font-size: var(--text-caption);
}

.meta dt {
  color: var(--text-faint);
  margin-bottom: 2px;
}

.meta code {
  font-family: var(--font-mono);
  color: var(--status-info);
  word-break: break-all;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.tag {
  font-size: var(--text-caption);
  background: var(--surface-hover);
  color: var(--text-muted);
  border-radius: var(--radius-pill);
  padding: 3px 8px;
}

.card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: auto;
  padding-top: var(--space-1);
}
</style>
