const ai = new AgenticClient('http://localhost:1234')

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
  return msg
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
    const assistantMsg = addMessage('assistant', '')
    let assistantText = ''

    for await (const chunk of ai.think(conversationHistory, {
      model: modelSelect.value,
      stream: true
    })) {
      if (chunk.type === 'text_delta') {
        assistantText += chunk.text
        assistantMsg.textContent = assistantText
        messages.scrollTop = messages.scrollHeight
      }
    }

    conversationHistory.push({ role: 'assistant', content: assistantText })
  } catch (e) {
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

sendBtn.addEventListener('click', sendMessage)
clearBtn.addEventListener('click', clearChat)
input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
})

addMessage('system', '选择模型并开始对话')
input.focus()
