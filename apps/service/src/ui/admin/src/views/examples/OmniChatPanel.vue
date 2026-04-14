<template>
  <div class="omni-panel">
    <div class="omni-main">
      <div class="omni-media">
        <div class="omni-camera">
          <video ref="omniVideoEl" autoplay playsinline class="camera-video"></video>
          <canvas ref="omniCanvasEl" style="display:none"></canvas>
          <div class="omni-camera-controls">
            <button @click="toggleOmniCamera" :class="{ active: omniCameraOn }">
              {{ omniCameraOn ? '📷 关闭' : '📷 开启' }}
            </button>
            <button v-if="omniCameraOn" @click="toggleOmniWatch" :class="{ active: omniAutoWatch }">
              {{ omniAutoWatch ? '👁️ 监视中' : '👁️ 自动监视' }}
            </button>
          </div>
        </div>
        <div class="omni-controls-row">
          <button @click="toggleOmniAutoSpeak" :class="{ active: omniAutoSpeak }">
            {{ omniAutoSpeak ? '🔊 朗读' : '🔇 静音' }}
          </button>
          <button @click="toggleOmniMic" :class="{ recording: omniListening, active: omniListening }">
            {{ omniListening ? '🎤 聆听中...' : '🎤 开始对话' }}
          </button>
        </div>
        <div v-if="omniSpeaking" class="omni-status">🗣️ AI 正在说话...</div>
        <div v-else-if="omniLoading" class="omni-status">🤔 思考中...</div>
        <div v-else-if="omniListening" class="omni-status listening-pulse">👂 说点什么...</div>
      </div>
      <div class="omni-chat">
        <div class="chat-messages" ref="omniChatEl">
          <div v-for="(msg, i) in omniHistory" :key="i" class="chat-msg" :class="msg.role">
            <img v-if="msg.image" :src="msg.image" class="mm-msg-img" />
            <div class="msg-bubble" v-if="msg.content">{{ msg.content }}</div>
            <span v-if="msg.source" class="omni-source">{{ msg.source }}</span>
          </div>
        </div>
        <div class="omni-input-row">
          <input v-model="omniInput" @keydown.enter="sendOmniText" placeholder="输入消息..." :disabled="omniLoading" />
          <button @click="sendOmniText" :disabled="omniLoading || !omniInput.trim()">发送</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onUnmounted } from 'vue'
import { ai, float32ToWavBlob, loadVAD } from './utils.js'

const props = defineProps({ markTested: Function })
defineEmits(['back'])

const omniVideoEl = ref(null)
const omniCanvasEl = ref(null)
const omniChatEl = ref(null)
const omniCameraOn = ref(false)
const omniListening = ref(false)
const omniInput = ref('')
const omniLoading = ref(false)
const omniHistory = ref([])
const omniAutoSpeak = ref(true)
const omniAutoWatch = ref(false)
const omniSpeaking = ref(false)
let omniStream = null
let omniVAD = null
let omniFrameTimer = null
let omniWatchTimer = null
let omniLastFrameData = null

function toggleOmniAutoSpeak() {
  omniAutoSpeak.value = !omniAutoSpeak.value
}

let omniSpeakingAudio = null
async function omniSpeak(text) {
  if (!omniAutoSpeak.value || !text.trim()) return
  try {
    if (omniSpeakingAudio) { omniSpeakingAudio.pause(); omniSpeakingAudio = null }
    if (omniVAD) omniVAD.pause()
    omniSpeaking.value = true
    const audioBuffer = await ai.speak(text)
    const blob = new Blob([audioBuffer], { type: 'audio/wav' })
    const url = URL.createObjectURL(blob)
    omniSpeakingAudio = new Audio(url)
    omniSpeakingAudio.onended = () => {
      omniSpeaking.value = false
      if (omniVAD && omniListening.value) omniVAD.start()
    }
    omniSpeakingAudio.onerror = () => {
      omniSpeaking.value = false
      if (omniVAD && omniListening.value) omniVAD.start()
    }
    omniSpeakingAudio.play().catch(() => {
      omniSpeaking.value = false
      if (omniVAD && omniListening.value) omniVAD.start()
    })
  } catch {
    omniSpeaking.value = false
    if (omniVAD && omniListening.value) omniVAD.start()
  }
}

async function toggleOmniCamera() {
  if (omniCameraOn.value) {
    omniCameraOn.value = false
    if (omniStream) { omniStream.getTracks().forEach(t => t.stop()); omniStream = null }
    if (omniFrameTimer) { clearInterval(omniFrameTimer); omniFrameTimer = null }
    stopOmniWatch()
  } else {
    try {
      omniStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: 640, height: 480 } })
      omniVideoEl.value.srcObject = omniStream
      omniCameraOn.value = true
    } catch (e) {
      omniHistory.value.push({ role: 'system', content: `摄像头打开失败: ${e.message}` })
    }
  }
}

function captureOmniFrame() {
  if (!omniCameraOn.value || !omniVideoEl.value) return null
  const video = omniVideoEl.value
  const canvas = omniCanvasEl.value
  canvas.width = video.videoWidth || 640
  canvas.height = video.videoHeight || 480
  canvas.getContext('2d').drawImage(video, 0, 0)
  return canvas.toDataURL('image/jpeg', 0.7)
}

function getFramePixels() {
  if (!omniCameraOn.value || !omniVideoEl.value) return null
  const video = omniVideoEl.value
  const canvas = omniCanvasEl.value
  canvas.width = 160; canvas.height = 120
  const ctx = canvas.getContext('2d')
  ctx.drawImage(video, 0, 0, 160, 120)
  return ctx.getImageData(0, 0, 160, 120).data
}

function framesDiffer(a, b) {
  if (!a || !b || a.length !== b.length) return true
  let diff = 0
  for (let i = 0; i < a.length; i += 64) {
    diff += Math.abs(a[i] - b[i])
  }
  const avgDiff = diff / (a.length / 64)
  return avgDiff > 12
}

function toggleOmniWatch() {
  if (omniAutoWatch.value) stopOmniWatch()
  else startOmniWatch()
}

function startOmniWatch() {
  if (!omniCameraOn.value) {
    omniHistory.value.push({ role: 'system', content: '请先开启摄像头' })
    return
  }
  omniAutoWatch.value = true
  omniLastFrameData = getFramePixels()
  omniWatchTimer = setInterval(async () => {
    if (omniLoading.value || omniSpeaking.value) return
    const current = getFramePixels()
    if (framesDiffer(omniLastFrameData, current)) {
      omniLastFrameData = current
      const frame = captureOmniFrame()
      if (frame) {
        omniHistory.value.push({ role: 'user', content: '(画面变化)', source: '👁️ 自动', image: frame })
        await nextTick()
        scrollOmniChat()
        await sendOmniToAI('简短描述你看到的画面变化，用一两句话', frame)
      }
    }
  }, 3000)
}

function stopOmniWatch() {
  omniAutoWatch.value = false
  if (omniWatchTimer) { clearInterval(omniWatchTimer); omniWatchTimer = null }
  omniLastFrameData = null
}

async function toggleOmniMic() {
  if (omniListening.value) {
    omniListening.value = false
    if (omniVAD) { omniVAD.pause(); omniVAD.destroy(); omniVAD = null }
  } else {
    try {
      const { VAD_VER, ORT_VER } = await loadVAD()
      omniListening.value = true
      omniVAD = await window.vad.MicVAD.new({
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
              const frame = captureOmniFrame()
              omniHistory.value.push({ role: 'user', content: text, source: '🎤 语音', image: frame || undefined })
              await nextTick()
              scrollOmniChat()
              await sendOmniToAI(text, frame)
            }
          } catch {}
        }
      })
      omniVAD.start()
    } catch (e) {
      omniListening.value = false
      omniHistory.value.push({ role: 'system', content: `麦克风初始化失败: ${e.message}` })
    }
  }
}

async function sendOmniText() {
  if (!omniInput.value.trim() || omniLoading.value) return
  const text = omniInput.value.trim()
  omniInput.value = ''
  const frame = captureOmniFrame()
  omniHistory.value.push({ role: 'user', content: text, source: '⌨️ 文字', image: frame || undefined })
  await nextTick()
  scrollOmniChat()
  await sendOmniToAI(text, frame)
}

async function sendOmniToAI(text, imageDataUrl) {
  omniLoading.value = true
  let reply = ''
  try {
    const messages = []
    const recent = omniHistory.value.slice(-6)
    for (const msg of recent) {
      if (msg.role === 'system') continue
      const content = []
      if (msg.image) content.push({ type: 'image_url', image_url: { url: msg.image } })
      if (msg.content) content.push({ type: 'text', text: msg.content })
      messages.push({ role: msg.role, content: content.length === 1 && content[0].type === 'text' ? msg.content : content })
    }
    if (imageDataUrl && !recent.some(m => m.image === imageDataUrl)) {
      const lastMsg = messages[messages.length - 1]
      if (lastMsg && lastMsg.role === 'user') {
        if (typeof lastMsg.content === 'string') {
          lastMsg.content = [{ type: 'image_url', image_url: { url: imageDataUrl } }, { type: 'text', text: lastMsg.content }]
        }
      }
    }
    omniHistory.value.push({ role: 'assistant', content: '' })
    const idx = omniHistory.value.length - 1
    for await (const chunk of ai.think(messages, { stream: true, multimodal: true })) {
      if (chunk.type === 'text_delta') {
        reply += chunk.text || ''
        omniHistory.value[idx].content = reply
      }
    }
    props.markTested?.('omni-chat')
    if (reply) omniSpeak(reply)
  } catch (e) {
    reply = `错误: ${e.message}`
    omniHistory.value.push({ role: 'system', content: reply })
  }
  omniLoading.value = false
  await nextTick()
  scrollOmniChat()
}

function scrollOmniChat() {
  if (omniChatEl.value) omniChatEl.value.scrollTop = omniChatEl.value.scrollHeight
}

onUnmounted(() => {
  if (omniStream) { omniStream.getTracks().forEach(t => t.stop()) }
  if (omniVAD) { omniVAD.pause(); omniVAD.destroy() }
  if (omniWatchTimer) clearInterval(omniWatchTimer)
  if (omniSpeakingAudio) omniSpeakingAudio.pause()
})
</script>

<style scoped>
@import './_shared.css';
.omni-panel { display: flex; flex-direction: column; height: 100%; }
.omni-main { display: grid; grid-template-columns: 300px 1fr; gap: 16px; height: 100%; min-height: 400px; }
.omni-media { display: flex; flex-direction: column; gap: 12px; }
.omni-camera { position: relative; border-radius: 10px; overflow: hidden; background: #0f172a; aspect-ratio: 4/3; }
.omni-camera .camera-video { width: 100%; height: 100%; object-fit: cover; }
.omni-camera-controls { position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); display: flex; gap: 6px; }
.omni-camera-controls button { font-size: 12px; padding: 4px 12px; border-radius: 16px; border: none; background: rgba(0,0,0,0.6); color: #fff; cursor: pointer; }
.omni-camera-controls button.active { background: rgba(16,185,129,0.8); }
.omni-controls-row { display: flex; gap: 8px; }
.omni-controls-row button { flex: 1; padding: 8px; border-radius: 8px; border: 1px solid var(--border, #334155); background: var(--surface-2, #1e293b); color: var(--text, #e2e8f0); cursor: pointer; font-size: 13px; transition: all 0.2s; }
.omni-controls-row button.active { background: rgba(16,185,129,0.15); border-color: #10b981; color: #10b981; }
.omni-controls-row button.recording { background: rgba(239,68,68,0.15); border-color: #ef4444; color: #ef4444; animation: pulse-border 1.5s infinite; }
@keyframes pulse-border { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.3); } 50% { box-shadow: 0 0 0 6px rgba(239,68,68,0); } }
.omni-status { text-align: center; font-size: 13px; color: var(--text-secondary, #64748b); padding: 4px 0; }
.omni-status.listening-pulse { color: #10b981; animation: fade-pulse 2s infinite; }
@keyframes fade-pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
.omni-chat { display: flex; flex-direction: column; min-height: 0; }
.omni-chat .chat-messages { flex: 1; overflow-y: auto; }
.omni-input-row { display: flex; gap: 8px; margin-top: 8px; }
.omni-input-row input { flex: 1; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border, #334155); background: var(--surface-2, #1e293b); color: var(--text, #e2e8f0); font-size: 14px; }
.omni-source { font-size: 11px; color: var(--text-secondary, #64748b); margin-left: 4px; }
.mm-msg-img { max-width: 120px; border-radius: 8px; margin-bottom: 4px; }
</style>
