export class AgenticError extends Error {
  constructor(status, message, code) {
    super(message)
    this.name = 'AgenticError'
    this.status = status
    this.code = code
  }
}

export function createTransport(baseUrl, options = {}) {
  const timeout = options.timeout || 30000
  const streamTimeout = options.streamTimeout || 120000
  const isNode = typeof window === 'undefined'

  function makeHeaders(extra = {}) {
    const h = { ...extra }
    if (options.apiKey) h['Authorization'] = `Bearer ${options.apiKey}`
    return h
  }

  async function request(method, path, body) {
    const opts = { method, signal: AbortSignal.timeout(timeout), headers: makeHeaders() }
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json'
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
    const ct = res.headers.get('content-type') || ''
    if (ct.includes('json')) return res.json()
    return res.text()
  }

  async function* streamSSE(method, path, body) {
    const opts = { method, headers: makeHeaders() }
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json'
      opts.body = JSON.stringify(body)
    }
    let res
    try {
      res = await fetch(`${baseUrl}${path}`, opts)
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
  }

  async function fetchBinary(method, path, body, headers = {}) {
    const opts = { method, signal: AbortSignal.timeout(streamTimeout), headers: makeHeaders(headers) }
    if (body !== undefined) {
      if (body instanceof FormData || (typeof FormData !== 'undefined' && body.constructor?.name === 'FormData')) {
        opts.body = body
      } else {
        opts.headers['Content-Type'] = 'application/json'
        opts.body = JSON.stringify(body)
      }
    }
    let res
    try {
      res = await fetch(`${baseUrl}${path}`, opts)
    } catch (err) {
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        throw new AgenticError('TIMEOUT', `Request timed out after ${streamTimeout}ms`)
      }
      throw new AgenticError('NETWORK', err.message)
    }
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText)
      throw new AgenticError(res.status, text)
    }
    const ct = res.headers.get('content-type') || ''
    if (ct.includes('json')) return res.json()
    if (ct.includes('audio/') || ct.includes('application/octet-stream') || ct.includes('image/')) {
      const ab = await res.arrayBuffer()
      return isNode ? Buffer.from(ab) : ab
    }
    return res.json()
  }

  return {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    put: (path, body) => request('PUT', path, body),
    del: (path) => request('DELETE', path),
    stream: (path, body) => streamSSE('POST', path, body),
    streamGet: (path) => streamSSE('GET', path),
    postBinary: (path, body) => fetchBinary('POST', path, body),
    postFormData: (path, formData) => fetchBinary('POST', path, formData),
    baseUrl,
  }
}
