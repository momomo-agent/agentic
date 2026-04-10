<template>
  <div class="models-view">
    <h1 class="page-title">模型管理</h1>

    <!-- Tab 切换 -->
    <div class="tab-bar">
      <button class="tab-btn" :class="{ active: tab === 'local' }" @click="tab = 'local'">本地模型</button>
      <button class="tab-btn" :class="{ active: tab === 'cloud' }" @click="tab = 'cloud'">云端模型</button>
      <button class="tab-btn" :class="{ active: tab === 'config' }" @click="tab = 'config'">配置</button>
    </div>

    <!-- ==================== 本地模型 Tab ==================== -->
    <template v-if="tab === 'local'">
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

      <!-- 下载进度 (multiple simultaneous) -->
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
    </template>

    <!-- ==================== 云端模型 Tab ==================== -->
    <template v-if="tab === 'cloud'">
      <!-- 添加云端模型 -->
      <div class="card">
        <div class="card-title">添加云端模型</div>
        <div class="config-form">
          <div class="field-row">
            <div class="field">
              <label>Provider</label>
              <select v-model="newCloud.provider" @change="onProviderChange">
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="google">Google (Gemini)</option>
                <option value="groq">Groq</option>
                <option value="elevenlabs">ElevenLabs (TTS)</option>
                <option value="custom">自定义</option>
              </select>
            </div>
            <div class="field">
              <label>模型名称</label>
              <input v-model="newCloud.name" placeholder="gpt-4o, claude-sonnet-4-20250514, ..." />
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label>API Key</label>
              <input v-model="newCloud.apiKey" type="text" placeholder="sk-..." />
            </div>
            <div class="field">
              <label>Base URL <span class="hint">(可选)</span></label>
              <input v-model="newCloud.baseUrl" :placeholder="defaultBaseUrl" />
            </div>
          </div>
          <div class="field">
            <label>能力</label>
            <div class="cap-checkboxes">
              <label v-for="cap in allCaps" :key="cap" class="cap-check">
                <input type="checkbox" :value="cap" v-model="newCloud.capabilities" />
                <span>{{ cap }}</span>
              </label>
            </div>
          </div>
          <div class="actions">
            <button @click="addCloudModel" :disabled="!newCloud.name || !newCloud.apiKey">添加</button>
            <span v-if="addError" class="error-msg">{{ addError }}</span>
          </div>
        </div>
      </div>

      <!-- 已添加的云端模型 -->
      <div class="card">
        <div class="card-title">云端模型 ({{ cloudModels.length }})</div>
        <div v-if="cloudModels.length === 0" class="empty">暂无云端模型</div>
        <div v-else class="model-list">
          <div v-for="m in cloudModels" :key="m.id" class="model-item installed">
            <div class="model-info">
              <div class="model-name">
                {{ m.name }}
                <span class="provider-tag">{{ m.provider }}</span>
                <span class="cap-badge" v-for="c in (m.capabilities || [])" :key="c">{{ c }}</span>
              </div>
              <div class="model-meta" v-if="m.baseUrl">{{ m.baseUrl }}</div>
            </div>
            <div class="model-actions">
              <button class="btn-danger" @click="removeCloudModel(m.id)">删除</button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ==================== 配置 Tab ==================== -->
    <template v-if="tab === 'config'">
      <!-- 能力分配 -->
      <div class="card">
        <div class="card-title">能力分配</div>
        <p class="card-desc">为每个能力选择模型。在「本地模型」或「云端模型」中添加模型后，这里会自动出现。</p>
        <div class="slots">
          <div v-for="slot in configSlots" :key="slot.key" class="slot-row">
            <div class="slot-label">
              <span class="slot-icon">{{ slot.icon }}</span>
              <div>
                <div class="slot-name">{{ slot.name }}</div>
                <div class="slot-desc">{{ slot.desc }}</div>
              </div>
            </div>
            <select class="slot-select" :value="assignments[slot.key]" @change="updateAssignment(slot.key, $event.target.value)">
              <option value="">未分配</option>
              <option v-for="m in modelsForCap(slot.cap)" :key="m.id" :value="m.id">{{ m.name }} ({{ m.provider }})</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Ollama 设置 -->
      <div class="card">
        <div class="card-title">Ollama 设置</div>
        <div class="config-form">
          <div class="field">
            <label>Host</label>
            <input v-model="ollamaHost" placeholder="http://localhost:11434" />
          </div>
          <div class="actions">
            <button @click="saveOllamaHost" :disabled="savingHost">{{ savingHost ? '保存中...' : '保存' }}</button>
            <span v-if="hostSaved" class="saved-msg">✓ 已保存</span>
          </div>
        </div>
      </div>

      <div v-if="configError" class="error-banner">{{ configError }}</div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'

const tab = ref('local')
const allCaps = ['chat', 'vision', 'stt', 'tts', 'embedding', 'fallback']

// ─── Model Pool ───
const pool = ref([])

async function fetchPool() {
  try {
    pool.value = await (await fetch('/api/model-pool')).json()
  } catch {}
}

const cloudModels = computed(() => pool.value.filter(m => m.provider !== 'ollama'))

function getPoolCaps(id) {
  const m = pool.value.find(p => p.id === id)
  return m?.capabilities || []
}

// ─── 本地模型 ───
const ollama = reactive({ running: false, models: [] })
const installedModels = ref([])
const deleting = ref(null)
const customModel = ref('')
const downloads = reactive({})

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
]

function isInstalled(name) {
  return installedModels.value.some(m => m.name === name || m.name.startsWith(name.split(':')[0]))
}

function formatSize(bytes) {
  if (!bytes) return ''
  const gb = bytes / 1e9
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / 1e6).toFixed(0)} MB`
}

async function fetchStatus() {
  try {
    const res = await fetch('/api/status')
    const data = await res.json()
    ollama.running = data.ollama?.running ?? false
    ollama.models = data.ollama?.models ?? []
    if (ollama.running) {
      try {
        const host = data.config?.ollamaHost || data.config?.llm?.ollamaHost || 'http://localhost:11434'
        const tagsRes = await fetch(`${host}/api/tags`)
        const tags = await tagsRes.json()
        installedModels.value = tags.models || []
      } catch {
        installedModels.value = ollama.models.map(name => ({ name }))
      }
    }
  } catch (e) {
    console.error('fetchStatus failed:', e)
  }
}

async function pullModel(name) {
  if (!name || downloads[name]) return
  downloads[name] = { status: '准备中...', percent: 0 }
  try {
    const config = await (await fetch('/api/config')).json()
    const host = config?.ollamaHost || config?.llm?.ollamaHost || 'http://localhost:11434'
    const res = await fetch(`${host}/api/pull`, {
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
    const config = await (await fetch('/api/config')).json()
    const host = config?.ollamaHost || config?.llm?.ollamaHost || 'http://localhost:11434'
    await fetch(`${host}/api/delete`, {
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

// ─── 云端模型 ───
const newCloud = reactive({
  provider: 'openai',
  name: '',
  apiKey: '',
  baseUrl: '',
  capabilities: ['chat'],
})
const addError = ref('')

const defaultBaseUrl = computed(() => {
  const map = { openai: 'https://api.openai.com/v1', anthropic: 'https://api.anthropic.com', groq: 'https://api.groq.com/openai/v1', google: '', elevenlabs: 'https://api.elevenlabs.io/v1', custom: 'http://localhost:8080/v1' }
  return map[newCloud.provider] || ''
})

function onProviderChange() {
  // Auto-set capabilities based on provider
  const capMap = { elevenlabs: ['tts'], openai: ['chat'], anthropic: ['chat'], google: ['chat'], groq: ['chat'], custom: ['chat'] }
  newCloud.capabilities = capMap[newCloud.provider] || ['chat']
}

async function addCloudModel() {
  addError.value = ''
  const id = `cloud:${newCloud.provider}:${newCloud.name}`
  try {
    await fetch('/api/model-pool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        name: newCloud.name,
        provider: newCloud.provider,
        apiKey: newCloud.apiKey,
        baseUrl: newCloud.baseUrl || defaultBaseUrl.value,
        capabilities: [...newCloud.capabilities],
        source: 'user',
      }),
    })
    newCloud.name = ''
    newCloud.apiKey = ''
    newCloud.baseUrl = ''
    newCloud.capabilities = ['chat']
    await fetchPool()
  } catch (e) {
    addError.value = e.message
  }
}

async function removeCloudModel(id) {
  if (!confirm('确定删除？')) return
  try {
    await fetch(`/api/model-pool/${encodeURIComponent(id)}`, { method: 'DELETE' })
    await fetchPool()
  } catch (e) {
    alert('删除失败: ' + e.message)
  }
}

// ─── 配置 Tab ───
const configSlots = [
  { key: 'chat', cap: 'chat', icon: '🧠', name: '对话', desc: '主要对话模型' },
  { key: 'vision', cap: 'vision', icon: '👁️', name: '视觉', desc: '图像理解' },
  { key: 'stt', cap: 'stt', icon: '🎤', name: '语音识别', desc: '语音转文字' },
  { key: 'tts', cap: 'tts', icon: '🔊', name: '语音合成', desc: '文字转语音' },
  { key: 'embedding', cap: 'embedding', icon: '📐', name: '嵌入', desc: '文本向量化' },
  { key: 'fallback', cap: 'chat', icon: '🔄', name: '回退', desc: '主模型失败时使用' },
]
const assignments = reactive({ chat: '', vision: '', stt: '', tts: '', embedding: '', fallback: '' })
const ollamaHost = ref('http://localhost:11434')
const savingHost = ref(false)
const hostSaved = ref(false)
const configError = ref('')

function modelsForCap(cap) {
  return pool.value.filter(m => m.capabilities?.includes(cap))
}

async function fetchConfig() {
  try {
    const [assignRes, cfgRes] = await Promise.all([
      fetch('/api/assignments'),
      fetch('/api/config'),
    ])
    const assign = await assignRes.json()
    const cfg = await cfgRes.json()
    Object.assign(assignments, assign)
    ollamaHost.value = cfg.ollama?.host || cfg.ollamaHost || cfg.llm?.ollamaHost || 'http://localhost:11434'
  } catch (e) {
    configError.value = e.message
  }
}

async function updateAssignment(key, value) {
  assignments[key] = value
  try {
    await fetch('/api/assignments', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assignments),
    })
  } catch (e) {
    configError.value = e.message
  }
}

async function saveOllamaHost() {
  savingHost.value = true
  try {
    const res = await fetch('/api/config')
    const cfg = await res.json()
    cfg.ollama = cfg.ollama || {}
    cfg.ollama.host = ollamaHost.value
    await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
    })
    hostSaved.value = true
    setTimeout(() => (hostSaved.value = false), 2000)
  } catch (e) {
    configError.value = e.message
  } finally {
    savingHost.value = false
  }
}

// ─── 初始化 ───
onMounted(() => {
  fetchStatus()
  fetchPool()
  fetchConfig()
})
</script>

<style scoped>
.page-title { font-size: 28px; font-weight: 700; margin-bottom: 24px; }

/* Tab bar */
.tab-bar {
  display: flex; gap: 4px; margin-bottom: 20px;
  background: var(--surface-2); border-radius: 8px; padding: 4px;
}
.tab-btn {
  flex: 1; padding: 10px 0; border: none; border-radius: 6px;
  font-size: 14px; font-weight: 600; cursor: pointer;
  background: transparent; color: var(--text-dim);
  transition: all 0.15s;
}
.tab-btn.active {
  background: var(--surface); color: var(--text);
  box-shadow: var(--shadow-sm);
}

/* Cards */
.card { margin-bottom: 16px; padding: 20px; border-radius: 10px; background: var(--surface); border: 1px solid var(--border); }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.card-title { font-size: 14px; font-weight: 600; color: var(--text-dim); margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.3px; }
.card-header .card-title { margin-bottom: 0; }

/* Ollama status */
.ollama-status { display: flex; align-items: center; gap: 8px; font-size: 14px; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; }
.status-dot.on { background: var(--success, #10b981); box-shadow: 0 0 6px var(--success, #10b981); }
.status-dot.off { background: var(--error, #ef4444); }

.ollama-guide { font-size: 14px; color: var(--text-dim); }
.ollama-guide p { margin-bottom: 12px; }
.install-steps { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.step { display: flex; align-items: center; gap: 10px; }
.step-num {
  width: 22px; height: 22px; border-radius: 50%; background: var(--surface-3);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; flex-shrink: 0;
}
.step code { background: var(--surface-3); padding: 2px 6px; border-radius: 4px; font-size: 13px; }
.btn-check {
  padding: 8px 16px; border-radius: 6px; border: 1px solid var(--border);
  background: var(--surface-2); cursor: pointer; font-size: 13px;
}

/* Model list */
.model-list { display: flex; flex-direction: column; gap: 8px; }
.model-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 16px; border-radius: 8px; background: var(--surface-2);
}
.model-info { flex: 1; min-width: 0; }
.model-name { font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.model-desc { font-size: 13px; color: var(--text-dim); margin-top: 2px; }
.model-meta { font-size: 12px; color: var(--text-dim); opacity: 0.7; margin-top: 2px; }
.model-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; margin-left: 12px; }

.badge-installed {
  font-size: 11px; padding: 2px 8px; border-radius: 10px;
  background: rgba(16,185,129,0.12); color: var(--success, #10b981); font-weight: 500;
}

/* Capability badges */
.cap-badge {
  font-size: 10px; padding: 2px 7px; border-radius: 10px;
  background: rgba(59,130,246,0.12); color: var(--primary, #3b82f6);
  font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px;
}
.provider-tag {
  font-size: 10px; padding: 2px 7px; border-radius: 10px;
  background: rgba(168,85,247,0.12); color: #a855f7;
  font-weight: 600; text-transform: uppercase;
}

/* Download progress */
.download-item { margin-bottom: 12px; }
.download-name { font-size: 13px; font-weight: 600; margin-bottom: 6px; }
.progress-bar {
  height: 6px; border-radius: 3px; background: var(--surface-3); overflow: hidden;
}
.progress-fill {
  height: 100%; border-radius: 3px; background: var(--primary, #3b82f6);
  transition: width 0.3s;
}
.progress-text { font-size: 12px; color: var(--text-dim); margin-top: 4px; }

/* Buttons */
.btn-download {
  padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 500;
  background: var(--primary, #3b82f6); color: #fff; border: none; cursor: pointer;
}
.btn-download:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-danger {
  padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 500;
  background: rgba(239,68,68,0.1); color: var(--error, #ef4444); border: none; cursor: pointer;
}
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }

/* Model grid */
.model-grid { display: flex; flex-direction: column; gap: 20px; }
.category-label { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
.model-item.recommend { background: var(--surface-2); }
.model-item.is-installed { opacity: 0.6; }

/* Custom pull */
.custom-pull { display: flex; gap: 8px; }
.custom-pull input {
  flex: 1; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border);
  background: var(--surface-2); font-size: 14px; color: var(--text);
}
.custom-pull button {
  padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600;
  background: var(--primary, #3b82f6); color: #fff; border: none; cursor: pointer;
}
.custom-pull button:disabled { opacity: 0.5; cursor: not-allowed; }

/* Cloud form */
.config-form { display: flex; flex-direction: column; gap: 14px; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 13px; color: var(--text-dim); font-weight: 500; }
.field input, .field select {
  padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border);
  background: var(--surface-2); font-size: 14px; color: var(--text);
}
.field input::placeholder { color: var(--text-dim); opacity: 0.5; }
.hint { font-weight: 400; opacity: 0.6; font-size: 12px; }

.cap-checkboxes { display: flex; gap: 12px; flex-wrap: wrap; }
.cap-check { display: flex; align-items: center; gap: 4px; font-size: 13px; cursor: pointer; }
.cap-check input { accent-color: var(--primary); }

.actions { display: flex; align-items: center; gap: 16px; padding-top: 8px; }
.actions button {
  padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;
  background: var(--primary, #0075de); color: #fff; border: none; cursor: pointer;
}
.actions button:disabled { opacity: 0.5; cursor: not-allowed; }
.error-msg { color: var(--error, #ef4444); font-size: 14px; }
.empty { color: var(--text-dim); font-size: 14px; padding: 12px 0; }

/* Config tab */
.card-desc { font-size: 13px; color: var(--text-dim); margin-bottom: 16px; }
.slots { display: flex; flex-direction: column; gap: 12px; }
.slot-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-radius: 8px; background: var(--surface-2);
  border: 1px solid var(--border);
}
.slot-label { display: flex; align-items: center; gap: 12px; }
.slot-icon { font-size: 20px; }
.slot-name { font-size: 14px; font-weight: 600; }
.slot-desc { font-size: 12px; color: var(--text-dim); }
.slot-select {
  min-width: 240px; padding: 8px 12px; border-radius: 6px;
  border: 1px solid var(--border); background: var(--surface-2);
  font-size: 14px; color: var(--text);
}
.saved-msg { color: var(--success, #10b981); font-size: 14px; }
.error-banner {
  margin-top: 16px; padding: 12px 16px; border-radius: 8px;
  background: rgba(239,68,68,0.1); color: var(--error, #ef4444); font-size: 14px;
}
</style>
