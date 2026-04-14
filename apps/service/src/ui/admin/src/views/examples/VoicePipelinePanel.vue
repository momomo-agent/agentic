<template>
  <div class="vp-panel">
    <p class="hint">录音后一次调用 /api/voice（STT→LLM→TTS），最低延迟语音交互</p>
    <div class="vp-controls">
      <button @click="toggleVp" :class="{ recording: vpRecording }" class="btn-primary">
        {{ vpRecording ? '⏹ 停止录音' : '🎤 开始录音' }}
      </button>
      <span v-if="vpLatency !== null" class="vp-latency">延迟: {{ vpLatency }} ms</span>
    </div>
    <div v-if="vpLoading" class="vp-status">处理中...</div>
    <div v-if="vpAudioUrl" class="vp-result">
      <audio :src="vpAudioUrl" controls autoplay></audio>
    </div>
    <div v-if="vpError" class="result-text" style="color:#ef4444;">{{ vpError }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ai } from './utils.js'

const props = defineProps({ markTested: Function })
const emit = defineEmits(['back'])

const vpRecording = ref(false)
const vpLoading = ref(false)
const vpLatency = ref(null)
const vpAudioUrl = ref('')
const vpError = ref('')
let vpMediaRecorder = null
let vpStream = null

async function toggleVp() {
  if (vpRecording.value) {
    vpRecording.value = false
    if (vpMediaRecorder) vpMediaRecorder.stop()
    return
  }
  vpRecording.value = true
  vpError.value = ''
  vpAudioUrl.value = ''
  vpLatency.value = null
  try {
    vpStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    vpMediaRecorder = new MediaRecorder(vpStream)
    const chunks = []
    vpMediaRecorder.ondataavailable = e => chunks.push(e.data)
    vpMediaRecorder.onstop = async () => {
      vpStream?.getTracks().forEach(t => t.stop())
      const blob = new Blob(chunks, { type: 'audio/webm' })
      vpLoading.value = true
      const t0 = Date.now()
      try {
        const result = await ai.converse(blob)
        vpLatency.value = Date.now() - t0
        const audioBlob = new Blob([result.audio], { type: 'audio/wav' })
        vpAudioUrl.value = URL.createObjectURL(audioBlob)
        props.markTested?.('voice-pipeline')
      } catch (e) {
        vpError.value = e.message
      }
      vpLoading.value = false
    }
    vpMediaRecorder.start()
  } catch (e) {
    vpError.value = e.message
    vpRecording.value = false
  }
}
</script>

<style scoped>
@import './_shared.css';

.vp-panel { display: flex; flex-direction: column; gap: 16px; }
.vp-controls { display: flex; gap: 12px; align-items: center; }
.vp-latency { font-size: 13px; color: var(--text-dim); }
.vp-status { font-size: 14px; color: var(--text-dim); }
.vp-result { }
</style>
