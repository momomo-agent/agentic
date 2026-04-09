<template>
  <div class="test-view">
    <h1 class="page-title">🧪 Tests</h1>
    <div class="test-header">
      <p class="page-desc">API 端点自动测试</p>
      <button class="btn-run-all" @click="runAllTests" :disabled="testsRunning">
        {{ testsRunning ? '测试中...' : '▶ Run All Tests' }}
      </button>
      <span v-if="testSummary" class="test-summary">{{ testSummary }}</span>
    </div>

    <div class="grid grid-2">
      <div v-for="t in tests" :key="t.name" class="test-card" :class="t.status">
        <div class="test-card-header">
          <span class="test-badge" :class="t.status">
            {{ t.status === 'pass' ? '✓' : t.status === 'fail' ? '✗' : t.status === 'running' ? '⟳' : '○' }}
          </span>
          <span class="test-method">{{ t.method }}</span>
          <span class="test-path">{{ t.path }}</span>
        </div>
        <div class="test-name">{{ t.name }}</div>
        <div v-if="t.result" class="test-result">{{ t.result }}</div>
        <button class="btn-test" @click="runTest(t)" :disabled="t.status === 'running'">
          {{ t.status === 'running' ? '...' : '测试' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const tests = ref([
  { name: 'Health Check', method: 'GET', path: '/health', status: 'idle', result: '' },
  { name: 'OpenAI Models', method: 'GET', path: '/v1/models', status: 'idle', result: '' },
  { name: 'OpenAI Chat', method: 'POST', path: '/v1/chat/completions', status: 'idle', result: '' },
  { name: 'Anthropic Messages', method: 'POST', path: '/v1/messages', status: 'idle', result: '' },
  { name: 'Chat API (SSE)', method: 'POST', path: '/api/chat', status: 'idle', result: '' },
  { name: 'System Status', method: 'GET', path: '/api/status', status: 'idle', result: '' },
  { name: 'Devices', method: 'GET', path: '/api/devices', status: 'idle', result: '' },
  { name: 'Get Config', method: 'GET', path: '/api/config', status: 'idle', result: '' },
  { name: 'Put Config', method: 'PUT', path: '/api/config', status: 'idle', result: '' },
  { name: 'Performance', method: 'GET', path: '/api/perf', status: 'idle', result: '' },
  { name: 'Logs', method: 'GET', path: '/api/logs', status: 'idle', result: '' },
  { name: 'Synthesize (TTS)', method: 'POST', path: '/api/synthesize', status: 'idle', result: '' },
])

const testsRunning = ref(false)
const testSummary = computed(() => {
  const pass = tests.value.filter(t => t.status === 'pass').length
  const fail = tests.value.filter(t => t.status === 'fail').length
  const total = tests.value.length
  if (pass + fail === 0) return ''
  return `${pass}/${total} passed` + (fail ? `, ${fail} failed` : '')
})

function getTestBody(t) {
  if (t.path === '/v1/chat/completions') {
    return JSON.stringify({ messages: [{ role: 'user', content: 'Say hi in 5 words' }], model: 'agentic-service', stream: false, max_tokens: 50 })
  }
  if (t.path === '/v1/messages') {
    return JSON.stringify({ messages: [{ role: 'user', content: 'Say hi in 5 words' }], model: 'agentic-service', max_tokens: 50 })
  }
  if (t.path === '/api/config' && t.method === 'PUT') {
    return JSON.stringify({ llm: { provider: 'ollama' }, stt: { provider: 'whisper' }, tts: { provider: 'coqui' } })
  }
  if (t.path === '/api/synthesize') {
    return JSON.stringify({ text: 'hello' })
  }
  if (t.path === '/api/chat') {
    return JSON.stringify({ message: 'hello' })
  }
  return null
}

async function runTest(t) {
  t.status = 'running'
  t.result = ''
  try {
    const opts = { method: t.method, headers: {} }
    const body = getTestBody(t)
    if (body) { opts.body = body; opts.headers['Content-Type'] = 'application/json' }
    const res = await fetch(t.path, opts)
    if (t.path === '/api/synthesize') {
      if (res.ok) { t.status = 'pass'; t.result = `audio (${res.headers.get('content-type')})` }
      else { const d = await res.json(); t.status = 'fail'; t.result = `${res.status}: ${d.error || 'unknown'}` }
      return
    }
    if (t.path === '/api/chat') {
      if (res.ok) { t.status = 'pass'; t.result = 'SSE stream ok' }
      else { t.status = 'fail'; t.result = `HTTP ${res.status}` }
      return
    }
    const text = await res.text()
    let preview
    try { preview = JSON.stringify(JSON.parse(text)).slice(0, 120) }
    catch { preview = text.slice(0, 120) }
    if (res.ok) { t.status = 'pass'; t.result = preview }
    else { t.status = 'fail'; t.result = `${res.status}: ${preview}` }
  } catch (e) {
    t.status = 'fail'
    t.result = e.message
  }
}

async function runAllTests() {
  testsRunning.value = true
  for (const t of tests.value) {
    await runTest(t)
  }
  testsRunning.value = false
}
</script>

<style scoped>
.page-title { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
.page-desc { font-size: 14px; color: var(--text-dim); }
.test-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
.test-header p { margin: 0; }
.btn-run-all {
  padding: 8px 20px; border-radius: 6px; font-size: 14px;
  background: var(--primary, #0075de); color: #fff; border: none; cursor: pointer;
  font-weight: 600;
}
.btn-run-all:disabled { opacity: 0.5; cursor: not-allowed; }
.test-summary { font-size: 14px; color: var(--text-dim); font-weight: 400; }
.grid { display: grid; gap: 16px; }
.grid-2 { grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); }
.test-card {
  padding: 16px; border-radius: 8px; background: var(--surface-2);
  border: 1px solid var(--border); transition: border-color 0.15s;
}
.test-card.pass { border-left: 3px solid var(--success, #10b981); }
.test-card.fail { border-left: 3px solid var(--error, #ef4444); }
.test-card.running { border-left: 3px solid var(--primary, #3b82f6); }
.test-card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
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
.test-path { font-family: 'SF Mono', Monaco, monospace; font-size: 13px; }
.test-name { font-size: 13px; color: var(--text-dim); margin-bottom: 4px; }
.test-result {
  font-family: 'SF Mono', Monaco, monospace; font-size: 12px; color: var(--text-dim);
  margin: 4px 0; max-height: 60px; overflow: hidden; text-overflow: ellipsis; word-break: break-all;
}
.btn-test {
  margin-top: 8px; padding: 4px 12px; border-radius: 4px; font-size: 12px;
  background: var(--surface-3); border: 1px solid var(--border); cursor: pointer;
}
.btn-test:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
