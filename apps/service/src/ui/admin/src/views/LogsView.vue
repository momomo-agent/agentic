<template>
  <div class="logs-view">
    <h1 class="page-title">日志</h1>

    <div class="toolbar">
      <div class="filters">
        <button v-for="lvl in levels" :key="lvl.value"
                class="filter-btn" :class="{ active: activeLevel === lvl.value }"
                @click="activeLevel = lvl.value">
          {{ lvl.label }}
        </button>
      </div>
      <div class="toolbar-right">
        <input class="search-input" v-model="search" placeholder="搜索日志..." />
        <button class="btn-small" @click="logs = []">清除</button>
      </div>
    </div>

    <div class="log-stream" ref="logEl">
      <div v-if="filtered.length === 0" class="empty">暂无日志</div>
      <div v-for="(log, i) in filtered" :key="i" class="log-line" :class="log.level">
        <span class="log-time">{{ formatTime(log.ts) }}</span>
        <span class="log-level-tag" :class="log.level">{{ log.level || 'info' }}</span>
        <span class="log-msg">{{ log.msg }}</span>
      </div>
    </div>

    <div class="log-footer">
      <span class="log-count">{{ filtered.length }} / {{ logs.length }} 条</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'

const logs = ref([])
const logEl = ref(null)
const activeLevel = ref('all')
const search = ref('')
let timer = null

const levels = [
  { value: 'all', label: '全部' },
  { value: 'info', label: 'Info' },
  { value: 'warn', label: 'Warn' },
  { value: 'error', label: 'Error' },
]

const filtered = computed(() => {
  let result = logs.value
  if (activeLevel.value !== 'all') {
    result = result.filter(l => l.level === activeLevel.value)
  }
  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter(l => (l.msg || '').toLowerCase().includes(q))
  }
  return result
})

async function fetchLogs() {
  try {
    const res = await fetch('/api/logs').then(r => r.json())
    logs.value = Array.isArray(res) ? res : []
    await nextTick()
    if (logEl.value) logEl.value.scrollTop = logEl.value.scrollHeight
  } catch {}
}

function formatTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('zh-CN', { hour12: false })
}

onMounted(() => {
  fetchLogs()
  timer = setInterval(fetchLogs, 3000)
})
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.toolbar {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 16px; gap: 12px; flex-wrap: wrap;
}
.filters { display: flex; gap: 6px; }
.filter-btn {
  padding: 5px 12px; border-radius: 6px; font-size: 13px; font-weight: 500;
  background: var(--surface-2); color: var(--text-dim); border: 1px solid var(--border);
  cursor: pointer; transition: all 0.15s;
}
.filter-btn:hover { color: var(--text); }
.filter-btn.active { background: var(--primary, #0075de); color: #fff; border-color: var(--primary, #0075de); }

.toolbar-right { display: flex; gap: 8px; align-items: center; }
.search-input {
  padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border);
  background: var(--surface); font-size: 13px; color: var(--text); width: 200px;
}
.search-input::placeholder { color: var(--text-dim); opacity: 0.5; }

.btn-small {
  padding: 6px 12px; border-radius: 6px; font-size: 13px;
  background: var(--surface-2); color: var(--text-dim); border: 1px solid var(--border);
  cursor: pointer;
}
.btn-small:hover { color: var(--text); }

.log-stream {
  height: calc(100vh - 240px); overflow-y: auto;
  font-family: 'SF Mono', Monaco, monospace; font-size: 13px;
  background: var(--surface-2); padding: 16px; border-radius: 10px;
  border: 1px solid var(--border);
}
.log-line { display: flex; gap: 8px; padding: 3px 0; align-items: baseline; }
.log-line.error .log-msg { color: var(--error, #ef4444); }
.log-line.warn .log-msg { color: #f59e0b; }
.log-time { color: var(--text-dim); flex-shrink: 0; }
.log-msg { color: var(--text); word-break: break-all; }
.log-level-tag {
  font-size: 11px; font-weight: 600; padding: 1px 5px; border-radius: 3px;
  flex-shrink: 0; text-transform: uppercase;
  background: rgba(255,255,255,0.06); color: var(--text-dim);
}
.log-level-tag.error { background: rgba(239,68,68,0.15); color: var(--error, #ef4444); }
.log-level-tag.warn { background: rgba(245,158,11,0.15); color: #f59e0b; }

.empty { color: var(--text-dim); font-size: 14px; text-align: center; padding: 48px; }

.log-footer {
  display: flex; justify-content: flex-end; padding-top: 8px;
}
.log-count { font-size: 12px; color: var(--text-dim); }
</style>
