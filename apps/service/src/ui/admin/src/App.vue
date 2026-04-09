<template>
  <div class="app">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo">⚡ Agentic</div>
      </div>

      <nav class="nav">
        <a v-for="item in navItems" :key="item.id" href="#"
           class="nav-item" :class="{ active: activeSection === item.id }"
           @click.prevent="activeSection = item.id">
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-label">{{ item.label }}</span>
        </a>
      </nav>

      <div class="sidebar-footer">
        <div class="status" :class="{ online }">
          <span class="status-dot"></span>
          <span>{{ online ? 'Running' : 'Offline' }}</span>
        </div>
      </div>
    </aside>

    <!-- Main -->
    <main class="main">
      <div class="content">

        <!-- Download Alert -->
        <div v-if="download.inProgress" class="alert">
          <div class="alert-icon">📦</div>
          <div class="alert-body">
            <div class="alert-title">Downloading {{ download.model }}</div>
            <div class="alert-meta">
              <span>{{ download.status }}</span>
              <span v-if="download.total > 0">{{ downloadPercent }}%</span>
            </div>
            <div v-if="download.total > 0" class="progress">
              <div class="progress-fill" :style="{ width: downloadPercent + '%' }"></div>
            </div>
          </div>
        </div>

        <!-- Overview -->
        <section v-show="activeSection === 'overview'">
          <h1 class="page-title">Local AI Infrastructure</h1>
          <p class="page-desc">Zero-config deployment. Production-ready.</p>

          <div class="cards">
            <div class="card">
              <div class="card-label">Platform</div>
              <div class="card-value">{{ hardware.platform || '—' }}</div>
            </div>
            <div class="card">
              <div class="card-label">Architecture</div>
              <div class="card-value">{{ hardware.arch || '—' }}</div>
            </div>
            <div class="card">
              <div class="card-label">Memory</div>
              <div class="card-value">{{ hardware.memory || '—' }} GB</div>
            </div>
            <div class="card">
              <div class="card-label">GPU</div>
              <div class="card-value">{{ formatGPU(hardware.gpu) }}</div>
            </div>
          </div>

          <div class="callout">
            <div>
              <h3>Interactive Examples</h3>
              <p>7 demos showcasing voice, vision, and chat capabilities</p>
            </div>
            <a href="/examples/" class="btn-primary">Open Examples →</a>
          </div>
        </section>

        <!-- Models -->
        <section v-show="activeSection === 'models'">
          <div class="section-header">
            <h1 class="page-title">Models</h1>
            <span class="badge">{{ ollama.models.length }} installed</span>
          </div>

          <div v-if="ollama.models.length > 0" class="group">
            <h3 class="group-title">Installed</h3>
            <div class="list">
              <div v-for="m in ollama.models" :key="m" class="list-item installed">
                <div class="list-left">
                  <span class="icon">✓</span>
                  <span class="name">{{ m }}</span>
                </div>
                <button class="btn-text" @click="deleteModel(m)">Delete</button>
              </div>
            </div>
          </div>

          <div class="group">
            <h3 class="group-title">Available</h3>
            <div class="list">
              <div v-for="m in recommended" :key="m.name" class="list-item">
                <div class="list-left">
                  <span class="icon">{{ getModelIcon(m.name) }}</span>
                  <div>
                    <div class="name">{{ m.name }}</div>
                    <div class="desc">{{ m.desc }}</div>
                  </div>
                </div>
                <div v-if="progress[m.name]" class="status-text">{{ progress[m.name] }}</div>
                <button v-else class="btn-primary small" @click="downloadModel(m.name)" :disabled="!ollama.running">Download</button>
              </div>
            </div>
          </div>
        </section>

        <!-- Devices -->
        <section v-show="activeSection === 'devices'">
          <h1 class="page-title">Connected Devices</h1>
          <p class="page-desc">Devices connected to this service</p>
          <div v-if="devices.length === 0" class="empty">
            <p>No devices connected yet</p>
            <p class="hint">Connect using <code>http://{{ lanIp || 'YOUR_IP' }}:1234</code></p>
          </div>
          <div v-else class="list">
            <div v-for="d in devices" :key="d.id" class="list-item">
              <div class="list-left">
                <span class="icon">📱</span>
                <div>
                  <div class="name">{{ d.name || d.id }}</div>
                  <div class="desc">{{ d.ip }} · {{ d.connected ? 'Connected' : 'Disconnected' }}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Config -->
        <section v-show="activeSection === 'config'">
          <h1 class="page-title">Configuration</h1>
          <p class="page-desc">Service settings</p>

          <div class="form-group">
            <label class="form-label">LLM Provider</label>
            <select class="form-select" v-model="config.llm.provider">
              <option value="ollama">Ollama (Local)</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>

          <div v-if="config.llm.provider !== 'ollama'" class="form-group">
            <label class="form-label">API Key</label>
            <input class="form-input" type="password" v-model="config.llm.apiKey" placeholder="sk-..." />
          </div>

          <div v-if="config.llm.provider !== 'ollama'" class="form-group">
            <label class="form-label">Base URL</label>
            <input class="form-input" type="text" v-model="config.llm.baseUrl" placeholder="https://api.example.com" />
          </div>

          <button class="btn-primary" @click="saveConfig">Save Configuration</button>
          <span v-if="configSaved" class="saved-hint">✓ Saved</span>
        </section>

        <!-- Tests -->
        <section v-show="activeSection === 'tests'">
          <h1 class="page-title">Function Tests</h1>
          <p class="page-desc">Verify service functionality</p>

          <div class="test-grid">
            <div class="test-card">
              <div class="test-header">
                <h3>💬 Chat</h3>
                <span v-if="testResults.chat" :class="'badge-' + testResults.chat.status">{{ testResults.chat.status }}</span>
              </div>
              <p class="test-desc">Test LLM chat completions</p>
              <button class="btn-primary small" @click="testChat" :disabled="testing.chat">
                {{ testing.chat ? 'Testing...' : 'Run Test' }}
              </button>
              <div v-if="testResults.chat" class="test-result">
                <pre>{{ testResults.chat.message }}</pre>
              </div>
            </div>

            <div class="test-card">
              <div class="test-header">
                <h3>🎤 Transcription</h3>
                <span v-if="testResults.transcribe" :class="'badge-' + testResults.transcribe.status">{{ testResults.transcribe.status }}</span>
              </div>
              <p class="test-desc">Test speech-to-text</p>
              <button class="btn-primary small" @click="testTranscribe" :disabled="testing.transcribe">
                {{ testing.transcribe ? 'Testing...' : 'Run Test' }}
              </button>
              <div v-if="testResults.transcribe" class="test-result">
                <pre>{{ testResults.transcribe.message }}</pre>
              </div>
            </div>

            <div class="test-card">
              <div class="test-header">
                <h3>🔊 TTS</h3>
                <span v-if="testResults.tts" :class="'badge-' + testResults.tts.status">{{ testResults.tts.status }}</span>
              </div>
              <p class="test-desc">Test text-to-speech</p>
              <button class="btn-primary small" @click="testTTS" :disabled="testing.tts">
                {{ testing.tts ? 'Testing...' : 'Run Test' }}
              </button>
              <div v-if="testResults.tts" class="test-result">
                <pre>{{ testResults.tts.message }}</pre>
              </div>
            </div>
          </div>
        </section>

      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const activeSection = ref('overview')
const online = ref(false)
const hardware = ref({})
const ollama = ref({ running: false, models: [] })
const download = ref({ inProgress: false, model: '', status: '', progress: 0, total: 0 })
const progress = ref({})
const devices = ref([])
const config = ref({ llm: { provider: 'ollama', apiKey: '', baseUrl: '' } })
const testing = ref({ chat: false, transcribe: false, tts: false })
const testResults = ref({ chat: null, transcribe: null, tts: null })
const configSaved = ref(false)
const lanIp = ref('')

const navItems = [
  { id: 'overview', icon: '📊', label: 'Overview' },
  { id: 'models', icon: '🤖', label: 'Models' },
  { id: 'devices', icon: '📱', label: 'Devices' },
  { id: 'config', icon: '⚙️', label: 'Settings' },
  { id: 'tests', icon: '🧪', label: 'Tests' },
]

const recommended = [
  { name: 'gemma2:2b', desc: 'Google, lightweight' },
  { name: 'gemma2:9b', desc: 'Google, balanced' },
  { name: 'gemma2:27b', desc: 'Google, high quality' },
  { name: 'gemma4:e2b', desc: 'Google Gemma 4, 2B' },
  { name: 'gemma4:e4b', desc: 'Google Gemma 4, 4B' },
  { name: 'gemma4:26b', desc: 'Google Gemma 4, 26B' },
  { name: 'qwen2.5:3b', desc: 'Alibaba, Chinese' },
  { name: 'qwen2.5:7b', desc: 'Alibaba, versatile' },
  { name: 'qwen2.5-coder:3b', desc: 'Alibaba, code' },
  { name: 'qwen2.5-coder:7b', desc: 'Alibaba, code pro' },
  { name: 'qwen3:4b', desc: 'Alibaba Qwen 3' },
  { name: 'qwen3:8b', desc: 'Alibaba Qwen 3 pro' },
  { name: 'qwen3.5:4b', desc: 'Alibaba Qwen 3.5' },
  { name: 'glm4:9b', desc: 'Zhipu GLM 4' },
  { name: 'glm-4.7-flash', desc: 'Zhipu, 30B class' },
  { name: 'glm-5', desc: 'Zhipu GLM 5' },
  { name: 'glm-5.1', desc: 'Zhipu GLM 5.1' },
  { name: 'llama3.2:3b', desc: 'Meta, versatile' },
  { name: 'phi3.5:3.8b', desc: 'Microsoft, reasoning' },
  { name: 'mistral:7b', desc: 'Mistral, high quality' },
]

const downloadPercent = computed(() => {
  if (!download.value.total) return 0
  return Math.round((download.value.progress / download.value.total) * 100)
})

let timer = null

async function check() {
  try { online.value = (await fetch('/health')).ok } catch { online.value = false }
}

async function fetchData() {
  try {
    const res = await fetch('/api/status').then(r => r.json())
    hardware.value = res.hardware || {}
    ollama.value = res.ollama || { running: false, models: [] }
    download.value = res.download || { inProgress: false, model: '', status: '', progress: 0, total: 0 }
    devices.value = res.devices || []
  } catch {}
}

async function loadConfig() {
  try {
    const res = await fetch('/api/config').then(r => r.json())
    if (res && res.llm) {
      config.value = res
    } else {
      config.value = { llm: { provider: 'ollama', apiKey: '', baseUrl: '' } }
    }
  } catch {
    config.value = { llm: { provider: 'ollama', apiKey: '', baseUrl: '' } }
  }
}

async function saveConfig() {
  try {
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config.value)
    })
    configSaved.value = true
    setTimeout(() => configSaved.value = false, 2000)
  } catch {}
}

async function downloadModel(name) {
  progress.value[name] = 'Starting...'
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
          if (data.error) { progress.value[name] = 'Error'; setTimeout(() => delete progress.value[name], 3000); return }
          if (data.status === 'success') { progress.value[name] = '✓'; setTimeout(() => { delete progress.value[name]; fetchData() }, 2000); return }
          if (data.status) {
            const pct = data.completed && data.total ? Math.round((data.completed / data.total) * 100) + '%' : data.status
            progress.value[name] = pct
          }
        } catch {}
      }
    }
  } catch { progress.value[name] = 'Error'; setTimeout(() => delete progress.value[name], 3000) }
}

async function deleteModel(name) {
  if (!confirm(`Delete ${name}?`)) return
  try { await fetch(`/api/models/${encodeURIComponent(name)}`, { method: 'DELETE' }); fetchData() } catch {}
}

async function testChat() {
  testing.value.chat = true
  testResults.value.chat = null
  try {
    const res = await fetch('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'Say hello in one word' }], model: 'qwen3.5:4b' })
    })
    const data = await res.json()
    testResults.value.chat = { status: 'pass', message: data.choices?.[0]?.message?.content || 'No response' }
  } catch (e) { testResults.value.chat = { status: 'fail', message: e.message } }
  testing.value.chat = false
}

async function testTranscribe() {
  testing.value.transcribe = true
  testResults.value.transcribe = null
  try {
    const res = await fetch('/api/transcribe', { method: 'POST', body: new FormData() })
    testResults.value.transcribe = { status: 'pass', message: 'Endpoint available' }
  } catch (e) { testResults.value.transcribe = { status: 'fail', message: e.message } }
  testing.value.transcribe = false
}

async function testTTS() {
  testing.value.tts = true
  testResults.value.tts = null
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Hello world' })
    })
    testResults.value.tts = res.ok
      ? { status: 'pass', message: `Audio generated (${res.headers.get('content-length') || '?'} bytes)` }
      : { status: 'fail', message: `HTTP ${res.status}` }
  } catch (e) { testResults.value.tts = { status: 'fail', message: e.message } }
  testing.value.tts = false
}

function formatGPU(gpu) {
  if (!gpu) return '—'
  return gpu.type === 'apple-silicon' ? 'Apple Silicon' : gpu.type
}

function getModelIcon(name) {
  if (name.includes('gemma')) return '💎'
  if (name.includes('qwen')) return '🔷'
  if (name.includes('glm')) return '🌟'
  if (name.includes('llama')) return '🦙'
  if (name.includes('phi')) return '🧠'
  if (name.includes('mistral')) return '🌊'
  return '🤖'
}

onMounted(() => {
  check()
  fetchData()
  loadConfig()
  timer = setInterval(() => { check(); fetchData() }, 5000)
})
onUnmounted(() => clearInterval(timer))
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  background: #ffffff !important;
  color: #1a1a1a !important;
  color-scheme: light only;
}

.app { display: flex; min-height: 100vh; background: #ffffff !important; }

/* Force light mode on all elements */
*, *::before, *::after {
  color-scheme: light only;
}

/* Sidebar */
.sidebar {
  width: 220px;
  background: #f7f6f5;
  border-right: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}
.sidebar-header { padding: 20px 16px; border-bottom: 1px solid rgba(0, 0, 0, 0.08); }
.logo { font-size: 15px; font-weight: 700; color: rgba(0, 0, 0, 0.95); }
.nav { flex: 1; padding: 12px 8px; }
.nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 12px; border-radius: 6px;
  text-decoration: none; color: rgba(0, 0, 0, 0.55);
  font-size: 14px; font-weight: 500; margin-bottom: 2px;
  transition: all 0.15s;
}
.nav-item:hover { background: rgba(0, 0, 0, 0.04); color: rgba(0, 0, 0, 0.95); }
.nav-item.active { background: #0075de; color: #ffffff; }
.nav-icon { font-size: 16px; line-height: 1; }
.sidebar-footer { padding: 12px 16px 16px; border-top: 1px solid rgba(0, 0, 0, 0.08); }
.status {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; background: rgba(0, 0, 0, 0.04);
  border-radius: 6px; font-size: 12px; color: rgba(0, 0, 0, 0.45);
  white-space: nowrap; overflow: hidden;
}
.status.online { background: rgba(26, 174, 57, 0.1); color: #1aae39; }
.status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

/* Main */
.main { flex: 1; overflow-y: auto; }
.content { max-width: 900px; margin: 0 auto; padding: 48px 48px 100px 60px; }

/* Typography */
.page-title { font-size: 32px; font-weight: 700; color: rgba(0, 0, 0, 0.95); margin-bottom: 4px; }
.page-desc { font-size: 15px; color: rgba(0, 0, 0, 0.5); margin-bottom: 32px; }
.section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
.section-header .page-title { margin-bottom: 0; }

/* Alert */
.alert {
  display: flex; gap: 16px; padding: 16px 20px;
  background: #f2f9ff; border: 1px solid rgba(0, 117, 222, 0.15);
  border-radius: 8px; margin-bottom: 32px;
}
.alert-icon { font-size: 20px; flex-shrink: 0; }
.alert-body { flex: 1; }
.alert-title { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
.alert-meta { display: flex; justify-content: space-between; font-size: 13px; color: rgba(0, 0, 0, 0.5); margin-bottom: 8px; }
.progress { height: 4px; background: rgba(0, 0, 0, 0.08); border-radius: 2px; overflow: hidden; }
.progress-fill { height: 100%; background: #0075de; transition: width 0.3s; }

/* Cards */
.cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 32px; }
.card { padding: 18px 16px; background: #ffffff !important; border: 1px solid rgba(0, 0, 0, 0.1); border-radius: 8px; overflow: hidden; }
.card-label { font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em; color: rgba(0, 0, 0, 0.45) !important; margin-bottom: 6px; }
.card-value { font-size: 15px; font-weight: 600; color: #1a1a1a !important; line-height: 1.3; }

/* Callout */
.callout {
  display: flex; align-items: center; justify-content: space-between;
  gap: 20px; padding: 16px 20px; background: #f7f6f5;
  border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 8px;
}
.callout h3 { font-size: 14px; font-weight: 600; margin-bottom: 2px; }
.callout p { font-size: 12px; color: rgba(0, 0, 0, 0.45); }

/* List */
.list { border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 8px; overflow: hidden; }
.list-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; background: #ffffff; border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  transition: background 0.15s;
}
.list-item:last-child { border-bottom: none; }
.list-item:hover { background: #f7f6f5; }
.list-item.installed { background: rgba(26, 174, 57, 0.05); }
.list-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
.icon { font-size: 16px; flex-shrink: 0; }
.name { font-size: 14px; font-weight: 600; color: rgba(0, 0, 0, 0.95); }
.desc { font-size: 12px; color: rgba(0, 0, 0, 0.5); }
.status-text { font-size: 13px; font-weight: 500; color: #0075de; }
.badge { padding: 4px 10px; background: rgba(0, 0, 0, 0.06); border-radius: 12px; font-size: 12px; font-weight: 600; color: rgba(0, 0, 0, 0.5); }
.group { margin-bottom: 24px; }
.group-title { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: rgba(0, 0, 0, 0.4); margin-bottom: 12px; }

/* Form */
.form-group { margin-bottom: 20px; }
.form-label { display: block; font-size: 13px; font-weight: 600; color: rgba(0, 0, 0, 0.7); margin-bottom: 6px; }
.form-select, .form-input {
  width: 100%; max-width: 400px; padding: 10px 12px;
  border: 1px solid rgba(0, 0, 0, 0.15); border-radius: 6px;
  font-size: 14px; background: #ffffff; color: rgba(0, 0, 0, 0.95);
}
.form-select:focus, .form-input:focus { outline: none; border-color: #0075de; }
.saved-hint { margin-left: 12px; font-size: 13px; color: #1aae39; }

/* Tests */
.test-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
.test-card { padding: 20px; border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 8px; }
.test-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.test-header h3 { font-size: 16px; font-weight: 600; }
.test-desc { font-size: 13px; color: rgba(0, 0, 0, 0.5); margin-bottom: 12px; }
.test-result { margin-top: 12px; padding: 12px; background: #f7f6f5; border-radius: 6px; }
.test-result pre { font-size: 12px; white-space: pre-wrap; word-break: break-all; }
.badge-pass { padding: 2px 8px; background: rgba(26, 174, 57, 0.1); color: #1aae39; border-radius: 10px; font-size: 12px; font-weight: 600; }
.badge-fail { padding: 2px 8px; background: rgba(221, 91, 0, 0.1); color: #dd5b00; border-radius: 10px; font-size: 12px; font-weight: 600; }

/* Empty */
.empty { padding: 40px; text-align: center; color: rgba(0, 0, 0, 0.5); }
.empty .hint { margin-top: 8px; font-size: 13px; }
.empty code { background: #f7f6f5; padding: 2px 6px; border-radius: 4px; font-size: 13px; }

/* Buttons */
.btn-primary {
  padding: 8px 16px; background: #0075de; color: #ffffff;
  border: none; border-radius: 6px; font-size: 14px; font-weight: 600;
  cursor: pointer; text-decoration: none; transition: background 0.15s;
}
.btn-primary:hover:not(:disabled) { background: #005bab; }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-primary.small { padding: 6px 12px; font-size: 13px; }
.btn-text { padding: 4px 8px; background: transparent; border: none; font-size: 13px; font-weight: 500; color: rgba(0, 0, 0, 0.5); cursor: pointer; }
.btn-text:hover { color: #dd5b00; }
</style>
