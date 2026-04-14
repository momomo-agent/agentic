<script setup>
import { ref } from 'vue'
import { ai } from './utils.js'

const props = defineProps({ markTested: Function })
const emit = defineEmits(['back'])

const ttsInput = ref('')
const ttsLoading = ref(false)
const ttsAudioUrl = ref(null)
const ttsLatency = ref(null)
const ttsError = ref('')

async function runTts() {
  if (!ttsInput.value.trim() || ttsLoading.value) return
  ttsLoading.value = true
  ttsAudioUrl.value = null
  ttsLatency.value = null
  ttsError.value = ''
  const t0 = Date.now()
  try {
    const audioBuffer = await ai.speak(ttsInput.value)
    ttsLatency.value = Date.now() - t0
    const blob = new Blob([audioBuffer], { type: 'audio/wav' })
    if (ttsAudioUrl.value) URL.revokeObjectURL(ttsAudioUrl.value)
    ttsAudioUrl.value = URL.createObjectURL(blob)
    props.markTested?.('tts')
  } catch (e) {
    ttsError.value = e.message
    if (!ttsLatency.value) ttsLatency.value = Date.now() - t0
  }
  ttsLoading.value = false
}
</script>

<template>
  <div class="tts-panel">
    <div class="tts-controls">
      <textarea v-model="ttsInput" placeholder="输入要合成的文字..." rows="3"></textarea>
      <button @click="runTts" :disabled="!ttsInput.trim() || ttsLoading">
        {{ ttsLoading ? '合成中...' : '🔊 合成语音' }}
      </button>
    </div>
    <div class="tts-result" v-if="ttsAudioUrl || ttsLatency || ttsError">
      <div class="result-label">合成结果</div>
      <div v-if="ttsError" class="error-text">{{ ttsError }}</div>
      <audio v-if="ttsAudioUrl" :src="ttsAudioUrl" controls class="tts-audio"></audio>
      <div v-if="ttsLatency" class="tts-latency">延迟: {{ ttsLatency }}ms</div>
    </div>
  </div>
</template>

<style scoped>
@import './_shared.css';

.tts-panel { display: flex; flex-direction: column; gap: 16px; }
.tts-controls { display: flex; flex-direction: column; gap: 12px; }
.tts-controls textarea {
  width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border, #334155);
  background: var(--surface-2, #1e293b); color: var(--text); font-size: 14px;
  resize: vertical; font-family: inherit;
}
.tts-controls button {
  align-self: flex-start; padding: 10px 24px; border-radius: 8px; border: none;
  background: var(--accent, #3b82f6); color: white; cursor: pointer; font-size: 14px;
}
.tts-controls button:disabled { opacity: 0.5; cursor: not-allowed; }
.tts-result {
  background: var(--surface-2, #1e293b); border-radius: 10px; padding: 16px;
  display: flex; flex-direction: column; gap: 12px;
}
.tts-audio { width: 100%; }
.tts-latency { font-size: 13px; color: var(--text-dim); }
</style>
