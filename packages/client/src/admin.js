/**
 * Admin — server management (status, config, models, engines, logs)
 */
export class Admin {
  constructor({ baseUrl, options = {} }) {
    this.baseUrl = baseUrl
    this.options = options
  }

  async _get(path) {
    const res = await fetch(`${this.baseUrl}${path}`)
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
    return res.json()
  }

  async _post(path, body) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`)
    return res.json()
  }

  async _put(path, body) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`)
    return res.json()
  }

  async _del(path) {
    const res = await fetch(`${this.baseUrl}${path}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`)
    return res.json()
  }

  // ── Health & Status ──

  health() { return this._get('/api/health') }
  status() { return this._get('/api/status') }
  perf() { return this._get('/api/perf') }
  queueStats() { return this._get('/api/queue/stats') }
  devices() { return this._get('/api/devices') }
  logs() { return this._get('/api/logs') }

  // ── Config ──

  config(newConfig) {
    if (newConfig) return this._put('/api/config', newConfig)
    return this._get('/api/config')
  }

  // ── Engines ──

  engines() { return this._get('/api/engines') }

  engineModels(engine) {
    const params = engine ? `?engine=${encodeURIComponent(engine)}` : ''
    return this._get(`/api/engines/models${params}`)
  }

  engineRecommended() { return this._get('/api/engines/recommended') }
  engineHealth() { return this._get('/api/engines/health') }

  async *pullModel(model, options = {}) {
    const body = { model }
    if (options.engine) body.engine = options.engine

    const res = await fetch(`${this.baseUrl}/api/engines/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Pull failed: ${res.status}`)

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') return
        try { yield JSON.parse(data) } catch {}
      }
    }
  }

  deleteModel(name) {
    return this._del(`/api/engines/models/${encodeURIComponent(name)}`)
  }

  // ── Assignments ──

  assignments() { return this._get('/api/assignments') }
  setAssignments(assignments) { return this._put('/api/assignments', assignments) }

  // ── Models ──

  models() { return this._get('/v1/models') }
}
