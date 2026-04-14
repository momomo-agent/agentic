<template>
  <div class="multimodal-panel">
    <div class="chat-messages" ref="mmChatEl">
      <div v-for="(msg, i) in mmHistory" :key="i" class="chat-msg" :class="msg.role">
        <img v-if="msg.image" :src="msg.image" class="mm-msg-img" />
        <div class="msg-bubble" v-if="msg.content">{{ msg.content }}</div>
        <button v-if="msg.role === 'assistant' && msg.content" class="btn-play-inline" @click="mmTtsPlay(msg.content)">🔊</button>
      </div>
    </div>
    <div class="mm-input-row">
      <input v-model="mmInput" @keydown.enter="sendMmText" placeholder="输入消息..." :disabled="mmLoading" />
      <button @click="sendMmText" :disabled="mmLoading || !mmInput.trim()">发送</button>
      <button @click="$refs.mmFileInput.click()" :disabled="mmLoading">📷</button>
      <input ref="mmFileInput" type="file" accept="image/*" @change="sendMmImage" hidden />
      <button @click="sendMmVoice" :disabled="mmLoading || mmRecording">{{ mmRecording ? '识别中...' : '🎤' }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { ai } from './utils.js'

const props = defineProps({ markTested: Function })
const emit = defineEmits(['back'])

const mmHistory = ref([])
const mmInput = ref('')
const mmLoading = ref(false)
const mmRecording = ref(false)
const mmChatEl = ref(null)

async function scrollMm() {
  await nextTick()
  if (mmChatEl.value) mmChatEl.value.scrollTop = mmChatEl.value.scrollHeight
}

async function sendMmText() {
  const msg = mmInput.value.trim()
  if (!msg || mmLoading.value) return
  mmHistory.value.push({ role: 'user', content: msg })
  mmInput.value = ''
  mmLoading.value = true
  mmHistory.value.push({ role: 'assistant', content: '' })
  await scrollMm()

  try {
    const last = mmHistory.value[mmHistory.value.length - 1]
    for await (const chunk of ai.think(msg, { stream: true, history: mmHistory.value.slice(0, -1).map(m => ({ role: m.role, content: m.content })) })) {
      if (chunk.type === 'text_delta') last.content += chunk.text || ''
      await scrollMm()
    }
    props.markTested?.('multimodal')
  } catch (e) {
    mmHistory.value[mmHistory.value.length - 1].content = `错误: ${e.message}`
  }
  mmLoading.value = false
}

async function sendMmImage(e) {
  const file = e.target.files[0]
  if (!file || mmLoading.value) return
  const reader = new FileReader()
  reader.onload = async () => {
    const base64 = reader.result
    mmHistory.value.push({ role: 'user', content: '(发送了图片)', image: base64 })
    mmLoading.value = true
    mmHistory.value.push({ role: 'assistant', content: '' })
    await scrollMm()

    try {
      const last = mmHistory.value[mmHistory.value.length - 1]
      for await (const chunk of ai.see(base64, '描述这张图片', { stream: true })) {
        if (chunk.type === 'text_delta') last.content += chunk.text || ''
        await scrollMm()
      }
      props.markTested?.('multimodal')
    } catch (err) {
      mmHistory.value[mmHistory.value.length - 1].content = `错误: ${err.message}`
    }
    mmLoading.value = false
  }
  reader.readAsDataURL(file)
  e.target.value = ''
}

async function sendMmVoice() {
  if (mmRecording.value || mmLoading.value) return
  mmRecording.value = true
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
    const chunks = []
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
    await new Promise(resolve => {
      recorder.onstop = resolve
      recorder.start()
      setTimeout(() => { if (recorder.state === 'recording') recorder.stop() }, 5000)
    })
    stream.getTracks().forEach(t => t.stop())
    mmRecording.value = false

    const blob = new Blob(chunks, { type: 'audio/webm' })
    const text = await ai.listen(blob)
    if (text) {
      mmInput.value = text
      await sendMmText()
    }
  } catch {
    mmRecording.value = false
  }
}

async function mmTtsPlay(text) {
  try {
    const audioBuffer = await ai.speak(text)
    const blob = new Blob([audioBuffer], { type: 'audio/wav' })
    const url = URL.createObjectURL(blob)
    new Audio(url).play().catch(() => {})
  } catch {}
}
</script>

<style scoped>
@import './_shared.css';

.multimodal-panel { display: flex; flex-direction: column; gap: 8px; }
.multimodal-panel .chat-messages { flex: 1; min-height: 350px; }
.mm-input-row { display: flex; gap: 8px; }
.mm-input-row input {
  flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border, #334155);
  background: var(--surface-2, #1e293b); color: var(--text); font-size: 14px;
}
.mm-input-row button {
  padding: 10px 16px; border-radius: 8px; border: none;
  background: var(--accent, #3b82f6); color: white; cursor: pointer; font-size: 14px;
}
.mm-input-row button:disabled { opacity: 0.5; cursor: not-allowed; }
.mm-msg-img { max-width: 200px; border-radius: 8px; margin-bottom: 4px; }
</style>
