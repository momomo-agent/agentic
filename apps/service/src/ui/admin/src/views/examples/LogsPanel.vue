<template>
  <div class="logs-panel">
    <div class="perf-header">
      <button @click="fetchLogs" :disabled="logsLoading" class="btn-primary">刷新</button>
      <label class="compat-toggle"><input type="checkbox" v-model="logsAuto" @change="toggleLogsAuto" /> 自动刷新 (5s)</label>
    </div>
    <div v-if="logsLoading && !logsList.length" class="vp-status">加载中...</div>
    <div class="logs-terminal" v-if="logsList.length">
      <div class="log-line" v-for="(l, i) in logsList" :key="i">
        <span class="log-ts">{{ l.timestamp || l.ts || '' }}</span>
        <span class="log-content">{{ l.message || l.content || JSON.stringify(l) }}</span>
      </div>
    </div>
    <div v-if="!logsLoading && !logsList.length && !logsError" class="hint" style="padding:20px;">暂无日志</div>
    <div v-if="logsError" class="result-text" style="color:#ef4444;">{{ logsError }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { ai } from './utils.js'

const props = defineProps({ markTested: Function })
defineEmits(['back'])

const logsList = ref([])
const logsLoading = ref(false)
const logsError = ref('')
const logsAuto = ref(false)
let logsTimer = null

async function fetchLogs() {
  logsLoading.value = true
  logsError.value = ''
  try {
    logsList.value = await ai.admin.logs()
    props.markTested?.('logs')
  } catch (e) {
    logsError.value = e.message
  }
  logsLoading.value = false
}

function toggleLogsAuto() {
  if (logsAuto.value) {
    fetchLogs()
    logsTimer = setInterval(fetchLogs, 5000)
  } else {
    clearInterval(logsTimer)
  }
}

onMounted(() => fetchLogs())
onUnmounted(() => clearInterval(logsTimer))
</script>

<style scoped>
@import './_shared.css';
.logs-panel { display: flex; flex-direction: column; gap: 16px; }
.perf-header { display: flex; align-items: center; gap: 12px; }
.logs-terminal { background: #0a0a0a; border-radius: 10px; padding: 16px; max-height: 500px; overflow-y: auto; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px; }
.log-line { display: flex; gap: 12px; padding: 3px 0; border-bottom: 1px solid rgba(255,255,255,0.03); }
.log-ts { color: var(--text-secondary, #64748b); flex-shrink: 0; min-width: 80px; }
.log-content { color: var(--text, #e2e8f0); word-break: break-all; }
.compat-toggle { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-secondary, #94a3b8); cursor: pointer; }
.hint { font-size: 13px; color: var(--text-secondary, #64748b); text-align: center; }
.vp-status { color: var(--text-secondary, #94a3b8); font-size: 14px; padding: 20px 0; text-align: center; }
</style>
