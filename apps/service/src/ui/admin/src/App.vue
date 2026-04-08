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
        
        <div class="models">
          <!-- Installed -->
          <div class="panel">
            <div class="panel-header">
              <h4>Installed</h4>
              <span class="count">{{ ollama.models.length }}</span>
            </div>
            <div v-if="!ollama.running" class="empty">Ollama not running</div>
            <div v-else-if="ollama.models.length === 0" class="empty">No models</div>
            <div v-else class="list">
              <div v-for="m in ollama.models" :key="m" class="item installed">
                <span class="name">{{ m }}</span>
                <button class="delete" @click="deleteModel(m)">Delete</button>
              </div>
            </div>
          </div>

          <!-- Recommended -->
          <div class="panel">
            <div class="panel-header">
              <h4>Recommended</h4>
            </div>
            <div class="list">
              <div v-for="m in recommended" :key="m.name" class="item">
                <div class="info">
                  <span class="name">{{ m.name }}</span>
                  <span class="desc">{{ m.desc }}</span>
                </div>
                <div v-if="progress[m.name]" class="progress">{{ progress[m.name] }}</div>
                <button v-else class="download" @click="downloadModel(m.name)" :disabled="!ollama.running">
                  Download
                </button>
              </div>
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

const recommended = [
  { name: 'gemma2:2b', desc: 'Lightweight, fast' },
  { name: 'qwen2.5:3b', desc: 'Chinese optimized' },
  { name: 'qwen2.5-coder:3b', desc: 'Code generation' },
  { name: 'llama3.2:3b', desc: 'Meta, versatile' },
  { name: 'phi3.5:3.8b', desc: 'Code & reasoning' },
  { name: 'mistral:7b', desc: 'High quality' },
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
.models {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 32px;
}

.panel {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
  padding: 24px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.panel-header h4 {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.374px;
  color: #1d1d1f;
}

.count {
  font-size: 14px;
  color: #86868b;
}

.empty {
  padding: 48px 24px;
  text-align: center;
  font-size: 14px;
  color: #86868b;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  background: #f5f5f7;
  border-radius: 8px;
}

.item.installed {
  border: 1px solid rgba(16, 185, 129, 0.2);
  background: rgba(16, 185, 129, 0.05);
}

.item .info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item .name {
  font-size: 14px;
  font-weight: 500;
  color: #1d1d1f;
}

.item .desc {
  font-size: 12px;
  color: #86868b;
}

.item .progress {
  font-size: 12px;
  font-weight: 500;
  color: #0071e3;
}

.item button {
  padding: 6px 12px;
  border-radius: 6px;
  border: none;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.item .download {
  background: #0071e3;
  color: #ffffff;
}

.item .download:hover:not(:disabled) {
  background: #0077ed;
}

.item .download:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.item .delete {
  background: transparent;
  color: #ef4444;
}

.item .delete:hover {
  background: rgba(239, 68, 68, 0.1);
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
