const API_BASE = 'http://localhost:1234'

const micBtn = document.getElementById('micBtn')
const status = document.getElementById('status')
const transcript = document.getElementById('transcript')
const response = document.getElementById('response')

let voice = null
let mediaRecorder = null
let audioChunks = []
let isRecording = false

// 初始化 TTS
voice = window.AgenticVoice.createVoice({
  tts: {
    provider: 'openai',
    baseUrl: API_BASE,
    apiKey: 'dummy',
    voice: 'alloy'
  }
})

// 开始录音
async function startRecording() {
  if (isRecording) return
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(stream)
    audioChunks = []
    
    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) audioChunks.push(e.data)
    }
    
    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop())
      await processAudio()
    }
    
    mediaRecorder.start()
    isRecording = true
    micBtn.classList.add('recording')
    status.textContent = '正在录音...'
    transcript.textContent = '...'
    response.textContent = '...'
    
  } catch (e) {
    console.error('Mic access failed:', e)
    status.textContent = '麦克风访问失败'
  }
}

// 停止录音
function stopRecording() {
  if (!isRecording || !mediaRecorder) return
  
  mediaRecorder.stop()
  isRecording = false
  micBtn.classList.remove('recording')
  status.textContent = '处理中...'
}

// 处理音频
async function processAudio() {
  const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
  
  try {
    // STT
    status.textContent = '识别中...'
    const formData = new FormData()
    formData.append('audio', audioBlob)
    
    const sttRes = await fetch(`${API_BASE}/api/transcribe`, {
      method: 'POST',
      body: formData
    })
    
    if (!sttRes.ok) throw new Error('STT failed')
    
    const { text } = await sttRes.json()
    transcript.textContent = text || '(无法识别)'
    
    if (!text) {
      status.textContent = '准备就绪'
      return
    }
    
    // LLM
    status.textContent = '思考中...'
    const chatRes = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: text }]
      })
    })
    
    if (!chatRes.ok) throw new Error('Chat failed')
    
    const reader = chatRes.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let assistantText = ''
    
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
            assistantText += chunk.content || chunk.text || ''
            response.textContent = assistantText
          }
        } catch {}
      }
    }
    
    // TTS
    status.textContent = '播放中...'
    await voice.speak(assistantText)
    status.textContent = '准备就绪'
    
  } catch (e) {
    console.error('Process failed:', e)
    status.textContent = '处理失败: ' + e.message
    response.textContent = '错误: ' + e.message
  }
}

// 事件绑定
micBtn.addEventListener('mousedown', startRecording)
micBtn.addEventListener('mouseup', stopRecording)
micBtn.addEventListener('touchstart', e => {
  e.preventDefault()
  startRecording()
})
micBtn.addEventListener('touchend', e => {
  e.preventDefault()
  stopRecording()
})

// 防止意外离开按钮
micBtn.addEventListener('mouseleave', () => {
  if (isRecording) stopRecording()
})
