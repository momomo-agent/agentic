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
              <div class="status-dot" :class="true ? 'on' : 'off'"></div>
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

    <!-- 当前配置概览 -->
    <div class="card" style="margin-top: 24px">
      <div class="card-title">当前配置</div>
      <dl class="info-list">
        <div>
          <dt>LLM</dt>
          <dd>{{ config.llm?.provider || 'ollama' }} / {{ config.llm?.model || 'gemma4:e4b' }}</dd>
        </div>
        <div v-if="config.fallback?.provider">
          <dt>Fallback</dt>
          <dd>{{ config.fallback.provider }} / {{ config.fallback.model || '默认' }}</dd>
        </div>
        <div>
          <dt>STT</dt>
          <dd>{{ config.stt?.provider || 'whisper' }}</dd>
        </div>
        <div>
          <dt>TTS</dt>
          <dd>{{ config.tts?.provider || 'coqui' }}</dd>
        </div>
      </dl>
    </div>

    <!-- 性能 -->
    <div class="card" style="margin-top: 24px" v-if="Object.keys(perf).length">
      <div class="card-title">性能指标</div>
      <dl class="info-list">
        <div v-for="(v, k) in perf" :key="k">
          <dt>{{ k }}</dt>
          <dd>{{ typeof v === 'number' ? v.toFixed(1) + 'ms' : v }}</dd>
        </div>
      </dl>
    </div>

    <!-- 日志 -->
    <div class="card" style="margin-top: 24px">
      <div class="card-header">
        <div class="card-title">日志</div>
        <button class="btn-small" @click="fetchData">🔄</button>
      </div>
      <div class="log-stream" ref="logEl">
        <div v-if="logs.length === 0" class="empty">暂无日志</div>
        <div v-for="(log, i) in logs" :key="i" class="log-line" :class="log.level">
          <span class="log-time">{{ formatLogTime(log.ts) }}</span>
          <span class="log-msg">{{ log.msg }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const status = ref({})
const config = ref({})
const hw = ref({})
const perf = ref({})
const logs = ref([])
const logEl = ref(null)
let timer = null

const sttOk = ref(false)
const ttsOk = ref(false)

async function fetchData() {
  try {
    const [statusRes, perfRes, logsRes, cfgRes] = await Promise.all([
      fetch('/api/status').then(r => r.json()),
      fetch('/api/perf').then(r => r.json()),
      fetch('/api/logs').then(r => r.json()),
      fetch('/api/config').then(r => r.json()),
    ])
    status.value = statusRes
    hw.value = statusRes.hardware || {}
    perf.value = perfRes
    logs.value = logsRes
    config.value = cfgRes

    // Determine STT/TTS status
    const sttProvider = cfgRes.stt?.provider || 'whisper'
    sttOk.value = sttProvider === 'whisper' || !!cfgRes.stt?.apiKey
    const ttsProvider = cfgRes.tts?.provider || 'coqui'
    ttsOk.value = ['kokoro', 'piper', 'coqui'].includes(ttsProvider) || !!cfgRes.tts?.apiKey
  } catch (e) {
    console.error('fetch failed:', e)
  }
}

function formatLogTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('zh-CN', { hour12: false })
}

onMounted(() => {
  fetchData()
  timer = setInterval(fetchData, 5000)
})
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.page-title { font-size: 28px; font-weight: 700; margin-bottom: 24px; }

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

.log-stream {
  max-height: 300px; overflow-y: auto;
  font-family: 'SF Mono', Monaco, monospace; font-size: 13px;
  background: var(--surface-2, #1e1e1e); padding: 12px; border-radius: 6px;
}
.log-line { display: flex; gap: 12px; padding: 2px 0; }
.log-line.error .log-msg { color: var(--error, #ef4444); }
.log-line.warn .log-msg { color: #f59e0b; }
.log-time { color: var(--text-dim); flex-shrink: 0; }
.log-msg { color: var(--text); word-break: break-all; }

.btn-small {
  padding: 4px 10px; border-radius: 4px; font-size: 12px;
  background: var(--surface-3, #374151); color: var(--text); border: none; cursor: pointer;
}
</style>
