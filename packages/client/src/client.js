import { createTransport, AgenticError } from './transport.js'
import { think as _think } from './think.js'
import { listen as _listen } from './listen.js'
import { speak as _speak } from './speak.js'
import { see as _see } from './see.js'
import { converse as _converse } from './converse.js'
import { capabilities as _capabilities } from './capabilities.js'
import { Admin } from './admin.js'
import { chat as _chat } from './chat.js'

export { AgenticError }

/**
 * @typedef {{ type: 'text_delta', text: string }
 *   | { type: 'tool_use', id: string, name: string, input: Record<string, unknown> }
 *   | { type: 'done', stopReason: string, usage?: { inputTokens: number, outputTokens: number } }
 *   | { type: 'error', error: string }} ChatEvent
 */

/**
 * @typedef {Object} ProviderConfig
 * @property {'openai' | 'anthropic'} type
 * @property {string} baseUrl
 * @property {string} apiKey
 * @property {string[]} [models] - Glob patterns for model matching
 */

export class AgenticClient {
  /**
   * @param {string} baseUrlOrConfig - Service URL string, or config object
   * @param {object} [options]
   *
   * Supports two constructor forms:
   *   new AgenticClient('http://localhost:11435')                    // existing
   *   new AgenticClient('http://localhost:11435', { providers: [] }) // existing + providers
   *   new AgenticClient({ serviceUrl, providers })                  // config object
   */
  constructor(baseUrlOrConfig, options = {}) {
    if (typeof baseUrlOrConfig === 'string') {
      this.baseUrl = baseUrlOrConfig.replace(/\/$/, '')
      this.providers = options.providers || []
    } else {
      const config = baseUrlOrConfig
      this.baseUrl = config.serviceUrl ? config.serviceUrl.replace(/\/$/, '') : null
      this.providers = config.providers || []
    }

    if (this.baseUrl) {
      this.transport = createTransport(this.baseUrl, options)
      this.admin = new Admin(this.transport)
    } else {
      this.transport = null
      this.admin = null
    }
  }

  capabilities() {
    return _capabilities(this.transport)
  }

  think(input, options) {
    return _think(this.transport, input, options)
  }

  listen(audio) {
    return _listen(this.transport, audio)
  }

  speak(text) {
    return _speak(this.transport, text)
  }

  see(image, prompt, options) {
    return _see(this.transport, image, prompt, options)
  }

  converse(audio) {
    return _converse(this.transport, audio)
  }

  /**
   * Direct provider chat — routes to the right provider by model name.
   * Falls back to serviceUrl (via think()) if no provider matches.
   *
   * @param {Array} messages - Array of { role, content } messages
   * @param {object} [options] - { model, stream, maxTokens, temperature, tools, toolChoice }
   */
  chat(messages, options = {}) {
    return _chat(this.providers, messages, options)
  }
}
