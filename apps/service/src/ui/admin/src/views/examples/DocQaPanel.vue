<template>
  <div class="docqa-panel">
    <div class="docqa-controls">
      <textarea v-model="docqaDoc" placeholder="粘贴文档内容..." rows="6"></textarea>
      <div class="docqa-question-row">
        <input v-model="docqaQuestion" @keydown.enter="runDocQa" placeholder="输入问题..." :disabled="docqaLoading" />
        <button @click="runDocQa" :disabled="!docqaDoc.trim() || !docqaQuestion.trim() || docqaLoading">
          {{ docqaLoading ? '回答中...' : '🔍 提问' }}
        </button>
      </div>
    </div>
    <div class="docqa-result" v-if="docqaResult">
      <div class="result-label">回答</div>
      <div class="result-text">{{ docqaResult }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ai } from './utils.js'

const props = defineProps({ markTested: Function })
const emit = defineEmits(['back'])

const docqaDoc = ref('')
const docqaQuestion = ref('')
const docqaResult = ref('')
const docqaLoading = ref(false)

async function runDocQa() {
  if (!docqaDoc.value.trim() || !docqaQuestion.value.trim() || docqaLoading.value) return
  docqaLoading.value = true
  docqaResult.value = ''

  const prompt = `基于以下文档回答问题：\n\n文档：${docqaDoc.value}\n\n问题：${docqaQuestion.value}`
  try {
    for await (const chunk of ai.think(prompt, { stream: true })) {
      if (chunk.type === 'text_delta') docqaResult.value += chunk.text || ''
    }
    props.markTested?.('doc-qa')
  } catch (e) {
    docqaResult.value = `错误: ${e.message}`
  }
  docqaLoading.value = false
}
</script>

<style scoped>
@import './_shared.css';

.docqa-panel { display: flex; flex-direction: column; gap: 16px; }
.docqa-controls { display: flex; flex-direction: column; gap: 12px; }
.docqa-controls textarea {
  width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border, #334155);
  background: var(--surface-2, #1e293b); color: var(--text); font-size: 14px;
  resize: vertical; font-family: inherit;
}
.docqa-question-row { display: flex; gap: 8px; }
.docqa-question-row input {
  flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border, #334155);
  background: var(--surface-2, #1e293b); color: var(--text); font-size: 14px;
}
.docqa-question-row button {
  padding: 10px 20px; border-radius: 8px; border: none;
  background: var(--accent, #3b82f6); color: white; cursor: pointer; font-size: 14px; white-space: nowrap;
}
.docqa-question-row button:disabled { opacity: 0.5; cursor: not-allowed; }
.docqa-result {
  background: var(--surface-2, #1e293b); border-radius: 10px; padding: 16px;
}
</style>
