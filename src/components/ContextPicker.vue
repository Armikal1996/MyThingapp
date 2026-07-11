<template>
  <BaseModal
    :open="open"
    title="Add context"
    size="md"
    @update:open="$emit('update:open', $event)"
    @close="onCancel"
  >
    <SearchInput
      v-model="query"
      placeholder="Search games, movies, tasks, apps…"
      @update:model-value="onSearch"
    />

    <div v-if="selected.length" class="selected-tray">
      <HubItemChip
        v-for="item in selected"
        :key="item.key"
        :item="item"
        removable
        @remove="toggle(item)"
      />
    </div>

    <div class="results">
      <HubItemChip
        v-for="item in results"
        :key="item.key"
        :item="item"
        selectable
        :selected="selectedKeys.has(item.key)"
        @click="toggle(item)"
      />
      <BaseEmptyState
        v-if="!results.length"
        variant="inline"
        title="No matches"
        description="Try a different search term."
      />
    </div>

    <template #footer>
      <BaseButton variant="ghost" @click="onCancel">Cancel</BaseButton>
      <BaseButton variant="primary" :disabled="!selected.length" @click="confirm">
        Add {{ selected.length }} item{{ selected.length === 1 ? '' : 's' }}
      </BaseButton>
    </template>
  </BaseModal>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import SearchInput from '@/components/ui/SearchInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue'
import HubItemChip from '@/components/ui/HubItemChip.vue'
import { searchHubItems } from '@/services/hubContext.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  initial: { type: Array, default: () => [] },
  single: { type: Boolean, default: false }
})

const emit = defineEmits(['confirm', 'cancel', 'update:open'])

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
  } else if (props.single) {
    selectedKeys.value = new Set([item.key])
    selected.value = [item]
  } else {
    selectedKeys.value.add(item.key)
    selected.value.push(item)
  }
}

function confirm() {
  emit('confirm', [...selected.value])
  emit('update:open', false)
}

function onCancel() {
  emit('cancel')
  emit('update:open', false)
}

watch(() => props.initial, (v) => {
  selected.value = [...v]
  selectedKeys.value = new Set(v.map(i => i.key))
}, { deep: true })

watch(() => props.open, (isOpen) => {
  if (isOpen) onSearch()
})

onMounted(() => {
  if (props.open) onSearch()
})
</script>

<style scoped>
.selected-tray,
.results {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-4);
}

.results {
  max-height: 240px;
  overflow: auto;
}
</style>
