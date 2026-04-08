import fs from 'fs'
import path from 'path'
import os from 'os'

const STATE_FILE = path.join(os.homedir(), '.agentic-service', 'download-state.json')

// Global download progress state
const downloadState = {
  inProgress: false,
  model: '',
  status: '',
  progress: 0,
  total: 0
}

// Load state from file on startup
try {
  if (fs.existsSync(STATE_FILE)) {
    const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
    Object.assign(downloadState, saved)
  }
} catch {}

function saveState() {
  try {
    const dir = path.dirname(STATE_FILE)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(STATE_FILE, JSON.stringify(downloadState), 'utf8')
  } catch {}
}

export function getDownloadState() {
  return { ...downloadState }
}

export function setDownloadState(updates) {
  Object.assign(downloadState, updates)
  saveState()
}

export function clearDownloadState() {
  downloadState.inProgress = false
  downloadState.model = ''
  downloadState.status = ''
  downloadState.progress = 0
  downloadState.total = 0
  try {
    if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE)
  } catch {}
}
