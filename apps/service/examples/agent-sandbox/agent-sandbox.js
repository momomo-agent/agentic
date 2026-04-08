const API_BASE = 'http://localhost:1234'

const toolList = document.getElementById('toolList')
const messages = document.getElementById('messages')
const input = document.getElementById('input')
const sendBtn = document.getElementById('sendBtn')

const tools = [
  {
    name: 'get_weather',
    description: '获取指定城市的天气',
    enabled: true,
    mock: (city) => `${city}：晴天，25°C，湿度 60%`
  },
  {
    name: 'calculate',
    description: '执行数学计算',
    enabled: true,
    mock: (expr) => {
      try {
        return `结果: ${eval(expr)}`
      } catch {
        return '计算错误'
      }
    }
  },
  {
    name: 'search_web',
    description: '搜索网络信息',
    enabled: true,
    mock: (query) => `搜索 "${query}" 的结果：[模拟搜索结果]`
  },
  {
    name: 'get_time',
    description: '获取当前时间',
    enabled: true,
    mock: () => new Date().toLocaleString('zh-CN')
  }
]

let conversationHistory = []
let isProcessing = false

function renderTools() {
  toolList.innerHTML = ''
  tools.forEach(t => {
    const item = document.createElement('div')
    item.className = `tool-item ${t.enabled ? 'enabled' : ''}`
    item.innerHTML = `
      <div class="tool-name">${t.name}</div>
      <div class="tool-desc">${t.description}</div>
    `
    item.addEventListener('click', () => {
      t.enabled = !t.enabled
      renderTools()
    })
    toolList.appendChild(item)
  })
}

function addMessage(role, content, toolCall = null) {
  const msg = document.createElement('div')
  msg.className = `message ${role}`
  
  if (role === 'tool' && toolCall) {
    msg.innerHTML = `
      <div class="tool-call">🔧 ${toolCall.name}</div>
      <div class="tool-result">${content}</div>
    `
  } else {
    msg.textContent = content
  }
  
  messages.appendChild(msg)
  messages.scrollTop = messages.scrollHeight
}

async function sendMessage() {
  const text = input.value.trim()
  if (!text || isProcessing) return
  
  input.value = ''
  addMessage('user', text)
  
  conversationHistory.push({ role: 'user', content: text })
  
  isProcessing = true
  sendBtn.disabled = true
  
  try {
    // 构造工具定义
    const toolDefs = tools
      .filter(t => t.enabled)
      .map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: {
            type: 'object',
            properties: {},
            required: []
          }
        }
      }))
    
    const response = await fetch(`${API_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma4:e4b',
        messages: conversationHistory,
        tools: toolDefs,
        stream: false
      })
    })
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const data = await response.json()
    const choice = data.choices[0]
    const message = choice.message
    
    // 处理工具调用
    if (message.tool_calls?.length) {
      for (const tc of message.tool_calls) {
        const tool = tools.find(t => t.name === tc.function.name)
        if (tool) {
          const args = JSON.parse(tc.function.arguments || '{}')
          const result = tool.mock(...Object.values(args))
          addMessage('tool', result, { name: tool.name })
        }
      }
      
      // 继续对话（简化版，实际应该递归调用）
      addMessage('assistant', '已执行工具调用，请查看结果')
    } else {
      addMessage('assistant', message.content || '(无回复)')
      conversationHistory.push({ role: 'assistant', content: message.content })
    }
    
  } catch (e) {
    console.error('Send failed:', e)
    addMessage('assistant', '错误: ' + e.message)
  } finally {
    isProcessing = false
    sendBtn.disabled = false
    input.focus()
  }
}

sendBtn.addEventListener('click', sendMessage)
input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
})

renderTools()
addMessage('assistant', '你好！我可以使用工具来帮助你。试试问我天气、时间或者让我计算。')
input.focus()
