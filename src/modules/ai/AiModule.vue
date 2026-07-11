<template>
  <ModuleShell accent="ai">
    <template #toolbar>
      <ModuleToolbar>
        <template #leading>
          <BaseTabs v-model="activeTab" :tabs="tabs" />
        </template>
        <template #trailing>
          <BaseButton :disabled="checking" @click="refreshHealth">
            {{ checking ? 'Checking…' : 'Check LM Studio' }}
          </BaseButton>
          <BaseButton v-if="activeTab === 'chat'" variant="primary" @click="onNewThread">New chat</BaseButton>
          <BaseButton v-else variant="primary" @click="openAddAnnouncement">New announcement</BaseButton>
        </template>
      </ModuleToolbar>
    </template>

    <DesktopRequired>
      <section class="model-status">
        <BaseCard
          v-for="opt in modelOptions"
          :key="opt.key"
          class="status-pill"
          :class="{ online: health[opt.key]?.online }"
        >
          <span class="dot" />
          <strong>{{ opt.label }}</strong>
          <span class="role">{{ opt.role }}</span>
          <span class="port">:{{ opt.port }}</span>
          <span v-if="health[opt.key]?.online" class="hint">ready</span>
          <span v-else class="hint err">{{ health[opt.key]?.error || 'offline' }}</span>
        </BaseCard>
      </section>

      <!-- Chat -->
      <section v-if="activeTab === 'chat'" class="chat-layout">
        <BaseCard class="thread-list">
          <BaseEmptyState
            v-if="!threads.length"
            variant="inline"
            description="No chats yet."
          />
          <button
            v-for="thread in threads"
            :key="thread.id"
            class="thread-item"
            :class="{ active: thread.id === activeThreadId }"
            @click="selectThread(thread.id)"
          >
            <span class="thread-title">{{ thread.title }}</span>
            <span class="thread-meta">{{ modelLabel(thread.modelKey) }}</span>
          </button>
        </BaseCard>

        <BaseCard class="chat-panel">
          <template v-if="activeThread">
            <header class="chat-header">
              <input
                v-model="threadTitleEdit"
                class="title-input"
                @blur="onRenameThread"
                @keydown.enter="$event.target.blur()"
              />
              <select v-model="activeModelKey" @change="onModelChange">
                <option v-for="opt in modelOptions" :key="opt.key" :value="opt.key">
                  {{ opt.label }} ({{ opt.role }})
                </option>
              </select>
              <BaseButton size="sm" variant="danger" @click="onDeleteThread">Delete</BaseButton>
            </header>

            <div ref="messagesEl" class="messages">
              <article
                v-for="msg in messages"
                :key="msg.id"
                class="bubble"
                :class="msg.role"
              >
                <p class="role">{{ msg.role }}</p>
                <pre class="content">{{ msg.content }}</pre>
              </article>
              <p v-if="sending" class="typing">{{ streamingText || 'Thinking…' }}</p>
            </div>

            <div v-if="contextItems.length" class="context-tray">
              <HubItemChip
                v-for="item in contextItems"
                :key="item.key"
                :item="item"
                removable
                from="ai"
                @remove="removeContext(item.key)"
              />
            </div>

            <div class="quick-prompts">
              <BaseButton
                v-for="chip in quickChips"
                :key="chip.key"
                size="sm"
                variant="ghost"
                @click="addContextChip(chip)"
              >
                {{ chip.title }}
              </BaseButton>
              <BaseButton size="sm" variant="ghost" @click="pickerOpen = true">@ Add context</BaseButton>
              <BaseButton size="sm" variant="ghost" @click="applyQuickPrompt('What should I play or watch next?')">Plan media</BaseButton>
              <BaseButton size="sm" variant="ghost" @click="applyQuickPrompt('Plan my week across tasks and calendar.')">Plan week</BaseButton>
            </div>

            <form class="composer" @submit.prevent="onSend">
              <textarea
                v-model="draft"
                rows="3"
                :placeholder="modelOnline ? 'Message Gemma or Gwen…' : 'Load a model in LM Studio first…'"
                :disabled="sending || !modelOnline"
                @keydown.ctrl.enter.prevent="onSend"
              />
              <BaseButton variant="primary" type="submit" :disabled="sending || !draft.trim() || !modelOnline">
                Send
              </BaseButton>
            </form>
          </template>
          <BaseEmptyState
            v-else
            variant="inline"
            title="No chat selected"
            description="Select or start a chat."
          />
        </BaseCard>
      </section>

      <!-- Inbox -->
      <section v-else class="inbox-panel">
        <BaseTabs v-model="inboxFilter" :tabs="statusFilters" />

        <div class="card-grid">
          <BaseCard
            v-for="item in announcements"
            :key="item.id"
            class="inbox-card"
            :class="{ unread: !item.readAt && item.status !== 'dismissed' }"
          >
            <header>
              <h3>{{ item.title }}</h3>
              <BaseBadge :variant="item.priority === 'high' ? 'danger' : 'default'">
                {{ item.priority }}
              </BaseBadge>
            </header>
            <p class="body">{{ item.body }}</p>
            <div class="meta">
              <BaseBadge>{{ roleLabel(item.agentRole) }}</BaseBadge>
              <BaseBadge>{{ statusLabel(item.status) }}</BaseBadge>
            </div>
            <footer>
              <BaseButton size="sm" variant="primary" @click="onDispatch(item)">Send to chat</BaseButton>
              <BaseButton
                v-if="announcementSources[item.id]"
                size="sm"
                @click="openAnnouncementSource(item)"
              >
                Open source
              </BaseButton>
              <BaseButton size="sm" @click="openEditAnnouncement(item)">Edit</BaseButton>
              <select :value="item.status" @change="onStatusChange(item, $event.target.value)">
                <option v-for="s in statuses" :key="s.id" :value="s.id">{{ s.label }}</option>
              </select>
              <BaseButton size="sm" variant="danger" @click="onDeleteAnnouncement(item)">Delete</BaseButton>
            </footer>
          </BaseCard>
        </div>
        <BaseEmptyState
          v-if="!announcements.length"
          variant="inline"
          description="No announcements in this view."
        />
      </section>
    </DesktopRequired>

    <BaseModal
      :open="modalOpen"
      :title="modalMode === 'edit' ? 'Edit announcement' : 'New announcement'"
      size="md"
      @update:open="modalOpen = $event"
      @close="closeModal"
    >
      <AnnouncementFormModal
        :announcement="editingAnnouncement"
        :mode="modalMode"
        @save="onSaveAnnouncement"
        @cancel="closeModal"
      />
    </BaseModal>

    <ContextPicker
      :open="pickerOpen"
      :initial="contextItems"
      @update:open="pickerOpen = $event"
      @confirm="onPickerConfirm"
      @cancel="pickerOpen = false"
    />
  </ModuleShell>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AnnouncementFormModal from '@/modules/ai/components/AnnouncementFormModal.vue'
import ContextPicker from '@/components/ContextPicker.vue'
import ModuleShell from '@/components/ui/ModuleShell.vue'
import ModuleToolbar from '@/components/ui/ModuleToolbar.vue'
import BaseTabs from '@/components/ui/BaseTabs.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import HubItemChip from '@/components/ui/HubItemChip.vue'
import DesktopRequired from '@/components/DesktopRequired.vue'
import { useToast } from '@/composables/useToast.js'
import {
  createThread,
  deleteThread,
  listMessages,
  listThreads,
  sendChatMessage,
  updateThread
} from '@/services/aiChat.js'
import {
  AGENT_ROLES,
  STATUSES,
  countUnread,
  createEmptyAnnouncement,
  deleteAnnouncement,
  dispatchToChat,
  listAnnouncements,
  saveAnnouncement,
  updateAnnouncementStatus
} from '@/services/announcements.js'
import { checkAllModels, getModelOptions } from '@/services/lmstudio.js'
import { getContextItems, getQuickContextChips, searchHubItems } from '@/services/hubContext.js'
import { openInModule } from '@/services/integrations.js'

const route = useRoute()
const router = useRouter()
const { success, error: toastError } = useToast()

const tabs = ref([
  { id: 'chat', label: 'Chat', badge: 0 },
  { id: 'inbox', label: 'Agent inbox', badge: 0 }
])

const activeTab = ref('chat')
const modelOptions = getModelOptions()
const health = ref({})
const checking = ref(false)

const threads = ref([])
const activeThreadId = ref(null)
const messages = ref([])
const draft = ref('')
const sending = ref(false)
const threadTitleEdit = ref('')
const activeModelKey = ref('gemma')
const messagesEl = ref(null)

const announcements = ref([])
const inboxFilter = ref('all')
const announcementSources = ref({})
const statuses = STATUSES

const modalOpen = ref(false)
const modalMode = ref('add')
const editingAnnouncement = ref(createEmptyAnnouncement())
const contextItems = ref([])
const quickChips = ref([])
const pickerOpen = ref(false)
const streamingText = ref('')

const statusFilters = computed(() => [
  { id: 'all', label: 'All' },
  ...STATUSES
])

const activeThread = computed(() =>
  threads.value.find(t => t.id === activeThreadId.value) || null
)

const modelOnline = computed(() =>
  Boolean(health.value[activeModelKey.value]?.online)
)

function modelLabel(key) {
  return modelOptions.find(m => m.key === key)?.label || key
}

function roleLabel(role) {
  return AGENT_ROLES.find(r => r.id === role)?.label || role
}

function statusLabel(status) {
  return STATUSES.find(s => s.id === status)?.label || status
}

async function resolveAnnouncementSource(body) {
  const match = body.match(/### (\w+): (.+)/)
  if (!match) return null
  const [, type, title] = match
  const results = await searchHubItems(title.trim(), 10)
  return results.find(r => r.type === type && r.title === title.trim()) || null
}

async function refreshAnnouncementSources(items) {
  const map = {}
  for (const item of items) {
    const source = await resolveAnnouncementSource(item.body)
    if (source) map[item.id] = source
  }
  announcementSources.value = map
}

async function openAnnouncementSource(item) {
  const source = announcementSources.value[item.id]
  if (!source) return
  try {
    await openInModule(source, router, 'ai')
  } catch (e) {
    toastError(e.message)
  }
}

async function refreshHealth() {
  checking.value = true
  health.value = await checkAllModels()
  checking.value = false
}

async function loadThreads(selectId = null) {
  threads.value = await listThreads()
  if (selectId) {
    activeThreadId.value = selectId
  } else if (!activeThreadId.value && threads.value.length) {
    activeThreadId.value = threads.value[0].id
  }
  if (activeThreadId.value) {
    await loadMessages(activeThreadId.value)
  }
}

async function loadMessages(threadId) {
  messages.value = await listMessages(threadId)
  const thread = threads.value.find(t => t.id === threadId)
  if (thread) {
    threadTitleEdit.value = thread.title
    activeModelKey.value = thread.modelKey
  }
  await nextTick()
  scrollMessages()
}

function scrollMessages() {
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  }
}

async function selectThread(id) {
  activeThreadId.value = id
  await loadMessages(id)
}

async function onNewThread() {
  const thread = await createThread({ title: 'New chat', modelKey: 'gemma' })
  await loadThreads(thread.id)
}

async function onRenameThread() {
  if (!activeThread.value) return
  const title = threadTitleEdit.value.trim() || 'New chat'
  await updateThread(activeThread.value.id, { title })
  await loadThreads(activeThread.value.id)
}

async function onModelChange() {
  if (!activeThread.value) return
  await updateThread(activeThread.value.id, { modelKey: activeModelKey.value })
  await loadThreads(activeThread.value.id)
}

async function onDeleteThread() {
  if (!activeThread.value) return
  if (!confirm('Delete this chat and all messages?')) return
  await deleteThread(activeThread.value.id)
  activeThreadId.value = null
  messages.value = []
  await loadThreads()
}

async function onSend() {
  if (!activeThread.value || !draft.value.trim() || sending.value || !modelOnline.value) return
  const text = draft.value.trim()
  draft.value = ''
  sending.value = true
  streamingText.value = ''
  try {
    const modelId = health.value[activeModelKey.value]?.modelId || null
    await sendChatMessage(activeThread.value.id, text, modelId, {
      contextItems: contextItems.value,
      onStreamChunk: (_chunk, full) => { streamingText.value = full }
    })
    await loadMessages(activeThread.value.id)
    await loadThreads(activeThread.value.id)
  } catch (e) {
    toastError(e.message)
    draft.value = text
    await loadMessages(activeThread.value.id)
  } finally {
    sending.value = false
    streamingText.value = ''
  }
}

function addContextChip(chip) {
  if (!contextItems.value.find(c => c.key === chip.key)) {
    contextItems.value.push(chip)
  }
}

function removeContext(key) {
  contextItems.value = contextItems.value.filter(c => c.key !== key)
}

function onPickerConfirm(items) {
  contextItems.value = items
  pickerOpen.value = false
}

function applyQuickPrompt(prompt) {
  draft.value = prompt
}

async function loadInbox() {
  announcements.value = await listAnnouncements(inboxFilter.value)
  await refreshAnnouncementSources(announcements.value)
  const unread = await countUnread()
  tabs.value[1].badge = unread || 0
}

function openAddAnnouncement() {
  editingAnnouncement.value = createEmptyAnnouncement()
  modalMode.value = 'add'
  modalOpen.value = true
}

function openEditAnnouncement(item) {
  editingAnnouncement.value = { ...item }
  modalMode.value = 'edit'
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
}

async function onSaveAnnouncement(data) {
  await saveAnnouncement(data)
  closeModal()
  await loadInbox()
  success('Announcement saved.')
}

async function onStatusChange(item, status) {
  await updateAnnouncementStatus(item.id, status)
  await loadInbox()
}

async function onDeleteAnnouncement(item) {
  if (!confirm('Delete this announcement?')) return
  await deleteAnnouncement(item.id)
  await loadInbox()
}

async function onDispatch(item) {
  try {
    const thread = await dispatchToChat(item)
    activeTab.value = 'chat'
    await loadThreads(thread.id)
    await loadInbox()
    success(`Opened chat with ${modelLabel(thread.modelKey)}.`)
  } catch (e) {
    toastError(e.message)
  }
}

async function loadRouteContext() {
  const raw = route.query.context
  if (raw) {
    const keys = String(raw).split(',').filter(Boolean)
    contextItems.value = await getContextItems(keys)
  }
  if (route.query.thread) {
    activeThreadId.value = route.query.thread
    await loadMessages(route.query.thread)
  }
  if (route.query.tab === 'inbox') activeTab.value = 'inbox'
}

watch(inboxFilter, () => loadInbox())

watch(
  () => route.fullPath,
  async () => {
    if (route.path !== '/ai') return
    await loadRouteContext()
  }
)

onMounted(async () => {
  await refreshHealth()
  quickChips.value = await getQuickContextChips()
  await loadThreads(route.query.thread || null)
  await loadRouteContext()
  await loadInbox()
})
</script>

<style scoped>
.model-status {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.status-pill {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  border-radius: var(--radius-pill);
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-caption);
}

.status-pill.online {
  border-color: var(--status-success);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--status-error);
}

.status-pill.online .dot {
  background: var(--status-success);
}

.role,
.port,
.hint {
  color: var(--text-faint);
}

.hint.err {
  color: var(--status-error);
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: var(--space-3);
  min-height: 520px;
}

.thread-list {
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  overflow: auto;
}

.thread-item {
  text-align: left;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  padding: var(--space-3);
  color: var(--text-primary);
  cursor: pointer;
}

.thread-item.active,
.thread-item:hover {
  background: var(--surface-hover);
  border-color: var(--border-strong);
}

.thread-title {
  display: block;
  font-size: var(--text-small);
  font-weight: 600;
  margin-bottom: var(--space-1);
}

.thread-meta {
  font-size: var(--text-caption);
  color: var(--text-faint);
}

.chat-panel {
  display: flex;
  flex-direction: column;
  min-height: 520px;
}

.chat-header {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-3);
  border-bottom: 1px solid var(--border-subtle);
}

.title-input {
  flex: 1;
  background: var(--surface-base);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  padding: var(--space-2) var(--space-3);
}

.messages {
  flex: 1;
  overflow: auto;
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.bubble {
  max-width: 85%;
  padding: var(--space-3);
  border-radius: var(--radius-lg);
  background: var(--surface-base);
  border: 1px solid var(--border-subtle);
}

.bubble.user {
  align-self: flex-end;
  background: rgba(29, 78, 216, 0.2);
  border-color: var(--accent-primary);
}

.bubble.assistant {
  align-self: flex-start;
}

.bubble .role {
  font-size: 10px;
  text-transform: uppercase;
  color: var(--text-faint);
  margin-bottom: var(--space-2);
}

.bubble .content {
  white-space: pre-wrap;
  font-family: inherit;
  font-size: var(--text-body);
  line-height: 1.5;
  margin: 0;
}

.typing {
  color: var(--text-muted);
  font-size: var(--text-small);
}

.composer {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-2);
  padding: var(--space-3);
  border-top: 1px solid var(--border-subtle);
}

.composer textarea {
  background: var(--surface-base);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  padding: var(--space-3);
  resize: vertical;
  font-family: inherit;
}

.inbox-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-3);
}

.inbox-card {
  padding: var(--space-4);
}

.inbox-card.unread {
  border-color: var(--accent-ai);
}

.inbox-card header {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.inbox-card h3 {
  font-size: var(--text-body);
}

.body {
  font-size: var(--text-small);
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: var(--space-3);
  white-space: pre-wrap;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.inbox-card footer {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
}

.inbox-card footer select {
  background: var(--surface-base);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  padding: var(--space-2);
  font-size: var(--text-caption);
}

.context-tray,
.quick-prompts {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  padding: 0 var(--space-3) var(--space-2);
}

@media (max-width: 900px) {
  .chat-layout {
    grid-template-columns: 1fr;
  }
}
</style>
