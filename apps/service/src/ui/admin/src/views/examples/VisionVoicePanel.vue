<template>
  <div class="vision-voice-panel">
    <div class="vv-controls">
      <div class="vision-source-tabs">
        <button :class="{ active: vvSource === 'upload' }" @click="vvSource = 'upload'">📁 上传图片</button>
        <button :class="{ active: vvSource === 'camera' }" @click="startVvCamera">📷 拍照</button>
      </div>
      <div v-if="vvSource === 'upload'" class="upload-area" @click="$refs.vvFileInput.click()" @dragover.prevent @drop.prevent="handleVvDrop">
        <input ref="vvFileInput" type="file" accept="image/*" @change="handleVvFile" hidden />
        <div v-if="!vvImage" class="upload-placeholder">
          <span class="upload-icon">🖼️</span>
          <span>点击或拖拽图片到这里</span>
        </div>
        <img v-else :src="vvImage" class="preview-img" />
      </div>
      <div v-if="vvSource === 'camera'" class="camera-area">
        <video ref="vvVideoEl" autoplay playsinline class="camera-video"></video>
        <button class="btn-capture" @click="captureVvPhoto">📸 拍照</button>
      </div>
      <button @click="runVisionVoice" :disabled="!vvImage || vvLoading" class="btn-primary">
        {{ vvLoading ? '处理中...' : '🔊 AI 描述并朗读' }}
      </button>
    </div>
    <div class="vv-result" v-if="vvDescription">
      <div class="result-label">AI 描述</div>
      <div class="result-text">{{ vvDescription }}</div>
      <audio v-if="vvAudioUrl" :src="vvAudioUrl" controls autoplay class="tts-audio"></audio>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { ai } from './utils.js'

const props = defineProps({ markTested: Function })
const emit = defineEmits(['back'])

const vvImage = ref('')
const vvSource = ref('upload')
const vvDescription = ref('')
const vvAudioUrl = ref(null)
const vvLoading = ref(false)
const vvVideoEl = ref(null)
let vvCameraStream = null

function handleVvFile(e) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => { vvImage.value = reader.result; vvDescription.value = ''; vvAudioUrl.value = null }
  reader.readAsDataURL(file)
}

function handleVvDrop(e) {
  const file = e.dataTransfer.files[0]
  if (!file || !file.type.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = () => { vvImage.value = reader.result; vvDescription.value = ''; vvAudioUrl.value = null }
  reader.readAsDataURL(file)
}

async function startVvCamera() {
  vvSource.value = 'camera'
  try {
    vvCameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    await nextTick()
    if (vvVideoEl.value) vvVideoEl.value.srcObject = vvCameraStream
  } catch {}
}

function stopVvCamera() {
  if (vvCameraStream) { vvCameraStream.getTracks().forEach(t => t.stop()); vvCameraStream = null }
}

function captureVvPhoto() {
  if (!vvVideoEl.value) return
  const canvas = document.createElement('canvas')
  canvas.width = vvVideoEl.value.videoWidth
  canvas.height = vvVideoEl.value.videoHeight
  canvas.getContext('2d').drawImage(vvVideoEl.value, 0, 0)
  vvImage.value = canvas.toDataURL('image/jpeg', 0.85)
  vvDescription.value = ''
  vvAudioUrl.value = null
  stopVvCamera()
  vvSource.value = 'upload'
}

async function runVisionVoice() {
  if (!vvImage.value || vvLoading.value) return
  vvLoading.value = true
  vvDescription.value = ''
  vvAudioUrl.value = null

  try {
    // Step 1: get description
    for await (const chunk of ai.see(vvImage.value, '详细描述这张图片', { stream: true })) {
      if (chunk.type === 'text_delta') vvDescription.value += chunk.text || ''
    }
    // Step 2: TTS
    if (vvDescription.value) {
      const audioBuffer = await ai.speak(vvDescription.value)
      const blob = new Blob([audioBuffer], { type: 'audio/wav' })
      if (vvAudioUrl.value) URL.revokeObjectURL(vvAudioUrl.value)
      vvAudioUrl.value = URL.createObjectURL(blob)
    }
    props.markTested?.('vision-voice')
  } catch (e) {
    vvDescription.value = `错误: ${e.message}`
  }
  vvLoading.value = false
}
</script>

<style scoped>
@import './_shared.css';

.vision-voice-panel { display: flex; flex-direction: column; gap: 16px; }
.vv-controls { display: flex; flex-direction: column; gap: 12px; }
.vv-result {
  background: var(--surface-2, #1e293b); border-radius: 10px; padding: 16px;
  display: flex; flex-direction: column; gap: 12px;
}
</style>
