<template>
  <div class="store-panel">
    <p class="hint">agentic-store — SQLite 持久化，Key-Value + Raw SQL，浏览器端 WASM</p>

    <div class="store-section">
      <h3>🔑 Key-Value</h3>
      <div class="store-controls">
        <input v-model="kvKey" placeholder="Key" style="width:120px" />
        <input v-model="kvValue" placeholder="Value (JSON)" style="flex:1" @keydown.enter="kvSet" />
        <button @click="kvSet" :disabled="!kvKey.trim()">Set</button>
        <button @click="kvGet" :disabled="!kvKey.trim()" class="btn-secondary">Get</button>
        <button @click="kvDel" :disabled="!kvKey.trim()" class="btn-secondary">Delete</button>
      </div>
      <div class="store-result" v-if="kvResult !== null">
        <pre>{{ kvResult }}</pre>
      </div>
      <div class="store-keys" v-if="allKeys.length">
        <span class="store-tag" v-for="k in allKeys" :key="k" @click="kvKey = k">{{ k }}</span>
      </div>
    </div>

    <div class="store-section">
      <h3>📊 Raw SQL</h3>
      <div class="store-controls">
        <input v-model="sqlInput" placeholder="SELECT * FROM kv" style="flex:1" @keydown.enter="runSql" />
        <button @click="runSql" :disabled="!sqlInput.trim()">执行</button>
      </div>
      <div class="store-result" v-if="sqlResult !== null">
        <pre>{{ sqlResult }}</pre>
      </div>
    </div>

    <div class="store-info">
      <span>Backend: {{ backend }}</span>
      <button @click="refreshKeys" class="btn-secondary" style="padding:4px 12px;font-size:12px;">刷新 Keys</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({ markTested: Function })
defineEmits(['back'])

const kvKey = ref('')
const kvValue = ref('')
const kvResult = ref(null)
const allKeys = ref([])
const sqlInput = ref('SELECT * FROM kv LIMIT 20')
const sqlResult = ref(null)
const backend = ref('loading...')

let store = null

onMounted(async () => {
  try {
    if (!window.AgenticStore) {
      const script = document.createElement('script')
      script.src = '/agentic-store.js'
      await new Promise((resolve, reject) => {
        script.onload = resolve
        script.onerror = () => {
          const s2 = document.createElement('script')
          s2.src = 'https://unpkg.com/agentic-store/agentic-store.js'
          s2.onload = resolve
          s2.onerror = reject
          document.head.appendChild(s2)
        }
        document.head.appendChild(script)
      })
    }
    const { createStore } = window.AgenticStore
    store = await createStore('example-store')
    backend.value = store.backend || 'unknown'
    await refreshKeys()
  } catch (e) {
    backend.value = `加载失败: ${e.message}`
  }
})

async function kvSet() {
  if (!store || !kvKey.value.trim()) return
  let val = kvValue.value.trim()
  try { val = JSON.parse(val) } catch { /* keep as string */ }
  await store.set(kvKey.value.trim(), val)
  kvResult.value = `✅ Set "${kvKey.value}" = ${JSON.stringify(val, null, 2)}`
  await refreshKeys()
  props.markTested?.('store')
}

async function kvGet() {
  if (!store || !kvKey.value.trim()) return
  const val = await store.get(kvKey.value.trim())
  kvResult.value = val !== undefined ? JSON.stringify(val, null, 2) : '(undefined — key not found)'
}

async function kvDel() {
  if (!store || !kvKey.value.trim()) return
  await store.delete(kvKey.value.trim())
  kvResult.value = `🗑️ Deleted "${kvKey.value}"`
  await refreshKeys()
}

async function refreshKeys() {
  if (!store) return
  try { allKeys.value = await store.keys() } catch { allKeys.value = [] }
}

function runSql() {
  if (!store || !sqlInput.value.trim()) return
  try {
    const sql = sqlInput.value.trim().toUpperCase()
    if (sql.startsWith('SELECT') || sql.startsWith('PRAGMA')) {
      const rows = store.all(sqlInput.value.trim())
      sqlResult.value = JSON.stringify(rows, null, 2)
    } else {
      store.exec(sqlInput.value.trim())
      sqlResult.value = '✅ 执行成功'
    }
    props.markTested?.('store')
  } catch (e) {
    sqlResult.value = `❌ ${e.message}`
  }
}
</script>

<style scoped>
@import './_shared.css';
.store-panel { display: flex; flex-direction: column; gap: 24px; }
.store-section h3 { font-size: 15px; margin-bottom: 12px; }
.store-controls { display: flex; gap: 8px; margin-bottom: 8px; }
.store-controls input { padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border, #334155); background: var(--surface-2, #1e293b); color: var(--text); font-size: 14px; }
.store-controls button { padding: 8px 16px; border-radius: 8px; border: none; background: var(--accent, #3b82f6); color: white; cursor: pointer; font-size: 13px; white-space: nowrap; }
.store-controls button:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary { background: var(--surface-3, #374151) !important; color: var(--text) !important; }
.store-result { background: var(--surface-2, #1e293b); border-radius: 10px; padding: 12px; margin-top: 8px; }
.store-result pre { font-size: 12px; font-family: 'SF Mono', monospace; color: var(--text); white-space: pre-wrap; word-break: break-all; margin: 0; }
.store-keys { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
.store-tag { padding: 4px 10px; border-radius: 16px; background: var(--surface-3, #374151); font-size: 12px; color: var(--text); cursor: pointer; }
.store-tag:hover { background: var(--accent, #3b82f6); color: white; }
.store-info { display: flex; gap: 16px; align-items: center; font-size: 12px; color: var(--text-secondary, #94a3b8); }
</style>
