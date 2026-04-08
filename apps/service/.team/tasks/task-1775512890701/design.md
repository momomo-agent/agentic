# Design: 修复 App.vue 组件导入和状态轮询

## Files
- `src/ui/admin/App.vue`

## Changes

```vue
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import DeviceList from './components/DeviceList.vue'
import LogViewer from './components/LogViewer.vue'
import HardwarePanel from './components/HardwarePanel.vue'

const devices = ref([])
const hardware = ref({})
let timer = null

async function fetchStatus() {
  const res = await fetch('/api/status')
  const data = await res.json()
  devices.value = data.devices ?? []
  hardware.value = data.hardware ?? {}
}

onMounted(() => {
  fetchStatus()
  timer = setInterval(fetchStatus, 5000)
})
onUnmounted(() => clearInterval(timer))
</script>
```

## Template bindings
```vue
<DeviceList :devices="devices" />
<HardwarePanel :hardware="hardware" />
<LogViewer />
```

## Edge cases
- fetch 失败时不更新状态（catch 静默）
- 组件卸载时必须 clearInterval 防止内存泄漏

## Test cases
- 挂载后 fetchStatus 被调用
- 5秒后再次调用
- 卸载后 interval 清除
