<template>
  <div class="models-view">
    <h1 class="page-title">模型管理</h1>

    <!-- Ollama 状态 -->
    <div class="card">
      <div class="card-title">Ollama 状态</div>
      <div class="ollama-status">
        <div class="status-indicator" :class="ollama.running ? 'running' : 'stopped'"></div>
        <span>{{ ollama.running ? '运行中' : '未运行' }}</span>
        <span class="status-detail">端口 11434</span>
      </div>
    </div>

    <!-- 已安装模型 -->
    <div class="card" style="margin-top: 24px">
      <div class="card-title">已安装模型 ({{ ollama.models.length }})</div>
      <div v-if="ollama.models.length === 0" class="empty">
        暂无模型，请从下方推荐列表下载
      </div>
      <div v-else class="model-list">
        <div v-for="m in ollama.models" :key="m" class="model-item">
          <div class="model-name">{{ m }}</div>
          <button class="btn-secondary" @click="deleteModel(m)">删除</button>
        </div>
      </div>
    </div>

    <!-- 推荐模型 -->
    <div class="card" style="margin-top: 24px">
      <div class="card-title">推荐模型</div>
      <div class="model-list">
        <div v-for="m in recommended" :key="m.name" class="model-item">
          <div>
            <div class="model-name">{{ m.name }}</div>
            <div class="model-desc">{{ m.desc }}</div>
          </div>
          <button @click="downloadModel(m.name)" :disabled="downloading === m.name">
            {{ downloading === m.name ? '下载中...' : '下载' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const ollama = ref({ running: false, models: [] })
const downloading = ref(null)
const recommended = [
  { name: 'gemma2:2b', desc: '轻量级模型，适合快速响应' },
  { name: 'qwen2.5:3b', desc: '中文优化，平衡性能' },
  { name: 'llama3.2:3b', desc: 'Meta 开源模型' },
]

let timer = null

async function fetchStatus() {
  try {
    const res = await fetch('/api/status')
    const data = await res.json()
    ollama.value = data.ollama || { running: false, models: [] }
  } catch (e) {
    console.error('fetch failed:', e)
  }
}

async function downloadModel(name) {
  downloading.value = name
  try {
    // TODO: 实现下载接口
    alert(`下载 ${name} 功能待实现`)
  } finally {
    downloading.value = null
  }
}

async function deleteModel(name) {
  if (!confirm(`确定删除模型 ${name}？`)) return
  try {
    // TODO: 实现删除接口
    alert(`删除 ${name} 功能待实现`)
  } catch (e) {
    alert('删除失败: ' + e.message)
  }
}

onMounted(() => {
  fetchStatus()
  timer = setInterval(fetchStatus, 5000)
})
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.page-title { font-size: 28px; font-weight: 700; margin-bottom: 24px; }
.ollama-status {
  display: flex; align-items: center; gap: 12px; font-size: 15px;
}
.status-indicator {
  width: 10px; height: 10px; border-radius: 50%;
}
.status-indicator.running { background: var(--success); }
.status-indicator.stopped { background: var(--error); }
.status-detail { color: var(--text-dim); font-size: 13px; margin-left: auto; }
.empty {
  color: var(--text-dim); font-size: 14px; text-align: center; padding: 32px;
}
.model-list { display: flex; flex-direction: column; gap: 12px; }
.model-item {
  padding: 16px; background: var(--surface-2); border-radius: 6px;
  display: flex; justify-content: space-between; align-items: center; gap: 16px;
}
.model-name { font-weight: 500; font-size: 15px; }
.model-desc { font-size: 13px; color: var(--text-dim); margin-top: 4px; }
.btn-secondary {
  background: var(--surface-3); color: var(--text);
}
</style>
