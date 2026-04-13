/**
 * agentic — 给 AI 造身体
 *
 * 同一套接口，两种后端：
 * - Agentic — 本地直接调子库
 * - AgenticClient — 远程连 service
 *
 * Usage:
 *   const ai = new Agentic({ model: 'gemma3', apiKey: 'sk-...' })
 *   const answer = await ai.think('hello')
 *   const audio = await ai.speak('hello world')
 *   const text = await ai.listen(audioBlob)
 */
;(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory()
  else if (typeof define === 'function' && define.amd) define(factory)
  else root.Agentic = factory()
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict'

  // ── Lazy loader ──────────────────────────────────────────────────

  const _cache = {}
  function load(name) {
    if (_cache[name] !== undefined) return _cache[name]
    try {
      if (typeof require === 'function') _cache[name] = require(name)
      else _cache[name] = null
    } catch { _cache[name] = null }
    return _cache[name]
  }

  // ── Agentic ──────────────────────────────────────────────────────

  class Agentic {
    /**
     * @param {object} opts
     * @param {string} opts.apiKey - LLM API key
     * @param {string} [opts.model] - 默认模型
     * @param {string} [opts.baseUrl] - LLM API base URL
     * @param {string} [opts.provider] - 'ollama' | 'openai' | 'anthropic' | 'gemini'
     * @param {string} [opts.system] - 系统 prompt
     * @param {object} [opts.tts] - TTS 配置 { provider, apiKey, voice, model }
     * @param {object} [opts.stt] - STT 配置 { provider, apiKey, model }
     * @param {object} [opts.memory] - Memory 配置 { maxTokens }
     * @param {object} [opts.store] - Store 配置 { backend, path }
     */
    constructor(opts = {}) {
      this._opts = opts
      this._tts = null
      this._stt = null
      this._memory = null
      this._store = null
      this._sense = null
      this._act = null
      this._fs = null
      this._shell = null
    }

    // ── Core capabilities (能力接口) ─────────────────────────────

    /**
     * 思考 — LLM 调用
     * @param {string|Array} input - 消息或对话历史
     * @param {object} [opts] - { stream, schema, tools, history, system }
     * @returns {Promise<{answer, toolCalls?, data?}>|AsyncGenerator}
     */
    async think(input, opts = {}) {
      const core = load('agentic-core')
      if (!core) throw new Error('agentic-core not available')

      const config = {
        provider: this._opts.provider,
        baseUrl: this._opts.baseUrl,
        apiKey: this._opts.apiKey,
        model: opts.model || this._opts.model,
        system: opts.system || this._opts.system,
        stream: opts.stream || false,
      }

      if (typeof input === 'string') {
        config.history = opts.history || []
      } else {
        config.history = input
        input = input[input.length - 1]?.content || ''
      }

      if (opts.tools) config.tools = opts.tools
      if (opts.schema) config.schema = opts.schema
      if (opts.images) config.images = opts.images

      const ask = core.agenticAsk || core
      const result = await ask(input, config, opts.onEvent)
      return result
    }

    /**
     * 听 — 语音转文字
     * @param {Blob|Buffer|ArrayBuffer} audio
     * @param {object} [opts] - { language }
     * @returns {Promise<string>}
     */
    async listen(audio, opts = {}) {
      const voice = load('agentic-voice')
      if (!voice) throw new Error('agentic-voice not available')

      if (!this._stt) {
        const sttOpts = this._opts.stt || {}
        this._stt = voice.createSTT({
          provider: sttOpts.provider || 'openai',
          baseUrl: sttOpts.baseUrl || this._opts.baseUrl,
          apiKey: sttOpts.apiKey || this._opts.apiKey,
          model: sttOpts.model,
        })
      }

      return this._stt.transcribe(audio, opts)
    }

    /**
     * 说 — 文字转语音
     * @param {string} text
     * @param {object} [opts] - { voice, model }
     * @returns {Promise<ArrayBuffer|Buffer>}
     */
    async speak(text, opts = {}) {
      const voice = load('agentic-voice')
      if (!voice) throw new Error('agentic-voice not available')

      if (!this._tts) {
        const ttsOpts = this._opts.tts || {}
        this._tts = voice.createTTS({
          provider: ttsOpts.provider || 'openai',
          baseUrl: ttsOpts.baseUrl || this._opts.baseUrl,
          apiKey: ttsOpts.apiKey || this._opts.apiKey,
          voice: ttsOpts.voice,
          model: ttsOpts.model,
        })
      }

      return this._tts.fetchAudio(text, opts)
    }

    /**
     * 看 — 图片理解
     * @param {Blob|Buffer|string} image - 图片数据或 base64
     * @param {string} [prompt] - 提问
     * @param {object} [opts] - { stream }
     * @returns {Promise<string>|AsyncGenerator}
     */
    async see(image, prompt = '描述这张图片', opts = {}) {
      // Vision = think with images
      const base64 = typeof image === 'string' ? image : _toBase64(image)
      return this.think(prompt, {
        ...opts,
        images: [{ url: `data:image/jpeg;base64,${base64}` }],
      })
    }

    /**
     * 对话 — 听→想→说，全链路
     * @param {Blob|Buffer|ArrayBuffer} audio
     * @param {object} [opts]
     * @returns {Promise<{text, audio, transcript}>}
     */
    async converse(audio, opts = {}) {
      const transcript = await this.listen(audio)
      const result = await this.think(transcript, opts)
      const answer = typeof result === 'string' ? result : result.answer || result.text || ''
      const audioOut = await this.speak(answer)
      return { text: answer, audio: audioOut, transcript }
    }

    // ── Sub-library access (子库直接访问) ────────────────────────

    /** 记忆 */
    get memory() {
      if (this._memory) return this._memory
      const m = load('agentic-memory')
      if (!m) return null
      this._memory = m.createMemory(this._opts.memory || {})
      return this._memory
    }

    /** 持久化存储 */
    get store() {
      if (this._store) return this._store
      const s = load('agentic-store')
      if (!s) return null
      this._store = s.createStore(this._opts.store || {})
      return this._store
    }

    /** 感知 */
    get sense() {
      if (this._sense) return this._sense
      const s = load('agentic-sense')
      if (!s) return null
      this._sense = new s.AgenticSense(this._opts.sense || {})
      return this._sense
    }

    /** 决策 */
    get act() {
      if (this._act) return this._act
      const a = load('agentic-act')
      if (!a) return null
      this._act = new a.AgenticAct(this._opts.act || {})
      return this._act
    }

    /** 文件系统 */
    get fs() {
      if (this._fs) return this._fs
      const f = load('agentic-filesystem')
      if (!f) return null
      this._fs = new f.AgenticFileSystem(this._opts.fs)
      return this._fs
    }

    /** 命令执行 */
    get shell() {
      if (this._shell) return this._shell
      const s = load('agentic-shell')
      if (!s) return null
      this._shell = new s.AgenticShell(this._opts.shell || {})
      return this._shell
    }

    // ── Discovery ────────────────────────────────────────────────

    /** 检测可用能力 */
    capabilities() {
      return {
        think: !!load('agentic-core'),
        listen: !!load('agentic-voice'),
        speak: !!load('agentic-voice'),
        see: !!load('agentic-core'),
        converse: !!load('agentic-core') && !!load('agentic-voice'),
        memory: !!load('agentic-memory'),
        store: !!load('agentic-store'),
        sense: !!load('agentic-sense'),
        act: !!load('agentic-act'),
        filesystem: !!load('agentic-filesystem'),
        shell: !!load('agentic-shell'),
        spatial: !!load('agentic-spatial'),
        render: !!load('agentic-render'),
        embed: !!load('agentic-embed'),
      }
    }

    /** 销毁，释放资源 */
    destroy() {
      if (this._stt?.stopListening) this._stt.stopListening()
      this._tts = null
      this._stt = null
      this._memory = null
      this._store = null
      this._sense = null
      this._act = null
      this._fs = null
      this._shell = null
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────

  function _toBase64(input) {
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(input)) {
      return input.toString('base64')
    }
    if (input instanceof ArrayBuffer) {
      const bytes = new Uint8Array(input)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
      return typeof btoa === 'function' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64')
    }
    return String(input)
  }

  return { Agentic }
})
