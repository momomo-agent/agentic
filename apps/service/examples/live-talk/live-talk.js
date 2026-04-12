// Live Talk - 实时语音视觉对话
// AgenticClient (STT + LLM) + AgenticVoice (streaming TTS)

const ai = new AgenticClient('http://localhost:1234')

const video = document.getElementById('video')
const statusDot = document.getElementById('statusDot')
const statusText = document.getElementById('statusText')
const startBtn = document.getElementById('startBtn')
const stopBtn = document.getElementById('stopBtn')
const messages = document.getElementById('messages')
const textInput = document.getElementById('textInput')
const sendBtn = document.getElementById('sendBtn')

let voice = null
let isActive = false
let isProcessing = false
let conversationHistory = []

function addMessage(role, content) {
  const msg = document.createElement('div')
  msg.className = `message ${role}`
  msg.textContent = content
  messages.appendChild(msg)
  messages.scrollTop = messages.scrollHeight
}

function setStatus(status, text) {
  statusDot.className = `status-dot ${status}`
  statusText.textContent = text
}

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
    addMessage('system', '摄像头初始化失败: ' + e.message)
    return false
  }
}

function captureFrame() {
  try {
    if (!video.videoWidth || !video.videoHeight) return null
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
    const parts = dataUrl.split(',')
    return parts.length > 1 ? parts[1] : null
  } catch (e) {
    return null
  }
}

async function sendToLLM(text, audioBlob = null, includeImage = true) {
  const content = []

  if (includeImage && video.videoWidth > 0) {
    const imageData = captureFrame()
    if (imageData) {
      content.push({
        type: 'image_url',
        image_url: { url: `data:image/jpeg;base64,${imageData}` }
      })
    }
  }

  content.push({ type: 'text', text: text || 'What do you see?' })

  const msgs = [
    {
      role: 'system',
      content: 'You are a friendly, conversational AI assistant. The user is talking to you through a microphone and showing you their camera. Keep responses to 1-3 short sentences. Be natural and concise.'
    },
    ...conversationHistory,
    { role: 'user', content }
  ]

  try {
    // Stream LLM via AgenticClient
    const textStream = {
      [Symbol.asyncIterator]: async function* () {
        for await (const chunk of ai.think(msgs, { stream: true })) {
          if (chunk.type === 'text_delta') yield chunk.text
        }
      }
    }

    setStatus('speaking', '回复中...')
    let assistantText = ''

    // Use AgenticVoice for streaming TTS playback
    const collected = []
    const tee = {
      [Symbol.asyncIterator]: async function* () {
        for await (const t of textStream) {
          collected.push(t)
          yield t
        }
      }
    }
    await voice.speakStream(tee)
    assistantText = collected.join('')

    conversationHistory.push(
      { role: 'user', content: text },
      { role: 'assistant', content: assistantText }
    )
    addMessage('assistant', assistantText)
    setStatus('listening', '聆听中...')
  } catch (e) {
    addMessage('system', '请求失败: ' + e.message)
    setStatus('active', '就绪')
  }
}

async function start() {
  if (isActive) return
  addMessage('system', '正在初始化...')

  if (!await initCamera()) return

  let mediaRecorder = null
  let audioChunks = []
  let silenceTimer = null
  const SILENCE_THRESHOLD = 800

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  mediaRecorder = new MediaRecorder(stream)

  mediaRecorder.ondataavailable = e => {
    if (e.data.size > 0) audioChunks.push(e.data)
  }

  mediaRecorder.onstop = async () => {
    if (audioChunks.length === 0) return
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
    audioChunks = []

    // STT via AgenticClient
    setStatus('active', '识别中...')
    try {
      const text = await ai.listen(audioBlob)
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
      setStatus('listening', '聆听中...')
    }
  }

  // Simple VAD
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

    if (average > 30) {
      if (!isSpeaking) {
        isSpeaking = true
        audioChunks = []
        mediaRecorder.start()
        setStatus('listening', '录音中...')
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

  // TTS via AgenticVoice (for streaming playback)
  voice = window.AgenticVoice.createVoice({
    tts: {
      provider: 'openai',
      baseUrl: 'http://localhost:1234',
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

function stop() {
  if (!isActive) return
  if (voice) { voice.stop(); voice.destroy(); voice = null }
  if (video.srcObject) { video.srcObject.getTracks().forEach(t => t.stop()); video.srcObject = null }
  isActive = false
  startBtn.disabled = false
  stopBtn.disabled = true
  setStatus('', '未连接')
  addMessage('system', '对话已停止')
}

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

startBtn.addEventListener('click', start)
stopBtn.addEventListener('click', stop)
sendBtn.addEventListener('click', sendText)
textInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendText() })
window.addEventListener('beforeunload', stop)
