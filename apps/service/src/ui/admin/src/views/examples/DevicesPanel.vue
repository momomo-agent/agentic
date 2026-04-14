<template>
  <div class="devices-panel">
    <div class="perf-header">
      <button @click="fetchDevices" :disabled="devicesLoading" class="btn-primary">刷新</button>
    </div>
    <div v-if="devicesLoading && !devicesList.length" class="vp-status">加载中...</div>
    <div v-if="devicesList.length" class="devices-list">
      <div class="device-card" v-for="d in devicesList" :key="d.id">
        <div class="device-id">{{ d.id }}</div>
        <div class="device-type">{{ d.type || '未知' }}</div>
        <div class="device-status" :class="d.status === 'online' ? 'online' : 'offline'">{{ d.status }}</div>
        <div class="device-heartbeat">{{ d.last_heartbeat || '-' }}</div>
      </div>
    </div>
    <div v-if="!devicesLoading && !devicesList.length && !devicesError" class="devices-empty">
      <p>暂无设备连接</p>
      <p class="hint">通过 POST /api/devices/register 注册设备，设备需定期发送心跳到 POST /api/devices/:id/heartbeat</p>
    </div>
    <div v-if="devicesError" class="result-text" style="color:#ef4444;">{{ devicesError }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ai } from './utils.js'

const props = defineProps({ markTested: Function })
defineEmits(['back'])

const devicesList = ref([])
const devicesLoading = ref(false)
const devicesError = ref('')

async function fetchDevices() {
  devicesLoading.value = true
  devicesError.value = ''
  try {
    devicesList.value = await ai.admin.devices()
    props.markTested?.('devices')
  } catch (e) {
    devicesError.value = e.message
  }
  devicesLoading.value = false
}

onMounted(() => fetchDevices())
</script>

<style scoped>
@import './_shared.css';
.devices-panel { display: flex; flex-direction: column; gap: 16px; }
.perf-header { display: flex; align-items: center; gap: 12px; }
.devices-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.device-card { background: var(--surface-2, #1e293b); border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 6px; }
.device-id { font-family: monospace; font-size: 13px; color: var(--text, #e2e8f0); font-weight: 600; }
.device-type { font-size: 12px; color: var(--text-secondary, #94a3b8); }
.device-status { font-size: 12px; padding: 2px 8px; border-radius: 10px; display: inline-block; width: fit-content; }
.device-status.online { background: rgba(34,197,94,0.15); color: #22c55e; }
.device-status.offline { background: rgba(239,68,68,0.15); color: #ef4444; }
.device-heartbeat { font-size: 11px; color: var(--text-secondary, #64748b); }
.devices-empty { text-align: center; padding: 40px 0; color: var(--text-secondary, #94a3b8); }
.hint { font-size: 13px; color: var(--text-secondary, #64748b); }
.vp-status { color: var(--text-secondary, #94a3b8); font-size: 14px; padding: 20px 0; text-align: center; }
</style>
