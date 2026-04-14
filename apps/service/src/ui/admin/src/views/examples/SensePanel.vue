<template>
  <div class="sense-panel">
    <p class="hint">agentic-sense — 人脸检测、表情识别、手势追踪、姿态估计，全部本地 MediaPipe</p>

    <div class="sense-media">
      <div class="sense-camera">
        <video ref="videoEl" autoplay playsinline muted class="camera-video"></video>
        <canvas ref="canvasEl" class="sense-overlay"></canvas>
        <div class="sense-camera-controls">
          <button @click="toggleCamera" :class="{ active: cameraOn }">
            {{ cameraOn ? '📷 关闭' : '📷 开启摄像头' }}
          </button>
          <button v-if="cameraOn" @click="toggleDetection" :class="{ active: detecting }">
            {{ detecting ? '⏹ 停止' : '▶ 开始检测' }}
          </button>
        </div>
      </div>
    </div>

    <div class="sense-toggles" v-if="cameraOn">
      <label v-for="m in models" :key="m.id">
        <input type="checkbox" v-model="m.enabled" /> {{ m.icon }} {{ m.label }}
      </label>
    </div>

    <div class="sense-results" v-if="frame">
      <div class="sense-card" v-if="frame.faceCount > 0">
        <h4>😊 人脸 ({{ frame.faceCount }})</h4>
        <div v-for="(f, i) in frame.faces" :key="i" class="sense-face">
          <span>朝向: {{ f.head?.facing || '-' }}</span>
          <span>表情: {{ f.interpretation?.expression || '-' }}</span>
          <span>注意力: {{ f.interpretation?.focus || '-' }}</span>
        </div>
      </div>
      <div class="sense-card" v-if="frame.handCount > 0">
        <h4>✋ 手势 ({{ frame.handCount }})</h4>
        <div v-for="(h, i) in frame.hands" :key="i">
          <span>{{ h.label || h.handedness }}: {{ h.gesture || '-' }}</span>
        </div>
      </div>
      <div class="sense-card" v-if="frame.poseCount > 0">
        <h4>🏃 姿态 ({{ frame.poseCount }})</h4>
        <span>关键点: {{ frame.poses?.[0]?.landmarks?.length || 0 }}</span>
      </div>
      <div class="sense-card" v-if="frame.objectCount > 0">
        <h4>📦 物体 ({{ frame.objectCount }})</h4>
        <div v-for="(o, i) in frame.objects" :key="i">
          <span>{{ o.label }} ({{ (o.score * 100).toFixed(0) }}%)</span>
        </div>
      </div>
      <div class="sense-fps">{{ fps }} FPS</div>
    </div>

    <div class="sense-note" v-if="!cameraOn">
      <p>需要摄像头权限。检测模型在浏览器端通过 MediaPipe WASM 运行，不上传任何数据。</p>
      <p>支持的模型：人脸检测+表情+注意力、手势识别、姿态估计、物体检测</p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onUnmounted } from 'vue'

const props = defineProps({ markTested: Function })
defineEmits(['back'])

const videoEl = ref(null)
const canvasEl = ref(null)
const cameraOn = ref(false)
const detecting = ref(false)
const frame = ref(null)
const fps = ref(0)

const models = reactive([
  { id: 'face', label: '人脸+表情', icon: '😊', enabled: true },
  { id: 'hands', label: '手势', icon: '✋', enabled: false },
  { id: 'pose', label: '姿态', icon: '🏃', enabled: false },
  { id: 'objects', label: '物体', icon: '📦', enabled: false },
])

let stream = null
let sense = null
let rafId = null
let frameCount = 0
let lastFpsTime = 0

async function toggleCamera() {
  if (cameraOn.value) {
    stopDetection()
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null }
    cameraOn.value = false
    frame.value = null
  } else {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
      videoEl.value.srcObject = stream
      cameraOn.value = true
    } catch (e) {
      alert(`摄像头打开失败: ${e.message}`)
    }
  }
}

async function toggleDetection() {
  if (detecting.value) {
    stopDetection()
  } else {
    await startDetection()
  }
}

async function startDetection() {
  try {
    if (!window.AgenticSense) {
      const script = document.createElement('script')
      script.src = '/agentic-sense.js'
      await new Promise((resolve, reject) => {
        script.onload = resolve
        script.onerror = () => {
          const s2 = document.createElement('script')
          s2.src = 'https://unpkg.com/agentic-sense/agentic-sense.js'
          s2.onload = resolve
          s2.onerror = reject
          document.head.appendChild(s2)
        }
        document.head.appendChild(script)
      })
    }

    const { AgenticSense } = window
    sense = new AgenticSense(videoEl.value)
    const enabledModels = {}
    for (const m of models) enabledModels[m.id] = m.enabled
    await sense.init(enabledModels)
    detecting.value = true
    lastFpsTime = performance.now()
    frameCount = 0
    detectLoop()
    props.markTested?.('sense')
  } catch (e) {
    alert(`初始化失败: ${e.message}`)
  }
}

function detectLoop() {
  if (!detecting.value) return
  try {
    frame.value = sense.detect()
    frameCount++
    const now = performance.now()
    if (now - lastFpsTime >= 1000) {
      fps.value = frameCount
      frameCount = 0
      lastFpsTime = now
    }
  } catch {}
  rafId = requestAnimationFrame(detectLoop)
}

function stopDetection() {
  detecting.value = false
  if (rafId) { cancelAnimationFrame(rafId); rafId = null }
  if (sense) { sense.destroy?.(); sense = null }
}

onUnmounted(() => {
  stopDetection()
  if (stream) stream.getTracks().forEach(t => t.stop())
})
</script>

<style scoped>
@import './_shared.css';
.sense-panel { display: flex; flex-direction: column; gap: 16px; }
.sense-media { position: relative; }
.sense-camera { position: relative; border-radius: 10px; overflow: hidden; background: #0f172a; max-width: 640px; }
.sense-camera .camera-video { width: 100%; display: block; }
.sense-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }
.sense-camera-controls { position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; }
.sense-camera-controls button { padding: 6px 16px; border-radius: 20px; border: none; background: rgba(0,0,0,0.6); color: #fff; cursor: pointer; font-size: 13px; }
.sense-camera-controls button.active { background: rgba(16,185,129,0.8); }
.sense-toggles { display: flex; gap: 16px; flex-wrap: wrap; }
.sense-toggles label { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-secondary, #94a3b8); cursor: pointer; }
.sense-results { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.sense-card { background: var(--surface-2, #1e293b); border-radius: 10px; padding: 14px; }
.sense-card h4 { font-size: 14px; margin: 0 0 8px; }
.sense-card span { display: block; font-size: 13px; color: var(--text-secondary, #94a3b8); }
.sense-face { display: flex; flex-direction: column; gap: 2px; }
.sense-fps { font-size: 12px; color: var(--text-secondary, #64748b); padding: 8px; text-align: center; }
.sense-note { color: var(--text-secondary, #94a3b8); font-size: 13px; padding: 20px; text-align: center; }
.sense-note p { margin: 4px 0; }
</style>
