/**
 * agentic — 给 AI 造身体
 *
 * 以能力为接口，覆盖所有 agentic-* 子库。
 * 同一套接口风格，本地直接调子库。
 *
 * Usage:
 *   const ai = new Agentic({ provider: 'ollama', model: 'gemma3' })
 *   await ai.think('hello')
 *   await ai.speak('hello')
 *   await ai.listen(audio)
 *   await ai.remember('user likes coffee')
 *   await ai.recall('what does user like?')
 *   await ai.embed('hello world')
 *   await ai.decide({ text: 'turn on lights' })
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
     * @param {string} [opts.apiKey] - LLM API key
     * @param {string} [opts.model] - 默认模型
     * @param {string} [opts.baseUrl] - LLM API base URL
     * @param {string} [opts.provider] - 'ollama' | 'openai' | 'anthropic' | 'gemini'
     * @param {string} [opts.system] - 系统 prompt
     * @param {object} [opts.tts] - TTS 配置 { provider, apiKey, voice, model }
     * @param {object} [opts.stt] - STT 配置 { provider, apiKey, model }
     * @param {object} [opts.memory] - Memory 配置 { maxTokens, storage, knowledge }
     * @param {object} [opts.store] - Store 配置 { backend, path }
     * @param {object} [opts.embed] - Embed 配置 { provider, apiKey, model }
     * @param {object} [opts.sense] - Sense 配置
     * @param {object} [opts.act] - Act 配置
     * @param {object} [opts.render] - Render 配置 { target, theme }
     * @param {object} [opts.fs] - Filesystem 配置
     * @param {object} [opts.shell] - Shell 配置
     * @param {object} [opts.spatial] - Spatial 配置
     */
    constructor(opts = {}) {
      this._opts = opts
      this._instances = {}
    }

    // ── 内部：懒加载子库实例 ─────────────────────────────────────

    _get(name, factory) {
      if (this._instances[name]) return this._instances[name]
      const inst = factory()
      this._instances[name] = inst
      return inst
    }

    _require(name) {
      const mod = load(name)
      if (!mod) throw new Error(`${name} not installed`)
      return mod
    }

    // ════════════════════════════════════════════════════════════════
    // CORE — 思考 (agentic-core)
    // ════════════════════════════════════════════════════════════════

    /**
     * 思考 — LLM 调用
     * @param {string|Array} input - 消息或对话历史
     * @param {object} [opts] - { stream, schema, tools, history, system, model, images, audio }
     * @returns {Promise<{answer, rounds, messages, toolCalls?}>}
     */
    async think(input, opts = {}) {
      const core = this._require('agentic-core')
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
      if (opts.audio) config.audio = opts.audio

      return ask(input, config, opts.onEvent)
    }

    /**
     * 注册工具
     * @returns {object} toolRegistry
     */
    get tools() {
      const core = this._require('agentic-core')
      return core.toolRegistry
    }

    // ════════════════════════════════════════════════════════════════
    // VOICE — 听/说 (agentic-voice)
    // ════════════════════════════════════════════════════════════════

    /** @private */
    _tts() {
      return this._get('tts', () => {
        const voice = this._require('agentic-voice')
        const o = this._opts.tts || {}
        return voice.createTTS({
          provider: o.provider || 'openai',
          baseUrl: o.baseUrl || this._opts.baseUrl,
          apiKey: o.apiKey || this._opts.apiKey,
          voice: o.voice,
          model: o.model,
        })
      })
    }

    /** @private */
    _stt() {
      return this._get('stt', () => {
        const voice = this._require('agentic-voice')
        const o = this._opts.stt || {}
        return voice.createSTT({
          provider: o.provider || 'openai',
          baseUrl: o.baseUrl || this._opts.baseUrl,
          apiKey: o.apiKey || this._opts.apiKey,
          model: o.model,
        })
      })
    }

    /**
     * 说 — 文字转语音
     * @param {string} text
     * @param {object} [opts] - { voice, model }
     * @returns {Promise<ArrayBuffer|Buffer>}
     */
    async speak(text, opts = {}) {
      return this._tts().fetchAudio(text, opts)
    }

    /**
     * 说并播放（浏览器）
     * @param {string} text
     * @param {object} [opts]
     */
    async speakAloud(text, opts = {}) {
      return this._tts().speak(text, opts)
    }

    /**
     * 流式说 — 边生成边播放
     * @param {AsyncGenerator} textStream
     * @param {object} [opts]
     */
    async speakStream(textStream, opts = {}) {
      return this._tts().speakStream(textStream, opts)
    }

    /**
     * 获取语音时间戳（词级对齐）
     * @param {string} text
     * @param {object} [opts]
     */
    async timestamps(text, opts = {}) {
      return this._tts().timestamps(text, opts)
    }

    /** 停止播放 */
    stopSpeaking() {
      if (this._instances.tts) this._instances.tts.stop()
    }

    /**
     * 听 — 语音转文字
     * @param {Blob|Buffer|ArrayBuffer} audio
     * @param {object} [opts] - { language }
     * @returns {Promise<string>}
     */
    async listen(audio, opts = {}) {
      return this._stt().transcribe(audio, opts)
    }

    /**
     * 听（带时间戳）
     * @param {Blob|Buffer|ArrayBuffer} audio
     * @param {object} [opts]
     * @returns {Promise<{text, timestamps}>}
     */
    async listenWithTimestamps(audio, opts = {}) {
      return this._stt().transcribeWithTimestamps(audio, opts)
    }

    /**
     * 实时监听（持续 STT）
     * @param {function} onResult - 回调
     * @param {function} [onError]
     */
    startListening(onResult, onError) {
      return this._stt().startListening(onResult, onError)
    }

    /** 停止实时监听 */
    stopListening() {
      if (this._instances.stt) this._instances.stt.stopListening()
    }

    // ════════════════════════════════════════════════════════════════
    // VISION — 看 (agentic-core + images)
    // ════════════════════════════════════════════════════════════════

    /**
     * 看 — 图片理解
     * @param {Blob|Buffer|string} image - 图片数据或 base64
     * @param {string} [prompt] - 提问
     * @param {object} [opts] - { stream }
     * @returns {Promise<{answer}>}
     */
    async see(image, prompt = '描述这张图片', opts = {}) {
      const base64 = typeof image === 'string' ? image : _toBase64(image)
      return this.think(prompt, {
        ...opts,
        images: [{ url: `data:image/jpeg;base64,${base64}` }],
      })
    }

    // ════════════════════════════════════════════════════════════════
    // CONVERSE — 全链路语音对话 (voice + core)
    // ════════════════════════════════════════════════════════════════

    /**
     * 对话 — 听→想→说
     * @param {Blob|Buffer|ArrayBuffer} audio
     * @param {object} [opts]
     * @returns {Promise<{text, audio, transcript}>}
     */
    async converse(audio, opts = {}) {
      const transcript = await this.listen(audio)
      const result = await this.think(transcript, opts)
      const answer = typeof result === 'string' ? result : result.answer || ''
      const audioOut = await this.speak(answer)
      return { text: answer, audio: audioOut, transcript }
    }

    // ════════════════════════════════════════════════════════════════
    // MEMORY — 记忆 (agentic-memory)
    // ════════════════════════════════════════════════════════════════

    /** @private */
    _mem() {
      return this._get('memory', () => {
        const m = this._require('agentic-memory')
        return m.createMemory(this._opts.memory || {})
      })
    }

    /**
     * 记住 — 添加到知识库
     * @param {string} text - 要记住的内容
     * @param {object} [metadata]
     * @returns {Promise<void>}
     */
    async remember(text, metadata = {}) {
      const id = metadata.id || `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      return this._mem().learn(id, text, metadata)
    }

    /**
     * 回忆 — 从知识库检索
     * @param {string} query
     * @param {object} [opts] - { topK, threshold }
     * @returns {Promise<Array<{id, text, score}>>}
     */
    async recall(query, opts = {}) {
      return this._mem().recall(query, opts)
    }

    /**
     * 添加对话消息到短期记忆
     * @param {string} role - 'user' | 'assistant' | 'system'
     * @param {string} content
     */
    async addMessage(role, content) {
      return this._mem().add(role, content)
    }

    /** 获取对话历史 */
    messages() {
      return this._mem().messages()
    }

    /** 获取对话历史（含 token 估算） */
    history() {
      return this._mem().history()
    }

    /** 设置系统 prompt */
    setSystem(prompt) {
      return this._mem().setSystem(prompt)
    }

    /** 清空记忆 */
    clearMemory() {
      return this._mem().clear()
    }

    /** 导出记忆 */
    exportMemory() {
      return this._mem().export()
    }

    /** 导入记忆 */
    importMemory(data) {
      return this._mem().import(data)
    }

    // ════════════════════════════════════════════════════════════════
    // STORE — 持久化 (agentic-store)
    // ════════════════════════════════════════════════════════════════

    /** @private */
    _store() {
      return this._get('store', () => {
        const s = this._require('agentic-store')
        return s.createStore(this._opts.store || {})
      })
    }

    /**
     * 存 — KV 写入
     * @param {string} key
     * @param {*} value
     */
    async save(key, value) {
      const store = this._store()
      await store.init()
      return store.kvSet(key, value)
    }

    /**
     * 取 — KV 读取
     * @param {string} key
     * @returns {Promise<*>}
     */
    async load(key) {
      const store = this._store()
      await store.init()
      return store.kvGet(key)
    }

    /**
     * 列出所有 key
     * @returns {Promise<string[]>}
     */
    async keys() {
      const store = this._store()
      await store.init()
      return store.kvKeys()
    }

    /**
     * 执行 SQL（高级用法）
     * @param {string} sql
     * @param {Array} [params]
     */
    async query(sql, params) {
      const store = this._store()
      await store.init()
      return store.all(sql, params)
    }

    /**
     * 执行 SQL 写操作
     * @param {string} sql
     * @param {Array} [params]
     */
    async exec(sql, params) {
      const store = this._store()
      await store.init()
      return store.exec(sql, params)
    }

    // ════════════════════════════════════════════════════════════════
    // EMBED — 向量化 (agentic-embed)
    // ════════════════════════════════════════════════════════════════

    /** @private */
    _embedIndex() {
      return this._get('embedIndex', () => {
        const e = this._require('agentic-embed')
        return e.create(this._opts.embed || {})
      })
    }

    /**
     * 向量化文本
     * @param {string} text
     * @returns {Promise<number[]>}
     */
    async embed(text) {
      const e = this._require('agentic-embed')
      return e.localEmbed(text)
    }

    /**
     * 添加到向量索引
     * @param {string} id
     * @param {string} text
     * @param {object} [metadata]
     */
    async index(id, text, metadata = {}) {
      return this._embedIndex().add(id, text, metadata)
    }

    /**
     * 批量添加到向量索引
     * @param {Array<{id, text, metadata?}>} docs
     */
    async indexMany(docs) {
      return this._embedIndex().addMany(docs)
    }

    /**
     * 向量搜索
     * @param {string} query
     * @param {object} [opts] - { topK, threshold }
     * @returns {Promise<Array<{id, text, score, metadata}>>}
     */
    async search(query, opts = {}) {
      return this._embedIndex().search(query, opts)
    }

    /**
     * 文本分块
     * @param {string} text
     * @param {object} [opts] - { chunkSize, overlap }
     * @returns {string[]}
     */
    chunk(text, opts = {}) {
      const e = this._require('agentic-embed')
      return e.chunkText(text, opts)
    }

    /**
     * 余弦相似度
     * @param {number[]} a
     * @param {number[]} b
     * @returns {number}
     */
    similarity(a, b) {
      const e = this._require('agentic-embed')
      return e.cosineSimilarity(a, b)
    }

    // ════════════════════════════════════════════════════════════════
    // SENSE — 感知 (agentic-sense)
    // ════════════════════════════════════════════════════════════════

    /** @private */
    _sense() {
      return this._get('sense', () => {
        const s = this._require('agentic-sense')
        return new s.AgenticSense(this._opts.sense || {})
      })
    }

    /**
     * 感知 — 分析一帧画面
     * @param {HTMLVideoElement|HTMLCanvasElement|ImageData} frame
     * @returns {Promise<{faces, hands, body, objects, ...}>}
     */
    async perceive(frame) {
      return this._sense().detect(frame)
    }

    /**
     * 音频分析
     * @param {object} [opts]
     * @returns {AgenticAudio}
     */
    createAudioAnalyzer(opts = {}) {
      const s = this._require('agentic-sense')
      return new s.AgenticAudio(opts)
    }

    // ════════════════════════════════════════════════════════════════
    // ACT — 决策与行动 (agentic-act)
    // ════════════════════════════════════════════════════════════════

    /** @private */
    _act() {
      return this._get('act', () => {
        const a = this._require('agentic-act')
        return new a.AgenticAct({
          ...this._opts.act,
          apiKey: this._opts.apiKey,
          model: this._opts.model,
          provider: this._opts.provider,
          baseUrl: this._opts.baseUrl,
        })
      })
    }

    /**
     * 注册一个可执行动作
     * @param {object} action - { name, description, parameters, handler }
     */
    registerAction(action) {
      return this._act().register(action)
    }

    /**
     * 决策 — LLM 判断该执行什么动作
     * @param {string|object} input
     * @returns {Promise<{action, args, confidence}>}
     */
    async decide(input) {
      return this._act().decide(input)
    }

    /**
     * 执行 — 决策 + 执行动作
     * @param {string|object} input
     * @returns {Promise<{action, args, result}>}
     */
    async act(input) {
      return this._act().run(input)
    }

    // ════════════════════════════════════════════════════════════════
    // RENDER — 渲染 (agentic-render)
    // ════════════════════════════════════════════════════════════════

    /**
     * 渲染 Markdown 为 HTML
     * @param {string} markdown
     * @param {object} [opts] - { theme }
     * @returns {string} HTML
     */
    render(markdown, opts = {}) {
      const r = this._require('agentic-render')
      return r.render(markdown, opts)
    }

    /**
     * 创建流式渲染器（浏览器）
     * @param {string|HTMLElement} target - CSS 选择器或 DOM 元素
     * @param {object} [opts] - { theme, className }
     * @returns {{ append(text), clear(), destroy() }}
     */
    createRenderer(target, opts = {}) {
      const r = this._require('agentic-render')
      return r.create(target, { ...this._opts.render, ...opts })
    }

    /**
     * 获取渲染 CSS
     * @param {'dark'|'light'} [theme]
     * @returns {string}
     */
    renderCSS(theme = 'dark') {
      const r = this._require('agentic-render')
      return r.getCSS(theme === 'light' ? r.THEME_LIGHT : r.THEME_DARK)
    }

    // ════════════════════════════════════════════════════════════════
    // FILESYSTEM — 文件系统 (agentic-filesystem)
    // ════════════════════════════════════════════════════════════════

    /** @private */
    _fs() {
      return this._get('fs', () => {
        const f = this._require('agentic-filesystem')
        return new f.AgenticFileSystem(this._opts.fs)
      })
    }

    /**
     * 读文件
     * @param {string} path
     * @returns {Promise<string>}
     */
    async readFile(path) {
      return this._fs().read(path)
    }

    /**
     * 写文件
     * @param {string} path
     * @param {string} content
     */
    async writeFile(path, content) {
      return this._fs().write(path, content)
    }

    /**
     * 删文件
     * @param {string} path
     */
    async deleteFile(path) {
      return this._fs().delete(path)
    }

    /**
     * 列目录
     * @param {string} [prefix]
     * @returns {Promise<string[]>}
     */
    async ls(prefix = '') {
      return this._fs().ls(prefix)
    }

    /**
     * 目录树
     * @param {string} [prefix]
     * @returns {Promise<object>}
     */
    async tree(prefix = '') {
      return this._fs().tree(prefix)
    }

    /**
     * 搜索文件内容
     * @param {string} pattern
     * @param {object} [opts]
     * @returns {Promise<Array>}
     */
    async grep(pattern, opts = {}) {
      return this._fs().grep(pattern, opts)
    }

    /**
     * 语义搜索文件
     * @param {string} query
     * @returns {Promise<Array>}
     */
    async semanticGrep(query) {
      return this._fs().semanticGrep(query)
    }

    // ════════════════════════════════════════════════════════════════
    // SHELL — 命令执行 (agentic-shell)
    // ════════════════════════════════════════════════════════════════

    /** @private */
    _shell() {
      return this._get('shell', () => {
        const s = this._require('agentic-shell')
        return new s.AgenticShell(this._opts.shell || {})
      })
    }

    /**
     * 执行命令
     * @param {string} command
     * @returns {Promise<string>}
     */
    async run(command) {
      return this._shell().exec(command)
    }

    // ════════════════════════════════════════════════════════════════
    // SPATIAL — 空间推理 (agentic-spatial)
    // ════════════════════════════════════════════════════════════════

    /**
     * 从图片重建空间
     * @param {Array} images
     * @param {object} [opts] - { sensorHints, onProgress }
     * @returns {Promise<object>}
     */
    async reconstructSpace(images, opts = {}) {
      const s = this._require('agentic-spatial')
      return s.reconstructSpace({
        images,
        apiKey: this._opts.apiKey,
        model: this._opts.model,
        baseUrl: this._opts.baseUrl,
        provider: this._opts.provider,
        ...opts,
      })
    }

    /**
     * 创建空间会话（增量更新）
     * @param {object} [opts]
     * @returns {SpatialSession}
     */
    createSpatialSession(opts = {}) {
      const s = this._require('agentic-spatial')
      return new s.SpatialSession({
        apiKey: this._opts.apiKey,
        model: this._opts.model,
        baseUrl: this._opts.baseUrl,
        provider: this._opts.provider,
        ...opts,
      })
    }

    // ════════════════════════════════════════════════════════════════
    // DISCOVERY — 能力检测
    // ════════════════════════════════════════════════════════════════

    /**
     * 检测可用能力
     * @returns {object}
     */
    capabilities() {
      const hasCore = !!load('agentic-core')
      const hasVoice = !!load('agentic-voice')
      return {
        // 核心能力
        think: hasCore,
        listen: hasVoice,
        speak: hasVoice,
        see: hasCore,
        converse: hasCore && hasVoice,
        // 记忆与存储
        remember: !!load('agentic-memory'),
        store: !!load('agentic-store'),
        embed: !!load('agentic-embed'),
        // 感知与行动
        perceive: !!load('agentic-sense'),
        act: !!load('agentic-act'),
        // 渲染
        render: !!load('agentic-render'),
        // 系统
        filesystem: !!load('agentic-filesystem'),
        shell: !!load('agentic-shell'),
        spatial: !!load('agentic-spatial'),
      }
    }

    // ════════════════════════════════════════════════════════════════
    // LIFECYCLE
    // ════════════════════════════════════════════════════════════════

    /** 销毁，释放所有资源 */
    destroy() {
      for (const [key, inst] of Object.entries(this._instances)) {
        if (inst?.destroy) inst.destroy()
        else if (inst?.close) inst.close()
        else if (inst?.stopListening) inst.stopListening()
      }
      this._instances = {}
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
