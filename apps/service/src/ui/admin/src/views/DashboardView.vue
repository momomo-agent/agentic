<template>
  <div class="dashboard">
    <h1 class="page-title">⚡ Agentic Service</h1>

    <!-- 系统状态 -->
    <section class="section">
      <h2 class="section-title">系统状态</h2>
      <div class="grid grid-2">
        <div class="card">
          <div class="card-title">硬件信息</div>
          <dl class="info-list">
            <div v-for="(v, k) in hardware" :key="k">
              <dt>{{ formatKey(k) }}</dt>
              <dd>{{ v }}</dd>
            </div>
          </dl>
        </div>
        <div class="card">
          <div class="card-title">Ollama 状态</div>
          <div class="ollama-status">
            <div class="status-indicator" :class="ollama.running ? 'running' : 'stopped'"></div>
            <span>{{ ollama.running ? '运行中' : '未运行' }}</span>
            <span class="status-detail">{{ ollama.host || 'localhost:11434' }}</span>
          </div>
          <div v-if="!ollama.running && ollama.error" class="error-hint">{{ ollama.error }}</div>
          <div v-if="ollama.models.length > 0" style="margin-top: 16px">
            <div class="info-label">已安装 ({{ ollama.models.length }})</div>
            <div class="model-tags">
              <span v-for="m in ollama.models" :key="m" class="tag">{{ m }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 能力分配摘要 -->
    <section class="section">
      <h2 class="section-title">当前配置</h2>
      <div class="card">
        <div class="assign-grid">
          <div v-for="slot in assignSlots" :key="slot.key" class="assign-item">
            <span class="assign-icon">{{ slot.icon }}</span>
            <span class="assign-label">{{ slot.name }}</span>
            <span class="assign-value" :class="{ unset: !assignments[slot.key] }">
              {{ assignments[slot.key] || '未分配' }}
            </span>
          </div>
        </div>
        <div class="assign-hint">在「配置」页修改分配</div>
      </div>
    </section>

    <!-- Demo -->
    <section class="section">
      <h2 class="section-title">快速体验</h2>
      <div class="card">
        <div class="demo-chat">
          <div class="chat-messages" ref="chatBox">
            <div v-for="(msg, i) in chatMessages" :key="i" class="chat-msg" :class="msg.role">
              <div class="msg-role">{{ msg.role === 'user' ? '你' : 'AI' }}</div>
              <div class="msg-text">{{ msg.content }}</div>
            </div>
            <div v-if="chatLoading" class="chat-msg assistant">
              <div class="msg-role">AI</div>
              <div class="msg-text typing">思考中...</div>
            </div>
          </div>
          <form @submit.prevent="sendChat" class="chat-input">
            <input v-model="chatInput" placeholder="说点什么..." :disabled="chatLoading" />
            <button type="submit" :disabled="chatLoading || !chatInput.trim()">发送</button>
          </form>
        </div>
      </div>
    </section>

    <!-- API 测试 -->
    <section class="section">
      <h2 class="section-title">
        API 测试
        <button class="btn-run-all" @click="runAllTests" :disabled="testRunning">
          {{ testRunning ? '测试中...' : '全部运行' }}
        </button>
        <span v-if="testResults.length" class="test-summary">
          {{ testResults.filter(t => t.pass).length }}/{{ testResults.length }} 通过
        </span>
      </h2>
      <div class="grid grid-2">
        <div v-for="t in tests" :key="t.name" class="card test-card" :class="t.result?.pass ? 'pass' : t.result?.pass === false ? 'fail' : t.running ? 'running' : ''">
          <div class="test-header">
            <div class="test-badge" :class="t.result?.pass ? 'pass' : t.result?.pass === false ? 'fail' : t.running ? 'running' : ''">
              {{ t.result?.pass ? '✓' : t.result?.pass === false ? '✗' : t.running ? '…' : '○' }}
            </div>
            <span class="test-method">{{ t.method }}</span>
            <span class="test-path">{{ t.path }}</span>
          </div>
          <div class="test-name">{{ t.name }}</div>
          <div v-if="t.result" class="test-result">{{ JSON.stringify(t.result.data).slice(0, 200) }}</div>
          <button class="btn-test-single" @click="runTest(t)" :disabled="t.running">运行</button>
        </div>
      </div>
    </section>

    <!-- 日志 -->
    <section class="section">
      <h2 class="section-title">最近日志</h2>
      <div class="card log-card">
        <div v-if="logs.length === 0" class="empty">暂无日志</div>
        <div v-else class="log-list">
          <div v-for="(l, i) in logs" :key="i" class="log-line">
            <span class="log-time">{{ l.time }}</span>
            <span class="log-msg">{{ l.msg }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue'

// --- State ---
const hardware = ref<Record<string, string>>({})
const ollama = reactive({ running: false, host: '', models: [] as string[], error: '' })
const assignments = reactive<Record<string, string>>({})
const assignSlots = [
  { key: 'chat', icon: '🧠', name: '对话' },
  { key: 'vision', icon: '👁️', name: '视觉' },
  { key: 'stt', icon: '🎤', name: '语音识别' },
  { key: 'tts', icon: '🔊', name: '语音合成' },
  { key: 'embedding', icon: '📐', name: '嵌入' },
  { key: 'fallback', icon: '🔄', name: '回退' },
]

// Chat demo
const chatMessages = ref<{ role: string; content: string }[]>([])
const chatInput = ref('')
const chatLoading = ref(false)
const chatBox = ref<HTMLElement | null>(null)

// Tests
const testRunning = ref(false)
const testResults = ref<any[]>([])
const tests = reactive([
  { name: '健康检查', method: 'GET', path: '/api/health', running: false, result: null as any },
  { name: '系统状态', method: 'GET', path: '/api/status', running: false, result: null as any },
  { name: '模型列表', method: 'GET', path: '/api/models', running: false, result: null as any },
  { name: '模型池', method: 'GET', path: '/api/model-pool', running: false, result: null as any },
  { name: '能力分配', method: 'GET', path: '/api/assignments', running: false, result: null as any },
  { name: '配置', method: 'GET', path: '/api/config', running: false, result: null as any },
])

// Logs
const logs = ref<{ time: string; msg: string }[]>([])

// --- Fetch ---
async function fetchStatus() {
  try {
    const res = await fetch('/api/status')
    const data = await res.json()
    hardware.value = data.hardware || {}
    ollama.running = data.ollama?.running ?? false
    ollama.host = data.ollama?.host || ''
    ollama.models = data.ollama?.models || []
    ollama.error = data.ollama?.error || ''
  } catch {}
}

async function fetchAssignments() {
  try {
    const res = await fetch('/api/assignments')
    const data = await res.json()
    Object.assign(assignments, data)
  } catch {}
}

async function fetchLogs() {
  try {
    const res = await fetch('/api/logs?limit=20')
    if (res.ok) logs.value = await res.json()
  } catch {}
}

// --- Chat ---
async function sendChat() {
  const text = chatInput.value.trim()
  if (!text) return
  chatMessages.value.push({ role: 'user', content: text })
  chatInput.value = ''
  chatLoading.value = true
  await nextTick()
  if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: chatMessages.value }),
    })
    const data = await res.json()
    chatMessages.value.push({ role: 'assistant', content: data.response || data.error || '无响应' })
  } catch (e: any) {
    chatMessages.value.push({ role: 'assistant', content: '请求失败: ' + e.message })
  } finally {
    chatLoading.value = false
    await nextTick()
    if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight
  }
}

// --- Tests ---
async function runTest(t: any) {
  t.running = true
  t.result = null
  try {
    const res = await fetch(t.path)
    const data = await res.json()
    t.result = { pass: res.ok, data }
  } catch (e: any) {
    t.result = { pass: false, data: { error: e.message } }
  } finally {
    t.running = false
    testResults.value = tests.filter(t => t.result).map(t => t.result)
  }
}

async function runAllTests() {
  testRunning.value = true
  for (const t of tests) await runTest(t)
  testRunning.value = false
}

// --- Helpers ---
function formatKey(k: string) {
  const map: Record<string, string> = {
    cpu: 'CPU', memory: '内存', gpu: 'GPU', os: '系统', arch: '架构',
    gpuMemory: '显存', platform: '平台', totalMemory: '总内存', freeMemory: '可用内存',
  }
  return map[k] || k
}

onMounted(() => {
  fetchStatus()
  fetchAssignments()
  fetchLogs()
})
</script>

<style scoped>
.page-title { font-size: 28px; font-weight: 700; margin-bottom: 24px; }
.section { margin-bottom: 32px; }
.section-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
.grid { display: grid; gap: 16px; }
.grid-2 { grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
.card { padding: 20px; border-radius: 10px; background: var(--surface-2); border: 1px solid var(--border); }
.card-title { font-size: 15px; font-weight: 600; margin-bottom: 12px; }

/* Info list */
.info-list { display: grid; gap: 8px; }
.info-list > div { display: flex; justify-content: space-between; }
.info-list dt { color: var(--text-dim); font-size: 13px; }
.info-list dd { font-size: 13px; font-weight: 500; }
.info-label { font-size: 13px; color: var(--text-dim); margin-bottom: 8px; }

/* Ollama status */
.ollama-status { display: flex; align-items: center; gap: 8px; font-size: 14px; }
.status-indicator { width: 8px; height: 8px; border-radius: 50%; }
.status-indicator.running { background: var(--success, #10b981); }
.status-indicator.stopped { background: var(--error, #ef4444); }
.status-detail { color: var(--text-dim); font-size: 12px; }
.error-hint { color: var(--error, #ef4444); font-size: 12px; margin-top: 8px; }
.model-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.tag { padding: 4px 10px; border-radius: 6px; background: var(--surface-3); font-size: 12px; }

/* Assignments summary */
.assign-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
.assign-item { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 8px; background: var(--surface); }
.assign-icon { font-size: 18px; }
.assign-label { font-size: 13px; color: var(--text-dim); min-width: 60px; }
.assign-value { font-size: 13px; font-weight: 500; }
.assign-value.unset { color: var(--text-dim); opacity: 0.5; }
.assign-hint { font-size: 12px; color: var(--text-dim); margin-top: 12px; }

/* Chat demo */
.demo-chat { display: flex; flex-direction: column; }
.chat-messages { max-height: 300px; overflow-y: auto; margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px; }
.chat-msg { padding: 8px 12px; border-radius: 8px; }
.chat-msg.user { background: var(--surface-3); align-self: flex-end; max-width: 80%; }
.chat-msg.assistant { background: var(--surface); align-self: flex-start; max-width: 80%; }
.msg-role { font-size: 11px; color: var(--text-dim); margin-bottom: 2px; }
.msg-text { font-size: 14px; line-height: 1.5; }
.typing { color: var(--text-dim); }
.chat-input { display: flex; gap: 8px; }
.chat-input input {
  flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--surface); font-size: 14px; color: var(--text);
}
.chat-input button {
  padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600;
  background: var(--primary, #0075de); color: #fff; border: none; cursor: pointer;
}
.chat-input button:disabled { opacity: 0.5; cursor: not-allowed; }

/* Tests */
.btn-run-all {
  margin-left: 16px; padding: 6px 16px; border-radius: 6px; font-size: 13px;
  background: var(--primary, #0075de); color: #fff; border: none; cursor: pointer; font-weight: 600;
}
.btn-run-all:disabled { opacity: 0.5; cursor: not-allowed; }
.test-summary { margin-left: 12px; font-size: 14px; color: var(--text-dim); font-weight: 400; }
.test-card { position: relative; }
.test-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.test-badge {
  width: 22px; height: 22px; border-radius: 50%; display: flex;
  align-items: center; justify-content: center; font-size: 12px; font-weight: 700;
  background: var(--surface-3); color: var(--text-dim);
}
.test-badge.pass { background: rgba(16,185,129,0.15); color: var(--success, #10b981); }
.test-badge.fail { background: rgba(239,68,68,0.15); color: var(--error, #ef4444); }
.test-badge.running { background: rgba(59,130,246,0.15); color: var(--primary, #3b82f6); }
.test-method {
  font-family: 'SF Mono', Monaco, monospace; font-size: 11px; font-weight: 700;
  padding: 2px 6px; border-radius: 3px; background: var(--surface-3);
}
.test-path { font-family: 'SF Mono', Monaco, monospace; font-size: 13px; color: var(--text); }
.test-name { font-size: 13px; color: var(--text-dim); margin-bottom: 4px; }
.test-result {
  font-family: 'SF Mono', Monaco, monospace; font-size: 12px; color: var(--text-dim);
  margin-top: 4px; max-height: 60px; overflow: hidden; text-overflow: ellipsis; word-break: break-all;
}
.btn-test-single {
  margin-top: 8px; padding: 4px 12px; border-radius: 4px; font-size: 12px;
  background: var(--surface-3); border: 1px solid var(--border); cursor: pointer; color: var(--text);
}
.btn-test-single:disabled { opacity: 0.5; cursor: not-allowed; }
.test-card.pass { border-left: 3px solid var(--success, #10b981); }
.test-card.fail { border-left: 3px solid var(--error, #ef4444); }
.test-card.running { border-left: 3px solid var(--primary, #3b82f6); }

/* Logs */
.log-card { max-height: 200px; overflow-y: auto; }
.log-list { font-family: 'SF Mono', Monaco, monospace; font-size: 12px; }
.log-line { display: flex; gap: 12px; padding: 2px 0; }
.log-time { color: var(--text-dim); flex-shrink: 0; }
.log-msg { color: var(--text); }
.empty { color: var(--text-dim); font-size: 14px; padding: 12px 0; }
</style>
