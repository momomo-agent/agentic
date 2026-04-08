const API_BASE = 'http://localhost:1234'

const textInput = document.getElementById('textInput')
const voiceGrid = document.getElementById('voiceGrid')
const synthesizeBtn = document.getElementById('synthesizeBtn')
const downloadBtn = document.getElementById('downloadBtn')

const voices = [
  { id: 'alloy', name: 'Alloy', desc: '中性，清晰' },
  { id: 'echo', name: 'Echo', desc: '男性，沉稳' },
  { id: 'fable', name: 'Fable', desc: '英式，优雅' },
  { id: 'onyx', name: 'Onyx', desc: '男性，深沉' },
  { id: 'nova', name: 'Nova', desc: '女性，活泼' },
  { id: 'shimmer', name: 'Shimmer', desc: '女性，温柔' },
]

let selectedVoice = 'alloy'
let audioBlobs = {}

// 渲染声音卡片
function renderVoices() {
  voiceGrid.innerHTML = ''
  voices.forEach(v => {
    const card = document.createElement('div')
    card.className = `voice-card ${v.id === selectedVoice ? 'selected' : ''}`
    card.innerHTML = `
      <h3>${v.name}</h3>
      <p>${v.desc}</p>
      <audio controls style="display: none;"></audio>
    `
    card.addEventListener('click', () => {
      selectedVoice = v.id
      renderVoices()
    })
    voiceGrid.appendChild(card)
  })
}

// 合成语音
async function synthesize() {
  const text = textInput.value.trim()
  if (!text) {
    alert('请输入文本')
    return
  }
  
  synthesizeBtn.disabled = true
  synthesizeBtn.textContent = '合成中...'
  audioBlobs = {}
  
  // 为所有声音合成
  for (const voice of voices) {
    try {
      const res = await fetch(`${API_BASE}/api/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: voice.id })
      })
      
      if (!res.ok) throw new Error('Synthesis failed')
      
      const blob = await res.blob()
      audioBlobs[voice.id] = blob
      
      // 更新对应卡片的音频
      const cards = voiceGrid.querySelectorAll('.voice-card')
      const card = cards[voices.findIndex(v => v.id === voice.id)]
      const audio = card.querySelector('audio')
      audio.src = URL.createObjectURL(blob)
      audio.style.display = 'block'
      
    } catch (e) {
      console.error(`Synthesis failed for ${voice.id}:`, e)
    }
  }
  
  synthesizeBtn.disabled = false
  synthesizeBtn.textContent = '合成语音'
  downloadBtn.disabled = false
}

// 下载当前选中的音频
function download() {
  const blob = audioBlobs[selectedVoice]
  if (!blob) {
    alert('请先合成语音')
    return
  }
  
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `tts-${selectedVoice}-${Date.now()}.wav`
  a.click()
}

synthesizeBtn.addEventListener('click', synthesize)
downloadBtn.addEventListener('click', download)

renderVoices()
