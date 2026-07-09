<template>
  <DesktopRequired>
  <div class="ai-module">
    <section class="toolbar">
      <div class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
          <span v-if="tab.badge" class="badge">{{ tab.badge }}</span>
        </button>
      </div>
      <div class="toolbar-actions">
        <button class="btn" :disabled="checking" @click="refreshHealth">
          {{ checking ? 'Checking…' : 'Check LM Studio' }}
        </button>
        <button v-if="activeTab === 'chat'" class="btn primary" @click="onNewThread">New chat</button>
        <button v-else class="btn primary" @click="openAddAnnouncement">New announcement</button>
      </div>
    </section>

    <section class="model-status">
      <article
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
      </article>
    </section>

    <p v-if="message" class="message" :class="messageType">{{ message }}</p>

    <!-- Chat -->
    <section v-if="activeTab === 'chat'" class="chat-layout">
      <aside class="thread-list">
        <p v-if="!threads.length" class="empty-side">No chats yet.</p>
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
      </aside>

      <div class="chat-panel">
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
            <button class="btn-sm danger" @click="onDeleteThread">Delete</button>
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
            <span v-for="item in contextItems" :key="item.key" class="ctx-chip">
              {{ item.title }}
              <button type="button" @click="removeContext(item.key)">×</button>
            </span>
          </div>

          <div class="quick-prompts">
            <button
              v-for="chip in quickChips"
              :key="chip.key"
              type="button"
              class="quick-chip"
              @click="addContextChip(chip)"
            >
              {{ chip.title }}
            </button>
            <button type="button" class="quick-chip" @click="pickerOpen = true">@ Add context</button>
            <button type="button" class="quick-chip" @click="applyQuickPrompt('What should I play or watch next?')">Plan media</button>
            <button type="button" class="quick-chip" @click="applyQuickPrompt('Plan my week across tasks and calendar.')">Plan week</button>
          </div>

          <form class="composer" @submit.prevent="onSend">
            <textarea
              v-model="draft"
              rows="3"
              :placeholder="modelOnline ? 'Message Gemma or Gwen…' : 'Load a model in LM Studio first…'"
              :disabled="sending || !modelOnline"
              @keydown.ctrl.enter.prevent="onSend"
            />
            <button class="btn primary" type="submit" :disabled="sending || !draft.trim() || !modelOnline">
              Send
            </button>
          </form>
        </template>
        <p v-else class="empty-main">Select or start a chat.</p>
      </div>
    </section>

    <!-- Inbox -->
    <section v-else class="inbox-panel">
      <div class="filters">
        <button
          v-for="s in statusFilters"
          :key="s.id"
          class="filter"
          :class="{ active: inboxFilter === s.id }"
          @click="inboxFilter = s.id"
        >
          {{ s.label }}
        </button>
      </div>

      <div class="card-grid">
        <article
          v-for="item in announcements"
          :key="item.id"
          class="card"
          :class="{ unread: !item.readAt && item.status !== 'dismissed' }"
        >
          <header>
            <h3>{{ item.title }}</h3>
            <span class="pill" :class="item.priority">{{ item.priority }}</span>
          </header>
          <p class="body">{{ item.body }}</p>
          <div class="meta">
            <span class="pill role">{{ roleLabel(item.agentRole) }}</span>
            <span class="pill status">{{ statusLabel(item.status) }}</span>
          </div>
          <footer>
            <button class="btn-sm primary" @click="onDispatch(item)">Send to chat</button>
            <button class="btn-sm" @click="openEditAnnouncement(item)">Edit</button>
            <select :value="item.status" @change="onStatusChange(item, $event.target.value)">
              <option v-for="s in statuses" :key="s.id" :value="s.id">{{ s.label }}</option>
            </select>
            <button class="btn-sm danger" @click="onDeleteAnnouncement(item)">Delete</button>
          </footer>
        </article>
      </div>
      <p v-if="!announcements.length" class="empty">No announcements in this view.</p>
    </section>

    <div v-if="modalOpen" class="modal-backdrop" @click.self="closeModal">
      <div class="modal">
        <header>
          <h2>{{ modalMode === 'edit' ? 'Edit announcement' : 'New announcement' }}</h2>
          <button class="close" @click="closeModal">×</button>
        </header>
        <AnnouncementFormModal
          :announcement="editingAnnouncement"
          :mode="modalMode"
          @save="onSaveAnnouncement"
          @cancel="closeModal"
        />
      </div>
    </div>
    <div v-if="pickerOpen" class="modal-backdrop" @click.self="pickerOpen = false">
      <div class="modal picker-modal">
        <header>
          <h2>Add context</h2>
          <button class="close" @click="pickerOpen = false">×</button>
        </header>
        <ContextPicker :initial="contextItems" @confirm="onPickerConfirm" @cancel="pickerOpen = false" />
      </div>
    </div>
  </div>
  </DesktopRequired>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AnnouncementFormModal from '@/modules/ai/components/AnnouncementFormModal.vue'
import ContextPicker from '@/components/ContextPicker.vue'
import DesktopRequired from '@/components/DesktopRequired.vue'
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
import { getContextItems, getQuickContextChips } from '@/services/hubContext.js'

const route = useRoute()

const tabs = ref([
  { id: 'chat', label: 'Chat', badge: 0 },
  { id: 'inbox', label: 'Agent inbox', badge: 0 }
])

const activeTab = ref('chat')
const modelOptions = getModelOptions()
const health = ref({})
const checking = ref(false)
const message = ref('')
const messageType = ref('info')

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
const statuses = STATUSES

const modalOpen = ref(false)
const modalMode = ref('add')
const editingAnnouncement = ref(createEmptyAnnouncement())
const contextItems = ref([])
const quickChips = ref([])
const pickerOpen = ref(false)
const streamingText = ref('')

const statusFilters = [
  { id: 'all', label: 'All' },
  ...STATUSES
]

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

function showMsg(text, type = 'info') {
  message.value = text
  messageType.value = type
  setTimeout(() => { message.value = '' }, 5000)
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
    showMsg(e.message, 'error')
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
  showMsg('Announcement saved.')
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
    showMsg(`Opened chat with ${modelLabel(thread.modelKey)}.`)
  } catch (e) {
    showMsg(e.message, 'error')
  }
}

watch(inboxFilter, () => loadInbox())

async function loadRouteContext() {
  const raw = route.query.context
  if (!raw) return
  const keys = String(raw).split(',').filter(Boolean)
  contextItems.value = await getContextItems(keys)
  if (route.query.thread) {
    activeThreadId.value = route.query.thread
    await loadMessages(route.query.thread)
  }
  if (route.query.tab === 'inbox') activeTab.value = 'inbox'
}

onMounted(async () => {
  await refreshHealth()
  quickChips.value = await getQuickContextChips()
  await loadThreads(route.query.thread || null)
  await loadRouteContext()
  await loadInbox()
})
</script>

<style scoped>
.ai-module {
  padding: 20px 24px 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100%;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.tabs {
  display: flex;
  gap: 8px;
}

.tab {
  background: #111827;
  border: 1px solid #1f2937;
  color: #cbd5e1;
  border-radius: 8px;
  padding: 8px 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tab.active {
  background: #1d4ed8;
  border-color: #2563eb;
  color: #fff;
}

.tab .badge {
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  border-radius: 999px;
  padding: 1px 6px;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.model-status {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.status-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #111827;
  border: 1px solid #1f2937;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
}

.status-pill.online {
  border-color: #166534;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
}

.status-pill.online .dot {
  background: #22c55e;
}

.role,
.port,
.hint {
  color: #64748b;
}

.hint.err {
  color: #f87171;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message {
  font-size: 13px;
  padding: 8px 12px;
  border-radius: 8px;
}

.message.info {
  background: #1e293b;
  color: #93c5fd;
}

.message.error {
  background: #450a0a;
  color: #fca5a5;
}

.chat-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 12px;
  min-height: 520px;
}

.thread-list,
.chat-panel,
.inbox-panel {
  background: #0f172a;
  border: 1px solid #1f2937;
  border-radius: 12px;
}

.thread-list {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow: auto;
}

.thread-item {
  text-align: left;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 10px;
  color: #e2e8f0;
  cursor: pointer;
}

.thread-item.active,
.thread-item:hover {
  background: #1e293b;
  border-color: #334155;
}

.thread-title {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 4px;
}

.thread-meta {
  font-size: 11px;
  color: #64748b;
}

.chat-panel {
  display: flex;
  flex-direction: column;
  min-height: 520px;
}

.chat-header {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #1f2937;
}

.title-input {
  flex: 1;
  background: #111827;
  border: 1px solid #334155;
  border-radius: 8px;
  color: #e2e8f0;
  padding: 8px 10px;
}

.messages {
  flex: 1;
  overflow: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bubble {
  max-width: 85%;
  padding: 10px 12px;
  border-radius: 12px;
  background: #111827;
  border: 1px solid #1f2937;
}

.bubble.user {
  align-self: flex-end;
  background: #172554;
  border-color: #1d4ed8;
}

.bubble.assistant {
  align-self: flex-start;
}

.bubble .role {
  font-size: 10px;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 6px;
}

.bubble .content {
  white-space: pre-wrap;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
}

.typing {
  color: #94a3b8;
  font-size: 13px;
}

.composer {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid #1f2937;
}

.composer textarea {
  background: #111827;
  border: 1px solid #334155;
  border-radius: 8px;
  color: #e2e8f0;
  padding: 10px;
  resize: vertical;
}

.inbox-panel {
  padding: 16px;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.filter {
  background: #111827;
  border: 1px solid #1f2937;
  color: #cbd5e1;
  border-radius: 999px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 12px;
}

.filter.active {
  background: #1d4ed8;
  border-color: #2563eb;
  color: #fff;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}

.card {
  background: #111827;
  border: 1px solid #1f2937;
  border-radius: 12px;
  padding: 14px;
}

.card.unread {
  border-color: #2563eb;
}

.card header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.card h3 {
  font-size: 15px;
}

.body {
  font-size: 13px;
  color: #cbd5e1;
  line-height: 1.5;
  margin-bottom: 10px;
  white-space: pre-wrap;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.pill {
  font-size: 11px;
  border-radius: 999px;
  padding: 2px 8px;
  background: #1e293b;
  color: #94a3b8;
}

.pill.high {
  background: #450a0a;
  color: #fca5a5;
}

.pill.normal {
  background: #1e293b;
}

.pill.low {
  background: #0f172a;
}

.card footer {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.btn,
.btn-sm {
  background: #1e293b;
  border: 1px solid #334155;
  color: #e2e8f0;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 13px;
  cursor: pointer;
}

.btn-sm {
  padding: 6px 10px;
  font-size: 12px;
}

.btn.primary,
.btn-sm.primary {
  background: #1d4ed8;
  border-color: #2563eb;
}

.btn-sm.danger {
  color: #fca5a5;
  border-color: #7f1d1d;
}

.empty,
.empty-side,
.empty-main {
  color: #64748b;
  font-size: 13px;
  padding: 12px;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: grid;
  place-items: center;
  z-index: 50;
}

.modal {
  width: min(520px, 92vw);
  background: #0f172a;
  border: 1px solid #1f2937;
  border-radius: 12px;
  padding: 16px;
}

.modal header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.close {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 22px;
  cursor: pointer;
}

select {
  background: #111827;
  border: 1px solid #334155;
  border-radius: 8px;
  color: #e2e8f0;
  padding: 6px 8px;
  font-size: 12px;
}

.context-tray,
.quick-prompts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 12px 8px;
}

.ctx-chip,
.quick-chip {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 999px;
  color: #e2e8f0;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
}

.ctx-chip button {
  background: transparent;
  border: none;
  color: #94a3b8;
  margin-left: 4px;
  cursor: pointer;
}

.picker-modal {
  width: min(560px, 92vw);
}

@media (max-width: 900px) {
  .chat-layout {
    grid-template-columns: 1fr;
  }
}
</style>
