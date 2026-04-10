<template>
  <div class="cloud-models-view">
    <h1 class="page-title">云端模型</h1>

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
              <option value="elevenlabs">ElevenLabs</option>
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
        <div v-for="m in cloudModels" :key="m.id" class="model-item">
          <div class="model-row">
            <div class="model-info" @click="toggleEdit(m.id)">
              <div class="model-name">
                {{ m.name }}
                <span class="provider-tag">{{ m.provider }}</span>
                <span class="cap-badge" v-for="c in (m.capabilities || [])" :key="c">{{ c }}</span>
              </div>
              <div class="model-meta" v-if="m.baseUrl">{{ m.baseUrl }}</div>
            </div>
            <div class="model-actions" v-if="editingId !== m.id">
              <button class="btn-edit" @click="startEdit(m)">编辑</button>
              <button class="btn-danger" @click="removeCloudModel(m.id)">删除</button>
            </div>
          </div>
          <!-- Inline edit -->
          <div v-if="editingId === m.id" class="edit-form">
            <div class="field-row">
              <div class="field">
                <label>模型名称</label>
                <input v-model="editData.name" />
              </div>
              <div class="field">
                <label>API Key</label>
                <input v-model="editData.apiKey" type="text" placeholder="不修改则留空" />
              </div>
            </div>
            <div class="field-row">
              <div class="field">
                <label>Base URL</label>
                <input v-model="editData.baseUrl" />
              </div>
              <div class="field">
                <label>Provider</label>
                <select v-model="editData.provider">
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="google">Google (Gemini)</option>
                  <option value="groq">Groq</option>
                  <option value="elevenlabs">ElevenLabs</option>
                  <option value="custom">自定义</option>
                </select>
              </div>
            </div>
            <div class="field">
              <label>能力</label>
              <div class="cap-checkboxes">
                <label v-for="cap in allCaps" :key="cap" class="cap-check">
                  <input type="checkbox" :value="cap" v-model="editData.capabilities" />
                  <span>{{ cap }}</span>
                </label>
              </div>
            </div>
            <div class="edit-actions">
              <button @click="saveEdit(m.id)">保存</button>
              <button class="btn-secondary" @click="editingId = null">取消</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'

const allCaps = ['chat', 'vision', 'stt', 'tts', 'embedding', 'fallback']
const pool = ref([])
const addError = ref('')

const newCloud = reactive({
  provider: 'openai',
  name: '',
  apiKey: '',
  baseUrl: '',
  capabilities: ['chat'],
})

const cloudModels = computed(() => pool.value.filter(m => m.provider !== 'ollama'))

const defaultBaseUrl = computed(() => {
  const map = { openai: 'https://api.openai.com/v1', anthropic: 'https://api.anthropic.com', groq: 'https://api.groq.com/openai/v1', google: '', elevenlabs: 'https://api.elevenlabs.io/v1', custom: 'http://localhost:8080/v1' }
  return map[newCloud.provider] || ''
})

async function fetchPool() {
  try { pool.value = await (await fetch('/api/model-pool')).json() } catch {}
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

// Edit
const editingId = ref(null)
const editData = reactive({ name: '', apiKey: '', baseUrl: '', provider: '', capabilities: [] })

function startEdit(m) {
  editingId.value = m.id
  editData.name = m.name
  editData.apiKey = ''
  editData.baseUrl = m.baseUrl || ''
  editData.provider = m.provider || 'custom'
  editData.capabilities = [...(m.capabilities || [])]
}

function toggleEdit(id) {
  if (editingId.value === id) editingId.value = null
}

async function saveEdit(oldId) {
  const newId = `cloud:${editData.provider}:${editData.name}`
  const body = {
    id: newId,
    name: editData.name,
    provider: editData.provider,
    baseUrl: editData.baseUrl,
    capabilities: [...editData.capabilities],
    source: 'user',
  }
  if (editData.apiKey) body.apiKey = editData.apiKey
  try {
    // Remove old, add new
    if (oldId !== newId) {
      await fetch(`/api/model-pool/${encodeURIComponent(oldId)}`, { method: 'DELETE' })
    }
    await fetch('/api/model-pool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    editingId.value = null
    await fetchPool()
  } catch (e) {
    alert('保存失败: ' + e.message)
  }
}

onMounted(fetchPool)
</script>

<style scoped>
.cloud-models-view { max-width: 900px; }
.page-title { font-size: 22px; font-weight: 700; margin-bottom: 24px; }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
.card-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
.config-form { display: flex; flex-direction: column; gap: 16px; }
.field-row { display: flex; gap: 16px; }
.field-row > .field { flex: 1; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 13px; font-weight: 600; color: var(--text-dim); }
.field input, .field select {
  padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--surface-2); font-size: 14px; color: var(--text);
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
.error-msg { color: var(--error, #ef4444); font-size: 14px; }
.model-list { display: flex; flex-direction: column; gap: 8px; }
.model-item {
  display: flex; flex-direction: column;
  padding: 12px 16px; border-radius: 8px; background: var(--surface-2); border: 1px solid var(--border);
}
.model-row { display: flex; align-items: center; justify-content: space-between; }
.model-info { flex: 1; min-width: 0; cursor: pointer; }
.model-name { font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.model-meta { font-size: 12px; color: var(--text-dim); opacity: 0.7; margin-top: 2px; }
.model-actions { flex-shrink: 0; margin-left: 12px; }
.provider-tag { font-size: 11px; padding: 2px 8px; border-radius: 99px; background: rgba(139,92,246,0.1); color: #8b5cf6; font-weight: 500; }
.cap-badge { font-size: 11px; padding: 2px 8px; border-radius: 99px; background: rgba(0,117,222,0.1); color: var(--primary); font-weight: 500; }
.btn-danger { padding: 6px 14px; border-radius: 6px; border: none; background: rgba(239,68,68,0.1); color: var(--error, #ef4444); cursor: pointer; font-size: 13px; font-weight: 500; }
.btn-edit { padding: 6px 14px; border-radius: 6px; border: none; background: rgba(0,117,222,0.1); color: var(--primary, #0075de); cursor: pointer; font-size: 13px; font-weight: 500; margin-right: 8px; }
.btn-secondary { padding: 8px 16px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface); color: var(--text); cursor: pointer; font-size: 13px; }
.edit-form { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 12px; }
.edit-actions { display: flex; gap: 8px; padding-top: 4px; }
.edit-actions button:first-child { padding: 8px 20px; border-radius: 6px; font-size: 13px; font-weight: 600; background: var(--primary, #0075de); color: #fff; border: none; cursor: pointer; }
.empty { color: var(--text-dim); font-size: 14px; padding: 12px 0; }
</style>
