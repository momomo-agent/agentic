/**
 * AgenticClient — JavaScript SDK for agentic-service
 *
 * Thin glue layer over standard OpenAI-compatible APIs.
 * No custom transport, no reimplemented streaming — just fetch.
 *
 * Usage:
 *   const ai = new AgenticClient('http://localhost:1234')
 *
 *   // Chat
 *   const { answer } = await ai.think('hello')
 *   for await (const chunk of ai.think('hello', { stream: true })) { ... }
 *
 *   // Vision (= think with images)
 *   const { answer } = await ai.see(imageDataUrl, 'describe this')
 *
 *   // Speech-to-text
 *   const text = await ai.listen(audioBlob)
 *
 *   // Text-to-speech
 *   const audio = await ai.speak('hello')
 *
 *   // Voice conversation (listen + think + speak)
 *   const { text, audio } = await ai.converse(audioBlob)
 *
 *   // Embeddings
 *   const { embeddings } = await ai.embed('hello world')
 *
 *   // Admin
 *   const status = await ai.admin.status()
 */

import { Admin } from './admin.js'

export class AgenticError extends Error {
  constructor(message, status, code) {
    super(message)
    this.name = 'AgenticError'
    this.status = status
    this.code = code
  }
}

export class AgenticClient {
  constructor(baseUrl = 'http://localhost:1234', options = {}) {
    if (typeof baseUrl === 'object') {
      options = baseUrl
      baseUrl = options.baseUrl || 'http://localhost:1234'
    }
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.options = options

    // Admin still uses transport for management endpoints
    this.admin = new Admin({ baseUrl: this.baseUrl, options })
  }

  // ── Chat / Think ──

  think(input, options = {}) {
    const messages = this._buildMessages(input, options)
    const body = {
      messages,
      stream: options.stream ?? false,
    }
    if (options.model) body.model = options.model
    if (options.temperature != null) body.temperature = options.temperature
    if (options.maxTokens != null) body.max_tokens = options.maxTokens
    if (options.tools) body.tools = this._normTools(options.tools)
    if (options.toolChoice) body.tool_choice = options.toolChoice

    if (options.stream) {
      return this._streamChat(body)
    }
    return this._collectChat(body, options)
  }

  // ── Vision (= think with images) ──

  see(image, prompt = 'Describe this image.', options = {}) {
    const imageUrl = this._toImageUrl(image)
    const messages = [
      ...(options.history || []),
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } }
        ]
      }
    ]
    const body = { messages, stream: options.stream ?? false }
    if (options.model) body.model = options.model

    if (options.stream) {
      return this._streamChat(body)
    }
    return this._collectChat(body, options)
  }

  // ── Speech-to-Text ──

  async listen(audio, options = {}) {
    const fd = new FormData()
    if (audio instanceof Blob) {
      fd.append('file', audio, 'audio.webm')
    } else {
      fd.append('file', new Blob([audio], { type: 'audio/webm' }), 'audio.webm')
    }
    if (options.model) fd.append('model', options.model)
    if (options.language) fd.append('language', options.language)

    const res = await fetch(`${this.baseUrl}/v1/audio/transcriptions`, {
      method: 'POST',
      body: fd,
    })
    if (!res.ok) throw new AgenticError(`STT failed: ${res.status}`, res.status)
    const data = await res.json()
    return data.text || ''
  }

  // ── Text-to-Speech ──

  async speak(text, options = {}) {
    const body = {
      input: text,
      model: options.model || 'tts-1',
      voice: options.voice || 'alloy',
    }
    if (options.speed) body.speed = options.speed

    const res = await fetch(`${this.baseUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new AgenticError(`TTS failed: ${res.status}`, res.status)
    return res.arrayBuffer()
  }

  // ── Voice Conversation (listen + think + speak) ──

  async converse(audio, options = {}) {
    const transcript = await this.listen(audio, options)
    if (!transcript.trim()) return { text: '', audio: null, transcript: '' }

    const { answer } = await this.think(transcript, options)
    let audioOut = null
    try {
      audioOut = await this.speak(answer, options)
    } catch { /* TTS optional */ }

    return { text: answer, audio: audioOut, transcript }
  }

  // ── Embeddings ──

  async embed(input, options = {}) {
    const body = { input: Array.isArray(input) ? input : [input] }
    if (options.model) body.model = options.model

    const res = await fetch(`${this.baseUrl}/v1/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new AgenticError(`Embed failed: ${res.status}`, res.status)
    const data = await res.json()
    return {
      embeddings: (data.data || []).map(d => d.embedding),
      model: data.model,
      usage: data.usage,
    }
  }

  // ── Capabilities ──

  async capabilities() {
    const res = await fetch(`${this.baseUrl}/api/status`)
    if (!res.ok) return { think: false, listen: false, speak: false, see: false, converse: false, embed: false }
    const status = await res.json()
    const ollamaRunning = status.ollama?.running === true
    const hasModels = (status.ollama?.models?.length || 0) > 0
    const hasStt = !!status.config?.stt || !!status.devices?.microphone
    const hasTts = !!status.config?.tts || !!status.devices?.speaker
    return {
      think: ollamaRunning && hasModels,
      listen: hasStt,
      speak: hasTts,
      see: ollamaRunning && hasModels,
      converse: ollamaRunning && hasModels && hasStt && hasTts,
      embed: ollamaRunning && hasModels,
    }
  }

  // ── Private helpers ──

  _buildMessages(input, options) {
    if (Array.isArray(input)) return input
    const history = options.history || []
    return [...history, { role: 'user', content: input }]
  }

  _toImageUrl(image) {
    if (typeof image === 'string') {
      if (image.startsWith('data:') || image.startsWith('http')) return image
      return `data:image/jpeg;base64,${image}`
    }
    return image
  }

  _normTools(tools) {
    return tools.map(t => {
      if (t.type === 'function' && t.function) return t
      return {
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters || { type: 'object', properties: {} }
        }
      }
    })
  }

  async _collectChat(body, options) {
    const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new AgenticError(err.error?.message || `Chat failed: ${res.status}`, res.status)
    }
    const data = await res.json()
    const choice = data.choices?.[0]
    const result = { answer: choice?.message?.content || '' }
    if (choice?.message?.tool_calls?.length) {
      result.toolCalls = choice.message.tool_calls.map(tc => ({
        id: tc.id,
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments || '{}'),
      }))
    }
    if (options.schema) {
      try {
        result.data = JSON.parse(result.answer)
      } catch {
        const match = result.answer.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (match) result.data = JSON.parse(match[1].trim())
      }
    }
    return result
  }

  _streamChat(body) {
    body.stream = true
    const url = `${this.baseUrl}/v1/chat/completions`
    const gen = this._streamChatGen(url, body)
    return {
      [Symbol.asyncIterator]() { return gen },
      then(resolve, reject) {
        return (async () => {
          let text = ''
          const toolCalls = []
          for await (const chunk of gen) {
            if (chunk.type === 'text_delta') text += chunk.text
            if (chunk.type === 'tool_use') toolCalls.push(chunk)
          }
          const result = { answer: text }
          if (toolCalls.length) result.toolCalls = toolCalls
          return result
        })().then(resolve, reject)
      }
    }
  }

  async *_streamChatGen(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new AgenticError(err.error?.message || `Stream failed: ${res.status}`, res.status)
    }

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
        if (data === '[DONE]') {
          yield { type: 'done', stopReason: 'end_turn' }
          return
        }
        try {
          const parsed = JSON.parse(data)
          const delta = parsed.choices?.[0]?.delta
          if (!delta) continue
          if (delta.content) {
            yield { type: 'text_delta', text: delta.content }
          }
          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              yield {
                type: 'tool_use',
                id: tc.id || '',
                name: tc.function?.name || '',
                input: tc.function?.arguments ? JSON.parse(tc.function.arguments) : {},
              }
            }
          }
        } catch { /* skip malformed chunks */ }
      }
    }
  }
}
