<template>
  <div class="app">
    <!-- Topbar -->
    <header class="topbar">
      <div class="topbar-content">
        <div class="brand">
          <div class="brand-icon">⚡</div>
          <div class="brand-text">
            <div class="brand-name">Agentic Service</div>
            <div class="brand-status" :class="{ online }">
              <span class="status-dot"></span>
              {{ online ? 'Running' : 'Offline' }}
            </div>
          </div>
        </div>
        <a href="/examples/" class="btn-examples">Examples →</a>
      </div>
    </header>

    <!-- Main -->
    <main class="main">
      <!-- Hero -->
      <section class="hero">
        <div class="hero-badge">Local AI Infrastructure</div>
        <h1 class="hero-title">Zero-config deployment.<br>Production-ready.</h1>
      </section>

      <!-- Download Alert -->
      <div v-if="download.inProgress" class="alert">
        <div class="alert-content">
          <div class="alert-icon">📦</div>
          <div class="alert-body">
            <div class="alert-title">Downloading {{ download.model }}</div>
            <div class="alert-subtitle">{{ download.status }}</div>
          </div>
        </div>
        <div v-if="download.total > 0" class="alert-progress">
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: downloadPercent + '%' }"></div>
          </div>
          <div class="progress-label">{{ downloadPercent }}%</div>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Platform</div>
          <div class="stat-value">{{ hardware.platform || '—' }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Architecture</div>
          <div class="stat-value">{{ hardware.arch || '—' }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Memory</div>
          <div class="stat-value">{{ hardware.memory || '—' }} GB</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">GPU</div>
          <div class="stat-value">{{ formatGPU(hardware.gpu) }}</div>
        </div>
      </div>

      <!-- Models Section -->
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">Models</h2>
          <div class="section-badge">{{ ollama.models.length }} installed</div>
        </div>

        <!-- Installed Models -->
        <div v-if="ollama.models.length > 0" class="model-group">
          <h3 class="group-title">Installed</h3>
          <div class="model-grid">
            <div v-for="m in ollama.models" :key="m" class="model-card installed">
              <div class="model-header">
                <span class="model-icon">✓</span>
                <span class="model-name">{{ m }}</span>
              </div>
              <button class="btn-secondary small" @click="deleteModel(m)">Delete</button>
            </div>
          </div>
        </div>

        <!-- Available Models -->
        <div class="model-group">
          <h3 class="group-title">Available</h3>
          <div class="model-grid">
            <div v-for="m in recommended" :key="m.name" class="model-card">
              <div class="model-header">
                <span class="model-icon">{{ getModelIcon(m.name) }}</span>
                <div class="model-info">
                  <span class="model-name">{{ m.name }}</span>
                  <span class="model-desc">{{ m.desc }}</span>
                </div>
              </div>
              <div v-if="progress[m.name]" class="model-progress">{{ progress[m.name] }}</div>
              <button v-else class="btn-primary small" @click="downloadModel(m.name)" :disabled="!ollama.running">
                Download
              </button>
            </div>
          </div>
        </div>
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
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  background: #fafafa;
}

.app {
  min-height: 100vh;
}

/* Topbar */
.topbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.topbar-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 32px;
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
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-name {
  font-size: 15px;
  font-weight: 600;
  color: #18181b;
}

.brand-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #71717a;
}

.brand-status.online {
  color: #10b981;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.btn-examples {
  padding: 8px 16px;
  background: #18181b;
  color: #ffffff;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s;
}

.btn-examples:hover {
  background: #27272a;
  transform: translateY(-1px);
}

/* Main */
.main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 48px 32px 100px;
}

/* Hero */
.hero {
  text-align: center;
  margin-bottom: 64px;
}

.hero-badge {
  display: inline-block;
  padding: 6px 12px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: #667eea;
  margin-bottom: 20px;
}

.hero-title {
  font-size: 48px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -1px;
  color: #18181b;
  background: linear-gradient(135deg, #18181b 0%, #52525b 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Alert */
.alert {
  padding: 20px 24px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05));
  border: 1px solid rgba(102, 126, 234, 0.15);
  border-radius: 12px;
  margin-bottom: 32px;
}

.alert-content {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.alert-icon {
  font-size: 24px;
}

.alert-body {
  flex: 1;
}

.alert-title {
  font-size: 15px;
  font-weight: 600;
  color: #18181b;
  margin-bottom: 4px;
}

.alert-subtitle {
  font-size: 13px;
  color: #71717a;
}

.alert-progress {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-track {
  flex: 1;
  height: 6px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s;
}

.progress-label {
  font-size: 13px;
  font-weight: 600;
  color: #667eea;
  min-width: 40px;
  text-align: right;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-bottom: 48px;
}

.stat-card {
  padding: 20px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  transition: all 0.2s;
}

.stat-card:hover {
  border-color: rgba(102, 126, 234, 0.3);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.08);
  transform: translateY(-2px);
}

.stat-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #71717a;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #18181b;
}

/* Section */
.section {
  margin-bottom: 48px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.section-title {
  font-size: 28px;
  font-weight: 700;
  color: #18181b;
}

.section-badge {
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  color: #71717a;
}

/* Model Group */
.model-group {
  margin-bottom: 32px;
}

.group-title {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #71717a;
  margin-bottom: 16px;
}

.model-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
}

.model-card {
  padding: 16px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  transition: all 0.2s;
}

.model-card:hover {
  border-color: rgba(102, 126, 234, 0.3);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.08);
}

.model-card.installed {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(5, 150, 105, 0.05));
  border-color: rgba(16, 185, 129, 0.3);
}

.model-header {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.model-icon {
  font-size: 20px;
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
  color: #18181b;
}

.model-desc {
  font-size: 12px;
  color: #71717a;
}

.model-progress {
  font-size: 13px;
  font-weight: 600;
  color: #667eea;
}

/* Buttons */
.btn-primary {
  padding: 8px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary.small {
  padding: 6px 12px;
  font-size: 13px;
}

.btn-secondary {
  padding: 8px 16px;
  background: transparent;
  color: #71717a;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  color: #18181b;
  border-color: rgba(0, 0, 0, 0.2);
}

.btn-secondary.small {
  padding: 6px 12px;
  font-size: 13px;
}
</style>
