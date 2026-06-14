<template>
  <div class="studio-backdrop" @click.self="close">
    <div class="studio" role="dialog" aria-modal="true" aria-label="Narration Studio">
      <header class="studio-head">
        <div>
          <h2 class="studio-title">Narration Studio</h2>
          <p class="studio-sub">Describe a topic → get a tailored AI prompt → paste the JSON back → validate &amp; download.</p>
        </div>
        <button class="icon-btn" title="Close (Esc)" @click="close">×</button>
      </header>

      <nav class="stepper">
        <span :class="['step', { active: step === 1, done: step > 1 }]">1 · Describe</span>
        <span :class="['step', { active: step === 2, done: step > 2 }]">2 · Prompt</span>
        <span :class="['step', { active: step === 3 }]">3 · Import</span>
      </nav>

      <!-- STEP 1 — DESCRIBE -->
      <section v-if="step === 1" class="studio-body">
        <label class="field">
          <span class="field-label">Topic / big question</span>
          <input v-model="topic" class="text-input" placeholder="e.g. How did humans first explore the deep ocean?" />
        </label>

        <label class="field">
          <span class="field-label">Player-facing title</span>
          <input v-model="title" class="text-input" placeholder="e.g. Who Dared to Dive Into the Deep?" />
        </label>

        <label class="field">
          <span class="field-label">Slug <small>(auto from title; lowercase-hyphen, must be unique)</small></span>
          <input v-model="slug" class="text-input mono" placeholder="deep-ocean-exploration" />
          <span v-if="slugError" class="inline-error">{{ slugError }}</span>
        </label>

        <label class="field">
          <span class="field-label">Headers / beats to cover <small>(one per line, in order)</small></span>
          <textarea
            v-model="headersText"
            class="text-area"
            rows="6"
            placeholder="Ancient free-diving&#10;The diving bell&#10;Scuba and Cousteau&#10;Deep submersibles&#10;Mapping the Mariana Trench"
          ></textarea>
        </label>

        <div class="field-row">
          <label class="field">
            <span class="field-label">Narrator name <small>(optional)</small></span>
            <input v-model="narratorName" class="text-input" placeholder="e.g. Captain Marlow" />
          </label>
          <label class="field narrow">
            <span class="field-label">Target nodes</span>
            <input v-model.number="targetNodes" type="number" min="8" max="120" class="text-input" />
          </label>
        </div>

        <div class="studio-actions">
          <button class="ghost-btn" @click="close">Cancel</button>
          <button class="primary-btn" :disabled="!canBuildPrompt" @click="goToPrompt">Generate prompt →</button>
        </div>
      </section>

      <!-- STEP 2 — PROMPT -->
      <section v-else-if="step === 2" class="studio-body">
        <p class="hint">
          Copy this prompt into any capable AI (ChatGPT, Claude, Gemini…). It already contains every schema rule,
          the web-shape branching guidance, and the style of your existing narrations. Then come back and paste the JSON it returns.
        </p>
        <textarea ref="promptArea" class="text-area prompt-box mono" rows="14" readonly :value="generatedPrompt"></textarea>
        <div class="studio-actions">
          <button class="ghost-btn" @click="step = 1">← Edit details</button>
          <div class="spacer"></div>
          <button class="ghost-btn" @click="copyPrompt">{{ copied ? 'Copied ✓' : 'Copy prompt' }}</button>
          <button class="primary-btn" @click="step = 3">I have the JSON →</button>
        </div>
      </section>

      <!-- STEP 3 — IMPORT -->
      <section v-else class="studio-body">
        <p class="hint">Paste the AI's JSON output below, then validate it. Validation runs the same rules as <code>npm run validate</code>.</p>
        <textarea
          v-model="pastedJson"
          class="text-area mono"
          rows="10"
          placeholder="Paste the full narration JSON here…"
        ></textarea>

        <div class="studio-actions">
          <button class="ghost-btn" @click="step = 2">← Back to prompt</button>
          <div class="spacer"></div>
          <button class="primary-btn" :disabled="!pastedJson.trim()" @click="validate">Validate</button>
        </div>

        <div v-if="result" class="result">
          <div v-if="result.errors.length" class="result-block errors">
            <h3>✗ {{ result.errors.length }} error{{ result.errors.length === 1 ? '' : 's' }} — fix these before importing</h3>
            <ul><li v-for="(e, i) in result.errors" :key="i">{{ e }}</li></ul>
          </div>

          <template v-else>
            <div class="result-block ok">
              <h3>✓ Valid narration</h3>
              <p class="stats">
                {{ result.stats.nodeCount }} nodes ·
                {{ result.stats.twoChildShare }}% of branching nodes split into 2 ·
                longest straight chain: {{ result.stats.longestChain }}
              </p>
            </div>

            <div v-if="result.warnings.length" class="result-block warnings">
              <h3>⚠ Web-shape suggestions (optional)</h3>
              <ul><li v-for="(w, i) in result.warnings" :key="i">{{ w }}</li></ul>
            </div>

            <div class="result-block ok">
              <h3>Add it to the app</h3>
              <ol class="install-steps">
                <li>
                  Download the file and place it in <code>src/data/narrations/</code>:
                  <div><button class="primary-btn small" @click="downloadJson">Download {{ parsed.slug }}.json</button></div>
                </li>
                <li>
                  Add this entry to <code>src/data/index.json</code> (inside the <code>narrations</code> array):
                  <pre class="snippet">{{ indexSnippet }}</pre>
                  <button class="ghost-btn small" @click="copySnippet">{{ snippetCopied ? 'Copied ✓' : 'Copy snippet' }}</button>
                </li>
                <li>Reload the app — your new narration appears on the start screen.</li>
              </ol>
            </div>
          </template>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { buildNarrationPrompt, slugify } from '@/utils/narrationPromptBuilder.js'
import { validateNarration } from '@/utils/narrationValidator.js'

const props = defineProps({
  existingNarrations: { type: Array, default: () => [] }
})
const emit = defineEmits(['close'])

const step = ref(1)

const topic = ref('')
const title = ref('')
const slug = ref('')
const headersText = ref('')
const narratorName = ref('')
const targetNodes = ref(24)

const slugTouched = ref(false)
const generatedPrompt = ref('')
const pastedJson = ref('')
const result = ref(null)
const parsed = ref(null)
const copied = ref(false)
const snippetCopied = ref(false)
const promptArea = ref(null)

const existingSlugs = computed(() => props.existingNarrations.map(n => n.slug))

// Auto-fill slug from the title until the user edits it manually.
watch(title, val => {
  if (!slugTouched.value) slug.value = slugify(val)
})
watch(slug, () => { slugTouched.value = true }, { flush: 'post' })

const slugError = computed(() => {
  if (!slug.value) return ''
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.value)) return 'Use lowercase words separated by single hyphens.'
  if (existingSlugs.value.includes(slug.value)) return 'This slug already exists. Choose another.'
  return ''
})

const canBuildPrompt = computed(() =>
  Boolean((topic.value.trim() || title.value.trim()) && slug.value.trim() && !slugError.value)
)

const headers = computed(() =>
  headersText.value.split('\n').map(s => s.trim()).filter(Boolean)
)

function goToPrompt() {
  generatedPrompt.value = buildNarrationPrompt({
    topic: topic.value.trim(),
    slug: slug.value.trim(),
    title: title.value.trim(),
    headers: headers.value,
    targetNodes: targetNodes.value || 24,
    narratorName: narratorName.value.trim(),
    existingNarrations: props.existingNarrations
  })
  step.value = 2
}

async function copyPrompt() {
  await copyText(generatedPrompt.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 1600)
}

function validate() {
  result.value = null
  parsed.value = null
  let data
  try {
    data = JSON.parse(stripFences(pastedJson.value))
  } catch (e) {
    result.value = { errors: [`JSON parse error: ${e.message}`], warnings: [], stats: {} }
    return
  }
  parsed.value = data
  result.value = validateNarration(data, { existingSlugs: existingSlugs.value })
}

const indexSnippet = computed(() => {
  if (!parsed.value) return ''
  const entry = {
    slug: parsed.value.slug,
    title: parsed.value.title,
    description: parsed.value.description || '',
    file: `${parsed.value.slug}.json`,
    rootNodeIds: parsed.value.rootNodeIds || []
  }
  return JSON.stringify(entry, null, 2)
})

function downloadJson() {
  const blob = new Blob([JSON.stringify(parsed.value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${parsed.value.slug}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function copySnippet() {
  await copyText(indexSnippet.value)
  snippetCopied.value = true
  setTimeout(() => (snippetCopied.value = false), 1600)
}

function stripFences(text) {
  // Tolerate the AI wrapping output in ```json ... ``` fences.
  return text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    if (promptArea.value) {
      promptArea.value.select()
      document.execCommand('copy')
    }
  }
}

function close() {
  emit('close')
}

function onKey(e) {
  if (e.key === 'Escape') close()
}

onMounted(() => {
  document.addEventListener('keydown', onKey)
  nextTick(() => {})
})
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<style scoped>
.studio-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.72);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 1000;
}

.studio {
  width: 100%;
  max-width: 760px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 16px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.studio-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 20px 22px 14px;
  border-bottom: 1px solid #1e293b;
}

.studio-title {
  font-size: 20px;
  font-weight: 800;
  color: #f1f5f9;
  margin: 0;
}
.studio-sub {
  font-size: 13px;
  color: #64748b;
  margin: 4px 0 0;
}

.icon-btn {
  background: transparent;
  border: none;
  color: #64748b;
  font-size: 26px;
  line-height: 1;
  cursor: pointer;
  padding: 0 4px;
}
.icon-btn:hover { color: #e2e8f0; }

.stepper {
  display: flex;
  gap: 8px;
  padding: 12px 22px;
  border-bottom: 1px solid #1e293b;
}
.step {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: #475569;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid #1e293b;
}
.step.active { color: #0a0e1a; background: #f59e0b; border-color: #f59e0b; }
.step.done { color: #38bdf8; border-color: #1e3a5f; }

.studio-body {
  padding: 18px 22px 22px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 13px; font-weight: 600; color: #cbd5e1; }
.field-label small { color: #64748b; font-weight: 400; }
.field-row { display: flex; gap: 12px; }
.field-row .field { flex: 1; }
.field.narrow { max-width: 120px; }

.text-input, .text-area {
  background: #0a0e1a;
  border: 1px solid #1e293b;
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 14px;
  padding: 9px 11px;
  width: 100%;
  font-family: inherit;
}
.text-input:focus, .text-area:focus { outline: none; border-color: #f59e0b; }
.text-area { resize: vertical; line-height: 1.5; }
.mono { font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace; font-size: 12.5px; }
.prompt-box { background: #060a14; }

.inline-error { color: #f87171; font-size: 12px; }

.hint {
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.5;
  margin: 0;
}
.hint code { color: #f59e0b; }

.studio-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}
.spacer { flex: 1; }

.primary-btn {
  background: #f59e0b;
  border: none;
  color: #0a0e1a;
  font-weight: 700;
  font-size: 13px;
  padding: 9px 16px;
  border-radius: 8px;
  cursor: pointer;
}
.primary-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.primary-btn.small { padding: 6px 12px; font-size: 12px; }

.ghost-btn {
  background: #1e293b;
  border: 1px solid #334155;
  color: #cbd5e1;
  font-weight: 600;
  font-size: 13px;
  padding: 9px 14px;
  border-radius: 8px;
  cursor: pointer;
}
.ghost-btn:hover { background: #273549; }
.ghost-btn.small { padding: 6px 12px; font-size: 12px; }

.result { display: flex; flex-direction: column; gap: 12px; margin-top: 4px; }
.result-block {
  border-radius: 10px;
  padding: 12px 14px;
  border: 1px solid #1e293b;
  background: #0a0e1a;
}
.result-block h3 { font-size: 14px; margin: 0 0 6px; }
.result-block ul, .result-block ol { margin: 0; padding-left: 18px; }
.result-block li { font-size: 13px; line-height: 1.5; color: #cbd5e1; }
.result-block.errors { border-color: #7f1d1d; }
.result-block.errors h3 { color: #f87171; }
.result-block.warnings { border-color: #78510f; }
.result-block.warnings h3 { color: #fbbf24; }
.result-block.ok h3 { color: #34d399; }
.stats { font-size: 13px; color: #94a3b8; margin: 0; }

.install-steps li { margin-bottom: 10px; }
.snippet {
  background: #060a14;
  border: 1px solid #1e293b;
  border-radius: 8px;
  padding: 10px;
  font-size: 12px;
  color: #cbd5e1;
  overflow-x: auto;
  margin: 6px 0;
  white-space: pre;
}
code { font-family: ui-monospace, Consolas, monospace; color: #f59e0b; font-size: 12px; }
</style>
