<template>
  <div class="fs-panel">
    <p class="hint">agentic-filesystem — 虚拟文件系统，POSIX 命令接口，浏览器端运行</p>

    <div class="fs-terminal">
      <div class="fs-output" ref="outputEl">
        <div v-for="(line, i) in output" :key="i" class="fs-line" :class="line.type">
          <span v-if="line.type === 'cmd'" class="fs-prompt">{{ line.cwd }}$</span>
          <span>{{ line.text }}</span>
        </div>
      </div>
      <div class="fs-input-row">
        <span class="fs-prompt">{{ cwd }}$</span>
        <input v-model="cmd" @keydown.enter="runCmd" @keydown.up="histUp" @keydown.down="histDown" placeholder="ls, cat, mkdir, echo, pwd..." ref="cmdInput" />
      </div>
    </div>

    <div class="fs-quick">
      <button v-for="c in quickCmds" :key="c" @click="runQuick(c)">{{ c }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue'

const props = defineProps({ markTested: Function })
defineEmits(['back'])

const cmd = ref('')
const cwd = ref('/')
const output = ref([])
const outputEl = ref(null)
const cmdInput = ref(null)
const history = ref([])
let histIdx = -1

const quickCmds = ['ls', 'pwd', 'mkdir /demo', 'echo "hello" > /demo/test.txt', 'cat /demo/test.txt', 'ls -la /demo', 'tree /']

let fs = null

onMounted(async () => {
  try {
    if (!window.AgenticFileSystem) {
      // Try loading from local or CDN
      const script = document.createElement('script')
      script.src = '/agentic-filesystem.js'
      await new Promise((resolve, reject) => {
        script.onload = resolve
        script.onerror = () => {
          // Fallback: create a minimal in-memory FS
          resolve()
        }
        document.head.appendChild(script)
      })
    }
    if (window.AgenticFileSystem) {
      const { AgenticFileSystem, MemoryStorage } = window
      fs = new AgenticFileSystem({ storage: new MemoryStorage() })
    } else {
      // Minimal in-memory FS simulation
      fs = createMinimalFs()
    }
    addOutput('system', '虚拟文件系统已就绪。输入命令或点击快捷按钮。')
  } catch (e) {
    addOutput('error', `加载失败: ${e.message}`)
  }
})

function createMinimalFs() {
  const files = { '/': { type: 'dir', children: {} } }
  const resolve = (p) => p.startsWith('/') ? p : (cwd.value === '/' ? '/' + p : cwd.value + '/' + p)
  const getNode = (p) => {
    const parts = p.split('/').filter(Boolean)
    let node = files['/']
    for (const part of parts) {
      if (!node.children?.[part]) return null
      node = node.children[part]
    }
    return node
  }
  const getParent = (p) => {
    const parts = p.split('/').filter(Boolean)
    const name = parts.pop()
    let node = files['/']
    for (const part of parts) {
      if (!node.children?.[part]) return [null, name]
      node = node.children[part]
    }
    return [node, name]
  }
  return {
    exec(command) {
      const parts = command.trim().split(/\s+/)
      const c = parts[0]
      if (c === 'pwd') return cwd.value
      if (c === 'ls') {
        const target = resolve(parts[1] || '.')
        const node = target === '.' ? getNode(cwd.value) : getNode(target)
        if (!node || node.type !== 'dir') return `ls: ${target}: No such directory`
        return Object.keys(node.children).join('  ') || '(empty)'
      }
      if (c === 'mkdir') {
        const target = resolve(parts[1] || '')
        const [parent, name] = getParent(target)
        if (!parent) return `mkdir: cannot create directory`
        parent.children[name] = { type: 'dir', children: {} }
        return ''
      }
      if (c === 'cat') {
        const target = resolve(parts[1] || '')
        const node = getNode(target)
        if (!node || node.type !== 'file') return `cat: ${target}: No such file`
        return node.content
      }
      if (c === 'echo') {
        const match = command.match(/echo\s+"?([^"]*)"?\s*>\s*(.+)/)
        if (match) {
          const [, content, path] = match
          const target = resolve(path.trim())
          const [parent, name] = getParent(target)
          if (!parent) return `echo: cannot write`
          parent.children[name] = { type: 'file', content }
          return ''
        }
        return parts.slice(1).join(' ').replace(/"/g, '')
      }
      if (c === 'cd') {
        const target = resolve(parts[1] || '/')
        const node = getNode(target)
        if (!node || node.type !== 'dir') return `cd: ${target}: No such directory`
        cwd.value = target
        return ''
      }
      if (c === 'tree') {
        const target = resolve(parts[1] || '.')
        const node = target === '.' ? getNode(cwd.value) : getNode(target)
        if (!node) return `tree: ${target}: not found`
        const lines = []
        const walk = (n, prefix) => {
          const entries = Object.entries(n.children || {})
          entries.forEach(([name, child], i) => {
            const last = i === entries.length - 1
            lines.push(`${prefix}${last ? '└── ' : '├── '}${name}${child.type === 'dir' ? '/' : ''}`)
            if (child.type === 'dir') walk(child, prefix + (last ? '    ' : '│   '))
          })
        }
        lines.push(target)
        walk(node, '')
        return lines.join('\n')
      }
      return `command not found: ${c}`
    }
  }
}

function addOutput(type, text) {
  if (type === 'cmd') {
    output.value.push({ type: 'cmd', text, cwd: cwd.value })
  } else {
    output.value.push({ type, text })
  }
  nextTick(() => {
    if (outputEl.value) outputEl.value.scrollTop = outputEl.value.scrollHeight
  })
}

function runCmd() {
  const c = cmd.value.trim()
  if (!c) return
  history.value.push(c)
  histIdx = -1
  addOutput('cmd', c)
  try {
    const result = fs.exec ? fs.exec(c) : 'FS not loaded'
    if (result) addOutput('result', result)
  } catch (e) {
    addOutput('error', e.message)
  }
  cmd.value = ''
  props.markTested?.('filesystem')
}

function runQuick(c) {
  cmd.value = c
  runCmd()
}

function histUp() {
  if (!history.value.length) return
  if (histIdx < 0) histIdx = history.value.length
  histIdx = Math.max(0, histIdx - 1)
  cmd.value = history.value[histIdx]
}

function histDown() {
  if (histIdx < 0) return
  histIdx = Math.min(history.value.length, histIdx + 1)
  cmd.value = histIdx < history.value.length ? history.value[histIdx] : ''
}
</script>

<style scoped>
@import './_shared.css';
.fs-panel { display: flex; flex-direction: column; gap: 16px; }
.fs-terminal { background: #0a0a0a; border-radius: 10px; padding: 16px; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 13px; }
.fs-output { max-height: 400px; overflow-y: auto; margin-bottom: 8px; }
.fs-line { padding: 2px 0; }
.fs-line.cmd { color: #22c55e; }
.fs-line.result { color: var(--text, #e2e8f0); white-space: pre-wrap; }
.fs-line.error { color: #ef4444; }
.fs-line.system { color: var(--text-secondary, #64748b); font-style: italic; }
.fs-prompt { color: #3b82f6; margin-right: 8px; }
.fs-input-row { display: flex; align-items: center; }
.fs-input-row input { flex: 1; background: transparent; border: none; color: var(--text, #e2e8f0); font-family: inherit; font-size: inherit; outline: none; }
.fs-quick { display: flex; gap: 6px; flex-wrap: wrap; }
.fs-quick button { padding: 4px 10px; border-radius: 16px; border: 1px solid var(--border, #334155); background: transparent; color: var(--text-secondary, #94a3b8); cursor: pointer; font-size: 11px; font-family: monospace; }
.fs-quick button:hover { background: var(--surface-3, #374151); color: var(--text); }
</style>
