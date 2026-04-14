<template>
  <div class="dictation-panel">
    <div class="dictation-controls">
      <button class="btn-voice" :class="{ active: dictRecording }" @click="toggleDictation">
        {{ dictRecording ? '⏹ 停止听写' : '🎙️ 开始听写' }}
      </button>
      <button class="btn-secondary" @click="copyDictation" :disabled="!dictText">📋 复制全文</button>
    </div>
    <textarea class="dictation-text" :value="dictText" readonly placeholder="开始录音后，转写文字将在这里实时显示..." rows="12"></textarea>
    <div class="dictation-footer">
      <span>总时长：{{ dictDuration }}s</span>
      <span>字数：{{ dictText.length }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ai } from './utils.js'

const props = defineProps({ markTested: Function })
const emit = defineEmits(['back'])

const dictRecording = ref(false)
const dictText = ref('')
const dictDuration = ref(0)
let dictRecorder = null
let dictStream = null
let dictStartTime = 0
let dictTimerInterval = null

function toggleDictation() {
  if (dictRecording.value) stopDictation()
  else startDictation()
}

async function startDictation() {
  try {
    dictStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    dictRecorder = new MediaRecorder(dictStream, { mimeType: 'audio/webm;codecs=opus' })
    dictRecording.value = true
    dictStartTime = Date.now()
    dictTimerInterval = setInterval(() => { dictDuration.value = Math.floor((Date.now() - dictStartTime) / 1000) }, 500)

    let chunks = []
    dictRecorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
    dictRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'audio/webm' })
      chunks = []
      if (blob.size < 100) return
      try {
        const text = await ai.listen(blob)
        if (text) { dictText.value += text; props.markTested?.('dictation') }
      } catch {}
      // restart if still recording
      if (dictRecording.value && dictRecorder && dictStream) {
        chunks = []
        dictRecorder.start(100)
        setTimeout(() => { if (dictRecorder && dictRecorder.state === 'recording') dictRecorder.stop() }, 3000)
      }
    }
    dictRecorder.start(100)
    setTimeout(() => { if (dictRecorder && dictRecorder.state === 'recording') dictRecorder.stop() }, 3000)
  } catch (e) {
    dictText.value = `麦克风错误: ${e.message}`
    dictRecording.value = false
  }
}

function stopDictation() {
  dictRecording.value = false
  if (dictTimerInterval) { clearInterval(dictTimerInterval); dictTimerInterval = null }
  if (dictRecorder && dictRecorder.state === 'recording') dictRecorder.stop()
  if (dictStream) { dictStream.getTracks().forEach(t => t.stop()); dictStream = null }
  dictRecorder = null
}

function copyDictation() {
  navigator.clipboard.writeText(dictText.value).catch(() => {})
}
</script>

<style scoped>
@import './_shared.css';

.dictation-panel { display: flex; flex-direction: column; gap: 16px; }
.dictation-controls { display: flex; gap: 12px; align-items: center; }
.dictation-text {
  width: 100%; padding: 16px; border-radius: 10px; border: 1px solid var(--border, #334155);
  background: var(--surface-2, #1e293b); color: var(--text); font-size: 15px;
  resize: vertical; font-family: inherit; line-height: 1.6;
}
.dictation-footer {
  display: flex; gap: 20px; font-size: 13px; color: var(--text-dim);
}
</style>
