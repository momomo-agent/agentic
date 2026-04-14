<template>
  <div class="memory-panel">
    <p class="hint">agentic-memory — 对话上下文管理 + 知识检索，全部在浏览器端运行</p>

    <div class="mem-section">
      <h3>💬 对话上下文</h3>
      <div class="mem-controls">
        <input v-model="userMsg" @keydown.enter="addUser" placeholder="模拟用户消息..." />
        <button @click="addUser" :disabled="!userMsg.trim()">发送</button>
        <button @click="addAssistant" class="btn-secondary">模拟 AI 回复</button>
        <button @click="clearConvo" class="btn-secondary">清空</button>
      </div>
      <div class="mem-messages">
        <div v-for="(m, i) in messages" :key="i" class="mem-msg" :class="m.role">
          <span class="mem-role">{{ m.role }}</span>
          <span class="mem-text">{{ m.content }}</span>
        </div>
        <div v-if="!messages.length" class="mem-empty">对话为空</div>
      </div>
      <div class="mem-info">
        <span>消息数: {{ messages.length }}</span>
        <span>Token 估算: {{ tokenCount }}</span>
      </div>
    </div>

    <div class="mem-section">
      <h3>🧠 知识库</h3>
      <div class="mem-controls">
        <input v-model="learnId" placeholder="知识 ID" style="width:120px" />
        <input v-model="learnText" placeholder="知识内容..." style="flex:1" @keydown.enter="learn" />
        <button @click="learn" :disabled="!learnId.trim() || !learnText.trim()">学习</button>
      </div>
      <div class="mem-controls">
        <input v-model="recallQuery" placeholder="搜索知识..." style="flex:1" @keydown.enter="recall" />
        <button @click="recall" :disabled="!recallQuery.trim()">检索</button>
      </div>
      <div class="mem-knowledge" v-if="knowledgeIds.length">
        <span class="mem-tag" v-for="id in knowledgeIds" :key="id">
          📄 {{ id }}
          <button class="mem-tag-del" @click="forget(id)">×</button>
        </span>
      </div>
      <div class="mem-results" v-if="recallResults.length">
        <div class="result-label">检索结果</div>
        <div v-for="(r, i) in recallResults" :key="i" class="mem-result-item">
          <span class="mem-result-id">{{ r.id }}</span>
          <span class="mem-result-score">{{ (r.score * 100).toFixed(0) }}%</span>
          <span class="mem-result-text">{{ r.chunk || r.text }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({ markTested: Function })
defineEmits(['back'])

const userMsg = ref('')
const messages = ref([])
const tokenCount = ref(0)
const learnId = ref('')
const learnText = ref('')
const recallQuery = ref('')
const recallResults = ref([])
const knowledgeIds = ref([])

let mem = null

onMounted(async () => {
  try {
    // Load agentic-memory from CDN or local
    if (!window.AgenticMemory) {
      const script = document.createElement('script')
      script.src = '/agentic-memory.js'
      await new Promise((resolve, reject) => {
        script.onload = resolve
        script.onerror = () => {
          // Try CDN fallback
          const s2 = document.createElement('script')
          s2.src = 'https://unpkg.com/agentic-memory/agentic-memory.js'
          s2.onload = resolve
          s2.onerror = reject
          document.head.appendChild(s2)
        }
        document.head.appendChild(script)
      })
    }
    const { createMemory } = window.AgenticMemory
    mem = createMemory({ maxTokens: 4000, knowledge: true })
  } catch (e) {
    messages.value = [{ role: 'system', content: `加载 agentic-memory 失败: ${e.message}` }]
  }
})

function addUser() {
  if (!userMsg.value.trim() || !mem) return
  mem.user(userMsg.value.trim())
  refreshMessages()
  userMsg.value = ''
  props.markTested?.('memory')
}

function addAssistant() {
  if (!mem) return
  mem.assistant('这是一条模拟的 AI 回复。')
  refreshMessages()
}

function clearConvo() {
  if (!mem) return
  mem.clear()
  refreshMessages()
}

function refreshMessages() {
  messages.value = mem.history ? [...mem.history()] : []
  tokenCount.value = mem.tokens ? mem.tokens() : 0
}

async function learn() {
  if (!learnId.value.trim() || !learnText.value.trim() || !mem) return
  await mem.learn(learnId.value.trim(), learnText.value.trim())
  if (!knowledgeIds.value.includes(learnId.value.trim())) {
    knowledgeIds.value.push(learnId.value.trim())
  }
  learnId.value = ''
  learnText.value = ''
  props.markTested?.('memory')
}

async function recall() {
  if (!recallQuery.value.trim() || !mem) return
  const results = await mem.recall(recallQuery.value.trim())
  recallResults.value = results || []
}

async function forget(id) {
  if (!mem) return
  await mem.forget(id)
  knowledgeIds.value = knowledgeIds.value.filter(k => k !== id)
}
</script>

<style scoped>
@import './_shared.css';
.memory-panel { display: flex; flex-direction: column; gap: 24px; }
.mem-section h3 { font-size: 15px; margin-bottom: 12px; }
.mem-controls { display: flex; gap: 8px; margin-bottom: 8px; }
.mem-controls input { padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border, #334155); background: var(--surface-2, #1e293b); color: var(--text); font-size: 14px; flex: 1; }
.mem-controls button { padding: 8px 16px; border-radius: 8px; border: none; background: var(--accent, #3b82f6); color: white; cursor: pointer; font-size: 13px; white-space: nowrap; }
.mem-controls button:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary { background: var(--surface-3, #374151) !important; color: var(--text) !important; }
.mem-messages { max-height: 250px; overflow-y: auto; background: var(--surface-2, #1e293b); border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 6px; }
.mem-msg { display: flex; gap: 8px; font-size: 13px; }
.mem-role { font-weight: 600; min-width: 60px; color: var(--text-secondary, #94a3b8); }
.mem-msg.user .mem-role { color: var(--accent, #3b82f6); }
.mem-msg.assistant .mem-role { color: #10b981; }
.mem-text { color: var(--text); }
.mem-empty { color: var(--text-secondary, #64748b); text-align: center; padding: 20px; }
.mem-info { display: flex; gap: 16px; font-size: 12px; color: var(--text-secondary, #94a3b8); }
.mem-knowledge { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
.mem-tag { display: flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 16px; background: var(--surface-3, #374151); font-size: 12px; color: var(--text); }
.mem-tag-del { background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 14px; padding: 0 2px; }
.mem-results { margin-top: 8px; }
.mem-result-item { display: flex; gap: 10px; padding: 8px 12px; border-radius: 8px; background: var(--surface-2, #1e293b); margin-top: 4px; font-size: 13px; }
.mem-result-id { font-weight: 600; color: var(--accent, #3b82f6); min-width: 60px; }
.mem-result-score { color: #10b981; min-width: 40px; }
.mem-result-text { color: var(--text); flex: 1; }
</style>
