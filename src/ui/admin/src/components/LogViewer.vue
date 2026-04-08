<template>
  <div ref="container" style="height:300px;overflow-y:auto;font-family:monospace;font-size:12px">
    <div v-for="(line, i) in logs" :key="i">{{ line }}</div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
const props = defineProps({ logs: { type: Array, default: () => [] } })
const container = ref(null)
watch(() => props.logs, () => nextTick(() => {
  if (container.value) container.value.scrollTop = container.value.scrollHeight
}))
</script>
