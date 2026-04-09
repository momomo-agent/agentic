<template>
  <div class="examples">
    <!-- Example Cards Grid -->
    <div class="cards" v-if="!activeExample">
      <div class="card example-card" v-for="ex in examples" :key="ex.id" @click="openExample(ex.id)">
        <div class="example-icon">{{ ex.icon }}</div>
        <div class="example-title">{{ ex.title }}</div>
        <div class="example-desc">{{ ex.desc }}</div>
        <div class="example-status" :class="ex.tested ? 'tested' : ''">
          {{ ex.tested ? '✓ 已测试' : '待测试' }}
        </div>
      </div>
    </div>

    <!-- Active Example Panel -->
    <div class="panel" v-if="activeExample">
      <div class="panel-header">
        <button class="btn-back" @click="closeExample">← 返回</button>
        <span class="panel-title">{{ currentExample.icon }} {{ currentExample.title }}</span>
      </div>

      <!-- Chat Playground -->
      <div v-if="activeExample === 'chat'" class="chat-panel">
        <div class="chat-messages" ref="chatEl">
          <div v-for="(msg, i) in chatHistory" :key="i" class="chat-msg" :class="msg.role">
            <div class="msg-bubble">{{ msg.content }}</div>
          </div>
          <div v-if="chatLoading" class="chat-msg assistant">
            <div class="msg-bubble loading">思考中...</div>
          </div>
        </div>
        <div class="chat-input-row">
          <input v-model="chatInput" @keydown.enter="sendChat" placeholder="输入消息..." :disabled="chatLoading" />
          <button @click="sendChat" :disabled="chatLoading || !chatInput.trim()">发送</button>
        </div>
      </div>

      <!-- Vision -->
      <div v-if="activeExample === 'vision'" class="vision-panel">
        <div class="vision-controls">
          <div class="vision-source-tabs">
            <button :class="{ active: visionSource === 'upload' }" @click="visionSource = 'upload'">📁 上传图片</button>
            <button :class="{ active: visionSource === 'camera' }" @click="startCamera">📷 拍照</button>
          </div>

          <!-- Upload -->
          <div v-if="visionSource === 'upload'" class="upload-area" @click="$refs.fileInput.click()" @dragover.prevent @drop.prevent="handleDrop">
            <input ref="fileInput" type="file" accept="image/*" @change="handleFile" hidden />
            <div v-if="!visionImage" class="upload-placeholder">
              <span class="upload-icon">🖼️</span>
              <span>点击或拖拽图片到这里</span>
            </div>
            <img v-else :src="visionImage" class="preview-img" />
          </div>

          <!-- Camera -->
          <div v-if="visionSource === 'camera'" class="camera-area">
            <video ref="videoEl" autoplay playsinline class="camera-video"></video>
            <button class="btn-capture" @click="capturePhoto">📸 拍照</button>
          </div>

          <div class="vision-prompt-row">
            <input v-model="visionPrompt" placeholder="问点什么...（默认：描述这张图片）" @keydown.enter="analyzeImage" />
            <button @click="analyzeImage" :disabled="!visionImage || visionLoading">
              {{ visionLoading ? '分析中...' : '🔍 分析' }}
            </button>
          </div>
        </div>

        <div class="vision-result" v-if="visionResult">
          <div class="result-label">分析结果</div>
          <div class="result-text">{{ visionResult }}</div>
        </div>
      </div>

      <!-- Voice -->
      <div v-if="activeExample === 'voice'" class="voice-panel">
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
          <p>使用浏览器 Web Speech API 实时语音识别</p>
          <p v-if="!speechSupported" class="voice-warning">⚠️ 当前浏览器不支持语音识别，请使用 Chrome</p>
        </div>
      </div>

      <!-- Structured Output -->
      <div v-if="activeExample === 'structured'" class="structured-panel">
        <div class="structured-controls">
          <textarea v-model="structuredInput" placeholder="输入文本，AI 会提取结构化信息..." rows="4"></textarea>
          <div class="structured-format">
            <label>输出格式：</label>
            <select v-model="structuredFormat">
              <option value="json">JSON</option>
              <option value="summary">摘要</option>
              <option value="entities">实体提取</option>
              <option value="sentiment">情感分析</option>
            </select>
          </div>
          <button @click="runStructured" :disabled="!structuredInput.trim() || structuredLoading">
            {{ structuredLoading ? '处理中...' : '🚀 处理' }}
          </button>
        </div>
        <div class="structured-result" v-if="structuredResult">
          <div class="result-label">结果</div>
          <pre class="result-code">{{ structuredResult }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onUnmounted, computed } from 'vue'

const examples = ref([
  { id: 'chat', icon: '💬', title: 'Chat Playground', desc: '与本地 AI 对话', tested: false },
  { id: 'vision', icon: '👁️', title: '图像识别', desc: '上传图片或拍照，AI 实时分析', tested: false },
  { id: 'voice', icon: '🎤', title: '实时语音识别', desc: '麦克风实时转文字', tested: false },
  { id: 'structured', icon: '📊', title: '结构化输出', desc: '文本提取、摘要、情感分析', tested: false },
])

const activeExample = ref(null)
const currentExample = computed(() => examples.value.find(e => e.id === activeExample.value) || {})

function openExample(id) { activeExample.value = id }
function closeExample() {
  stopCamera()
  stopVoice()
  activeExample.value = null
}

// ── Chat ──
const chatHistory = ref([])
const chatInput = ref('')
const chatLoading = ref(false)
const chatEl = ref(null)

async function sendChat() {
  const msg = chatInput.value.trim()
  if (!msg || chatLoading.value) return
  chatHistory.value.push({ role: 'user', content: msg })
  chatInput.value = ''
  chatLoading.value = true
  await nextTick()
  scrollChat()

  const assistantMsg = { role: 'assistant', content: '' }
  chatHistory.value.push(assistantMsg)

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, history: chatHistory.value.slice(0, -1) })
    })
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of decoder.decode(value).split('\n')) {
        if (!line.startsWith('data: ') || line.includes('[DONE]')) continue
        try {
          const data = JSON.parse(line.slice(6))
          assistantMsg.content += data.content || data.text || ''
          await nextTick()
          scrollChat()
        } catch {}
      }
    }
    markTested('chat')
  } catch (e) {
    assistantMsg.content = `错误: ${e.message}`
  }
  chatLoading.value = false
}

function scrollChat() {
  if (chatEl.value) chatEl.value.scrollTop = chatEl.value.scrollHeight
}

// ── Vision ──
const visionSource = ref('upload')
const visionImage = ref(null)
const visionPrompt = ref('')
const visionResult = ref('')
const visionLoading = ref(false)
const videoEl = ref(null)
let mediaStream = null

function handleFile(e) {
  const file = e.target.files[0]
  if (file) readImage(file)
}

function handleDrop(e) {
  const file = e.dataTransfer.files[0]
  if (file && file.type.startsWith('image/')) readImage(file)
}

function readImage(file) {
  const reader = new FileReader()
  reader.onload = () => { visionImage.value = reader.result; visionResult.value = '' }
  reader.readAsDataURL(file)
}

async function startCamera() {
  visionSource.value = 'camera'
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    await nextTick()
    if (videoEl.value) videoEl.value.srcObject = mediaStream
  } catch (e) {
    console.error('Camera error:', e)
  }
}

function stopCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop())
    mediaStream = null
  }
}

function capturePhoto() {
  if (!videoEl.value) return
  const canvas = document.createElement('canvas')
  canvas.width = videoEl.value.videoWidth
  canvas.height = videoEl.value.videoHeight
  canvas.getContext('2d').drawImage(videoEl.value, 0, 0)
  visionImage.value = canvas.toDataURL('image/jpeg', 0.85)
  visionResult.value = ''
  stopCamera()
  visionSource.value = 'upload'
}

async function analyzeImage() {
  if (!visionImage.value || visionLoading.value) return
  visionLoading.value = true
  visionResult.value = ''

  try {
    const res = await fetch('/api/vision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: visionImage.value, prompt: visionPrompt.value || undefined })
    })
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of decoder.decode(value).split('\n')) {
        if (!line.startsWith('data: ') || line.includes('[DONE]')) continue
        try {
          const data = JSON.parse(line.slice(6))
          if (data.error) { visionResult.value = `错误: ${data.error}`; break }
          visionResult.value += data.text || ''
        } catch {}
      }
    }
    markTested('vision')
  } catch (e) {
    visionResult.value = `错误: ${e.message}`
  }
  visionLoading.value = false
}

// ── Voice ──
const voiceRecording = ref(false)
const voiceText = ref('')
let recognition = null
const speechSupported = ref(typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window))

function toggleVoice() {
  if (voiceRecording.value) stopVoice()
  else startVoice()
}

function startVoice() {
  if (!speechSupported.value) return
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  recognition = new SR()
  recognition.continuous = true
  recognition.interimResults = true
  recognition.lang = 'zh-CN'

  let finalText = ''
  recognition.onresult = (e) => {
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) {
        finalText += e.results[i][0].transcript
        markTested('voice')
      } else {
        interim += e.results[i][0].transcript
      }
    }
    voiceText.value = finalText + (interim ? `\n[识别中] ${interim}` : '')
  }
  recognition.onerror = (e) => {
    if (e.error !== 'no-speech') voiceText.value += `\n⚠️ 错误: ${e.error}`
  }
  recognition.onend = () => {
    if (voiceRecording.value) recognition.start() // auto-restart
  }
  recognition.start()
  voiceRecording.value = true
}

function stopVoice() {
  voiceRecording.value = false
  if (recognition) { recognition.stop(); recognition = null }
}

// ── Structured Output ──
const structuredInput = ref('')
const structuredFormat = ref('json')
const structuredResult = ref('')
const structuredLoading = ref(false)

const formatPrompts = {
  json: 'Extract all key information from the following text and return as a JSON object. Text: ',
  summary: 'Summarize the following text in 2-3 sentences. Text: ',
  entities: 'Extract all named entities (people, places, organizations, dates) from the following text. Return as a list. Text: ',
  sentiment: 'Analyze the sentiment of the following text. Return the overall sentiment (positive/negative/neutral) with confidence score and key phrases. Text: '
}

async function runStructured() {
  if (!structuredInput.value.trim() || structuredLoading.value) return
  structuredLoading.value = true
  structuredResult.value = ''

  const prompt = formatPrompts[structuredFormat.value] + structuredInput.value
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: prompt })
    })
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of decoder.decode(value).split('\n')) {
        if (!line.startsWith('data: ') || line.includes('[DONE]')) continue
        try {
          const data = JSON.parse(line.slice(6))
          structuredResult.value += data.content || data.text || ''
        } catch {}
      }
    }
    markTested('structured')
  } catch (e) {
    structuredResult.value = `错误: ${e.message}`
  }
  structuredLoading.value = false
}

function markTested(id) {
  const ex = examples.value.find(e => e.id === id)
  if (ex) ex.tested = true
}

onUnmounted(() => { stopCamera(); stopVoice() })
</script>

<style scoped>
.examples { padding: 0; }

/* Cards Grid */
.cards {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}
.example-card {
  cursor: pointer; transition: transform 0.15s, box-shadow 0.15s;
  text-align: center; padding: 28px 20px;
}
.example-card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.2); }
.example-icon { font-size: 36px; margin-bottom: 12px; }
.example-title { font-weight: 600; font-size: 15px; margin-bottom: 6px; }
.example-desc { font-size: 13px; color: var(--text-dim); margin-bottom: 12px; }
.example-status {
  font-size: 12px; padding: 3px 10px; border-radius: 10px; display: inline-block;
  background: var(--surface-3, #374151); color: var(--text-dim);
}
.example-status.tested { background: rgba(34,197,94,0.15); color: #22c55e; }

/* Panel */
.panel-header {
  display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
}
.btn-back {
  background: var(--surface-3, #374151); border: none; color: var(--text);
  padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 13px;
}
.panel-title { font-weight: 600; font-size: 16px; }

/* Chat */
.chat-panel { display: flex; flex-direction: column; height: 500px; }
.chat-messages {
  flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px;
  background: var(--surface-2, #1e293b); border-radius: 10px;
}
.chat-msg { display: flex; }
.chat-msg.user { justify-content: flex-end; }
.msg-bubble {
  max-width: 75%; padding: 10px 14px; border-radius: 14px; font-size: 14px;
  line-height: 1.5; white-space: pre-wrap; word-break: break-word;
}
.chat-msg.user .msg-bubble { background: var(--accent, #3b82f6); color: white; }
.chat-msg.assistant .msg-bubble { background: var(--surface-3, #374151); }
.msg-bubble.loading { opacity: 0.6; font-style: italic; }
.chat-input-row {
  display: flex; gap: 8px; margin-top: 12px;
}
.chat-input-row input {
  flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border, #334155);
  background: var(--surface-2, #1e293b); color: var(--text); font-size: 14px;
}
.chat-input-row button {
  padding: 10px 20px; border-radius: 8px; border: none;
  background: var(--accent, #3b82f6); color: white; cursor: pointer; font-size: 14px;
}
.chat-input-row button:disabled { opacity: 0.5; cursor: not-allowed; }

/* Vision */
.vision-panel { display: flex; flex-direction: column; gap: 16px; }
.vision-source-tabs { display: flex; gap: 8px; margin-bottom: 8px; }
.vision-source-tabs button {
  padding: 8px 16px; border-radius: 8px; border: 1px solid var(--border, #334155);
  background: var(--surface-2, #1e293b); color: var(--text); cursor: pointer; font-size: 13px;
}
.vision-source-tabs button.active { background: var(--accent, #3b82f6); color: white; border-color: var(--accent); }

.upload-area {
  border: 2px dashed var(--border, #334155); border-radius: 12px; padding: 40px;
  text-align: center; cursor: pointer; transition: border-color 0.2s;
  min-height: 200px; display: flex; align-items: center; justify-content: center;
}
.upload-area:hover { border-color: var(--accent, #3b82f6); }
.upload-placeholder { display: flex; flex-direction: column; align-items: center; gap: 12px; color: var(--text-dim); }
.upload-icon { font-size: 48px; }
.preview-img { max-width: 100%; max-height: 400px; border-radius: 8px; object-fit: contain; }

.camera-area { position: relative; border-radius: 12px; overflow: hidden; background: #000; }
.camera-video { width: 100%; max-height: 400px; display: block; }
.btn-capture {
  position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%);
  padding: 10px 24px; border-radius: 24px; border: none;
  background: rgba(255,255,255,0.9); color: #000; font-size: 14px; cursor: pointer;
}

.vision-prompt-row { display: flex; gap: 8px; }
.vision-prompt-row input {
  flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border, #334155);
  background: var(--surface-2, #1e293b); color: var(--text); font-size: 14px;
}
.vision-prompt-row button {
  padding: 10px 20px; border-radius: 8px; border: none;
  background: var(--accent, #3b82f6); color: white; cursor: pointer; font-size: 14px; white-space: nowrap;
}
.vision-prompt-row button:disabled { opacity: 0.5; cursor: not-allowed; }

/* Voice */
.voice-panel { display: flex; flex-direction: column; align-items: center; gap: 24px; padding: 40px 0; }
.voice-status { text-align: center; }
.voice-indicator { position: relative; display: inline-block; margin-bottom: 12px; }
.voice-icon { font-size: 48px; position: relative; z-index: 1; }
.pulse-ring {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 80px; height: 80px; border-radius: 50%; border: 2px solid #ef4444;
  animation: pulse 1.5s ease-out infinite;
}
@keyframes pulse {
  0% { transform: translate(-50%, -50%) scale(0.8); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1.4); opacity: 0; }
}
.voice-state { font-size: 15px; color: var(--text-dim); }
.btn-voice {
  padding: 14px 32px; border-radius: 12px; border: none; font-size: 16px;
  background: var(--accent, #3b82f6); color: white; cursor: pointer;
}
.btn-voice.active { background: #ef4444; }

/* Structured */
.structured-panel { display: flex; flex-direction: column; gap: 16px; }
.structured-controls { display: flex; flex-direction: column; gap: 12px; }
.structured-controls textarea {
  width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border, #334155);
  background: var(--surface-2, #1e293b); color: var(--text); font-size: 14px;
  resize: vertical; font-family: inherit;
}
.structured-format { display: flex; align-items: center; gap: 8px; }
.structured-format label { font-size: 13px; color: var(--text-dim); }
.structured-format select {
  padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border, #334155);
  background: var(--surface-2, #1e293b); color: var(--text); font-size: 13px;
}
.structured-controls button {
  align-self: flex-start; padding: 10px 24px; border-radius: 8px; border: none;
  background: var(--accent, #3b82f6); color: white; cursor: pointer; font-size: 14px;
}
.structured-controls button:disabled { opacity: 0.5; cursor: not-allowed; }

/* Shared result styles */
.vision-result, .voice-result, .structured-result {
  background: var(--surface-2, #1e293b); border-radius: 10px; padding: 16px;
}
.result-label { font-size: 12px; color: var(--text-dim); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
.result-text { font-size: 14px; line-height: 1.6; white-space: pre-wrap; }
.result-code { font-size: 13px; line-height: 1.5; white-space: pre-wrap; font-family: 'SF Mono', monospace; margin: 0; }

.voice-info { text-align: center; }
.voice-info p { font-size: 13px; color: var(--text-dim); margin: 4px 0; }
.voice-warning { color: #f59e0b; }
</style>
