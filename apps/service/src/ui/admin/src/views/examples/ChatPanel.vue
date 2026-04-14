<template>
  <div class="chat-panel">
    <div class="chat-messages" ref="chatEl">
      <div v-for="(msg, i) in chatHistory" :key="i" class="chat-msg" :class="msg.role">
        <div class="msg-bubble" v-if="msg.content">{{ msg.content }}</div>
        <div class="msg-bubble loading" v-else-if="msg.role === 'assistant' && chatLoading">
          <span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>
        </div>
      </div>
    </div>
    <div class="chat-input-row">
      <input v-model="chatInput" @keydown.enter="sendChat" placeholder="输入消息..." :disabled="chatLoading" />
      <button @click="sendChat" :disabled="chatLoading || !chatInput.trim()">发送</button>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { ai } from './utils.js'

const props = defineProps({ markTested: Function })
const emit = defineEmits(['back'])

const chatHistory = ref([])
const chatInput = ref('')
const chatLoading = ref(false)
const chatEl = ref(null)

async function sendChat() {
  const msg = chatInput.value.trim()
  if (!msg || chatLoading.value) return
  chatHistory.value.push({ role: 'user', content: msg })
  chatInput.value = ''
  chatLoading.value = true
  await nextTick()
  scrollChat()

  const assistantMsg = { role: 'assistant', content: '' }
  chatHistory.value.push(assistantMsg)

  try {
    for await (const chunk of ai.think(msg, { stream: true, history: chatHistory.value.slice(0, -1) })) {
      if (chunk.type === 'text_delta') {
        assistantMsg.content += chunk.text || ''
        await nextTick()
        scrollChat()
      }
    }
    props.markTested?.('chat')
  } catch (e) {
    assistantMsg.content = `错误: ${e.message}`
  }
  chatLoading.value = false
}

function scrollChat() {
  if (chatEl.value) chatEl.value.scrollTop = chatEl.value.scrollHeight
}
</script>

<style scoped>
@import './_shared.css';

.chat-panel { display: flex; flex-direction: column; height: 500px; }
</style>
