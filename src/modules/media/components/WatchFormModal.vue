<template>
  <form class="form" @submit.prevent="onSubmit">
    <label class="field span-2">
      <span>Title</span>
      <input v-model="form.title" type="text" required placeholder="Movie or series name" />
    </label>

    <label class="field span-2">
      <span>Description</span>
      <textarea v-model="form.description" rows="2" placeholder="Optional" />
    </label>

    <label class="field">
      <span>Type</span>
      <select v-model="form.mediaType">
        <option v-for="t in mediaTypes" :key="t.id" :value="t.id">{{ t.label }}</option>
      </select>
    </label>

    <label class="field">
      <span>Status</span>
      <select v-model="form.status">
        <option v-for="s in statuses" :key="s.id" :value="s.id">{{ s.label }}</option>
      </select>
    </label>

    <label v-if="form.mediaType === 'series'" class="field">
      <span>Season</span>
      <input v-model.number="form.season" type="number" min="1" placeholder="1" />
    </label>

    <label v-if="form.mediaType === 'series'" class="field">
      <span>Episode</span>
      <input v-model.number="form.episode" type="number" min="1" placeholder="1" />
    </label>

    <label class="field">
      <span>Rating (1–10)</span>
      <input v-model.number="form.rating" type="number" min="1" max="10" placeholder="—" />
    </label>

    <label class="field span-2">
      <span>Notes</span>
      <input v-model="form.notes" type="text" placeholder="Where to watch, who recommended…" />
    </label>

    <label class="field span-2">
      <span>Tags</span>
      <input v-model="tagsInput" type="text" placeholder="sci-fi, anime" />
    </label>

    <div class="actions span-2">
      <button type="button" class="btn ghost" @click="$emit('cancel')">Cancel</button>
      <button type="submit" class="btn primary">{{ mode === 'edit' ? 'Save' : 'Add to watchlist' }}</button>
    </div>
  </form>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { MEDIA_TYPES, WATCH_STATUSES } from '@/services/media.js'

const props = defineProps({
  item: { type: Object, required: true },
  mode: { type: String, default: 'add' }
})

const emit = defineEmits(['save', 'cancel'])

const form = reactive({ ...props.item })
const statuses = WATCH_STATUSES
const mediaTypes = MEDIA_TYPES

const tagsInput = computed({
  get: () => (Array.isArray(form.tags) ? form.tags.join(', ') : ''),
  set: v => { form.tags = v.split(',').map(t => t.trim()).filter(Boolean) }
})

watch(() => props.item, v => Object.assign(form, v), { deep: true })

function onSubmit() {
  emit('save', {
    ...form,
    season: form.mediaType === 'series' ? (form.season || null) : null,
    episode: form.mediaType === 'series' ? (form.episode || null) : null,
    rating: form.rating || null
  })
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
