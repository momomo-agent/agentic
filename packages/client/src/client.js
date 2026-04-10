import { createTransport, AgenticError } from './transport.js'
import { think as _think } from './think.js'
import { listen as _listen } from './listen.js'
import { speak as _speak } from './speak.js'
import { see as _see } from './see.js'
import { converse as _converse } from './converse.js'
import { capabilities as _capabilities } from './capabilities.js'
import { Admin } from './admin.js'

export { AgenticError }

export class AgenticClient {
  constructor(baseUrl, options = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.options = { adapter: 'auto', timeout: 30000, ...options }
    this.transport = createTransport(this.baseUrl, this.options)
    this.admin = new Admin(this.transport)
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
}
