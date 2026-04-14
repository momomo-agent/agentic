<template>
  <div class="subtitle-panel" :class="'font-' + subtitleSize">
    <div class="subtitle-controls">
      <button class="btn-voice" :class="{ active: subRecording }" @click="toggleSubtitle">
        {{ subRecording ? '⏹ 停止' : '🎙️ 开始字幕' }}
      </button>
      <div class="subtitle-size-btns">
        <button :class="{ active: subtitleSize === 'small' }" @click="subtitleSize = 'small'">小</button>
        <button :class="{ active: subtitleSize === 'medium' }" @click="subtitleSize = 'medium'">中</button>
        <button :class="{ active: subtitleSize === 'large' }" @click="subtitleSize = 'large'">大</button>
      </div>
    </div>
    <div class="subtitle-display">
      <div class="subtitle-current">{{ subCurrent || '等待语音...' }}</div>
      <div class="subtitle-history" ref="subHistoryEl">
        <div v-for="(line, i) in subHistory" :key="i" class="subtitle-line">{{ line }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { ai, float32ToWavBlob, loadVAD } from './utils.js'

const props = defineProps({ markTested: Function })
const emit = defineEmits(['back'])

const subRecording = ref(false)
const subCurrent = ref('')
const subHistory = ref([])
const subtitleSize = ref('medium')
const subHistoryEl = ref(null)
let subVAD = null

function toggleSubtitle() {
  if (subRecording.value) stopSubtitle()
  else startSubtitle()
}

async function startSubtitle() {
  try {
    const { VAD_VER, ORT_VER } = await loadVAD()
    subRecording.value = true
    subVAD = await window.vad.MicVAD.new({
      onnxWASMBasePath: `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VER}/dist/`,
      baseAssetPath: `https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@${VAD_VER}/dist/`,
      positiveSpeechThreshold: 0.5,
      negativeSpeechThreshold: 0.25,
      redemptionFrames: 10,
      minSpeechFrames: 5,
      onSpeechEnd: async (audio) => {
        const wavBlob = float32ToWavBlob(audio, 16000)
        try {
          const text = await ai.listen(wavBlob)
          if (text) {
            if (subCurrent.value) subHistory.value.push(subCurrent.value)
            subCurrent.value = text
            props.markTested?.('subtitle')
            await nextTick()
            if (subHistoryEl.value) subHistoryEl.value.scrollTop = subHistoryEl.value.scrollHeight
          }
        } catch {}
      }
    })
    subVAD.start()
  } catch (e) {
    subCurrent.value = `VAD 初始化失败: ${e.message}`
    subRecording.value = false
  }
}

function stopSubtitle() {
  subRecording.value = false
  if (subVAD) { subVAD.destroy(); subVAD = null }
}
</script>

<style scoped>
@import './_shared.css';

.subtitle-panel { display: flex; flex-direction: column; gap: 16px; }
.subtitle-controls { display: flex; gap: 12px; align-items: center; }
.subtitle-size-btns { display: flex; gap: 4px; }
.subtitle-size-btns button {
  padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border, #334155);
  background: var(--surface-2, #1e293b); color: var(--text); cursor: pointer; font-size: 13px;
}
.subtitle-size-btns button.active { background: var(--accent, #3b82f6); border-color: var(--accent, #3b82f6); }
.subtitle-display {
  background: #000; border-radius: 10px; padding: 32px; min-height: 300px;
  display: flex; flex-direction: column; justify-content: center; align-items: center;
}
.subtitle-current {
  color: #fff; text-align: center; margin-bottom: 24px; font-weight: 600;
}
.font-small .subtitle-current { font-size: 24px; }
.font-medium .subtitle-current { font-size: 36px; }
.font-large .subtitle-current { font-size: 52px; }
.subtitle-history {
  max-height: 150px; overflow-y: auto; width: 100%; text-align: center;
}
.subtitle-line { color: rgba(255,255,255,0.5); font-size: 14px; margin-bottom: 4px; }
</style>
