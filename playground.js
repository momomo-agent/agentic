import { agenticAsk } from './agentic-agent.js'

// Playground state
let pgMem = AgenticMemory.createMemory({ maxTokens: 6000 })
const pgChatEl = document.getElementById('pgChat')
const pgInputEl = document.getElementById('pgInput')

// Load saved config
try {
  const saved = JSON.parse(localStorage.getItem('agentic-pg') || '{}')
  if (saved.key) document.getElementById('pgKey').value = saved.key
  if (saved.provider) document.getElementById('pgProvider').value = saved.provider
  if (saved.proxy) document.getElementById('pgProxy').value = saved.proxy
  if (saved.baseUrl) document.getElementById('pgBase').value = saved.baseUrl
  if (saved.model) document.getElementById('pgModel').value = saved.model
} catch (e) { console.warn('[playground] Failed to load config:', e) }

pgInputEl.addEventListener('keydown', e => { if (e.key === 'Enter') pgDoSend() })

function pgSaveConfig() {
  try {
    localStorage.setItem('agentic-pg', JSON.stringify({
      key: document.getElementById('pgKey').value,
      provider: document.getElementById('pgProvider').value,
      proxy: document.getElementById('pgProxy').value,
      baseUrl: document.getElementById('pgBase').value,
      model: document.getElementById('pgModel').value,
    }))
  } catch {}
}

async function pgDoSend() {
  const text = pgInputEl.value.trim()
  const apiKey = document.getElementById('pgKey').value.trim()
  if (!text) return
  if (!apiKey) { alert('Enter an API key'); return }

  pgSaveConfig()
  pgInputEl.value = ''
  const btn = document.getElementById('pgSend')
  btn.disabled = true

  // Clear empty state
  const empty = pgChatEl.querySelector('.pg-empty')
  if (empty) empty.remove()

  // Add user message
  addPgMsg('user', text)

  // Add to memory
  await pgMem.user(text)
  updatePgStatus()

  // Create assistant message container
  const assistDiv = document.createElement('div')
  assistDiv.className = 'pg-msg assistant'
  assistDiv.innerHTML = '<div class="pg-role">assistant</div><div class="pg-content"></div>'
  pgChatEl.appendChild(assistDiv)
  const contentEl = assistDiv.querySelector('.pg-content')

  // Create renderer for this message (agentic-render)
  const renderer = AgenticRender.create(contentEl, { theme: 'dark' })

  document.getElementById('pgState').textContent = 'Calling LLM...'

  try {
    const provider = document.getElementById('pgProvider').value
    const baseUrl = document.getElementById('pgBase').value.trim()
    const model = document.getElementById('pgModel').value.trim()
    const proxy = document.getElementById('pgProxy').value.trim()

    // Use agentic-lite (agenticAsk) for LLM calls
    const answer = await agenticAsk(text, {
      provider,
      apiKey,
      baseUrl: baseUrl || undefined,
      model: model || undefined,
      proxyUrl: proxy || undefined,
      history: pgMem.history(),
      tools: []
    }, (event, data) => {
      if (event === 'status') {
        document.getElementById('pgState').textContent = data.message
      }
    })

    renderer.set(answer)
    await pgMem.assistant(answer)
    updatePgStatus()
    document.getElementById('pgState').textContent = 'Ready'
  } catch (err) {
    contentEl.innerHTML = `<span style="color:#ef4444">${esc(err.message)}</span><br><span style="color:#666;font-size:11px">Check browser console for details</span>`
    document.getElementById('pgState').textContent = 'Error'
    console.error('[playground]', err)
  }

  btn.disabled = false
  pgChatEl.scrollTop = pgChatEl.scrollHeight
  pgInputEl.focus()
}

function addPgMsg(role, text) {
  const div = document.createElement('div')
  div.className = `pg-msg ${role}`
  div.innerHTML = `<div class="pg-role">${role}</div><div class="pg-content">${esc(text)}</div>`
  pgChatEl.appendChild(div)
  pgChatEl.scrollTop = pgChatEl.scrollHeight
}

function updatePgStatus() {
  const info = pgMem.info()
  document.getElementById('pgMem').textContent = `Memory: ${info.tokens} tokens · ${info.turns} turns`
}

function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }

// Expose to global scope for onclick
window.pgDoSend = pgDoSend

console.log('[playground] Loaded — agentic-lite + agentic-memory + agentic-render')
