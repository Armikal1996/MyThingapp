import { ref, computed } from 'vue'
import { blobTo16kMonoWav } from '@/utils/audioWav.js'

export function useVoiceInput() {
  const state = ref('idle') // idle | recording | transcribing
  const error = ref(null)
  const permissionDenied = ref(false)

  let mediaStream = null
  let mediaRecorder = null
  let chunks = []

  const isRecording = computed(() => state.value === 'recording')
  const isBusy = computed(() => state.value === 'recording' || state.value === 'transcribing')

  async function ensureMicPermission() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone not supported in this environment.')
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(t => t.stop())
      permissionDenied.value = false
      return true
    } catch (e) {
      permissionDenied.value = true
      throw new Error('Microphone permission denied. Allow mic access in Windows Settings.')
    }
  }

  async function startRecording() {
    if (state.value !== 'idle') return
    error.value = null
    await ensureMicPermission()

    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        channelCount: 1
      }
    })

    chunks = []
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm'

    mediaRecorder = new MediaRecorder(mediaStream, { mimeType })
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }

    mediaRecorder.start(250)
    state.value = 'recording'
  }

  function stopTracks() {
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop())
      mediaStream = null
    }
  }

  async function stopRecording() {
    if (state.value !== 'recording' || !mediaRecorder) {
      return null
    }

    state.value = 'transcribing'

    const blob = await new Promise((resolve, reject) => {
      mediaRecorder.onstop = async () => {
        try {
          const raw = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' })
          stopTracks()
          if (raw.size < 500) {
            reject(new Error('Recording too short. Hold the mic and speak clearly.'))
            return
          }
          const wav = await blobTo16kMonoWav(raw)
          resolve(wav)
        } catch (e) {
          reject(e)
        }
      }
      mediaRecorder.onerror = () => reject(new Error('Recording failed'))
      mediaRecorder.stop()
    })

    state.value = 'idle'
    return blob
  }

  function cancelRecording() {
    if (mediaRecorder && state.value === 'recording') {
      try {
        mediaRecorder.stop()
      } catch {
        /* ignore */
      }
    }
    stopTracks()
    chunks = []
    state.value = 'idle'
  }

  return {
    state,
    error,
    permissionDenied,
    isRecording,
    isBusy,
    startRecording,
    stopRecording,
    cancelRecording,
    ensureMicPermission
  }
}
