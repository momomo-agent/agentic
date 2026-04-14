<template>
  <div class="render-panel">
    <p class="hint">agentic-render — 流式 Markdown 渲染，支持半开代码块、表格、语法高亮</p>
    <div class="render-controls">
      <button @click="streamDemo" :disabled="streaming" class="btn-primary">
        {{ streaming ? '渲染中...' : '▶ 流式演示' }}
      </button>
      <button @click="setDemo" class="btn-secondary">一次性渲染</button>
      <select v-model="theme" @change="switchTheme">
        <option value="dark">Dark</option>
        <option value="light">Light</option>
      </select>
      <button @click="clearOutput" class="btn-secondary">清空</button>
    </div>
    <div class="render-split">
      <div class="render-input">
        <textarea v-model="markdown" placeholder="输入 Markdown..." rows="12"></textarea>
        <button @click="renderInput" :disabled="!markdown.trim()" class="btn-primary" style="align-self:flex-start;margin-top:8px;">渲染</button>
      </div>
      <div class="render-output" ref="outputEl"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({ markTested: Function })
defineEmits(['back'])

const outputEl = ref(null)
const markdown = ref('')
const theme = ref('dark')
const streaming = ref(false)
let renderer = null

const demoMarkdown = `# Hello from agentic-render

This is **streaming** markdown rendering. No flicker, no reflow.

## Features

- Bold, *italic*, ~~strikethrough~~
- Inline \`code\` and fenced blocks
- Tables, lists, blockquotes

\`\`\`javascript
async function hello() {
  const response = await fetch('/api/chat')
  const data = await response.json()
  console.log(data.answer)
}
\`\`\`

> "The best renderer is the one you don't notice." — agentic-render

| Feature | Status |
|---------|--------|
| Streaming | ✅ |
| Code highlight | ✅ |
| Tables | ✅ |
| Zero deps | ✅ |

---

That's it. One file. Done.`

onMounted(async () => {
  try {
    if (!window.AgenticRender) {
      const script = document.createElement('script')
      script.src = '/agentic-render.js'
      await new Promise((resolve, reject) => {
        script.onload = resolve
        script.onerror = () => {
          const s2 = document.createElement('script')
          s2.src = 'https://unpkg.com/agentic-render/agentic-render.js'
          s2.onload = resolve
          s2.onerror = reject
          document.head.appendChild(s2)
        }
        document.head.appendChild(script)
      })
    }
    renderer = window.AgenticRender.create(outputEl.value, { theme: theme.value })
  } catch (e) {
    if (outputEl.value) outputEl.value.textContent = `加载 agentic-render 失败: ${e.message}`
  }
})

async function streamDemo() {
  if (!renderer || streaming.value) return
  streaming.value = true
  renderer.set('')
  const chars = demoMarkdown.split('')
  for (let i = 0; i < chars.length; i++) {
    renderer.append(chars[i])
    if (i % 3 === 0) await new Promise(r => setTimeout(r, 15))
  }
  streaming.value = false
  props.markTested?.('render')
}

function setDemo() {
  if (!renderer) return
  renderer.set(demoMarkdown)
  props.markTested?.('render')
}

function renderInput() {
  if (!renderer || !markdown.value.trim()) return
  renderer.set(markdown.value)
}

function switchTheme() {
  if (renderer) renderer.setTheme(theme.value)
}

function clearOutput() {
  if (renderer) renderer.set('')
}
</script>

<style scoped>
@import './_shared.css';
.render-panel { display: flex; flex-direction: column; gap: 16px; }
.render-controls { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.render-controls select { padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border, #334155); background: var(--surface-2, #1e293b); color: var(--text); font-size: 13px; }
.btn-secondary { background: var(--surface-3, #374151) !important; color: var(--text) !important; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; }
.render-split { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; min-height: 400px; }
.render-input { display: flex; flex-direction: column; }
.render-input textarea { flex: 1; padding: 12px; border-radius: 10px; border: 1px solid var(--border, #334155); background: var(--surface-2, #1e293b); color: var(--text); font-size: 13px; font-family: 'SF Mono', monospace; resize: none; }
.render-output { background: var(--surface-2, #1e293b); border-radius: 10px; padding: 16px; overflow-y: auto; min-height: 300px; }
</style>
