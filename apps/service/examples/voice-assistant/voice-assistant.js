const ai = new AgenticClient('http://localhost:1234')

const micBtn = document.getElementById('micBtn')
const status = document.getElementById('status')
const transcript = document.getElementById('transcript')
const response = document.getElementById('response')

let mediaRecorder = null
let audioChunks = []
let isRecording = false

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
    status.textContent = '麦克风访问失败'
  }
}

function stopRecording() {
  if (!isRecording || !mediaRecorder) return
  mediaRecorder.stop()
  isRecording = false
  micBtn.classList.remove('recording')
  status.textContent = '处理中...'
}

async function processAudio() {
  const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })

  try {
    // STT
    status.textContent = '识别中...'
    const text = await ai.listen(audioBlob)
    transcript.textContent = text || '(无法识别)'
    if (!text) { status.textContent = '准备就绪'; return }

    // LLM (streaming)
    status.textContent = '思考中...'
    let assistantText = ''
    for await (const chunk of ai.think(text, { stream: true })) {
      if (chunk.type === 'text_delta') {
        assistantText += chunk.text
        response.textContent = assistantText
      }
    }

    // TTS
    status.textContent = '播放中...'
    const audioData = await ai.speak(assistantText)
    const blob = new Blob([audioData], { type: 'audio/wav' })
    const audioEl = new Audio(URL.createObjectURL(blob))
    audioEl.play()
    audioEl.onended = () => { status.textContent = '准备就绪' }
  } catch (e) {
    status.textContent = '处理失败: ' + e.message
    response.textContent = '错误: ' + e.message
  }
}

micBtn.addEventListener('mousedown', startRecording)
micBtn.addEventListener('mouseup', stopRecording)
micBtn.addEventListener('touchstart', e => { e.preventDefault(); startRecording() })
micBtn.addEventListener('touchend', e => { e.preventDefault(); stopRecording() })
micBtn.addEventListener('mouseleave', () => { if (isRecording) stopRecording() })
