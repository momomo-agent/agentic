<template>
  <div class="config-view">
    <h1 class="page-title">配置</h1>
    <div class="card">
      <div class="card-title">服务配置</div>
      <div v-if="loading" class="empty">加载中...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <form v-else @submit.prevent="save" class="config-form">
        <div class="field">
          <label>LLM Provider</label>
          <select v-model="config.llm.provider">
            <option value="ollama">Ollama (本地)</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
          </select>
        </div>
        <div class="field" v-if="config.llm.provider !== 'ollama'">
          <label>LLM API Key</label>
          <input v-model="config.llm.apiKey" type="password" placeholder="sk-..." />
        </div>
        <div class="field">
          <label>STT Provider</label>
          <select v-model="config.stt.provider">
            <option value="whisper">Whisper (本地)</option>
            <option value="deepgram">Deepgram</option>
          </select>
        </div>
        <div class="field">
          <label>TTS Provider</label>
          <select v-model="config.tts.provider">
            <option value="coqui">Coqui (本地)</option>
            <option value="elevenlabs">ElevenLabs</option>
          </select>
        </div>
        <div class="actions">
          <button type="submit" :disabled="saving">{{ saving ? '保存中...' : '保存配置' }}</button>
          <span v-if="saved" class="saved-msg">✓ 已保存</span>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const config = ref({ llm: { provider: 'ollama' }, stt: { provider: 'whisper' }, tts: { provider: 'coqui' } })
const loading = ref(true)
const saving = ref(false)
const saved = ref(false)
const error = ref(null)

onMounted(async () => {
  try {
    const data = await fetch('/api/config').then(r => r.json())
    config.value = { llm: { provider: 'ollama' }, stt: { provider: 'whisper' }, tts: { provider: 'coqui' }, ...data }
  } catch (e) { error.value = e.message }
  finally { loading.value = false }
})

async function save() {
  saving.value = true
  try {
    await fetch('/api/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config.value) })
    saved.value = true
    setTimeout(() => saved.value = false, 2000)
  } catch (e) { error.value = e.message }
  finally { saving.value = false }
}
</script>

<style scoped>
.page-title { font-size: 28px; font-weight: 700; margin-bottom: 24px; }
.config-form { display: flex; flex-direction: column; gap: 20px; }
.field { display: flex; flex-direction: column; gap: 8px; }
.field label { font-size: 14px; color: var(--text-dim); }
.actions { display: flex; align-items: center; gap: 16px; padding-top: 8px; }
.saved-msg { color: var(--success); font-size: 14px; }
.empty { color: var(--text-dim); padding: 32px; text-align: center; }
.error { color: var(--error); padding: 16px; }
</style>
