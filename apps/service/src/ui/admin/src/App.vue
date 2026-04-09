<template>
  <div class="layout">
    <nav class="sidebar">
      <div class="sidebar-brand">⚡ Agentic Service</div>
      <div class="sidebar-status" :class="online ? 'online' : 'offline'">
        {{ online ? '运行中' : '离线' }}
      </div>
      <div class="sidebar-nav">
        <div class="nav-section">管理</div>
        <button v-for="item in navItems" :key="item.id"
                class="nav-item" :class="{ active: currentView === item.id }"
                @click="currentView = item.id">
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-label">{{ item.label }}</span>
        </button>
        <div class="nav-section" style="margin-top: 16px">测试</div>
        <button v-for="item in testItems" :key="item.id"
                class="nav-item" :class="{ active: currentView === item.id }"
                @click="currentView = item.id">
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-label">{{ item.label }}</span>
        </button>
      </div>
    </nav>
    <main class="main">
      <StatusView v-if="currentView === 'status'" />
      <ModelsView v-else-if="currentView === 'models'" />
      <ConfigView v-else-if="currentView === 'config'" />
      <LogsView v-else-if="currentView === 'logs'" />
      <ExamplesView v-else-if="currentView === 'examples'" />
      <TestView v-else-if="currentView === 'tests'" />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import StatusView from './views/StatusView.vue'
import ModelsView from './views/ModelsView.vue'
import ConfigView from './views/ConfigView.vue'
import ExamplesView from './views/ExamplesView.vue'
import TestView from './views/TestView.vue'
import LogsView from './views/LogsView.vue'

const currentView = ref('status')
const online = ref(false)
let timer = null

const navItems = [
  { id: 'status', label: '系统状态', icon: '📊' },
  { id: 'models', label: '模型管理', icon: '🤖' },
  { id: 'config', label: '配置', icon: '⚙️' },
  { id: 'logs', label: '日志', icon: '📋' },
]

const testItems = [
  { id: 'examples', label: 'Examples', icon: '🎮' },
  { id: 'tests', label: 'Tests', icon: '🧪' },
]

async function check() {
  try { online.value = (await fetch('/health')).ok } catch { online.value = false }
}
onMounted(() => { check(); timer = setInterval(check, 5000) })
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.layout { display: flex; min-height: 100vh; }
.sidebar {
  width: 220px; flex-shrink: 0;
  background: var(--surface); border-right: 1px solid var(--border);
  display: flex; flex-direction: column; padding: 16px 0;
}
.sidebar-brand { font-weight: 700; font-size: 15px; padding: 0 20px 12px; color: var(--text); }
.sidebar-status {
  font-size: 12px; padding: 4px 10px; border-radius: 99px; font-weight: 500;
  margin: 0 20px 16px; display: inline-block; width: fit-content;
}
.online { background: rgba(13,150,104,0.1); color: var(--success); }
.offline { background: rgba(220,53,69,0.1); color: var(--error); }
.sidebar-nav { display: flex; flex-direction: column; }
.nav-section {
  font-size: 11px; font-weight: 600; color: var(--text-dim);
  padding: 8px 20px 4px; text-transform: uppercase; letter-spacing: 0.5px;
}
.nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 20px; border: none; background: none;
  cursor: pointer; font-size: 14px; color: var(--text-dim);
  text-align: left; width: 100%; transition: all 0.15s;
  border-left: 3px solid transparent;
}
.nav-item:hover { background: var(--surface-2); color: var(--text); }
.nav-item.active {
  background: var(--surface-2); color: var(--primary);
  font-weight: 600; border-left-color: var(--primary);
}
.nav-icon { font-size: 16px; width: 24px; text-align: center; }
.main { flex: 1; padding: 32px; overflow-y: auto; }
</style>
