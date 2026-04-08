const API_BASE = 'http://localhost:1234'

const uploadArea = document.getElementById('uploadArea')
const fileInput = document.getElementById('fileInput')
const transcribeBtn = document.getElementById('transcribeBtn')
const fileList = document.getElementById('fileList')
const resultContent = document.getElementById('resultContent')
const exportBtn = document.getElementById('exportBtn')

let files = []
let results = {}

uploadArea.addEventListener('click', () => fileInput.click())
uploadArea.addEventListener('dragover', e => {
  e.preventDefault()
  uploadArea.classList.add('dragover')
})
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'))
uploadArea.addEventListener('drop', e => {
  e.preventDefault()
  uploadArea.classList.remove('dragover')
  addFiles([...e.dataTransfer.files].filter(f => f.type.startsWith('audio/')))
})
fileInput.addEventListener('change', () => addFiles([...fileInput.files]))

function addFiles(newFiles) {
  files = [...files, ...newFiles]
  renderFileList()
  transcribeBtn.disabled = files.length === 0
}

function renderFileList() {
  fileList.innerHTML = ''
  files.forEach((f, i) => {
    const item = document.createElement('div')
    item.className = `file-item ${results[i]?.status || ''}`
    item.id = `file-${i}`
    item.innerHTML = `
      <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px">${f.name}</span>
      <span style="color: #888; font-size: 11px">${results[i]?.status === 'done' ? '✓' : results[i]?.status === 'processing' ? '...' : results[i]?.status === 'error' ? '✗' : ''}</span>
    `
    fileList.appendChild(item)
  })
}

async function transcribeAll() {
  transcribeBtn.disabled = true
  resultContent.innerHTML = ''
  results = {}

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    results[i] = { status: 'processing' }
    renderFileList()

    try {
      const form = new FormData()
      form.append('audio', file)
      const res = await fetch(`${API_BASE}/api/transcribe`, { method: 'POST', body: form })
      const data = await res.json()

      results[i] = { status: 'done', text: data.text || '' }

      const block = document.createElement('div')
      block.style.cssText = 'margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #333;'
      block.innerHTML = `<div style="color: #888; font-size: 12px; margin-bottom: 8px">${file.name}</div><div>${data.text || '(无内容)'}</div>`
      resultContent.appendChild(block)

    } catch (e) {
      results[i] = { status: 'error', text: '' }
    }

    renderFileList()
  }

  transcribeBtn.disabled = false
  exportBtn.disabled = false
}

function exportTxt() {
  const lines = files.map((f, i) => `[${f.name}]\n${results[i]?.text || ''}\n`).join('\n')
  const blob = new Blob([lines], { type: 'text/plain' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'transcription.txt'
  a.click()
}

transcribeBtn.addEventListener('click', transcribeAll)
exportBtn.addEventListener('click', exportTxt)
