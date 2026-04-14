<template>
  <div class="structured-panel">
    <div class="structured-controls">
      <textarea v-model="structuredInput" placeholder="输入文本，AI 会提取结构化信息..." rows="4"></textarea>
      <div class="structured-format">
        <label>输出格式：</label>
        <select v-model="structuredFormat">
          <option value="json">JSON</option>
          <option value="summary">摘要</option>
          <option value="entities">实体提取</option>
          <option value="sentiment">情感分析</option>
        </select>
      </div>
      <button @click="runStructured" :disabled="!structuredInput.trim() || structuredLoading">
        {{ structuredLoading ? '处理中...' : '🚀 处理' }}
      </button>
    </div>
    <div class="structured-result" v-if="structuredResult">
      <div class="result-label">结果</div>
      <pre class="result-code">{{ structuredResult }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ai } from './utils.js'

const props = defineProps({ markTested: Function })
const emit = defineEmits(['back'])

const structuredInput = ref('')
const structuredFormat = ref('json')
const structuredResult = ref('')
const structuredLoading = ref(false)

const formatPrompts = {
  json: 'Extract all key information from the following text and return as a JSON object. Text: ',
  summary: 'Summarize the following text in 2-3 sentences. Text: ',
  entities: 'Extract all named entities (people, places, organizations, dates) from the following text. Return as a list. Text: ',
  sentiment: 'Analyze the sentiment of the following text. Return the overall sentiment (positive/negative/neutral) with confidence score and key phrases. Text: '
}

async function runStructured() {
  if (!structuredInput.value.trim() || structuredLoading.value) return
  structuredLoading.value = true
  structuredResult.value = ''

  const prompt = formatPrompts[structuredFormat.value] + structuredInput.value
  try {
    for await (const chunk of ai.think(prompt, { stream: true })) {
      if (chunk.type === 'text_delta') structuredResult.value += chunk.text || ''
    }
    props.markTested?.('structured')
  } catch (e) {
    structuredResult.value = `错误: ${e.message}`
  }
  structuredLoading.value = false
}
</script>

<style scoped>
@import './_shared.css';

.structured-panel { display: flex; flex-direction: column; gap: 16px; }
.structured-controls { display: flex; flex-direction: column; gap: 12px; }
.structured-controls textarea {
  width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border, #334155);
  background: var(--surface-2, #1e293b); color: var(--text); font-size: 14px;
  resize: vertical; font-family: inherit;
}
.structured-format { display: flex; align-items: center; gap: 8px; }
.structured-format label { font-size: 13px; color: var(--text-dim); }
.structured-format select {
  padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border, #334155);
  background: var(--surface-2, #1e293b); color: var(--text); font-size: 13px;
}
.structured-controls button {
  align-self: flex-start; padding: 10px 24px; border-radius: 8px; border: none;
  background: var(--accent, #3b82f6); color: white; cursor: pointer; font-size: 14px;
}
.structured-controls button:disabled { opacity: 0.5; cursor: not-allowed; }
.structured-result {
  background: var(--surface-2, #1e293b); border-radius: 10px; padding: 16px;
}
</style>
