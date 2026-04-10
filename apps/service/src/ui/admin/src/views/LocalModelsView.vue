<template>
  <div class="local-models-view">
    <h1 class="page-title">本地模型</h1>

    <!-- Ollama 状态 -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">Ollama</div>
        <div class="ollama-status">
          <div class="status-dot" :class="ollama.running ? 'on' : 'off'"></div>
          <span>{{ ollama.running ? '运行中' : '未运行' }}</span>
        </div>
      </div>
      <div v-if="!ollama.running" class="ollama-guide">
        <p>Ollama 未运行。请先安装并启动：</p>
        <div class="install-steps">
          <div class="step">
            <span class="step-num">1</span>
            <span>访问 <a href="https://ollama.com/download" target="_blank">ollama.com/download</a> 下载安装</span>
          </div>
          <div class="step">
            <span class="step-num">2</span>
            <span>安装后运行 <code>ollama serve</code> 启动服务</span>
          </div>
        </div>
        <button class="btn-check" @click="fetchStatus">🔄 重新检测</button>
      </div>
    </div>

    <!-- 已安装模型 -->
    <div class="card" v-if="ollama.running">
      <div class="card-title">已安装 ({{ installedModels.length }})</div>
      <div v-if="installedModels.length === 0" class="empty">暂无模型，从下方选择下载</div>
      <div v-else class="model-list">
        <div v-for="m in installedModels" :key="m.name" class="model-item installed">
          <div class="model-info">
            <div class="model-name">
              {{ m.name }}
              <span class="cap-badge" v-for="c in getPoolCaps(`ollama:${m.name}`)" :key="c">{{ c }}</span>
            </div>
            <div class="model-meta" v-if="m.size">{{ formatSize(m.size) }}</div>
          </div>
          <div class="model-actions">
            <button class="btn-danger" @click="deleteModel(m.name)" :disabled="deleting === m.name">
              {{ deleting === m.name ? '删除中...' : '删除' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 下载进度 -->
    <div class="card" v-if="Object.keys(downloads).length > 0">
      <div class="card-title">下载中</div>
      <div v-for="(dl, name) in downloads" :key="name" class="download-item">
        <div class="download-name">{{ name }}</div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: dl.percent + '%' }"></div>
        </div>
        <div class="progress-text">{{ dl.status }} <span v-if="dl.percent > 0">{{ dl.percent.toFixed(1) }}%</span></div>
      </div>
    </div>

    <!-- 推荐模型 -->
    <div class="card" v-if="ollama.running">
      <div class="card-title">推荐模型</div>
      <div class="model-grid">
        <div v-for="cat in modelCategories" :key="cat.label" class="model-category">
          <div class="category-label">{{ cat.label }}</div>
          <div v-for="m in cat.models" :key="m.name" class="model-item recommend"
               :class="{ 'is-installed': isInstalled(m.name) }">
            <div class="model-info">
              <div class="model-name">
                {{ m.name }}
                <span class="badge-installed" v-if="isInstalled(m.name)">已安装</span>
              </div>
              <div class="model-desc">{{ m.desc }}</div>
              <div class="model-meta">{{ m.size }}</div>
            </div>
            <button v-if="!isInstalled(m.name)" class="btn-download" @click="pullModel(m.name)"
                    :disabled="!!downloads[m.name]">下载</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 自定义下载 -->
    <div class="card" v-if="ollama.running">
      <div class="card-title">自定义下载</div>
      <div class="custom-pull">
        <input v-model="customModel" placeholder="模型名称，如 llama3:8b" @keyup.enter="pullModel(customModel)" />
        <button @click="pullModel(customModel)" :disabled="!customModel || !!downloads[customModel]">下载</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'

const ollama = reactive({ running: false, models: [] })
const installedModels = ref([])
const deleting = ref(null)
const customModel = ref('')
const downloads = reactive({})
const pool = ref([])

const modelCategories = [
  { label: '💬 对话', models: [
    { name: 'gemma4:e4b', desc: 'Google Gemma 4 — 高效多模态', size: '~5 GB' },
    { name: 'gemma3:4b', desc: 'Google Gemma 3 — 轻量快速', size: '~3 GB' },
    { name: 'llama3.2:3b', desc: 'Meta Llama 3.2 — 均衡之选', size: '~2 GB' },
    { name: 'qwen2.5:3b', desc: '通义千问 2.5 — 中文优化', size: '~2 GB' },
    { name: 'phi3:mini', desc: 'Microsoft Phi-3 — 超轻量', size: '~2.3 GB' },
  ]},
  { label: '👁 视觉', models: [
    { name: 'gemma4:e4b', desc: '多模态 — 支持图像理解', size: '~5 GB' },
    { name: 'llava:7b', desc: 'LLaVA — 图像问答', size: '~4.7 GB' },
    { name: 'moondream:latest', desc: 'Moondream — 轻量视觉', size: '~1.7 GB' },
  ]},
  { label: '💻 代码', models: [
    { name: 'qwen2.5-coder:3b', desc: '通义千问 Coder — 代码生成', size: '~2 GB' },
    { name: 'codellama:7b', desc: 'Code Llama — Meta 代码模型', size: '~3.8 GB' },
  ]},
  { label: '🎤 语音识别 (STT)', models: [
    { name: 'whisper:base', desc: 'OpenAI Whisper — 多语言语音识别', size: '~150 MB' },
    { name: 'whisper:small', desc: 'OpenAI Whisper — 更高精度', size: '~500 MB' },
    { name: 'whisper:medium', desc: 'OpenAI Whisper — 高精度', size: '~1.5 GB' },
  ]},
  { label: '🔊 语音合成 (TTS)', models: [
    { name: 'kokoro', desc: 'Kokoro — 高质量多语言 TTS', size: '~400 MB' },
    { name: 'orpheus', desc: 'Orpheus — 自然语音合成', size: '~2.5 GB' },
  ]},
]

function getPoolCaps(id) {
  return pool.value.find(p => p.id === id)?.capabilities || []
}

function isInstalled(name) {
  return installedModels.value.some(m => m.name === name)
}

function formatSize(bytes) {
  if (!bytes) return ''
  const gb = bytes / 1e9
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / 1e6).toFixed(0)} MB`
}

async function fetchPool() {
  try { pool.value = await (await fetch('/api/model-pool')).json() } catch {}
}

async function fetchStatus() {
  try {
    const res = await fetch('/api/status')
    const data = await res.json()
    ollama.running = data.ollama?.running ?? false
    ollama.models = data.ollama?.models ?? []
    if (ollama.running) {
      try {
        const tags = await (await fetch('/api/ollama/tags')).json()
        installedModels.value = tags.models || []
      } catch {
        installedModels.value = ollama.models.map(name => ({ name }))
      }
    }
  } catch {}
}

async function pullModel(name) {
  if (!name || downloads[name]) return
  downloads[name] = { status: '准备中...', percent: 0 }
  try {
    const res = await fetch('/api/ollama/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, stream: true }),
    })
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop()
      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const j = JSON.parse(line)
          downloads[name] = {
            status: j.status || '',
            percent: j.total ? (j.completed / j.total) * 100 : (downloads[name]?.percent || 0),
          }
        } catch {}
      }
    }
    delete downloads[name]
    customModel.value = ''
    await fetchStatus()
    await fetchPool()
  } catch (e) {
    delete downloads[name]
    alert('下载失败: ' + e.message)
  }
}

async function deleteModel(name) {
  if (!confirm(`确定删除 ${name}？`)) return
  deleting.value = name
  try {
    await fetch('/api/ollama/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    await fetchStatus()
    await fetchPool()
  } catch (e) {
    alert('删除失败: ' + e.message)
  } finally {
    deleting.value = null
  }
}

onMounted(() => { fetchStatus(); fetchPool() })
</script>

<style scoped>
.local-models-view { max-width: 900px; }
.page-title { font-size: 22px; font-weight: 700; margin-bottom: 24px; }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
.card-header { display: flex; align-items: center; justify-content: space-between; }
.card-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
.ollama-status { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; }
.status-dot.on { background: var(--success, #10b981); }
.status-dot.off { background: var(--error, #ef4444); }
.ollama-guide { margin-top: 12px; font-size: 14px; color: var(--text-dim); }
.install-steps { margin: 12px 0; display: flex; flex-direction: column; gap: 8px; }
.step { display: flex; align-items: center; gap: 10px; }
.step-num { width: 24px; height: 24px; border-radius: 50%; background: var(--primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
.btn-check { margin-top: 12px; padding: 8px 16px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface-2); cursor: pointer; font-size: 13px; color: var(--text); }
.model-list { display: flex; flex-direction: column; gap: 8px; }
.model-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border); }
.model-item.installed { background: var(--surface-2); }
.model-item.recommend { background: var(--surface); }
.model-item.is-installed { opacity: 0.6; }
.model-info { flex: 1; min-width: 0; }
.model-name { font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.model-desc { font-size: 13px; color: var(--text-dim); margin-top: 2px; }
.model-meta { font-size: 12px; color: var(--text-dim); opacity: 0.7; margin-top: 2px; }
.model-actions { flex-shrink: 0; margin-left: 12px; }
.cap-badge { font-size: 11px; padding: 2px 8px; border-radius: 99px; background: rgba(0,117,222,0.1); color: var(--primary); font-weight: 500; }
.badge-installed { font-size: 11px; padding: 2px 8px; border-radius: 99px; background: rgba(16,185,129,0.1); color: var(--success, #10b981); font-weight: 500; }
.btn-danger { padding: 6px 14px; border-radius: 6px; border: none; background: rgba(239,68,68,0.1); color: var(--error, #ef4444); cursor: pointer; font-size: 13px; font-weight: 500; }
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-download { padding: 6px 14px; border-radius: 6px; border: none; background: var(--primary); color: #fff; cursor: pointer; font-size: 13px; font-weight: 500; flex-shrink: 0; }
.btn-download:disabled { opacity: 0.5; cursor: not-allowed; }
.download-item { padding: 12px 0; }
.download-name { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
.progress-bar { height: 6px; border-radius: 3px; background: var(--surface-2); overflow: hidden; }
.progress-fill { height: 100%; border-radius: 3px; background: var(--primary); transition: width 0.3s; }
.progress-text { font-size: 12px; color: var(--text-dim); margin-top: 4px; }
.model-grid { display: flex; flex-direction: column; gap: 20px; }
.model-category { display: flex; flex-direction: column; gap: 8px; }
.category-label { font-size: 14px; font-weight: 600; color: var(--text-dim); }
.custom-pull { display: flex; gap: 8px; }
.custom-pull input { flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface-2); font-size: 14px; color: var(--text); }
.custom-pull button { padding: 10px 20px; border-radius: 8px; border: none; background: var(--primary); color: #fff; cursor: pointer; font-size: 14px; font-weight: 600; }
.custom-pull button:disabled { opacity: 0.5; cursor: not-allowed; }
.empty { color: var(--text-dim); font-size: 14px; padding: 12px 0; }
</style>
