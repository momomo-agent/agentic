<template>
  <div class="spatial-panel">
    <p class="hint">agentic-spatial — 从多张照片重建空间场景，基于 VLM 空间理解</p>

    <div class="spatial-upload">
      <div class="spatial-images">
        <div v-for="(img, i) in images" :key="i" class="spatial-thumb">
          <img :src="img.data" />
          <button class="spatial-thumb-del" @click="images.splice(i, 1)">×</button>
          <span class="spatial-thumb-name">{{ img.name }}</span>
        </div>
        <div class="spatial-add" @click="$refs.fileInput.click()">
          <span>+</span>
          <span>添加照片</span>
        </div>
      </div>
      <input ref="fileInput" type="file" accept="image/*" multiple @change="handleFiles" hidden />
    </div>

    <div class="spatial-controls">
      <button @click="reconstruct" :disabled="images.length < 2 || loading" class="btn-primary">
        {{ loading ? '重建中...' : `🏗️ 重建空间 (${images.length} 张)` }}
      </button>
      <span class="hint" v-if="images.length < 2">至少需要 2 张不同角度的照片</span>
    </div>

    <div class="spatial-progress" v-if="progress.length">
      <div v-for="(p, i) in progress" :key="i" class="spatial-step" :class="{ done: p.done }">
        <span class="spatial-step-icon">{{ p.done ? '✅' : '⏳' }}</span>
        <span>{{ p.text }}</span>
      </div>
    </div>

    <div class="spatial-result" v-if="scene">
      <h3>🏠 空间重建结果</h3>
      <div class="spatial-room" v-if="scene.room">
        <div class="spatial-field"><span class="spatial-label">形状</span> {{ scene.room.shape }}</div>
        <div class="spatial-field" v-if="scene.room.dimensions"><span class="spatial-label">尺寸</span> {{ JSON.stringify(scene.room.dimensions) }}</div>
      </div>
      <div class="spatial-objects" v-if="scene.objects?.length">
        <h4>物体 ({{ scene.objects.length }})</h4>
        <div v-for="(obj, i) in scene.objects" :key="i" class="spatial-obj">
          <span class="spatial-obj-name">{{ obj.name || obj.label }}</span>
          <span class="spatial-obj-pos" v-if="obj.position">{{ JSON.stringify(obj.position) }}</span>
        </div>
      </div>
      <pre class="spatial-raw">{{ JSON.stringify(scene, null, 2) }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ai } from './utils.js'

const props = defineProps({ markTested: Function })
defineEmits(['back'])

const images = ref([])
const loading = ref(false)
const progress = ref([])
const scene = ref(null)

function handleFiles(e) {
  const files = Array.from(e.target.files)
  for (const file of files) {
    const reader = new FileReader()
    reader.onload = () => {
      images.value.push({ data: reader.result, name: file.name })
    }
    reader.readAsDataURL(file)
  }
  e.target.value = ''
}

async function reconstruct() {
  if (images.value.length < 2 || loading.value) return
  loading.value = true
  progress.value = []
  scene.value = null

  progress.value.push({ text: '分析图片...', done: false })

  try {
    // Build a prompt with all images for spatial reconstruction
    const content = [
      { type: 'text', text: `你是一个空间重建引擎。分析以下 ${images.value.length} 张照片，重建空间场景。

请用 JSON 格式输出：
{
  "room": { "shape": "rectangular|L-shaped|...", "dimensions": { "width": "估算", "length": "估算" } },
  "objects": [{ "name": "物体名", "position": { "x": "left|center|right", "y": "near|middle|far" }, "description": "描述" }],
  "layout": "整体布局描述",
  "lighting": "光照描述",
  "style": "风格描述"
}` },
    ]
    for (const img of images.value) {
      content.push({ type: 'image_url', image_url: { url: img.data } })
    }

    progress.value[0].done = true
    progress.value.push({ text: 'VLM 空间推理...', done: false })

    let text = ''
    for await (const chunk of ai.think([{ role: 'user', content }], { stream: true, multimodal: true })) {
      if (chunk.type === 'text_delta') text += chunk.text || ''
    }

    progress.value[1].done = true
    progress.value.push({ text: '解析结果...', done: false })

    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      scene.value = JSON.parse(match[0])
    } else {
      scene.value = { raw: text }
    }

    progress.value[2].done = true
    props.markTested?.('spatial')
  } catch (e) {
    progress.value.push({ text: `错误: ${e.message}`, done: false })
  }
  loading.value = false
}
</script>

<style scoped>
@import './_shared.css';
.spatial-panel { display: flex; flex-direction: column; gap: 16px; }
.spatial-images { display: flex; gap: 10px; flex-wrap: wrap; }
.spatial-thumb { position: relative; width: 120px; height: 90px; border-radius: 8px; overflow: hidden; }
.spatial-thumb img { width: 100%; height: 100%; object-fit: cover; }
.spatial-thumb-del { position: absolute; top: 4px; right: 4px; width: 20px; height: 20px; border-radius: 50%; border: none; background: rgba(0,0,0,0.6); color: white; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center; }
.spatial-thumb-name { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.6); color: white; font-size: 10px; padding: 2px 6px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; }
.spatial-add { width: 120px; height: 90px; border: 2px dashed var(--border, #334155); border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; color: var(--text-secondary, #94a3b8); font-size: 12px; gap: 4px; }
.spatial-add:hover { border-color: var(--accent, #3b82f6); color: var(--text); }
.spatial-add span:first-child { font-size: 24px; }
.spatial-controls { display: flex; gap: 12px; align-items: center; }
.spatial-progress { display: flex; flex-direction: column; gap: 6px; }
.spatial-step { display: flex; gap: 8px; font-size: 13px; color: var(--text-secondary, #94a3b8); }
.spatial-step.done { color: #22c55e; }
.spatial-result { background: var(--surface-2, #1e293b); border-radius: 10px; padding: 16px; }
.spatial-result h3 { font-size: 15px; margin: 0 0 12px; }
.spatial-result h4 { font-size: 14px; margin: 12px 0 8px; }
.spatial-room { display: flex; gap: 16px; flex-wrap: wrap; }
.spatial-field { font-size: 13px; }
.spatial-label { color: var(--text-secondary, #94a3b8); margin-right: 6px; }
.spatial-objects { margin-top: 8px; }
.spatial-obj { display: flex; gap: 10px; font-size: 13px; padding: 4px 0; }
.spatial-obj-name { font-weight: 600; }
.spatial-obj-pos { color: var(--text-secondary, #64748b); font-family: monospace; font-size: 11px; }
.spatial-raw { font-size: 11px; font-family: monospace; color: var(--text-secondary, #64748b); margin-top: 12px; max-height: 200px; overflow-y: auto; white-space: pre-wrap; }
</style>
