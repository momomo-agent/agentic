export class Admin {
  constructor(transport) {
    this.transport = transport
  }

  async status() {
    return this.transport.get('/api/status')
  }

  async config(newConfig) {
    if (newConfig) return this.transport.put('/api/config', newConfig)
    return this.transport.get('/api/config')
  }

  async models() {
    const status = await this.transport.get('/api/status')
    return status.ollama?.models || []
  }

  async *pullModel(model, onProgress) {
    for await (const chunk of this.transport.stream('/api/models/pull', { model })) {
      if (onProgress) onProgress(chunk)
      yield chunk
    }
  }

  async deleteModel(name) {
    return this.transport.del(`/api/models/${encodeURIComponent(name)}`)
  }

  async logs(limit = 50) {
    return this.transport.get('/api/logs')
  }

  async perf() {
    return this.transport.get('/api/perf')
  }

  async devices() {
    return this.transport.get('/api/devices')
  }
}
