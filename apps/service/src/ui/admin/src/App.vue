<template>
  <div>
    <nav>
      <router-link to="/admin">状态</router-link>
      <router-link to="/admin/devices">设备</router-link>
      <router-link to="/admin/config">配置</router-link>
    </nav>
    <DeviceList :devices="devices" />
    <HardwarePanel :hardware="hardware" />
    <LogViewer />
    <router-view />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import DeviceList from './components/DeviceList.vue'
import LogViewer from './components/LogViewer.vue'
import HardwarePanel from './components/HardwarePanel.vue'

const devices = ref([])
const hardware = ref({})
let timer = null

async function fetchStatus() {
  try {
    const res = await fetch('/api/status')
    const data = await res.json()
    devices.value = data.devices ?? []
    hardware.value = data.hardware ?? {}
  } catch (e) {}
}

onMounted(() => {
  fetchStatus()
  timer = setInterval(fetchStatus, 5000)
})
onUnmounted(() => clearInterval(timer))
</script>
