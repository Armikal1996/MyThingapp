<template>
  <div class="context-picker">
    <input
      v-model="query"
      class="search"
      type="search"
      placeholder="Search games, movies, tasks, apps…"
      @input="onSearch"
    />
    <div class="results">
      <button
        v-for="item in results"
        :key="item.key"
        type="button"
        class="chip"
        :class="{ selected: selectedKeys.has(item.key) }"
        @click="toggle(item)"
      >
        <span class="icon">{{ hubItemIcon(item.type) }}</span>
        <span class="label">{{ item.title }}</span>
        <span class="meta">{{ item.type }}</span>
      </button>
      <p v-if="!results.length" class="empty">No matches.</p>
    </div>
    <footer>
      <button type="button" class="btn" @click="$emit('cancel')">Cancel</button>
      <button type="button" class="btn primary" :disabled="!selected.length" @click="confirm">
        Add {{ selected.length }} item(s)
      </button>
    </footer>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { hubItemIcon, searchHubItems } from '@/services/hubContext.js'

const props = defineProps({
  initial: { type: Array, default: () => [] }
})

const emit = defineEmits(['confirm', 'cancel'])

const query = ref('')
const results = ref([])
const selected = ref([...props.initial])
const selectedKeys = ref(new Set(props.initial.map(i => i.key)))

async function onSearch() {
  results.value = await searchHubItems(query.value, 40)
}

function toggle(item) {
  if (selectedKeys.value.has(item.key)) {
    selectedKeys.value.delete(item.key)
    selected.value = selected.value.filter(s => s.key !== item.key)
  } else {
    selectedKeys.value.add(item.key)
    selected.value.push(item)
  }
}

function confirm() {
  emit('confirm', [...selected.value])
}

watch(() => props.initial, (v) => {
  selected.value = [...v]
  selectedKeys.value = new Set(v.map(i => i.key))
}, { deep: true })

onMounted(() => onSearch())
</script>

<style scoped>
.context-picker {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  color: #e2e8f0;
  padding: 10px 12px;
}

.results {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 240px;
  overflow: auto;
}

.chip {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 999px;
  color: #e2e8f0;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 12px;
}

.chip.selected {
  background: #1d4ed8;
  border-color: #2563eb;
}

.meta {
  color: #94a3b8;
  font-size: 10px;
  text-transform: uppercase;
}

.empty {
  color: #64748b;
  font-size: 13px;
}

footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn {
  background: #1e293b;
  border: 1px solid #334155;
  color: #e2e8f0;
  border-radius: 8px;
  padding: 8px 14px;
  cursor: pointer;
}

.btn.primary {
  background: #1d4ed8;
  border-color: #2563eb;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
