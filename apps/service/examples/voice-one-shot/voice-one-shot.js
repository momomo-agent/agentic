const ai = new AgenticClient('http://localhost:1234')

const micBtn = document.getElementById('micBtn')
const status = document.getElementById('status')
const latency = document.getElementById('latency')
const result = document.getElementById('result')
const audio = document.getElementById('audio')

let mediaRecorder = null
let audioChunks = []
let isRecording = false
let startTime = 0

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
      await processVoice()
    }

    mediaRecorder.start()
    isRecording = true
    micBtn.classList.add('recording')
    status.textContent = '正在录音...'
    latency.textContent = ''
    startTime = Date.now()
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

async function processVoice() {
  const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })

  try {
    const responseData = await ai.converse(audioBlob)
    const responseBlob = new Blob([responseData], { type: 'audio/wav' })
    const audioUrl = URL.createObjectURL(responseBlob)

    const elapsed = Date.now() - startTime
    latency.textContent = `⚡ 总耗时: ${elapsed}ms`

    audio.src = audioUrl
    audio.style.display = 'block'
    audio.play()

    result.textContent = '✓ 完成！一次调用完成 STT → LLM → TTS'
    status.textContent = '准备就绪'
  } catch (e) {
    status.textContent = '处理失败'
    result.textContent = '错误: ' + e.message
    latency.textContent = ''
  }
}

micBtn.addEventListener('mousedown', startRecording)
micBtn.addEventListener('mouseup', stopRecording)
micBtn.addEventListener('touchstart', e => { e.preventDefault(); startRecording() })
micBtn.addEventListener('touchend', e => { e.preventDefault(); stopRecording() })
micBtn.addEventListener('mouseleave', () => { if (isRecording) stopRecording() })
