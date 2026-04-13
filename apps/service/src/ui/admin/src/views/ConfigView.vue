<template>
  <div class="config-view">
    <h1 class="page-title">配置</h1>

    <!-- 能力分配 -->
    <div class="card">
      <div class="card-title">能力分配</div>
      <p class="card-desc">为每个能力选择模型。</p>

      <div class="slots">
        <div v-for="slot in slots" :key="slot.key" class="slot-group">
          <div class="slot-row">
            <div class="slot-label">
              <span class="slot-icon">{{ slot.icon }}</span>
              <div>
                <div class="slot-name">{{ slot.name }}
                  <span v-if="assignments[slot.key]" class="source-badge" :class="sourceType(slot.key)">{{ sourceLabel(slot.key) }}</span>
                </div>
                <div class="slot-desc">{{ slot.desc }}</div>
              </div>
            </div>
            <div class="slot-right">
              <select
                class="slot-select"
                :value="assignments[slot.key]"
                @change="updateAssignment(slot.key, ($event.target as HTMLSelectElement).value)"
              >
                <option value="">未分配</option>
                <option
                  v-for="m in modelsForCap(slot.cap)"
                  :key="m.id"
                  :value="m.id"
                >{{ m.name }} ({{ engineLabel(m.engineId) }})</option>
              </select>
              <div v-if="!assignments[slot.key] && modelsForCap(slot.cap).length === 0" class="slot-hint warn">
                无可用模型 — 在「模型管理」中添加
              </div>
            </div>
          </div>
          <!-- chat 的回退模型，缩进显示 -->
          <div v-if="slot.key === 'chat'" class="slot-row slot-sub">
            <div class="slot-label">
              <span class="slot-icon">🔄</span>
              <div>
                <div class="slot-name">回退</div>
                <div class="slot-desc">主模型失败时自动切换</div>
              </div>
            </div>
            <div class="slot-right">
              <select
                class="slot-select"
                :value="assignments.chatFallback"
                @change="updateAssignment('chatFallback', ($event.target as HTMLSelectElement).value)"
              >
                <option value="">不设置</option>
                <option
                  v-for="m in modelsForCap('chat').filter(m => m.id !== assignments.chat)"
                  :key="m.id"
                  :value="m.id"
                >{{ m.name }} ({{ m.provider }})</option>
              </select>
            </div>
          </div>
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
          <button @click="saveOllamaHost" :disabled="savingHost">
            {{ savingHost ? '保存中...' : '保存' }}
          </button>
          <span v-if="hostSaved" class="saved-msg">✓ 已保存</span>
        </div>
      </div>
    </div>

    <!-- 云端服务 -->
    <div class="card">
      <div class="card-title">云端服务</div>
      <p class="card-desc">配置云端 API 提供商，添加后其模型会出现在能力分配中。</p>

      <div v-for="(p, id) in providers" :key="id" class="provider-row">
        <div class="provider-header">
          <span class="provider-name">{{ id }}</span>
          <button class="btn-text danger" @click="removeProvider(id)">移除</button>
        </div>
        <div class="config-form">
          <div class="field">
            <label>API Key</label>
            <input
              :type="p.showKey ? 'text' : 'password'"
              v-model="p.apiKey"
              placeholder="输入 API Key"
            />
            <button class="btn-text" @click="p.showKey = !p.showKey">{{ p.showKey ? '隐藏' : '显示' }}</button>
          </div>
          <div class="field" v-if="p.showBaseUrl || p.baseUrl">
            <label>Base URL（可选）</label>
            <input v-model="p.baseUrl" placeholder="默认" />
          </div>
          <div v-if="!p.showBaseUrl && !p.baseUrl" class="btn-text" @click="p.showBaseUrl = true" style="font-size:12px;cursor:pointer;">+ 自定义 Base URL</div>
        </div>
      </div>

      <div v-if="!showAddProvider" style="padding-top: 8px;">
        <button class="btn-outline" @click="showAddProvider = true">+ 添加云端服务</button>
      </div>
      <div v-else class="add-provider-form">
        <select v-model="newProviderId" class="slot-select">
          <option value="">选择服务商</option>
          <option v-for="opt in availableProviders" :key="opt.id" :value="opt.id">{{ opt.label }}</option>
        </select>
        <div class="actions">
          <button @click="addProvider" :disabled="!newProviderId">添加</button>
          <button class="btn-text" @click="showAddProvider = false">取消</button>
        </div>
      </div>

      <div class="actions" style="padding-top: 12px;">
        <button @click="saveProviders" :disabled="savingProviders">
          {{ savingProviders ? '保存中...' : '保存' }}
        </button>
        <span v-if="providersSaved" class="saved-msg">✓ 已保存</span>
      </div>
    </div>

    <!-- 状态 -->
    <div v-if="error" class="error-banner">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'

const slots = [
  { key: 'chat', cap: 'chat', icon: '🧠', name: '对话', desc: '主要对话模型' },
  { key: 'vision', cap: 'vision', icon: '👁️', name: '视觉', desc: '图像理解' },
  { key: 'stt', cap: 'stt', icon: '🎤', name: '语音识别', desc: '语音转文字' },
  { key: 'tts', cap: 'tts', icon: '🔊', name: '语音合成', desc: '文字转语音' },
  { key: 'embedding', cap: 'embedding', icon: '📐', name: '嵌入', desc: '文本向量化' },
]

const assignments = reactive<Record<string, string>>({
  chat: '', vision: '', stt: '', tts: '', embedding: '', chatFallback: ''
})
const allModels = ref<any[]>([])
const ollamaHost = ref('http://localhost:11434')
const savingHost = ref(false)
const hostSaved = ref(false)
const error = ref('')

// 云端服务
const KNOWN_PROVIDERS = [
  { id: 'openai', label: 'OpenAI' },
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'google', label: 'Google' },
  { id: 'elevenlabs', label: 'ElevenLabs' },
]
const providers = reactive<Record<string, { apiKey: string; baseUrl: string; showKey: boolean; showBaseUrl: boolean }>>({})
const showAddProvider = ref(false)
const newProviderId = ref('')
const savingProviders = ref(false)
const providersSaved = ref(false)

const availableProviders = computed(() => KNOWN_PROVIDERS.filter(p => !(p.id in providers)))

function modelsForCap(cap: string) {
  return allModels.value.filter(m => m.capabilities?.includes(cap) && m.installed)
}

const ENGINE_LABELS: Record<string, string> = { ollama: 'Ollama', whisper: 'Whisper', tts: 'TTS' }
function engineLabel(id: string) {
  if (id?.startsWith('cloud:')) return id.split(':')[1]
  return ENGINE_LABELS[id] || id || ''
}

function assignedModel(key: string) {
  const id = assignments[key]
  if (!id) return null
  return allModels.value.find(m => m.id === id)
}

function sourceType(key: string): string {
  const m = assignedModel(key)
  if (!m) return ''
  return m.engineId?.startsWith('cloud:') ? 'cloud' : 'local'
}

function sourceLabel(key: string): string {
  const m = assignedModel(key)
  if (!m) return ''
  if (m.engineId?.startsWith('cloud:')) return '☁️ 云端'
  return '💻 本地'
}

async function fetchData() {
  try {
    const [modRes, assignRes, cfgRes] = await Promise.all([
      fetch('/api/engines/models'),
      fetch('/api/assignments'),
      fetch('/api/config'),
    ])
    allModels.value = await modRes.json()
    const assign = await assignRes.json()
    const cfg = await cfgRes.json()

    Object.assign(assignments, assign)
    ollamaHost.value = cfg.ollama?.host || cfg.ollamaHost || 'http://localhost:11434'

    // Load existing providers
    const cfgProviders = cfg.providers || {}
    for (const key of Object.keys(providers)) delete providers[key]
    for (const [id, p] of Object.entries(cfgProviders) as [string, any][]) {
      providers[id] = { apiKey: p.apiKey || '', baseUrl: p.baseUrl || '', showKey: false, showBaseUrl: false }
    }
  } catch (e: any) {
    error.value = e.message
  }
}

async function updateAssignment(key: string, value: string) {
  assignments[key] = value
  try {
    await fetch('/api/assignments', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assignments),
    })
  } catch (e: any) {
    error.value = e.message
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
  } catch (e: any) {
    error.value = e.message
  } finally {
    savingHost.value = false
  }
}

function addProvider() {
  if (!newProviderId.value || newProviderId.value in providers) return
  providers[newProviderId.value] = { apiKey: '', baseUrl: '', showKey: false, showBaseUrl: false }
  newProviderId.value = ''
  showAddProvider.value = false
}

function removeProvider(id: string) {
  delete providers[id]
}

async function saveProviders() {
  savingProviders.value = true
  try {
    const res = await fetch('/api/config')
    const cfg = await res.json()
    cfg.providers = {}
    for (const [id, p] of Object.entries(providers)) {
      if (p.apiKey) {
        cfg.providers[id] = { apiKey: p.apiKey }
        if (p.baseUrl) cfg.providers[id].baseUrl = p.baseUrl
      }
    }
    await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
    })
    providersSaved.value = true
    setTimeout(() => (providersSaved.value = false), 2000)
    // Reload models since new providers may register new engines
    await fetchData()
  } catch (e: any) {
    error.value = e.message
  } finally {
    savingProviders.value = false
  }
}

onMounted(fetchData)
</script>

<style scoped>
.page-title { font-size: 28px; font-weight: 700; margin-bottom: 24px; }
.card { margin-bottom: 20px; padding: 20px; border-radius: 10px; background: var(--surface-2); border: 1px solid var(--border); }
.card-title { font-size: 16px; font-weight: 600; margin-bottom: 6px; }
.card-desc { font-size: 13px; color: var(--text-dim); margin-bottom: 16px; }

.slots { display: flex; flex-direction: column; gap: 12px; }
.slot-group { display: flex; flex-direction: column; gap: 0; }
.slot-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-radius: 8px; background: var(--surface);
  border: 1px solid var(--border);
}
.slot-sub {
  margin-top: -1px; margin-left: 32px;
  border-top-left-radius: 0; border-top-right-radius: 0;
  background: var(--surface-2); opacity: 0.85;
}
.slot-label { display: flex; align-items: center; gap: 12px; }
.slot-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.slot-icon { font-size: 20px; }
.slot-name { font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
.slot-desc { font-size: 12px; color: var(--text-dim); }
.source-badge {
  font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 10px;
  display: inline-flex; align-items: center; gap: 2px;
}
.source-badge.local { background: rgba(16,185,129,0.12); color: #10b981; }
.source-badge.cloud { background: rgba(59,130,246,0.12); color: #3b82f6; }
.slot-select {
  min-width: 240px; padding: 8px 12px; border-radius: 6px;
  border: 1px solid var(--border); background: var(--surface-2);
  font-size: 14px; color: var(--text);
}

.config-form { display: flex; flex-direction: column; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 13px; color: var(--text-dim); font-weight: 500; }
.field input {
  padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border);
  background: var(--surface); font-size: 14px; color: var(--text);
}
.field input::placeholder { color: var(--text-dim); opacity: 0.5; }
.actions { display: flex; align-items: center; gap: 16px; padding-top: 8px; }
.actions button {
  padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;
  background: var(--primary, #0075de); color: #fff; border: none; cursor: pointer;
}
.actions button:disabled { opacity: 0.5; cursor: not-allowed; }
.saved-msg { color: var(--success, #10b981); font-size: 14px; }
.error-banner {
  margin-top: 16px; padding: 12px 16px; border-radius: 8px;
  background: rgba(239,68,68,0.1); color: var(--error, #ef4444); font-size: 14px;
}
.slot-hint { font-size: 11px; color: var(--text-dim); opacity: 0.7; }
.slot-hint.warn { color: var(--error, #ef4444); opacity: 1; }

.provider-row {
  padding: 16px; margin-bottom: 12px; border-radius: 8px;
  background: var(--surface-2, #f8f9fa); border: 1px solid var(--border);
}
.provider-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;
}
.provider-name { font-size: 15px; font-weight: 600; text-transform: capitalize; }
.btn-text { background: none; border: none; color: var(--primary, #0075de); cursor: pointer; font-size: 13px; padding: 2px 4px; }
.btn-text.danger { color: var(--error, #ef4444); }
.btn-outline {
  padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 500;
  background: transparent; border: 1px dashed var(--border); color: var(--text-dim); cursor: pointer;
}
.btn-outline:hover { border-color: var(--primary, #0075de); color: var(--primary, #0075de); }
.add-provider-form { display: flex; flex-direction: column; gap: 10px; padding-top: 8px; }
</style>
