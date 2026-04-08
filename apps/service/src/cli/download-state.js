// Global download progress state
const downloadState = {
  inProgress: false,
  model: '',
  status: '',
  progress: 0,
  total: 0
}

export function getDownloadState() {
  return { ...downloadState }
}

export function setDownloadState(updates) {
  Object.assign(downloadState, updates)
}

export function clearDownloadState() {
  downloadState.inProgress = false
  downloadState.model = ''
  downloadState.status = ''
  downloadState.progress = 0
  downloadState.total = 0
}
