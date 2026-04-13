/**
 * agentic — 给 AI 造身体
 *
 * 子库的胶水。不碰 HTTP，不碰传输。每个子库自己管自己的通信。
 *
 * Usage:
 *   const ai = new Agentic({ provider: 'ollama', model: 'gemma3' })
 *   await ai.think('hello')
 *   await ai.speak('hello')
 *   await ai.remember('user likes coffee')
 */
;(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory()
  else if (typeof define === 'function' && define.amd) define(factory)
  else root.Agentic = factory()
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict'

  const _cache = {}
  function load(name) {
    if (_cache[name] !== undefined) return _cache[name]
    try {
      if (typeof require === 'function') _cache[name] = require(name)
      else _cache[name] = null
    } catch { _cache[name] = null }
    return _cache[name]
  }

  class Agentic {
    /**
     * @param {object} opts — 透传给子库
     * @param {string} [opts.apiKey]
     * @param {string} [opts.model]
     * @param {string} [opts.baseUrl]
     * @param {string} [opts.provider]
     * @param {string} [opts.system]
     * @param {object} [opts.tts]
     * @param {object} [opts.stt]
     * @param {object} [opts.memory]
     * @param {object} [opts.store]
     * @param {object} [opts.embed]
     * @param {object} [opts.sense]
     * @param {object} [opts.act]
     * @param {object} [opts.render]
     * @param {object} [opts.fs]
     * @param {object} [opts.shell]
     */
    constructor(opts = {}) {
      this._opts = opts
      this._i = {} // lazy instances
    }

    _get(key, init) {
      if (!this._i[key]) this._i[key] = init()
      return this._i[key]
    }

    _need(pkg) {
      const m = load(pkg)
      if (!m) throw new Error(`${pkg} not installed — run: npm install ${pkg}`)
      return m
    }

    // ════════════════════════════════════════════════════════════════
    // THINK — agentic-core
    // ════════════════════════════════════════════════════════════════

    async think(input, opts = {}) {
      const core = this._need('agentic-core')
      const ask = core.agenticAsk || core

      const config = {
        provider: opts.provider || this._opts.provider,
        baseUrl: opts.baseUrl || this._opts.baseUrl,
        apiKey: opts.apiKey || this._opts.apiKey,
        model: opts.model || this._opts.model,
        system: opts.system || this._opts.system,
        stream: opts.stream || false,
      }

      if (typeof input === 'string') {
        config.history = opts.history || []
      } else {
        config.history = input.slice(0, -1)
        input = input[input.length - 1]?.content || ''
      }

      if (opts.tools) config.tools = opts.tools
      if (opts.schema) config.schema = opts.schema
      if (opts.images) config.images = opts.images

      return ask(input, config, opts.onEvent)
    }

    get tools() {
      return this._need('agentic-core').toolRegistry
    }

    // ════════════════════════════════════════════════════════════════
    // SPEAK — agentic-voice TTS
    // ════════════════════════════════════════════════════════════════

    _tts() {
      return this._get('tts', () => {
        const v = this._need('agentic-voice')
        const o = this._opts.tts || {}
        return v.createTTS({
          provider: o.provider || 'openai',
          baseUrl: o.baseUrl || this._opts.baseUrl,
          apiKey: o.apiKey || this._opts.apiKey,
          voice: o.voice, model: o.model,
        })
      })
    }

    async speak(text, opts) { return this._tts().fetchAudio(text, opts) }
    async speakAloud(text, opts) { return this._tts().speak(text, opts) }
    async speakStream(stream, opts) { return this._tts().speakStream(stream, opts) }
    async timestamps(text, opts) { return this._tts().timestamps(text, opts) }
    stopSpeaking() { if (this._i.tts) this._i.tts.stop() }

    // ════════════════════════════════════════════════════════════════
    // LISTEN — agentic-voice STT
    // ════════════════════════════════════════════════════════════════

    _stt() {
      return this._get('stt', () => {
        const v = this._need('agentic-voice')
        const o = this._opts.stt || {}
        return v.createSTT({
          provider: o.provider || 'openai',
          baseUrl: o.baseUrl || this._opts.baseUrl,
          apiKey: o.apiKey || this._opts.apiKey,
          model: o.model,
        })
      })
    }

    async listen(audio, opts) { return this._stt().transcribe(audio, opts) }
    async listenWithTimestamps(audio, opts) { return this._stt().transcribeWithTimestamps(audio, opts) }
    startListening(onResult, onError) { return this._stt().startListening(onResult, onError) }
    stopListening() { if (this._i.stt) this._i.stt.stopListening() }

    // ════════════════════════════════════════════════════════════════
    // SEE — agentic-core + images
    // ════════════════════════════════════════════════════════════════

    async see(image, prompt = '描述这张图片', opts = {}) {
      const b64 = typeof image === 'string' ? image : _toBase64(image)
      return this.think(prompt, { ...opts, images: [{ url: `data:image/jpeg;base64,${b64}` }] })
    }

    // ════════════════════════════════════════════════════════════════
    // CONVERSE — listen → think → speak
    // ════════════════════════════════════════════════════════════════

    async converse(audio, opts = {}) {
      const transcript = await this.listen(audio)
      const result = await this.think(transcript, opts)
      const answer = typeof result === 'string' ? result : result.answer || ''
      const audioOut = await this.speak(answer)
      return { text: answer, audio: audioOut, transcript }
    }

    // ════════════════════════════════════════════════════════════════
    // REMEMBER / RECALL — agentic-memory
    // ════════════════════════════════════════════════════════════════

    _mem() {
      return this._get('mem', () => this._need('agentic-memory').createMemory(this._opts.memory || {}))
    }

    async remember(text, meta = {}) {
      const id = meta.id || `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      return this._mem().learn(id, text, meta)
    }
    async recall(query, opts) { return this._mem().recall(query, opts) }
    async addMessage(role, content) { return this._mem().add(role, content) }
    messages() { return this._mem().messages() }
    history() { return this._mem().history() }
    setSystem(prompt) { return this._mem().setSystem(prompt) }
    clearMemory() { return this._mem().clear() }
    exportMemory() { return this._mem().export() }
    importMemory(data) { return this._mem().import(data) }

    // ════════════════════════════════════════════════════════════════
    // SAVE / LOAD — agentic-store
    // ════════════════════════════════════════════════════════════════

    async _store() {
      return this._get('store', () => {
        const s = this._need('agentic-store').createStore(this._opts.store || {})
        s.init()
        return s
      })
    }

    async save(key, value) { const s = await this._store(); return s.kvSet(key, value) }
    async load(key) { const s = await this._store(); return s.kvGet(key) }
    async keys() { const s = await this._store(); return s.kvKeys() }
    async query(sql, params) { const s = await this._store(); return s.all(sql, params) }
    async exec(sql, params) { const s = await this._store(); return s.exec(sql, params) }

    // ════════════════════════════════════════════════════════════════
    // EMBED / INDEX / SEARCH — agentic-embed
    // ════════════════════════════════════════════════════════════════

    _embedLib() { return this._need('agentic-embed') }

    _embedIndex() {
      return this._get('embedIdx', () => this._embedLib().create(this._opts.embed || {}))
    }

    async embed(text) { return this._embedLib().localEmbed(text) }
    async index(id, text, meta) { return this._embedIndex().add(id, text, meta) }
    async indexMany(docs) { return this._embedIndex().addMany(docs) }
    async search(query, opts) { return this._embedIndex().search(query, opts) }
    chunk(text, opts) { return this._embedLib().chunkText(text, opts) }
    similarity(a, b) { return this._embedLib().cosineSimilarity(a, b) }

    // ════════════════════════════════════════════════════════════════
    // PERCEIVE — agentic-sense
    // ════════════════════════════════════════════════════════════════

    _sense() {
      return this._get('sense', () => new (this._need('agentic-sense').AgenticSense)(this._opts.sense || {}))
    }

    async perceive(frame) { return this._sense().detect(frame) }

    createAudioAnalyzer(opts) {
      return new (this._need('agentic-sense').AgenticAudio)(opts || {})
    }

    // ════════════════════════════════════════════════════════════════
    // DECIDE / ACT — agentic-act
    // ════════════════════════════════════════════════════════════════

    _act() {
      return this._get('act', () => new (this._need('agentic-act').AgenticAct)({
        ...this._opts.act,
        apiKey: this._opts.apiKey, model: this._opts.model,
        provider: this._opts.provider, baseUrl: this._opts.baseUrl,
      }))
    }

    registerAction(action) { return this._act().register(action) }
    async decide(input) { return this._act().decide(input) }
    async act(input) { return this._act().run(input) }

    // ════════════════════════════════════════════════════════════════
    // RENDER — agentic-render
    // ════════════════════════════════════════════════════════════════

    render(markdown, opts) { return this._need('agentic-render').render(markdown, opts) }

    createRenderer(target, opts) {
      const r = this._need('agentic-render')
      return r.create(target, { ...this._opts.render, ...opts })
    }

    renderCSS(theme) {
      const r = this._need('agentic-render')
      return r.getCSS(theme === 'light' ? r.THEME_LIGHT : r.THEME_DARK)
    }

    // ════════════════════════════════════════════════════════════════
    // FILES — agentic-filesystem
    // ════════════════════════════════════════════════════════════════

    _fs() {
      return this._get('fs', () => new (this._need('agentic-filesystem').AgenticFileSystem)(this._opts.fs))
    }

    async readFile(path) { return this._fs().read(path) }
    async writeFile(path, content) { return this._fs().write(path, content) }
    async deleteFile(path) { return this._fs().delete(path) }
    async ls(prefix) { return this._fs().ls(prefix) }
    async tree(prefix) { return this._fs().tree(prefix) }
    async grep(pattern, opts) { return this._fs().grep(pattern, opts) }
    async semanticGrep(query) { return this._fs().semanticGrep(query) }

    // ════════════════════════════════════════════════════════════════
    // RUN — agentic-shell
    // ════════════════════════════════════════════════════════════════

    _shell() {
      return this._get('shell', () => new (this._need('agentic-shell').AgenticShell)(this._opts.shell || {}))
    }

    async run(command) { return this._shell().exec(command) }

    // ════════════════════════════════════════════════════════════════
    // SPATIAL — agentic-spatial
    // ════════════════════════════════════════════════════════════════

    async reconstructSpace(images, opts = {}) {
      return this._need('agentic-spatial').reconstructSpace({
        images, apiKey: this._opts.apiKey, model: this._opts.model,
        baseUrl: this._opts.baseUrl, provider: this._opts.provider, ...opts,
      })
    }

    createSpatialSession(opts = {}) {
      return new (this._need('agentic-spatial').SpatialSession)({
        apiKey: this._opts.apiKey, model: this._opts.model,
        baseUrl: this._opts.baseUrl, provider: this._opts.provider, ...opts,
      })
    }

    // ════════════════════════════════════════════════════════════════
    // DISCOVERY + LIFECYCLE
    // ════════════════════════════════════════════════════════════════

    capabilities() {
      const has = name => !!load(name)
      return {
        think: has('agentic-core'),
        speak: has('agentic-voice'), listen: has('agentic-voice'),
        see: has('agentic-core'),
        converse: has('agentic-core') && has('agentic-voice'),
        remember: has('agentic-memory'), recall: has('agentic-memory'),
        save: has('agentic-store'), load: has('agentic-store'),
        embed: has('agentic-embed'), search: has('agentic-embed'),
        perceive: has('agentic-sense'),
        decide: has('agentic-act'), act: has('agentic-act'),
        render: has('agentic-render'),
        readFile: has('agentic-filesystem'),
        run: has('agentic-shell'),
        spatial: has('agentic-spatial'),
      }
    }

    destroy() {
      for (const inst of Object.values(this._i)) {
        if (inst?.destroy) inst.destroy()
        else if (inst?.close) inst.close()
        else if (inst?.stopListening) inst.stopListening()
      }
      this._i = {}
    }
  }

  function _toBase64(input) {
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(input)) return input.toString('base64')
    if (input instanceof ArrayBuffer) {
      const b = new Uint8Array(input); let s = ''
      for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i])
      return typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'binary').toString('base64')
    }
    return String(input)
  }

  return { Agentic }
})
