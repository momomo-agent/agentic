<template>
  <div class="voice-note-panel">
    <div class="vn-controls">
      <button class="btn-voice" :class="{ active: vnRecording }" @click="toggleVoiceNote">
        {{ vnRecording ? '⏹ 停止录音' : '🎙️ 开始录音' }}
      </button>
      <span v-if="vnStatus" class="vn-status">{{ vnStatus }}</span>
    </div>
    <div class="vn-results" v-if="vnTranscript || vnNote">
      <div v-if="vnTranscript" class="vn-section">
        <div class="result-label">原始转写</div>
        <div class="result-text">{{ vnTranscript }}</div>
      </div>
      <div v-if="vnNote" class="vn-section">
        <div class="result-label">AI 整理笔记</div>
        <div class="result-text" style="white-space: pre-wrap;">{{ vnNote }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ai } from './utils.js'

const props = defineProps({ markTested: Function })
const emit = defineEmits(['back'])

const vnRecording = ref(false)
const vnTranscript = ref('')
const vnNote = ref('')
const vnStatus = ref('')
let vnRecorder = null
let vnStream = null

async function toggleVoiceNote() {
  if (vnRecording.value) {
    vnRecording.value = false
    vnStatus.value = '处理中...'
    if (vnRecorder && vnRecorder.state === 'recording') vnRecorder.stop()
  } else {
    vnTranscript.value = ''
    vnNote.value = ''
    vnStatus.value = '录音中...'
    try {
      vnStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      vnRecorder = new MediaRecorder(vnStream, { mimeType: 'audio/webm;codecs=opus' })
      const chunks = []
      vnRecorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
      vnRecorder.onstop = async () => {
        vnStream?.getTracks().forEach(t => t.stop())
        vnStream = null
        const blob = new Blob(chunks, { type: 'audio/webm' })
        // Step 1: transcribe
        vnStatus.value = '转写中...'
        try {
          vnTranscript.value = await ai.listen(blob)
          if (!vnTranscript.value) { vnStatus.value = '未识别到语音'; return }
          // Step 2: organize with AI
          vnStatus.value = 'AI 整理中...'
          for await (const chunk of ai.think('把以下语音内容整理成结构化笔记，包含要点、待办事项、关键决策：\n\n' + vnTranscript.value, { stream: true })) {
            if (chunk.type === 'text_delta') vnNote.value += chunk.text || ''
          }
          vnStatus.value = ''
          props.markTested?.('voice-note')
        } catch (e) {
          vnStatus.value = `错误: ${e.message}`
        }
      }
      vnRecorder.start()
      vnRecording.value = true
    } catch (e) {
      vnStatus.value = `麦克风错误: ${e.message}`
    }
  }
}
</script>

<style scoped>
@import './_shared.css';

.voice-note-panel { display: flex; flex-direction: column; gap: 16px; }
.vn-controls { display: flex; gap: 12px; align-items: center; }
.vn-status { font-size: 13px; color: var(--text-dim); }
.vn-results { display: flex; flex-direction: column; gap: 16px; }
.vn-section {
  background: var(--surface-2, #1e293b); border-radius: 10px; padding: 16px;
}
</style>
