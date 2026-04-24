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

const TALKER_SYSTEM_PARSE = `You are a task-aware AI assistant. When the user asks you to do things, you can:
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

const TALKER_SYSTEM_TOOLS = `You are a task-aware AI assistant. When the user asks you to do things, you can:
1. Reply directly for simple questions
2. Use the intent tools to dispatch background work

Rules:
- Simple questions → just answer, no tool calls
- Tasks needing tools/time → call create_intent for each task
- Sequential tasks → use dependsOn with the ID of the prerequisite intent
- You may call multiple intent tools in a single turn
- Always include a natural language reply alongside any tool calls`

const INTENT_TOOLS = [
  {
    name: 'create_intent',
    description: 'Create a background task intent. Returns the created intent with its ID.',
    parameters: {
      type: 'object',
      properties: {
        goal: { type: 'string', description: 'What the worker should accomplish' },
        dependsOn: { type: 'array', items: { type: 'string' }, description: 'IDs of intents that must complete first' },
        priority: { type: 'number', description: 'Priority (1=normal, higher=more urgent)' },
      },
      required: ['goal'],
    },
  },
  {
    name: 'update_intent',
    description: 'Send a message or update the goal of an existing intent.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Intent ID to update' },
        message: { type: 'string', description: 'Message to send to the worker' },
        goal: { type: 'string', description: 'Updated goal' },
      },
      required: ['id'],
    },
  },
  {
    name: 'cancel_intent',
    description: 'Cancel an active intent.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Intent ID to cancel' },
      },
      required: ['id'],
    },
  },
]

function buildCapabilityList(tools) {
  if (!tools || tools.length === 0) return ''
  const lines = tools.map(t => `- ${t.name}: ${t.description || '(no description)'}`)
  return `\n## Your Capabilities\nYou can do these things (via background workers):\n${lines.join('\n')}`
}

export function createConductor(opts = {}) {
  const {
    ai, tools = [], systemPrompt = '', formatContext = null,
    strategy = 'dispatch', store = null, maxSlots = 3,
    maxTurnBudget = 30, maxTokenBudget = 200000, turnQuantum = 10,
    dispatchMode = 'llm', planMode = true, onWorkerStart = null,
    personality = '', talkerDirectives = '', workerDirectives = '',
    intentMode = 'parse', // 'parse' = text block parsing, 'tools' = tool calling
  } = opts

  if (!ai) throw new Error('ai instance is required')

  // --- Single strategy ---
  if (strategy === 'single') {
    const messages = []
    return {
      async* chat(input, chatOpts = {}) {
        messages.push({ role: 'user', content: input })
        const sys = systemPrompt + (formatContext ? '\n\n' + formatContext() : '')
        const callOpts = { system: sys || undefined, tools: chatOpts.tools || tools, ...chatOpts }
        let answer = ''
        for await (const chunk of ai.chat(messages, callOpts)) {
          if (chunk.type === 'text_delta' || chunk.type === 'text') {
            answer += chunk.text || ''
            yield { type: 'text', text: chunk.text || '' }
          } else if (chunk.type === 'done') {
            answer = chunk.answer || answer
            yield { type: 'done', reply: answer, intents: [], usage: chunk.usage }
          } else {
            yield chunk
          }
        }
        messages.push({ role: 'assistant', content: answer })
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

  async function* chat(input, chatOpts = {}) {
    _talkerMessages.push({ role: 'user', content: input })

    // Build Talker system prompt
    let sys = ''
    if (personality) sys += personality + '\n\n'
    if (systemPrompt) sys += systemPrompt + '\n\n'
    sys += talkerDirectives || (intentMode === 'tools' ? TALKER_SYSTEM_TOOLS : TALKER_SYSTEM_PARSE)
    sys += buildCapabilityList(tools)
    if (formatContext) sys += '\n\n' + formatContext()
    const intentContext = intentState.formatForTalker({ includeSettled: true })
    if (intentContext) sys += '\n\n' + intentContext
    const workerContext = dispatcher.formatWorkerContext()
    if (workerContext) sys += '\n\n## Worker Activity\n' + workerContext

    // Add execute functions to INTENT_TOOLS so askFn can handle them
    const executableIntentTools = INTENT_TOOLS.map(t => {
      if (t.name === 'create_intent') return { ...t, execute: (args) => {
        const intent = intentState.create(args.goal, { dependsOn: args.dependsOn || [], priority: args.priority ?? 1 })
        return { created: true, intentId: intent.id, goal: intent.goal }
      }}
      if (t.name === 'update_intent') return { ...t, execute: (args) => {
        intentState.update(args.id, { message: args.message, goal: args.goal })
        return { updated: true, id: args.id }
      }}
      if (t.name === 'cancel_intent') return { ...t, execute: (args) => {
        intentState.cancel(args.id)
        return { cancelled: true, id: args.id }
      }}
      return t
    })

    const chatTools = intentMode === 'tools' ? [...executableIntentTools, ...(chatOpts.tools || [])] : chatOpts.tools
    const callOpts = { system: sys, ...chatOpts }
    if (chatTools) callOpts.tools = chatTools

    let answer = ''
    let toolCalls = []
    let usage

    // Unified: ai.chat() always returns async generator (stream default true)
    for await (const chunk of ai.chat(_talkerMessages, callOpts)) {
      if ((chunk.type === 'text_delta' || chunk.type === 'text') && chunk.text) {
        answer += chunk.text
        yield { type: 'text', text: chunk.text }
      } else if (chunk.type === 'tool_use') {
        toolCalls.push(chunk.tool || { id: chunk.id, name: chunk.name, input: chunk.input })
        yield chunk
      } else if (chunk.type === 'tool_result') {
        yield chunk
      } else if (chunk.type === 'done') {
        answer = chunk.answer || answer
        usage = chunk.usage
        // Also collect tool_calls from done event (non-streaming path)
        if (chunk.tool_calls?.length) {
          for (const tc of chunk.tool_calls) {
            if (!toolCalls.some(t => t.id === tc.id)) toolCalls.push(tc)
          }
        }
      } else {
        yield chunk
      }
    }

    // Process intents
    const createdIntents = []
    let cleanReply = answer

    if (intentMode === 'tools') {
      for (const tc of toolCalls) {
        const args = tc.input || tc.arguments || {}
        if (tc.name === 'create_intent') {
          // Check if intent was already created by execute function
          const existing = intentState.getAll().find(i => i.goal === args.goal)
          if (existing) {
            createdIntents.push(existing)
          } else {
            // Fallback: create intent here (e.g. mock ai that doesn't call execute)
            const intent = intentState.create(args.goal, { dependsOn: args.dependsOn || [], priority: args.priority ?? 1 })
            createdIntents.push(intent)
          }
        } else if (tc.name === 'update_intent') {
          // update is idempotent, safe to call again
          intentState.update(args.id, { message: args.message, goal: args.goal })
        } else if (tc.name === 'cancel_intent') {
          intentState.cancel(args.id)
        }
      }
      if (toolCalls.length > 0) {
        _talkerMessages.push({ role: 'assistant', content: answer, tool_calls: toolCalls })
        for (const tc of toolCalls) {
          const args = tc.input || tc.arguments || {}
          let result = '{}'
          if (tc.name === 'create_intent') {
            const intent = createdIntents.find(i => i.goal === args.goal)
            result = JSON.stringify({ created: true, intentId: intent?.id, goal: args.goal })
          } else if (tc.name === 'update_intent') result = JSON.stringify({ updated: true, id: args.id })
          else if (tc.name === 'cancel_intent') result = JSON.stringify({ cancelled: true, id: args.id })
          _talkerMessages.push({ role: 'tool', tool_call_id: tc.id, content: result })
        }
      } else {
        _talkerMessages.push({ role: 'assistant', content: answer })
      }
    } else {
      _talkerMessages.push({ role: 'assistant', content: answer })
      const intents = _parseIntents(answer)
      for (const op of intents) {
        if (op.action === 'create') createdIntents.push(intentState.create(op.goal, { dependsOn: op.dependsOn || [], priority: op.priority ?? 1 }))
        else if (op.action === 'update' && op.id) intentState.update(op.id, { message: op.message, goal: op.goal })
        else if (op.action === 'cancel' && op.id) intentState.cancel(op.id)
      }
      cleanReply = answer.replace(/```intents[\s\S]*?```/g, '').trim()
    }

    _emit('chat', { input, reply: cleanReply, intents: createdIntents })
    yield { type: 'done', reply: cleanReply, intents: createdIntents, usage }
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
    getWorkerContext: (wid) => wid != null ? dispatcher.getWorkerMessages(wid) : dispatcher.formatWorkerContext(),
    buildWorkerSystem: () => {
      let sys = ''
      if (personality) sys += personality + '\n\n'
      sys += workerDirectives || 'You are the execution engine. Execute the given task using tools.\nCRITICAL: You MUST use tools to complete tasks. NEVER answer with just text.'
      return sys
    },
    getState, getIntents: () => intentState.getAll(), on, destroy,
    _intentState: intentState, _scheduler: scheduler, _dispatcher: dispatcher,
  }
}
