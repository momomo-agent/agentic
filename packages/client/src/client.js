/**
 * AgenticClient — JavaScript SDK for agentic-service
 *
 * Usage:
 *   const ai = new AgenticClient('http://localhost:1234')
 *
 *   // Chat
 *   const { answer } = await ai.think('hello')
 *   for await (const chunk of ai.think('hello', { stream: true })) { ... }
 *
 *   // Speech-to-text
 *   const text = await ai.listen(audioBlob)
 *
 *   // Text-to-speech
 *   const audio = await ai.speak('hello', { voice: 'nova' })
 *
 *   // Vision
 *   const { answer } = await ai.see(imageUrl, 'describe this')
 *
 *   // Voice conversation (listen + think + speak)
 *   const { text, audio } = await ai.converse(audioBlob)
 *
 *   // Embeddings
 *   const { embeddings } = await ai.embed('hello world')
 *
 *   // Admin
 *   const status = await ai.admin.status()
 *   const config = await ai.admin.config()
 *   for await (const p of ai.admin.pullModel('gemma3:4b')) { ... }
 */

import { createTransport, AgenticError } from './transport.js'
import { think } from './think.js'
import { listen } from './listen.js'
import { speak } from './speak.js'
import { see } from './see.js'
import { converse } from './converse.js'
import { embed } from './embed.js'
import { capabilities } from './capabilities.js'
import { Admin } from './admin.js'

export { AgenticError }

export class AgenticClient {
  /**
   * @param {string} baseUrl - Server URL (e.g. 'http://localhost:1234')
   * @param {object} [options]
   * @param {string} [options.apiKey] - API key for authenticated endpoints
   * @param {number} [options.timeout=30000] - Request timeout in ms
   * @param {number} [options.streamTimeout=120000] - Stream/binary timeout in ms
   */
  constructor(baseUrl = 'http://localhost:1234', options = {}) {
    if (typeof baseUrl === 'object') {
      options = baseUrl
      baseUrl = options.baseUrl || 'http://localhost:1234'
    }
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.transport = createTransport(this.baseUrl, options)
    this.admin = new Admin(this.transport)
  }

  // ── Core AI Methods ──

  think(input, options) {
    return think(this.transport, input, options)
  }

  listen(audio, options) {
    return listen(this.transport, audio, options)
  }

  speak(text, options) {
    return speak(this.transport, text, options)
  }

  see(image, prompt, options) {
    return see(this.transport, image, prompt, options)
  }

  converse(audio, options) {
    return converse(this.transport, audio, options)
  }

  embed(input, options) {
    return embed(this.transport, input, options)
  }

  capabilities() {
    return capabilities(this.transport)
  }
}
