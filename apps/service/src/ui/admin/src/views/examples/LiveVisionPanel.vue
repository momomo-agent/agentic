<template>
  <div class="live-vision-panel">
    <div class="lv-main">
      <div class="lv-video-area">
        <video ref="lvVideoEl" autoplay playsinline class="camera-video"></video>
        <canvas ref="lvCanvasEl" style="display:none"></canvas>
        <div class="lv-controls">
          <button class="btn-voice" :class="{ active: lvRunning }" @click="toggleLiveVision">
            {{ lvRunning ? '⏹ 停止' : '▶ 开始' }}
          </button>
          <label class="compat-toggle lv-toggle"><input type="checkbox" v-model="lvMultiFrame" /> 多帧上下文</label>
        </div>
      </div>
      <div class="lv-log" ref="lvLogEl">
        <div class="result-label">AI 描述</div>
        <div v-for="(entry, i) in lvEntries" :key="i" class="lv-entry">
          <span class="lv-time">{{ entry.time }}</span>
          <span class="lv-text">{{ entry.text }}</span>
        </div>
        <div v-if="!lvEntries.length" class="lv-empty">等待开始...</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { ai } from './utils.js'

const props = defineProps({ markTested: Function })
const emit = defineEmits(['back'])

const lvVideoEl = ref(null)
const lvCanvasEl = ref(null)
const lvLogEl = ref(null)
const lvRunning = ref(false)
const lvEntries = ref([])
const lvMultiFrame = ref(false)
let lvStream = null
let lvInterval = null
let lvHistory = []

async function toggleLiveVision() {
  if (lvRunning.value) {
    stopLiveVision()
  } else {
    try {
      lvStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      await nextTick()
      if (lvVideoEl.value) {
        lvVideoEl.value.srcObject = lvStream
        await new Promise(resolve => {
          if (lvVideoEl.value.readyState >= 2) return resolve()
          lvVideoEl.value.addEventListener('playing', resolve, { once: true })
          lvVideoEl.value.play().catch(() => {})
        })
      }
      lvRunning.value = true
      lvLoop()
    } catch (e) {
      console.error('Camera error:', e)
    }
  }
}

function stopLiveVision() {
  lvRunning.value = false
  if (lvInterval) { clearTimeout(lvInterval); lvInterval = null }
  if (lvStream) { lvStream.getTracks().forEach(t => t.stop()); lvStream = null }
  lvHistory = []
}

async function lvLoop() {
  if (!lvRunning.value) return
  await captureAndDescribe()
  if (lvRunning.value) {
    lvInterval = setTimeout(lvLoop, 3000)
  }
}

async function captureAndDescribe() {
  if (!lvVideoEl.value || !lvCanvasEl.value) return
  const v = lvVideoEl.value
  const c = lvCanvasEl.value
  if (!v.videoWidth || !v.videoHeight || v.readyState < 2) return
  const maxW = 640
  const scale = v.videoWidth > maxW ? maxW / v.videoWidth : 1
  c.width = Math.round(v.videoWidth * scale)
  c.height = Math.round(v.videoHeight * scale)
  c.getContext('2d').drawImage(v, 0, 0, c.width, c.height)
  const dataUrl = c.toDataURL('image/jpeg', 0.6)
  if (dataUrl.length < 1000) return

  const now = new Date()
  const time = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`
  const entry = { time, text: '分析中...' }
  lvEntries.value.push(entry)
  await nextTick()
  if (lvLogEl.value) lvLogEl.value.scrollTop = lvLogEl.value.scrollHeight

  try {
    entry.text = ''
    for await (const chunk of ai.see(dataUrl, '简洁描述你在这张图片中看到的内容，用一两句话概括。', { stream: true })) {
      if (chunk.type === 'text_delta') entry.text += chunk.text || ''
      if (chunk.type === 'error') { entry.text = `错误: ${chunk.error}`; break }
    }
    props.markTested?.('live-vision')
    if (lvMultiFrame.value && entry.text && !entry.text.startsWith('错误')) {
      lvHistory.push({ role: 'user', content: '描述这张图片' })
      lvHistory.push({ role: 'assistant', content: entry.text })
      if (lvHistory.length > 12) lvHistory = lvHistory.slice(-12)
    }
  } catch (e) {
    entry.text = `错误: ${e.message}`
  }
  await nextTick()
  if (lvLogEl.value) lvLogEl.value.scrollTop = lvLogEl.value.scrollHeight
}
</script>

<style scoped>
@import './_shared.css';

.live-vision-panel { display: flex; flex-direction: column; gap: 16px; }
.lv-main { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.lv-video-area { display: flex; flex-direction: column; gap: 12px; align-items: center; }
.lv-controls { display: flex; align-items: center; gap: 16px; }
.lv-toggle { font-size: 13px; color: var(--text-dim); }
.lv-video-area .camera-video { width: 100%; border-radius: 10px; background: #000; min-height: 240px; }
.lv-log {
  background: var(--surface-2, #1e293b); border-radius: 10px; padding: 16px;
  overflow-y: auto; max-height: 400px;
}
.lv-entry { margin-bottom: 10px; font-size: 14px; line-height: 1.5; }
.lv-time { color: var(--accent, #3b82f6); font-size: 12px; margin-right: 8px; font-family: 'SF Mono', monospace; }
.lv-text { color: var(--text); }
.lv-empty { color: var(--text-dim); font-size: 14px; }
</style>
