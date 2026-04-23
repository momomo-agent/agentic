/**
 * dispatcher.js — Intent-driven Dispatcher
 *
 * Watches IntentState for changes, maps intents to scheduling decisions.
 * Supports code mode (deterministic) and LLM mode (semantic reasoning).
 */

export function createDispatcher(opts = {}) {
  const _intentState = opts.intentState
  const _scheduler = opts.scheduler
  let _ai = opts.ai || null
  let _dispatchMode = opts.mode || 'llm'

  const _workers = new Map()       // workerId → worker state
  const _workerMessages = new Map() // workerId → messages array (worker conversation history)
  const _intentWorker = new Map()
  const _workerIntent = new Map()
  const _decisionLog = []
  const MAX_LOG = 50
  const MAX_TURNS = opts.maxTurns || 30
  const STALL_THRESHOLD = opts.stallThreshold || 3

  let _nextWorkerId = 1
  const _store = opts.store || null
  const STORE_KEY = 'conductor/dispatcher'
  const _listeners = []

  function _emit(event, data) {
    for (const fn of _listeners) { try { fn(event, data) } catch {} }
  }

  function _logDecision(workerId, action, detail) {
    const entry = { ts: Date.now(), workerId, action, detail }
    _decisionLog.push(entry)
    if (_decisionLog.length > MAX_LOG) _decisionLog.shift()
  }

  function _save() {
    if (!_store) return
    try {
      const workers = {}
      for (const [id, w] of _workers) { workers[id] = { ...w }; delete workers[id].abort }
      _store.set(STORE_KEY, JSON.stringify({ workers, nextWorkerId: _nextWorkerId }))
    } catch {}
  }

  async function _restore() {
    if (!_store) return
    try {
      const raw = await _store.get(STORE_KEY)
      if (!raw) return
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      _nextWorkerId = data.nextWorkerId || 1
      if (data.workers) {
        for (const [id, w] of Object.entries(data.workers)) {
          if (w.status === 'running') w.status = 'suspended'
          _workers.set(Number(id) || id, w)
        }
      }
    } catch {}
  }

  function _handleIntentChange(type, intent) {
    if (_dispatchMode === 'llm') {
      _handleIntentLLM(type, intent).catch(() => { _handleIntentCode(type, intent) })
    } else {
      _handleIntentCode(type, intent)
    }
  }

  function _handleIntentCode(type, intent) {
    if (type === 'create') {
      const depsOk = (intent.dependsOn || []).every(depId => {
        const dep = _intentState.get(depId)
        return dep && dep.status === 'done'
      })
      if (depsOk) _spawnWorker(intent)
    }
    if (type === 'done') {
      const waiting = _intentState.getActive().filter(i => i.status === 'active' && i.dependsOn.includes(intent.id))
      for (const w of waiting) {
        const allDepsOk = w.dependsOn.every(depId => { const dep = _intentState.get(depId); return dep && dep.status === 'done' })
        if (allDepsOk) _spawnWorker(w)
      }
    }
    if (type === 'failed') {
      const dependents = _intentState.getActive().filter(i => i.dependsOn.includes(intent.id))
      for (const d of dependents) _intentState.fail(d.id)
    }
    if (type === 'cancelled') {
      const workerId = _intentWorker.get(intent.id)
      if (workerId != null) {
        _scheduler.abort(workerId)
        _workers.delete(workerId); _intentWorker.delete(intent.id); _workerIntent.delete(workerId)
        _save()
      }
    }
    if (type === 'update') {
      const workerId = _intentWorker.get(intent.id)
      if (workerId != null) {
        const w = _workers.get(workerId)
        if (w && intent.messages.length > 0) { w.steerInstruction = intent.messages[intent.messages.length - 1]; _save() }
      }
    }
  }

  async function _handleIntentLLM(type, intent) {
    if (!_ai) { _handleIntentCode(type, intent); return }
    if (type === 'create' || type === 'done' || type === 'update') {
      const state = _intentState.formatForTalker()
      const prompt = `You are a task dispatcher. Given the current intent state, decide what operations to perform.\n\nCurrent state:\n${state}\n\nEvent: ${type} on "${intent.goal}" (${intent.id})\n\nRespond with a JSON array of operations:\n- {"op":"spawn","intentId":"...","task":"...","priority":N}\n- {"op":"cancel","workerId":"..."}\n- {"op":"steer","workerId":"...","instruction":"..."}\n- {"op":"merge","intentIds":["..."],"mergedGoal":"..."}\n- [] for no action\n\nOnly JSON, no explanation.`
      try {
        const result = await _ai.chat([{ role: 'user', content: prompt }])
        const text = result.answer || result.content || result.text || ''
        const match = text.match(/\[[\s\S]*\]/)
        if (match) {
          const ops = JSON.parse(match[0])
          for (const op of ops) {
            if (op.op === 'spawn') { const target = _intentState.get(op.intentId); if (target) _spawnWorker(target, op.priority) }
            else if (op.op === 'cancel' && op.workerId) _scheduler.abort(op.workerId)
            else if (op.op === 'steer' && op.workerId) { const w = _workers.get(Number(op.workerId)); if (w) w.steerInstruction = op.instruction }
            else if (op.op === 'merge' && op.intentIds) { const [keep, ...rest] = op.intentIds; for (const rid of rest) _intentState.cancel(rid); if (op.mergedGoal) _intentState.update(keep, { goal: op.mergedGoal }) }
          }
        }
      } catch (e) { _handleIntentCode(type, intent) }
    } else {
      _handleIntentCode(type, intent)
    }
  }

  function _spawnWorker(intent, priority) {
    const workerId = _nextWorkerId++
    _intentState.running(intent.id)
    let task = intent.goal
    if (intent.dependsOn && intent.dependsOn.length > 0) {
      const depContext = intent.dependsOn.map(depId => {
        const dep = _intentState.get(depId)
        if (!dep) return null
        const parts = [`Completed: "${dep.goal}"`]
        if (dep.progress) parts.push(`Result: ${dep.progress}`)
        if (dep.artifacts.length > 0) parts.push(`Files: ${dep.artifacts.join(', ')}`)
        return parts.join(' | ')
      }).filter(Boolean)
      if (depContext.length > 0) task += `\n\nContext from dependencies:\n${depContext.join('\n')}`
    }
    const worker = {
      id: workerId, intentId: intent.id, task, status: 'running',
      steps: [], turnCount: 0, totalTokens: 0, toolCallCount: 0, stallCount: 0, createdAt: Date.now(),
    }
    _workers.set(workerId, worker)
    _intentWorker.set(intent.id, workerId)
    _workerIntent.set(workerId, intent.id)
    _save()
    _logDecision(workerId, 'spawn', `Intent ${intent.id}: ${intent.goal.slice(0, 60)}`)
    _emit('spawn', { workerId, intentId: intent.id, task, priority: priority ?? intent.priority })
    _scheduler.enqueue(task, priority ?? intent.priority, [], { workerId })
  }

  function beforeTurn(workerId) {
    const w = _workers.get(workerId)
    if (!w) return { action: 'continue' }
    w.turnCount = (w.turnCount || 0) + 1
    if (w.turnCount > MAX_TURNS) { _logDecision(workerId, 'abort', `Max turns (${MAX_TURNS}) exceeded`); return { action: 'abort', reason: `Maximum turns (${MAX_TURNS}) reached` } }
    if (w.steerInstruction) { const instruction = w.steerInstruction; w.steerInstruction = null; _save(); return { action: 'steer', instruction } }
    return { action: 'continue' }
  }

  function afterTurn(workerId, turnResult = {}) {
    const w = _workers.get(workerId)
    if (!w) return { action: 'continue' }
    const turnTokens = turnResult.usage ? (turnResult.usage.input_tokens || 0) + (turnResult.usage.output_tokens || 0) : (turnResult.tokens || 0)
    if (turnTokens) w.totalTokens = (w.totalTokens || 0) + turnTokens
    if (turnResult.toolCalls) w.toolCallCount = (w.toolCallCount || 0) + turnResult.toolCalls.length
    // Store worker messages (keep last 20 for shared context)
    if (turnResult.messages) {
      _workerMessages.set(workerId, turnResult.messages.slice(-20))
    }
    // Track last tool name for quick status
    if (turnResult.toolCalls?.length > 0) {
      w.lastTool = turnResult.toolCalls[turnResult.toolCalls.length - 1].name
    }
    if (w.steps.length > 0 && turnResult.toolCalls?.length > 0) {
      const META = new Set(['plan_steps', 'done', 'update_progress'])
      const realCalls = turnResult.toolCalls.filter(tc => !META.has(tc.name))
      if (realCalls.length > 0) { const nextPending = w.steps.findIndex(s => s.status !== 'done'); if (nextPending >= 0) w.steps[nextPending].status = 'done' }
    }
    if (turnResult.noProgress) { w.stallCount = (w.stallCount || 0) + 1; if (w.stallCount >= STALL_THRESHOLD) _logDecision(workerId, 'stall', `Stalled ${w.stallCount} turns`) }
    else w.stallCount = 0
    _save()
    const intentId = _workerIntent.get(workerId)
    if (intentId) {
      const changes = {}
      if (w.steps.length > 0) { const done = w.steps.filter(s => s.status === 'done').length; changes.progress = `${done}/${w.steps.length} steps` }
      if (turnResult.progress) changes.progress = turnResult.progress
      if (turnResult.artifacts?.length > 0) changes.artifacts = turnResult.artifacts
      if (changes.progress || changes.artifacts) _intentState.update(intentId, changes)
    }
    const decision = _scheduler.turnCompleted(workerId, { tokens: turnTokens })
    if (decision.action === 'suspend') { w.status = 'suspended'; _logDecision(workerId, 'suspend', decision.reason); _save(); return { action: 'suspend', reason: decision.reason, final: !!decision.final } }
    return { action: 'continue' }
  }

  function workerCompleted(workerId, result = {}) {
    const intentId = _workerIntent.get(workerId)
    // Preserve final messages before cleanup
    const finalMessages = _workerMessages.get(workerId) || []
    if (intentId) { if (result.summary) _intentState.update(intentId, { progress: result.summary }); _intentState.done(intentId) }
    _workers.delete(workerId); _workerMessages.delete(workerId); _intentWorker.delete(intentId); _workerIntent.delete(workerId)
    _logDecision(workerId, 'done', result.summary || 'completed')
    _emit('done', { workerId, intentId, result, messages: finalMessages })
    _save()
    _scheduler.abort(workerId)
    _autoResumeSuspended()
  }

  function workerFailed(workerId, error) {
    const intentId = _workerIntent.get(workerId)
    if (intentId) _intentState.fail(intentId)
    _workers.delete(workerId); _workerMessages.delete(workerId); _intentWorker.delete(intentId); _workerIntent.delete(workerId)
    _logDecision(workerId, 'fail', error || 'unknown error')
    _emit('fail', { workerId, intentId, error })
    _save()
    _scheduler.abort(workerId)
    _autoResumeSuspended()
  }

  function _autoResumeSuspended() {
    const suspended = _scheduler.getSuspended()
    for (const s of suspended) _scheduler.resumeWorker(s.workerId || s.id)
  }

  function resumeWorker(workerId) {
    const w = _workers.get(workerId)
    if (!w || w.status !== 'suspended') return false
    w.status = 'running'; _save()
    _logDecision(workerId, 'resume', `Resumed worker ${workerId}`)
    _emit('resume', { workerId })
    return _scheduler.resumeWorker(workerId)
  }

  function getSuspended() { return _scheduler.getSuspended() }
  function getWorker(id) { return _workers.has(id) ? { ..._workers.get(id) } : null }
  function getWorkers() { return Array.from(_workers.values()).map(w => ({ ...w })) }
  function getWorkerMessages(workerId) { return _workerMessages.get(workerId) || [] }
  function getDecisionLog() { return [..._decisionLog] }

  /**
   * Format worker context for Talker — includes conversation history.
   * Talker sees what Workers have done: tool calls, results, progress.
   */
  function formatWorkerContext(opts = {}) {
    const maxMessages = opts.maxMessages || 10
    const maxChars = opts.maxChars || 500
    const parts = []
    for (const [wid, w] of _workers) {
      if (w.status !== 'running' && w.status !== 'suspended') continue
      const msgs = _workerMessages.get(wid) || []
      if (msgs.length === 0) {
        parts.push(`Worker #${wid} "${w.task.slice(0, 50)}": ${w.status}, turn ${w.turnCount || 0}${w.lastTool ? ', last tool: ' + w.lastTool : ''}`)
        continue
      }
      const recent = msgs.slice(-maxMessages)
      const formatted = recent.map(m => {
        const role = m.role === 'assistant' ? 'Worker' : m.role === 'tool' ? 'ToolResult' : 'System'
        const limit = m.role === 'tool' ? maxChars : Math.floor(maxChars * 0.6)
        const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
        const trimmed = content.length > limit ? content.slice(0, limit) + '...' : content
        return `  [${role}] ${trimmed}`
      }).join('\n')
      parts.push(`Worker #${wid} "${w.task.slice(0, 50)}" (turn ${w.turnCount || 0}):\n${formatted}`)
    }
    return parts.length > 0 ? parts.join('\n\n') : ''
  }

  function planSteps(workerId, planned) {
    const w = _workers.get(workerId)
    if (!w) return null
    w.steps = planned.map(text => ({ text, status: 'pending' }))
    _save(); _emit('plan', { workerId, steps: w.steps })
    return w.steps.map(s => ({ ...s }))
  }

  function getSteps(workerId) { const w = _workers.get(workerId); return w ? w.steps.map(s => ({ ...s })) : [] }

  function advanceStep(workerId, stepIndex) {
    const w = _workers.get(workerId)
    if (!w || !w.steps[stepIndex]) return false
    w.steps[stepIndex].status = 'done'; _save()
    return true
  }

  function setMode(mode) { _dispatchMode = mode }
  function on(fn) { _listeners.push(fn); return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) } }

  function reset() {
    _workers.clear(); _workerMessages.clear(); _intentWorker.clear(); _workerIntent.clear()
    _decisionLog.length = 0; _nextWorkerId = 1; _listeners.length = 0
  }

  const _ready = _restore()
  _intentState.onChange(_handleIntentChange)

  return {
    beforeTurn, afterTurn, workerCompleted, workerFailed,
    resumeWorker, getSuspended, planSteps, getSteps, advanceStep,
    getWorker, getWorkers, getWorkerMessages, getDecisionLog,
    formatWorkerContext, setMode, on, reset, ready: _ready,
  }
}
