<template>
  <form class="form" @submit.prevent="onSubmit">
    <label class="field span-2">
      <span>Title</span>
      <input v-model="form.title" type="text" required placeholder="Reminder title" />
    </label>

    <label class="field span-2">
      <span>Description</span>
      <textarea v-model="form.description" rows="2" placeholder="Optional message for notification" />
    </label>

    <label class="field span-2">
      <span>Remind at</span>
      <input v-model="remindInput" type="datetime-local" required />
    </label>

    <label class="field span-2">
      <span>Link to hub item (optional)</span>
      <input
        v-model="linkQuery"
        type="search"
        placeholder="Search tasks, games, movies, apps…"
        @input="onLinkSearch"
      />
      <div v-if="linkResults.length" class="link-results">
        <button
          v-for="item in linkResults"
          :key="item.key"
          type="button"
          class="link-option"
          :class="{ active: form.linkedType === item.type && form.linkedId === item.id }"
          @click="selectLink(item)"
        >
          {{ hubItemIcon(item.type) }} {{ item.title }}
          <span class="sub">{{ item.subtitle }}</span>
        </button>
      </div>
      <p v-if="form.linkedType" class="linked-chip">
        Linked: {{ form.linkedType }}:{{ form.linkedId }}
        <button type="button" class="clear" @click="clearLink">×</button>
      </p>
    </label>

    <label class="checkbox span-2">
      <input v-model="form.enabled" type="checkbox" />
      <span>Enabled</span>
    </label>

    <div class="actions span-2">
      <button type="button" class="btn ghost" @click="$emit('cancel')">Cancel</button>
      <button type="submit" class="btn primary">{{ mode === 'edit' ? 'Save' : 'Add reminder' }}</button>
    </div>
  </form>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { hubItemIcon, searchHubItems } from '@/services/hubContext.js'

const props = defineProps({
  reminder: { type: Object, required: true },
  mode: { type: String, default: 'add' }
})

const emit = defineEmits(['save', 'cancel'])

const form = reactive({ ...props.reminder })
const linkQuery = ref('')
const linkResults = ref([])
let searchTimer = null

function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const remindInput = computed({
  get: () => toLocalInput(form.remindAt),
  set: v => { form.remindAt = v ? new Date(v).toISOString() : form.remindAt }
})

watch(() => props.reminder, v => Object.assign(form, v), { deep: true })

function onLinkSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    linkResults.value = await searchHubItems(linkQuery.value, 8)
  }, 200)
}

function selectLink(item) {
  form.linkedType = item.type
  form.linkedId = item.id
  linkQuery.value = item.title
  linkResults.value = []
}

function clearLink() {
  form.linkedType = null
  form.linkedId = null
  linkQuery.value = ''
}

function onSubmit() {
  emit('save', { ...form, fired: false })
}
</script>

<style scoped>
.form { display: grid; grid-template-columns: 1fr; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: #94a3b8; }
.field input, .field textarea {
  background: #0f172a; border: 1px solid #334155; border-radius: 8px;
  color: #e2e8f0; padding: 10px 12px; font-size: 14px;
}
.span-2 { grid-column: span 2; }
.checkbox { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #cbd5e1; }
.actions { display: flex; justify-content: flex-end; gap: 10px; }
.btn { border-radius: 8px; padding: 10px 14px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid transparent; }
.btn.primary { background: #2563eb; color: #fff; }
.btn.ghost { background: transparent; border-color: #334155; color: #94a3b8; }
.link-results {
  display: flex; flex-direction: column; gap: 4px;
  max-height: 160px; overflow: auto; margin-top: 6px;
}
.link-option {
  text-align: left; background: #111827; border: 1px solid #334155;
  border-radius: 8px; color: #e2e8f0; padding: 8px 10px; cursor: pointer;
}
.link-option.active, .link-option:hover { border-color: #3b82f6; }
.link-option .sub { display: block; font-size: 11px; color: #64748b; margin-top: 2px; }
.linked-chip {
  margin-top: 6px; font-size: 12px; color: #93c5fd;
  display: flex; align-items: center; gap: 8px;
}
.clear {
  background: #1e293b; border: 1px solid #334155; color: #94a3b8;
  border-radius: 4px; padding: 0 6px; cursor: pointer;
}
</style>
