<template>
  <div class="annotate-panel">
    <div class="ann-layout">
      <div class="ann-image-area" @click="$refs.annFileInput.click()" @dragover.prevent @drop.prevent="handleAnnDrop">
        <input ref="annFileInput" type="file" accept="image/*" @change="handleAnnFile" hidden />
        <div v-if="!annImage" class="upload-placeholder">
          <span class="upload-icon">🖼️</span>
          <span>点击或拖拽上传图片</span>
        </div>
        <img v-else :src="annImage" class="preview-img" />
      </div>
      <div class="ann-result-area">
        <button @click="runAnnotate" :disabled="!annImage || annLoading" class="btn-primary" style="align-self: flex-start;">
          {{ annLoading ? '分析中...' : '✏️ AI 批注' }}
        </button>
        <div class="result-text" v-if="annResult" style="white-space: pre-wrap;">{{ annResult }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ai } from './utils.js'

const props = defineProps({ markTested: Function })
const emit = defineEmits(['back'])

const annImage = ref('')
const annResult = ref('')
const annLoading = ref(false)

function handleAnnFile(e) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => { annImage.value = reader.result; annResult.value = '' }
  reader.readAsDataURL(file)
}

function handleAnnDrop(e) {
  const file = e.dataTransfer.files[0]
  if (!file || !file.type.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = () => { annImage.value = reader.result; annResult.value = '' }
  reader.readAsDataURL(file)
}

async function runAnnotate() {
  if (!annImage.value || annLoading.value) return
  annLoading.value = true
  annResult.value = ''

  try {
    for await (const chunk of ai.see(annImage.value, '详细描述图片中每个区域的内容，用编号列出', { stream: true })) {
      if (chunk.type === 'text_delta') annResult.value += chunk.text || ''
      if (chunk.type === 'error') { annResult.value = `错误: ${chunk.error}`; break }
    }
    props.markTested?.('annotate')
  } catch (e) {
    annResult.value = `错误: ${e.message}`
  }
  annLoading.value = false
}
</script>

<style scoped>
@import './_shared.css';

.annotate-panel { display: flex; flex-direction: column; gap: 16px; }
.ann-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; min-height: 400px; }
.ann-image-area {
  border: 2px dashed var(--border, #334155); border-radius: 10px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; overflow: hidden;
}
.ann-image-area .preview-img { width: 100%; height: 100%; object-fit: contain; }
.ann-result-area {
  display: flex; flex-direction: column; gap: 12px;
  background: var(--surface-2, #1e293b); border-radius: 10px; padding: 16px;
  overflow-y: auto;
}
</style>
