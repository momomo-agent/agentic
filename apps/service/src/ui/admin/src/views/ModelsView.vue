<template>
  <div class="models-view">
    <h1 class="page-title">模型管理</h1>

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
      <div v-if="installedModels.length === 0" class="empty">
        暂无模型，从下方选择下载
      </div>
      <div v-else class="model-list">
        <div v-for="m in installedModels" :key="m.name" class="model-item installed">
          <div class="model-info">
            <div class="model-name">{{ m.name }}</div>
            <div class="model-meta" v-if="m.size">{{ formatSize(m.size) }}</div>
          </div>
          <div class="model-actions">
            <button class="btn-use" v-if="currentModel !== m.name" @click="setAsDefault(m.name)">设为默认</button>
            <span class="badge-active" v-else>当前使用</span>
            <button class="btn-danger" @click="deleteModel(m.name)" :disabled="deleting === m.name">
              {{ deleting === m.name ? '删除中...' : '删除' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 下载进度 -->
    <div class="card" v-if="downloadProgress">
      <div class="card-title">下载中: {{ downloadProgress.model }}</div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: downloadProgress.percent + '%' }"></div>
      </div>
      <div class="progress-text">
        {{ downloadProgress.status }}
        <span v-if="downloadProgress.percent > 0">{{ downloadProgress.percent.toFixed(1) }}%</span>
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
            <button v-if="!isInstalled(m.name)"
                    @click="downloadModel(m.name)"
                    :disabled="!!downloadProgress"
                    class="btn-download">
              下载
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 自定义下载 -->
    <div class="card" v-if="ollama.running">
      <div class="card-title">自定义模型</div>
      <div class="custom-pull">
        <input v-model="customModel" placeholder="输入模型名称，如 phi4:latest" @keyup.enter="downloadModel(customModel)" />
        <button @click="downloadModel(customModel)" :disabled="!customModel.trim() || !!downloadProgress">下载</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const ollama = ref({ running: false, models: [] })
const downloadProgress = ref(null)
const deleting = ref(null)
const customModel = ref('')
const currentModel = ref('')
let timer = null

const installedModels = computed(() => {
  return ollama.value.models.map(m => typeof m === 'string' ? { name: m } : m)
})

const modelCategories = [
  {
    label: '💬 对话',
    models: [
      { name: 'gemma4:e4b', desc: 'Google 最新，多模态，本地最优选', size: '~5GB' },
      { name: 'qwen3:4b', desc: '通义千问 3，中文最强', size: '~2.6GB' },
      { name: 'llama3.2:3b', desc: 'Meta 开源，英文流畅', size: '~2GB' },
      { name: 'phi4-mini:3.8b', desc: '微软 Phi-4 Mini，推理强', size: '~2.4GB' },
    ]
  },
  {
    label: '💻 编程',
    models: [
      { name: 'qwen2.5-coder:3b', desc: '代码补全和生成', size: '~2GB' },
      { name: 'deepseek-coder-v2:lite', desc: 'DeepSeek 代码模型', size: '~9GB' },
    ]
  },
  {
    label: '👁️ 视觉',
    models: [
      { name: 'llava:7b', desc: '图片理解，多模态', size: '~4.7GB' },
      { name: 'moondream:latest', desc: '轻量视觉模型', size: '~1.7GB' },
    ]
  },
]

function isInstalled(name) {
  const base = name.split(':')[0]
  return installedModels.value.some(m => m.name === name || m.name.startsWith(base + ':'))
}

function formatSize(bytes) {
  if (!bytes) return ''
  const gb = bytes / (1024 * 1024 * 1024)
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / (1024 * 1024)).toFixed(0)} MB`
}

async function fetchStatus() {
  try {
    const res = await fetch('/api/status')
    const data = await res.json()
    ollama.value = data.ollama || { running: false, models: [] }
    // Read current model from config
    const cfg = await fetch('/api/config').then(r => r.json())
    currentModel.value = cfg.llm?.model || ''
  } catch (e) {
    console.error('fetch failed:', e)
  }
}

async function downloadModel(name) {
  if (!name?.trim()) return
  downloadProgress.value = { model: name, status: '准备中...', percent: 0 }

  try {
    const response = await fetch('/api/models/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: name })
    })

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      for (const line of decoder.decode(value).split('\n').filter(l => l.startsWith('data: '))) {
        try {
          const data = JSON.parse(line.slice(6))
          if (data.error) {
            downloadProgress.value = { ...downloadProgress.value, status: `错误: ${data.error}`, percent: 0 }
            setTimeout(() => downloadProgress.value = null, 3000)
            return
          }
          if (data.status === 'success') {
            downloadProgress.value = null
            customModel.value = ''
            await fetchStatus()
            return
          }
          // Update progress
          const percent = data.total ? (data.completed / data.total * 100) : 0
          downloadProgress.value = {
            model: name,
            status: data.status || '下载中...',
            percent: Math.min(percent, 100)
          }
        } catch { /* ignore */ }
      }
    }
    downloadProgress.value = null
    await fetchStatus()
  } catch (e) {
    downloadProgress.value = { model: name, status: `失败: ${e.message}`, percent: 0 }
    setTimeout(() => downloadProgress.value = null, 3000)
  }
}

async function deleteModel(name) {
  if (!confirm(`确定删除模型 ${name}？`)) return
  deleting.value = name
  try {
    const res = await fetch(`/api/models/${encodeURIComponent(name)}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('删除失败')
    await fetchStatus()
  } catch (e) {
    alert('删除失败: ' + e.message)
  } finally {
    deleting.value = null
  }
}

async function setAsDefault(name) {
  try {
    const cfg = await fetch('/api/config').then(r => r.json())
    cfg.llm = { ...cfg.llm, model: name }
    await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg)
    })
    currentModel.value = name
  } catch (e) {
    alert('设置失败: ' + e.message)
  }
}

onMounted(() => {
  fetchStatus()
  timer = setInterval(fetchStatus, 5000)
})
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.page-title { font-size: 28px; font-weight: 700; margin-bottom: 24px; }

.card-header { display: flex; justify-content: space-between; align-items: center; }
.ollama-status { display: flex; align-items: center; gap: 8px; font-size: 14px; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; }
.status-dot.on { background: var(--success, #10b981); }
.status-dot.off { background: var(--error, #ef4444); }

.ollama-guide { margin-top: 16px; }
.ollama-guide p { font-size: 14px; color: var(--text-dim); margin-bottom: 12px; }
.install-steps { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.step { display: flex; align-items: center; gap: 12px; font-size: 14px; }
.step-num {
  width: 24px; height: 24px; border-radius: 50%; background: var(--surface-3, #374151);
  display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; flex-shrink: 0;
}
.step code { background: var(--surface-3, #374151); padding: 2px 8px; border-radius: 4px; font-size: 13px; }
.step a { color: var(--primary, #3b82f6); }
.btn-check {
  padding: 6px 16px; border-radius: 6px; font-size: 13px;
  background: var(--surface-3, #374151); color: var(--text); border: none; cursor: pointer;
}

.empty { color: var(--text-dim); font-size: 14px; text-align: center; padding: 24px; }

.model-list { display: flex; flex-direction: column; gap: 8px; }
.model-item {
  padding: 12px 16px; border-radius: 8px; background: var(--surface-2, #1e1e1e);
  display: flex; justify-content: space-between; align-items: center; gap: 16px;
}
.model-item.installed { border: 1px solid var(--border, #333); }
.model-item.recommend { border: 1px solid transparent; }
.model-item.is-installed { opacity: 0.5; }
.model-info { flex: 1; min-width: 0; }
.model-name { font-weight: 500; font-size: 14px; display: flex; align-items: center; gap: 8px; }
.model-desc { font-size: 13px; color: var(--text-dim); margin-top: 2px; }
.model-meta { font-size: 12px; color: var(--text-dim); opacity: 0.7; margin-top: 2px; }
.model-actions { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }

.badge-installed {
  font-size: 11px; padding: 1px 6px; border-radius: 4px;
  background: rgba(16,185,129,0.15); color: var(--success, #10b981);
}
.badge-active {
  font-size: 12px; color: var(--success, #10b981); font-weight: 500;
}

button {
  padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 500;
  border: none; cursor: pointer; transition: opacity 0.15s;
}
button:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-download { background: var(--primary, #3b82f6); color: #fff; }
.btn-use { background: var(--surface-3, #374151); color: var(--text); }
.btn-danger { background: rgba(239,68,68,0.15); color: var(--error, #ef4444); }

.progress-bar {
  height: 6px; background: var(--surface-3, #374151); border-radius: 3px; overflow: hidden; margin-top: 12px;
}
.progress-fill {
  height: 100%; background: var(--primary, #3b82f6); border-radius: 3px;
  transition: width 0.3s ease;
}
.progress-text { font-size: 13px; color: var(--text-dim); margin-top: 8px; }

.model-grid { display: flex; flex-direction: column; gap: 20px; }
.category-label { font-size: 13px; font-weight: 600; color: var(--text-dim); margin-bottom: 8px; }
.model-category .model-list { gap: 6px; }

.custom-pull { display: flex; gap: 8px; }
.custom-pull input {
  flex: 1; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border, #333);
  background: var(--surface, #0a0a0a); font-size: 14px; color: var(--text);
}
.custom-pull button { background: var(--primary, #3b82f6); color: #fff; padding: 8px 20px; }
</style>
