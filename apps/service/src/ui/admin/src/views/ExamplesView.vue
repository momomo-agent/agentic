<template>
  <div class="examples-view">
    <h1 class="page-title">🎮 Examples</h1>
    <p class="page-desc">交互式功能演示 — 点击卡片打开</p>

    <div class="grid grid-3">
      <div v-for="ex in examples" :key="ex.id" class="example-card" @click="activeExample = ex.id">
        <div class="example-icon">{{ ex.icon }}</div>
        <div class="example-name">{{ ex.name }}</div>
        <div class="example-desc">{{ ex.desc }}</div>
        <div class="example-status" :class="ex.status">
          {{ ex.status === 'pass' ? '✓' : ex.status === 'fail' ? '✗ 有错误' : '待测试' }}
        </div>
      </div>
    </div>

    <!-- Chat Playground -->
    <div v-if="activeExample === 'chat'" class="example-panel">
      <div class="panel-header">
        <h2>💬 Chat Playground</h2>
        <button class="btn-close" @click="activeExample = null">✕</button>
      </div>
      <div class="chat-box" ref="chatBox">
        <div v-for="(msg, i) in chatHistory" :key="i" class="chat-msg" :class="msg.role">
          <div class="msg-text">{{ msg.content }}</div>
        </div>
      </div>
      <form @submit.prevent="sendChat" class="chat-input">
        <input v-model="chatInput" placeholder="输入消息..." :disabled="chatLoading" />
        <button type="submit" :disabled="chatLoading">发送</button>
      </form>
    </div>

    <!-- TTS Lab -->
    <div v-if="activeExample === 'tts'" class="example-panel">
      <div class="panel-header">
        <h2>🔊 TTS Lab</h2>
        <button class="btn-close" @click="activeExample = null">✕</button>
      </div>
      <div class="test-panel">
        <input v-model="ttsText" placeholder="输入要合成的文字..." />
        <button @click="synthesize" :disabled="!ttsText || ttsLoading">
          {{ ttsLoading ? '合成中...' : '合成' }}
        </button>
      </div>
      <audio v-if="ttsAudio" :src="ttsAudio" controls style="margin-top: 16px; width: 100%"></audio>
      <div v-if="ttsError" class="error-box">{{ ttsError }}</div>
    </div>

    <!-- Transcription Studio -->
    <div v-if="activeExample === 'stt'" class="example-panel">
      <div class="panel-header">
        <h2>🎤 Transcription Studio</h2>
        <button class="btn-close" @click="activeExample = null">✕</button>
      </div>
      <div class="test-panel">
        <input type="file" accept="audio/*" @change="handleAudioFile" />
        <button @click="transcribe" :disabled="!audioFile || sttLoading">
          {{ sttLoading ? '转写中...' : '转写' }}
        </button>
      </div>
      <div v-if="sttResult" class="result-box">{{ sttResult }}</div>
    </div>

    <!-- Live Talk -->
    <div v-if="activeExample === 'live'" class="example-panel">
      <div class="panel-header">
        <h2>📡 Live Talk</h2>
        <button class="btn-close" @click="activeExample = null">✕</button>
      </div>
      <div class="test-panel">
        <input type="file" accept="audio/*" @change="handleVoiceFile" />
        <button @click="voiceTest" :disabled="!voiceFile || voiceLoading">
          {{ voiceLoading ? '处理中...' : 'STT → LLM → TTS' }}
        </button>
      </div>
      <div v-if="voiceResult" class="result-box">
        <div><strong>识别:</strong> {{ voiceResult.transcript }}</div>
        <div><strong>回复:</strong> {{ voiceResult.response }}</div>
        <audio v-if="voiceResult.audio" :src="voiceResult.audio" controls style="margin-top: 12px; width: 100%"></audio>
      </div>
      <div v-if="voiceError" class="error-box">{{ voiceError }}</div>
    </div>

    <!-- Voice One-Shot -->
    <div v-if="activeExample === 'voice'" class="example-panel">
      <div class="panel-header">
        <h2>🎙️ Voice One-Shot</h2>
        <button class="btn-close" @click="activeExample = null">✕</button>
      </div>
      <p>录音 → STT → LLM 回复（不经过 TTS）</p>
      <div class="test-panel">
        <input type="file" accept="audio/*" @change="handleVoiceOneShotFile" />
        <button @click="voiceOneShot" :disabled="!voiceOneShotFile || voiceOneShotLoading">
          {{ voiceOneShotLoading ? '处理中...' : '发送' }}
        </button>
      </div>
      <div v-if="voiceOneShotResult" class="result-box">
        <div><strong>识别:</strong> {{ voiceOneShotResult.transcript }}</div>
        <div><strong>回复:</strong> {{ voiceOneShotResult.response }}</div>
      </div>
    </div>

    <!-- Agent Sandbox -->
    <div v-if="activeExample === 'sandbox'" class="example-panel">
      <div class="panel-header">
        <h2>🤖 Agent Sandbox</h2>
        <button class="btn-close" @click="activeExample = null">✕</button>
      </div>
      <p>OpenAI 兼容接口测试 — 直接调用 /v1/chat/completions</p>
      <div class="test-panel">
        <input v-model="sandboxInput" placeholder="输入消息..." />
        <button @click="sandboxTest" :disabled="!sandboxInput || sandboxLoading">
          {{ sandboxLoading ? '调用中...' : '调用' }}
        </button>
      </div>
      <div v-if="sandboxResult" class="result-box">{{ sandboxResult }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const activeExample = ref(null)

const examples = ref([
  { id: 'chat', name: 'Chat Playground', icon: '💬', desc: 'SSE 流式对话测试', status: 'idle' },
  { id: 'tts', name: 'TTS Lab', icon: '🔊', desc: '文字转语音测试', status: 'idle' },
  { id: 'stt', name: 'Transcription Studio', icon: '🎤', desc: '语音转文字测试', status: 'idle' },
  { id: 'live', name: 'Live Talk', icon: '📡', desc: 'STT → LLM → TTS 全链路', status: 'idle' },
  { id: 'voice', name: 'Voice One-Shot', icon: '🎙️', desc: '语音输入 → 文字回复', status: 'idle' },
  { id: 'sandbox', name: 'Agent Sandbox', icon: '🤖', desc: 'OpenAI 兼容接口测试', status: 'idle' },
])

// Chat
const chatHistory = ref([])
const chatInput = ref('')
const chatLoading = ref(false)
const chatBox = ref(null)

async function sendChat() {
  if (!chatInput.value.trim()) return
  const userMsg = chatInput.value
  chatHistory.value.push({ role: 'user', content: userMsg })
  chatInput.value = ''
  await nextTick()
  if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight
  const assistantMsg = { role: 'assistant', content: '' }
  chatHistory.value.push(assistantMsg)
  chatLoading.value = true
  try {
    const res = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMsg })
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n')
      buffer = parts.pop() || ''
      for (const line of parts) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue
        if (trimmed === 'data: [DONE]') continue
        try {
          const data = JSON.parse(trimmed.slice(5).trim())
          if (data.type === 'content') {
            assistantMsg.content += data.content || data.text || ''
            await nextTick()
            if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight
          }
        } catch (parseErr) {
          console.warn('[Chat SSE] parse error:', trimmed, parseErr)
        }
      }
    }
    if (!assistantMsg.content) assistantMsg.content = '无回复'
    const ex = examples.value.find(e => e.id === 'chat')
    if (ex) ex.status = 'pass'
  } catch (e) {
    assistantMsg.content = '错误: ' + e.message
    const ex = examples.value.find(e => e.id === 'chat')
    if (ex) ex.status = 'fail'
  } finally { chatLoading.value = false }
}

// TTS
const ttsText = ref('')
const ttsAudio = ref(null)
const ttsLoading = ref(false)
const ttsError = ref('')

async function synthesize() {
  if (!ttsText.value.trim()) return
  ttsLoading.value = true; ttsError.value = ''
  try {
    const res = await fetch('/api/synthesize', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: ttsText.value })
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || `HTTP ${res.status}`)
    }
    const blob = await res.blob()
    ttsAudio.value = URL.createObjectURL(blob)
    const ex = examples.value.find(e => e.id === 'tts')
    if (ex) ex.status = 'pass'
  } catch (e) {
    ttsError.value = '合成失败: ' + e.message
    const ex = examples.value.find(e => e.id === 'tts')
    if (ex) ex.status = 'fail'
  } finally { ttsLoading.value = false }
}

// STT
const audioFile = ref(null)
const sttResult = ref('')
const sttLoading = ref(false)
function handleAudioFile(e) { audioFile.value = e.target.files[0] }

async function transcribe() {
  if (!audioFile.value) return
  sttLoading.value = true
  try {
    const form = new FormData()
    form.append('audio', audioFile.value)
    const res = await fetch('/api/transcribe', { method: 'POST', body: form })
    const data = await res.json()
    sttResult.value = data.text || '无结果'
    const ex = examples.value.find(e => e.id === 'stt')
    if (ex) ex.status = 'pass'
  } catch (e) {
    sttResult.value = '错误: ' + e.message
    const ex = examples.value.find(e => e.id === 'stt')
    if (ex) ex.status = 'fail'
  } finally { sttLoading.value = false }
}

// Voice (full pipeline)
const voiceFile = ref(null)
const voiceResult = ref(null)
const voiceLoading = ref(false)
const voiceError = ref('')
function handleVoiceFile(e) { voiceFile.value = e.target.files[0] }

async function voiceTest() {
  if (!voiceFile.value) return
  voiceLoading.value = true; voiceError.value = ''
  try {
    const form = new FormData()
    form.append('audio', voiceFile.value)
    const res = await fetch('/api/voice', { method: 'POST', body: form })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || `HTTP ${res.status}`)
    }
    const data = await res.json()
    voiceResult.value = { transcript: data.transcript || '', response: data.response || '', audio: data.audioUrl || null }
    const ex = examples.value.find(e => e.id === 'live')
    if (ex) ex.status = 'pass'
  } catch (e) {
    voiceError.value = '测试失败: ' + e.message
    const ex = examples.value.find(e => e.id === 'live')
    if (ex) ex.status = 'fail'
  } finally { voiceLoading.value = false }
}

// Voice One-Shot
const voiceOneShotFile = ref(null)
const voiceOneShotResult = ref(null)
const voiceOneShotLoading = ref(false)
function handleVoiceOneShotFile(e) { voiceOneShotFile.value = e.target.files[0] }

async function voiceOneShot() {
  if (!voiceOneShotFile.value) return
  voiceOneShotLoading.value = true
  try {
    const form = new FormData()
    form.append('audio', voiceOneShotFile.value)
    const res = await fetch('/api/voice', { method: 'POST', body: form })
    const data = await res.json()
    voiceOneShotResult.value = { transcript: data.transcript || '', response: data.response || '' }
    const ex = examples.value.find(e => e.id === 'voice')
    if (ex) ex.status = 'pass'
  } catch (e) {
    voiceOneShotResult.value = { transcript: '', response: '错误: ' + e.message }
    const ex = examples.value.find(e => e.id === 'voice')
    if (ex) ex.status = 'fail'
  } finally { voiceOneShotLoading.value = false }
}

// Agent Sandbox
const sandboxInput = ref('')
const sandboxResult = ref('')
const sandboxLoading = ref(false)

async function sandboxTest() {
  if (!sandboxInput.value.trim()) return
  sandboxLoading.value = true
  try {
    const res = await fetch('/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: sandboxInput.value }], model: 'agentic-service', stream: false, max_tokens: 200 })
    })
    const data = await res.json()
    sandboxResult.value = data.choices?.[0]?.message?.content || JSON.stringify(data)
    const ex = examples.value.find(e => e.id === 'sandbox')
    if (ex) ex.status = 'pass'
  } catch (e) {
    sandboxResult.value = '错误: ' + e.message
    const ex = examples.value.find(e => e.id === 'sandbox')
    if (ex) ex.status = 'fail'
  } finally { sandboxLoading.value = false }
}
</script>

<style scoped>
.page-title { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
.page-desc { font-size: 14px; color: var(--text-dim); margin-bottom: 24px; }
.grid { display: grid; gap: 16px; }
.grid-3 { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
.example-card {
  padding: 20px; border-radius: 8px; background: var(--surface-2);
  cursor: pointer; transition: all 0.15s; border: 1px solid var(--border);
}
.example-card:hover { border-color: var(--primary); background: var(--surface-3); }
.example-icon { font-size: 32px; margin-bottom: 8px; }
.example-name { font-weight: 600; font-size: 15px; margin-bottom: 4px; }
.example-desc { font-size: 13px; color: var(--text-dim); margin-bottom: 8px; }
.example-status { font-size: 12px; font-weight: 600; }
.example-status.pass { color: var(--success, #10b981); }
.example-status.fail { color: var(--error, #ef4444); }
.example-status.idle { color: var(--text-dim); }
.example-panel {
  margin-top: 24px; padding: 24px; background: var(--surface-2);
  border-radius: 8px; border: 1px solid var(--border);
}
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.panel-header h2 { margin: 0; font-size: 20px; }
.btn-close { background: none; border: none; font-size: 20px; cursor: pointer; color: var(--text-dim); }
.chat-box {
  max-height: 400px; overflow-y: auto; padding: 16px;
  background: var(--surface-3); border-radius: 6px; margin-bottom: 16px;
  display: flex; flex-direction: column; gap: 12px;
}
.chat-msg { display: flex; }
.chat-msg.user { flex-direction: row-reverse; }
.msg-text { background: var(--surface); padding: 8px 12px; border-radius: 6px; max-width: 70%; font-size: 14px; }
.chat-msg.user .msg-text { background: rgba(0,117,222,0.1); }
.chat-input { display: flex; gap: 12px; }
.test-panel { display: flex; gap: 12px; align-items: center; }
.result-box { margin-top: 16px; padding: 16px; background: var(--surface-3); border-radius: 6px; font-size: 14px; line-height: 1.6; }
.error-box { margin-top: 16px; padding: 12px; background: rgba(239,68,68,0.1); color: var(--error, #ef4444); border-radius: 6px; font-size: 13px; }
input[type="text"], input:not([type]) { padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface); color: var(--text); font-size: 14px; flex: 1; }
button { padding: 8px 16px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface); color: var(--text); font-size: 14px; cursor: pointer; }
button:hover { background: var(--surface-2); }
button:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
