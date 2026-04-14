<template>
  <div class="compat-panel">
    <div class="compat-tabs">
      <button :class="{ active: compatTab === 'openai' }" @click="compatTab = 'openai'">OpenAI</button>
      <button :class="{ active: compatTab === 'anthropic' }" @click="compatTab = 'anthropic'">Anthropic</button>
    </div>

    <div v-if="compatTab === 'openai'" class="compat-section">
      <div class="compat-endpoint">POST /v1/chat/completions</div>
      <textarea v-model="compatOpenaiBody" rows="8" class="compat-textarea"></textarea>
      <div class="compat-row">
        <label class="compat-toggle"><input type="checkbox" v-model="compatOpenaiStream" /> Stream</label>
        <button @click="sendCompat('openai')" :disabled="compatLoading" class="btn-primary">发送</button>
      </div>
      <pre v-if="compatResult" class="compat-result">{{ compatResult }}</pre>
    </div>

    <div v-if="compatTab === 'anthropic'" class="compat-section">
      <div class="compat-endpoint">POST /v1/messages</div>
      <textarea v-model="compatAnthropicBody" rows="8" class="compat-textarea"></textarea>
      <div class="compat-row">
        <button @click="sendCompat('anthropic')" :disabled="compatLoading" class="btn-primary">发送</button>
      </div>
      <pre v-if="compatResult" class="compat-result">{{ compatResult }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({ markTested: Function })
const emit = defineEmits(['back'])

const compatTab = ref('openai')
const compatOpenaiBody = ref(JSON.stringify({ model: 'default', messages: [{ role: 'user', content: 'Hello' }], stream: false }, null, 2))
const compatOpenaiStream = ref(false)
const compatAnthropicBody = ref(JSON.stringify({ model: 'default', messages: [{ role: 'user', content: 'Hello' }], max_tokens: 256 }, null, 2))
const compatLoading = ref(false)
const compatResult = ref('')

async function sendCompat(provider) {
  compatLoading.value = true
  compatResult.value = ''
  try {
    const url = provider === 'openai' ? '/v1/chat/completions' : '/v1/messages'
    const body = provider === 'openai' ? compatOpenaiBody.value : compatAnthropicBody.value
    const parsed = JSON.parse(body)
    if (provider === 'openai' && compatOpenaiStream.value) parsed.stream = true
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed) })
    if (parsed.stream) {
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let out = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        out += decoder.decode(value)
      }
      compatResult.value = out
    } else {
      compatResult.value = JSON.stringify(await res.json(), null, 2)
    }
  } catch (e) {
    compatResult.value = `错误: ${e.message}`
  }
  compatLoading.value = false
}
</script>

<style scoped>
@import './_shared.css';

.compat-panel { display: flex; flex-direction: column; gap: 16px; }
.compat-tabs { display: flex; gap: 8px; }
.compat-tabs button {
  padding: 8px 16px; border-radius: 8px; border: 1px solid var(--border, #334155);
  background: var(--surface-2, #1e293b); color: var(--text); cursor: pointer; font-size: 13px;
}
.compat-tabs button.active { background: var(--accent, #3b82f6); color: white; border-color: var(--accent); }
.compat-section { display: flex; flex-direction: column; gap: 12px; }
.compat-endpoint { font-size: 13px; color: var(--accent, #3b82f6); font-family: 'SF Mono', monospace; }
.compat-textarea {
  width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border, #334155);
  background: var(--surface-2, #1e293b); color: var(--text); font-size: 13px;
  font-family: 'SF Mono', monospace; resize: vertical;
}
.compat-row { display: flex; gap: 12px; align-items: center; }
.compat-result {
  padding: 12px; border-radius: 8px; background: var(--surface-2, #1e293b);
  font-size: 13px; font-family: 'SF Mono', monospace; white-space: pre-wrap;
  overflow-x: auto; margin: 0;
}
</style>
