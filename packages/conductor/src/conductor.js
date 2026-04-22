/**
 * agentic-conductor — Multi-intent dispatch engine
 *
 * Facade that wires IntentState + Dispatcher + Scheduler into a single API.
 *
 * Usage:
 *   import { createConductor } from 'agentic-conductor'
 *   const conductor = createConductor({ ai, tools, system })
 *   const result = await conductor.chat("Search AI news and write a report")
 *
 * Strategy:
 *   'single'   — direct LLM loop, no intent splitting
 *   'dispatch'  — Talker splits intents, Dispatcher + Scheduler manage workers
 */

import { createIntentState } from './intent-state.js'
import { createScheduler } from './scheduler.js'
import { createDispatcher } from './dispatcher.js'

export function memoryStore() {
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

export function createConductor(opts = {}) {
  const {
    ai, tools = [], systemPrompt = '', formatContext = null,
    strategy = 'dispatch', store = null, maxSlots = 3,
    maxTurnBudget = 30, maxTokenBudget = 200000, turnQuantum = 10,
    dispatchMode = 'llm', planMode = true, onWorkerStart = null,
  } = opts

  if (!ai) throw new Error('ai instance is required')

  // --- Single strategy ---
  if (strategy === 'single') {
    const messages = []
    return {
      async chat(input, chatOpts = {}) {
        messages.push({ role: 'user', content: input })
        const sys = systemPrompt + (formatContext ? '\n\n' + formatContext() : '')
        const result = await ai.chat(messages, { system: sys || undefined, tools: chatOpts.tools || tools, ...chatOpts })
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

  // --- Dispatch strategy ---
  const _store = store || memoryStore()
  const intentState = createIntentState({ store: _store })
  const scheduler = createScheduler({ store: _store, maxSlots, maxTurnBudget, maxTokenBudget, turnQuantum })
  const dispatcher = createDispatcher({ intentState, scheduler, ai, mode: dispatchMode, store: _store })

  const _listeners = []
  const _talkerMessages = []

  function _emit(event, data) {
    for (const fn of _listeners) { try { fn(event, data) } catch {} }
  }

  scheduler.setOnStart(async (task, abort, taskOpts) => {
    await Promise.all([intentState.ready, scheduler.ready, dispatcher.ready])
    const wid = taskOpts.workerId
    const metaTools = planMode ? [
      {
        name: 'plan_steps',
        description: 'Set your execution plan. Call this first before doing any work.',
        parameters: { type: 'object', properties: { planned: { type: 'array', items: { type: 'string' }, description: 'List of step descriptions' } }, required: ['planned'] },
        execute: ({ planned }) => {
          if (!Array.isArray(planned) || !planned.length) return { error: 'planned must be non-empty array of strings' }
          const steps = dispatcher.planSteps(wid, planned)
          return { success: true, steps: steps.map(s => s.text) }
        },
      },
      {
        name: 'done',
        description: 'Signal task completion with a summary.',
        parameters: { type: 'object', properties: { summary: { type: 'string', description: 'Brief summary of what was accomplished' } }, required: ['summary'] },
        execute: ({ summary }) => { dispatcher.workerCompleted(wid, { summary }); return { done: true, summary } },
      },
    ] : []
    if (onWorkerStart) {
      return onWorkerStart(task, abort, {
        ...taskOpts, tools: [...metaTools, ...tools],
        ...(metaTools.length > 0 ? { metaTools } : {}),
        ...(planMode ? { steps: () => dispatcher.getSteps(wid) } : {}),
        beforeTurn: () => dispatcher.beforeTurn(wid),
        afterTurn: (result) => dispatcher.afterTurn(wid, result),
      })
    }
    throw new Error('onWorkerStart not provided — cannot execute worker')
  })

  dispatcher.on((event, data) => _emit(`dispatcher.${event}`, data))
  scheduler.on((event, data) => _emit(`scheduler.${event}`, data))

  async function chat(input, chatOpts = {}) {
    _talkerMessages.push({ role: 'user', content: input })
    let sys = TALKER_SYSTEM
    if (systemPrompt) sys = systemPrompt + '\n\n' + TALKER_SYSTEM
    if (formatContext) sys += '\n\n' + formatContext()
    const intentContext = intentState.formatForTalker()
    if (intentContext) sys += '\n\n' + intentContext
    const result = await ai.chat(_talkerMessages, { system: sys, ...chatOpts })
    const answer = result.answer || result.content || result.text || ''
    _talkerMessages.push({ role: 'assistant', content: answer })
    const intents = _parseIntents(answer)
    const createdIntents = []
    for (const op of intents) {
      if (op.action === 'create') createdIntents.push(intentState.create(op.goal, { dependsOn: op.dependsOn || [], priority: op.priority ?? 1 }))
      else if (op.action === 'update' && op.id) intentState.update(op.id, { message: op.message, goal: op.goal })
      else if (op.action === 'cancel' && op.id) intentState.cancel(op.id)
    }
    const cleanReply = answer.replace(/```intents[\s\S]*?```/g, '').trim()
    _emit('chat', { input, reply: cleanReply, intents: createdIntents })
    return { reply: cleanReply, intents: createdIntents, usage: result.usage }
  }

  function _parseIntents(text) {
    const match = text.match(/```intents\s*([\s\S]*?)```/)
    if (!match) return []
    try { return JSON.parse(match[1]) } catch { return [] }
  }

  function getState() {
    return {
      strategy: 'dispatch', intents: intentState.getAll(), workers: dispatcher.getWorkers(),
      suspended: dispatcher.getSuspended(), scheduler: scheduler.getState(), decisionLog: dispatcher.getDecisionLog(),
    }
  }

  function on(fn) { _listeners.push(fn); return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) } }

  function destroy() {
    intentState.reset(); dispatcher.reset(); scheduler.reset()
    _talkerMessages.length = 0; _listeners.length = 0
  }

  return {
    chat,
    createIntent: (goal, options) => intentState.create(goal, options),
    cancelIntent: (id) => intentState.cancel(id),
    updateIntent: (id, changes) => intentState.update(id, changes),
    completeWorker: (workerId, result) => dispatcher.workerCompleted(workerId, result),
    failWorker: (workerId, error) => dispatcher.workerFailed(workerId, error),
    resumeWorker: (workerId) => dispatcher.resumeWorker(workerId),
    getSuspended: () => dispatcher.getSuspended(),
    beforeTurn: (workerId) => dispatcher.beforeTurn(workerId),
    afterTurn: (workerId, turnResult) => dispatcher.afterTurn(workerId, turnResult),
    planSteps: (workerId, planned) => dispatcher.planSteps(workerId, planned),
    getSteps: (workerId) => dispatcher.getSteps(workerId),
    advanceStep: (workerId, stepIndex) => dispatcher.advanceStep(workerId, stepIndex),
    getState, getIntents: () => intentState.getAll(), on, destroy,
    _intentState: intentState, _scheduler: scheduler, _dispatcher: dispatcher,
  }
}
