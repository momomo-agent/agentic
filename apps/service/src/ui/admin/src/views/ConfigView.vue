<template>
  <div class="config-view">
    <h1 class="page-title">配置</h1>

    <!-- 能力分配 -->
    <div class="card">
      <div class="card-title">能力分配</div>
      <p class="card-desc">为每个能力选择模型。模型在「模型管理」页添加。</p>

      <div class="slots">
        <div v-for="slot in slots" :key="slot.key" class="slot-row">
          <div class="slot-label">
            <span class="slot-icon">{{ slot.icon }}</span>
            <div>
              <div class="slot-name">{{ slot.name }}</div>
              <div class="slot-desc">{{ slot.desc }}</div>
            </div>
          </div>
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
            >{{ m.name }} ({{ m.provider }})</option>
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
          <button @click="saveOllamaHost" :disabled="savingHost">
            {{ savingHost ? '保存中...' : '保存' }}
          </button>
          <span v-if="hostSaved" class="saved-msg">✓ 已保存</span>
        </div>
      </div>
    </div>

    <!-- 状态 -->
    <div v-if="error" class="error-banner">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'

const slots = [
  { key: 'chat', cap: 'chat', icon: '🧠', name: '对话', desc: '主要对话模型' },
  { key: 'vision', cap: 'vision', icon: '👁️', name: '视觉', desc: '图像理解' },
  { key: 'stt', cap: 'stt', icon: '🎤', name: '语音识别', desc: '语音转文字' },
  { key: 'tts', cap: 'tts', icon: '🔊', name: '语音合成', desc: '文字转语音' },
  { key: 'embedding', cap: 'embedding', icon: '📐', name: '嵌入', desc: '文本向量化' },
  { key: 'fallback', cap: 'chat', icon: '🔄', name: '回退', desc: '主模型失败时使用' },
]

const assignments = reactive<Record<string, string>>({
  chat: '', vision: '', stt: '', tts: '', embedding: '', fallback: ''
})
const modelPool = ref<any[]>([])
const ollamaHost = ref('http://localhost:11434')
const savingHost = ref(false)
const hostSaved = ref(false)
const error = ref('')

function modelsForCap(cap: string) {
  return modelPool.value.filter(m => m.capabilities?.includes(cap))
}

async function fetchData() {
  try {
    const [poolRes, assignRes, cfgRes] = await Promise.all([
      fetch('/api/model-pool'),
      fetch('/api/assignments'),
      fetch('/api/config'),
    ])
    const pool = await poolRes.json()
    const assign = await assignRes.json()
    const cfg = await cfgRes.json()

    modelPool.value = pool
    Object.assign(assignments, assign)
    ollamaHost.value = cfg.ollama?.host || 'http://localhost:11434'
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

onMounted(fetchData)
</script>

<style scoped>
.page-title { font-size: 28px; font-weight: 700; margin-bottom: 24px; }
.card { margin-bottom: 20px; padding: 20px; border-radius: 10px; background: var(--surface-2); border: 1px solid var(--border); }
.card-title { font-size: 16px; font-weight: 600; margin-bottom: 6px; }
.card-desc { font-size: 13px; color: var(--text-dim); margin-bottom: 16px; }

.slots { display: flex; flex-direction: column; gap: 12px; }
.slot-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-radius: 8px; background: var(--surface);
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
</style>
