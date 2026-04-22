/**
 * agentic-conductor — Multi-intent dispatch engine
 *
 * Facade that wires IntentState + Dispatcher + Scheduler into a single API.
 *
 * Usage:
 *   const { createConductor } = require('agentic-conductor')
 *   const conductor = createConductor({ ai, tools, system })
 *   const result = await conductor.chat("Search AI news and write a report")
 *
 * Strategy:
 *   'single'   — direct LLM loop, no intent splitting (equivalent to Claw)
 *   'dispatch'  — Talker splits intents, Dispatcher + Scheduler manage workers
 */
;(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const { createIntentState } = require('./intent-state')
    const { createScheduler } = require('./scheduler')
    const { createDispatcher } = require('./dispatcher')
    module.exports = factory(createIntentState, createScheduler, createDispatcher)
  } else {
    // Browser: expect globals
    const cis = root.IntentState?.createIntentState || root.createIntentState
    const cs = root.Scheduler?.createScheduler || root.createScheduler
    const cd = root.Dispatcher?.createDispatcher || root.createDispatcher
    root.AgenticConductor = factory(cis, cs, cd)
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (createIntentState, createScheduler, createDispatcher) {
  'use strict'

  // Built-in memory store (default when no store provided)
  function memoryStore() {
    const map = new Map()
    return {
      get: (k) => Promise.resolve(map.get(k) ?? null),
      set: (k, v) => { map.set(k, v); return Promise.resolve() },
      delete: (k) => { map.delete(k); return Promise.resolve() },
      keys: () => Promise.resolve([...map.keys()]),
      has: (k) => Promise.resolve(map.has(k)),
      clear: () => { map.clear(); return Promise.resolve() },
    }
  }

  const TALKER_SYSTEM = `You are a task-aware AI assistant. When the user asks you to do things, you can:
1. Reply directly for simple questions
2. Create intents for tasks that need background work

When creating intents, output a JSON block:
\`\`\`intents
[{"action":"create","goal":"...","dependsOn":[],"priority":1},
 {"action":"update","id":"...","message":"..."},
 {"action":"cancel","id":"..."}]
\`\`\`

Rules:
- Simple questions → just answer, no intents
- Tasks needing tools/time → create intents
- Sequential tasks → use dependsOn with the ID of the prerequisite
- Always include a natural language reply before/after the intents block`

  function createConductor(opts = {}) {
    const {
      ai,                          // LLM instance: { chat(messages, opts) → { answer, usage } }
      tools = [],                  // Tool definitions for workers
      systemPrompt = '',           // Product-specific system prompt for Talker
      formatContext = null,         // () → string, dynamic context injection
      strategy = 'dispatch',       // 'single' | 'dispatch'
      store = null,                  // agentic-store instance or { get, set, delete, keys }
      maxSlots = 3,
      maxTurnBudget = 30,
      maxTokenBudget = 200000,
      turnQuantum = 10,
      dispatchMode = 'llm',        // 'code' | 'llm'
      planMode = true,               // inject plan_steps + done meta tools into workers
      onWorkerStart = null,        // (task, abort, opts) → Promise<result>
    } = opts

    if (!ai) throw new Error('ai instance is required')

    // --- Single strategy: direct LLM loop ---

    if (strategy === 'single') {
      const messages = []

      return {
        async chat(input, chatOpts = {}) {
          messages.push({ role: 'user', content: input })

          const sys = systemPrompt + (formatContext ? '\n\n' + formatContext() : '')
          const result = await ai.chat(messages, {
            system: sys || undefined,
            tools: chatOpts.tools || tools,
            ...chatOpts,
          })

          const answer = result.answer || result.content || result.text || ''
          messages.push({ role: 'assistant', content: answer })

          return { reply: answer, intents: [], usage: result.usage }
        },
        getState() { return { strategy: 'single', messages: messages.length } },
        getIntents() { return [] },
        cancel() {},
        on() { return () => {} },
        destroy() { messages.length = 0 },
      }
    }

    // --- Dispatch strategy: full intent system ---

    const _store = store || memoryStore()

    const intentState = createIntentState({ store: _store })
    const scheduler = createScheduler({
      store: _store, maxSlots, maxTurnBudget, maxTokenBudget, turnQuantum,
    })
    const dispatcher = createDispatcher({
      intentState, scheduler, ai,
      mode: dispatchMode, store: _store,
    })

    const _listeners = []
    const _talkerMessages = []

    function _emit(event, data) {
      for (const fn of _listeners) {
        try { fn(event, data) } catch {}
      }
    }

    // Wire up worker execution
    scheduler.setOnStart(async (task, abort, taskOpts) => {
      // Wait for all modules to restore before starting workers
      await Promise.all([intentState.ready, scheduler.ready, dispatcher.ready])

      const wid = taskOpts.workerId

      // Built-in meta tools for worker plan management
      const metaTools = planMode ? [
        {
          name: 'plan_steps',
          description: 'Set your execution plan. Call this first before doing any work.',
          parameters: {
            type: 'object',
            properties: { planned: { type: 'array', items: { type: 'string' }, description: 'List of step descriptions' } },
            required: ['planned'],
          },
          execute: ({ planned }) => {
            if (!Array.isArray(planned) || !planned.length) return { error: 'planned must be non-empty array of strings' }
            const steps = dispatcher.planSteps(wid, planned)
            return { success: true, steps: steps.map(s => s.text) }
          },
        },
        {
          name: 'done',
          description: 'Signal task completion with a summary.',
          parameters: {
            type: 'object',
            properties: { summary: { type: 'string', description: 'Brief summary of what was accomplished' } },
            required: ['summary'],
          },
          execute: ({ summary }) => {
            dispatcher.workerCompleted(wid, { summary })
            return { done: true, summary }
          },
        },
      ] : []

      if (onWorkerStart) {
        return onWorkerStart(task, abort, {
          ...taskOpts,
          tools: [...metaTools, ...tools],
          ...(metaTools.length > 0 ? { metaTools } : {}),
          ...(planMode ? { steps: () => dispatcher.getSteps(wid) } : {}),
          beforeTurn: () => dispatcher.beforeTurn(wid),
          afterTurn: (result) => dispatcher.afterTurn(wid, result),
        })
      }
      // Default: no-op, caller must provide onWorkerStart
      throw new Error('onWorkerStart not provided — cannot execute worker')
    })

    // Forward events
    dispatcher.on((event, data) => _emit(`dispatcher.${event}`, data))
    scheduler.on((event, data) => _emit(`scheduler.${event}`, data))

    // --- Talker ---

    async function chat(input, chatOpts = {}) {
      _talkerMessages.push({ role: 'user', content: input })

      // Build system prompt
      let sys = TALKER_SYSTEM
      if (systemPrompt) sys = systemPrompt + '\n\n' + TALKER_SYSTEM
      if (formatContext) sys += '\n\n' + formatContext()

      // Inject active intents context
      const intentContext = intentState.formatForTalker()
      if (intentContext) sys += '\n\n' + intentContext

      const result = await ai.chat(_talkerMessages, {
        system: sys,
        ...chatOpts,
      })

      const answer = result.answer || result.content || result.text || ''
      _talkerMessages.push({ role: 'assistant', content: answer })

      // Parse intent operations from response
      const intents = _parseIntents(answer)
      const createdIntents = []

      for (const op of intents) {
        if (op.action === 'create') {
          const intent = intentState.create(op.goal, {
            dependsOn: op.dependsOn || [],
            priority: op.priority ?? 1,
          })
          createdIntents.push(intent)
        } else if (op.action === 'update' && op.id) {
          intentState.update(op.id, { message: op.message, goal: op.goal })
        } else if (op.action === 'cancel' && op.id) {
          intentState.cancel(op.id)
        }
      }

      // Clean reply: remove intents block
      const cleanReply = answer.replace(/```intents[\s\S]*?```/g, '').trim()

      _emit('chat', { input, reply: cleanReply, intents: createdIntents })

      return {
        reply: cleanReply,
        intents: createdIntents,
        usage: result.usage,
      }
    }

    function _parseIntents(text) {
      const match = text.match(/```intents\s*([\s\S]*?)```/)
      if (!match) return []
      try {
        return JSON.parse(match[1])
      } catch {
        return []
      }
    }

    // --- Public API ---

    function createIntent(goal, options = {}) {
      return intentState.create(goal, options)
    }

    function cancelIntent(id) {
      return intentState.cancel(id)
    }

    function updateIntent(id, changes) {
      return intentState.update(id, changes)
    }

    function completeWorker(workerId, result) {
      dispatcher.workerCompleted(workerId, result)
    }

    function failWorker(workerId, error) {
      dispatcher.workerFailed(workerId, error)
    }

    function afterTurn(workerId, turnResult) {
      return dispatcher.afterTurn(workerId, turnResult)
    }

    function beforeTurn(workerId) {
      return dispatcher.beforeTurn(workerId)
    }

    function getState() {
      return {
        strategy: 'dispatch',
        intents: intentState.getAll(),
        workers: dispatcher.getWorkers(),
        suspended: dispatcher.getSuspended(),
        scheduler: scheduler.getState(),
        decisionLog: dispatcher.getDecisionLog(),
      }
    }

    function getIntents() {
      return intentState.getAll()
    }

    function on(fn) {
      _listeners.push(fn)
      return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
    }

    function destroy() {
      intentState.reset()
      dispatcher.reset()
      scheduler.reset()
      _talkerMessages.length = 0
      _listeners.length = 0
    }

    return {
      // High-level
      chat,
      createIntent,
      cancelIntent,
      updateIntent,

      // Worker lifecycle
      completeWorker,
      failWorker,
      resumeWorker: (workerId) => dispatcher.resumeWorker(workerId),
      getSuspended: () => dispatcher.getSuspended(),
      beforeTurn,
      afterTurn,

      // Worker plan
      planSteps: (workerId, planned) => dispatcher.planSteps(workerId, planned),
      getSteps: (workerId) => dispatcher.getSteps(workerId),
      advanceStep: (workerId, stepIndex) => dispatcher.advanceStep(workerId, stepIndex),

      // State
      getState,
      getIntents,

      // Events & lifecycle
      on,
      destroy,

      // Internals (for advanced use)
      _intentState: intentState,
      _scheduler: scheduler,
      _dispatcher: dispatcher,
    }
  }

  return { createConductor, memoryStore }
})
