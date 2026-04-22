/**
 * scheduler.js — Task scheduler with parallel slots, turn-aware scheduling
 *
 * Manages slot allocation, priority queuing, budget enforcement,
 * preemption, and round-robin fairness.
 */

export function createScheduler(opts = {}) {
  const MAX_SLOTS = opts.maxSlots || 3
  const MAX_RETRIES = opts.maxRetries ?? 2
  const RETRY_BASE_MS = opts.retryBaseMs || 1000
  const MAX_TURN_BUDGET = opts.maxTurnBudget || 30
  const MAX_TOKEN_BUDGET = opts.maxTokenBudget || 200000
  const TURN_QUANTUM = opts.turnQuantum || 10

  let nextTaskId = 1
  const pending = []
  const slots = new Map()
  const completed = []
  const _listeners = []
  const _store = opts.store || null
  const STORE_KEY = 'conductor/scheduler'

  function _emit(event, data) {
    for (const fn of _listeners) { try { fn(event, data) } catch {} }
  }

  function _save() {
    if (!_store) return
    try {
      _store.set(STORE_KEY, JSON.stringify({
        nextTaskId,
        pending: pending.map(t => ({
          id: t.id, task: t.task, priority: t.priority,
          dependsOn: t.dependsOn, status: t.status,
          retryCount: t.retryCount || 0, meta: t.meta || {},
          turnCount: t.turnCount || 0, totalTokens: t.totalTokens || 0,
        })),
        slots: Array.from(slots.entries()).map(([idx, s]) => ({
          slotIndex: idx, id: s.id, task: s.task,
          priority: s.priority, status: s.status, meta: s.meta || {},
          turnCount: s.turnCount || 0, totalTokens: s.totalTokens || 0,
        })),
        completed: completed.slice(-20).map(t => ({ id: t.id, task: t.task, status: t.status })),
      }))
    } catch {}
  }

  async function _restore() {
    if (!_store) return
    try {
      const raw = await _store.get(STORE_KEY)
      if (!raw) return
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      nextTaskId = data.nextTaskId || 1
      if (data.completed) completed.push(...data.completed)
      if (data.pending) {
        for (const t of data.pending) { if (t.status === 'pending') pending.push(t) }
      }
      if (data.slots) {
        for (const s of data.slots) {
          if (s.status === 'running') {
            pending.push({
              id: s.id, task: s.task, priority: s.priority,
              dependsOn: [], status: 'pending', retryCount: 0,
              meta: s.meta || {}, turnCount: s.turnCount || 0, totalTokens: s.totalTokens || 0,
            })
          }
        }
      }
      pending.sort((a, b) => a.priority - b.priority)
      if (pending.length > 0) schedule()
    } catch {}
  }

  function enqueue(taskDescription, priority = 1, dependsOn = [], meta = {}) {
    const norm = taskDescription.trim().toLowerCase()
    const isDup = pending.some(t => t.task.trim().toLowerCase() === norm && t.status === 'pending')
      || Array.from(slots.values()).some(s => s.task.trim().toLowerCase() === norm && s.status === 'running')
    if (isDup) return -1
    const id = nextTaskId++
    const entry = {
      id, task: taskDescription, priority, dependsOn,
      status: 'pending', retryCount: 0, meta, turnCount: 0, totalTokens: 0,
    }
    pending.push(entry)
    pending.sort((a, b) => a.priority - b.priority)
    _emit('enqueued', { id, task: taskDescription, priority })
    _save()
    schedule()
    return id
  }

  function schedule() {
    for (let i = 0; i < MAX_SLOTS; i++) {
      if (slots.has(i)) continue
      const ready = findReady()
      if (!ready) break
      startInSlot(i, ready)
    }
  }

  function findReady() {
    for (let i = 0; i < pending.length; i++) {
      const t = pending[i]
      if (t.status !== 'pending') continue
      const depsOk = t.dependsOn.every(depId => completed.some(c => c.id === depId && c.status === 'done'))
      if (depsOk) { pending.splice(i, 1); return t }
    }
    return null
  }

  let _onStart = null

  function startInSlot(slotIndex, entry) {
    const abortController = typeof AbortController !== 'undefined'
      ? new AbortController() : { signal: { aborted: false }, abort() { this.signal.aborted = true } }
    entry.status = 'running'
    entry.abort = abortController
    entry.schedulerSlot = slotIndex
    entry.turnCount = entry.turnCount || 0
    entry.totalTokens = entry.totalTokens || 0
    slots.set(slotIndex, entry)
    _save()
    _emit('started', { id: entry.id, task: entry.task, slot: slotIndex })
    if (_onStart) {
      _onStart(entry.task, abortController, {
        taskId: entry.id, workerId: entry.meta?.workerId, priority: entry.priority,
        resume: entry.meta?.resume || false, turnCount: entry.turnCount, totalTokens: entry.totalTokens,
      })
        .then(result => finishSlot(slotIndex, entry, 'done', result))
        .catch(err => {
          if (abortController.signal.aborted) finishSlot(slotIndex, entry, 'aborted')
          else retryOrFail(slotIndex, entry, err)
        })
    }
  }

  function finishSlot(slotIndex, entry, status, result) {
    slots.delete(slotIndex)
    entry.status = status
    completed.push({ id: entry.id, task: entry.task, status, result })
    if (completed.length > 50) completed.shift()
    _emit('finished', { id: entry.id, task: entry.task, status, result })
    _save()
    schedule()
  }

  function retryOrFail(slotIndex, entry, error) {
    entry.retryCount = (entry.retryCount || 0) + 1
    if (entry.retryCount <= MAX_RETRIES) {
      slots.delete(slotIndex)
      entry.status = 'pending'
      pending.push(entry)
      _emit('retry', { id: entry.id, attempt: entry.retryCount })
      _save()
      setTimeout(() => schedule(), RETRY_BASE_MS * Math.pow(2, entry.retryCount - 1))
    } else {
      finishSlot(slotIndex, entry, 'error', { error: error?.message || String(error) })
    }
  }

  function turnCompleted(workerId, turnInfo = {}) {
    let slotIndex = null, entry = null
    for (const [idx, s] of slots) {
      if (s.meta?.workerId === workerId || s.id === workerId) { slotIndex = idx; entry = s; break }
    }
    if (!entry) return { action: 'continue' }
    entry.turnCount = (entry.turnCount || 0) + 1
    entry.totalTokens = (entry.totalTokens || 0) + (turnInfo.tokens || 0)
    _save()
    if (entry.totalTokens >= MAX_TOKEN_BUDGET) {
      _emit('budget', { id: entry.id, type: 'tokens', used: entry.totalTokens, limit: MAX_TOKEN_BUDGET })
      return { action: 'suspend', reason: `Token budget exceeded (${entry.totalTokens})`, final: true }
    }
    if (entry.turnCount >= MAX_TURN_BUDGET) {
      _emit('budget', { id: entry.id, type: 'turns', used: entry.turnCount, limit: MAX_TURN_BUDGET })
      return { action: 'suspend', reason: `Turn budget exceeded (${entry.turnCount})`, final: true }
    }
    const hasHigherPriority = pending.some(t => t.status === 'pending' && t.priority < entry.priority)
    if (hasHigherPriority && entry.turnCount >= TURN_QUANTUM) {
      _suspendAndRequeue(slotIndex, entry, 'Higher priority task waiting')
      return { action: 'suspend', reason: 'Higher priority task waiting' }
    }
    const waitingCount = pending.filter(t => t.status === 'pending').length
    if (waitingCount > 0 && entry.turnCount > 0 && entry.turnCount % TURN_QUANTUM === 0) {
      _suspendAndRequeue(slotIndex, entry, `Quantum expired (${TURN_QUANTUM} turns)`)
      return { action: 'suspend', reason: `Quantum expired (${TURN_QUANTUM} turns)` }
    }
    return { action: 'continue' }
  }

  function _suspendAndRequeue(slotIndex, entry, reason) {
    slots.delete(slotIndex)
    entry.status = 'suspended'
    entry.meta = entry.meta || {}
    entry.meta.resume = true
    entry.meta.suspendedAt = Date.now()
    entry.meta.suspendReason = reason
    pending.unshift(entry)
    _emit('suspended', { id: entry.id, workerId: entry.meta?.workerId, reason })
    _save()
    schedule()
  }

  function resumeWorker(workerId) {
    const idx = pending.findIndex(t => t.status === 'suspended' && (t.meta?.workerId === workerId || t.id === workerId))
    if (idx < 0) return false
    pending[idx].status = 'pending'
    _save()
    schedule()
    return true
  }

  function getSuspended() {
    return pending.filter(t => t.status === 'suspended').map(t => ({
      id: t.id, task: t.task, workerId: t.meta?.workerId,
      turnCount: t.turnCount, totalTokens: t.totalTokens,
      suspendedAt: t.meta?.suspendedAt, reason: t.meta?.suspendReason,
    }))
  }

  function getSlotStats(workerId) {
    for (const [idx, s] of slots) {
      if (s.meta?.workerId === workerId || s.id === workerId) {
        return { slotIndex: idx, turnCount: s.turnCount || 0, totalTokens: s.totalTokens || 0, priority: s.priority }
      }
    }
    return null
  }

  function steer(taskId, instruction) {
    for (const [, entry] of slots) { if (entry.id === taskId) { entry.steerInstruction = instruction; return true } }
    return false
  }

  function abort(workerId) {
    for (const [idx, entry] of slots) {
      if (entry.meta?.workerId === workerId || entry.id === workerId) {
        if (entry.abort) entry.abort.abort()
        finishSlot(idx, entry, 'aborted')
        return true
      }
    }
    const pi = pending.findIndex(t => t.meta?.workerId === workerId || t.id === workerId)
    if (pi >= 0) { pending.splice(pi, 1); _save(); return true }
    return false
  }

  function getState() {
    return {
      pending: pending.map(t => ({ id: t.id, task: t.task, priority: t.priority, status: t.status, turnCount: t.turnCount, totalTokens: t.totalTokens })),
      slots: Array.from(slots.entries()).map(([idx, s]) => ({ slot: idx, id: s.id, task: s.task, priority: s.priority, turnCount: s.turnCount, totalTokens: s.totalTokens })),
      completed: completed.slice(-10),
    }
  }

  function isIdle() { return slots.size === 0 && pending.length === 0 }
  function on(fn) { _listeners.push(fn); return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) } }
  function setOnStart(fn) { _onStart = fn }

  function reset() {
    for (const [, entry] of slots) { if (entry.abort) entry.abort.abort() }
    slots.clear(); pending.length = 0; completed.length = 0
    nextTaskId = 1; _listeners.length = 0; _onStart = null
  }

  const _ready = _restore()

  return {
    enqueue, schedule, steer, abort,
    turnCompleted, resumeWorker, getSuspended, getSlotStats,
    getState, isIdle, on, setOnStart, reset,
    ready: _ready, MAX_SLOTS, MAX_TURN_BUDGET, MAX_TOKEN_BUDGET, TURN_QUANTUM,
  }
}
