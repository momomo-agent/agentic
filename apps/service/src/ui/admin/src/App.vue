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
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif;
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
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.header-content {
  max-width: 980px;
  margin: 0 auto;
  padding: 16px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.374px;
  color: #1d1d1f;
}

.status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 400;
  color: #86868b;
}

.status.online {
  color: #10b981;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

/* Main */
.main {
  max-width: 980px;
  margin: 0 auto;
  padding: 0 32px 120px;
}

/* Hero */
.hero {
  padding: 80px 0 64px;
  text-align: center;
}

.hero-title {
  font-size: 56px;
  font-weight: 600;
  line-height: 1.07;
  letter-spacing: -0.28px;
  color: #1d1d1f;
  margin-bottom: 12px;
}

.hero-desc {
  font-size: 21px;
  font-weight: 400;
  line-height: 1.19;
  letter-spacing: 0.231px;
  color: #86868b;
}

/* Download Progress */
.download {
  background: linear-gradient(135deg, rgba(0, 113, 227, 0.05), rgba(0, 113, 227, 0.02));
  border: 1px solid rgba(0, 113, 227, 0.15);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 64px;
}

.download-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
}

.download-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #0071e3;
}

.download-model {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.374px;
  color: #1d1d1f;
}

.download-bar {
  height: 4px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 8px;
}

.download-fill {
  height: 100%;
  background: #0071e3;
  transition: width 0.3s ease;
}

.download-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #86868b;
}

/* Section */
.section {
  padding: 64px 0;
}

.section.dark {
  margin: 0 -32px;
  padding: 64px 32px;
  background: #000000;
  color: #ffffff;
}

.section.cta {
  background: #f5f5f7;
  margin: 0 -32px;
  padding: 48px 32px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
}

.section-title {
  font-size: 40px;
  font-weight: 600;
  line-height: 1.10;
  letter-spacing: normal;
  color: #1d1d1f;
  margin-bottom: 32px;
}

.section.dark .section-title {
  color: #ffffff;
}

/* Models */
.model-group {
  margin-bottom: 48px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.group-header h4 {
  font-size: 21px;
  font-weight: 600;
  letter-spacing: 0.231px;
  color: #1d1d1f;
}

.badge {
  padding: 4px 10px;
  background: rgba(0, 113, 227, 0.1);
  color: #0071e3;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.model-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.model-card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: all 0.2s;
}

.model-card:hover {
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.model-card.installed {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(16, 185, 129, 0.02));
  box-shadow: 0 0 0 1px rgba(16, 185, 129, 0.3);
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

.model-card.installed .model-icon {
  color: #10b981;
}

.model-info {
  flex: 1;
  min-width: 0;
}

.model-name {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.374px;
  color: #1d1d1f;
  margin-bottom: 4px;
}

.model-desc {
  font-size: 13px;
  color: #86868b;
  line-height: 1.4;
}

.model-progress {
  font-size: 13px;
  font-weight: 500;
  color: #0071e3;
  text-align: center;
}

.model-card button {
  width: 100%;
  padding: 10px 16px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-download {
  background: #0071e3;
  color: #ffffff;
}

.btn-download:hover:not(:disabled) {
  background: #0077ed;
}

.btn-download:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-delete {
  background: transparent;
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3) !important;
}

.btn-delete:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.5) !important;
}

/* System */
.system {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 32px;
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metric .label {
  font-size: 12px;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.6);
}

.metric .value {
  font-size: 28px;
  font-weight: 600;
  line-height: 1.14;
  letter-spacing: 0.196px;
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
  font-size: 17px;
  color: #86868b;
  margin: 8px 0;
}

.empty-hint {
  font-size: 14px !important;
  color: #a3a3a3 !important;
}

.device-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.device-card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.2s;
}

.device-card:hover {
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08);
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
  letter-spacing: -0.374px;
  color: #1d1d1f;
  margin-bottom: 4px;
}

.device-meta {
  font-size: 13px;
  color: #86868b;
}

/* CTA */
.cta-content h3 {
  font-size: 28px;
  font-weight: 600;
  line-height: 1.14;
  letter-spacing: 0.196px;
  color: #1d1d1f;
  margin-bottom: 8px;
}

.cta-content p {
  font-size: 17px;
  font-weight: 400;
  line-height: 1.47;
  letter-spacing: -0.374px;
  color: #86868b;
}

.cta-button {
  padding: 12px 24px;
  background: #0071e3;
  color: #ffffff;
  border-radius: 980px;
  font-size: 17px;
  font-weight: 400;
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.2s;
}

.cta-button:hover {
  background: #0077ed;
}
</style>
