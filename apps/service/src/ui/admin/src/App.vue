<template>
  <div class="app">
    <!-- Header -->
    <header class="header">
      <div class="container">
        <div class="brand">
          <div class="brand-icon">⚡</div>
          <div class="brand-info">
            <div class="brand-name">Agentic Service</div>
            <div class="brand-status" :class="{ online }">
              <span class="status-dot"></span>
              {{ online ? 'Running' : 'Offline' }}
            </div>
          </div>
        </div>
        <a href="/examples/" class="btn-link">Examples →</a>
      </div>
    </header>

    <!-- Main -->
    <main class="main">
      <div class="container">
        <!-- Hero -->
        <div class="hero">
          <div class="hero-badge">Local AI Infrastructure</div>
          <h1 class="hero-title">Zero-config deployment. Production-ready.</h1>
        </div>

        <!-- Download Alert -->
        <div v-if="download.inProgress" class="callout callout-info">
          <div class="callout-icon">📦</div>
          <div class="callout-content">
            <div class="callout-title">Downloading {{ download.model }}</div>
            <div class="callout-text">{{ download.status }}</div>
            <div v-if="download.total > 0" class="progress">
              <div class="progress-bar" :style="{ width: downloadPercent + '%' }"></div>
              <div class="progress-label">{{ downloadPercent }}%</div>
            </div>
          </div>
        </div>

        <!-- System Info -->
        <div class="section">
          <h2 class="section-title">System</h2>
          <div class="grid-4">
            <div class="info-card">
              <div class="info-label">Platform</div>
              <div class="info-value">{{ hardware.platform || '—' }}</div>
            </div>
            <div class="info-card">
              <div class="info-label">Architecture</div>
              <div class="info-value">{{ hardware.arch || '—' }}</div>
            </div>
            <div class="info-card">
              <div class="info-label">Memory</div>
              <div class="info-value">{{ hardware.memory || '—' }} GB</div>
            </div>
            <div class="info-card">
              <div class="info-label">GPU</div>
              <div class="info-value">{{ formatGPU(hardware.gpu) }}</div>
            </div>
          </div>
        </div>

        <!-- Models -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">Models</h2>
            <div class="badge">{{ ollama.models.length }} installed</div>
          </div>

          <!-- Installed -->
          <div v-if="ollama.models.length > 0" class="subsection">
            <h3 class="subsection-title">Installed</h3>
            <div class="model-list">
              <div v-for="m in ollama.models" :key="m" class="model-item installed">
                <div class="model-main">
                  <span class="model-icon">✓</span>
                  <span class="model-name">{{ m }}</span>
                </div>
                <button class="btn-text" @click="deleteModel(m)">Delete</button>
              </div>
            </div>
          </div>

          <!-- Available -->
          <div class="subsection">
            <h3 class="subsection-title">Available</h3>
            <div class="model-list">
              <div v-for="m in recommended" :key="m.name" class="model-item">
                <div class="model-main">
                  <span class="model-icon">{{ getModelIcon(m.name) }}</span>
                  <div class="model-info">
                    <div class="model-name">{{ m.name }}</div>
                    <div class="model-desc">{{ m.desc }}</div>
                  </div>
                </div>
                <div v-if="progress[m.name]" class="model-status">{{ progress[m.name] }}</div>
                <button v-else class="btn-primary" @click="downloadModel(m.name)" :disabled="!ollama.running">
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  background: #ffffff;
  color: rgba(0, 0, 0, 0.95);
}

.app {
  min-height: 100vh;
}

.container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 40px;
}

/* Header */
.header {
  padding: 20px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.header .container {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: #0075de;
  color: #ffffff;
  border-radius: 6px;
}

.brand-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-name {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.95);
}

.brand-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.5);
}

.brand-status.online {
  color: #1aae39;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.btn-link {
  padding: 6px 12px;
  color: #0075de;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  border-radius: 4px;
  transition: background 0.15s;
}

.btn-link:hover {
  background: rgba(0, 117, 222, 0.08);
}

/* Main */
.main {
  padding: 60px 0 100px;
}

/* Hero */
.hero {
  text-align: center;
  margin-bottom: 60px;
}

.hero-badge {
  display: inline-block;
  padding: 4px 10px;
  background: #f6f5f4;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.5);
  margin-bottom: 16px;
}

.hero-title {
  font-size: 40px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.5px;
  color: rgba(0, 0, 0, 0.95);
}

/* Callout */
.callout {
  display: flex;
  gap: 16px;
  padding: 16px 20px;
  border-radius: 8px;
  margin-bottom: 32px;
}

.callout-info {
  background: #f2f9ff;
  border: 1px solid rgba(0, 117, 222, 0.15);
}

.callout-icon {
  font-size: 20px;
  line-height: 1;
  flex-shrink: 0;
}

.callout-content {
  flex: 1;
}

.callout-title {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.95);
  margin-bottom: 4px;
}

.callout-text {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.5);
  margin-bottom: 12px;
}

.progress {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 2px;
  position: relative;
  overflow: hidden;
}

.progress-bar::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: var(--width, 0);
  background: #0075de;
  transition: width 0.3s;
}

.progress-label {
  font-size: 12px;
  font-weight: 600;
  color: #0075de;
  min-width: 36px;
  text-align: right;
}

/* Section */
.section {
  margin-bottom: 48px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.section-title {
  font-size: 24px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.95);
}

.badge {
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.5);
}

.subsection {
  margin-bottom: 24px;
}

.subsection-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(0, 0, 0, 0.4);
  margin-bottom: 12px;
}

/* Grid */
.grid-4 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.info-card {
  padding: 16px;
  background: #f6f5f4;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}

.info-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(0, 0, 0, 0.4);
  margin-bottom: 6px;
}

.info-value {
  font-size: 18px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.95);
}

/* Model List */
.model-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 6px;
  overflow: hidden;
}

.model-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  background: #ffffff;
  transition: background 0.15s;
}

.model-item:hover {
  background: #f6f5f4;
}

.model-item.installed {
  background: rgba(26, 174, 57, 0.05);
}

.model-main {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.model-icon {
  font-size: 18px;
  line-height: 1;
  flex-shrink: 0;
}

.model-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.model-name {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.95);
}

.model-desc {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.5);
}

.model-status {
  font-size: 13px;
  font-weight: 500;
  color: #0075de;
}

/* Buttons */
.btn-primary {
  padding: 6px 14px;
  background: #0075de;
  color: #ffffff;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-primary:hover:not(:disabled) {
  background: #005bab;
}

.btn-primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-text {
  padding: 4px 8px;
  background: transparent;
  border: none;
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.5);
  cursor: pointer;
  transition: color 0.15s;
}

.btn-text:hover {
  color: rgba(0, 0, 0, 0.95);
}
</style>
