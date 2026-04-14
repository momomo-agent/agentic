<template>
  <div class="wake-word-panel">
    <div class="ww-config">
      <label>唤醒词：</label>
      <input v-model="wwKeyword" placeholder="输入唤醒词，如：你好" class="ww-keyword-input" />
      <button @click="toggleWakeWord" :class="{ recording: wwRecording }" class="btn-primary">
        {{ wwRecording ? '⏹ 停止' : '🎤 开始监听' }}
      </button>
    </div>
    <div class="ww-status" v-if="wwRecording">
      <span class="ww-pulse"></span> 正在监听...
    </div>
    <div class="ww-transcript">
      <div v-for="(seg, i) in wwSegments" :key="i" class="ww-segment" :class="{ triggered: seg.triggered }">
        <span class="ww-time">{{ seg.time }}</span>
        <span class="ww-text" v-html="seg.html"></span>
        <span v-if="seg.triggered" class="ww-badge">🔔 唤醒</span>
      </div>
      <div v-if="!wwSegments.length" class="ww-empty">等待语音输入...</div>
    </div>
    <div class="ww-stats" v-if="wwSegments.length">
      <span>识别 {{ wwSegments.length }} 段</span>
      <span>唤醒 {{ wwSegments.filter(s => s.triggered).length }} 次</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { ai, float32ToWavBlob, loadVAD } from './utils.js'

const props = defineProps({ markTested: Function })
defineEmits(['back'])

const wwKeyword = ref('你好')
const wwRecording = ref(false)
const wwSegments = ref([])
let wwVAD = null

function toggleWakeWord() {
  if (wwRecording.value) stopWakeWord()
  else startWakeWord()
}

async function startWakeWord() {
  if (!wwKeyword.value.trim()) return
  try {
    const { VAD_VER, ORT_VER } = await loadVAD()
    wwRecording.value = true
    wwVAD = await window.vad.MicVAD.new({
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
          if (!text) return
          const keyword = wwKeyword.value.trim().toLowerCase()
          const lower = text.toLowerCase()
          const triggered = lower.includes(keyword)
          let html = text
          if (triggered) {
            const re = new RegExp(`(${wwKeyword.value.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
            html = text.replace(re, '<mark class="ww-highlight">$1</mark>')
          }
          const now = new Date()
          wwSegments.value.push({
            time: `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`,
            text, html, triggered
          })
          if (triggered) {
            props.markTested?.('wake-word')
            try {
              const ctx = new AudioContext()
              const osc = ctx.createOscillator()
              const gain = ctx.createGain()
              osc.connect(gain); gain.connect(ctx.destination)
              osc.frequency.value = 880; gain.gain.value = 0.3
              osc.start(); osc.stop(ctx.currentTime + 0.15)
            } catch {}
          }
        } catch {}
      }
    })
    wwVAD.start()
  } catch (e) {
    wwRecording.value = false
    wwSegments.value.push({ time: '--:--:--', text: `初始化失败: ${e.message}`, html: `初始化失败: ${e.message}`, triggered: false })
  }
}

function stopWakeWord() {
  wwRecording.value = false
  if (wwVAD) { wwVAD.pause(); wwVAD.destroy(); wwVAD = null }
}

onUnmounted(() => stopWakeWord())
</script>

<style scoped>
@import './_shared.css';
.wake-word-panel { display: flex; flex-direction: column; gap: 16px; }
.ww-config { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ww-config label { font-size: 14px; color: var(--text-secondary, #94a3b8); }
.ww-keyword-input { padding: 6px 12px; border-radius: 8px; border: 1px solid var(--border, #334155); background: var(--surface-2, #1e293b); color: var(--text, #e2e8f0); font-size: 14px; width: 120px; }
.ww-status { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #10b981; }
.ww-pulse { width: 8px; height: 8px; border-radius: 50%; background: #10b981; animation: pulse 1.5s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
.ww-transcript { display: flex; flex-direction: column; gap: 8px; max-height: 400px; overflow-y: auto; }
.ww-segment { display: flex; align-items: baseline; gap: 10px; padding: 8px 12px; border-radius: 8px; background: var(--surface-2, #1e293b); transition: all 0.3s; }
.ww-segment.triggered { background: rgba(239, 68, 68, 0.12); border-left: 3px solid #ef4444; }
.ww-time { font-size: 12px; color: var(--text-secondary, #64748b); font-family: monospace; flex-shrink: 0; }
.ww-text { font-size: 14px; color: var(--text, #e2e8f0); }
.ww-text :deep(.ww-highlight) { background: rgba(239, 68, 68, 0.3); color: #fca5a5; padding: 1px 4px; border-radius: 3px; font-weight: 600; }
.ww-badge { font-size: 11px; background: rgba(239, 68, 68, 0.2); color: #fca5a5; padding: 2px 8px; border-radius: 10px; flex-shrink: 0; }
.ww-empty { color: var(--text-secondary, #64748b); font-size: 14px; text-align: center; padding: 40px 0; }
.ww-stats { display: flex; gap: 16px; font-size: 13px; color: var(--text-secondary, #94a3b8); }
</style>
