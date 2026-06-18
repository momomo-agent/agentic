/**
 * agentic-claw — AI agent runtime
 */

// ── Optional sub-library loader ──────────────────────────────────
  // Tries require() first (Node), then globalThis (browser).
  // Returns null if not available — never throws.

  const _optCache = {}
  function optionalLoad(name, globalKey) {
    if (_optCache[name] !== undefined) return _optCache[name]
    let mod = null
    if (globalKey && typeof globalThis !== 'undefined' && globalThis[globalKey]) {
      mod = globalThis[globalKey]
    }
    if (!mod && typeof require === 'function') {
      try { mod = require(name) } catch {}
    }
    _optCache[name] = mod
    return mod
  }

  // ── Resolve dependencies ─────────────────────────────────────────

  function resolveDeps() {
    let core, memory
    if (typeof globalThis !== 'undefined') {
      core = globalThis.AgenticAgent || globalThis.agenticAsk
      memory = globalThis.AgenticMemory
    }
    if (!core && typeof require === 'function') {
      try { core = require('agentic-core') } catch {}
    }
    if (!memory && typeof require === 'function') {
      try { memory = require('agentic-memory') } catch {}
    }
    return { core, memory }
  }

  // ── Event emitter ────────────────────────────────────────────────

  function createEventEmitter() {
    const listeners = {}
    return {
      on(event, fn) {
        if (!listeners[event]) listeners[event] = []
        listeners[event].push(fn)
        return this
      },
      off(event, fn) {
        if (!listeners[event]) return this
        listeners[event] = listeners[event].filter(f => f !== fn)
        return this
      },
      emit(event, ...args) {
        if (listeners[event]) {
          for (const fn of listeners[event]) {
            try { fn(...args) } catch (e) { console.error(`[claw] event error:`, e) }
          }
        }
      },
    }
  }

  // ── Built-in skills ──────────────────────────────────────────────

  const builtinSkills = {
    calculate: {
      name: 'calculate',
      tools: [{
        name: 'calculate',
        description: 'Evaluate a mathematical expression. Supports +, -, *, /, ^, %, parentheses, and Math functions.',
        parameters: {
          type: 'object',
          properties: {
            expression: { type: 'string', description: 'Math expression (e.g. "125 * 0.85", "Math.sqrt(144)")' },
          },
          required: ['expression'],
        },
        execute: async (input) => {
          try {
            const expr = input.expression.replace(/\^/g, '**').replace(/(\d)%/g, '($1/100)')
            const result = new Function(`"use strict"; return (${expr})`)()
            if (typeof result !== 'number' || !isFinite(result)) return { error: 'Not a finite number', result: String(result) }
            return { expression: input.expression, result: Number(result.toPrecision(12)) }
          } catch (e) { return { error: e.message } }
        },
      }],
    },
  }

  function expandSkills(skills, skillConfig = {}) {
    const expanded = []
    const seen = new Set()
    for (const skill of skills) {
      if (!skill || !Array.isArray(skill.tools)) continue
      for (const tool of skill.tools) {
        if (typeof tool.requiresConfig === 'function' && !tool.requiresConfig(skillConfig)) continue
        if (seen.has(tool.name)) continue
        seen.add(tool.name)
        expanded.push({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
          execute: (input) => tool.execute(input, skillConfig),
        })
      }
    }
    return expanded
  }

  function normalizePositiveInt(value, fallback) {
    const n = Number(value)
    if (Number.isFinite(n) && n > 0) return Math.floor(n)
    return fallback
  }

  function stringifyMemoryText(value) {
    if (typeof value === 'string') return value
    if (value === undefined || value === null) return ''
    try {
      const json = JSON.stringify(value)
      if (typeof json === 'string') return json
    } catch {}
    return String(value ?? '')
  }

  function normalizeHistoryToolCalls(toolCalls) {
    if (!Array.isArray(toolCalls)) return []
    return toolCalls
      .filter(tc => tc && (tc.id || tc.call_id) && (tc.name || tc.function?.name))
      .map(tc => ({
        ...tc,
        id: String(tc.id || tc.call_id),
        name: String(tc.name || tc.function?.name),
        input: tc.input ?? tc.arguments ?? tc.function?.arguments ?? {},
      }))
  }

  // ── createClaw ───────────────────────────────────────────────────

  function createClaw(options = {}) {
    // Mutable runtime config — can be updated after creation via claw.configure()
    // so the model/provider/apiKey picked at creation time is no longer a life sentence.
    const cfg = {
      apiKey: options.apiKey,
      provider: options.provider || 'anthropic',
      baseUrl: options.baseUrl || null,
      model: options.model || null,
      proxyUrl: options.proxyUrl || null,
      systemPrompt: options.systemPrompt || null,
      providers: options.providers || null,
      stream: options.stream !== false,
      contextMaxTokens: normalizePositiveInt(options.contextMaxTokens ?? options.memoryMaxTokens ?? options.maxTokens, 8000),
      outputMaxTokens: normalizePositiveInt(options.outputMaxTokens, 4096),
    }
    const {
      tools = [],
      skills = [],
      skillConfig = {},
      knowledge = false,
      embedProvider = 'local',
      embedApiKey = null,
      embedBaseUrl = null,
      persist = null,
      disableMemoryCompaction = false,
    } = options

    if (!cfg.apiKey && (!cfg.providers || !cfg.providers.length)) throw new Error('apiKey is required')

    // Resolve skills
    const resolvedSkills = skills.map(s => {
      if (typeof s === 'string') {
        if (builtinSkills[s]) return builtinSkills[s]
        console.warn(`[claw] Unknown built-in skill: ${s}`)
        return null
      }
      return s
    }).filter(Boolean)

    const skillTools = expandSkills(resolvedSkills, skillConfig)
    const allTools = [...tools, ...skillTools]

    const { core, memory } = resolveDeps()
    if (!memory) throw new Error('agentic-memory not found. Install or include via <script>')

    const askFn = typeof agenticAsk === 'function' ? agenticAsk
      : core?.agenticAsk || core
    if (!askFn || typeof askFn !== 'function') {
      throw new Error('agentic-core not found. Install or include via <script>')
    }

    // ── Abort management ───────────────────────────────────────────
    const _controllers = new Map() // sessionId → AbortController

    function _createSignal(sessionId, chatOpts) {
      // If caller provides their own signal, use it (they manage lifecycle)
      if (chatOpts.signal) return chatOpts.signal
      // Reuse existing controller if already created (e.g. by _chatThenableGen)
      if (_controllers.has(sessionId)) return _controllers.get(sessionId).signal
      // Otherwise create an internal controller so session.abort() works
      const controller = new AbortController()
      _controllers.set(sessionId, controller)
      return controller.signal
    }

    function _clearController(sessionId, expected) {
      // Only clear if the controller is still ours (prevents race with new chat)
      if (expected && _controllers.get(sessionId) !== expected) return
      _controllers.delete(sessionId)
    }

    // ── Steering queue (per session) ────────────────────
    // queueMode controls behavior when chat() is called while a session is generating:
    //   'block'     (default) — reject silently (current behavior, returns null)
    //   'steer'     — queue the message, inject at next turn boundary
    //   'interrupt' — abort current run and start a new chat
    const _steerQueues = new Map() // sessionId → Array<string>
    const _queueModes = new Map()  // sessionId → 'block' | 'steer' | 'interrupt'
    const _defaultQueueMode = options.queueMode || 'block'

    function _getQueueMode(sessionId) {
      return _queueModes.get(sessionId) || _defaultQueueMode
    }
    async function _drainSteerQueue(sessionId, settleSteerQueue) {
      if (typeof settleSteerQueue === 'function') {
        try { await settleSteerQueue() } catch (e) {}
      }
      const q = _steerQueues.get(sessionId)
      if (!q || !q.length) return []
      const out = q.slice()
      q.length = 0
      return out
    }
    function _enqueueSteer(sessionId, content) {
      let q = _steerQueues.get(sessionId)
      if (!q) { q = []; _steerQueues.set(sessionId, q) }
      q.push(content)
      return q.length
    }

    // ── Conductor integration ──────────────────────────────────────
    const conductorMod = options.conductorModule || optionalLoad('agentic-conductor', 'AgenticConductor')
    let _conductor = null

    if (conductorMod && conductorMod.createConductor) {
      // Build AI adapter for conductor: single chat() returning async generator
      const aiAdapter = {
        chat: (messages, chatOpts = {}) => {
          const input = messages[messages.length - 1]?.content || ''
          const config = {
            provider: chatOpts.provider || cfg.provider,
            apiKey: chatOpts.apiKey || cfg.apiKey,
            baseUrl: chatOpts.baseUrl || cfg.baseUrl || undefined,
            model: chatOpts.model || cfg.model || undefined,
            proxyUrl: chatOpts.proxyUrl || cfg.proxyUrl || undefined,
            history: messages.slice(0, -1),
            system: chatOpts.system, tools: chatOpts.tools || allTools,
            stream: true,
            outputMaxTokens: normalizePositiveInt(chatOpts.outputMaxTokens ?? chatOpts.maxTokens, cfg.outputMaxTokens),
            ...(cfg.providers ? { providers: cfg.providers } : {}),
            ...(chatOpts.images ? { images: chatOpts.images } : {}),
            ...(chatOpts.audio ? { audio: chatOpts.audio } : {}),
          }
          return askFn(input, config) // returns async generator
        },
      }

      // Default onWorkerStart: use askFn to execute worker tasks
      const defaultOnWorkerStart = async (task, abort, taskOpts) => {
        const workerTools = taskOpts.tools || allTools
        const workerSystem = (options.workerDirectives || '') +
          '\nYou are a worker executing a specific task. Focus on completing it efficiently.\n' +
          'Available tools: ' + workerTools.filter(t => t.name !== 'plan_steps' && t.name !== 'done').map(t => t.name).join(', ')

        const config = {
          provider: taskOpts.provider || cfg.provider,
          apiKey: taskOpts.apiKey || cfg.apiKey,
          baseUrl: taskOpts.baseUrl || cfg.baseUrl || undefined,
          model: taskOpts.model || cfg.model || undefined,
          proxyUrl: taskOpts.proxyUrl || cfg.proxyUrl || undefined,
          system: workerSystem,
          tools: workerTools,
          stream: true,
          outputMaxTokens: normalizePositiveInt(taskOpts.outputMaxTokens ?? taskOpts.maxTokens, cfg.outputMaxTokens),
          ...(cfg.providers ? { providers: cfg.providers } : {}),
        }

        let answer = ''
        for await (const chunk of askFn(task, config)) {
          if (abort?.aborted) break
          if ((chunk.type === 'text_delta' || chunk.type === 'text') && chunk.text) {
            answer += chunk.text
          } else if (chunk.type === 'done') {
            answer = chunk.answer || answer
          }
        }

        // Signal completion via done tool if available
        const doneTool = workerTools.find(t => t.name === 'done')
        if (doneTool?.execute) {
          doneTool.execute({ summary: answer.slice(0, 500) })
        }

        return answer
      }

      _conductor = conductorMod.createConductor({
        ai: aiAdapter,
        tools: allTools,
        systemPrompt: cfg.systemPrompt || '',
        strategy: options.strategy || 'single',
        intentMode: options.intentMode || 'tools',
        dispatchMode: options.dispatchMode || 'code',
        planMode: options.planMode !== false,
        maxSlots: options.maxSlots || 3,
        personality: options.personality || '',
        talkerDirectives: options.talkerDirectives || '',
        workerDirectives: options.workerDirectives || '',
        onWorkerStart: options.onWorkerStart || defaultOnWorkerStart,
        store: null, // use conductor's built-in memoryStore
      })
      // Forward conductor events to claw's event emitter
      _conductor.on((event, data) => {
        events.emit('conductor', { event, ...data })
        // Auto-emit worker results for UI consumption
        if (event === 'scheduler.finished' && data?.status === 'done') {
          events.emit('worker_done', { taskId: data.id, task: data.task, result: data.result })
        }
      })
    }

    const events = createEventEmitter()
    const sessions = new Map()
    let _heartbeatInterval = null
    let _schedules = []

    // ── Strategy: 'single' (direct askFn) or 'conductor' ──
    let _strategy = options.strategy || (_conductor ? 'conductor' : 'single')

    // Shared knowledge
    const sharedKnowledgeOpts = knowledge ? {
      knowledge: true,
      embedProvider,
      embedApiKey,
      embedBaseUrl,
    } : {}

    let _sharedKnowledge = null
    if (knowledge) {
      _sharedKnowledge = memory.createMemory({
        maxTokens: 1000,
        ...sharedKnowledgeOpts,
        storage: persist ? (persist + ':knowledge') : null,
      })
    }

    function _createSessionMemory(sessionId) {
      return memory.createMemory({
        maxTokens: cfg.contextMaxTokens,
        systemPrompt: cfg.systemPrompt,
        storage: persist ? (persist + ':' + sessionId) : null,
        id: sessionId,
      })
    }

    /**
     * Replay a list of {role, content} messages into a fresh memory instance.
     * Only user/assistant string entries are restored — these are the only
     * shapes both _persistHistory and conductor.hydrate round-trip safely.
     */
    async function _replayHistoryInto(mem, messages) {
      if (!Array.isArray(messages)) return 0
      let restored = 0
      for (const m of messages) {
        if (!m || typeof m !== 'object') continue
        const role = stringifyMemoryText(m.role).trim()
        const content = stringifyMemoryText(m.content)
        if (!content) continue
        if (role === 'user') { await mem.user(content); restored++ }
        else if (role === 'assistant') { await mem.assistant(content); restored++ }
      }
      return restored
    }

    function _getSession(sessionId) {
      if (sessions.has(sessionId)) return sessions.get(sessionId)
      const mem = _createSessionMemory(sessionId)
      sessions.set(sessionId, mem)
      // Hydrate from persisted history when a store is configured.
      // The promise is attached to the memory so any chat() can await it
      // before reading history — this prevents races where the first turn
      // is sent to the LLM with empty context while the read is in-flight.
      mem.__hydration = (async () => {
        if (!persist) return
        try {
          const saved = await _loadHistory(sessionId)
          if (!saved || !saved.length) return
          // Only replay if the in-memory session is still empty — this avoids
          // clobbering messages added by races or by callers that warm the
          // session manually before the first chat.
          const current = typeof mem.messages === 'function' ? mem.messages() : []
          if (current.length > 1) return // > 1 because system prompt may already be there
          await _replayHistoryInto(mem, saved)
          // Mirror into conductor's internal talker history so the LLM also
          // sees the restored context, not just sessionMem.
          if (_conductor && typeof _conductor.hydrate === 'function') {
            _conductor.hydrate(saved)
          }
        } catch (_) { /* best-effort restore */ }
      })()
      return mem
    }

    /** Await any in-flight hydration on a session memory. Safe to call repeatedly. */
    async function _ensureHydrated(mem) {
      if (mem && mem.__hydration) {
        try { await mem.__hydration } catch (_) {}
        // Clear so we don't await a settled promise on every chat.
        mem.__hydration = null
      }
    }

    // ── Persistence helpers ────────────────────────────────────────
    let _store = null
    function _getStore() {
      if (_store !== undefined && _store !== null) return _store
      if (!persist) { _store = null; return null }
      const storeMod = optionalLoad('agentic-store', 'AgenticStore')
      if (storeMod && storeMod.createStore) {
        _store = storeMod.createStore(persist)
      } else {
        _store = null
      }
      return _store
    }

    async function _persistHistory(sessionId, messages) {
      const store = _getStore()
      if (!store) return
      try { await store.kvSet('history:' + sessionId, JSON.stringify(messages)) } catch {}
    }

    async function _loadHistory(sessionId) {
      const store = _getStore()
      if (!store) return null
      try {
        const raw = await store.kvGet('history:' + sessionId)
        return raw ? JSON.parse(raw) : null
      } catch { return null }
    }

    // ── Token estimation ───────────────────────────────────────────
    function _estimateTokens(messages) {
      let chars = 0
      for (const m of messages) {
        chars += stringifyMemoryText(m?.content).length + 10
      }
      return Math.ceil(chars / 4) // ~4 chars per token
    }

    async function _compactIfNeeded(sessionMem, contextMaxTokensOverride) {
      if (disableMemoryCompaction) return
      const msgs = sessionMem.messages()
      const est = _estimateTokens(msgs)
      const contextMaxTokens = normalizePositiveInt(contextMaxTokensOverride, cfg.contextMaxTokens)
      if (est <= contextMaxTokens || msgs.length <= 4) return
      // Keep last 4 messages, summarize the rest
      const keepCount = 4
      const older = msgs.slice(0, msgs.length - keepCount)
      const recent = msgs.slice(msgs.length - keepCount)
      const summaryText = older.map(m => `${m.role}: ${stringifyMemoryText(m.content).slice(0, 200)}`).join('\n')
      const summary = { role: 'system', content: `[Conversation summary]\n${summaryText.slice(0, contextMaxTokens)}` }
      sessionMem.clear()
      await sessionMem.user(summary.content)
      // Re-add recent messages
      for (const m of recent) {
        if (m.role === 'user') await sessionMem.user(stringifyMemoryText(m.content))
        else if (m.role === 'assistant') await sessionMem.assistant(stringifyMemoryText(m.content))
      }
    }

    function _normalizeHistory(history) {
      if (!Array.isArray(history)) return null
      const normalized = []
      for (const m of history) {
        if (!m || typeof m !== 'object') continue
        const role = stringifyMemoryText(m.role).trim()
        if (role === 'user') {
          const content = stringifyMemoryText(m.content)
          if (content.trim()) normalized.push({ role: 'user', content })
          continue
        }
        if (role === 'assistant') {
          const content = stringifyMemoryText(m.content)
          const toolCalls = normalizeHistoryToolCalls(m.tool_calls)
          if (!content.trim() && toolCalls.length === 0) continue
          const item = { role: 'assistant', content }
          if (toolCalls.length) item.tool_calls = toolCalls
          normalized.push(item)
          continue
        }
        if (role === 'tool' && m.tool_call_id) {
          const item = {
            role: 'tool',
            tool_call_id: stringifyMemoryText(m.tool_call_id),
            content: stringifyMemoryText(m.content),
          }
          if (Array.isArray(m.blocks) && m.blocks.length) item.blocks = m.blocks
          if (m.is_error || m.isError) item.is_error = true
          normalized.push(item)
        }
      }
      return normalized
    }

    // ── Build askFn config ─────────────────────────────────────────
    function _buildAskConfig(sessionMem, chatOpts) {
      const sys = chatOpts.system ?? chatOpts.systemPrompt ?? cfg.systemPrompt ?? ''
      // Exclude the last message (current user input) from history
      // because askFn will add it as the prompt parameter
      const fullHistory = sessionMem.history()
      const history = _normalizeHistory(chatOpts.history) || fullHistory.slice(0, -1)
      const effProviders = chatOpts.providers || cfg.providers
      return {
        provider: chatOpts.provider || cfg.provider,
        apiKey: chatOpts.apiKey || cfg.apiKey,
        baseUrl: (chatOpts.baseUrl || cfg.baseUrl) || undefined,
        model: (chatOpts.model || cfg.model) || undefined,
        proxyUrl: (chatOpts.proxyUrl || cfg.proxyUrl) || undefined,
        history,
        system: sys || undefined,
        tools: chatOpts.tools || allTools,
        stream: chatOpts.stream ?? cfg.stream,
        ...(effProviders ? { providers: effProviders } : {}),
        signal: _createSignal(sessionMem.id || 'default', chatOpts),
        ...(chatOpts.searchApiKey ? { searchApiKey: chatOpts.searchApiKey } : {}),
        ...(chatOpts.images ? { images: chatOpts.images } : {}),
        ...(chatOpts.audio ? { audio: chatOpts.audio } : {}),
        ...(chatOpts.retries != null ? { retries: chatOpts.retries } : {}),
        ...(chatOpts.retryDelayMs != null ? { retryDelayMs: chatOpts.retryDelayMs } : {}),
        ...(chatOpts.modelGatewayPriority != null ? { modelGatewayPriority: chatOpts.modelGatewayPriority } : {}),
        ...(chatOpts.modelGatewaySource != null ? { modelGatewaySource: chatOpts.modelGatewaySource } : {}),
        ...(chatOpts.modelGatewaySilent != null ? { modelGatewaySilent: chatOpts.modelGatewaySilent } : {}),
        ...(chatOpts.modelGatewayRequestId != null ? { modelGatewayRequestId: chatOpts.modelGatewayRequestId } : {}),
        ...(chatOpts.modelGatewayMaxWaitMs != null ? { modelGatewayMaxWaitMs: chatOpts.modelGatewayMaxWaitMs } : {}),
        ...(chatOpts.modelGatewayConcurrency != null ? { modelGatewayConcurrency: chatOpts.modelGatewayConcurrency } : {}),
        ...(typeof chatOpts.modelGatewayOnStatus === 'function' ? { modelGatewayOnStatus: chatOpts.modelGatewayOnStatus } : {}),
        outputMaxTokens: normalizePositiveInt(chatOpts.outputMaxTokens ?? chatOpts.maxTokens, cfg.outputMaxTokens),
        steer: {
          drain: () => _drainSteerQueue(sessionMem.id || 'default', chatOpts.settleSteerQueue),
        },
      }
    }

    // ── Knowledge context ──────────────────────────────────────────
    async function _appendKnowledge(input, config) {
      if (!_sharedKnowledge) return
      try {
        const results = await _sharedKnowledge.recall(input, { topK: 3 })
        if (results.length > 0) {
          const ctx = '\n\nRelevant knowledge:\n' + results.map(r => `- ${r.chunk}`).join('\n')
          config.system = (config.system || '') + ctx
        }
      } catch (e) {
        events.emit('error', e)
      }
    }

    // ── Chat (dual mode) ──────────────────────────────────────────
    function _chat(sessionMem, input, emitOrOpts, maybeEmit) {
      const normalizedInput = stringifyMemoryText(input)
      let chatOpts = {}
      let emit
      if (typeof emitOrOpts === 'function') {
        emit = emitOrOpts
      } else if (emitOrOpts && typeof emitOrOpts === 'object') {
        chatOpts = emitOrOpts
        emit = maybeEmit
      }

      // Mid-turn message handling: when a chat is already running on this session,
      // queueMode decides what to do.
      const sid = sessionMem.id || 'default'
      if (_controllers.has(sid)) {
        const mode = chatOpts.queueMode || _getQueueMode(sid)
        if (mode === 'steer') {
          const depth = _enqueueSteer(sid, normalizedInput)
          events.emit('queued', { sessionId: sid, content: normalizedInput, depth })
          if (emit) {
            return Promise.resolve({ queued: true, depth, answer: '', rounds: 0, messages: sessionMem.messages() })
          }
          const noop = (async function* () {
            yield { type: 'queued', sessionId: sid, content: normalizedInput, depth }
          })()
          return {
            [Symbol.asyncIterator]() { return noop },
            then(resolve, reject) {
              return Promise.resolve({ queued: true, depth, answer: '', rounds: 0, messages: sessionMem.messages() }).then(resolve, reject)
            },
          }
        }
        if (mode === 'interrupt') {
          const controller = _controllers.get(sid)
          if (controller) {
            controller.abort()
            _controllers.delete(sid)
            events.emit('abort', { sessionId: sid, reason: 'interrupt' })
          }
          // Fall through to start a fresh chat.
        }
        // mode === 'block' falls through to current behavior (concurrent generators).
      }

      // If emit callback provided -> legacy Promise mode (returns Promise)
      if (emit) {
        return _chatLegacy(sessionMem, normalizedInput, chatOpts, emit)
      }
      // Otherwise → return thenable async generator
      // This allows both: for await (const e of claw.chat(...)) AND await claw.chat(...)
      return _chatThenableGen(sessionMem, normalizedInput, chatOpts)
    }

    // Wraps the async generator so it's also thenable (backward compat with await)
    function _chatThenableGen(sessionMem, input, chatOpts) {
      const gen = _chatGenerator(sessionMem, input, chatOpts)
      const sessionId = sessionMem.id || 'default'

      // Eagerly create the abort controller so it's available BEFORE
      // the generator starts executing (generator body runs lazily on first .next()).
      if (!chatOpts.signal && !_controllers.has(sessionId)) {
        const controller = new AbortController()
        _controllers.set(sessionId, controller)
      }

      // Cache the signal reference NOW — abort() deletes from _controllers,
      // but we still need the signal to check .aborted in _abortableIterator.
      const signal = chatOpts.signal || _controllers.get(sessionId)?.signal

      const abortableGen = _abortableIterator(gen, signal)
      const wrapper = {
        [Symbol.asyncIterator]() { return abortableGen },
        then(resolve, reject) {
          // Consume the generator, return final result
          return (async () => {
            let lastDone = null
            for await (const event of abortableGen) {
              if (event.type === 'done') lastDone = event
            }
            if (lastDone) {
              return { answer: lastDone.answer, rounds: lastDone.rounds, messages: sessionMem.messages() }
            }
            return { answer: '', rounds: 0, messages: sessionMem.messages() }
          })().then(resolve, reject)
        },
      }
      return wrapper
    }

    // Legacy emit mode (backward compat)
    async function _chatLegacy(sessionMem, input, chatOpts, emit) {
      const _mySid = sessionMem.id || 'default'
      const _myCtrl = _controllers.get(_mySid)
      const normalizedInput = stringifyMemoryText(input)
      events.emit('message', { role: 'user', content: normalizedInput })
      await sessionMem.user(normalizedInput)
      await _compactIfNeeded(sessionMem, chatOpts.contextMaxTokens ?? chatOpts.memoryMaxTokens)

      const emitFn = (event, data) => {
        if (emit) emit(event, data)
        if (event === 'token') events.emit('token', data)
        if (event === 'status') events.emit('status', data)
        if (event === 'tool_call') events.emit('tool_call', data)
      }

      try {
        if (_conductor && _strategy === 'conductor') {
          // Conductor path: consume async generator, emit tokens
          let answer = '', intents = []
          const abortSignal = _myCtrl?.signal
          for await (const chunk of _abortableIterator(_conductor.chat(normalizedInput, chatOpts), abortSignal)) {
            if (chunk.type === 'text' && chunk.text) {
              answer += chunk.text
              emitFn('token', { text: chunk.text })
            } else if (chunk.type === 'tool_use') {
              emitFn('tool_call', chunk)
            } else if (chunk.type === 'done') {
              answer = chunk.reply || answer
              intents = chunk.intents || []
            }
          }
          await sessionMem.assistant(answer)
          events.emit('message', { role: 'assistant', content: answer })
          await _persistHistory(sessionMem.id || 'default', sessionMem.messages())
          return { answer, rounds: 1, intents, data: null, messages: sessionMem.messages() }
        } else {
          // Direct askFn path
          const config = _buildAskConfig(sessionMem, chatOpts)
          await _appendKnowledge(normalizedInput, config)
          const result = await askFn(normalizedInput, config, emitFn)
          const answer = result.answer || result.content || ''
          await sessionMem.assistant(answer)
          events.emit('message', { role: 'assistant', content: answer })
          await _persistHistory(sessionMem.id || 'default', sessionMem.messages())
          return { answer, rounds: result.rounds || 1, data: result.data || null, messages: sessionMem.messages() }
        }
      } catch (error) {
        events.emit('error', error)
        throw error
      } finally {
        _clearController(_mySid, _myCtrl)
      }
    }

        // Abort-aware async iterator wrapper (shared utility).
    // When abort fires, next()/return()/throw() resolve immediately with { done: true }.
    // This prevents for-await from hanging when the underlying generator is stuck.
    function _abortableIterator(gen, signal) {
      if (!signal) return gen
      let aborted = signal.aborted
      if (!aborted) {
        signal.addEventListener('abort', () => { aborted = true }, { once: true })
      }
      const abortDone = { done: true, value: undefined }
      const abortPromise = new Promise(resolve => {
        if (aborted) { resolve(abortDone); return }
        signal.addEventListener('abort', () => resolve(abortDone), { once: true })
      })
      return {
        [Symbol.asyncIterator]() { return this },
        next() {
          if (aborted) return Promise.resolve(abortDone)
          return Promise.race([gen.next(), abortPromise])
        },
        return() {
          if (aborted) return Promise.resolve(abortDone)
          return gen.return ? gen.return() : Promise.resolve(abortDone)
        },
        throw(...args) {
          if (aborted) return Promise.resolve(abortDone)
          return gen.throw ? gen.throw(...args) : Promise.reject(args[0])
        },
      }
    }

    // Generator mode — yields ChatEvent
    // Routes through conductor when available, falls back to direct askFn
    async function* _chatGenerator(sessionMem, input, chatOpts) {
      const _mySid = sessionMem.id || 'default'
      const _myCtrl = _controllers.get(_mySid)
      const normalizedInput = stringifyMemoryText(input)
      await _ensureHydrated(sessionMem)
      events.emit('message', { role: 'user', content: normalizedInput })
      await sessionMem.user(normalizedInput)
      await _compactIfNeeded(sessionMem, chatOpts.contextMaxTokens ?? chatOpts.memoryMaxTokens)

      let success = false
      let partialAnswer = ''
      try {
        if (_conductor && _strategy === 'conductor') {
          // ── Conductor path: streaming via conductor.chat() async generator ──
          const sessionId = sessionMem.id || 'default'
          const abortSignal = _myCtrl?.signal
          let answer = ''
          for await (const chunk of _abortableIterator(_conductor.chat(normalizedInput, chatOpts), abortSignal)) {
            if (abortSignal?.aborted) break
            if (chunk.type === 'text' && chunk.text) {
              answer += chunk.text
              partialAnswer = answer
              events.emit('token', { text: chunk.text })
              yield { type: 'text_delta', text: chunk.text }
            } else if (chunk.type === 'done') {
              const reply = chunk.reply || answer
              await sessionMem.assistant(reply)
              events.emit('message', { role: 'assistant', content: reply })
              await _persistHistory(sessionMem.id || 'default', sessionMem.messages())
              success = true
              yield { type: 'done', answer: reply, intents: chunk.intents || [], rounds: 1, messages: sessionMem.messages() }
            } else {
              // Forward tool_use, status, etc.
              if (chunk.type === 'tool_use') events.emit('tool_call', chunk)
              else if (chunk.type === 'tool_input_delta') events.emit('tool_input_delta', chunk)
              else if (chunk.type === 'status') events.emit('status', chunk)
              yield chunk
            }
          }
        } else {
          // ── Direct askFn path (no conductor) ──
          const config = _buildAskConfig(sessionMem, chatOpts)
          await _appendKnowledge(normalizedInput, config)

          const result = askFn(normalizedInput, config)

          // Handle legacy askFn that returns a Promise instead of AsyncGenerator
          if (result && typeof result.then === 'function' && !result[Symbol.asyncIterator]) {
            const resolved = await result
            const answer = resolved.answer || resolved.content || ''
            if (answer) events.emit('token', { text: answer })
            await sessionMem.assistant(answer)
            events.emit('message', { role: 'assistant', content: answer })
            await _persistHistory(sessionMem.id || 'default', sessionMem.messages())
            success = true
            yield { type: 'text_delta', text: answer }
            yield { type: 'done', answer, rounds: resolved.rounds || 1, messages: sessionMem.messages() }
            return
          }

          const abortSignal = _myCtrl?.signal

          for await (const event of _abortableIterator(result, abortSignal)) {
            // Guard: stop emitting after abort
            if (abortSignal?.aborted) break
            if (event.type === 'text_delta') {
              partialAnswer += event.text || ''
              events.emit('token', { text: event.text })
            }
            else if (event.type === 'status') events.emit('status', event)
            else if (event.type === 'tool_use') events.emit('tool_call', event)
            else if (event.type === 'tool_input_delta') events.emit('tool_input_delta', event)
            if (event.type === 'done') {
              const answer = event.answer || partialAnswer || ''
              await sessionMem.assistant(answer)
              events.emit('message', { role: 'assistant', content: answer })
              await _persistHistory(sessionMem.id || 'default', sessionMem.messages())
              success = true
            }
            yield event
          }
        }
      } catch (error) {
        // Rollback user message on error so retry doesn't duplicate
        if (!success && !partialAnswer) {
          sessionMem.popLast()
        }
        events.emit('error', error)
        throw error
      } finally {
        // Persist partial answer if generator was aborted/broken mid-stream.
        // Only persist if we still own the controller — if a new chat has started
        // (interrupt mode), our partial would corrupt the new conversation's history.
        const stillOwner = _controllers.get(_mySid) === _myCtrl
        if (!success && partialAnswer && stillOwner) {
          try {
            await sessionMem.assistant(partialAnswer)
            await _persistHistory(_mySid, sessionMem.messages())
            events.emit('message', { role: 'assistant', content: partialAnswer, partial: true })
          } catch (_) { /* best-effort */ }
        }
        _clearController(_mySid, _myCtrl)
      }
    }

    // ── Retry ─────────────────────────────────────────────────────
    async function* _retry(sessionMem, chatOpts = {}) {
      await _ensureHydrated(sessionMem)
      const msgs = sessionMem.messages()
      if (msgs.length === 0) {
        yield { type: 'error', error: 'No messages to retry', category: 'usage', retryable: false }
        return
      }
      // Find last user message, remove everything after it (the assistant reply)
      let lastUserIdx = -1
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'user') { lastUserIdx = i; break }
      }
      if (lastUserIdx === -1) {
        yield { type: 'error', error: 'No user message to retry', category: 'usage', retryable: false }
        return
      }
      const lastUserMsg = msgs[lastUserIdx].content
      // Remove assistant messages after last user message
      // We rebuild memory: clear and re-add up to (and excluding) the last user msg
      const keep = msgs.slice(0, lastUserIdx)
      sessionMem.clear()
      for (const m of keep) {
        if (m.role === 'user') await sessionMem.user(stringifyMemoryText(m.content))
        else if (m.role === 'assistant') await sessionMem.assistant(stringifyMemoryText(m.content))
      }
      // Re-send the last user message through the generator path
      yield* _chatGenerator(sessionMem, stringifyMemoryText(lastUserMsg), chatOpts)
    }

    const defaultSession = _getSession('default')

    // ── Sub-library instances (lazy-initialized) ──────────────────
    let _storeSub, _fs, _shell, _act, _render, _sense, _spatial, _embed, _voice

    const claw = {
      /** Chat — send a message, get a response (or async generator if no emit) */
      chat(input, optsOrEmit, maybeEmit) {
        return _chat(defaultSession, input, optsOrEmit, maybeEmit)
      },

      /** Retry last assistant turn on default session */
      retry(opts) {
        return _retry(defaultSession, opts)
      },

      /** Set queue behavior for mid-turn messages on the default session. */
      setQueueMode(mode) {
        if (mode !== 'block' && mode !== 'steer' && mode !== 'interrupt') {
          throw new Error(`Invalid queueMode: ${mode}. Use 'block', 'steer', or 'interrupt'.`)
        }
        _queueModes.set(defaultSession.id || 'default', mode)
        return this
      },
      /** Current queue mode for the default session. */
      getQueueMode() { return _getQueueMode(defaultSession.id || 'default') },
      /** Number of messages waiting on the default session. */
      queueDepth() {
        const q = _steerQueues.get(defaultSession.id || 'default')
        return q ? q.length : 0
      },
      /** Drop all queued steering messages on the default session. */
      clearQueue() {
        const q = _steerQueues.get(defaultSession.id || 'default')
        if (q) q.length = 0
        return this
      },
      /** Whether the default session has a chat in progress. */
      get isGenerating() { return _controllers.has(defaultSession.id || 'default') },

      /** Create/get a named session */
      session(id = 'default') {
        const mem = _getSession(id)
        const sessionId = id || 'default'
        return {
          chat(input, optsOrEmit, maybeEmit) { return _chat(mem, input, optsOrEmit, maybeEmit) },
          retry(opts) { return _retry(mem, opts) },
          /** Abort this session's in-flight chat. No-op if idle. */
          abort() {
            const controller = _controllers.get(sessionId)
            if (controller) {
              controller.abort()
              _controllers.delete(sessionId)
              events.emit('abort', { sessionId })
            }
            return this
          },
          /** Whether this session has a chat in progress. */
          get isGenerating() { return _controllers.has(sessionId) },
          /** Set queue behavior for mid-turn messages: 'block' | 'steer' | 'interrupt'. */
          setQueueMode(mode) {
            if (mode !== 'block' && mode !== 'steer' && mode !== 'interrupt') {
              throw new Error(`Invalid queueMode: ${mode}. Use 'block', 'steer', or 'interrupt'.`)
            }
            _queueModes.set(sessionId, mode)
            return this
          },
          /** Current queue mode for this session. */
          getQueueMode() { return _getQueueMode(sessionId) },
          /** Number of messages waiting to be injected at next turn boundary. */
          queueDepth() {
            const q = _steerQueues.get(sessionId)
            return q ? q.length : 0
          },
          /** Drop all queued steering messages without injecting. */
          clearQueue() {
            const q = _steerQueues.get(sessionId)
            if (q) q.length = 0
            return this
          },
          memory: mem,
          id: sessionId,
        }
      },

      /** Learn — add to shared knowledge base */
      async learn(id, text, metadata = {}) {
        if (!_sharedKnowledge) throw new Error('Knowledge not enabled. Use createClaw({ knowledge: true })')
        await _sharedKnowledge.learn(id, text, metadata)
        return this
      },

      /** Recall — search shared knowledge */
      async recall(query, options = {}) {
        if (!_sharedKnowledge) throw new Error('Knowledge not enabled')
        return _sharedKnowledge.recall(query, options)
      },

      /** Forget — remove from knowledge base */
      async forget(id) {
        if (!_sharedKnowledge) throw new Error('Knowledge not enabled')
        await _sharedKnowledge.forget(id)
        return this
      },

      /** Add a skill at runtime */
      use(skill) {
        const s = typeof skill === 'string' ? builtinSkills[skill] : skill
        if (!s || !Array.isArray(s.tools)) {
          console.warn('[claw] Invalid skill:', skill)
          return this
        }
        resolvedSkills.push(s)
        const fresh = expandSkills(resolvedSkills, skillConfig)
        allTools.length = tools.length
        allTools.push(...fresh)
        return this
      },

      /** List registered skills */
      listSkills() {
        return resolvedSkills.map(s => ({ name: s.name, tools: s.tools.map(t => t.name) }))
      },

      /** Register heartbeat callback */
      heartbeat(fn, intervalMs = 60000) {
        if (_heartbeatInterval) clearInterval(_heartbeatInterval)
        _heartbeatInterval = setInterval(() => {
          try { fn() } catch (e) { events.emit('error', e) }
        }, intervalMs)
        return this
      },

      /** Schedule a task */
      schedule(pattern, fn) {
        let ms
        if (typeof pattern === 'number') {
          ms = pattern
        } else if (typeof pattern === 'string') {
          const match = pattern.match(/^(\d+)(s|m|h|d)$/)
          if (match) {
            const [, n, unit] = match
            const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 }
            ms = parseInt(n) * multipliers[unit]
          }
        }
        if (!ms) throw new Error('Invalid schedule pattern. Use number (ms) or "5m", "1h", etc.')
        const id = setInterval(() => {
          try { fn() } catch (e) { events.emit('error', e) }
        }, ms)
        _schedules.push(id)
        return this
      },

      /** Event listeners */
      on(event, fn) { events.on(event, fn); return this },
      off(event, fn) { events.off(event, fn); return this },

      /**
       * Update runtime config. Any of model/provider/apiKey/baseUrl/proxyUrl/systemPrompt/providers/stream
       * can be changed after creation — subsequent chat() calls pick up the new values.
       * Pass null/'' to clear a field (resets to undefined for that call).
       */
      configure(patch = {}) {
        if (!patch || typeof patch !== 'object') return this
        for (const k of ['apiKey', 'provider', 'baseUrl', 'model', 'proxyUrl', 'systemPrompt', 'providers', 'stream']) {
          if (k in patch) cfg[k] = patch[k]
        }
        if ('contextMaxTokens' in patch || 'memoryMaxTokens' in patch) {
          cfg.contextMaxTokens = normalizePositiveInt(patch.contextMaxTokens ?? patch.memoryMaxTokens, cfg.contextMaxTokens)
        }
        if ('outputMaxTokens' in patch || 'maxTokens' in patch) {
          cfg.outputMaxTokens = normalizePositiveInt(patch.outputMaxTokens ?? patch.maxTokens, cfg.outputMaxTokens)
        }
        events.emit('configure', { ...cfg })
        return this
      },

      /** Convenience: switch model. */
      setModel(model) { cfg.model = model || null; events.emit('configure', { ...cfg }); return this },
      /** Convenience: switch provider (optionally also apiKey/baseUrl/model in one call). */
      setProvider(provider, extras = {}) {
        if (provider) cfg.provider = provider
        for (const k of ['apiKey', 'baseUrl', 'model', 'proxyUrl']) {
          if (k in extras) cfg[k] = extras[k]
        }
        events.emit('configure', { ...cfg })
        return this
      },
      /** Convenience: swap API key without recreating claw. */
      setApiKey(apiKey) { cfg.apiKey = apiKey || null; events.emit('configure', { ...cfg }); return this },
      /** Convenience: set providers[] failover list. */
      setProviders(providers) { cfg.providers = Array.isArray(providers) && providers.length ? providers : null; events.emit('configure', { ...cfg }); return this },
      /** Convenience: update systemPrompt. */
      setSystemPrompt(systemPrompt) { cfg.systemPrompt = systemPrompt || null; events.emit('configure', { ...cfg }); return this },

      /** Switch routing strategy at runtime: 'single' (direct LLM) or 'conductor'. */
      setStrategy(strategy) {
        if (strategy !== 'single' && strategy !== 'conductor') {
          throw new Error("strategy must be 'single' or 'conductor'")
        }
        if (strategy === 'conductor' && !_conductor) {
          throw new Error('conductor not available (agentic-conductor not loaded)')
        }
        _strategy = strategy
        events.emit('strategy', { strategy: _strategy })
        return this
      },
      /** Get current routing strategy. */
      getStrategy() { return _strategy },
      /** Whether conductor is available (loaded at init). */
      get hasConductor() { return !!_conductor },

      /** Add a tool at runtime. Same-name tool is replaced (upsert). */
      addTool(tool) {
        if (!tool || !tool.name) throw new Error('tool.name required')
        const idx = allTools.findIndex(t => t.name === tool.name)
        if (idx >= 0) allTools[idx] = tool
        else allTools.push(tool)
        events.emit('tools', allTools.slice())
        return this
      },

      /** Remove a tool by name. No-op if not found. */
      removeTool(name) {
        const idx = allTools.findIndex(t => t.name === name)
        if (idx >= 0) allTools.splice(idx, 1)
        events.emit('tools', allTools.slice())
        return this
      },

      /** Replace the entire tool set. */
      setTools(newTools) {
        allTools.length = 0
        if (Array.isArray(newTools)) allTools.push(...newTools)
        events.emit('tools', allTools.slice())
        return this
      },

      /** Snapshot of current tools (copy). */
      getTools() { return allTools.slice() },

      /** Abort all in-flight chats across all sessions. No-op if idle. */
      abort() {
        if (_controllers.size === 0) return this
        for (const [sid, controller] of _controllers) {
          controller.abort()
        }
        _controllers.clear()
        events.emit('abort')
        return this
      },

      /** Whether any chat is currently in progress (any session). */
      get isGenerating() { return _controllers.size > 0 },

      /** Snapshot of current runtime config (copy, safe to mutate). */
      getConfig() { return { ...cfg } },

      /** Warmup: pre-heat connection + prompt cache */
      async warmup() {
        const warmupFn = core?.warmup || (typeof warmup === 'function' ? warmup : null)
        if (!warmupFn) {
          console.warn('[claw] warmup not available in agentic-core')
          return { ok: false, reason: 'not_available' }
        }
        return warmupFn({
          provider: cfg.provider,
          apiKey: cfg.apiKey,
          baseUrl: cfg.baseUrl,
          model: cfg.model,
          system: cfg.systemPrompt,
          tools: allTools,
          proxyUrl: cfg.proxyUrl,
          providers: cfg.providers,
          modelGatewayPriority: 'background',
          modelGatewaySource: 'claw.warmup',
          modelGatewaySilent: true,
        })
      },

      /** List active sessions */
      sessions() { return [...sessions.keys()] },

      /** Remove one named session and its transient memory. No-op if missing. */
      removeSession(id = 'default') {
        const sessionId = id || 'default'
        const controller = _controllers.get(sessionId)
        if (controller) {
          controller.abort()
          _controllers.delete(sessionId)
          events.emit('abort', { sessionId })
        }
        const q = _steerQueues.get(sessionId)
        if (q) q.length = 0
        _steerQueues.delete(sessionId)
        _queueModes.delete(sessionId)
        const mem = sessions.get(sessionId)
        if (mem && typeof mem.destroy === 'function') mem.destroy()
        sessions.delete(sessionId)
        return this
      },

      /** Get default memory instance */
      get memory() { return defaultSession },

      /** Get knowledge info */
      knowledgeInfo() {
        return _sharedKnowledge ? _sharedKnowledge.knowledgeInfo() : null
      },

      // ── Sub-library accessors (lazy-loaded) ────────────────────

      /** KV store — get/set/delete/keys/has/clear */
      get store() {
        if (_storeSub) return _storeSub
        const mod = optionalLoad('agentic-store', 'AgenticStore')
        if (!mod) return null
        _storeSub = mod.createStore({ backend: 'sqlite' })
        _storeSub.init()
        return _storeSub
      },

      /** File system — read/write/ls/tree/grep/delete */
      get fs() {
        if (_fs) return _fs
        const mod = optionalLoad('agentic-filesystem', 'AgenticFileSystem')
        if (!mod) return null
        const Backend = mod.NodeFsBackend || mod.MemoryStorage
        _fs = new mod.AgenticFileSystem(Backend ? new Backend() : undefined)
        return _fs
      },

      /** Shell — exec/jobs */
      get shell() {
        if (_shell) return _shell
        const mod = optionalLoad('agentic-shell', 'AgenticShell')
        if (!mod) return null
        _shell = new mod.AgenticShell()
        return _shell
      },

      /** Act — AI decision + action */
      get act() {
        if (_act) return _act
        const mod = optionalLoad('agentic-act', 'AgenticAct')
        if (!mod) return null
        _act = {
          decide: (input, opts = {}) => new mod.AgenticAct({ apiKey: cfg.apiKey, model: cfg.model, baseUrl: cfg.baseUrl, ...opts }).decide(input),
          run: (input, opts = {}) => new mod.AgenticAct({ apiKey: cfg.apiKey, model: cfg.model, baseUrl: cfg.baseUrl, ...opts }).run(input),
        }
        return _act
      },

      /** Render — markdown to HTML */
      get render() {
        if (_render) return _render
        const mod = optionalLoad('agentic-render', 'AgenticRender')
        if (!mod) return null
        _render = {
          html: (markdown, opts = {}) => mod.render(markdown, opts),
          css: (theme) => mod.getCSS(theme === 'dark' ? mod.THEME_DARK : mod.THEME_LIGHT),
          THEME_DARK: mod.THEME_DARK,
          THEME_LIGHT: mod.THEME_LIGHT,
        }
        return _render
      },

      /** Sense — audio VAD, frame extraction */
      get sense() {
        if (_sense) return _sense
        const mod = optionalLoad('agentic-sense', 'AgenticSense')
        if (!mod) return null
        _sense = {
          Audio: mod.AgenticAudio,
          extractFrame: mod.extractFrame,
          Sense: mod.AgenticSense,
        }
        return _sense
      },

      /** Spatial — 3D spatial reasoning */
      get spatial() {
        if (_spatial) return _spatial
        const mod = optionalLoad('agentic-spatial', 'AgenticSpatial')
        if (!mod) return null
        _spatial = {
          reconstruct: (opts) => mod.reconstructSpace({ apiKey: cfg.apiKey, model: cfg.model, baseUrl: cfg.baseUrl, ...opts }),
          Session: mod.SpatialSession,
          createSession: (opts = {}) => new mod.SpatialSession({ apiKey: cfg.apiKey, model: cfg.model, baseUrl: cfg.baseUrl, ...opts }),
        }
        return _spatial
      },

      /** Embed — vector embeddings + search */
      get embed() {
        if (_embed) return _embed
        const mod = optionalLoad('agentic-embed', 'AgenticEmbed')
        if (!mod) return null
        _embed = {
          create: (opts) => mod.create(opts),
          chunkText: mod.chunkText,
          localEmbed: mod.localEmbed,
          cosineSimilarity: mod.cosineSimilarity,
        }
        return _embed
      },

      /** Voice — TTS + STT */
      get voice() {
        if (_voice) return _voice
        const mod = optionalLoad('agentic-voice', 'AgenticVoice')
        if (!mod) return null
        _voice = {
          createTTS: (opts = {}) => mod.createTTS({ apiKey: cfg.apiKey, baseUrl: cfg.baseUrl, ...opts }),
          createSTT: (opts = {}) => mod.createSTT(opts),
          createVoice: (opts = {}) => mod.createVoice({ apiKey: cfg.apiKey, baseUrl: cfg.baseUrl, ...opts }),
        }
        return _voice
      },

      /** Conductor — multi-intent dispatch engine (auto-created when agentic-conductor available) */
      get conductor() { return _conductor },

      /** List available sub-libraries */
      capabilities() {
        return {
          core: true,
          memory: true,
          conductor: !!_conductor,
          store: !!optionalLoad('agentic-store'),
          filesystem: !!optionalLoad('agentic-filesystem'),
          shell: !!optionalLoad('agentic-shell'),
          act: !!optionalLoad('agentic-act'),
          render: !!optionalLoad('agentic-render'),
          sense: !!optionalLoad('agentic-sense'),
          spatial: !!optionalLoad('agentic-spatial'),
          embed: !!optionalLoad('agentic-embed'),
          voice: !!optionalLoad('agentic-voice'),
        }
      },

      /** Destroy — cleanup intervals and storage */
      destroy() {
        if (_heartbeatInterval) clearInterval(_heartbeatInterval)
        for (const id of _schedules) clearInterval(id)
        _schedules = []
        for (const [, mem] of sessions) mem.destroy()
        sessions.clear()
        if (_sharedKnowledge) _sharedKnowledge.destroy()
        if (_conductor) _conductor.destroy()
        if (_storeSub && _storeSub.close) _storeSub.close()
        _storeSub = _fs = _shell = _act = _render = _sense = _spatial = _embed = _voice = null
        _conductor = null
      },
    }

    return claw
  }

export { createClaw, builtinSkills, expandSkills }
