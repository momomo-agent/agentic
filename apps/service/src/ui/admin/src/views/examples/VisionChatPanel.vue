<template>
  <div class="vision-chat-panel">
    <div class="vc-layout">
      <div class="vc-image-area" @click="$refs.vcFileInput.click()" @dragover.prevent @drop.prevent="handleVcDrop">
        <input ref="vcFileInput" type="file" accept="image/*" @change="handleVcFile" hidden />
        <div v-if="!vcImage" class="upload-placeholder">
          <span class="upload-icon">🖼️</span>
          <span>点击或拖拽上传图片</span>
        </div>
        <img v-else :src="vcImage" class="preview-img" />
      </div>
      <div class="vc-chat-area">
        <div class="chat-messages" ref="vcChatEl">
          <div v-for="(msg, i) in vcHistory" :key="i" class="chat-msg" :class="msg.role">
            <div class="msg-bubble">{{ msg.content }}</div>
          </div>
        </div>
        <div class="chat-input-row">
          <input v-model="vcInput" @keydown.enter="sendVcChat" placeholder="对图片提问..." :disabled="vcLoading || !vcImage" />
          <button @click="sendVcChat" :disabled="vcLoading || !vcImage || !vcInput.trim()">发送</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { ai, resizeImage } from './utils.js'

const props = defineProps({ markTested: Function })
const emit = defineEmits(['back'])

const vcImage = ref('')
const vcHistory = ref([])
const vcInput = ref('')
const vcLoading = ref(false)
const vcChatEl = ref(null)

function handleVcFile(e) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async () => { vcImage.value = await resizeImage(reader.result); vcHistory.value = [] }
  reader.readAsDataURL(file)
}

function handleVcDrop(e) {
  const file = e.dataTransfer.files[0]
  if (!file || !file.type.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = async () => { vcImage.value = await resizeImage(reader.result); vcHistory.value = [] }
  reader.readAsDataURL(file)
}

async function sendVcChat() {
  const prompt = vcInput.value.trim()
  if (!prompt || !vcImage.value || vcLoading.value) return
  vcHistory.value.push({ role: 'user', content: prompt })
  vcInput.value = ''
  vcLoading.value = true
  vcHistory.value.push({ role: 'assistant', content: '' })
  await nextTick()
  if (vcChatEl.value) vcChatEl.value.scrollTop = vcChatEl.value.scrollHeight

  try {
    const last = vcHistory.value[vcHistory.value.length - 1]
    for await (const chunk of ai.see(vcImage.value, prompt, { stream: true })) {
      if (chunk.type === 'text_delta') last.content += chunk.text || ''
      if (chunk.type === 'error') { last.content = `错误: ${chunk.error}`; break }
      await nextTick()
      if (vcChatEl.value) vcChatEl.value.scrollTop = vcChatEl.value.scrollHeight
    }
    props.markTested?.('vision-chat')
  } catch (e) {
    vcHistory.value[vcHistory.value.length - 1].content = `错误: ${e.message}`
  }
  vcLoading.value = false
}
</script>

<style scoped>
@import './_shared.css';

.vision-chat-panel { display: flex; flex-direction: column; gap: 16px; }
.vc-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; min-height: 400px; }
.vc-image-area {
  border: 2px dashed var(--border, #334155); border-radius: 10px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; overflow: hidden;
}
.vc-image-area .preview-img { width: 100%; height: 100%; object-fit: contain; }
.vc-chat-area { display: flex; flex-direction: column; gap: 8px; }
.vc-chat-area .chat-messages { flex: 1; min-height: 300px; }
</style>
