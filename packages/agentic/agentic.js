/**
 * agentic — 给 AI 造身体
 *
 * 子库的胶水层。think 永远走 agentic-core（core 自己处理 provider 路由）。
 * voice 子库没装时，speak/listen/converse 可以 fallback 到 agentic-service HTTP。
 *
 * Usage:
 *   // 直连云端 provider
 *   const ai = new Agentic({ provider: 'anthropic', apiKey: 'sk-...' })
 *
 *   // 连本地 agentic-service（service 暴露 OpenAI-compatible API）
 *   const ai = new Agentic({ provider: 'openai', baseUrl: 'http://localhost:1234' })
 *
 *   // 同样的 API
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

  // ── HTTP helpers (for voice fallback + admin) ────────────────────

  async function _fetch(base, path, opts = {}) {
    const url = `${base.replace(/\/+$/, '')}${path}`
    const res = await fetch(url, opts)
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`HTTP ${res.status} ${path}: ${text}`)
    }
    return res
  }

  async function _json(base, path, opts) {
    const res = await _fetch(base, path, opts)
    return res.json()
  }

  // ── Agentic class ────────────────────────────────────────────────

  class Agentic {
    /**
     * @param {object} opts
     * @param {string} [opts.serviceUrl] — agentic-service URL for voice fallback + admin
     * @param {string} [opts.apiKey]     — API key for provider
     * @param {string} [opts.model]
     * @param {string} [opts.baseUrl]    — provider base URL (point to service for OpenAI-compatible)
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
      this._serviceUrl = opts.serviceUrl ? opts.serviceUrl.replace(/\/+$/, '') : null
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
    // THINK — always through agentic-core
    //
    // core handles provider routing (anthropic/openai/ollama).
    // To use agentic-service: provider='openai', baseUrl='http://localhost:1234'
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

      if (opts.tools) config.tools = opts.tools
      if (opts.images) config.images = opts.images
      if (opts.audio) config.audio = opts.audio
      if (opts.history) config.history = opts.history
      if (opts.schema) config.schema = opts.schema
      if (opts.emit) config.emit = opts.emit

      const emit = opts.emit || (() => {})
      const result = await ask(input, config, emit)
      return typeof result === 'string' ? result : result?.answer || result
    }

    get tools() {
      return this._need('agentic-core').toolRegistry
    }

    // ════════════════════════════════════════════════════════════════
    // SPEAK — agentic-voice TTS, fallback to service /api/synthesize
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

    _hasVoice() { return !!load('agentic-voice') }

    async speak(text, opts) {
      if (this._hasVoice()) return this._tts().fetchAudio(text, opts)
      if (this._serviceUrl) {
        const res = await _fetch(this._serviceUrl, '/api/synthesize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, ...opts }),
        })
        return res.arrayBuffer()
      }
      this._need('agentic-voice') // throws helpful error
    }

    async speakAloud(text, opts) {
      if (this._hasVoice()) return this._tts().speak(text, opts)
      // remote can't play locally — return audio buffer instead
      return this.speak(text, opts)
    }
    async speakStream(stream, opts) { return this._tts().speakStream(stream, opts) }
    async timestamps(text, opts) { return this._tts().timestamps(text, opts) }
    stopSpeaking() { if (this._i.tts) this._i.tts.stop() }

    // ════════════════════════════════════════════════════════════════
    // LISTEN — agentic-voice STT, fallback to service /api/transcribe
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

    async listen(audio, opts) {
      if (this._hasVoice()) return this._stt().transcribe(audio, opts)
      if (this._serviceUrl) {
        const formData = new FormData()
        formData.append('audio', new Blob([audio]), 'audio.wav')
        if (opts?.language) formData.append('language', opts.language)
        const res = await _fetch(this._serviceUrl, '/api/transcribe', { method: 'POST', body: formData })
        const data = await res.json()
        return data.text || data
      }
      this._need('agentic-voice') // throws helpful error
    }

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
    // CONVERSE — listen → think → speak, fallback to service /api/voice
    // ════════════════════════════════════════════════════════════════

    async converse(audio, opts = {}) {
      // If we have voice locally, do the full pipeline
      if (this._hasVoice()) {
        const transcript = await this.listen(audio)
        const result = await this.think(transcript, opts)
        const answer = typeof result === 'string' ? result : result.answer || ''
        const audioOut = await this.speak(answer)
        return { text: answer, audio: audioOut, transcript }
      }
      // Fallback: service does STT→LLM→TTS in one call
      if (this._serviceUrl) {
        const formData = new FormData()
        formData.append('audio', new Blob([audio]), 'audio.wav')
        const res = await _fetch(this._serviceUrl, '/api/voice', { method: 'POST', body: formData })
        const data = await res.json()
        return { text: data.text || '', audio: data.audio ? _fromBase64(data.audio) : null, transcript: data.transcript || '' }
      }
      this._need('agentic-voice') // throws helpful error
    }

    // ════════════════════════════════════════════════════════════════
    // REMEMBER / RECALL — agentic-memory
    // ════════════════════════════════════════════════════════════════

    _mem() {
      return this._get('mem', () => this._need('agentic-memory').createMemory({ knowledge: true, ...this._opts.memory }))
    }

    async remember(text, meta = {}) {
      const id = meta.id || `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      await this._mem().learn(id, text, meta)
      return id
    }

    async recall(query, opts) { return this._mem().recall(query, opts) }
    async addMessage(role, content) { return this._mem().add(role, content) }

    // ════════════════════════════════════════════════════════════════
    // SAVE / LOAD — agentic-store
    // ════════════════════════════════════════════════════════════════

    async _store() {
      if (!this._i.store) {
        const mod = this._need('agentic-store')
        const s = await mod.createStore({ backend: 'sqlite', ...this._opts.store })
        this._i.store = s
      }
      return this._i.store
    }

    async save(key, value) { const s = await this._store(); return s.set(key, value) }
    async load(key) { const s = await this._store(); return s.get(key) }
    async has(key) { const s = await this._store(); return s.has(key) }
    async keys() { const s = await this._store(); return s.keys() }
    async deleteKey(key) { const s = await this._store(); return s.delete(key) }
    async query(sql, params) { const s = await this._store(); return s.all(sql, params) }
    async sql(sql, params) { const s = await this._store(); return s.run(sql, params) }
    async exec(sql, params) { const s = await this._store(); return s.exec(sql, params) }

    // ════════════════════════════════════════════════════════════════
    // EMBED — agentic-embed
    // ════════════════════════════════════════════════════════════════

    _embedLib() { return this._need('agentic-embed') }

    async _embedIndex() {
      return this._get('embedIndex', async () => {
        const mod = this._embedLib()
        return mod.create({ ...this._opts.embed })
      })
    }

    async embed(text) { return this._embedLib().localEmbed(Array.isArray(text) ? text : [text])[0] }
    async index(id, text, meta) { const idx = await this._embedIndex(); return idx.add(id, text, meta) }
    async indexMany(docs) { const idx = await this._embedIndex(); return idx.addMany(docs) }
    async search(query, opts) { const idx = await this._embedIndex(); return idx.search(query, opts) }

    // ════════════════════════════════════════════════════════════════
    // PERCEIVE — agentic-sense
    // ════════════════════════════════════════════════════════════════

    _sense() {
      return this._get('sense', () => new (this._need('agentic-sense').AgenticSense)())
    }

    async perceive(frame) { return this._sense().detect(frame) }

    // ════════════════════════════════════════════════════════════════
    // DECIDE / ACT — agentic-act
    // ════════════════════════════════════════════════════════════════

    _act() {
      return this._get('act', () => new (this._need('agentic-act').AgenticAct)({
        apiKey: this._opts.apiKey, model: this._opts.model,
        baseUrl: this._opts.baseUrl, provider: this._opts.provider,
      }))
    }

    async decide(input) { return this._act().decide(input) }
    async act(input) { return this._act().run(input) }

    // ════════════════════════════════════════════════════════════════
    // RENDER — agentic-render
    // ════════════════════════════════════════════════════════════════

    createRenderer(target, opts) {
      const mod = this._need('agentic-render')
      return mod.createRenderer(target, opts)
    }

    // ════════════════════════════════════════════════════════════════
    // FILESYSTEM — agentic-filesystem
    // ════════════════════════════════════════════════════════════════

    _fs() {
      return this._get('fs', () => {
        const mod = this._need('agentic-filesystem')
        const Backend = mod.NodeFsBackend || mod.MemoryStorage
        return new mod.AgenticFileSystem(Backend ? new Backend() : undefined)
      })
    }

    async readFile(path) { const r = await this._fs().read(path); return r?.content !== undefined ? r.content : r }
    async writeFile(path, content) { return this._fs().write(path, content) }
    async deleteFile(path) { return this._fs().delete(path) }
    async ls(prefix) { const r = await this._fs().ls(prefix); return Array.isArray(r) ? r.map(e => e?.name || e) : r }
    async tree(prefix) { return this._fs().tree(prefix) }
    async grep(pattern, opts) { return this._fs().grep(pattern, opts) }
    async semanticGrep(query) { return this._fs().semanticGrep(query) }

    // ════════════════════════════════════════════════════════════════
    // RUN — agentic-shell
    // ════════════════════════════════════════════════════════════════

    _shell() {
      return this._get('shell', () => new (this._need('agentic-shell').AgenticShell)(this._fs()))
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
    // CLAW — agentic-claw agent runtime
    // ════════════════════════════════════════════════════════════════

    createClaw(opts = {}) {
      const clawMod = this._need('agentic-claw')
      return clawMod.createClaw({
        apiKey: this._opts.apiKey,
        provider: this._opts.provider,
        baseUrl: this._opts.baseUrl,
        model: this._opts.model,
        systemPrompt: this._opts.system,
        ...opts,
      })
    }

    // ════════════════════════════════════════════════════════════════
    // ADMIN — agentic-service management (requires serviceUrl)
    // ════════════════════════════════════════════════════════════════

    get admin() {
      if (!this._serviceUrl) return null
      const base = this._serviceUrl
      return this._get('admin', () => ({
        health: () => _json(base, '/health'),
        status: () => _json(base, '/api/status'),
        perf: () => _json(base, '/api/perf'),
        config: (newConfig) => newConfig
          ? _json(base, '/api/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newConfig) })
          : _json(base, '/api/config'),
        devices: () => _json(base, '/api/devices'),
        logs: () => _json(base, '/api/logs'),
        models: () => _json(base, '/v1/models'),
        deleteModel: (name) => _json(base, `/api/models/${encodeURIComponent(name)}`, { method: 'DELETE' }),
      }))
    }

    // ════════════════════════════════════════════════════════════════
    // DISCOVERY + LIFECYCLE
    // ════════════════════════════════════════════════════════════════

    capabilities() {
      const has = name => !!load(name)
      return {
        think: has('agentic-core'),
        speak: has('agentic-voice') || !!this._serviceUrl,
        listen: has('agentic-voice') || !!this._serviceUrl,
        see: has('agentic-core'),
        converse: (has('agentic-core') && has('agentic-voice')) || !!this._serviceUrl,
        remember: has('agentic-memory'), recall: has('agentic-memory'),
        save: has('agentic-store'), load: has('agentic-store'),
        embed: has('agentic-embed'), search: has('agentic-embed'),
        perceive: has('agentic-sense'),
        decide: has('agentic-act'), act: has('agentic-act'),
        render: has('agentic-render'),
        readFile: has('agentic-filesystem'),
        run: has('agentic-shell'),
        spatial: has('agentic-spatial'),
        claw: has('agentic-claw'),
        admin: !!this._serviceUrl,
      }
    }

    /** URL of connected agentic-service, or null */
    get serviceUrl() { return this._serviceUrl }

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

  function _fromBase64(str) {
    if (typeof Buffer !== 'undefined') return Buffer.from(str, 'base64')
    const binary = atob(str)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes.buffer
  }

  return { Agentic }
})
