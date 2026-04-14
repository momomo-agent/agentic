<script setup>
import { ref, onUnmounted } from 'vue'
import { ai } from './utils.js'

const props = defineProps({ markTested: Function })
const emit = defineEmits(['back'])

const voiceRecording = ref(false)
const voiceText = ref('')
let voiceMediaRecorder = null
let voiceChunks = []
let voiceStream = null

function toggleVoice() {
  if (voiceRecording.value) stopVoice()
  else startVoice()
}

async function startVoice() {
  try {
    voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    voiceMediaRecorder = new MediaRecorder(voiceStream, { mimeType: 'audio/webm;codecs=opus' })
    voiceChunks = []
    voiceText.value = ''

    voiceMediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) voiceChunks.push(e.data)
    }

    voiceMediaRecorder.onstop = async () => {
      const chunks = voiceChunks.slice()
      voiceChunks = []
      if (!chunks.length) {
        if (voiceRecording.value) restartVoiceRecorder()
        return
      }
      const blob = new Blob(chunks, { type: 'audio/webm' })
      try {
        const text = await ai.listen(blob)
        if (text) {
          voiceText.value += (voiceText.value ? '\n' : '') + text
          props.markTested?.('voice')
        }
      } catch (e) {
        voiceText.value += `\n⚠️ 转写失败: ${e.message}`
      }
      if (voiceRecording.value) restartVoiceRecorder()
    }

    voiceMediaRecorder.start(100)
    voiceRecording.value = true
    setTimeout(() => {
      if (voiceRecording.value && voiceMediaRecorder?.state === 'recording') voiceMediaRecorder.stop()
    }, 3000)
  } catch (e) {
    voiceText.value = `⚠️ 无法访问麦克风: ${e.message}`
  }
}

function restartVoiceRecorder() {
  if (!voiceMediaRecorder || !voiceStream) return
  try {
    voiceChunks = []
    voiceMediaRecorder.start(100)
    setTimeout(() => {
      if (voiceRecording.value && voiceMediaRecorder?.state === 'recording') voiceMediaRecorder.stop()
    }, 3000)
  } catch {}
}

function stopVoice() {
  voiceRecording.value = false
  if (voiceMediaRecorder?.state === 'recording') voiceMediaRecorder.stop()
  voiceMediaRecorder = null
  if (voiceStream) { voiceStream.getTracks().forEach(t => t.stop()); voiceStream = null }
}

onUnmounted(() => { stopVoice() })
</script>

<template>
  <div class="voice-panel">
    <div class="voice-status" :class="{ recording: voiceRecording }">
      <div class="voice-indicator">
        <div class="pulse-ring" v-if="voiceRecording"></div>
        <span class="voice-icon">{{ voiceRecording ? '🔴' : '🎙️' }}</span>
      </div>
      <div class="voice-state">{{ voiceRecording ? '正在录音...' : '点击开始' }}</div>
    </div>
    <button class="btn-voice" :class="{ active: voiceRecording }" @click="toggleVoice">
      {{ voiceRecording ? '⏹ 停止' : '🎤 开始录音' }}
    </button>
    <div class="voice-result" v-if="voiceText">
      <div class="result-label">识别结果</div>
      <div class="result-text">{{ voiceText }}</div>
    </div>
    <div class="voice-info">
      <p>使用 MediaRecorder 录音 + /api/transcribe 本地转写</p>
    </div>
  </div>
</template>

<style scoped>
@import './_shared.css';

.voice-panel { display: flex; flex-direction: column; align-items: center; gap: 24px; padding: 40px 0; }
.voice-status { text-align: center; }
.voice-indicator { position: relative; display: inline-block; margin-bottom: 12px; }
.voice-icon { font-size: 48px; position: relative; z-index: 1; }
.pulse-ring {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 80px; height: 80px; border-radius: 50%; border: 2px solid #ef4444;
  animation: pulse 1.5s ease-out infinite;
}
.voice-state { font-size: 15px; color: var(--text-dim); }
.voice-result, .voice-result { background: var(--surface-2, #1e293b); border-radius: 10px; padding: 16px; }
.voice-info { text-align: center; }
.voice-info p { font-size: 13px; color: var(--text-dim); margin: 4px 0; }
</style>
