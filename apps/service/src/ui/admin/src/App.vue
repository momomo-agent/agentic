<template>
  <div class="app">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo">⚡ Agentic Service</div>
      </div>
      
      <div class="sidebar-footer">
        <div class="status-indicator" :class="{ online }">
          <span class="status-dot"></span>
          <span class="status-text">{{ online ? 'Running' : 'Offline' }}</span>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main">
      <div class="content">
        <!-- Hero -->
        <section class="hero">
          <h1 class="hero-title">Local AI Infrastructure</h1>
          <p class="hero-subtitle">Zero-config deployment. Hardware-optimized models. Production-ready.</p>
        </section>

        <!-- Download Progress -->
        <div v-if="download.inProgress" class="alert alert-info">
          <div class="alert-header">
            <span class="alert-icon">📦</span>
            <span class="alert-title">Downloading {{ download.model }}</span>
          </div>
          <div v-if="download.total > 0" class="progress-bar">
            <div class="progress-fill" :style="{ width: downloadPercent + '%' }"></div>
          </div>
          <div class="alert-meta">
            <span>{{ download.status }}</span>
            <span v-if="download.total > 0">{{ downloadPercent }}%</span>
          </div>
        </div>

        <!-- System Overview -->
        <section class="section">
          <h2 class="section-title">System</h2>
          <div class="cards-grid">
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
        </section>

        <!-- Models -->
        <section class="section">
          <div class="section-header">
            <h2 class="section-title">Models</h2>
            <span class="section-badge">{{ ollama.models.length }} installed</span>
          </div>
          
          <!-- Installed -->
          <div v-if="ollama.models.length > 0" class="subsection">
            <h3 class="subsection-title">Installed</h3>
            <div class="model-list">
              <div v-for="m in ollama.models" :key="m" class="model-row installed">
                <span class="model-icon">✓</span>
                <span class="model-name">{{ m }}</span>
                <button class="btn-text danger" @click="deleteModel(m)">Delete</button>
              </div>
            </div>
          </div>

          <!-- Available -->
          <div class="subsection">
            <h3 class="subsection-title">Available</h3>
            <div class="model-list">
              <div v-for="m in recommended" :key="m.name" class="model-row">
                <span class="model-icon">{{ getModelIcon(m.name) }}</span>
                <div class="model-info">
                  <span class="model-name">{{ m.name }}</span>
                  <span class="model-desc">{{ m.desc }}</span>
                </div>
                <div v-if="progress[m.name]" class="model-progress">{{ progress[m.name] }}</div>
                <button v-else class="btn-primary" @click="downloadModel(m.name)" :disabled="!ollama.running">
                  Download
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- Quick Links -->
        <section class="section">
          <div class="callout">
            <div class="callout-content">
              <h3 class="callout-title">Ready to explore?</h3>
              <p class="callout-text">Try 7 interactive demos showcasing voice, vision, and chat capabilities</p>
            </div>
            <a href="/examples/" class="btn-primary">View Examples →</a>
          </div>
        </section>
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
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
}

.app {
  display: flex;
  min-height: 100vh;
  background: #ffffff;
}

/* Sidebar */
.sidebar {
  width: 240px;
  background: #f7f6f5;
  border-right: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 20px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.logo {
  font-size: 16px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.9);
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 6px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.6);
}

.status-indicator.online {
  background: rgba(26, 174, 57, 0.1);
  color: #1aae39;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

/* Main */
.main {
  flex: 1;
  overflow-y: auto;
}

.content {
  max-width: 900px;
  margin: 0 auto;
  padding: 60px 40px 100px;
}

/* Hero */
.hero {
  margin-bottom: 48px;
}

.hero-title {
  font-size: 40px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.8px;
  color: rgba(0, 0, 0, 0.9);
  margin-bottom: 8px;
}

.hero-subtitle {
  font-size: 18px;
  color: rgba(0, 0, 0, 0.5);
  line-height: 1.5;
}

/* Alert */
.alert {
  padding: 16px 20px;
  border-radius: 8px;
  margin-bottom: 32px;
}

.alert-info {
  background: #f2f9ff;
  border: 1px solid rgba(0, 117, 222, 0.15);
}

.alert-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.alert-icon {
  font-size: 20px;
}

.alert-title {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.9);
}

.progress-bar {
  height: 4px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: #0075de;
  transition: width 0.3s;
}

.alert-meta {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.5);
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
  color: rgba(0, 0, 0, 0.9);
}

.section-badge {
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.5);
}

.subsection {
  margin-bottom: 32px;
}

.subsection-title {
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(0, 0, 0, 0.4);
  margin-bottom: 12px;
}

/* Cards Grid */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.card {
  padding: 16px;
  background: #ffffff;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.card-label {
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(0, 0, 0, 0.4);
  margin-bottom: 6px;
}

.card-value {
  font-size: 20px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.9);
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

.model-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #ffffff;
  transition: background 0.15s;
}

.model-row:hover {
  background: #f7f6f5;
}

.model-row.installed {
  background: rgba(26, 174, 57, 0.05);
}

.model-icon {
  font-size: 20px;
  line-height: 1;
  flex-shrink: 0;
}

.model-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.model-name {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.9);
}

.model-desc {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.5);
}

.model-progress {
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
  transition: all 0.15s;
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
  cursor: pointer;
  color: rgba(0, 0, 0, 0.5);
  transition: color 0.15s;
}

.btn-text:hover {
  color: rgba(0, 0, 0, 0.9);
}

.btn-text.danger {
  color: #dd5b00;
}

.btn-text.danger:hover {
  color: #c04f00;
}

/* Callout */
.callout {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 24px;
  background: #f7f6f5;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.callout-content {
  flex: 1;
}

.callout-title {
  font-size: 18px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.9);
  margin-bottom: 4px;
}

.callout-text {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.5);
}
</style>
