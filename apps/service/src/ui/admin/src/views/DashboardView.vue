<template>
  <div class="dashboard">
    <h1 class="page-title">⚡ Agentic Service</h1>

    <!-- 系统状态 -->
    <section class="section">
      <h2 class="section-title">系统状态</h2>
      <div class="grid grid-2">
        <div class="card">
          <div class="card-title">硬件信息</div>
          <dl class="info-list">
            <div v-for="(v, k) in hardware" :key="k">
              <dt>{{ formatKey(k) }}</dt>
              <dd>{{ v }}</dd>
            </div>
          </dl>
        </div>
        <div class="card">
          <div class="card-title">Ollama 状态</div>
          <div class="ollama-status">
            <div class="status-indicator" :class="ollama.running ? 'running' : 'stopped'"></div>
            <span>{{ ollama.running ? '运行中' : '未运行' }}</span>
            <span class="status-detail">{{ ollama.host || 'localhost:11434' }}</span>
          </div>
          <div v-if="!ollama.running && ollama.error" class="error-hint">{{ ollama.error }}</div>
          <div v-if="ollama.models.length > 0" style="margin-top: 16px">
            <div class="info-label">已安装 ({{ ollama.models.length }})</div>
            <div class="model-tags">
              <span v-for="m in ollama.models" :key="m" class="tag">{{ m }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 模型管理 -->
    <section class="section">
      <h2 class="section-title">模型管理</h2>
      <div class="grid grid-2">
        <div class="card">
          <div class="card-title">已安装模型</div>
          <div v-if="!ollama.running" class="empty">Ollama 未运行</div>
          <div v-else-if="ollama.models.length === 0" class="empty">暂无模型</div>
          <div v-else class="model-list">
            <div v-for="m in ollama.models" :key="m" class="model-item">
              <span class="model-name">{{ m }}</span>
              <button class="btn-danger" @click="deleteModel(m)">删除</button>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-title">推荐模型</div>
          <div class="model-list">
            <div v-for="m in recommended" :key="m.name" class="model-item">
              <div>
                <div class="model-name">{{ m.name }}</div>
                <div class="model-desc">{{ m.desc }}</div>
              </div>
              <div class="model-actions">
                <div v-if="downloadProgress[m.name]" class="progress-text">{{ downloadProgress[m.name] }}</div>
                <button v-else @click="downloadModel(m.name)" :disabled="!ollama.running">下载</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 配置 -->
    <section class="section">
      <h2 class="section-title">配置</h2>
      <div class="card">
        <form @submit.prevent="saveConfig" class="config-form">
          <div class="config-group">
            <div class="group-title">LLM Provider</div>
            <div class="field-row">
              <div class="field">
                <label>Provider</label>
                <select v-model="config.llm.provider">
                  <option value="ollama">Ollama (本地)</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="custom">自定义</option>
                </select>
              </div>
              <div class="field" v-if="config.llm.provider !== 'ollama'">
                <label>Base URL</label>
                <input v-model="config.llm.baseUrl" placeholder="https://api.openai.com/v1" />
              </div>
            </div>
            <div class="field-row" v-if="config.llm.provider !== 'ollama'">
              <div class="field">
                <label>API Key</label>
                <input v-model="config.llm.apiKey" type="password" placeholder="sk-..." />
              </div>
              <div class="field">
                <label>Model</label>
                <input v-model="config.llm.model" placeholder="gpt-4o" />
              </div>
            </div>
          </div>

          <div class="config-group">
            <div class="group-title">STT Provider</div>
            <div class="field-row">
              <div class="field">
                <label>Provider</label>
                <select v-model="config.stt.provider">
                  <option value="whisper">Whisper (本地)</option>
                  <option value="deepgram">Deepgram</option>
                  <option value="openai">OpenAI Whisper API</option>
                  <option value="custom">自定义</option>
                </select>
              </div>
              <div class="field" v-if="config.stt.provider !== 'whisper'">
                <label>Base URL</label>
                <input v-model="config.stt.baseUrl" placeholder="https://api.deepgram.com/v1" />
              </div>
            </div>
            <div class="field-row" v-if="config.stt.provider !== 'whisper'">
              <div class="field">
                <label>API Key</label>
                <input v-model="config.stt.apiKey" type="password" />
              </div>
              <div class="field">
                <label>Model</label>
                <input v-model="config.stt.model" placeholder="nova-2" />
              </div>
            </div>
          </div>

          <div class="config-group">
            <div class="group-title">TTS Provider</div>
            <div class="field-row">
              <div class="field">
                <label>Provider</label>
                <select v-model="config.tts.provider">
                  <option value="coqui">Coqui (本地)</option>
                  <option value="elevenlabs">ElevenLabs</option>
                  <option value="openai">OpenAI TTS</option>
                  <option value="custom">自定义</option>
                </select>
              </div>
              <div class="field" v-if="config.tts.provider !== 'coqui'">
                <label>Base URL</label>
                <input v-model="config.tts.baseUrl" placeholder="https://api.elevenlabs.io/v1" />
              </div>
            </div>
            <div class="field-row" v-if="config.tts.provider !== 'coqui'">
              <div class="field">
                <label>API Key</label>
                <input v-model="config.tts.apiKey" type="password" />
              </div>
              <div class="field">
                <label>Voice / Model</label>
                <input v-model="config.tts.voiceId" placeholder="alloy / 21m00Tcm4TlvDq8ikWAM" />
              </div>
            </div>
          </div>

          <div class="actions">
            <button type="submit" :disabled="saving">{{ saving ? '保存中...' : '保存配置' }}</button>
            <span v-if="saved" class="saved-msg">✓ 已保存</span>
          </div>
        </form>
      </div>
    </section>

    <!-- 功能测试 -->
    <section class="section">
      <h2 class="section-title">功能测试</h2>
      <div class="grid grid-2">
        <div class="card">
          <div class="card-title">💬 Chat</div>
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

        <div class="card">
          <div class="card-title">🎤 语音转文字 (STT)</div>
          <div class="test-panel">
            <input type="file" accept="audio/*" @change="handleAudioFile" />
            <button @click="transcribe" :disabled="!audioFile || sttLoading">
              {{ sttLoading ? '转写中...' : '转写' }}
            </button>
          </div>
          <div v-if="sttResult" class="result-box">{{ sttResult }}</div>
        </div>

        <div class="card">
          <div class="card-title">🔊 文字转语音 (TTS)</div>
          <div class="test-panel">
            <input v-model="ttsText" placeholder="输入文字..." />
            <button @click="synthesize" :disabled="!ttsText || ttsLoading">
              {{ ttsLoading ? '合成中...' : '合成' }}
            </button>
          </div>
          <audio v-if="ttsAudio" :src="ttsAudio" controls style="margin-top: 12px; width: 100%"></audio>
        </div>

        <div class="card">
          <div class="card-title">🎙️ Voice 全链路</div>
          <div class="test-panel">
            <input type="file" accept="audio/*" @change="handleVoiceFile" />
            <button @click="voiceTest" :disabled="!voiceFile || voiceLoading">
              {{ voiceLoading ? '处理中...' : '测试' }}
            </button>
          </div>
          <div v-if="voiceResult" class="result-box">
            <div><strong>识别:</strong> {{ voiceResult.transcript }}</div>
            <div><strong>回复:</strong> {{ voiceResult.response }}</div>
            <audio v-if="voiceResult.audio" :src="voiceResult.audio" controls style="margin-top: 8px; width: 100%"></audio>
          </div>
        </div>
      </div>
    </section>

    <!-- API 端点测试 -->
    <section class="section">
      <h2 class="section-title">
        API 端点测试
        <button class="btn-run-all" @click="runAllTests" :disabled="testsRunning">
          {{ testsRunning ? '测试中...' : '▶ Run All Tests' }}
        </button>
        <span v-if="testSummary" class="test-summary">{{ testSummary }}</span>
      </h2>
      <div class="grid grid-2">
        <div v-for="t in apiTests" :key="t.name" class="card test-card" :class="t.status">
          <div class="test-header">
            <span class="test-badge" :class="t.status">
              {{ t.status === 'pass' ? '✓' : t.status === 'fail' ? '✗' : t.status === 'running' ? '⟳' : '○' }}
            </span>
            <span class="test-method">{{ t.method }}</span>
            <span class="test-path">{{ t.path }}</span>
          </div>
          <div class="test-name">{{ t.name }}</div>
          <div v-if="t.result" class="test-result">{{ t.result }}</div>
          <button class="btn-test-single" @click="runTest(t)" :disabled="t.status === 'running'">
            {{ t.status === 'running' ? '...' : '测试' }}
          </button>
        </div>
      </div>
    </section>

    <!-- 日志 -->
    <section class="section">
      <h2 class="section-title">日志</h2>
      <div class="card">
        <div class="log-stream">
          <div v-for="(log, i) in logs" :key="i" class="log-line">
            <span class="log-time">{{ formatLogTime(log.ts) }}</span>
            <span class="log-msg">{{ log.msg }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

const hardware = ref({})
const ollama = ref({ running: false, models: [] })
const logs = ref([])

const recommended = [
  { name: 'gemma2:2b', desc: '轻量级，快速响应，适合低内存' },
  { name: 'qwen2.5:3b', desc: '中文优化，平衡性能与速度' },
  { name: 'llama3.2:3b', desc: 'Meta 开源，通用能力强' },
  { name: 'phi3.5:3.8b', desc: 'Microsoft，代码和推理优化' },
  { name: 'mistral:7b', desc: '高质量，需要 8GB+ 内存' },
]
const downloadProgress = ref({})

const config = ref({
  llm: { provider: 'ollama', baseUrl: '', apiKey: '', model: '' },
  stt: { provider: 'whisper', baseUrl: '', apiKey: '', model: '' },
  tts: { provider: 'coqui', baseUrl: '', apiKey: '', voiceId: '' }
})
const saving = ref(false)
const saved = ref(false)

const chatHistory = ref([])
const chatInput = ref('')
const chatLoading = ref(false)
const chatBox = ref(null)

const audioFile = ref(null)
const sttResult = ref('')
const sttLoading = ref(false)

const ttsText = ref('')
const ttsAudio = ref(null)
const ttsLoading = ref(false)

const voiceFile = ref(null)
const voiceResult = ref(null)
const voiceLoading = ref(false)

// API endpoint tests
const apiTests = ref([
  { name: 'Health Check', method: 'GET', path: '/health', status: 'idle', result: '' },
  { name: 'OpenAI Models', method: 'GET', path: '/v1/models', status: 'idle', result: '' },
  { name: 'OpenAI Chat', method: 'POST', path: '/v1/chat/completions', status: 'idle', result: '' },
  { name: 'Anthropic Messages', method: 'POST', path: '/v1/messages', status: 'idle', result: '' },
  { name: 'System Status', method: 'GET', path: '/api/status', status: 'idle', result: '' },
  { name: 'Devices', method: 'GET', path: '/api/devices', status: 'idle', result: '' },
  { name: 'Get Config', method: 'GET', path: '/api/config', status: 'idle', result: '' },
  { name: 'Put Config', method: 'PUT', path: '/api/config', status: 'idle', result: '' },
  { name: 'Performance', method: 'GET', path: '/api/perf', status: 'idle', result: '' },
  { name: 'Logs', method: 'GET', path: '/api/logs', status: 'idle', result: '' },
])
const testsRunning = ref(false)
const testSummary = computed(() => {
  const pass = apiTests.value.filter(t => t.status === 'pass').length
  const fail = apiTests.value.filter(t => t.status === 'fail').length
  const total = apiTests.value.length
  if (pass + fail === 0) return ''
  return `${pass}/${total} passed` + (fail ? `, ${fail} failed` : '')
})

function getTestBody(t) {
  if (t.path === '/v1/chat/completions') {
    return JSON.stringify({ messages: [{ role: 'user', content: 'Say hi' }], model: 'agentic-service', stream: false, max_tokens: 20 })
  }
  if (t.path === '/v1/messages') {
    return JSON.stringify({ messages: [{ role: 'user', content: 'Say hi' }], model: 'agentic-service', max_tokens: 20 })
  }
  if (t.path === '/api/config' && t.method === 'PUT') {
    return JSON.stringify({ llm: { provider: 'ollama' }, stt: { provider: 'whisper' }, tts: { provider: 'coqui' } })
  }
  return null
}

async function runTest(t) {
  t.status = 'running'
  t.result = ''
  try {
    const opts = { method: t.method, headers: {} }
    const body = getTestBody(t)
    if (body) { opts.body = body; opts.headers['Content-Type'] = 'application/json' }
    const res = await fetch(t.path, opts)
    const text = await res.text()
    let preview
    try {
      const j = JSON.parse(text)
      preview = JSON.stringify(j).slice(0, 120)
    } catch { preview = text.slice(0, 120) }
    if (res.ok) {
      t.status = 'pass'
      t.result = preview
    } else {
      t.status = 'fail'
      t.result = `${res.status}: ${preview}`
    }
  } catch (e) {
    t.status = 'fail'
    t.result = e.message
  }
}

async function runAllTests() {
  testsRunning.value = true
  for (const t of apiTests.value) {
    await runTest(t)
  }
  testsRunning.value = false
}

let timer = null

async function fetchData() {
  try {
    const [statusRes, logsRes] = await Promise.all([
      fetch('/api/status').then(r => r.json()),
      fetch('/api/logs').then(r => r.json())
    ])
    hardware.value = statusRes.hardware || {}
    ollama.value = statusRes.ollama || { running: false, models: [] }
    logs.value = logsRes
  } catch (e) {
    console.error('fetch failed:', e)
  }
}

async function loadConfig() {
  try {
    const data = await fetch('/api/config').then(r => r.json())
    config.value = {
      llm: { provider: 'ollama', baseUrl: '', apiKey: '', model: '', ...data.llm },
      stt: { provider: 'whisper', baseUrl: '', apiKey: '', model: '', ...data.stt },
      tts: { provider: 'coqui', baseUrl: '', apiKey: '', voiceId: '', ...data.tts }
    }
  } catch (e) {
    console.error('load config failed:', e)
  }
}

async function saveConfig() {
  saving.value = true
  try {
    await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config.value)
    })
    saved.value = true
    setTimeout(() => saved.value = false, 2000)
  } catch (e) {
    alert('保存失败: ' + e.message)
  } finally {
    saving.value = false
  }
}

async function downloadModel(name) {
  downloadProgress.value[name] = '连接中...'
  try {
    const res = await fetch('/api/models/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: name })
    })
    
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter(l => l.startsWith('data:'))
      
      for (const line of lines) {
        try {
          const data = JSON.parse(line.slice(5))
          if (data.error) {
            downloadProgress.value[name] = '错误: ' + data.error
            setTimeout(() => delete downloadProgress.value[name], 3000)
            return
          }
          if (data.status === 'success') {
            downloadProgress.value[name] = '✓ 完成'
            setTimeout(() => {
              delete downloadProgress.value[name]
              fetchData()
            }, 2000)
            return
          }
          if (data.status) {
            const pct = data.completed && data.total ? 
              Math.round((data.completed / data.total) * 100) + '%' : 
              data.status
            downloadProgress.value[name] = pct
          }
        } catch {}
      }
    }
  } catch (e) {
    downloadProgress.value[name] = '错误: ' + e.message
    setTimeout(() => delete downloadProgress.value[name], 3000)
  }
}

async function deleteModel(name) {
  if (!confirm(`确定删除模型 ${name}？`)) return
  try {
    await fetch(`/api/models/${encodeURIComponent(name)}`, { method: 'DELETE' })
    fetchData()
  } catch (e) {
    alert('删除失败: ' + e.message)
  }
}

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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
          } else if (data.error) {
            assistantMsg.content = '错误: ' + data.error
          }
        } catch (parseErr) {
          console.warn('[Chat SSE] parse error:', trimmed, parseErr)
        }
      }
    }
    
    if (!assistantMsg.content) {
      assistantMsg.content = '无回复'
    }
    await nextTick()
    if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight
  } catch (e) {
    assistantMsg.content = '错误: ' + e.message
  } finally {
    chatLoading.value = false
  }
}

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
  } catch (e) {
    sttResult.value = '错误: ' + e.message
  } finally {
    sttLoading.value = false
  }
}

async function synthesize() {
  if (!ttsText.value.trim()) return
  ttsLoading.value = true
  try {
    const res = await fetch('/api/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: ttsText.value })
    })
    const blob = await res.blob()
    ttsAudio.value = URL.createObjectURL(blob)
  } catch (e) {
    alert('合成失败: ' + e.message)
  } finally {
    ttsLoading.value = false
  }
}

function handleVoiceFile(e) { voiceFile.value = e.target.files[0] }

async function voiceTest() {
  if (!voiceFile.value) return
  voiceLoading.value = true
  try {
    const form = new FormData()
    form.append('audio', voiceFile.value)
    const res = await fetch('/api/voice', { method: 'POST', body: form })
    const data = await res.json()
    voiceResult.value = {
      transcript: data.transcript || '',
      response: data.response || '',
      audio: data.audioUrl || null
    }
  } catch (e) {
    alert('测试失败: ' + e.message)
  } finally {
    voiceLoading.value = false
  }
}

function formatKey(k) {
  const map = { platform: '平台', arch: '架构', cpus: 'CPU核心', totalMemory: '内存', freeMemory: '可用内存' }
  return map[k] || k
}

function formatLogTime(ts) {
  const d = new Date(ts)
  return d.toLocaleTimeString('zh-CN', { hour12: false })
}

onMounted(() => {
  fetchData()
  loadConfig()
  timer = setInterval(fetchData, 5000)
})
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.dashboard { max-width: 1400px; margin: 0 auto; }
.page-title { font-size: 32px; font-weight: 700; margin-bottom: 32px; }
.section { margin-bottom: 48px; }
.section-title { font-size: 20px; font-weight: 600; margin-bottom: 16px; color: var(--text-dim); }
.grid { display: grid; gap: 24px; }
.grid-2 { grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
.info-list { display: flex; flex-direction: column; gap: 12px; }
.info-list > div { display: flex; justify-content: space-between; }
.info-list dt { color: var(--text-dim); font-size: 14px; }
.info-list dd { font-weight: 500; }
.ollama-status { display: flex; align-items: center; gap: 12px; }
.status-indicator { width: 10px; height: 10px; border-radius: 50%; }
.status-indicator.running { background: var(--success); }
.status-indicator.stopped { background: var(--error); }
.status-detail { color: var(--text-dim); font-size: 13px; margin-left: auto; }
.error-hint { color: #e74c3c; font-size: 12px; margin-top: 8px; padding: 6px 10px; background: rgba(231,76,60,0.08); border-radius: 6px; }
.info-label { font-size: 13px; color: var(--text-dim); margin-bottom: 8px; }
.model-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.tag { background: var(--surface-2); padding: 4px 10px; border-radius: 4px; font-size: 13px; }
.empty { color: var(--text-dim); font-size: 14px; text-align: center; padding: 32px; }
.model-list { display: flex; flex-direction: column; gap: 12px; }
.model-item {
  padding: 12px; background: var(--surface-2); border-radius: 6px;
  display: flex; justify-content: space-between; align-items: center; gap: 12px;
}
.model-name { font-weight: 500; font-size: 14px; }
.model-desc { font-size: 12px; color: var(--text-dim); margin-top: 2px; }
.model-actions { display: flex; align-items: center; gap: 8px; }
.progress-text { font-size: 13px; color: var(--primary); }
.btn-danger { background: var(--error); }
.config-form { display: flex; flex-direction: column; gap: 32px; }
.config-group { display: flex; flex-direction: column; gap: 16px; }
.group-title { font-weight: 600; font-size: 15px; }
.field-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 13px; color: var(--text-dim); }
.actions { display: flex; align-items: center; gap: 16px; padding-top: 8px; }
.saved-msg { color: var(--success); font-size: 14px; }
.chat-box {
  max-height: 300px; overflow-y: auto; padding: 12px;
  background: var(--surface-2); border-radius: 6px; margin-bottom: 12px;
  display: flex; flex-direction: column; gap: 8px;
}
.chat-msg { display: flex; }
.chat-msg.user { flex-direction: row-reverse; }
.msg-text {
  background: var(--surface-3); padding: 8px 12px; border-radius: 6px;
  max-width: 80%; font-size: 14px;
}
.chat-input { display: flex; gap: 8px; }
.test-panel { display: flex; gap: 8px; margin-bottom: 12px; }
.result-box {
  padding: 12px; background: var(--surface-2); border-radius: 6px;
  font-size: 13px; line-height: 1.6;
}
.log-stream {
  max-height: 300px; overflow-y: auto;
  font-family: 'SF Mono', Monaco, monospace; font-size: 13px;
  background: var(--surface-2); padding: 12px; border-radius: 6px;
}
.log-line { display: flex; gap: 12px; padding: 2px 0; }
.log-time { color: var(--text-dim); flex-shrink: 0; }
.log-msg { color: var(--text); }
.btn-run-all {
  margin-left: 16px; padding: 6px 16px; border-radius: 6px; font-size: 13px;
  background: var(--primary, #0075de); color: #fff; border: none; cursor: pointer;
  font-weight: 600;
}
.btn-run-all:disabled { opacity: 0.5; cursor: not-allowed; }
.test-summary { margin-left: 12px; font-size: 14px; color: var(--text-dim); font-weight: 400; }
.test-card { position: relative; }
.test-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.test-badge {
  width: 22px; height: 22px; border-radius: 50%; display: flex;
  align-items: center; justify-content: center; font-size: 12px; font-weight: 700;
  background: var(--surface-3); color: var(--text-dim);
}
.test-badge.pass { background: rgba(16,185,129,0.15); color: var(--success, #10b981); }
.test-badge.fail { background: rgba(239,68,68,0.15); color: var(--error, #ef4444); }
.test-badge.running { background: rgba(59,130,246,0.15); color: var(--primary, #3b82f6); }
.test-method {
  font-family: 'SF Mono', Monaco, monospace; font-size: 11px; font-weight: 700;
  padding: 2px 6px; border-radius: 3px; background: var(--surface-3);
}
.test-path { font-family: 'SF Mono', Monaco, monospace; font-size: 13px; color: var(--text); }
.test-name { font-size: 13px; color: var(--text-dim); margin-bottom: 4px; }
.test-result {
  font-family: 'SF Mono', Monaco, monospace; font-size: 12px; color: var(--text-dim);
  margin-top: 4px; max-height: 60px; overflow: hidden; text-overflow: ellipsis;
  word-break: break-all;
}
.btn-test-single {
  margin-top: 8px; padding: 4px 12px; border-radius: 4px; font-size: 12px;
  background: var(--surface-3); border: 1px solid var(--border); cursor: pointer;
}
.btn-test-single:disabled { opacity: 0.5; cursor: not-allowed; }
.test-card.pass { border-left: 3px solid var(--success, #10b981); }
.test-card.fail { border-left: 3px solid var(--error, #ef4444); }
.test-card.running { border-left: 3px solid var(--primary, #3b82f6); }
</style>
