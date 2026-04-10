<template>
  <div class="models-view">
    <h1 class="page-title">模型</h1>

    <!-- 引擎状态 -->
    <div class="engines-bar">
      <div v-for="e in engines" :key="e.id" class="engine-chip" :class="{ available: e.available }">
        <span class="engine-dot"></span>
        {{ e.name }}
      </div>
    </div>

    <!-- 已安装模型 -->
    <div class="card">
      <div class="card-title">已安装 ({{ installedModels.length }})</div>
      <div v-if="installedModels.length === 0" class="empty">暂无模型</div>
      <div v-else class="model-list">
        <div v-for="m in installedModels" :key="m.id" class="model-item">
          <div class="model-info">
            <div class="model-name">
              {{ m.name }}
              <span class="engine-tag">{{ engineLabel(m.engineId) }}</span>
              <span class="cap-badge" v-for="c in m.capabilities" :key="c">{{ capLabel(c) }}</span>
            </div>
            <div class="model-desc" v-if="m.description">{{ m.description }}</div>
            <div class="model-meta" v-if="m.size">{{ formatSize(m.size) }}</div>
          </div>
          <div class="model-actions" v-if="m.engineId === 'ollama'">
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

    <!-- 添加云端模型 -->
    <div class="card">
      <div class="card-title">添加云端模型</div>
      <div class="config-form">
        <div class="field-row">
          <div class="field">
            <label>Provider</label>
            <select v-model="newCloud.provider">
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google (Gemini)</option>
              <option value="groq">Groq</option>
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
              <span>{{ capLabel(cap) }}</span>
            </label>
          </div>
        </div>
        <div class="actions">
          <button @click="addCloudModel" :disabled="!newCloud.name || !newCloud.apiKey">添加</button>
        </div>
      </div>
    </div>

    <!-- 推荐本地模型 -->
    <div class="card" v-if="ollamaAvailable">
      <div class="card-title">推荐下载</div>
      <div class="model-list">
        <div v-for="m in uninstalledRecommended" :key="m.name" class="model-item recommend">
          <div class="model-info">
            <div class="model-name">
              {{ m.name }}
              <span class="cap-badge" v-for="c in m.capabilities" :key="c">{{ capLabel(c) }}</span>
            </div>
            <div class="model-desc">{{ m.description }}</div>
            <div class="model-meta" v-if="m.size">{{ m.size }}</div>
          </div>
          <button class="btn-download" @click="pullModel(m.name)" :disabled="!!downloads[m.name]">下载</button>
        </div>
      </div>
      <!-- 自定义下载 -->
      <div class="custom-pull">
        <input v-model="customModel" placeholder="模型名称，如 llama3:8b" @keyup.enter="pullModel(customModel)" />
        <button @click="pullModel(customModel)" :disabled="!customModel || !!downloads[customModel]">下载</button>
      </div>
    </div>

    <div v-if="error" class="error-banner">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'

const engines = ref<any[]>([])
const allModels = ref<any[]>([])
const recommended = ref<any[]>([])
const downloads = reactive<Record<string, any>>({})
const deleting = ref<string | null>(null)
const customModel = ref('')
const error = ref('')

const newCloud = reactive({
  provider: 'openai', name: '', apiKey: '', baseUrl: '', capabilities: ['chat'] as string[]
})
const allCaps = ['chat', 'vision', 'stt', 'tts', 'embedding']

const CAP_LABELS: Record<string, string> = { chat: '对话', vision: '视觉', stt: '语音识别', tts: '语音合成', embedding: '嵌入' }
function capLabel(c: string) { return CAP_LABELS[c] || c }

const ENGINE_LABELS: Record<string, string> = { ollama: 'Ollama', whisper: 'Whisper', tts: 'TTS' }
function engineLabel(id: string) {
  if (id.startsWith('cloud:')) return id.split(':')[1]
  return ENGINE_LABELS[id] || id
}

const BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com',
  google: 'https://generativelanguage.googleapis.com/v1beta',
  groq: 'https://api.groq.com/openai/v1',
}
const defaultBaseUrl = computed(() => BASE_URLS[newCloud.provider] || 'https://api.example.com/v1')

const ollamaAvailable = computed(() => engines.value.some(e => e.id === 'ollama' && e.available))
const installedModels = computed(() => allModels.value.filter(m => m.installed))
const installedNames = computed(() => new Set(installedModels.value.map(m => m.name)))
const uninstalledRecommended = computed(() => recommended.value.filter(m => !installedNames.value.has(m.name)))

function formatSize(bytes: number) {
  if (!bytes) return ''
  const gb = bytes / 1e9
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / 1e6).toFixed(0)} MB`
}

async function fetchAll() {
  try {
    const [engRes, modRes, recRes] = await Promise.all([
      fetch('/api/engines'),
      fetch('/api/engines/models'),
      fetch('/api/engines/recommended'),
    ])
    engines.value = await engRes.json()
    allModels.value = await modRes.json()
    recommended.value = await recRes.json()
  } catch (e: any) { error.value = e.message }
}

async function addCloudModel() {
  try {
    const id = `cloud:${newCloud.provider}:${newCloud.name}`
    await fetch('/api/model-pool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id, name: newCloud.name, provider: newCloud.provider,
        apiKey: newCloud.apiKey, baseUrl: newCloud.baseUrl || undefined,
        capabilities: newCloud.capabilities, source: 'user',
      }),
    })
    newCloud.name = ''; newCloud.apiKey = ''; newCloud.baseUrl = ''
    newCloud.capabilities = ['chat']
    await fetchAll()
  } catch (e: any) { error.value = e.message }
}

async function pullModel(name: string) {
  if (!name) return
  downloads[name] = { status: 'Starting...', percent: 0 }
  try {
    const res = await fetch('/api/models/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: name }),
    })
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of decoder.decode(value).split('\n').filter(l => l.startsWith('data: '))) {
        try {
          const d = JSON.parse(line.slice(6))
          if (d.error) { downloads[name] = { status: d.error, percent: 0 }; return }
          if (d.status === 'success') { delete downloads[name]; await fetchAll(); return }
          const pct = d.total ? (d.completed / d.total) * 100 : 0
          downloads[name] = { status: d.status || 'Downloading...', percent: pct }
        } catch {}
      }
    }
    delete downloads[name]
    await fetchAll()
  } catch (e: any) {
    downloads[name] = { status: e.message, percent: 0 }
  }
  if (customModel.value === name) customModel.value = ''
}

async function deleteModel(name: string) {
  deleting.value = name
  try {
    await fetch(`/api/models/${encodeURIComponent(name)}`, { method: 'DELETE' })
    await fetchAll()
  } catch (e: any) { error.value = e.message }
  finally { deleting.value = null }
}

let refreshTimer: any = null
onMounted(() => { fetchAll(); refreshTimer = setInterval(fetchAll, 10000) })
onUnmounted(() => clearInterval(refreshTimer))
</script>

<style scoped>
.page-title { font-size: 28px; font-weight: 700; margin-bottom: 24px; }
.engines-bar { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
.engine-chip {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: 99px; font-size: 13px; font-weight: 500;
  background: var(--surface-2); border: 1px solid var(--border); color: var(--text-dim);
}
.engine-chip.available { color: var(--text); }
.engine-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--error, #ef4444); }
.engine-chip.available .engine-dot { background: var(--success, #10b981); }

.card { margin-bottom: 20px; padding: 20px; border-radius: 10px; background: var(--surface-2); border: 1px solid var(--border); }
.card-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
.model-list { display: flex; flex-direction: column; gap: 8px; }
.model-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-radius: 8px; background: var(--surface); border: 1px solid var(--border);
}
.model-item.recommend { background: var(--surface); }
.model-info { flex: 1; min-width: 0; }
.model-name { font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.model-desc { font-size: 13px; color: var(--text-dim); margin-top: 2px; }
.model-meta { font-size: 12px; color: var(--text-dim); opacity: 0.7; margin-top: 2px; }
.model-actions { flex-shrink: 0; margin-left: 12px; }
.engine-tag { font-size: 11px; padding: 2px 8px; border-radius: 99px; background: rgba(139,92,246,0.1); color: #8b5cf6; font-weight: 500; }
.cap-badge { font-size: 11px; padding: 2px 8px; border-radius: 99px; background: rgba(0,117,222,0.1); color: var(--primary); font-weight: 500; }
.btn-danger { padding: 6px 14px; border-radius: 6px; border: none; background: rgba(239,68,68,0.1); color: var(--error, #ef4444); cursor: pointer; font-size: 13px; font-weight: 500; }
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-download { padding: 6px 14px; border-radius: 6px; border: none; background: var(--primary); color: #fff; cursor: pointer; font-size: 13px; font-weight: 500; flex-shrink: 0; }
.btn-download:disabled { opacity: 0.5; cursor: not-allowed; }

.download-item { padding: 12px 0; }
.download-name { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
.progress-bar { height: 6px; border-radius: 3px; background: var(--surface-2); overflow: hidden; }
.progress-fill { height: 100%; border-radius: 3px; background: var(--primary); transition: width 0.3s; }
.progress-text { font-size: 12px; color: var(--text-dim); margin-top: 4px; }

.config-form { display: flex; flex-direction: column; gap: 16px; }
.field-row { display: flex; gap: 16px; }
.field-row > .field { flex: 1; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 13px; font-weight: 600; color: var(--text-dim); }
.field input, .field select {
  padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--surface); font-size: 14px; color: var(--text);
}
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

.custom-pull { display: flex; gap: 8px; margin-top: 16px; }
.custom-pull input { flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); font-size: 14px; color: var(--text); }
.custom-pull button { padding: 10px 20px; border-radius: 8px; border: none; background: var(--primary); color: #fff; cursor: pointer; font-size: 14px; font-weight: 600; }
.custom-pull button:disabled { opacity: 0.5; cursor: not-allowed; }

.empty { color: var(--text-dim); font-size: 14px; padding: 12px 0; }
.error-banner { margin-top: 16px; padding: 12px 16px; border-radius: 8px; background: rgba(239,68,68,0.1); color: var(--error, #ef4444); font-size: 14px; }
</style>
