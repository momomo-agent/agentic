// Live Talk - 实时语音视觉对话
// 使用 agentic-sense (VAD + 摄像头) + agentic-voice (TTS)

const API_BASE = 'http://localhost:1234'

// UI 元素
const video = document.getElementById('video')
const statusDot = document.getElementById('statusDot')
const statusText = document.getElementById('statusText')
const startBtn = document.getElementById('startBtn')
const stopBtn = document.getElementById('stopBtn')
const messages = document.getElementById('messages')
const textInput = document.getElementById('textInput')
const sendBtn = document.getElementById('sendBtn')

// 状态
let audio = null
let voice = null
let isActive = false
let conversationHistory = []

// 添加消息到 UI
function addMessage(role, content) {
  const msg = document.createElement('div')
  msg.className = `message ${role}`
  msg.textContent = content
  messages.appendChild(msg)
  messages.scrollTop = messages.scrollHeight
}

// 更新状态
function setStatus(status, text) {
  statusDot.className = `status-dot ${status}`
  statusText.textContent = text
}

// 初始化摄像头
async function initCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { width: 640, height: 480 },
      audio: false 
    })
    video.srcObject = stream
    await video.play()
    return true
  } catch (e) {
    console.error('Camera init failed:', e)
    addMessage('system', '摄像头初始化失败: ' + e.message)
    return false
  }
}

// 捕获当前帧为 base64
function captureFrame() {
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  ctx.drawImage(video, 0, 0)
  return canvas.toDataURL('image/jpeg', 0.8).split(',')[1]
}

// Blob 转 base64
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// 发送消息到 LLM（带图片和音频）
async function sendToLLM(text, audioBlob = null, includeImage = true) {
  const content = []
  
  if (includeImage && video.videoWidth > 0) {
    const imageData = captureFrame()
    content.push({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${imageData}` }
    })
  }
  
  // 如果有音频，直接发送音频（Gemma 4 原生支持）
  if (audioBlob) {
    const audioData = await blobToBase64(audioBlob)
    content.push({
      type: 'input_audio',
      input_audio: {
        data: audioData,
        format: 'wav'
      }
    })
  }
  
  content.push({ type: 'text', text: text || 'What do you hear?' })
  
  const messages = [
    {
      role: 'system',
      content: 'You are a friendly, conversational AI assistant. The user is talking to you through a microphone and showing you their camera. Keep responses to 1-3 short sentences. Be natural and concise.'
    },
    ...conversationHistory,
    { role: 'user', content }
  ]
  
  try {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages })
    })
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let assistantText = ''
    
    // 创建异步迭代器供 speakStream 使用
    const textStream = {
      [Symbol.asyncIterator]: async function* () {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6)
            if (data === '[DONE]') return
            
            try {
              const chunk = JSON.parse(data)
              if (chunk.type === 'content') {
                const text = chunk.content || chunk.text || ''
                assistantText += text
                yield text
              }
            } catch {}
          }
        }
      }
    }
    
    // 流式播放
    setStatus('speaking', '回复中...')
    await voice.speakStream(textStream)
    
    // 更新历史
    conversationHistory.push(
      { role: 'user', content: text },
      { role: 'assistant', content: assistantText }
    )
    
    addMessage('assistant', assistantText)
    setStatus('listening', '聆听中...')
    
  } catch (e) {
    console.error('LLM call failed:', e)
    addMessage('system', '请求失败: ' + e.message)
    setStatus('active', '就绪')
  }
}

// 开始对话
async function start() {
  if (isActive) return
  
  addMessage('system', '正在初始化...')
  
  // 初始化摄像头
  if (!await initCamera()) return
  
  // 初始化 VAD + 录音
  let mediaRecorder = null
  let audioChunks = []
  let silenceTimer = null
  const SILENCE_THRESHOLD = 800 // ms
  
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  mediaRecorder = new MediaRecorder(stream)
  
  mediaRecorder.ondataavailable = e => {
    if (e.data.size > 0) audioChunks.push(e.data)
  }
  
  mediaRecorder.onstop = async () => {
    if (audioChunks.length === 0) return
    
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
    audioChunks = []
    
    // STT
    setStatus('active', '识别中...')
    try {
      const form = new FormData()
      form.append('audio', audioBlob)
      const res = await fetch(`${API_BASE}/api/transcribe`, { method: 'POST', body: form })
      const { text } = await res.json()
      
      if (!text?.trim()) {
        setStatus('listening', '聆听中...')
        return
      }
      
      addMessage('user', text)
      setStatus('active', '思考中...')
      isProcessing = true
      
      await sendToLLM(text, null, true)
      isProcessing = false
      
    } catch (e) {
      console.error('STT failed:', e)
      setStatus('listening', '聆听中...')
    }
  }
  
  // 简单 VAD：检测音量
  const audioContext = new AudioContext()
  const source = audioContext.createMediaStreamSource(stream)
  const analyser = audioContext.createAnalyser()
  analyser.fftSize = 2048
  source.connect(analyser)
  
  const dataArray = new Uint8Array(analyser.frequencyBinCount)
  let isSpeaking = false
  
  function detectVoice() {
    if (!isActive) return
    
    analyser.getByteFrequencyData(dataArray)
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length
    
    if (average > 30) { // 说话
      if (!isSpeaking) {
        isSpeaking = true
        audioChunks = []
        mediaRecorder.start()
        setStatus('listening', '录音中...')
        
        // 打断当前播放
        if (voice.isSpeaking) voice.stop()
      }
      
      clearTimeout(silenceTimer)
      silenceTimer = setTimeout(() => {
        if (isSpeaking && mediaRecorder.state === 'recording') {
          mediaRecorder.stop()
          isSpeaking = false
        }
      }, SILENCE_THRESHOLD)
    }
    
    requestAnimationFrame(detectVoice)
  }
  
  detectVoice()
  
  // 初始化 TTS
  voice = window.AgenticVoice.createVoice({
    tts: { 
      provider: 'openai',
      baseUrl: API_BASE,
      apiKey: 'dummy',
      voice: 'alloy'
    }
  })
  
  isActive = true
  startBtn.disabled = true
  stopBtn.disabled = false
  setStatus('listening', '聆听中...')
  addMessage('system', '对话已开始，可以说话了')
}

// 停止对话
function stop() {
  if (!isActive) return
  
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop()
  }
  
  if (mediaRecorder?.stream) {
    mediaRecorder.stream.getTracks().forEach(t => t.stop())
  }
  
  if (voice) {
    voice.stop()
    voice.destroy()
    voice = null
  }
  
  if (video.srcObject) {
    video.srcObject.getTracks().forEach(t => t.stop())
    video.srcObject = null
  }
  
  isActive = false
  startBtn.disabled = false
  stopBtn.disabled = true
  setStatus('', '未连接')
  addMessage('system', '对话已停止')
}

// 文字输入
async function sendText() {
  const text = textInput.value.trim()
  if (!text) return
  
  textInput.value = ''
  addMessage('user', text)
  
  if (isActive) {
    voice.stop()
    await sendToLLM(text, true)
  } else {
    addMessage('system', '请先开始对话')
  }
}

// 事件绑定
startBtn.addEventListener('click', start)
stopBtn.addEventListener('click', stop)
sendBtn.addEventListener('click', sendText)
textInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') sendText()
})

// 页面卸载时清理
window.addEventListener('beforeunload', stop)
