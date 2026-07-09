<template>
  <form class="form" @submit.prevent="onSubmit">
    <label class="field span-2">
      <span>Title</span>
      <input v-model="form.title" type="text" required placeholder="Game name" />
    </label>

    <label class="field span-2">
      <span>Description</span>
      <textarea v-model="form.description" rows="2" placeholder="Optional" />
    </label>

    <label class="field">
      <span>Platform</span>
      <select v-model="form.platform">
        <option v-for="p in platforms" :key="p" :value="p">{{ p }}</option>
      </select>
    </label>

    <label class="field">
      <span>Status</span>
      <select v-model="form.status">
        <option v-for="s in statuses" :key="s.id" :value="s.id">{{ s.label }}</option>
      </select>
    </label>

    <label class="field">
      <span>Priority</span>
      <select v-model.number="form.priority">
        <option :value="0">Normal</option>
        <option :value="1">Low</option>
        <option :value="2">High</option>
        <option :value="3">Must play</option>
      </select>
    </label>

    <label class="field">
      <span>Hours played</span>
      <input v-model.number="form.hoursPlayed" type="number" min="0" step="0.5" placeholder="0" />
    </label>

    <label class="field span-2">
      <span>Notes</span>
      <input v-model="form.notes" type="text" placeholder="Save file, mods, etc." />
    </label>

    <label class="field span-2">
      <span>Tags</span>
      <input v-model="tagsInput" type="text" placeholder="rpg, co-op" />
    </label>

    <div class="actions span-2">
      <button type="button" class="btn ghost" @click="$emit('cancel')">Cancel</button>
      <button type="submit" class="btn primary">{{ mode === 'edit' ? 'Save' : 'Add game' }}</button>
    </div>
  </form>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { GAME_STATUSES, PLATFORMS } from '@/services/media.js'

const props = defineProps({
  game: { type: Object, required: true },
  mode: { type: String, default: 'add' }
})

const emit = defineEmits(['save', 'cancel'])

const form = reactive({ ...props.game })
const statuses = GAME_STATUSES
const platforms = PLATFORMS

const tagsInput = computed({
  get: () => (Array.isArray(form.tags) ? form.tags.join(', ') : ''),
  set: v => { form.tags = v.split(',').map(t => t.trim()).filter(Boolean) }
})

watch(() => props.game, v => Object.assign(form, v), { deep: true })

function onSubmit() {
  emit('save', { ...form, hoursPlayed: form.hoursPlayed || null })
}
</script>

<style scoped>
.form { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: #94a3b8; }
.field input, .field select, .field textarea {
  background: #0f172a; border: 1px solid #334155; border-radius: 8px;
  color: #e2e8f0; padding: 10px 12px; font-size: 14px;
}
.span-2 { grid-column: span 2; }
.actions { display: flex; justify-content: flex-end; gap: 10px; }
.btn { border-radius: 8px; padding: 10px 14px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid transparent; }
.btn.primary { background: #2563eb; color: #fff; }
.btn.ghost { background: transparent; border-color: #334155; color: #94a3b8; }
</style>
