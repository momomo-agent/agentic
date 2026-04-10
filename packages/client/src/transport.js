export class AgenticError extends Error {
  constructor(status, message, code) {
    super(message)
    this.name = 'AgenticError'
    this.status = status
    this.code = code
  }
}

function resolveAdapter(preference) {
  if (preference === 'browser') return 'browser'
  if (preference === 'node') return 'node'
  return typeof window !== 'undefined' ? 'browser' : 'node'
}

export function createTransport(baseUrl, options = {}) {
  const env = resolveAdapter(options.adapter)
  if (env === 'browser') {
    return createFetchAdapter(baseUrl, options)
  }
  return createFetchAdapter(baseUrl, options, true)
}

function createFetchAdapter(baseUrl, options, isNode = false) {
  const timeout = options.timeout || 30000

  async function request(method, path, body) {
    const opts = { method, signal: AbortSignal.timeout(timeout) }
    if (body !== undefined) {
      opts.headers = { 'Content-Type': 'application/json' }
      opts.body = JSON.stringify(body)
    }
    let res
    try {
      res = await fetch(`${baseUrl}${path}`, opts)
    } catch (err) {
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        throw new AgenticError('TIMEOUT', `Request timed out after ${timeout}ms`)
      }
      throw new AgenticError('NETWORK', err.message)
    }
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText)
      throw new AgenticError(res.status, text)
    }
    return res.json()
  }

  return {
    async get(path) { return request('GET', path) },
    async post(path, body) { return request('POST', path, body) },
    async put(path, body) { return request('PUT', path, body) },
    async del(path) { return request('DELETE', path) },

    async *stream(path, body) {
      let res
      try {
        res = await fetch(`${baseUrl}${path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
      } catch (err) {
        throw new AgenticError('NETWORK', err.message)
      }
      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText)
        throw new AgenticError(res.status, text)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') return
          try { yield JSON.parse(data) } catch {}
        }
      }
    },

    async postBinary(path, body) {
      let res
      try {
        res = await fetch(`${baseUrl}${path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(timeout)
        })
      } catch (err) {
        if (err.name === 'TimeoutError' || err.name === 'AbortError') {
          throw new AgenticError('TIMEOUT', `Request timed out after ${timeout}ms`)
        }
        throw new AgenticError('NETWORK', err.message)
      }
      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText)
        throw new AgenticError(res.status, text)
      }
      const ab = await res.arrayBuffer()
      return isNode ? Buffer.from(ab) : ab
    },

    async postFormData(path, formData) {
      let res
      try {
        res = await fetch(`${baseUrl}${path}`, {
          method: 'POST',
          body: formData,
          signal: AbortSignal.timeout(timeout)
        })
      } catch (err) {
        if (err.name === 'TimeoutError' || err.name === 'AbortError') {
          throw new AgenticError('TIMEOUT', `Request timed out after ${timeout}ms`)
        }
        throw new AgenticError('NETWORK', err.message)
      }
      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText)
        throw new AgenticError(res.status, text)
      }
      const ct = res.headers.get('content-type') || ''
      if (ct.includes('audio/') || ct.includes('application/octet-stream')) {
        const ab = await res.arrayBuffer()
        return isNode ? Buffer.from(ab) : ab
      }
      return res.json()
    },

    async postBinaryFormData(path, formData) {
      let res
      try {
        res = await fetch(`${baseUrl}${path}`, {
          method: 'POST',
          body: formData,
          signal: AbortSignal.timeout(timeout)
        })
      } catch (err) {
        if (err.name === 'TimeoutError' || err.name === 'AbortError') {
          throw new AgenticError('TIMEOUT', `Request timed out after ${timeout}ms`)
        }
        throw new AgenticError('NETWORK', err.message)
      }
      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText)
        throw new AgenticError(res.status, text)
      }
      const ab = await res.arrayBuffer()
      return isNode ? Buffer.from(ab) : ab
    }
  }
}
