<script setup>
import { ref, nextTick, onUnmounted } from 'vue'
import { ai, base64ToBlob } from './utils.js'

const props = defineProps({ markTested: Function })
const emit = defineEmits(['back'])

const parlorHistory = ref([])
const parlorRecording = ref(false)
const parlorTranscribing = ref(false)
const parlorStatus = ref('')
const parlorEl = ref(null)
let parlorWs = null
let parlorRecorder = null
let parlorStream = null
let parlorAudioQueue = []
let parlorPlaying = false

function scrollParlor() {
  if (parlorEl.value) parlorEl.value.scrollTop = parlorEl.value.scrollHeight
}

function ensureParlorWs() {
  if (parlorWs && parlorWs.readyState === WebSocket.OPEN) return
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
  parlorWs = new WebSocket(`${proto}//${location.host}`)
  parlorWs.onopen = () => { parlorStatus.value = '已连接' }
  parlorWs.onclose = () => { parlorStatus.value = '已断开' }
  parlorWs.onerror = () => { parlorStatus.value = '连接错误' }
  parlorWs.onmessage = async (e) => {
    try {
      const msg = JSON.parse(e.data)
      if (msg.type === 'transcription' || msg.transcription) {
        const text = msg.transcription || msg.text
        if (text) {
          parlorHistory.value.push({ role: 'user', content: text })
          parlorTranscribing.value = false
          await nextTick(); scrollParlor()
        }
      } else if (msg.type === 'audio_chunk') {
        const audioData = msg.audio || msg.data
        const text = msg.text || ''
        if (text) {
          const last = parlorHistory.value[parlorHistory.value.length - 1]
          if (last && last.role === 'assistant' && last._streaming) {
            last.content += text
          } else {
            parlorHistory.value.push({ role: 'assistant', content: text, audioUrl: null, _streaming: true })
          }
          await nextTick(); scrollParlor()
        }
        if (audioData) {
          const blob = base64ToBlob(audioData, 'audio/mp3')
          const url = URL.createObjectURL(blob)
          const last = parlorHistory.value[parlorHistory.value.length - 1]
          if (last && last.role === 'assistant') last.audioUrl = url
          parlorAudioQueue.push(url)
          drainParlorAudio()
        }
      } else if (msg.type === 'voice_stream_end') {
        parlorTranscribing.value = false
        const last = parlorHistory.value[parlorHistory.value.length - 1]
        if (last && last._streaming) delete last._streaming
        if (!msg.skipped) props.markTested?.('parlor')
      } else if (msg.type === 'error') {
        parlorTranscribing.value = false
        parlorHistory.value.push({ role: 'assistant', content: `⚠️ ${msg.error}` })
        await nextTick(); scrollParlor()
      }
    } catch {}
  }
}

async function drainParlorAudio() {
  if (parlorPlaying || !parlorAudioQueue.length) return
  parlorPlaying = true
  while (parlorAudioQueue.length) {
    const url = parlorAudioQueue.shift()
    await new Promise(resolve => {
      const a = new Audio(url)
      a.onended = resolve
      a.onerror = resolve
      a.play().catch(resolve)
    })
  }
  parlorPlaying = false
}

function playAudio(url) {
  new Audio(url).play().catch(() => {})
}

async function parlorStartRec() {
  ensureParlorWs()
  try {
    parlorStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    parlorRecorder = new MediaRecorder(parlorStream, { mimeType: 'audio/webm;codecs=opus' })
    const chunks = []
    parlorRecorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
    parlorRecorder.onstop = async () => {
      parlorStream?.getTracks().forEach(t => t.stop())
      parlorStream = null
      const blob = new Blob(chunks, { type: 'audio/webm' })
      parlorTranscribing.value = true
      // Send audio via WebSocket
      const reader = new FileReader()
      reader.onload = () => {
        if (parlorWs && parlorWs.readyState === WebSocket.OPEN) {
          parlorWs.send(JSON.stringify({ type: 'voice_stream', audio: reader.result.split(',')[1] }))
        }
      }
      reader.readAsDataURL(blob)
    }
    parlorRecorder.start()
    parlorRecording.value = true
  } catch (e) {
    parlorStatus.value = `麦克风错误: ${e.message}`
  }
}

function parlorStopRec() {
  parlorRecording.value = false
  if (parlorRecorder && parlorRecorder.state === 'recording') parlorRecorder.stop()
}

function closeParlorWs() {
  if (parlorWs) { parlorWs.close(); parlorWs = null }
  if (parlorStream) { parlorStream.getTracks().forEach(t => t.stop()); parlorStream = null }
}

onUnmounted(() => { closeParlorWs() })
</script>

<template>
  <div class="parlor-panel">
    <div class="parlor-messages" ref="parlorEl">
      <div v-for="(msg, i) in parlorHistory" :key="i" class="chat-msg" :class="msg.role">
        <div class="msg-bubble">
          {{ msg.content }}
          <button v-if="msg.role === 'assistant' && msg.audioUrl" class="btn-play-inline" @click="playAudio(msg.audioUrl)">▶</button>
        </div>
      </div>
      <div v-if="parlorTranscribing" class="chat-msg user">
        <div class="msg-bubble loading">识别中...</div>
      </div>
    </div>
    <div class="parlor-controls">
      <button
        class="btn-voice"
        :class="{ active: parlorRecording }"
        @mousedown.prevent="parlorStartRec"
        @mouseup.prevent="parlorStopRec"
        @touchstart.prevent="parlorStartRec"
        @touchend.prevent="parlorStopRec"
      >
        {{ parlorRecording ? '🎙️ 松开发送' : '🎤 按住说话' }}
      </button>
      <span class="parlor-status">{{ parlorStatus }}</span>
    </div>
  </div>
</template>

<style scoped>
@import './_shared.css';

.parlor-panel { display: flex; flex-direction: column; height: 500px; }
.parlor-messages {
  flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px;
  background: var(--surface-2, #1e293b); border-radius: 10px;
}
.parlor-controls {
  display: flex; align-items: center; gap: 12px; margin-top: 12px; justify-content: center;
}
.parlor-status { font-size: 13px; color: var(--text-dim); }
</style>
