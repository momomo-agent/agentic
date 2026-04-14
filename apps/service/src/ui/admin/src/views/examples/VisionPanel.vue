<template>
  <div class="vision-panel">
    <div class="vision-controls">
      <div class="vision-source-tabs">
        <button :class="{ active: visionSource === 'upload' }" @click="visionSource = 'upload'">📁 上传图片</button>
        <button :class="{ active: visionSource === 'camera' }" @click="startCamera">📷 拍照</button>
      </div>

      <div v-if="visionSource === 'upload'" class="upload-area" @click="$refs.fileInput.click()" @dragover.prevent @drop.prevent="handleDrop">
        <input ref="fileInput" type="file" accept="image/*" @change="handleFile" hidden />
        <div v-if="!visionImage" class="upload-placeholder">
          <span class="upload-icon">🖼️</span>
          <span>点击或拖拽图片到这里</span>
        </div>
        <img v-else :src="visionImage" class="preview-img" />
      </div>

      <div v-if="visionSource === 'camera'" class="camera-area">
        <video ref="videoEl" autoplay playsinline class="camera-video"></video>
        <button class="btn-capture" @click="capturePhoto">📸 拍照</button>
      </div>

      <div class="vision-prompt-row">
        <input v-model="visionPrompt" placeholder="问点什么...（默认：描述这张图片）" @keydown.enter="analyzeImage" />
        <button @click="analyzeImage" :disabled="!visionImage || visionLoading">
          {{ visionLoading ? '分析中...' : '🔍 分析' }}
        </button>
      </div>
    </div>

    <div class="vision-result" v-if="visionResult">
      <div class="result-label">分析结果</div>
      <div class="result-text">{{ visionResult }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onUnmounted } from 'vue'
import { ai } from './utils.js'

const props = defineProps({ markTested: Function })
const emit = defineEmits(['back'])

const visionSource = ref('upload')
const visionImage = ref(null)
const visionPrompt = ref('')
const visionResult = ref('')
const visionLoading = ref(false)
const videoEl = ref(null)
let mediaStream = null

function handleFile(e) {
  const file = e.target.files[0]
  if (file) readImage(file)
}

function handleDrop(e) {
  const file = e.dataTransfer.files[0]
  if (file && file.type.startsWith('image/')) readImage(file)
}

function readImage(file) {
  const reader = new FileReader()
  reader.onload = () => { visionImage.value = reader.result; visionResult.value = '' }
  reader.readAsDataURL(file)
}

async function startCamera() {
  visionSource.value = 'camera'
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    await nextTick()
    if (videoEl.value) videoEl.value.srcObject = mediaStream
  } catch (e) {
    console.error('Camera error:', e)
  }
}

function stopCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop())
    mediaStream = null
  }
}

function capturePhoto() {
  if (!videoEl.value) return
  const canvas = document.createElement('canvas')
  const maxW = 1024
  const vw = videoEl.value.videoWidth, vh = videoEl.value.videoHeight
  const scale = vw > maxW ? maxW / vw : 1
  canvas.width = vw * scale
  canvas.height = vh * scale
  canvas.getContext('2d').drawImage(videoEl.value, 0, 0, canvas.width, canvas.height)
  visionImage.value = canvas.toDataURL('image/jpeg', 0.7)
  visionResult.value = ''
  stopCamera()
  visionSource.value = 'upload'
}

async function analyzeImage() {
  if (!visionImage.value || visionLoading.value) return
  visionLoading.value = true
  visionResult.value = ''

  try {
    for await (const chunk of ai.see(visionImage.value, visionPrompt.value || undefined, { stream: true })) {
      if (chunk.type === 'text_delta') visionResult.value += chunk.text || ''
      if (chunk.type === 'error') { visionResult.value = `错误: ${chunk.error}`; break }
    }
    props.markTested?.('vision')
  } catch (e) {
    visionResult.value = `错误: ${e.message}`
  }
  visionLoading.value = false
}

onUnmounted(() => { stopCamera() })
</script>

<style scoped>
@import './_shared.css';

.vision-panel { display: flex; flex-direction: column; gap: 16px; }
.vision-controls { display: flex; flex-direction: column; gap: 12px; }
.vision-prompt-row { display: flex; gap: 8px; }
.vision-prompt-row input {
  flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border, #334155);
  background: var(--surface-2, #1e293b); color: var(--text); font-size: 14px;
}
.vision-prompt-row button {
  padding: 10px 20px; border-radius: 8px; border: none;
  background: var(--accent, #3b82f6); color: white; cursor: pointer; font-size: 14px; white-space: nowrap;
}
.vision-prompt-row button:disabled { opacity: 0.5; cursor: not-allowed; }
.vision-result {
  background: var(--surface-2, #1e293b); border-radius: 10px; padding: 16px;
}
</style>
