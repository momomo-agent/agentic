<template>
  <div>
    <div v-if="error" class="error">{{ error }}</div>
    <form v-else-if="config" @submit.prevent="save">
      <label>LLM Provider<input v-model="config.llm.provider" /></label>
      <label>STT Provider<input v-model="config.stt.provider" /></label>
      <label>TTS Provider<input v-model="config.tts.provider" /></label>
      <button type="submit">保存</button>
      <span v-if="saved">已保存</span>
    </form>
    <div v-else>加载中...</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
const config = ref(null)
const error = ref(null)
const saved = ref(false)
onMounted(async () => {
  try { config.value = await fetch('/api/config').then(r => r.json()) }
  catch (e) { error.value = e.message }
})
async function save() {
  try {
    await fetch('/api/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config.value) })
    saved.value = true; setTimeout(() => saved.value = false, 2000)
  } catch (e) { error.value = e.message }
}
</script>
