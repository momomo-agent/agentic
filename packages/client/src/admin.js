/**
 * Admin — server management (status, config, models, engines, logs)
 */
export class Admin {
  constructor(transport) {
    this.transport = transport
  }

  // ── Health & Status ──

  async health() {
    return this.transport.get('/api/health')
  }

  async status() {
    return this.transport.get('/api/status')
  }

  async perf() {
    return this.transport.get('/api/perf')
  }

  async queueStats() {
    return this.transport.get('/api/queue/stats')
  }

  async devices() {
    return this.transport.get('/api/devices')
  }

  async logs(limit = 50) {
    return this.transport.get('/api/logs')
  }

  // ── Config ──

  async config(newConfig) {
    if (newConfig) return this.transport.put('/api/config', newConfig)
    return this.transport.get('/api/config')
  }

  // ── Engines (new multi-engine API) ──

  async engines() {
    return this.transport.get('/api/engines')
  }

  async engineModels(engine) {
    const params = engine ? `?engine=${encodeURIComponent(engine)}` : ''
    return this.transport.get(`/api/engines/models${params}`)
  }

  async engineRecommended() {
    return this.transport.get('/api/engines/recommended')
  }

  async engineHealth() {
    return this.transport.get('/api/engines/health')
  }

  async *pullModel(model, options = {}) {
    const body = { model }
    if (options.engine) body.engine = options.engine
    for await (const chunk of this.transport.stream('/api/engines/pull', body)) {
      yield chunk
    }
  }

  async deleteModel(name) {
    return this.transport.del(`/api/engines/models/${encodeURIComponent(name)}`)
  }

  // ── Assignments (role → model mapping) ──

  async assignments() {
    return this.transport.get('/api/assignments')
  }

  async setAssignments(assignments) {
    return this.transport.put('/api/assignments', assignments)
  }

  // ── OpenAI-compatible models list ──

  async models() {
    return this.transport.get('/v1/models')
  }
}
