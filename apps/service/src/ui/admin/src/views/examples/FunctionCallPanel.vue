<template>
  <div class="fc-panel">
    <p class="hint">输入问题，AI 会自动调用合适的工具</p>
    <div class="fc-tools">
      <span class="fc-tool-tag" v-for="t in fcTools" :key="t.name">🔧 {{ t.name }}</span>
    </div>
    <div class="fc-input-row">
      <input v-model="fcInput" @keydown.enter="sendFc" placeholder="例如：北京天气怎么样" :disabled="fcLoading" />
      <button @click="sendFc" :disabled="fcLoading || !fcInput.trim()" class="btn-primary">发送</button>
    </div>
    <div v-if="fcToolCalls.length" class="fc-calls">
      <div class="fc-call" v-for="(c, i) in fcToolCalls" :key="i">
        <span class="fc-call-name">{{ c.name }}</span>
        <span class="fc-call-args">{{ JSON.stringify(c.args) }}</span>
      </div>
    </div>
    <div v-if="fcResult" class="result-text" style="white-space:pre-wrap;">{{ fcResult }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ai } from './utils.js'

const props = defineProps({ markTested: Function })
const emit = defineEmits(['back'])

const fcTools = ref([
  { name: 'get_weather', description: '获取天气', parameters: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] } },
  { name: 'calculate', description: '数学计算', parameters: { type: 'object', properties: { expression: { type: 'string' } }, required: ['expression'] } },
  { name: 'search_web', description: '搜索网页', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
])
const fcInput = ref('')
const fcResult = ref('')
const fcLoading = ref(false)
const fcToolCalls = ref([])

async function sendFc() {
  const msg = fcInput.value.trim()
  if (!msg || fcLoading.value) return
  fcInput.value = ''
  fcResult.value = ''
  fcToolCalls.value = []
  fcLoading.value = true
  try {
    const tools = fcTools.value.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } }))
    let text = ''
    for await (const chunk of ai.think(msg, { stream: true, tools })) {
      if (chunk.type === 'text_delta') text += chunk.text || ''
      if (chunk.type === 'tool_use') {
        fcToolCalls.value.push({ name: chunk.name, args: chunk.input || '' })
      }
    }
    fcResult.value = text || (fcToolCalls.value.length ? '(AI 调用了工具)' : '(无响应)')
    props.markTested?.('function-call')
  } catch (e) {
    fcResult.value = `错误: ${e.message}`
  }
  fcLoading.value = false
}
</script>

<style scoped>
@import './_shared.css';

.fc-panel { display: flex; flex-direction: column; gap: 16px; }
.fc-tools { display: flex; flex-wrap: wrap; gap: 8px; }
.fc-tool-tag { font-size: 13px; padding: 4px 10px; border-radius: 6px; background: var(--surface-2, #1e293b); color: var(--text-dim); }
.fc-input-row { display: flex; gap: 8px; }
.fc-input-row input {
  flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border, #334155);
  background: var(--surface-2, #1e293b); color: var(--text); font-size: 14px;
}
.fc-calls { display: flex; flex-direction: column; gap: 8px; }
.fc-call { padding: 8px 12px; border-radius: 8px; background: var(--surface-2, #1e293b); font-size: 13px; }
.fc-call-name { color: var(--accent, #3b82f6); font-weight: 600; margin-right: 8px; }
.fc-call-args { color: var(--text-dim); font-family: 'SF Mono', monospace; }
</style>
