<template>
  <div class="embed-panel">
    <p class="hint">agentic-embed — 向量嵌入 + 语义搜索，通过 /v1/embeddings 接口</p>

    <div class="embed-section">
      <h3>📐 生成 Embedding</h3>
      <div class="embed-controls">
        <input v-model="embedInput" @keydown.enter="generateEmbed" placeholder="输入文本生成向量..." style="flex:1" />
        <button @click="generateEmbed" :disabled="!embedInput.trim() || loading" class="btn-primary">
          {{ loading ? '生成中...' : '生成向量' }}
        </button>
      </div>
      <div class="embed-result" v-if="embedResult">
        <div class="embed-meta">
          <span>维度: {{ embedResult.length }}</span>
          <span>范数: {{ norm.toFixed(4) }}</span>
        </div>
        <div class="embed-viz">
          <div v-for="(v, i) in embedPreview" :key="i" class="embed-bar" :style="{ height: Math.abs(v) * 100 + '%', background: v >= 0 ? '#3b82f6' : '#ef4444' }"></div>
        </div>
        <pre class="embed-raw">[{{ embedResult.slice(0, 8).map(v => v.toFixed(6)).join(', ') }}, ...]</pre>
      </div>
    </div>

    <div class="embed-section">
      <h3>🔍 语义相似度</h3>
      <div class="embed-controls">
        <input v-model="simA" placeholder="文本 A" style="flex:1" />
        <input v-model="simB" placeholder="文本 B" style="flex:1" />
        <button @click="computeSimilarity" :disabled="!simA.trim() || !simB.trim() || simLoading" class="btn-primary">
          {{ simLoading ? '计算中...' : '对比' }}
        </button>
      </div>
      <div class="embed-similarity" v-if="similarity !== null">
        <div class="sim-bar-bg">
          <div class="sim-bar-fill" :style="{ width: (similarity * 100) + '%' }"></div>
        </div>
        <span class="sim-score">{{ (similarity * 100).toFixed(1) }}% 相似</span>
      </div>
      <div class="embed-quick">
        <button v-for="pair in quickPairs" :key="pair[0]" @click="simA = pair[0]; simB = pair[1]; computeSimilarity()">
          "{{ pair[0] }}" vs "{{ pair[1] }}"
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ai } from './utils.js'

const props = defineProps({ markTested: Function })
defineEmits(['back'])

const embedInput = ref('')
const embedResult = ref(null)
const loading = ref(false)
const simA = ref('')
const simB = ref('')
const similarity = ref(null)
const simLoading = ref(false)

const quickPairs = [
  ['猫在沙发上睡觉', '小猫躺在沙发上'],
  ['今天天气很好', '明天会下雨'],
  ['机器学习', '深度神经网络'],
  ['苹果很好吃', '苹果发布了新手机'],
]

const norm = computed(() => {
  if (!embedResult.value) return 0
  return Math.sqrt(embedResult.value.reduce((s, v) => s + v * v, 0))
})

const embedPreview = computed(() => {
  if (!embedResult.value) return []
  return embedResult.value.slice(0, 64)
})

async function generateEmbed() {
  if (!embedInput.value.trim() || loading.value) return
  loading.value = true
  try {
    const result = await ai.embed(embedInput.value.trim())
    embedResult.value = result.embeddings?.[0] || result.data?.[0]?.embedding || result
    props.markTested?.('embed')
  } catch (e) {
    embedResult.value = null
    alert(`生成失败: ${e.message}`)
  }
  loading.value = false
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

async function computeSimilarity() {
  if (!simA.value.trim() || !simB.value.trim() || simLoading.value) return
  simLoading.value = true
  similarity.value = null
  try {
    const [ra, rb] = await Promise.all([
      ai.embed(simA.value.trim()),
      ai.embed(simB.value.trim()),
    ])
    const vecA = ra.embeddings?.[0] || ra.data?.[0]?.embedding || ra
    const vecB = rb.embeddings?.[0] || rb.data?.[0]?.embedding || rb
    similarity.value = cosine(vecA, vecB)
    props.markTested?.('embed')
  } catch (e) {
    alert(`计算失败: ${e.message}`)
  }
  simLoading.value = false
}
</script>

<style scoped>
@import './_shared.css';
.embed-panel { display: flex; flex-direction: column; gap: 24px; }
.embed-section h3 { font-size: 15px; margin-bottom: 12px; }
.embed-controls { display: flex; gap: 8px; margin-bottom: 8px; }
.embed-controls input { padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border, #334155); background: var(--surface-2, #1e293b); color: var(--text); font-size: 14px; }
.embed-result { background: var(--surface-2, #1e293b); border-radius: 10px; padding: 16px; }
.embed-meta { display: flex; gap: 16px; font-size: 12px; color: var(--text-secondary, #94a3b8); margin-bottom: 12px; }
.embed-viz { display: flex; align-items: flex-end; gap: 1px; height: 60px; margin-bottom: 12px; }
.embed-bar { width: 4px; border-radius: 2px 2px 0 0; min-height: 1px; transition: height 0.2s; }
.embed-raw { font-size: 11px; font-family: monospace; color: var(--text-secondary, #64748b); margin: 0; }
.embed-similarity { display: flex; align-items: center; gap: 12px; margin-top: 8px; }
.sim-bar-bg { flex: 1; height: 8px; background: var(--surface-3, #374151); border-radius: 4px; overflow: hidden; }
.sim-bar-fill { height: 100%; background: linear-gradient(90deg, #ef4444, #eab308, #22c55e); border-radius: 4px; transition: width 0.5s; }
.sim-score { font-size: 16px; font-weight: 600; color: var(--text); min-width: 100px; }
.embed-quick { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
.embed-quick button { padding: 4px 10px; border-radius: 16px; border: 1px solid var(--border, #334155); background: transparent; color: var(--text-secondary, #94a3b8); cursor: pointer; font-size: 11px; }
.embed-quick button:hover { background: var(--surface-3, #374151); color: var(--text); }
</style>
