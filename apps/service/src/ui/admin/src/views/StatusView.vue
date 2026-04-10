<template>
  <div class="status-view">
    <h1 class="page-title">系统状态</h1>

    <div class="grid grid-2">
      <!-- 服务状态 -->
      <div class="card">
        <div class="card-title">服务</div>
        <div class="service-list">
          <div class="service-item">
            <div class="service-info">
              <div class="status-dot on"></div>
              <span class="service-name">Agentic Service</span>
            </div>
            <span class="service-detail">:1234</span>
          </div>
          <div class="service-item">
            <div class="service-info">
              <div class="status-dot" :class="status.ollama?.running ? 'on' : 'off'"></div>
              <span class="service-name">Ollama</span>
            </div>
            <span class="service-detail">:11434 · {{ status.ollama?.models?.length || 0 }} 模型</span>
          </div>
          <div class="service-item">
            <div class="service-info">
              <div class="status-dot" :class="sttOk ? 'on' : 'off'"></div>
              <span class="service-name">STT ({{ config.stt?.provider || 'whisper' }})</span>
            </div>
            <span class="service-detail">{{ sttOk ? '就绪' : '未配置' }}</span>
          </div>
          <div class="service-item">
            <div class="service-info">
              <div class="status-dot" :class="ttsOk ? 'on' : 'off'"></div>
              <span class="service-name">TTS ({{ config.tts?.provider || 'coqui' }})</span>
            </div>
            <span class="service-detail">{{ ttsOk ? '就绪' : '未配置' }}</span>
          </div>
        </div>
      </div>

      <!-- 硬件 -->
      <div class="card">
        <div class="card-title">硬件</div>
        <dl class="info-list">
          <div v-if="hw.platform"><dt>平台</dt><dd>{{ hw.platform }} {{ hw.arch }}</dd></div>
          <div v-if="hw.cpu"><dt>CPU</dt><dd>{{ hw.cpu.model || '' }} · {{ hw.cpu.cores }} 核</dd></div>
          <div v-if="hw.memory"><dt>内存</dt><dd>{{ hw.memory }} GB</dd></div>
          <div v-if="hw.gpu"><dt>GPU</dt><dd>{{ hw.gpu.type === 'apple-silicon' ? 'Apple Silicon (统一内存)' : hw.gpu.type }}</dd></div>
        </dl>
      </div>
    </div>

    <!-- 下载进度 -->
    <div class="card download-card" style="margin-top: 24px" v-if="download.inProgress">
      <div class="card-title">⬇️ 正在下载模型</div>
      <div class="download-info">
        <span class="download-model">{{ download.model }}</span>
        <span class="download-status">{{ download.status }}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: downloadPct + '%' }"></div>
      </div>
      <div class="download-detail">
        <span>{{ downloadPct }}%</span>
        <span v-if="download.total">{{ (download.total / 1e9).toFixed(1) }} GB</span>
      </div>
    </div>

    <div class="grid grid-2" style="margin-top: 24px">
      <!-- 当前配置概览 -->
      <div class="card">
        <div class="card-title">当前配置</div>
        <dl class="info-list">
          <div>
            <dt>LLM</dt>
            <dd>{{ slotDisplay('chat') }}</dd>
          </div>
          <div v-if="slotDisplay('chatFallback')">
            <dt>Fallback</dt>
            <dd>{{ slotDisplay('chatFallback') }}</dd>
          </div>
          <div>
            <dt>STT</dt>
            <dd>{{ slotDisplay('stt') || config.stt?.provider || 'whisper' }}</dd>
          </div>
          <div>
            <dt>TTS</dt>
            <dd>{{ slotDisplay('tts') || config.tts?.provider || 'kokoro' }}</dd>
          </div>
        </dl>
      </div>

      <!-- 性能指标 -->
      <div class="card">
        <div class="card-title">性能指标</div>
        <dl class="info-list" v-if="Object.keys(perf).length">
          <div v-for="(v, k) in perf" :key="k">
            <dt>{{ k }}</dt>
            <dd>{{ typeof v === 'number' ? v.toFixed(1) + 'ms' : v }}</dd>
          </div>
        </dl>
        <div v-else class="empty">暂无数据</div>
      </div>
    </div>

    <div class="grid grid-2" style="margin-top: 24px">
      <!-- Ollama 模型 -->
      <div class="card">
        <div class="card-title">Ollama 模型</div>
        <div v-if="status.ollama?.models?.length" class="model-list">
          <div v-for="m in status.ollama.models" :key="m.name || m" class="model-item">
            <span class="model-name">{{ m.name || m }}</span>
            <span class="model-size" v-if="m.size">{{ (m.size / 1e9).toFixed(1) }} GB</span>
          </div>
        </div>
        <div v-else class="empty">{{ status.ollama?.running ? '无已加载模型' : 'Ollama 未运行' }}</div>
      </div>

      <!-- 已连接设备 -->
      <div class="card">
        <div class="card-title">已连接设备</div>
        <div v-if="devices.length" class="device-list">
          <div v-for="d in devices" :key="d.id || d.name" class="device-item">
            <div class="service-info">
              <div class="status-dot on"></div>
              <span class="device-name">{{ d.name || d.id || '未知设备' }}</span>
            </div>
            <span class="device-detail">{{ d.type || '' }}{{ d.ip ? ' · ' + d.ip : '' }}</span>
          </div>
        </div>
        <div v-else class="empty">无设备连接</div>
      </div>
    </div>

    <!-- 实时日志 -->
    <div class="card" style="margin-top: 24px">
      <div class="card-header">
        <div class="card-title">日志 <span class="log-count">最近 {{ logs.length }} 条</span></div>
        <button class="btn-small" @click="fetchData">🔄</button>
      </div>
      <div class="log-stream" ref="logEl">
        <div v-if="logs.length === 0" class="empty">暂无日志</div>
        <div v-for="(log, i) in logs" :key="i" class="log-line" :class="log.level">
          <span class="log-time">{{ formatLogTime(log.ts) }}</span>
          <span class="log-level-tag" :class="log.level">{{ log.level || 'info' }}</span>
          <span class="log-msg">{{ log.msg }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'

const status = ref({})
const config = ref({})
const pool = ref([])
const hw = ref({})
const perf = ref({})
const logs = ref([])
const devices = ref([])
const logEl = ref(null)
const download = ref({ inProgress: false })
let timer = null
let logTimer = null
let deviceTimer = null

const sttOk = ref(false)
const ttsOk = ref(false)

function slotDisplay(slot) {
  const id = config.value.assignments?.[slot]
  if (!id) return ''
  const entry = pool.value.find(p => p.id === id)
  if (!entry) return id
  return `${entry.provider} / ${entry.name}`
}

const downloadPct = computed(() => {
  if (!download.value.total) return 0
  return Math.round(download.value.progress / download.value.total * 100)
})

async function fetchData() {
  try {
    const [statusRes, perfRes, logsRes, cfgRes, poolRes] = await Promise.all([
      fetch('/api/status').then(r => r.json()),
      fetch('/api/perf').then(r => r.json()),
      fetch('/api/logs').then(r => r.json()),
      fetch('/api/config').then(r => r.json()),
      fetch('/api/model-pool').then(r => r.json()).catch(() => []),
    ])
    status.value = statusRes
    hw.value = statusRes.hardware || {}
    download.value = statusRes.download || { inProgress: false }
    perf.value = perfRes
    logs.value = Array.isArray(logsRes) ? logsRes.slice(-50) : []
    config.value = cfgRes
    pool.value = Array.isArray(poolRes) ? poolRes : []

    const sttProvider = cfgRes.stt?.provider || 'whisper'
    sttOk.value = ['whisper', 'sensevoice'].includes(sttProvider) || !!cfgRes.stt?.apiKey
    const ttsProvider = cfgRes.tts?.provider || (navigator.platform?.includes('Mac') ? 'macos-say' : 'coqui')
    ttsOk.value = ['macos-say', 'kokoro', 'piper', 'coqui'].includes(ttsProvider) || !!cfgRes.tts?.apiKey

    await nextTick()
    if (logEl.value) logEl.value.scrollTop = logEl.value.scrollHeight
  } catch (e) {
    console.error('fetch failed:', e)
  }
}

async function fetchLogs() {
  try {
    const logsRes = await fetch('/api/logs').then(r => r.json())
    logs.value = Array.isArray(logsRes) ? logsRes.slice(-50) : []
    await nextTick()
    if (logEl.value) logEl.value.scrollTop = logEl.value.scrollHeight
  } catch {}
}

async function fetchDevices() {
  try {
    const res = await fetch('/api/devices').then(r => r.json())
    devices.value = Array.isArray(res) ? res : []
  } catch {}
}

function formatLogTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('zh-CN', { hour12: false })
}

onMounted(() => {
  fetchData()
  fetchDevices()
  timer = setInterval(fetchData, 5000)
  logTimer = setInterval(fetchLogs, 3000)
  deviceTimer = setInterval(fetchDevices, 5000)
})
onUnmounted(() => {
  clearInterval(timer)
  clearInterval(logTimer)
  clearInterval(deviceTimer)
})
</script>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }

.service-list { display: flex; flex-direction: column; gap: 12px; }
.service-item { display: flex; justify-content: space-between; align-items: center; }
.service-info { display: flex; align-items: center; gap: 10px; }
.service-name { font-size: 14px; font-weight: 500; }
.service-detail { font-size: 13px; color: var(--text-dim); }
.status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.status-dot.on { background: var(--success, #10b981); }
.status-dot.off { background: var(--error, #ef4444); }

.info-list { display: flex; flex-direction: column; gap: 10px; }
.info-list > div { display: flex; justify-content: space-between; }
.info-list dt { color: var(--text-dim); font-size: 14px; }
.info-list dd { font-weight: 500; font-size: 14px; }

.empty { color: var(--text-dim); font-size: 14px; text-align: center; padding: 24px; }

.model-list { display: flex; flex-direction: column; gap: 8px; }
.model-item { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; }
.model-name { font-size: 14px; font-weight: 500; font-family: 'SF Mono', Monaco, monospace; }
.model-size { font-size: 13px; color: var(--text-dim); }

.device-list { display: flex; flex-direction: column; gap: 10px; }
.device-item { display: flex; justify-content: space-between; align-items: center; }
.device-name { font-size: 14px; font-weight: 500; }
.device-detail { font-size: 13px; color: var(--text-dim); }

.log-count { font-size: 12px; font-weight: 400; color: var(--text-dim); margin-left: 8px; }

.log-stream {
  max-height: 300px; overflow-y: auto;
  font-family: 'SF Mono', Monaco, monospace; font-size: 13px;
  background: var(--surface, #1a1a1a); padding: 12px; border-radius: 6px;
}
.log-line { display: flex; gap: 8px; padding: 2px 0; align-items: baseline; }
.log-line.error .log-msg { color: var(--error, #ef4444); }
.log-line.warn .log-msg { color: #f59e0b; }
.log-time { color: var(--text-dim); flex-shrink: 0; }
.log-msg { color: var(--text); word-break: break-all; }
.log-level-tag {
  font-size: 11px; font-weight: 600; padding: 1px 5px; border-radius: 3px;
  flex-shrink: 0; text-transform: uppercase;
  background: rgba(255,255,255,0.06); color: var(--text-dim);
}
.log-level-tag.error { background: rgba(239,68,68,0.15); color: var(--error, #ef4444); }
.log-level-tag.warn { background: rgba(245,158,11,0.15); color: #f59e0b; }

.btn-small {
  padding: 4px 10px; border-radius: 4px; font-size: 12px;
  background: var(--surface-3, #374151); color: var(--text); border: none; cursor: pointer;
}

.download-card { border: 1px solid var(--accent, #3b82f6); }
.download-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.download-model { font-weight: 600; font-size: 15px; }
.download-status { font-size: 13px; color: var(--text-dim); }
.progress-bar {
  height: 6px; background: var(--surface-3, #374151); border-radius: 3px; overflow: hidden;
}
.progress-fill {
  height: 100%; background: var(--accent, #3b82f6); border-radius: 3px;
  transition: width 0.3s ease;
}
.download-detail {
  display: flex; justify-content: space-between; margin-top: 8px;
  font-size: 13px; color: var(--text-dim);
}
</style>
