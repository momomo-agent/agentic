<template>
  <div>
    <div v-if="error" class="error">{{ error }}</div>
    <div v-else-if="status">
      <h2>硬件信息</h2>
      <pre>{{ JSON.stringify(status.hardware, null, 2) }}</pre>
      <h2>当前 Profile</h2>
      <pre>{{ JSON.stringify(status.profile, null, 2) }}</pre>
    </div>
    <div v-else>加载中...</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
const status = ref(null)
const error = ref(null)
onMounted(async () => {
  try { status.value = await fetch('/api/status').then(r => r.json()) }
  catch (e) { error.value = e.message }
})
</script>
