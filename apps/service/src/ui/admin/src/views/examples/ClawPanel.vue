<template>
  <div class="claw-panel">
    <p class="hint">agentic-claw — Agent 运行时，core + memory 组合成有记忆的 AI agent</p>

    <div class="claw-section">
      <h3>🤖 Agent 对话</h3>
      <div class="claw-config">
        <input v-model="systemPrompt" placeholder="System Prompt（可选）" />
      </div>
      <div class="chat-messages" ref="chatEl">
        <div v-for="(msg, i) in messages" :key="i" class="chat-msg" :class="msg.role">
          <div class="msg-bubble">{{ msg.content }}</div>
        </div>
      </div>
      <div class="chat-input-row">
        <input v-model="input" @keydown.enter="send" placeholder="跟 Agent 聊天..." :disabled="loading" />
        <button @click="send" :disabled="loading || !input.trim()">
          {{ loading ? '...' : '发送' }}
        </button>
      </div>
    </div>

    <div class="claw-section">
      <h3>📊 Agent 状态</h3>
      <div class="claw-stats">
        <div class="claw-stat">
          <span class="claw-stat-label">消息数</span>
          <span class="claw-stat-value">{{ messages.length }}</span>
        </div>
        <div class="claw-stat">
          <span class="claw-stat-label">Session</span>
          <span class="claw-stat-value">{{ sessionId }}</span>
        </div>
        <div class="claw-stat">
          <span class="claw-stat-label">记忆</span>
          <span class="claw-stat-value">{{ memoryInfo }}</span>
        </div>
      </div>
      <div class="claw-actions">
        <button @click="newSession" class="btn-secondary">新 Session</button>
        <button @click="clearMemory" class="btn-secondary">清空记忆</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { ai } from './utils.js'

const props = defineProps({ markTested: Function })
defineEmits(['back'])

const input = ref('')
const messages = ref([])
const loading = ref(false)
const chatEl = ref(null)
const systemPrompt = ref('你是一个有记忆的 AI 助手。记住用户告诉你的信息。')
const sessionId = ref('session-' + Date.now().toString(36))
const memoryInfo = ref('0 tokens')

// Maintain conversation history for context
const conversationHistory = ref([])

async function send() {
  if (!input.value.trim() || loading.value) return
  const text = input.value.trim()
  input.value = ''
  messages.value.push({ role: 'user', content: text })
  conversationHistory.value.push({ role: 'user', content: text })
  await nextTick()
  scrollChat()

  loading.value = true
  messages.value.push({ role: 'assistant', content: '' })
  const idx = messages.value.length - 1

  try {
    const apiMessages = []
    if (systemPrompt.value.trim()) {
      apiMessages.push({ role: 'system', content: systemPrompt.value.trim() })
    }
    apiMessages.push(...conversationHistory.value)

    let reply = ''
    for await (const chunk of ai.think(apiMessages, { stream: true })) {
      if (chunk.type === 'text_delta') {
        reply += chunk.text || ''
        messages.value[idx].content = reply
      }
    }
    conversationHistory.value.push({ role: 'assistant', content: reply })
    memoryInfo.value = `~${estimateTokens(conversationHistory.value)} tokens`
    props.markTested?.('claw')
  } catch (e) {
    messages.value[idx].content = `错误: ${e.message}`
  }
  loading.value = false
  await nextTick()
  scrollChat()
}

function scrollChat() {
  if (chatEl.value) chatEl.value.scrollTop = chatEl.value.scrollHeight
}

function newSession() {
  messages.value = []
  conversationHistory.value = []
  sessionId.value = 'session-' + Date.now().toString(36)
  memoryInfo.value = '0 tokens'
}

function clearMemory() {
  conversationHistory.value = []
  memoryInfo.value = '0 tokens'
  messages.value.push({ role: 'system', content: '记忆已清空，但对话历史保留显示。' })
}

function estimateTokens(msgs) {
  return Math.round(msgs.reduce((s, m) => s + (m.content?.length || 0), 0) * 0.4)
}
</script>

<style scoped>
@import './_shared.css';
.claw-panel { display: flex; flex-direction: column; gap: 24px; }
.claw-section h3 { font-size: 15px; margin-bottom: 12px; }
.claw-config { margin-bottom: 12px; }
.claw-config input { width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border, #334155); background: var(--surface-2, #1e293b); color: var(--text); font-size: 13px; }
.chat-messages { height: 300px; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; background: var(--surface-2, #1e293b); border-radius: 10px; }
.chat-msg { display: flex; }
.chat-msg.user { justify-content: flex-end; }
.chat-msg.system { justify-content: center; }
.msg-bubble { max-width: 75%; padding: 10px 14px; border-radius: 14px; font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
.chat-msg.user .msg-bubble { background: var(--accent, #3b82f6); color: white; }
.chat-msg.assistant .msg-bubble { background: var(--surface-3, #374151); }
.chat-msg.system .msg-bubble { background: transparent; color: var(--text-secondary, #64748b); font-size: 12px; font-style: italic; }
.chat-input-row { display: flex; gap: 8px; margin-top: 8px; }
.chat-input-row input { flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border, #334155); background: var(--surface-2, #1e293b); color: var(--text); font-size: 14px; }
.chat-input-row button { padding: 10px 20px; border-radius: 8px; border: none; background: var(--accent, #3b82f6); color: white; cursor: pointer; }
.chat-input-row button:disabled { opacity: 0.5; cursor: not-allowed; }
.claw-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 12px; }
.claw-stat { background: var(--surface-2, #1e293b); border-radius: 10px; padding: 14px; text-align: center; }
.claw-stat-label { display: block; font-size: 11px; color: var(--text-secondary, #94a3b8); margin-bottom: 4px; }
.claw-stat-value { font-size: 16px; font-weight: 600; }
.claw-actions { display: flex; gap: 8px; }
.btn-secondary { background: var(--surface-3, #374151); border: none; color: var(--text); padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; }
</style>
