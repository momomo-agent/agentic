<template>
  <div class="admin">
    <header class="header">
      <div class="header-content">
        <h1 class="logo">⚡ Agentic Service</h1>
        <div class="status-pill" :class="online ? 'online' : 'offline'">
          <span class="status-dot"></span>
          {{ online ? 'Running' : 'Offline' }}
        </div>
      </div>
    </header>

    <main class="content">
      <!-- Models Section -->
      <section class="section">
        <div class="section-header">
          <h2>Models</h2>
          <p class="section-desc">Manage your local AI models</p>
        </div>

        <!-- Background Download Progress -->
        <div v-if="backgroundDownload.inProgress" class="download-card">
          <div class="download-header">
            <div class="download-icon">📦</div>
            <div class="download-info">
              <div class="download-model">{{ backgroundDownload.model }}</div>
              <div class="download-status">{{ backgroundDownload.status }}</div>
            </div>
          </div>
          <div v-if="backgroundDownload.total > 0" class="download-progress">
            <div class="progress-track">
              <div class="progress-bar" :style="{ width: progressPercent + '%' }"></div>
            </div>
            <div class="progress-label">
              {{ formatBytes(backgroundDownload.progress) }} / {{ formatBytes(backgroundDownload.total) }}
              <span class="progress-percent">{{ progressPercent }}%</span>
            </div>
          </div>
        </div>

        <div class="models-grid">
          <!-- Installed Models -->
          <div class="models-panel">
            <h3 class="panel-title">Installed</h3>
            <div v-if="!ollama.running" class="empty-state">
              <div class="empty-icon">⚠️</div>
              <p>Ollama not running</p>
            </div>
            <div v-else-if="ollama.models.length === 0" class="empty-state">
              <div class="empty-icon">📦</div>
              <p>No models installed</p>
            </div>
            <div v-else class="model-list">
              <div v-for="m in ollama.models" :key="m" class="model-card installed">
                <div class="model-name">{{ m }}</div>
                <button class="btn-delete" @click="deleteModel(m)">Delete</button>
              </div>
            </div>
          </div>

          <!-- Recommended Models -->
          <div class="models-panel">
            <h3 class="panel-title">Recommended</h3>
            <div class="model-list">
              <div v-for="m in recommended" :key="m.name" class="model-card">
                <div class="model-info">
                  <div class="model-name">{{ m.name }}</div>
                  <div class="model-desc">{{ m.desc }}</div>
                </div>
                <div class="model-action">
                  <div v-if="downloadProgress[m.name]" class="downloading">
                    {{ downloadProgress[m.name] }}
                  </div>
                  <button v-else class="btn-download" @click="downloadModel(m.name)" :disabled="!ollama.running">
                    Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- System Info -->
      <section class="section">
        <div class="section-header">
          <h2>System</h2>
          <p class="section-desc">Hardware and runtime status</p>
        </div>
        <div class="info-grid">
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
      </section>

      <!-- Examples Link -->
      <section class="section">
        <div class="examples-card">
          <div class="examples-content">
            <h3>Ready to try?</h3>
            <p>Explore 7 interactive demos showcasing voice, vision, and chat capabilities</p>
          </div>
          <a href="/examples/" class="btn-examples">View Examples →</a>
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
const backgroundDownload = ref({ inProgress: false, model: '', status: '', progress: 0, total: 0 })

const recommended = [
  { name: 'gemma2:2b', desc: 'Lightweight, fast, low memory' },
  { name: 'qwen2.5:3b', desc: 'Chinese optimized, balanced' },
  { name: 'llama3.2:3b', desc: 'Meta open source, versatile' },
  { name: 'phi3.5:3.8b', desc: 'Microsoft, code & reasoning' },
  { name: 'mistral:7b', desc: 'High quality, needs 8GB+ RAM' },
]

const downloadProgress = ref({})

const progressPercent = computed(() => {
  if (!backgroundDownload.value.total) return 0
  return Math.round((backgroundDownload.value.progress / backgroundDownload.value.total) * 100)
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
    backgroundDownload.value = res.download || { inProgress: false, model: '', status: '', progress: 0, total: 0 }
  } catch (e) {
    console.error('fetch failed:', e)
  }
}

async function downloadModel(name) {
  downloadProgress.value[name] = 'Starting...'
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
            downloadProgress.value[name] = 'Error'
            setTimeout(() => delete downloadProgress.value[name], 3000)
            return
          }
          if (data.status === 'success') {
            downloadProgress.value[name] = '✓ Done'
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
    downloadProgress.value[name] = 'Error'
    setTimeout(() => delete downloadProgress.value[name], 3000)
  }
}

async function deleteModel(name) {
  if (!confirm(`Delete ${name}?`)) return
  try {
    await fetch(`/api/models/${encodeURIComponent(name)}`, { method: 'DELETE' })
    fetchData()
  } catch (e) {
    alert('Delete failed: ' + e.message)
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
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

<style scoped>
.admin {
  min-height: 100vh;
  background: #0a0a0a;
  color: #e5e5e5;
}

.header {
  border-bottom: 1px solid #1a1a1a;
  background: #000;
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.status-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
}

.status-pill.online {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.status-pill.offline {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 48px 32px;
}

.section {
  margin-bottom: 64px;
}

.section-header {
  margin-bottom: 24px;
}

.section-header h2 {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.section-desc {
  font-size: 14px;
  color: #737373;
  margin: 0;
}

.download-card {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(168, 85, 247, 0.05));
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

.download-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.download-icon {
  font-size: 32px;
}

.download-info {
  flex: 1;
}

.download-model {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.download-status {
  font-size: 13px;
  color: #a3a3a3;
}

.download-progress {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-track {
  height: 6px;
  background: #1a1a1a;
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #a855f7);
  transition: width 0.3s ease;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #a3a3a3;
}

.progress-percent {
  color: #6366f1;
  font-weight: 500;
}

.models-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
}

.models-panel {
  background: #0f0f0f;
  border: 1px solid #1a1a1a;
  border-radius: 12px;
  padding: 24px;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #737373;
  margin: 0 0 16px 0;
}

.empty-state {
  text-align: center;
  padding: 48px 24px;
  color: #525252;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.model-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.model-card {
  background: #1a1a1a;
  border: 1px solid #262626;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  transition: border-color 0.2s;
}

.model-card:hover {
  border-color: #404040;
}

.model-card.installed {
  border-color: rgba(34, 197, 94, 0.3);
}

.model-info {
  flex: 1;
}

.model-name {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 4px;
}

.model-desc {
  font-size: 13px;
  color: #737373;
}

.model-action {
  flex-shrink: 0;
}

.downloading {
  font-size: 13px;
  color: #6366f1;
  font-weight: 500;
}

.btn-download, .btn-delete {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-download {
  background: #6366f1;
  color: white;
}

.btn-download:hover:not(:disabled) {
  background: #5558e3;
}

.btn-download:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-delete {
  background: transparent;
  color: #ef4444;
  border: 1px solid #ef4444;
}

.btn-delete:hover {
  background: rgba(239, 68, 68, 0.1);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.info-card {
  background: #0f0f0f;
  border: 1px solid #1a1a1a;
  border-radius: 8px;
  padding: 20px;
}

.info-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #737373;
  margin-bottom: 8px;
}

.info-value {
  font-size: 18px;
  font-weight: 600;
}

.examples-card {
  background: linear-gradient(135deg, #0f0f0f, #1a1a1a);
  border: 1px solid #262626;
  border-radius: 12px;
  padding: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
}

.examples-content h3 {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.examples-content p {
  font-size: 14px;
  color: #a3a3a3;
  margin: 0;
}

.btn-examples {
  padding: 12px 24px;
  background: white;
  color: #0a0a0a;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: transform 0.2s;
}

.btn-examples:hover {
  transform: translateY(-2px);
}
</style>
