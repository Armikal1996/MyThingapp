<template>
  <div class="voice-wrap">
    <BaseButton
      type="button"
      size="sm"
      :variant="isRecording ? 'danger' : 'ghost'"
      :disabled="disabled || isTranscribing || !available"
      :title="buttonTitle"
      @click="onClick"
    >
      <Loader2 v-if="isTranscribing" :size="16" class="spin" />
      <Mic v-else-if="!isRecording" :size="16" />
      <Square v-else :size="16" />
      <span class="label">{{ buttonLabel }}</span>
    </BaseButton>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Loader2, Mic, Square } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useVoiceInput } from '@/composables/useVoiceInput.js'
import { transcribeAudio, ensureWhisperReady } from '@/services/speechToText.js'

const props = defineProps({
  disabled: { type: Boolean, default: false },
  available: { type: Boolean, default: true }
})

const emit = defineEmits(['transcribed', 'error', 'recording-change', 'preparing'])

const isTranscribing = ref(false)
const {
  isRecording,
  isBusy,
  startRecording,
  stopRecording,
  cancelRecording
} = useVoiceInput()

const buttonLabel = computed(() => {
  if (isTranscribing.value) return 'Transcribing…'
  if (isRecording.value) return 'Stop'
  return 'Voice'
})

const buttonTitle = computed(() => {
  if (!props.available) return 'Voice input requires the MyThing desktop app'
  if (isRecording.value) return 'Stop recording'
  return 'Record voice message (push-to-talk)'
})

async function onClick() {
  if (props.disabled || !props.available) return

  if (isRecording.value) {
    isTranscribing.value = true
    emit('recording-change', false)
    try {
      const wavBlob = await stopRecording()
      if (!wavBlob) return
      const text = await transcribeAudio(wavBlob)
      emit('transcribed', text)
    } catch (e) {
      emit('error', e.message || 'Transcription failed')
    } finally {
      isTranscribing.value = false
    }
    return
  }

  try {
    emit('preparing', true)
    isTranscribing.value = true
    await ensureWhisperReady()
    isTranscribing.value = false
    emit('preparing', false)
    await startRecording()
    emit('recording-change', true)
  } catch (e) {
    isTranscribing.value = false
    emit('preparing', false)
    emit('error', e.message || 'Could not start recording')
  }
}

defineExpose({ cancelRecording, isBusy, isRecording })
</script>

<style scoped>
.voice-wrap {
  display: inline-flex;
}

.label {
  font-size: var(--text-caption);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
