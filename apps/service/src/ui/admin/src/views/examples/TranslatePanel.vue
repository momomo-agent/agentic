<template>
  <div class="translate-panel">
    <div class="translate-controls">
      <div class="translate-lang-row">
        <label>目标语言：</label>
        <select v-model="translateLang">
          <option value="英文">中 → 英</option>
          <option value="中文">英 → 中</option>
          <option value="中文">日 → 中</option>
        </select>
      </div>
      <div class="translate-input-row">
        <input v-model="translateInput" @keydown.enter="runTranslate" placeholder="输入要翻译的文字..." :disabled="translateLoading" />
        <button class="btn-mic-small" @click="translateFromMic" :disabled="translateMicLoading">
          {{ translateMicLoading ? '识别中...' : '🎤' }}
        </button>
        <button @click="runTranslate" :disabled="!translateInput.trim() || translateLoading">
          {{ translateLoading ? '翻译中...' : '翻译' }}
        </button>
      </div>
    </div>
    <div class="translate-result" v-if="translateOriginal || translateResult">
      <div v-if="translateOriginal" class="translate-row">
        <div class="result-label">原文</div>
        <div class="result-text">{{ translateOriginal }}</div>
      </div>
      <div v-if="translateResult" class="translate-row">
        <div class="result-label">译文</div>
        <div class="result-text">{{ translateResult }}</div>
      </div>
      <div v-if="translateAudioUrl" class="translate-row">
        <audio :src="translateAudioUrl" controls autoplay class="tts-audio"></audio>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ai } from './utils.js'

const props = defineProps({ markTested: Function })
defineEmits(['back'])

const translateInput = ref('')
const translateLang = ref('英文')
const translateOriginal = ref('')
const translateResult = ref('')
const translateLoading = ref(false)
const translateMicLoading = ref(false)
const translateAudioUrl = ref(null)

async function runTranslate() {
  const text = translateInput.value.trim()
  if (!text || translateLoading.value) return
  translateLoading.value = true
  translateOriginal.value = text
  translateResult.value = ''
  translateAudioUrl.value = null

  try {
    for await (const chunk of ai.think(`翻译成${translateLang.value}：${text}`, { stream: true })) {
      if (chunk.type === 'text_delta') translateResult.value += chunk.text || ''
    }
    props.markTested?.('translate')
    if (translateResult.value) {
      try {
        const audioBuffer = await ai.speak(translateResult.value)
        const blob = new Blob([audioBuffer], { type: 'audio/wav' })
        if (translateAudioUrl.value) URL.revokeObjectURL(translateAudioUrl.value)
        translateAudioUrl.value = URL.createObjectURL(blob)
      } catch {}
    }
  } catch (e) {
    translateResult.value = `错误: ${e.message}`
  }
  translateLoading.value = false
}

async function translateFromMic() {
  if (translateMicLoading.value) return
  translateMicLoading.value = true
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
    const chunks = []
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
    await new Promise(resolve => {
      recorder.onstop = resolve
      recorder.start()
      setTimeout(() => { if (recorder.state === 'recording') recorder.stop() }, 5000)
    })
    stream.getTracks().forEach(t => t.stop())
    const blob = new Blob(chunks, { type: 'audio/webm' })
    const text = await ai.listen(blob)
    translateInput.value = text || ''
  } catch (e) {
    console.error('Mic error:', e)
  }
  translateMicLoading.value = false
}
</script>

<style scoped>
@import './_shared.css';
.translate-panel { display: flex; flex-direction: column; gap: 16px; }
.translate-controls { display: flex; flex-direction: column; gap: 12px; }
.translate-lang-row { display: flex; align-items: center; gap: 10px; }
.translate-lang-row label { font-size: 14px; color: var(--text-secondary, #94a3b8); }
.translate-lang-row select { padding: 6px 12px; border-radius: 8px; border: 1px solid var(--border, #334155); background: var(--surface-2, #1e293b); color: var(--text, #e2e8f0); font-size: 14px; }
.translate-input-row { display: flex; gap: 8px; }
.translate-input-row input { flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border, #334155); background: var(--surface-2, #1e293b); color: var(--text); font-size: 14px; }
.translate-input-row button { padding: 10px 16px; border-radius: 8px; border: none; background: var(--accent, #3b82f6); color: white; cursor: pointer; font-size: 14px; }
.translate-input-row button:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-mic-small { padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border, #334155); background: var(--surface-2, #1e293b); color: var(--text); cursor: pointer; font-size: 16px; }
.translate-result { display: flex; flex-direction: column; gap: 12px; }
.translate-row { display: flex; flex-direction: column; gap: 4px; }
.tts-audio { width: 100%; margin-top: 8px; }
</style>
