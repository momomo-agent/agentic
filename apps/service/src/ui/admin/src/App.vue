<template>
  <div class="layout">
    <nav class="nav">
      <div class="nav-brand">⚡ Agentic Service</div>
      <div class="nav-status" :class="online ? 'online' : 'offline'">
        {{ online ? '运行中' : '离线' }}
      </div>
    </nav>
    <main class="main">
      <DashboardView />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import DashboardView from './views/DashboardView.vue'

const online = ref(false)
let timer = null
async function check() {
  try { online.value = (await fetch('/health')).ok } catch { online.value = false }
}
onMounted(() => { check(); timer = setInterval(check, 5000) })
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.layout { display: flex; flex-direction: column; min-height: 100vh; }
.nav {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 32px; height: 56px;
  background: var(--surface); border-bottom: 1px solid var(--border);
  position: sticky; top: 0; z-index: 10;
}
.nav-brand { font-weight: 700; font-size: 15px; }
.nav-status { font-size: 12px; padding: 4px 10px; border-radius: 99px; font-weight: 500; }
.online { background: rgba(16,185,129,0.15); color: var(--success); }
.offline { background: rgba(239,68,68,0.15); color: var(--error); }
.main { flex: 1; padding: 32px; }
</style>
