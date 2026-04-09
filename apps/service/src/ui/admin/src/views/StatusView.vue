<template>
  <div class="status-view">
    <h1 class="page-title">系统状态</h1>
    
    <div class="grid grid-2">
      <!-- 硬件信息 -->
      <div class="card">
        <div class="card-title">硬件信息</div>
        <dl class="info-list">
          <div v-for="(v, k) in hardware" :key="k">
            <dt>{{ formatKey(k) }}</dt>
            <dd>{{ v }}</dd>
          </div>
        </dl>
      </div>

      <!-- 性能 -->
      <div class="card">
        <div class="card-title">性能</div>
        <dl class="info-list">
          <div v-for="(v, k) in perf" :key="k">
            <dt>{{ k }}</dt>
            <dd>{{ v }}</dd>
          </div>
        </dl>
      </div>
    </div>

    <!-- 设备列表 -->
    <div class="card" style="margin-top: 24px">
      <div class="card-title">连接设备 ({{ devices.length }})</div>
      <div v-if="devices.length === 0" class="empty">暂无设备连接</div>
      <div v-else class="device-list">
        <div v-for="d in devices" :key="d.id" class="device-item">
          <div class="device-name">{{ d.name || d.id }}</div>
          <div class="device-caps">{{ (d.capabilities || []).join(', ') }}</div>
          <div class="device-time">{{ formatTime(d.lastPong) }}</div>
        </div>
      </div>
    </div>

    <!-- 日志 -->
    <div class="card" style="margin-top: 24px">
      <div class="card-title">日志</div>
      <div class="log-stream">
        <div v-for="(log, i) in logs" :key="i" class="log-line">
          <span class="log-time">{{ formatLogTime(log.ts) }}</span>
          <span class="log-msg">{{ log.msg }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const hardware = ref({})
const devices = ref([])
const perf = ref({})
const logs = ref([])
let timer = null

async function fetchData() {
  try {
    const [statusRes, perfRes, logsRes] = await Promise.all([
      fetch('/api/status').then(r => r.json()),
      fetch('/api/perf').then(r => r.json()),
      fetch('/api/logs').then(r => r.json())
    ])
    hardware.value = statusRes.hardware || {}
    devices.value = statusRes.devices || []
    perf.value = perfRes
    logs.value = logsRes
  } catch (e) {
    console.error('fetch failed:', e)
  }
}

function formatKey(k) {
  const map = { platform: '平台', arch: '架构', cpus: 'CPU核心', totalMemory: '内存', freeMemory: '可用内存' }
  return map[k] || k
}

function formatTime(ts) {
  if (!ts) return '-'
  const d = new Date(ts)
  return d.toLocaleTimeString('zh-CN')
}

function formatLogTime(ts) {
  const d = new Date(ts)
  return d.toLocaleTimeString('zh-CN', { hour12: false })
}

onMounted(() => {
  fetchData()
  timer = setInterval(fetchData, 3000)
})
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.page-title { font-size: 28px; font-weight: 700; margin-bottom: 24px; }
.info-list { display: flex; flex-direction: column; gap: 12px; }
.info-list > div { display: flex; justify-content: space-between; }
.info-list dt { color: var(--text-dim); font-size: 14px; }
.info-list dd { font-weight: 500; }
.empty { color: var(--text-dim); font-size: 14px; text-align: center; padding: 32px; }
.device-list { display: flex; flex-direction: column; gap: 12px; }
.device-item {
  padding: 12px; background: var(--surface-2); border-radius: 6px;
  display: flex; gap: 16px; align-items: center;
}
.device-name { font-weight: 500; flex: 1; }
.device-caps { font-size: 13px; color: var(--text-dim); }
.device-time { font-size: 12px; color: var(--text-dim); }
.log-stream {
  max-height: 300px; overflow-y: auto;
  font-family: 'SF Mono', Monaco, monospace; font-size: 13px;
  background: var(--surface-2); padding: 12px; border-radius: 6px;
}
.log-line { display: flex; gap: 12px; padding: 2px 0; }
.log-time { color: var(--text-dim); flex-shrink: 0; }
.log-msg { color: var(--text); }
</style>
