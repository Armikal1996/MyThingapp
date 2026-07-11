import { invoke } from '@tauri-apps/api/core'
import { isTauri } from '@/services/platform.js'
import { blobToBase64 } from '@/utils/audioWav.js'
import whisperConfig from '../../config/whisper.json'

export class DesktopRequiredError extends Error {
  constructor(message = 'Voice input requires the MyThing desktop app.') {
    super(message)
    this.name = 'DesktopRequiredError'
  }
}

export async function getWhisperStatus() {
  if (!isTauri()) {
    return {
      ready: false,
      modelReady: false,
      binaryReady: false,
      message: 'Voice input requires the MyThing desktop app.'
    }
  }
  return invoke('whisper_get_status')
}

export async function ensureWhisperReady() {
  if (!isTauri()) {
    throw new DesktopRequiredError()
  }
  return invoke('whisper_ensure_ready')
}

export async function transcribeAudio(wavBlob, language = whisperConfig.language || 'en') {
  if (!isTauri()) {
    throw new DesktopRequiredError()
  }

  const audioBase64 = await blobToBase64(wavBlob)
  return invoke('whisper_transcribe', {
    audioBase64,
    language
  })
}

export function isVoiceAvailable() {
  return isTauri()
}
