<template>
  <div class="app">
    <!-- Header -->
    <header class="header">
      <div class="header-content">
        <h1 class="logo">Agentic Service</h1>
        <div class="status" :class="{ online }">
          <span class="dot"></span>
          {{ online ? 'Running' : 'Offline' }}
        </div>
      </div>
    </header>

    <!-- Main -->
    <main class="main">
      <!-- Hero -->
      <section class="hero">
        <h2 class="hero-title">Local AI Infrastructure</h2>
        <p class="hero-desc">Zero-config deployment. Hardware-optimized models. Production-ready.</p>
      </section>

      <!-- Download Progress (if active) -->
      <div v-if="download.inProgress" class="download">
        <div class="download-header">
          <div class="download-label">Downloading</div>
          <div class="download-model">{{ download.model }}</div>
        </div>
        <div v-if="download.total > 0" class="download-bar">
          <div class="download-fill" :style="{ width: downloadPercent + '%' }"></div>
        </div>
        <div class="download-meta">
          <span>{{ download.status }}</span>
          <span v-if="download.total > 0">{{ downloadPercent }}%</span>
        </div>
      </div>

      <!-- Models -->
      <section class="section">
        <h3 class="section-title">Models</h3>
        
        <!-- Installed -->
        <div v-if="ollama.running && ollama.models.length > 0" class="model-group">
          <div class="group-header">
            <h4>Installed</h4>
            <span class="badge">{{ ollama.models.length }}</span>
          </div>
          <div class="model-grid">
            <div v-for="m in ollama.models" :key="m" class="model-card installed">
              <div class="card-content">
                <div class="model-icon">✓</div>
                <div class="model-info">
                  <div class="model-name">{{ m }}</div>
                </div>
              </div>
              <button class="btn-delete" @click="deleteModel(m)">Delete</button>
            </div>
          </div>
        </div>

        <!-- Recommended -->
        <div class="model-group">
          <div class="group-header">
            <h4>Available Models</h4>
          </div>
          <div class="model-grid">
            <div v-for="m in recommended" :key="m.name" class="model-card">
              <div class="card-content">
                <div class="model-icon">{{ getModelIcon(m.name) }}</div>
                <div class="model-info">
                  <div class="model-name">{{ m.name }}</div>
                  <div class="model-desc">{{ m.desc }}</div>
                </div>
              </div>
              <div v-if="progress[m.name]" class="model-progress">{{ progress[m.name] }}</div>
              <button v-else class="btn-download" @click="downloadModel(m.name)" :disabled="!ollama.running">
                Download
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- System -->
      <section class="section dark">
        <h3 class="section-title">System</h3>
        <div class="system">
          <div class="metric">
            <div class="label">Platform</div>
            <div class="value">{{ hardware.platform || '—' }}</div>
          </div>
          <div class="metric">
            <div class="label">Architecture</div>
            <div class="value">{{ hardware.arch || '—' }}</div>
          </div>
          <div class="metric">
            <div class="label">Memory</div>
            <div class="value">{{ hardware.memory || '—' }} GB</div>
          </div>
          <div class="metric">
            <div class="label">GPU</div>
            <div class="value">{{ formatGPU(hardware.gpu) }}</div>
          </div>
        </div>
      </section>

      <!-- Devices -->
      <section class="section">
        <h3 class="section-title">Connected Devices</h3>
        <div v-if="devices.length === 0" class="empty-state">
          <div class="empty-icon">📱</div>
          <p>No devices connected</p>
          <p class="empty-hint">Connect via companion app to enable remote access</p>
        </div>
        <div v-else class="device-list">
          <div v-for="d in devices" :key="d.id" class="device-card">
            <div class="device-icon">{{ getDeviceIcon(d.type) }}</div>
            <div class="device-info">
              <div class="device-name">{{ d.name || d.id }}</div>
              <div class="device-meta">{{ d.type }} • {{ d.status }}</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Configuration -->
      <section class="section">
        <h3 class="section-title">Configuration</h3>
        <div class="config-card">
          <form @submit.prevent="saveConfig">
            <div class="config-group">
              <label class="config-label">LLM Provider</label>
              <select v-model="config.llm.provider" class="config-input">
                <option value="ollama">Ollama (Local)</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </div>
            <div v-if="config.llm.provider !== 'ollama'" class="config-group">
              <label class="config-label">API Key</label>
              <input v-model="config.llm.apiKey" type="password" class="config-input" placeholder="sk-...">
            </div>
            <div v-if="config.llm.provider !== 'ollama'" class="config-group">
              <label class="config-label">Base URL</label>
              <input v-model="config.llm.baseUrl" type="text" class="config-input" placeholder="https://api.openai.com/v1">
            </div>
            <button type="submit" class="btn-save">Save Configuration</button>
          </form>
        </div>
      </section>

      <!-- Tests -->
      <section class="section">
        <h3 class="section-title">Function Tests</h3>
        <div class="tests-grid">
          <div class="test-card">
            <div class="test-header">
              <h4>Chat</h4>
              <span class="test-badge">POST /api/chat</span>
            </div>
            <button @click="testChat" class="btn-test" :disabled="testing.chat">
              {{ testing.chat ? 'Testing...' : 'Test' }}
            </button>
            <div v-if="testResults.chat" class="test-result" :class="testResults.chat.success ? 'success' : 'error'">
              {{ testResults.chat.message }}
            </div>
          </div>
          
          <div class="test-card">
            <div class="test-header">
              <h4>Transcription</h4>
              <span class="test-badge">POST /api/transcribe</span>
            </div>
            <button @click="testTranscribe" class="btn-test" :disabled="testing.transcribe">
              {{ testing.transcribe ? 'Testing...' : 'Test' }}
            </button>
            <div v-if="testResults.transcribe" class="test-result" :class="testResults.transcribe.success ? 'success' : 'error'">
              {{ testResults.transcribe.message }}
            </div>
          </div>
          
          <div class="test-card">
            <div class="test-header">
              <h4>TTS</h4>
              <span class="test-badge">POST /api/tts</span>
            </div>
            <button @click="testTTS" class="btn-test" :disabled="testing.tts">
              {{ testing.tts ? 'Testing...' : 'Test' }}
            </button>
            <div v-if="testResults.tts" class="test-result" :class="testResults.tts.success ? 'success' : 'error'">
              {{ testResults.tts.message }}
            </div>
          </div>
        </div>
      </section>

      <!-- Examples -->
      <section class="section cta">
        <div class="cta-content">
          <h3>Ready to explore?</h3>
          <p>7 interactive demos showcasing voice, vision, and chat</p>
        </div>
        <a href="/examples/" class="cta-button">View Examples</a>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const online = ref(false)
const hardware = ref({})
const ollama = ref({ running: false, models: [] })
const download = ref({ inProgress: false, model: '', status: '', progress: 0, total: 0 })
const progress = ref({})
const devices = ref([])
const config = ref({ llm: { provider: 'ollama', apiKey: '', baseUrl: '' } })
const testing = ref({ chat: false, transcribe: false, tts: false })
const testResults = ref({ chat: null, transcribe: null, tts: null })

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
    config.value = res
  } catch {}
}

async function saveConfig() {
  try {
    await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config.value)
    })
    alert('Configuration saved!')
  } catch (e) {
    alert('Failed to save: ' + e.message)
  }
}

async function testChat() {
  testing.value.chat = true
  testResults.value.chat = null
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello, test!' })
    })
    if (res.ok) {
      testResults.value.chat = { success: true, message: '✓ Chat API working' }
    } else {
      testResults.value.chat = { success: false, message: `✗ Failed: ${res.status}` }
    }
  } catch (e) {
    testResults.value.chat = { success: false, message: `✗ Error: ${e.message}` }
  } finally {
    testing.value.chat = false
  }
}

async function testTranscribe() {
  testing.value.transcribe = true
  testResults.value.transcribe = null
  try {
    // Create a minimal audio blob for testing
    const blob = new Blob([new Uint8Array(100)], { type: 'audio/wav' })
    const formData = new FormData()
    formData.append('audio', blob, 'test.wav')
    
    const res = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData
    })
    if (res.ok) {
      testResults.value.transcribe = { success: true, message: '✓ Transcription API working' }
    } else {
      testResults.value.transcribe = { success: false, message: `✗ Failed: ${res.status}` }
    }
  } catch (e) {
    testResults.value.transcribe = { success: false, message: `✗ Error: ${e.message}` }
  } finally {
    testing.value.transcribe = false
  }
}

async function testTTS() {
  testing.value.tts = true
  testResults.value.tts = null
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Test', voice: 'alloy' })
    })
    if (res.ok) {
      testResults.value.tts = { success: true, message: '✓ TTS API working' }
    } else {
      testResults.value.tts = { success: false, message: `✗ Failed: ${res.status}` }
    }
  } catch (e) {
    testResults.value.tts = { success: false, message: `✗ Error: ${e.message}` }
  } finally {
    testing.value.tts = false
  }
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
          if (data.error) {
            progress.value[name] = 'Error'
            setTimeout(() => delete progress.value[name], 3000)
            return
          }
          if (data.status === 'success') {
            progress.value[name] = '✓'
            setTimeout(() => {
              delete progress.value[name]
              fetchData()
            }, 2000)
            return
          }
          if (data.status) {
            const pct = data.completed && data.total ? 
              Math.round((data.completed / data.total) * 100) + '%' : 
              data.status
            progress.value[name] = pct
          }
        } catch {}
      }
    }
  } catch {
    progress.value[name] = 'Error'
    setTimeout(() => delete progress.value[name], 3000)
  }
}

async function deleteModel(name) {
  if (!confirm(`Delete ${name}?`)) return
  try {
    await fetch(`/api/models/${encodeURIComponent(name)}`, { method: 'DELETE' })
    fetchData()
  } catch {}
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

function getDeviceIcon(type) {
  if (type === 'ios') return '📱'
  if (type === 'android') return '🤖'
  if (type === 'macos') return '💻'
  if (type === 'windows') return '🖥️'
  return '📱'
}

onMounted(() => {
  check()
  fetchData()
  loadConfig()
  timer = setInterval(() => {
    check()
    fetchData()
  }, 5000)
})
onUnmounted(() => clearInterval(timer))
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.app {
  min-height: 100vh;
  background: #ffffff;
}

/* Header */
.header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.95);
}

.status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #615d59;
  padding: 4px 12px;
  background: #f6f5f4;
  border-radius: 6px;
}

.status.online {
  background: rgba(26, 174, 57, 0.1);
  color: #1aae39;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

/* Main */
.main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 40px 80px;
}

/* Hero */
.hero {
  padding: 64px 0 48px;
  text-align: center;
}

.hero-title {
  font-size: 48px;
  font-weight: 700;
  line-height: 1.0;
  letter-spacing: -1.5px;
  color: rgba(0, 0, 0, 0.95);
  margin-bottom: 12px;
}

.hero-desc {
  font-size: 20px;
  font-weight: 400;
  line-height: 1.4;
  color: #615d59;
}

/* Download Progress */
.download {
  background: #f2f9ff;
  border: 1px solid rgba(0, 117, 222, 0.2);
  border-radius: 12px;
  padding: 20px 24px;
  margin-bottom: 48px;
}

.download-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 12px;
}

.download-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #0075de;
}

.download-model {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.95);
}

.download-bar {
  height: 6px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}

.download-fill {
  height: 100%;
  background: #0075de;
  transition: width 0.3s ease;
}

.download-meta {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #615d59;
}

/* Section */
.section {
  padding: 48px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.section:last-child {
  border-bottom: none;
}

.section.dark {
  margin: 0 -40px;
  padding: 48px 40px;
  background: #31302e;
  color: #ffffff;
  border-bottom: none;
}

.section.cta {
  background: #f6f5f4;
  margin: 0 -40px;
  padding: 40px 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
  border-bottom: none;
}

.section-title {
  font-size: 32px;
  font-weight: 700;
  line-height: 1.25;
  color: rgba(0, 0, 0, 0.95);
  margin-bottom: 24px;
}

.section.dark .section-title {
  color: #ffffff;
}

/* Models */
.model-group {
  margin-bottom: 40px;
}

.model-group:last-child {
  margin-bottom: 0;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.group-header h4 {
  font-size: 18px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.95);
}

.badge {
  padding: 4px 10px;
  background: #f2f9ff;
  color: #0075de;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
}

.model-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.model-card {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: all 0.2s;
  box-shadow: rgba(0,0,0,0.01) 0px 1px 3px, rgba(0,0,0,0.02) 0px 3px 7px;
}

.model-card:hover {
  border-color: rgba(0, 0, 0, 0.15);
  box-shadow: rgba(0,0,0,0.02) 0px 3px 7px, rgba(0,0,0,0.04) 0px 7px 15px;
  transform: translateY(-2px);
}

.model-card.installed {
  background: rgba(26, 174, 57, 0.05);
  border-color: rgba(26, 174, 57, 0.3);
}

.card-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
}

.model-icon {
  font-size: 32px;
  line-height: 1;
  flex-shrink: 0;
}

.model-info {
  flex: 1;
  min-width: 0;
}

.model-name {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.95);
  margin-bottom: 4px;
}

.model-desc {
  font-size: 13px;
  color: #615d59;
  line-height: 1.4;
}

.model-progress {
  font-size: 13px;
  font-weight: 500;
  color: #0075de;
  text-align: center;
}

.model-card button {
  width: 100%;
  padding: 10px 16px;
  border-radius: 6px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-download {
  background: #0075de;
  color: #ffffff;
}

.btn-download:hover:not(:disabled) {
  background: #005bab;
}

.btn-download:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-delete {
  background: transparent;
  color: #dd5b00;
  border: 1px solid rgba(221, 91, 0, 0.3) !important;
}

.btn-delete:hover {
  background: rgba(221, 91, 0, 0.1);
  border-color: rgba(221, 91, 0, 0.5) !important;
}

/* System */
.system {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 24px;
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metric .label {
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.6);
}

.metric .value {
  font-size: 26px;
  font-weight: 700;
  line-height: 1.2;
  color: #ffffff;
}

/* Devices */
.empty-state {
  text-align: center;
  padding: 64px 32px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-state p {
  font-size: 16px;
  color: #615d59;
  margin: 8px 0;
}

.empty-hint {
  font-size: 14px !important;
  color: #a39e98 !important;
}

.device-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.device-card {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.2s;
  box-shadow: rgba(0,0,0,0.01) 0px 1px 3px, rgba(0,0,0,0.02) 0px 3px 7px;
}

.device-card:hover {
  border-color: rgba(0, 0, 0, 0.15);
  box-shadow: rgba(0,0,0,0.02) 0px 3px 7px, rgba(0,0,0,0.04) 0px 7px 15px;
  transform: translateY(-2px);
}

.device-icon {
  font-size: 32px;
  line-height: 1;
}

.device-info {
  flex: 1;
  min-width: 0;
}

.device-name {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.95);
  margin-bottom: 4px;
}

.device-meta {
  font-size: 13px;
  color: #615d59;
}

/* Configuration */
.config-card {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  padding: 32px;
  max-width: 600px;
  box-shadow: rgba(0,0,0,0.01) 0px 1px 3px, rgba(0,0,0,0.02) 0px 3px 7px;
}

.config-group {
  margin-bottom: 20px;
}

.config-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.95);
  margin-bottom: 8px;
}

.config-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  font-size: 15px;
  font-family: inherit;
  color: rgba(0, 0, 0, 0.95);
  transition: all 0.2s;
}

.config-input:focus {
  outline: none;
  border-color: #0075de;
  box-shadow: 0 0 0 3px rgba(0, 117, 222, 0.1);
}

.btn-save {
  width: 100%;
  padding: 10px 20px;
  background: #0075de;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-save:hover {
  background: #005bab;
  transform: scale(1.02);
}

.btn-save:active {
  transform: scale(0.98);
}

/* Tests */
.tests-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.test-card {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: rgba(0,0,0,0.01) 0px 1px 3px, rgba(0,0,0,0.02) 0px 3px 7px;
}

.test-header h4 {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.95);
  margin-bottom: 6px;
}

.test-badge {
  font-size: 12px;
  font-family: 'SF Mono', 'Menlo', monospace;
  color: #615d59;
  background: #f6f5f4;
  padding: 4px 8px;
  border-radius: 4px;
}

.btn-test {
  width: 100%;
  padding: 10px 16px;
  background: #0075de;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-test:hover:not(:disabled) {
  background: #005bab;
}

.btn-test:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.test-result {
  padding: 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
}

.test-result.success {
  background: rgba(26, 174, 57, 0.1);
  color: #1aae39;
  border: 1px solid rgba(26, 174, 57, 0.2);
}

.test-result.error {
  background: rgba(221, 91, 0, 0.1);
  color: #dd5b00;
  border: 1px solid rgba(221, 91, 0, 0.2);
}

/* CTA */
.cta-content h3 {
  font-size: 22px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.95);
  margin-bottom: 6px;
}

.cta-content p {
  font-size: 16px;
  color: #615d59;
}

.cta-button {
  padding: 12px 24px;
  background: #0075de;
  color: #ffffff;
  border-radius: 6px;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: all 0.2s;
}

.cta-button:hover {
  background: #005bab;
  transform: scale(1.05);
}

.cta-button:active {
  transform: scale(0.95);
}
</style>
