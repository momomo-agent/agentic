/**
 * agentic — 给 AI 造身体
 *
 * 子库的胶水层。
 * 有 serviceUrl → 走 WebSocket 连 agentic-service（双向通信，低延迟）
 * 没有 serviceUrl → 走 agentic-core 直连 provider（HTTP）
 *
 * Usage:
 *   // 直连云端 provider
 *   const ai = new Agentic({ provider: 'anthropic', apiKey: 'sk-...' })
 *
 *   // 连本地 agentic-service（WebSocket）
 *   const ai = new Agentic({ serviceUrl: 'http://localhost:1234' })
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

  // ── WebSocket connection manager ─────────────────────────────

  const WS = typeof WebSocket !== 'undefined' ? WebSocket
    : (typeof require === 'function' ? (() => { try { return require('ws') } catch { return null } })() : null)

  function createWsConnection(serviceUrl) {
    const wsUrl = serviceUrl.replace(/^http/, 'ws').replace(/\/+$/, '')
    let ws = null
    let connected = false
    let connectPromise = null
    const pending = new Map() // reqId → { resolve, reject, chunks, onDelta }
    let reqCounter = 0

    function connect() {
      if (connectPromise) return connectPromise
      connectPromise = new Promise((resolve, reject) => {
        if (!WS) return reject(new Error('WebSocket not available'))
        ws = new WS(wsUrl)

        ws.onopen = () => {
          connected = true
          connectPromise = null
          resolve(ws)
        }

        ws.onmessage = (event) => {
          let msg
          try { msg = JSON.parse(typeof event.data === 'string' ? event.data : event.data.toString()) } catch { return }

          if (msg._reqId && pending.has(msg._reqId)) {
            const req = pending.get(msg._reqId)
            if (msg.type === 'rpc_result') {
              req.resolve(msg.result)
              pending.delete(msg._reqId)
            } else if (msg.type === 'rpc_error') {
              req.reject(new Error(msg.error || 'RPC error'))
              pending.delete(msg._reqId)
            } else if (msg.type === 'chat_delta') {
              req.chunks.push(msg.text || '')
              if (req.onDelta) req.onDelta(msg.text || '')
            } else if (msg.type === 'chat_end') {
              req.resolve(msg.text || req.chunks.join(''))
              pending.delete(msg._reqId)
            } else if (msg.type === 'chat_error' || msg.type === 'error') {
              req.reject(new Error(msg.error || 'Unknown error'))
              pending.delete(msg._reqId)
            }
          } else if (msg.type === 'chat_delta' || msg.type === 'chat_end' || msg.type === 'chat_error') {
            // Legacy: no _reqId, match to the single pending request
            const first = pending.values().next().value
            if (!first) return
            const reqId = pending.keys().next().value
            if (msg.type === 'chat_delta') {
              first.chunks.push(msg.text || '')
              if (first.onDelta) first.onDelta(msg.text || '')
            } else if (msg.type === 'chat_end') {
              first.resolve(msg.text || first.chunks.join(''))
              pending.delete(reqId)
            } else if (msg.type === 'chat_error') {
              first.reject(new Error(msg.error || 'Unknown error'))
              pending.delete(reqId)
            }
          }
        }

        ws.onerror = (err) => {
          if (!connected) {
            connectPromise = null
            reject(err)
          }
        }

        ws.onclose = () => {
          connected = false
          connectPromise = null
          // Reject all pending
          for (const [id, req] of pending) {
            req.reject(new Error('WebSocket closed'))
          }
          pending.clear()
        }
      })
      return connectPromise
    }

    async function chat(messages, options = {}) {
      if (!connected || !ws || ws.readyState !== 1) await connect()
      const reqId = `r_${++reqCounter}_${Date.now()}`

      return new Promise((resolve, reject) => {
        pending.set(reqId, { resolve, reject, chunks: [], onDelta: options.emit })
        ws.send(JSON.stringify({
          type: 'chat',
          _reqId: reqId,
          messages,
          options: { tools: options.tools },
        }))
      })
    }

    function close() {
      if (ws) { ws.close(); ws = null }
      connected = false
      connectPromise = null
    }

    async function rpc(method, params = {}) {
      if (!connected || !ws || ws.readyState !== 1) await connect()
      const reqId = `r_${++reqCounter}_${Date.now()}`

      return new Promise((resolve, reject) => {
        pending.set(reqId, {
          resolve, reject, chunks: [],
          onDelta: null,
          _rpc: true,
        })
        ws.send(JSON.stringify({ type: 'rpc', _reqId: reqId, method, params }))
      })
    }

    return { connect, chat, rpc, close, get connected() { return connected } }
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
      this._ws = this._serviceUrl ? createWsConnection(this._serviceUrl) : null
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
    // THINK — serviceUrl → WebSocket to service, otherwise → core direct
    // ════════════════════════════════════════════════════════════════

    async think(input, opts = {}) {
      // Route: serviceUrl → WebSocket, otherwise → core direct
      if (this._ws) {
        const messages = opts.history
          ? [...opts.history, { role: 'user', content: input }]
          : [{ role: 'user', content: input }]
        if (opts.system) messages.unshift({ role: 'system', content: opts.system })
        return this._ws.chat(messages, { tools: opts.tools, emit: opts.emit })
      }

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

    /**
     * stream(input, opts) → AsyncGenerator<ChatEvent>
     *
     * Like think(), but returns an async generator that yields token-level events:
     *   { type: 'text_delta', text }
     *   { type: 'tool_use', id, name, input }
     *   { type: 'tool_result', id, name, output }
     *   { type: 'tool_error', id, name, error }
     *   { type: 'done', answer, stopReason }
     *   { type: 'error', error }
     *
     * Usage:
     *   for await (const event of ai.stream('hello', { tools })) {
     *     if (event.type === 'text_delta') process.stdout.write(event.text)
     *   }
     */
    async *stream(input, opts = {}) {
      // WebSocket path: not yet supported for streaming, fall back to think()
      if (this._ws) {
        const result = await this.think(input, opts)
        yield { type: 'text_delta', text: result }
        yield { type: 'done', answer: result, stopReason: 'end_turn' }
        return
      }

      const core = this._need('agentic-core')
      const ask = core.agenticAsk || core

      const config = {
        provider: opts.provider || this._opts.provider,
        baseUrl: opts.baseUrl || this._opts.baseUrl,
        apiKey: opts.apiKey || this._opts.apiKey,
        model: opts.model || this._opts.model,
        system: opts.system || this._opts.system,
        stream: true, // always streaming
        signal: opts.signal,
      }

      if (opts.tools) config.tools = opts.tools
      if (opts.images) config.images = opts.images
      if (opts.audio) config.audio = opts.audio
      if (opts.history) config.history = opts.history
      if (opts.providers) config.providers = opts.providers

      const gen = ask(input, config)
      yield* gen
    }

    get tools() {
      return this._need('agentic-core').toolRegistry
    }

    // ════════════════════════════════════════════════════════════════
    // SPEAK — agentic-voice TTS, delegates to core for network
    // ════════════════════════════════════════════════════════════════

    _core() {
      return load('agentic-core')
    }

    _tts() {
      return this._get('tts', () => {
        const v = this._need('agentic-voice')
        const o = this._opts.tts || {}
        return v.createTTS({
          provider: o.provider || 'openai',
          baseUrl: o.baseUrl || this._opts.baseUrl,
          apiKey: o.apiKey || this._opts.apiKey,
          voice: o.voice, model: o.model,
          core: this._core(),  // pass core for network delegation
        })
      })
    }

    _hasVoice() { return !!load('agentic-voice') }

    async speak(text, opts) {
      if (this._ws) {
        const result = await this._ws.rpc('synthesize', { text, options: opts })
        // result.audio is base64
        if (typeof Buffer !== 'undefined') return Buffer.from(result.audio, 'base64')
        const bin = atob(result.audio)
        const arr = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
        return arr.buffer
      }
      return this._tts().fetchAudio(text, opts)
    }

    async speakAloud(text, opts) { return this._tts().speak(text, opts) }
    async speakStream(stream, opts) { return this._tts().speakStream(stream, opts) }
    async timestamps(text, opts) { return this._tts().timestamps(text, opts) }
    stopSpeaking() { if (this._i.tts) this._i.tts.stop() }

    // ════════════════════════════════════════════════════════════════
    // LISTEN — agentic-voice STT, delegates to core for network
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
          core: this._core(),  // pass core for network delegation
        })
      })
    }

    async listen(audio, opts) {
      if (this._ws) {
        const b64 = typeof audio === 'string' ? audio
          : (typeof Buffer !== 'undefined' && Buffer.isBuffer(audio)) ? audio.toString('base64')
          : _toBase64(audio)
        const result = await this._ws.rpc('transcribe', { audio: b64, options: opts })
        return result.text
      }
      return this._stt().transcribe(audio, opts)
    }

    async listenWithTimestamps(audio, opts) { return this._stt().transcribeWithTimestamps(audio, opts) }
    startListening(onResult, onError) { return this._stt().startListening(onResult, onError) }
    stopListening() { if (this._i.stt) this._i.stt.stopListening() }

    // ════════════════════════════════════════════════════════════════
    // SEE — agentic-core + images
    // ════════════════════════════════════════════════════════════════

    async see(image, prompt = '描述这张图片', opts = {}) {
      const b64 = typeof image === 'string' ? image : _toBase64(image)
      if (this._ws) {
        const messages = [{ role: 'user', content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}` } },
        ]}]
        const result = await this._ws.rpc('vision', { messages })
        return result.text
      }
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

    async embed(text) {
      if (this._ws) {
        const result = await this._ws.rpc('embed', { text: Array.isArray(text) ? text[0] : text })
        return result.embedding
      }
      return this._embedLib().localEmbed(Array.isArray(text) ? text : [text])[0]
    }
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
    // ADMIN — agentic-service management (requires serviceUrl → WS)
    // ════════════════════════════════════════════════════════════════

    get admin() {
      if (!this._ws) return null
      const rpc = (method, params) => this._ws.rpc(method, params)
      return this._get('admin', () => ({
        health: () => rpc('health'),
        status: () => rpc('status'),
        perf: () => rpc('perf'),
        config: (newConfig) => newConfig ? rpc('config.set', newConfig) : rpc('config.get'),
        devices: () => rpc('devices'),
        models: () => rpc('models'),
        engines: () => rpc('engines'),
        queueStats: () => rpc('queue.stats'),
        assignments: (updates) => updates ? rpc('assignments.set', updates) : rpc('assignments.get'),
        addToPool: (model) => rpc('pool.add', model),
        removeFromPool: (id) => rpc('pool.remove', { id }),
      }))
    }

    // ════════════════════════════════════════════════════════════════
    // DISCOVERY + LIFECYCLE
    // ════════════════════════════════════════════════════════════════

    capabilities() {
      const has = name => !!load(name)
      const ws = !!this._ws
      return {
        think: ws || has('agentic-core'),
        speak: ws || has('agentic-voice'),
        listen: ws || has('agentic-voice'),
        see: ws || has('agentic-core'),
        converse: (ws || has('agentic-core')) && (ws || has('agentic-voice')),
        remember: has('agentic-memory'), recall: has('agentic-memory'),
        save: has('agentic-store'), load: has('agentic-store'),
        embed: ws || has('agentic-embed'), search: has('agentic-embed'),
        perceive: has('agentic-sense'),
        decide: has('agentic-act'), act: has('agentic-act'),
        render: has('agentic-render'),
        readFile: has('agentic-filesystem'),
        run: has('agentic-shell'),
        spatial: has('agentic-spatial'),
        claw: has('agentic-claw'),
        admin: ws,
      }
    }

    /** URL of connected agentic-service, or null */
    get serviceUrl() { return this._serviceUrl }

    destroy() {
      if (this._ws) { this._ws.close(); this._ws = null }
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
