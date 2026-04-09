<template>
  <div class="models-view">
    <h1 class="page-title">模型管理</h1>

    <!-- Tab 切换 -->
    <div class="tab-bar">
      <button class="tab-btn" :class="{ active: tab === 'local' }" @click="tab = 'local'">本地模型</button>
      <button class="tab-btn" :class="{ active: tab === 'cloud' }" @click="tab = 'cloud'">云端模型</button>
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
              <button v-if="!isInstalled(m.name)" class="btn-download" @click="pullModel(m.name)"
                      :disabled="!!downloadProgress">下载</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 自定义下载 -->
      <div class="card" v-if="ollama.running">
        <div class="card-title">自定义下载</div>
        <div class="custom-pull">
          <input v-model="customModel" placeholder="模型名称，如 llama3:8b" @keyup.enter="pullModel(customModel)" />
          <button @click="pullModel(customModel)" :disabled="!customModel || !!downloadProgress">下载</button>
        </div>
      </div>
    </template>

    <!-- ==================== 云端模型 Tab ==================== -->
    <template v-if="tab === 'cloud'">
      <div class="provider-grid">
        <div v-for="p in providerList" :key="p.id" class="card provider-card">
          <div class="card-header">
            <div class="provider-title">
              <span class="provider-logo">{{ p.logo }}</span>
              <span>{{ p.label }}</span>
            </div>
            <div class="provider-status">
              <label class="toggle">
                <input type="checkbox" v-model="providers[p.id].enabled" />
                <span class="toggle-label">{{ providers[p.id].enabled ? '已启用' : '未启用' }}</span>
              </label>
            </div>
          </div>

          <div class="config-form" v-if="providers[p.id].enabled">
            <!-- 自定义 provider 需要名称 -->
            <div class="field" v-if="p.id === 'custom'">
              <label>名称</label>
              <input v-model="providers[p.id].name" placeholder="My Provider" />
            </div>
            <div class="field">
              <label>API Key</label>
              <input v-model="providers[p.id].apiKey" type="text" :placeholder="p.keyPlaceholder" />
            </div>
            <div class="field" v-if="p.showBaseUrl">
              <label>Base URL <span v-if="p.id !== 'custom'" class="hint">(可选)</span></label>
              <input v-model="providers[p.id].baseUrl" :placeholder="p.defaultBaseUrl" />
            </div>
            <div class="provider-actions">
              <button class="btn-test" @click="testProvider(p.id)" :disabled="testing === p.id || !providers[p.id].apiKey">
                {{ testing === p.id ? '测试中...' : '测试连接' }}
              </button>
              <span v-if="testResults[p.id] === 'ok'" class="test-ok">✓ 已连接</span>
              <span v-else-if="testResults[p.id] === 'fail'" class="test-fail">✗ 连接失败</span>
              <span v-else-if="!testResults[p.id]" class="test-untested"></span>
            </div>
          </div>
        </div>
      </div>

      <!-- 保存按钮 -->
      <div class="actions">
        <button @click="saveProviders" :disabled="savingProviders">{{ savingProviders ? '保存中...' : '保存' }}</button>
        <span v-if="providersSaved" class="saved-msg">✓ 已保存</span>
        <span v-if="providersError" class="error-msg">{{ providersError }}</span>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'

const tab = ref('local')

// ─── 本地模型 (原有逻辑) ───
const ollama = reactive({ running: false, models: [] })
const installedModels = ref([])
const currentModel = ref('')
const downloadProgress = ref(null)
const deleting = ref(null)
const customModel = ref('')

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
    currentModel.value = data.config?.llm?.model || ''
    if (data.download?.active) {
      downloadProgress.value = data.download
    }
    // 获取详细模型信息
    if (ollama.running) {
      try {
        const host = data.config?.llm?.ollamaHost || 'http://localhost:11434'
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
  if (!name) return
  downloadProgress.value = { model: name, status: '准备中...', percent: 0 }
  try {
    const config = await (await fetch('/api/config')).json()
    const host = config?.llm?.ollamaHost || 'http://localhost:11434'
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
          downloadProgress.value = {
            model: name,
            status: j.status || '',
            percent: j.total ? (j.completed / j.total) * 100 : downloadProgress.value.percent,
          }
        } catch {}
      }
    }
    downloadProgress.value = null
    customModel.value = ''
    await fetchStatus()
  } catch (e) {
    downloadProgress.value = null
    alert('下载失败: ' + e.message)
  }
}

async function deleteModel(name) {
  if (!confirm(`确定删除 ${name}？`)) return
  deleting.value = name
  try {
    const config = await (await fetch('/api/config')).json()
    const host = config?.llm?.ollamaHost || 'http://localhost:11434'
    await fetch(`${host}/api/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    await fetchStatus()
  } catch (e) {
    alert('删除失败: ' + e.message)
  } finally {
    deleting.value = null
  }
}

async function setAsDefault(name) {
  try {
    const config = await (await fetch('/api/config')).json()
    config.llm = { ...config.llm, model: name }
    await fetch('/api/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) })
    currentModel.value = name
  } catch (e) {
    alert('设置失败: ' + e.message)
  }
}

// ─── 云端模型 ───
const providerList = [
  { id: 'openai', label: 'OpenAI', logo: '⬡', keyPlaceholder: 'sk-...', showBaseUrl: true, defaultBaseUrl: 'https://api.openai.com/v1' },
  { id: 'anthropic', label: 'Anthropic', logo: '◈', keyPlaceholder: 'sk-ant-...', showBaseUrl: true, defaultBaseUrl: 'https://api.anthropic.com' },
  { id: 'google', label: 'Google (Gemini)', logo: '◆', keyPlaceholder: 'AIza...', showBaseUrl: false, defaultBaseUrl: '' },
  { id: 'groq', label: 'Groq', logo: '⚡', keyPlaceholder: 'gsk_...', showBaseUrl: true, defaultBaseUrl: 'https://api.groq.com/openai/v1' },
  { id: 'custom', label: '自定义 OpenAI 兼容', logo: '🔧', keyPlaceholder: 'API Key', showBaseUrl: true, defaultBaseUrl: 'http://localhost:8080/v1' },
]

const providers = reactive({
  openai: { apiKey: '', baseUrl: '', enabled: false },
  anthropic: { apiKey: '', baseUrl: '', enabled: false },
  google: { apiKey: '', baseUrl: '', enabled: false },
  groq: { apiKey: '', baseUrl: '', enabled: false },
  custom: { apiKey: '', baseUrl: '', enabled: false, name: '' },
})

const testing = ref(null)
const testResults = reactive({})
const savingProviders = ref(false)
const providersSaved = ref(false)
const providersError = ref('')

async function loadProviders() {
  try {
    const config = await (await fetch('/api/config')).json()
    if (config.providers) {
      for (const [id, val] of Object.entries(config.providers)) {
        if (providers[id]) {
          Object.assign(providers[id], val)
        }
      }
    }
  } catch {}
}

async function testProvider(id) {
  testing.value = id
  delete testResults[id]
  try {
    // 先保存当前配置
    await saveProviders(true)
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'say ok', history: [] }),
    })
    testResults[id] = res.ok ? 'ok' : 'fail'
  } catch {
    testResults[id] = 'fail'
  } finally {
    testing.value = null
  }
}

async function saveProviders(silent = false) {
  savingProviders.value = true
  providersError.value = ''
  try {
    const config = await (await fetch('/api/config')).json()
    // 构建 providers 对象，只保存有意义的字段
    const clean = {}
    for (const [id, val] of Object.entries(providers)) {
      clean[id] = { enabled: val.enabled }
      if (val.apiKey) clean[id].apiKey = val.apiKey
      if (val.baseUrl) clean[id].baseUrl = val.baseUrl
      if (val.name) clean[id].name = val.name
    }
    config.providers = clean
    await fetch('/api/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) })
    if (!silent) {
      providersSaved.value = true
      setTimeout(() => providersSaved.value = false, 2000)
    }
  } catch (e) {
    providersError.value = e.message
  } finally {
    savingProviders.value = false
  }
}

// ─── 初始化 ───
onMounted(() => {
  fetchStatus()
  loadProviders()
  // 轮询下载进度
  const timer = setInterval(async () => {
    if (downloadProgress.value) {
      try {
        const res = await fetch('/api/status')
        const data = await res.json()
        if (data.download?.active) {
          downloadProgress.value = data.download
        } else if (downloadProgress.value) {
          downloadProgress.value = null
          await fetchStatus()
        }
      } catch {}
    }
  }, 2000)
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

.ollama-guide { margin-top: 16px; font-size: 14px; color: var(--text-dim); }
.install-steps { margin: 12px 0; display: flex; flex-direction: column; gap: 8px; }
.step { display: flex; align-items: center; gap: 10px; }
.step-num {
  width: 22px; height: 22px; border-radius: 50%; background: var(--surface-3);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 600; flex-shrink: 0;
}
.step code { background: var(--surface-3); padding: 2px 6px; border-radius: 4px; font-size: 13px; }
.btn-check {
  margin-top: 12px; padding: 8px 16px; border-radius: 6px; border: none;
  background: var(--surface-3); color: var(--text); font-size: 13px; cursor: pointer;
}

/* Model list */
.model-list { display: flex; flex-direction: column; gap: 8px; }
.model-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-radius: 8px; }
.model-item.installed { background: var(--surface-2); }
.model-item.recommend { background: var(--surface-2); }
.model-item.is-installed { opacity: 0.6; }
.model-info { flex: 1; min-width: 0; }
.model-name { font-size: 14px; font-weight: 600; }
.model-desc { font-size: 13px; color: var(--text-dim); margin-top: 2px; }
.model-meta { font-size: 12px; color: var(--text-dim); opacity: 0.7; margin-top: 2px; }
.model-actions { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }
.empty { font-size: 14px; color: var(--text-dim); padding: 12px 0; }

.badge-installed {
  font-size: 11px; padding: 1px 6px; border-radius: 4px;
  background: rgba(16,185,129,0.15); color: var(--success, #10b981);
}
.badge-active { font-size: 12px; color: var(--success, #10b981); font-weight: 500; }

button {
  padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 500;
  border: none; cursor: pointer; transition: opacity 0.15s;
}
button:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-download { background: var(--primary, #3b82f6); color: #fff; }
.btn-use { background: var(--surface-3, #374151); color: var(--text); }
.btn-danger { background: rgba(239,68,68,0.15); color: var(--error, #ef4444); }

.progress-bar { height: 6px; background: var(--surface-3); border-radius: 3px; overflow: hidden; margin-top: 12px; }
.progress-fill { height: 100%; background: var(--primary, #3b82f6); border-radius: 3px; transition: width 0.3s ease; }
.progress-text { font-size: 13px; color: var(--text-dim); margin-top: 8px; }

.model-grid { display: flex; flex-direction: column; gap: 20px; }
.category-label { font-size: 13px; font-weight: 600; color: var(--text-dim); margin-bottom: 8px; }

.custom-pull { display: flex; gap: 8px; }
.custom-pull input {
  flex: 1; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border);
  background: var(--surface-2); font-size: 14px; color: var(--text);
}
.custom-pull button { background: var(--primary, #3b82f6); color: #fff; padding: 8px 20px; }

/* ─── 云端 Provider 卡片 ─── */
.provider-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.provider-card { background: var(--surface-2); }
.provider-card .card-header { margin-bottom: 16px; }
.provider-title { display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 600; }
.provider-logo { font-size: 20px; }

.toggle { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; }
.toggle input { accent-color: var(--primary); width: 16px; height: 16px; cursor: pointer; }
.toggle-label { color: var(--text-dim); }

.config-form { display: flex; flex-direction: column; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 13px; color: var(--text-dim); font-weight: 500; }
.field input {
  padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border);
  background: var(--surface-2); font-size: 14px; color: var(--text);
}
.field input::placeholder { color: var(--text-dim); opacity: 0.5; }
.hint { font-weight: 400; opacity: 0.6; }

.provider-actions { display: flex; align-items: center; gap: 12px; padding-top: 4px; }
.btn-test {
  padding: 7px 16px; border-radius: 6px; font-size: 13px; font-weight: 500;
  background: var(--surface-3); color: var(--text); border: none; cursor: pointer;
}
.test-ok { font-size: 13px; color: var(--success, #10b981); }
.test-fail { font-size: 13px; color: var(--error, #ef4444); }

.actions { display: flex; align-items: center; gap: 16px; padding-top: 8px; }
.actions button {
  padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;
  background: var(--primary, #0075de); color: #fff; border: none; cursor: pointer;
}
.actions button:disabled { opacity: 0.5; cursor: not-allowed; }
.saved-msg { color: var(--success, #10b981); font-size: 14px; }
.error-msg { color: var(--error, #ef4444); font-size: 14px; }
</style>
