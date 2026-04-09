<template>
  <div class="test-view">
    <h1 class="page-title">🧪 Tests</h1>
    <div class="test-header">
      <p class="page-desc">能力全集 · API 端点自动测试</p>
      <button class="btn-run-all" @click="runAllTests" :disabled="testsRunning">
        {{ testsRunning ? '测试中...' : '▶ Run All' }}
      </button>
      <span v-if="testSummary" class="test-summary">{{ testSummary }}</span>
    </div>

    <div v-for="group in groupedTests" :key="group.label" class="test-group">
      <h2 class="group-title">{{ group.label }}</h2>
      <div class="grid grid-2">
        <div v-for="t in group.items" :key="t.name" class="test-card" :class="t.status">
          <div class="test-card-header">
            <span class="test-badge" :class="t.status">
              {{ t.status === 'pass' ? '✓' : t.status === 'fail' ? '✗' : t.status === 'running' ? '⟳' : '○' }}
            </span>
            <span class="test-method">{{ t.method }}</span>
            <span class="test-path">{{ t.path }}</span>
          </div>
          <div class="test-meta">
            <span class="test-name">{{ t.name }}</span>
            <span class="tag" :class="t.runtime">{{ t.runtime === 'local' ? '🖥 本地' : '☁️ 云端' }}</span>
            <span v-if="t.model" class="tag model">{{ t.model }}</span>
          </div>
          <div v-if="t.result" class="test-result">{{ t.result }}</div>
          <button class="btn-test" @click="runTest(t)" :disabled="t.status === 'running'">
            {{ t.status === 'running' ? '...' : '测试' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const tests = ref([
  // --- System ---
  { name: 'Health Check', method: 'GET', path: '/health', group: 'system', runtime: 'local', model: '', status: 'idle', result: '' },
  { name: 'System Status', method: 'GET', path: '/api/status', group: 'system', runtime: 'local', model: '', status: 'idle', result: '' },
  { name: 'Performance', method: 'GET', path: '/api/perf', group: 'system', runtime: 'local', model: '', status: 'idle', result: '' },
  { name: 'Logs', method: 'GET', path: '/api/logs', group: 'system', runtime: 'local', model: '', status: 'idle', result: '' },
  { name: 'Devices', method: 'GET', path: '/api/devices', group: 'system', runtime: 'local', model: '', status: 'idle', result: '' },
  { name: 'Get Config', method: 'GET', path: '/api/config', group: 'system', runtime: 'local', model: '', status: 'idle', result: '' },
  { name: 'Put Config', method: 'PUT', path: '/api/config', group: 'system', runtime: 'local', model: '', status: 'idle', result: '' },

  // --- LLM ---
  { name: 'OpenAI Models', method: 'GET', path: '/v1/models', group: 'llm', runtime: 'local', model: 'Ollama', status: 'idle', result: '' },
  { name: 'OpenAI Chat', method: 'POST', path: '/v1/chat/completions', group: 'llm', runtime: 'local', model: 'Ollama', status: 'idle', result: '' },
  { name: 'Anthropic Messages', method: 'POST', path: '/v1/messages', group: 'llm', runtime: 'local', model: 'Ollama', status: 'idle', result: '' },
  { name: 'Chat API (SSE)', method: 'POST', path: '/api/chat', group: 'llm', runtime: 'local', model: 'Ollama', status: 'idle', result: '' },

  // --- Voice ---
  { name: 'Synthesize (TTS)', method: 'POST', path: '/api/synthesize', group: 'voice', runtime: 'cloud', model: 'OpenAI TTS / ElevenLabs', status: 'idle', result: '' },
  { name: 'TTS Alias', method: 'POST', path: '/api/tts', group: 'voice', runtime: 'cloud', model: 'OpenAI TTS / ElevenLabs', status: 'idle', result: '' },
  { name: 'Transcribe (STT)', method: 'POST', path: '/api/transcribe', group: 'voice', runtime: 'local', model: 'Whisper', status: 'idle', result: '' },
  { name: 'Voice (STT→LLM→TTS)', method: 'POST', path: '/api/voice', group: 'voice', runtime: 'local+cloud', model: 'Whisper → Ollama → TTS', status: 'idle', result: '' },

  // --- Models ---
  { name: 'Pull Model', method: 'POST', path: '/api/models/pull', group: 'models', runtime: 'local', model: 'Ollama', status: 'idle', result: '' },
  { name: 'Delete Model', method: 'DELETE', path: '/api/models/dummy', group: 'models', runtime: 'local', model: 'Ollama', status: 'idle', result: '' },
])

const groupLabels = {
  system: '⚙️ System',
  llm: '🧠 LLM Inference',
  voice: '🎙 Voice (TTS / STT)',
  models: '📦 Model Management',
}

const groupedTests = computed(() => {
  const groups = {}
  for (const t of tests.value) {
    if (!groups[t.group]) groups[t.group] = []
    groups[t.group].push(t)
  }
  return Object.entries(groups).map(([key, items]) => ({
    label: groupLabels[key] || key,
    items,
  }))
})

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
  if (t.path === '/api/synthesize' || t.path === '/api/tts') {
    return JSON.stringify({ text: 'hello' })
  }
  if (t.path === '/api/chat') {
    return JSON.stringify({ message: 'hello' })
  }
  if (t.path === '/api/models/pull') {
    // Dry-run: pull a tiny model that's likely already present
    return JSON.stringify({ name: 'qwen3:0.6b' })
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

    // STT needs multipart with audio file
    if (t.path === '/api/transcribe' || t.path === '/api/voice') {
      // Generate a tiny silent WAV for testing
      const wav = createSilentWav()
      const form = new FormData()
      form.append('audio', new Blob([wav], { type: 'audio/wav' }), 'test.wav')
      opts.body = form
      delete opts.headers['Content-Type'] // let browser set multipart boundary
    }

    // Delete model: just test the endpoint responds (will 404 for dummy, that's ok)
    if (t.path === '/api/models/dummy') {
      opts.method = 'DELETE'
    }

    const res = await fetch(t.path, opts)

    if (t.path === '/api/synthesize' || t.path === '/api/tts') {
      if (res.ok) { t.status = 'pass'; t.result = `audio (${res.headers.get('content-type')})` }
      else { const d = await res.json(); t.status = 'fail'; t.result = `${res.status}: ${d.error || 'unknown'}` }
      return
    }
    if (t.path === '/api/chat') {
      if (res.ok) { t.status = 'pass'; t.result = 'SSE stream ok' }
      else { t.status = 'fail'; t.result = `HTTP ${res.status}` }
      return
    }
    if (t.path === '/api/transcribe') {
      if (res.ok) { t.status = 'pass'; t.result = 'STT endpoint ok' }
      else { t.status = 'fail'; t.result = `HTTP ${res.status}` }
      return
    }
    if (t.path === '/api/voice') {
      if (res.ok) { t.status = 'pass'; t.result = 'Voice pipeline ok' }
      else { t.status = 'fail'; t.result = `HTTP ${res.status}` }
      return
    }
    if (t.path === '/api/models/pull') {
      if (res.ok) { t.status = 'pass'; t.result = 'Pull started' }
      else { t.status = 'fail'; t.result = `HTTP ${res.status}` }
      return
    }
    if (t.path === '/api/models/dummy') {
      // 404 is expected for dummy model, endpoint responding = pass
      t.status = 'pass'
      t.result = `Endpoint ok (${res.status})`
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

function createSilentWav() {
  // 16-bit PCM, mono, 16kHz, 0.1s silence
  const samples = 1600
  const buf = new ArrayBuffer(44 + samples * 2)
  const view = new DataView(buf)
  // RIFF header
  writeStr(view, 0, 'RIFF'); view.setUint32(4, 36 + samples * 2, true)
  writeStr(view, 8, 'WAVE'); writeStr(view, 12, 'fmt ')
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true)
  view.setUint32(24, 16000, true); view.setUint32(28, 32000, true)
  view.setUint16(32, 2, true); view.setUint16(34, 16, true)
  writeStr(view, 36, 'data'); view.setUint32(40, samples * 2, true)
  return new Uint8Array(buf)
}
function writeStr(view, offset, str) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
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

.test-group { margin-bottom: 32px; }
.group-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--text); }

.grid { display: grid; gap: 12px; }
.grid-2 { grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); }
.test-card {
  padding: 14px 16px; border-radius: 8px; background: var(--surface-2);
  border: 1px solid var(--border); transition: border-color 0.15s;
}
.test-card.pass { border-left: 3px solid var(--success, #10b981); }
.test-card.fail { border-left: 3px solid var(--error, #ef4444); }
.test-card.running { border-left: 3px solid var(--primary, #3b82f6); }
.test-card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.test-badge {
  width: 20px; height: 20px; border-radius: 50%; display: flex;
  align-items: center; justify-content: center; font-size: 11px; font-weight: 700;
  background: var(--surface-3); color: var(--text-dim);
}
.test-badge.pass { background: rgba(16,185,129,0.15); color: var(--success, #10b981); }
.test-badge.fail { background: rgba(239,68,68,0.15); color: var(--error, #ef4444); }
.test-badge.running { background: rgba(59,130,246,0.15); color: var(--primary, #3b82f6); }
.test-method {
  font-family: 'SF Mono', Monaco, monospace; font-size: 11px; font-weight: 700;
  padding: 2px 6px; border-radius: 3px; background: var(--surface-3);
}
.test-path { font-family: 'SF Mono', Monaco, monospace; font-size: 12px; color: var(--text-dim); }

.test-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap; }
.test-name { font-size: 13px; color: var(--text); font-weight: 500; }
.tag {
  font-size: 11px; padding: 1px 8px; border-radius: 10px; font-weight: 500;
}
.tag.local { background: rgba(16,185,129,0.12); color: #059669; }
.tag.cloud { background: rgba(59,130,246,0.12); color: #2563eb; }
.tag.local\+cloud { background: rgba(168,85,247,0.12); color: #7c3aed; }
.tag.model { background: var(--surface-3); color: var(--text-dim); }

.test-result {
  font-family: 'SF Mono', Monaco, monospace; font-size: 11px; color: var(--text-dim);
  margin: 4px 0; max-height: 60px; overflow: hidden; text-overflow: ellipsis; word-break: break-all;
}
.btn-test {
  margin-top: 6px; padding: 4px 12px; border-radius: 4px; font-size: 12px;
  background: var(--surface-3); border: 1px solid var(--border); cursor: pointer;
}
.btn-test:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
