const API_BASE = 'http://localhost:1234'

const messages = document.getElementById('messages')
const input = document.getElementById('input')
const sendBtn = document.getElementById('sendBtn')
const clearBtn = document.getElementById('clearBtn')
const modelSelect = document.getElementById('modelSelect')

let conversationHistory = []
let isProcessing = false

function addMessage(role, content) {
  const msg = document.createElement('div')
  msg.className = `message ${role}`
  msg.textContent = content
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
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: conversationHistory,
        model: modelSelect.value
      })
    })
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let assistantText = ''
    
    // 创建 assistant 消息元素
    const assistantMsg = document.createElement('div')
    assistantMsg.className = 'message assistant'
    messages.appendChild(assistantMsg)
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') break
        
        try {
          const chunk = JSON.parse(data)
          if (chunk.type === 'content') {
            const text = chunk.content || chunk.text || ''
            assistantText += text
            assistantMsg.textContent = assistantText
            messages.scrollTop = messages.scrollHeight
          }
        } catch {}
      }
    }
    
    conversationHistory.push({ role: 'assistant', content: assistantText })
    
  } catch (e) {
    console.error('Send failed:', e)
    addMessage('system', '发送失败: ' + e.message)
  } finally {
    isProcessing = false
    sendBtn.disabled = false
    input.focus()
  }
}

function clearChat() {
  conversationHistory = []
  messages.innerHTML = ''
  addMessage('system', '对话已清空')
}

// 事件绑定
sendBtn.addEventListener('click', sendMessage)
clearBtn.addEventListener('click', clearChat)

input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
})

// 初始化
addMessage('system', '选择模型并开始对话')
input.focus()
