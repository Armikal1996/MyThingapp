<template>
  <section class="system-panel">
    <div class="panel-block">
      <h3 class="hub-section-title">Backup</h3>
      <p class="hint">
        Export apps, tasks, favorites, calendar, media, AI chats, and settings to JSON.
        Import replaces current data.
      </p>
      <div class="actions">
        <BaseButton @click="$emit('export')">Export backup</BaseButton>
        <BaseButton :disabled="platform.runtime !== 'desktop'" @click="$emit('import')">Import backup</BaseButton>
      </div>
      <p v-if="backupMsg" class="msg" :class="msgType">{{ backupMsg }}</p>
    </div>

    <div class="panel-block">
      <h3 class="hub-section-title">LM Studio</h3>
      <div class="lm-grid">
        <BaseCard v-for="(model, key) in lmstudio.models" :key="key" class="lm-card">
          <p class="lm-name">
            <span class="status-dot" :class="lmHealth[key]?.online ? 'ok' : 'bad'" />
            {{ model.label }}
          </p>
          <p class="lm-role">{{ model.role }}</p>
          <p class="lm-url">{{ model.baseUrl }}</p>
          <p class="lm-status">{{ lmHealth[key]?.online ? 'Online' : (lmHealth[key]?.error || 'Offline') }}</p>
        </BaseCard>
      </div>
      <p class="hint">
        Load Gemma on port <strong>1234</strong> and Gwen on port <strong>1235</strong> in LM Studio,
        then open <strong>AI Chat</strong> to check status and start a conversation.
      </p>
    </div>
  </section>
</template>

<script setup>
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { getLmStudioConfig } from '@/services/platform.js'

defineProps({
  platform: { type: Object, required: true },
  lmHealth: { type: Object, default: () => ({}) },
  backupMsg: { type: String, default: '' },
  msgType: { type: String, default: 'success' }
})

defineEmits(['export', 'import'])

const lmstudio = getLmStudioConfig()
</script>

<style scoped>
.system-panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--space-6);
}

.panel-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.hint {
  font-size: var(--text-small);
  color: var(--text-muted);
  line-height: 1.5;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.msg {
  font-size: var(--text-small);
}

.msg.success { color: var(--status-success); }
.msg.error { color: var(--status-error); }

.lm-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-3);
}

.lm-card {
  padding: var(--space-4);
}

.lm-name {
  font-weight: 600;
}

.lm-role {
  font-size: var(--text-caption);
  color: var(--text-faint);
  margin: var(--space-1) 0;
  text-transform: capitalize;
}

.lm-url {
  font-size: var(--text-caption);
  color: var(--status-info);
  font-family: var(--font-mono);
}

.lm-status {
  font-size: var(--text-caption);
  color: var(--text-muted);
  margin-top: var(--space-1);
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: var(--radius-pill);
  margin-right: var(--space-2);
}

.status-dot.ok { background: var(--status-success); }
.status-dot.bad { background: var(--status-error); }
</style>
