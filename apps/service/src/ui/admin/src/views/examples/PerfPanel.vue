<template>
  <div class="perf-panel">
    <div class="perf-header">
      <button @click="fetchPerf" :disabled="perfLoading" class="btn-primary">刷新</button>
      <label class="compat-toggle"><input type="checkbox" v-model="perfAuto" @change="togglePerfAuto" /> 自动刷新 (3s)</label>
    </div>
    <div v-if="perfLoading && !perfData" class="vp-status">加载中...</div>
    <div v-if="perfData" class="perf-table">
      <div class="perf-row perf-row-header">
        <span class="perf-col-name">API</span>
        <span class="perf-col-num">调用次数</span>
        <span class="perf-col-num">平均延迟</span>
        <span class="perf-col-num">P95</span>
        <span class="perf-col-bar">延迟分布</span>
      </div>
      <div class="perf-row" v-for="(m, key) in perfData" :key="key">
        <span class="perf-col-name">{{ key }}</span>
        <span class="perf-col-num">{{ m.count }}</span>
        <span class="perf-col-num">{{ m.avg_ms?.toFixed(1) ?? '-' }} ms</span>
        <span class="perf-col-num">{{ m.p95_ms?.toFixed(1) ?? '-' }} ms</span>
        <span class="perf-col-bar"><div class="perf-bar" :style="{ width: Math.min((m.avg_ms || 0) / perfMaxMs * 100, 100) + '%' }"></div></span>
      </div>
    </div>
    <div v-if="perfError" class="result-text" style="color:#ef4444;">{{ perfError }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { ai } from './utils.js'

const props = defineProps({ markTested: Function })
defineEmits(['back'])

const perfData = ref(null)
const perfLoading = ref(false)
const perfError = ref('')
const perfAuto = ref(false)
const perfMaxMs = ref(1000)
let perfTimer = null

async function fetchPerf() {
  perfLoading.value = true
  perfError.value = ''
  try {
    perfData.value = await ai.admin.perf()
    const maxVal = Math.max(...Object.values(perfData.value).map(m => m.avg_ms || 0), 100)
    perfMaxMs.value = maxVal
    props.markTested?.('perf')
  } catch (e) {
    perfError.value = e.message
  }
  perfLoading.value = false
}

function togglePerfAuto() {
  if (perfAuto.value) {
    fetchPerf()
    perfTimer = setInterval(fetchPerf, 3000)
  } else {
    clearInterval(perfTimer)
  }
}

onMounted(() => fetchPerf())
onUnmounted(() => clearInterval(perfTimer))
</script>

<style scoped>
@import './_shared.css';
.perf-panel { display: flex; flex-direction: column; gap: 16px; }
.perf-header { display: flex; align-items: center; gap: 12px; }
.perf-table { display: flex; flex-direction: column; gap: 2px; }
.perf-row { display: grid; grid-template-columns: 180px 80px 100px 80px 1fr; gap: 8px; align-items: center; padding: 8px 12px; border-radius: 6px; font-size: 13px; }
.perf-row-header { font-weight: 600; color: var(--text-secondary, #94a3b8); font-size: 12px; text-transform: uppercase; }
.perf-row:not(.perf-row-header) { background: var(--surface-2, #1e293b); }
.perf-col-name { font-family: monospace; color: var(--text, #e2e8f0); }
.perf-col-num { text-align: right; color: var(--text-secondary, #94a3b8); }
.perf-col-bar { position: relative; height: 6px; background: var(--surface-3, #374151); border-radius: 3px; overflow: hidden; }
.perf-bar { height: 100%; background: var(--accent, #3b82f6); border-radius: 3px; transition: width 0.3s; }
.compat-toggle { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-secondary, #94a3b8); cursor: pointer; }
.vp-status { color: var(--text-secondary, #94a3b8); font-size: 14px; padding: 20px 0; text-align: center; }
</style>
