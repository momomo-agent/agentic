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

      <!-- TTS 语音合成 -->
      <div v-if="activeExample === 'tts'" class="tts-panel">
        <div class="tts-controls">
          <textarea v-model="ttsInput" placeholder="输入要合成的文字..." rows="3"></textarea>
          <button @click="runTts" :disabled="!ttsInput.trim() || ttsLoading">
            {{ ttsLoading ? '合成中...' : '🔊 合成语音' }}
          </button>
        </div>
        <div class="tts-result" v-if="ttsAudioUrl || ttsLatency">
          <div class="result-label">合成结果</div>
          <audio v-if="ttsAudioUrl" :src="ttsAudioUrl" controls class="tts-audio"></audio>
          <div v-if="ttsLatency" class="tts-latency">延迟: {{ ttsLatency }}ms</div>
        </div>
      </div>

      <!-- Parlor 语音对话 -->
      <div v-if="activeExample === 'parlor'" class="parlor-panel">
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

      <!-- 实时摄像头识别 -->
      <div v-if="activeExample === 'live-vision'" class="live-vision-panel">
        <div class="lv-main">
          <div class="lv-video-area">
            <video ref="lvVideoEl" autoplay playsinline class="camera-video"></video>
            <canvas ref="lvCanvasEl" style="display:none"></canvas>
            <button class="btn-voice" :class="{ active: lvRunning }" @click="toggleLiveVision">
              {{ lvRunning ? '⏹ 停止' : '▶ 开始' }}
            </button>
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

      <!-- 翻译助手 -->
      <div v-if="activeExample === 'translate'" class="translate-panel">
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

      <!-- 文档问答 -->
      <div v-if="activeExample === 'doc-qa'" class="docqa-panel">
        <div class="docqa-controls">
          <textarea v-model="docqaDoc" placeholder="粘贴文档内容..." rows="6"></textarea>
          <div class="docqa-question-row">
            <input v-model="docqaQuestion" @keydown.enter="runDocQa" placeholder="输入问题..." :disabled="docqaLoading" />
            <button @click="runDocQa" :disabled="!docqaDoc.trim() || !docqaQuestion.trim() || docqaLoading">
              {{ docqaLoading ? '回答中...' : '🔍 提问' }}
            </button>
          </div>
        </div>
        <div class="docqa-result" v-if="docqaResult">
          <div class="result-label">回答</div>
          <div class="result-text">{{ docqaResult }}</div>
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
  { id: 'tts', icon: '🔊', title: '语音合成', desc: '文字转语音，试听不同声音', tested: false },
  { id: 'parlor', icon: '🗣️', title: '语音对话', desc: '像 Parlor 一样，说话→AI 语音回复', tested: false },
  { id: 'live-vision', icon: '📹', title: '实时摄像头', desc: '摄像头持续拍帧，AI 实时描述', tested: false },
  { id: 'translate', icon: '🌐', title: '翻译助手', desc: '说话或输入文字，AI 翻译并朗读', tested: false },
  { id: 'doc-qa', icon: '📄', title: '文档问答', desc: '粘贴文档，AI 回答问题', tested: false },
])

const activeExample = ref(null)
const currentExample = computed(() => examples.value.find(e => e.id === activeExample.value) || {})

function openExample(id) { activeExample.value = id }
function closeExample() {
  stopCamera()
  stopVoice()
  closeParlorWs()
  stopLiveVision()
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

// ── TTS ──
const ttsInput = ref('')
const ttsLoading = ref(false)
const ttsAudioUrl = ref(null)
const ttsLatency = ref(null)

async function runTts() {
  if (!ttsInput.value.trim() || ttsLoading.value) return
  ttsLoading.value = true
  ttsAudioUrl.value = null
  ttsLatency.value = null
  const t0 = Date.now()
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: ttsInput.value })
    })
    const blob = await res.blob()
    ttsLatency.value = Date.now() - t0
    if (ttsAudioUrl.value) URL.revokeObjectURL(ttsAudioUrl.value)
    ttsAudioUrl.value = URL.createObjectURL(blob)
    markTested('tts')
  } catch (e) {
    ttsLatency.value = Date.now() - t0
  }
  ttsLoading.value = false
}

// ── Parlor 语音对话 ──
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
        const last = parlorHistory.value[parlorHistory.value.length - 1]
        if (last && last._streaming) delete last._streaming
        markTested('parlor')
      }
    } catch {}
  }
}

function base64ToBlob(b64, mime) {
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
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
      const blob = new Blob(chunks, { type: 'audio/webm' })
      const reader = new FileReader()
      reader.onloadend = () => {
        const b64 = reader.result.split(',')[1]
        parlorTranscribing.value = true
        if (parlorWs && parlorWs.readyState === WebSocket.OPEN) {
          parlorWs.send(JSON.stringify({
            type: 'voice_stream',
            audio: b64,
            history: parlorHistory.value.map(m => ({ role: m.role, content: m.content }))
          }))
        }
      }
      reader.readAsDataURL(blob)
      parlorStream?.getTracks().forEach(t => t.stop())
      parlorStream = null
    }
    parlorRecorder.start()
    parlorRecording.value = true
    parlorStatus.value = '录音中...'
  } catch (e) {
    parlorStatus.value = '麦克风错误'
  }
}

function parlorStopRec() {
  parlorRecording.value = false
  parlorStatus.value = ''
  if (parlorRecorder && parlorRecorder.state === 'recording') parlorRecorder.stop()
}

function closeParlorWs() {
  if (parlorWs) { parlorWs.close(); parlorWs = null }
  if (parlorStream) { parlorStream.getTracks().forEach(t => t.stop()); parlorStream = null }
  parlorRecording.value = false
  parlorAudioQueue = []
  parlorPlaying = false
}

// ── Live Vision ──
const lvVideoEl = ref(null)
const lvCanvasEl = ref(null)
const lvLogEl = ref(null)
const lvRunning = ref(false)
const lvEntries = ref([])
let lvStream = null
let lvInterval = null

async function toggleLiveVision() {
  if (lvRunning.value) {
    stopLiveVision()
  } else {
    try {
      lvStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      await nextTick()
      if (lvVideoEl.value) lvVideoEl.value.srcObject = lvStream
      lvRunning.value = true
      lvInterval = setInterval(captureAndDescribe, 3000)
    } catch (e) {
      console.error('Camera error:', e)
    }
  }
}

function stopLiveVision() {
  lvRunning.value = false
  if (lvInterval) { clearInterval(lvInterval); lvInterval = null }
  if (lvStream) { lvStream.getTracks().forEach(t => t.stop()); lvStream = null }
}

async function captureAndDescribe() {
  if (!lvVideoEl.value || !lvCanvasEl.value) return
  const v = lvVideoEl.value
  const c = lvCanvasEl.value
  c.width = v.videoWidth
  c.height = v.videoHeight
  c.getContext('2d').drawImage(v, 0, 0)
  const dataUrl = c.toDataURL('image/jpeg', 0.7)

  const now = new Date()
  const time = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`
  const entry = { time, text: '分析中...' }
  lvEntries.value.push(entry)
  await nextTick()
  if (lvLogEl.value) lvLogEl.value.scrollTop = lvLogEl.value.scrollHeight

  try {
    const res = await fetch('/api/vision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataUrl, prompt: '简洁描述你看到的画面变化' })
    })
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    entry.text = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of decoder.decode(value).split('\n')) {
        if (!line.startsWith('data: ') || line.includes('[DONE]')) continue
        try {
          const data = JSON.parse(line.slice(6))
          if (data.error) { entry.text = `错误: ${data.error}`; break }
          entry.text += data.text || ''
        } catch {}
      }
    }
    markTested('live-vision')
  } catch (e) {
    entry.text = `错误: ${e.message}`
  }
  await nextTick()
  if (lvLogEl.value) lvLogEl.value.scrollTop = lvLogEl.value.scrollHeight
}

// ── Translate ──
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
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `翻译成${translateLang.value}：${text}` })
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
          translateResult.value += data.content || data.text || ''
        } catch {}
      }
    }
    markTested('translate')
    // auto TTS the result
    if (translateResult.value) {
      try {
        const ttsRes = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: translateResult.value })
        })
        const blob = await ttsRes.blob()
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

    // Record for 5 seconds then auto-stop
    await new Promise(resolve => {
      recorder.onstop = resolve
      recorder.start()
      setTimeout(() => { if (recorder.state === 'recording') recorder.stop() }, 5000)
    })
    stream.getTracks().forEach(t => t.stop())

    const blob = new Blob(chunks, { type: 'audio/webm' })
    const fd = new FormData()
    fd.append('audio', blob, 'recording.webm')
    const res = await fetch('/api/transcribe', { method: 'POST', body: fd })
    const data = await res.json()
    translateInput.value = data.text || data.transcription || ''
  } catch (e) {
    console.error('Mic error:', e)
  }
  translateMicLoading.value = false
}

// ── Doc QA ──
const docqaDoc = ref('')
const docqaQuestion = ref('')
const docqaResult = ref('')
const docqaLoading = ref(false)

async function runDocQa() {
  if (!docqaDoc.value.trim() || !docqaQuestion.value.trim() || docqaLoading.value) return
  docqaLoading.value = true
  docqaResult.value = ''

  const prompt = `基于以下文档回答问题：\n\n文档：${docqaDoc.value}\n\n问题：${docqaQuestion.value}`
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
          docqaResult.value += data.content || data.text || ''
        } catch {}
      }
    }
    markTested('doc-qa')
  } catch (e) {
    docqaResult.value = `错误: ${e.message}`
  }
  docqaLoading.value = false
}

onUnmounted(() => { stopCamera(); stopVoice(); closeParlorWs(); stopLiveVision() })
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

/* TTS */
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

/* Parlor */
.parlor-panel { display: flex; flex-direction: column; height: 500px; }
.parlor-messages {
  flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px;
  background: var(--surface-2, #1e293b); border-radius: 10px;
}
.parlor-controls {
  display: flex; align-items: center; gap: 12px; margin-top: 12px; justify-content: center;
}
.parlor-status { font-size: 13px; color: var(--text-dim); }
.btn-play-inline {
  background: none; border: none; cursor: pointer; font-size: 14px; padding: 2px 6px;
  margin-left: 6px; border-radius: 4px; opacity: 0.7;
}
.btn-play-inline:hover { opacity: 1; background: rgba(255,255,255,0.1); }

/* Live Vision */
.live-vision-panel { display: flex; flex-direction: column; gap: 16px; }
.lv-main { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.lv-video-area { display: flex; flex-direction: column; gap: 12px; align-items: center; }
.lv-video-area .camera-video { width: 100%; border-radius: 10px; background: #000; min-height: 240px; }
.lv-log {
  background: var(--surface-2, #1e293b); border-radius: 10px; padding: 16px;
  overflow-y: auto; max-height: 400px;
}
.lv-entry { margin-bottom: 10px; font-size: 14px; line-height: 1.5; }
.lv-time { color: var(--accent, #3b82f6); font-size: 12px; margin-right: 8px; font-family: 'SF Mono', monospace; }
.lv-text { color: var(--text); }
.lv-empty { color: var(--text-dim); font-size: 14px; }

/* Translate */
.translate-panel { display: flex; flex-direction: column; gap: 16px; }
.translate-controls { display: flex; flex-direction: column; gap: 12px; }
.translate-lang-row { display: flex; align-items: center; gap: 8px; }
.translate-lang-row label { font-size: 13px; color: var(--text-dim); }
.translate-lang-row select {
  padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border, #334155);
  background: var(--surface-2, #1e293b); color: var(--text); font-size: 13px;
}
.translate-input-row { display: flex; gap: 8px; }
.translate-input-row input {
  flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border, #334155);
  background: var(--surface-2, #1e293b); color: var(--text); font-size: 14px;
}
.translate-input-row button {
  padding: 10px 20px; border-radius: 8px; border: none;
  background: var(--accent, #3b82f6); color: white; cursor: pointer; font-size: 14px; white-space: nowrap;
}
.translate-input-row button:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-mic-small { padding: 10px 14px !important; }
.translate-result {
  background: var(--surface-2, #1e293b); border-radius: 10px; padding: 16px;
  display: flex; flex-direction: column; gap: 12px;
}
.translate-row { }

/* Doc QA */
.docqa-panel { display: flex; flex-direction: column; gap: 16px; }
.docqa-controls { display: flex; flex-direction: column; gap: 12px; }
.docqa-controls textarea {
  width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border, #334155);
  background: var(--surface-2, #1e293b); color: var(--text); font-size: 14px;
  resize: vertical; font-family: inherit;
}
.docqa-question-row { display: flex; gap: 8px; }
.docqa-question-row input {
  flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border, #334155);
  background: var(--surface-2, #1e293b); color: var(--text); font-size: 14px;
}
.docqa-question-row button {
  padding: 10px 20px; border-radius: 8px; border: none;
  background: var(--accent, #3b82f6); color: white; cursor: pointer; font-size: 14px; white-space: nowrap;
}
.docqa-question-row button:disabled { opacity: 0.5; cursor: not-allowed; }
.docqa-result {
  background: var(--surface-2, #1e293b); border-radius: 10px; padding: 16px;
}
</style>
