<template>
  <div class="test-view">
    <h1 class="page-title">功能测试</h1>

    <!-- Chat 测试 -->
    <div class="card">
      <div class="card-title">💬 Chat 测试</div>
      <div class="chat-box">
        <div v-for="(msg, i) in chatHistory" :key="i" class="chat-msg" :class="msg.role">
          <div class="msg-role">{{ msg.role === 'user' ? '你' : 'AI' }}</div>
          <div class="msg-text">{{ msg.content }}</div>
        </div>
      </div>
      <form @submit.prevent="sendChat" class="chat-input">
        <input v-model="chatInput" placeholder="输入消息..." :disabled="chatLoading" />
        <button type="submit" :disabled="chatLoading">{{ chatLoading ? '发送中...' : '发送' }}</button>
      </form>
    </div>

    <!-- STT 测试 -->
    <div class="card" style="margin-top: 24px">
      <div class="card-title">🎤 语音转文字 (STT)</div>
      <div class="test-panel">
        <input type="file" accept="audio/*" @change="handleAudioFile" />
        <button @click="transcribe" :disabled="!audioFile || sttLoading">
          {{ sttLoading ? '转写中...' : '转写' }}
        </button>
      </div>
      <div v-if="sttResult" class="result-box">{{ sttResult }}</div>
    </div>

    <!-- TTS 测试 -->
    <div class="card" style="margin-top: 24px">
      <div class="card-title">🔊 文字转语音 (TTS)</div>
      <div class="test-panel">
        <input v-model="ttsText" placeholder="输入要合成的文字..." />
        <button @click="synthesize" :disabled="!ttsText || ttsLoading">
          {{ ttsLoading ? '合成中...' : '合成' }}
        </button>
      </div>
      <audio v-if="ttsAudio" :src="ttsAudio" controls style="margin-top: 16px; width: 100%"></audio>
    </div>

    <!-- Voice 全链路测试 -->
    <div class="card" style="margin-top: 24px">
      <div class="card-title">🎙️ Voice 全链路 (STT → LLM → TTS)</div>
      <div class="test-panel">
        <input type="file" accept="audio/*" @change="handleVoiceFile" />
        <button @click="voiceTest" :disabled="!voiceFile || voiceLoading">
          {{ voiceLoading ? '处理中...' : '测试' }}
        </button>
      </div>
      <div v-if="voiceResult" class="result-box">
        <div><strong>识别:</strong> {{ voiceResult.transcript }}</div>
        <div><strong>回复:</strong> {{ voiceResult.response }}</div>
        <audio v-if="voiceResult.audio" :src="voiceResult.audio" controls style="margin-top: 12px; width: 100%"></audio>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const chatHistory = ref([])
const chatInput = ref('')
const chatLoading = ref(false)

const audioFile = ref(null)
const sttResult = ref('')
const sttLoading = ref(false)

const ttsText = ref('')
const ttsAudio = ref(null)
const ttsLoading = ref(false)

const voiceFile = ref(null)
const voiceResult = ref(null)
const voiceLoading = ref(false)

async function sendChat() {
  if (!chatInput.value.trim()) return
  const userMsg = chatInput.value
  chatHistory.value.push({ role: 'user', content: userMsg })
  chatInput.value = ''
  chatLoading.value = true
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMsg })
    })
    const data = await res.json()
    chatHistory.value.push({ role: 'assistant', content: data.response || '无回复' })
  } catch (e) {
    chatHistory.value.push({ role: 'assistant', content: '错误: ' + e.message })
  } finally {
    chatLoading.value = false
  }
}

function handleAudioFile(e) {
  audioFile.value = e.target.files[0]
}

async function transcribe() {
  if (!audioFile.value) return
  sttLoading.value = true
  try {
    const form = new FormData()
    form.append('audio', audioFile.value)
    const res = await fetch('/api/transcribe', { method: 'POST', body: form })
    const data = await res.json()
    sttResult.value = data.text || '无结果'
  } catch (e) {
    sttResult.value = '错误: ' + e.message
  } finally {
    sttLoading.value = false
  }
}

async function synthesize() {
  if (!ttsText.value.trim()) return
  ttsLoading.value = true
  try {
    const res = await fetch('/api/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: ttsText.value })
    })
    const blob = await res.blob()
    ttsAudio.value = URL.createObjectURL(blob)
  } catch (e) {
    alert('合成失败: ' + e.message)
  } finally {
    ttsLoading.value = false
  }
}

function handleVoiceFile(e) {
  voiceFile.value = e.target.files[0]
}

async function voiceTest() {
  if (!voiceFile.value) return
  voiceLoading.value = true
  try {
    const form = new FormData()
    form.append('audio', voiceFile.value)
    const res = await fetch('/api/voice', { method: 'POST', body: form })
    const data = await res.json()
    voiceResult.value = {
      transcript: data.transcript || '',
      response: data.response || '',
      audio: data.audioUrl ? data.audioUrl : null
    }
  } catch (e) {
    alert('测试失败: ' + e.message)
  } finally {
    voiceLoading.value = false
  }
}
</script>

<style scoped>
.page-title { font-size: 28px; font-weight: 700; margin-bottom: 24px; }
.chat-box {
  max-height: 400px; overflow-y: auto; padding: 16px;
  background: var(--surface-2); border-radius: 6px; margin-bottom: 16px;
  display: flex; flex-direction: column; gap: 12px;
}
.chat-msg { display: flex; gap: 12px; }
.chat-msg.user { flex-direction: row-reverse; }
.msg-role {
  font-size: 12px; color: var(--text-dim); flex-shrink: 0; width: 40px;
}
.chat-msg.user .msg-role { text-align: right; }
.msg-text {
  background: var(--surface-3); padding: 8px 12px; border-radius: 6px; max-width: 70%;
}
.chat-input { display: flex; gap: 12px; }
.test-panel { display: flex; gap: 12px; align-items: center; }
.result-box {
  margin-top: 16px; padding: 16px; background: var(--surface-2);
  border-radius: 6px; font-size: 14px; line-height: 1.6;
}
</style>
