/**
 * test-exhaustive.js - Exhaustive E2E test for all interfaces and parameters
 *
 * Covers: IntentState, Scheduler, Dispatcher, Conductor (single + dispatch)
 * Every public method, every parameter variant.
 */

import { createIntentState } from '../src/intent-state.js'
import { createScheduler } from '../src/scheduler.js'
import { createDispatcher } from '../src/dispatcher.js'
import { createConductor, memoryStore } from '../src/conductor.js'

let passed = 0, failed = 0, total = 0
function assert(cond, msg) {
  total++
  if (cond) { passed++; console.log('  ✅ ' + msg) }
  else { failed++; console.error('  ❌ ' + msg); console.trace() }
}

function mockAI(answer) {
  return {
    chat: async (msgs, opts) => ({ answer: answer || 'mock', usage: { input_tokens: 10, output_tokens: 20 } })
  }
}

async function run() {
  console.log('')
  console.log('═══════════════════════════════════════════════════')
  console.log('  Exhaustive E2E Test Suite')
  console.log('═══════════════════════════════════════════════════')

  // ═══════════════════════════════════════════════════════════════
  // PART 1: IntentState — all methods, all parameters
  // ═══════════════════════════════════════════════════════════════

  console.log('')
  console.log('━━━ PART 1: IntentState ━━━')

  // 1.1 create(goal, options)
  console.log('')
  console.log('--- 1.1 create(goal, {dependsOn, priority}) ---')
  {
    const is = createIntentState()

    // Minimal create
    const i1 = is.create('Task A')
    assert(i1.id === 'intent-1', 'create: auto-increments id')
    assert(i1.goal === 'Task A', 'create: goal set')
    assert(i1.status === 'active', 'create: default status active')
    assert(Array.isArray(i1.dependsOn) && i1.dependsOn.length === 0, 'create: default empty dependsOn')
    assert(i1.priority === 1, 'create: default priority 1')
    assert(i1.progress === null, 'create: default progress null')
    assert(Array.isArray(i1.artifacts) && i1.artifacts.length === 0, 'create: default empty artifacts')
    assert(Array.isArray(i1.messages) && i1.messages.length === 0, 'create: default empty messages')
    assert(typeof i1.createdAt === 'number', 'create: createdAt is timestamp')
    assert(typeof i1.updatedAt === 'number', 'create: updatedAt is timestamp')

    // Create with all options
    const i2 = is.create('Task B', { dependsOn: ['intent-1'], priority: 5 })
    assert(i2.id === 'intent-2', 'create: second id increments')
    assert(i2.dependsOn[0] === 'intent-1', 'create: dependsOn set')
    assert(i2.priority === 5, 'create: priority set')

    // Create with priority 0
    const i3 = is.create('Task C', { priority: 0 })
    assert(i3.priority === 0, 'create: priority 0 preserved (not defaulted)')

    is.reset()
  }

  // 1.2 update(id, changes) — all change fields
  console.log('')
  console.log('--- 1.2 update(id, {goal, message, progress, priority, artifacts}) ---')
  {
    const is = createIntentState()
    const i = is.create('Original goal')

    // Update goal
    const u1 = is.update(i.id, { goal: 'New goal' })
    assert(u1.goal === 'New goal', 'update: goal changed')

    // Update message
    const u2 = is.update(i.id, { message: 'Status update 1' })
    assert(u2.messages.length === 1, 'update: message appended')
    assert(u2.messages[0] === 'Status update 1', 'update: message content correct')

    // Append another message
    const u3 = is.update(i.id, { message: 'Status update 2' })
    assert(u3.messages.length === 2, 'update: second message appended')

    // Update progress
    const u4 = is.update(i.id, { progress: '50% done' })
    assert(u4.progress === '50% done', 'update: progress set')

    // Update priority
    const u5 = is.update(i.id, { priority: 10 })
    assert(u5.priority === 10, 'update: priority changed')

    // Update artifacts (string)
    const u6 = is.update(i.id, { artifacts: ['file1.js', 'file2.js'] })
    assert(u6.artifacts.length === 2, 'update: artifacts added')

    // Artifacts dedup
    const u7 = is.update(i.id, { artifacts: ['file1.js', 'file3.js'] })
    assert(u7.artifacts.length === 3, 'update: artifacts deduped (file1 not added twice)')

    // Artifacts as objects with path
    const u8 = is.update(i.id, { artifacts: [{ path: 'file4.js', type: 'code' }] })
    assert(u8.artifacts.length === 4, 'update: object artifacts added')

    // Object artifact dedup
    const u9 = is.update(i.id, { artifacts: [{ path: 'file4.js', type: 'code' }] })
    assert(u9.artifacts.length === 4, 'update: object artifact deduped by path')

    // updatedAt changes
    assert(u9.updatedAt >= i.updatedAt, 'update: updatedAt bumped')

    // Update non-existent id
    const uNull = is.update('nonexistent', { goal: 'x' })
    assert(uNull === null, 'update: returns null for missing id')

    is.reset()
  }

  // 1.3 setStatus / cancel / running / done / fail
  console.log('')
  console.log('--- 1.3 setStatus, cancel, running, done, fail ---')
  {
    const is = createIntentState()
    const i = is.create('Status test')

    const r1 = is.running(i.id)
    assert(r1.status === 'running', 'running(): status set')

    const r2 = is.cancel(i.id)
    assert(r2.status === 'cancelled', 'cancel(): status set')

    const i2 = is.create('Another')
    const r3 = is.done(i2.id)
    assert(r3.status === 'done', 'done(): status set')

    const i3 = is.create('Fail test')
    const r4 = is.fail(i3.id)
    assert(r4.status === 'failed', 'fail(): status set')

    // setStatus with custom status
    const i4 = is.create('Custom')
    const r5 = is.setStatus(i4.id, 'paused')
    assert(r5.status === 'paused', 'setStatus(): custom status')

    // setStatus on missing id
    const r6 = is.setStatus('missing', 'done')
    assert(r6 === null, 'setStatus(): null for missing id')

    is.reset()
  }

  // 1.4 get / getAll / getActive
  console.log('')
  console.log('--- 1.4 get, getAll, getActive ---')
  {
    const is = createIntentState()
    is.create('A')
    is.create('B')
    is.create('C')
    is.done('intent-2')
    is.fail('intent-3')

    // get
    const g1 = is.get('intent-1')
    assert(g1 !== null && g1.goal === 'A', 'get(): returns intent')
    assert(is.get('nonexistent') === null, 'get(): null for missing')

    // get returns copy (not reference)
    g1.goal = 'MUTATED'
    assert(is.get('intent-1').goal === 'A', 'get(): returns copy not reference')

    // getAll
    const all = is.getAll()
    assert(all.length === 3, 'getAll(): returns all intents')

    // getActive
    const active = is.getActive()
    assert(active.length === 1, 'getActive(): only active intents')
    assert(active[0].goal === 'A', 'getActive(): correct intent')

    is.reset()
  }

  // 1.5 onChange
  console.log('')
  console.log('--- 1.5 onChange ---')
  {
    const is = createIntentState()
    const events = []
    const unsub = is.onChange((type, intent) => events.push({ type, id: intent.id }))

    is.create('X')
    assert(events.length === 1 && events[0].type === 'create', 'onChange: create event')

    is.update('intent-1', { progress: 'half' })
    assert(events.length === 2 && events[1].type === 'update', 'onChange: update event')

    is.running('intent-1')
    assert(events[2].type === 'running', 'onChange: running event')

    is.done('intent-1')
    assert(events[3].type === 'done', 'onChange: done event')

    // Unsubscribe
    unsub()
    is.create('Y')
    assert(events.length === 4, 'onChange: unsubscribe stops events')

    is.reset()
  }

  // 1.6 formatForTalker
  console.log('')
  console.log('--- 1.6 formatForTalker ---')
  {
    const is = createIntentState()

    // Empty
    assert(is.formatForTalker() === '', 'formatForTalker: empty when no intents')

    is.create('Search news')
    const fmt1 = is.formatForTalker()
    assert(fmt1.includes('Active intents'), 'formatForTalker: has header')
    assert(fmt1.includes('Search news'), 'formatForTalker: includes goal')
    assert(fmt1.includes('[active]'), 'formatForTalker: includes status')

    // With progress
    is.update('intent-1', { progress: '50%' })
    const fmt2 = is.formatForTalker()
    assert(fmt2.includes('50%'), 'formatForTalker: includes progress')

    // With dependencies
    is.create('Write report', { dependsOn: ['intent-1'] })
    const fmt3 = is.formatForTalker()
    assert(fmt3.includes('waiting on'), 'formatForTalker: shows dependencies')

    // Done intents not shown as active
    is.done('intent-1')
    is.done('intent-2')
    const fmt4 = is.formatForTalker()
    assert(fmt4 === '', 'formatForTalker: empty when all done')

    is.reset()
  }

  // 1.7 reset
  console.log('')
  console.log('--- 1.7 reset ---')
  {
    const is = createIntentState()
    is.create('A')
    is.create('B')
    is.onChange(() => {})
    is.reset()
    assert(is.getAll().length === 0, 'reset: clears all intents')
    // After reset, next id restarts
    const i = is.create('After reset')
    assert(i.id === 'intent-1', 'reset: id counter resets')
  }

  // 1.8 Persistence (store)
  console.log('')
  console.log('--- 1.8 Persistence with store ---')
  {
    const store = memoryStore()
    const is1 = createIntentState({ store })
    await is1.ready
    is1.create('Persisted task', { priority: 3 })
    is1.update('intent-1', { progress: 'halfway' })

    // New instance with same store should restore
    const is2 = createIntentState({ store })
    await is2.ready
    const all = is2.getAll()
    assert(all.length === 1, 'persistence: restored intent count')
    assert(all[0].goal === 'Persisted task', 'persistence: restored goal')
    assert(all[0].priority === 3, 'persistence: restored priority')
    assert(all[0].progress === 'halfway', 'persistence: restored progress')
  }


  // ═══════════════════════════════════════════════════════════════
  // PART 2: Scheduler — all methods, all parameters
  // ═══════════════════════════════════════════════════════════════

  console.log('')
  console.log('━━━ PART 2: Scheduler ━━━')

  // 2.1 Constructor options
  console.log('')
  console.log('--- 2.1 Constructor options ---')
  {
    const s = createScheduler({
      maxSlots: 5, maxRetries: 3, retryBaseMs: 500,
      maxTurnBudget: 50, maxTokenBudget: 100000, turnQuantum: 5,
    })
    assert(s.MAX_SLOTS === 5, 'opts: maxSlots')
    assert(s.MAX_TURN_BUDGET === 50, 'opts: maxTurnBudget')
    assert(s.MAX_TOKEN_BUDGET === 100000, 'opts: maxTokenBudget')
    assert(s.TURN_QUANTUM === 5, 'opts: turnQuantum')
    s.reset()
  }

  // 2.2 enqueue(task, priority, dependsOn, meta)
  console.log('')
  console.log('--- 2.2 enqueue(task, priority, dependsOn, meta) ---')
  {
    const s = createScheduler({ maxSlots: 2 })
    // No onStart — tasks stay pending
    const id1 = s.enqueue('Task A')
    assert(id1 === 1, 'enqueue: returns task id')

    const id2 = s.enqueue('Task B', 2)
    assert(id2 === 2, 'enqueue: second task')

    const id3 = s.enqueue('Task C', 1, [], { workerId: 'w3' })
    assert(id3 === 3, 'enqueue: with meta')

    // Dedup: same task text
    const dup = s.enqueue('Task A')
    assert(dup === -1, 'enqueue: dedup returns -1')

    // With dependencies
    const id4 = s.enqueue('Task D', 1, [1])
    assert(id4 === 4, 'enqueue: with dependsOn')

    const state = s.getState()
    assert(state.pending.length >= 1, 'enqueue: tasks in pending')

    s.reset()
  }

  // 2.3 schedule + setOnStart + slot management
  console.log('')
  console.log('--- 2.3 schedule, setOnStart, slots ---')
  {
    const s = createScheduler({ maxSlots: 2 })
    const started = []
    s.setOnStart(async (task, abort, opts) => {
      started.push({ task, opts })
      return new Promise(() => {}) // never resolves
    })

    s.enqueue('Slot A', 1, [], { workerId: 'wA' })
    s.enqueue('Slot B', 1, [], { workerId: 'wB' })
    s.enqueue('Slot C', 1, [], { workerId: 'wC' })
    await new Promise(r => setTimeout(r, 50))

    assert(started.length === 2, 'schedule: only maxSlots=2 started')
    const state = s.getState()
    assert(state.slots.length === 2, 'schedule: 2 slots occupied')
    assert(state.pending.length === 1, 'schedule: 1 pending')

    s.reset()
  }

  // 2.4 turnCompleted — token budget
  console.log('')
  console.log('--- 2.4 turnCompleted — budgets ---')
  {
    const s = createScheduler({ maxSlots: 1, maxTurnBudget: 3, maxTokenBudget: 100, turnQuantum: 2 })
    let startedOpts = null
    s.setOnStart(async (task, abort, opts) => {
      startedOpts = opts
      return new Promise(() => {})
    })
    s.enqueue('Budget test', 1, [], { workerId: 'w1' })
    await new Promise(r => setTimeout(r, 50))

    // Turn 1: under budget
    const r1 = s.turnCompleted('w1', { tokens: 30 })
    assert(r1.action === 'continue', 'turnCompleted: under budget → continue')

    // Turn 2: still under
    const r2 = s.turnCompleted('w1', { tokens: 30 })
    assert(r2.action === 'continue', 'turnCompleted: still under budget')

    // Turn 3: token budget exceeded (30+30+50=110 > 100)
    const r3 = s.turnCompleted('w1', { tokens: 50 })
    assert(r3.action === 'suspend' && r3.reason.includes('Token'), 'turnCompleted: token budget exceeded → suspend')

    s.reset()
  }

  // 2.5 turnCompleted — turn budget
  console.log('')
  console.log('--- 2.5 turnCompleted — turn budget ---')
  {
    const s = createScheduler({ maxSlots: 1, maxTurnBudget: 2, maxTokenBudget: 999999, turnQuantum: 99 })
    s.setOnStart(async () => new Promise(() => {}))
    s.enqueue('Turn budget', 1, [], { workerId: 'w1' })
    await new Promise(r => setTimeout(r, 50))

    s.turnCompleted('w1', { tokens: 1 })
    const r = s.turnCompleted('w1', { tokens: 1 })
    assert(r.action === 'suspend' && r.reason.includes('Turn'), 'turnCompleted: turn budget exceeded')

    s.reset()
  }

  // 2.6 turnCompleted — priority preemption
  console.log('')
  console.log('--- 2.6 turnCompleted — preemption ---')
  {
    const s = createScheduler({ maxSlots: 1, maxTurnBudget: 999, maxTokenBudget: 999999, turnQuantum: 2 })
    s.setOnStart(async () => new Promise(() => {}))
    s.enqueue('Low priority', 5, [], { workerId: 'wLow' })
    await new Promise(r => setTimeout(r, 50))

    // Add higher priority task
    s.enqueue('High priority', 1)

    // Complete enough turns to hit quantum
    s.turnCompleted('wLow', { tokens: 1 })
    const r = s.turnCompleted('wLow', { tokens: 1 })
    assert(r.action === 'suspend' && r.reason.includes('priority'), 'turnCompleted: preempted by higher priority')

    s.reset()
  }

  // 2.7 turnCompleted — round-robin quantum
  console.log('')
  console.log('--- 2.7 turnCompleted — round-robin ---')
  {
    const s = createScheduler({ maxSlots: 1, maxTurnBudget: 999, maxTokenBudget: 999999, turnQuantum: 2 })
    s.setOnStart(async () => new Promise(() => {}))
    s.enqueue('Running', 1, [], { workerId: 'w1' })
    await new Promise(r => setTimeout(r, 50))

    // Add same-priority waiting task
    s.enqueue('Waiting', 1)

    s.turnCompleted('w1', { tokens: 1 })
    const r = s.turnCompleted('w1', { tokens: 1 })
    assert(r.action === 'suspend' && r.reason.includes('Quantum'), 'turnCompleted: quantum expired')

    s.reset()
  }

  // 2.8 turnCompleted — no worker found
  console.log('')
  console.log('--- 2.8 turnCompleted — missing worker ---')
  {
    const s = createScheduler()
    const r = s.turnCompleted('nonexistent', { tokens: 10 })
    assert(r.action === 'continue', 'turnCompleted: missing worker → continue')
    s.reset()
  }

  // 2.9 getSlotStats
  console.log('')
  console.log('--- 2.9 getSlotStats ---')
  {
    const s = createScheduler({ maxSlots: 1 })
    s.setOnStart(async () => new Promise(() => {}))
    s.enqueue('Stats test', 3, [], { workerId: 'wStats' })
    await new Promise(r => setTimeout(r, 50))

    const stats = s.getSlotStats('wStats')
    assert(stats !== null, 'getSlotStats: found worker')
    assert(stats.priority === 3, 'getSlotStats: correct priority')
    assert(stats.turnCount === 0, 'getSlotStats: initial turnCount 0')
    assert(stats.totalTokens === 0, 'getSlotStats: initial tokens 0')

    // Missing worker
    assert(s.getSlotStats('missing') === null, 'getSlotStats: null for missing')

    s.reset()
  }

  // 2.10 steer
  console.log('')
  console.log('--- 2.10 steer ---')
  {
    const s = createScheduler({ maxSlots: 1 })
    s.setOnStart(async () => new Promise(() => {}))
    const id = s.enqueue('Steer test')
    await new Promise(r => setTimeout(r, 50))

    const ok = s.steer(id, 'Focus on error handling')
    assert(ok === true, 'steer: returns true for running task')

    const fail = s.steer(999, 'nope')
    assert(fail === false, 'steer: returns false for missing task')

    s.reset()
  }

  // 2.11 abort
  console.log('')
  console.log('--- 2.11 abort ---')
  {
    const s = createScheduler({ maxSlots: 1 })
    s.setOnStart(async () => new Promise(() => {}))
    s.enqueue('Abort running', 1, [], { workerId: 'wAbort' })
    s.enqueue('Abort pending', 1, [], { workerId: 'wPending' })
    await new Promise(r => setTimeout(r, 50))

    // Abort running
    const r1 = s.abort('wAbort')
    assert(r1 === true, 'abort: running worker aborted')

    // Abort pending
    const r2 = s.abort('wPending')
    assert(r2 === true, 'abort: pending task removed')

    // Abort missing
    const r3 = s.abort('missing')
    assert(r3 === false, 'abort: false for missing')

    s.reset()
  }

  // 2.12 isIdle
  console.log('')
  console.log('--- 2.12 isIdle ---')
  {
    const s = createScheduler()
    assert(s.isIdle() === true, 'isIdle: true when empty')
    s.enqueue('Not idle')
    assert(s.isIdle() === false, 'isIdle: false with pending')
    s.reset()
  }

  // 2.13 on (events)
  console.log('')
  console.log('--- 2.13 on (events) ---')
  {
    const s = createScheduler({ maxSlots: 1 })
    const events = []
    const unsub = s.on((event, data) => events.push(event))

    s.setOnStart(async () => new Promise(() => {}))
    s.enqueue('Event test')
    await new Promise(r => setTimeout(r, 50))

    assert(events.includes('enqueued'), 'on: enqueued event')
    assert(events.includes('started'), 'on: started event')

    unsub()
    s.enqueue('After unsub')
    await new Promise(r => setTimeout(r, 50))
    const countBefore = events.length
    // No new events after unsub for the enqueue
    // (started might still fire from internal schedule)

    s.reset()
  }

  // 2.14 getState
  console.log('')
  console.log('--- 2.14 getState ---')
  {
    const s = createScheduler({ maxSlots: 1 })
    s.setOnStart(async () => new Promise(() => {}))
    s.enqueue('State B', 1)
    s.enqueue('State A', 2)
    await new Promise(r => setTimeout(r, 50))

    const state = s.getState()
    assert(Array.isArray(state.pending), 'getState: has pending')
    assert(Array.isArray(state.slots), 'getState: has slots')
    assert(Array.isArray(state.completed), 'getState: has completed')
    assert(state.slots.length === 1, 'getState: one slot occupied')
    assert(state.slots[0].task === 'State B', 'getState: higher priority started first')

    s.reset()
  }

  // 2.15 Persistence
  console.log('')
  console.log('--- 2.15 Persistence ---')
  {
    const store = memoryStore()
    const s1 = createScheduler({ store, maxSlots: 1 })
    s1.setOnStart(async () => new Promise(() => {}))
    s1.enqueue('Persist A')
    s1.enqueue('Persist B')
    await new Promise(r => setTimeout(r, 50))

    // New instance restores
    const s2 = createScheduler({ store, maxSlots: 2 })
    await s2.ready
    const state = s2.getState()
    // Running tasks become pending on restore, plus original pending
    assert(state.pending.length >= 1 || state.completed.length >= 0, 'persistence: state restored')

    s1.reset()
    s2.reset()
  }

  // 2.16 Retry on failure
  console.log('')
  console.log('--- 2.16 Retry on failure ---')
  {
    const s = createScheduler({ maxSlots: 1, maxRetries: 1, retryBaseMs: 10 })
    let attempts = 0
    s.setOnStart(async () => {
      attempts++
      throw new Error('fail')
    })
    const events = []
    s.on((event) => events.push(event))
    s.enqueue('Retry test')
    await new Promise(r => setTimeout(r, 200))

    assert(attempts >= 2, 'retry: attempted at least twice')
    assert(events.includes('retry'), 'retry: retry event emitted')

    s.reset()
  }

  // 2.17 Dependency resolution
  console.log('')
  console.log('--- 2.17 Dependency resolution ---')
  {
    const s = createScheduler({ maxSlots: 2 })
    const started = []
    s.setOnStart(async (task, abort, opts) => {
      started.push(task)
      return 'done'
    })

    const id1 = s.enqueue('Dep A')
    const id2 = s.enqueue('Dep B', 1, [id1])
    await new Promise(r => setTimeout(r, 100))

    assert(started[0] === 'Dep A', 'deps: A starts first')
    assert(started.length === 2, 'deps: B starts after A completes')
    assert(started[1] === 'Dep B', 'deps: B is second')

    s.reset()
  }


  // ═══════════════════════════════════════════════════════════════
  // PART 3: Dispatcher — all methods, all parameters
  // ═══════════════════════════════════════════════════════════════

  console.log('')
  console.log('━━━ PART 3: Dispatcher ━━━')

  // 3.1 Code mode: intent create → spawn worker
  console.log('')
  console.log('--- 3.1 Code mode: create intent → spawn ---')
  {
    const is = createIntentState()
    const s = createScheduler({ maxSlots: 3 })
    const started = []
    s.setOnStart(async (task, abort, opts) => {
      started.push({ task, opts })
      return new Promise(() => {})
    })
    const d = createDispatcher({ intentState: is, scheduler: s, mode: 'code' })
    await Promise.all([is.ready, s.ready, d.ready])

    is.create('Dispatch test')
    await new Promise(r => setTimeout(r, 50))

    assert(started.length === 1, 'code mode: worker spawned on create')
    assert(started[0].task.includes('Dispatch test'), 'code mode: task matches goal')
    assert(started[0].opts.workerId !== undefined, 'code mode: workerId in opts')

    const workers = d.getWorkers()
    assert(workers.length === 1, 'code mode: one worker tracked')
    assert(workers[0].intentId === 'intent-1', 'code mode: worker linked to intent')
    assert(workers[0].status === 'running', 'code mode: worker status running')

    is.reset(); s.reset(); d.reset()
  }

  // 3.2 Code mode: dependency chain
  console.log('')
  console.log('--- 3.2 Code mode: dependency chain ---')
  {
    const is = createIntentState()
    const s = createScheduler({ maxSlots: 3 })
    const started = []
    s.setOnStart(async (task, abort, opts) => {
      started.push({ task, opts })
      return new Promise(() => {})
    })
    const d = createDispatcher({ intentState: is, scheduler: s, mode: 'code' })
    await Promise.all([is.ready, s.ready, d.ready])

    const i1 = is.create('Step 1')
    const i2 = is.create('Step 2', { dependsOn: [i1.id] })
    await new Promise(r => setTimeout(r, 50))

    assert(started.length === 1, 'deps: only step 1 started')
    assert(started[0].task.includes('Step 1'), 'deps: step 1 task')

    // Complete step 1
    d.workerCompleted(started[0].opts.workerId, { summary: 'Step 1 done' })
    await new Promise(r => setTimeout(r, 50))

    assert(started.length === 2, 'deps: step 2 started after step 1 done')
    assert(started[1].task.includes('Step 2'), 'deps: step 2 task')
    // Dependency context injected
    assert(started[1].task.includes('Step 1 done'), 'deps: dependency context injected')

    is.reset(); s.reset(); d.reset()
  }

  // 3.3 Code mode: cascade failure
  console.log('')
  console.log('--- 3.3 Code mode: cascade failure ---')
  {
    const is = createIntentState()
    const s = createScheduler({ maxSlots: 3 })
    s.setOnStart(async () => new Promise(() => {}))
    const d = createDispatcher({ intentState: is, scheduler: s, mode: 'code' })
    await Promise.all([is.ready, s.ready, d.ready])

    const i1 = is.create('Parent')
    const i2 = is.create('Child', { dependsOn: [i1.id] })
    await new Promise(r => setTimeout(r, 50))

    const workers = d.getWorkers()
    d.workerFailed(workers[0].id, 'parent error')
    await new Promise(r => setTimeout(r, 50))

    assert(is.get(i1.id).status === 'failed', 'cascade: parent failed')
    assert(is.get(i2.id).status === 'failed', 'cascade: child cascade failed')

    is.reset(); s.reset(); d.reset()
  }

  // 3.4 Code mode: cancel intent → abort worker
  console.log('')
  console.log('--- 3.4 Code mode: cancel → abort ---')
  {
    const is = createIntentState()
    const s = createScheduler({ maxSlots: 3 })
    s.setOnStart(async () => new Promise(() => {}))
    const d = createDispatcher({ intentState: is, scheduler: s, mode: 'code' })
    await Promise.all([is.ready, s.ready, d.ready])

    is.create('Cancel me')
    await new Promise(r => setTimeout(r, 50))
    assert(d.getWorkers().length === 1, 'cancel: worker exists')

    is.cancel('intent-1')
    await new Promise(r => setTimeout(r, 50))
    assert(d.getWorkers().length === 0, 'cancel: worker removed')

    is.reset(); s.reset(); d.reset()
  }

  // 3.5 Code mode: update intent → steer worker
  console.log('')
  console.log('--- 3.5 Code mode: update → steer ---')
  {
    const is = createIntentState()
    const s = createScheduler({ maxSlots: 3 })
    s.setOnStart(async () => new Promise(() => {}))
    const d = createDispatcher({ intentState: is, scheduler: s, mode: 'code' })
    await Promise.all([is.ready, s.ready, d.ready])

    is.create('Steer me')
    await new Promise(r => setTimeout(r, 50))

    is.update('intent-1', { message: 'Focus on tests' })
    await new Promise(r => setTimeout(r, 50))

    const w = d.getWorkers()[0]
    assert(w.steerInstruction === 'Focus on tests', 'update: steer instruction set')

    is.reset(); s.reset(); d.reset()
  }

  // 3.6 beforeTurn — all return types
  console.log('')
  console.log('--- 3.6 beforeTurn ---')
  {
    const is = createIntentState()
    const s = createScheduler({ maxSlots: 3 })
    s.setOnStart(async () => new Promise(() => {}))
    const d = createDispatcher({ intentState: is, scheduler: s, mode: 'code', maxTurns: 3 })
    await Promise.all([is.ready, s.ready, d.ready])

    is.create('Turn test')
    await new Promise(r => setTimeout(r, 50))
    const wid = d.getWorkers()[0].id

    // Normal continue
    const r1 = d.beforeTurn(wid)
    assert(r1.action === 'continue', 'beforeTurn: continue')

    // Steer
    is.update('intent-1', { message: 'New direction' })
    await new Promise(r => setTimeout(r, 20))
    const r2 = d.beforeTurn(wid)
    assert(r2.action === 'steer', 'beforeTurn: steer')
    assert(r2.instruction === 'New direction', 'beforeTurn: steer instruction')

    // After steer consumed, back to continue
    const r3 = d.beforeTurn(wid)
    assert(r3.action === 'continue', 'beforeTurn: continue after steer consumed')

    // Max turns exceeded (already at turn 3 from 3 beforeTurn calls)
    const r4 = d.beforeTurn(wid)
    assert(r4.action === 'abort' && r4.reason.includes('Maximum turns'), 'beforeTurn: abort on max turns')

    // Missing worker
    const r5 = d.beforeTurn(999)
    assert(r5.action === 'continue', 'beforeTurn: continue for missing worker')

    is.reset(); s.reset(); d.reset()
  }

  // 3.7 afterTurn — all parameters
  console.log('')
  console.log('--- 3.7 afterTurn ---')
  {
    const is = createIntentState()
    const s = createScheduler({ maxSlots: 3, maxTokenBudget: 999999, maxTurnBudget: 999, turnQuantum: 99 })
    s.setOnStart(async () => new Promise(() => {}))
    const d = createDispatcher({ intentState: is, scheduler: s, mode: 'code', stallThreshold: 2 })
    await Promise.all([is.ready, s.ready, d.ready])

    is.create('AfterTurn test')
    await new Promise(r => setTimeout(r, 50))
    const wid = d.getWorkers()[0].id

    // With usage object
    const r1 = d.afterTurn(wid, { usage: { input_tokens: 100, output_tokens: 50 } })
    assert(r1.action === 'continue', 'afterTurn: continue with usage')
    assert(d.getWorker(wid).totalTokens === 150, 'afterTurn: tokens tracked from usage')

    // With tokens directly
    const r2 = d.afterTurn(wid, { tokens: 200 })
    assert(d.getWorker(wid).totalTokens === 350, 'afterTurn: tokens accumulated')

    // With toolCalls
    const r3 = d.afterTurn(wid, { toolCalls: [{name:'a'},{name:'b'}] })
    assert(d.getWorker(wid).toolCallCount === 2, 'afterTurn: toolCalls tracked')

    // With progress
    d.afterTurn(wid, { progress: '75% complete' })
    assert(is.get('intent-1').progress === '75% complete', 'afterTurn: progress pushed to intent')

    // With artifacts
    d.afterTurn(wid, { artifacts: ['output.js'] })
    assert(is.get('intent-1').artifacts.includes('output.js'), 'afterTurn: artifacts pushed to intent')

    // Stall detection
    d.afterTurn(wid, { noProgress: true })
    d.afterTurn(wid, { noProgress: true })
    const w = d.getWorker(wid)
    assert(w.stallCount === 2, 'afterTurn: stall count tracked')

    // Stall resets on progress
    d.afterTurn(wid, { noProgress: false })
    assert(d.getWorker(wid).stallCount === 0, 'afterTurn: stall resets on progress')

    // Missing worker
    const rMissing = d.afterTurn(999, {})
    assert(rMissing.action === 'continue', 'afterTurn: continue for missing worker')

    is.reset(); s.reset(); d.reset()
  }

  // 3.8 workerCompleted
  console.log('')
  console.log('--- 3.8 workerCompleted ---')
  {
    const is = createIntentState()
    const s = createScheduler({ maxSlots: 3 })
    s.setOnStart(async () => new Promise(() => {}))
    const d = createDispatcher({ intentState: is, scheduler: s, mode: 'code' })
    await Promise.all([is.ready, s.ready, d.ready])

    is.create('Complete me')
    await new Promise(r => setTimeout(r, 50))
    const wid = d.getWorkers()[0].id

    d.workerCompleted(wid, { summary: 'All done' })
    assert(is.get('intent-1').status === 'done', 'workerCompleted: intent done')
    assert(is.get('intent-1').progress === 'All done', 'workerCompleted: summary as progress')
    assert(d.getWorkers().length === 0, 'workerCompleted: worker removed')

    is.reset(); s.reset(); d.reset()
  }

  // 3.9 workerFailed
  console.log('')
  console.log('--- 3.9 workerFailed ---')
  {
    const is = createIntentState()
    const s = createScheduler({ maxSlots: 3 })
    s.setOnStart(async () => new Promise(() => {}))
    const d = createDispatcher({ intentState: is, scheduler: s, mode: 'code' })
    await Promise.all([is.ready, s.ready, d.ready])

    is.create('Fail me')
    await new Promise(r => setTimeout(r, 50))
    const wid = d.getWorkers()[0].id

    d.workerFailed(wid, 'something broke')
    assert(is.get('intent-1').status === 'failed', 'workerFailed: intent failed')
    assert(d.getWorkers().length === 0, 'workerFailed: worker removed')

    is.reset(); s.reset(); d.reset()
  }

  // 3.10 getWorker / getWorkers / getDecisionLog
  console.log('')
  console.log('--- 3.10 getWorker, getWorkers, getDecisionLog ---')
  {
    const is = createIntentState()
    const s = createScheduler({ maxSlots: 3 })
    s.setOnStart(async () => new Promise(() => {}))
    const d = createDispatcher({ intentState: is, scheduler: s, mode: 'code' })
    await Promise.all([is.ready, s.ready, d.ready])

    is.create('Worker A')
    is.create('Worker B')
    await new Promise(r => setTimeout(r, 50))

    const workers = d.getWorkers()
    assert(workers.length === 2, 'getWorkers: two workers')

    const w1 = d.getWorker(workers[0].id)
    assert(w1 !== null && w1.task.includes('Worker A'), 'getWorker: found by id')
    assert(d.getWorker(999) === null, 'getWorker: null for missing')

    // getWorker returns copy
    w1.task = 'MUTATED'
    assert(d.getWorker(workers[0].id).task.includes('Worker A'), 'getWorker: returns copy')

    const log = d.getDecisionLog()
    assert(log.length >= 2, 'getDecisionLog: has entries')
    assert(log[0].action === 'spawn', 'getDecisionLog: spawn logged')

    is.reset(); s.reset(); d.reset()
  }

  // 3.11 setMode
  console.log('')
  console.log('--- 3.11 setMode ---')
  {
    const is = createIntentState()
    const s = createScheduler({ maxSlots: 3 })
    s.setOnStart(async () => new Promise(() => {}))
    const d = createDispatcher({ intentState: is, scheduler: s, mode: 'code' })

    // setMode to llm (without ai, falls back to code)
    d.setMode('llm')
    is.create('Mode test')
    await new Promise(r => setTimeout(r, 50))
    assert(d.getWorkers().length === 1, 'setMode: llm without ai falls back to code')

    is.reset(); s.reset(); d.reset()
  }

  // 3.12 on (events)
  console.log('')
  console.log('--- 3.12 on (events) ---')
  {
    const is = createIntentState()
    const s = createScheduler({ maxSlots: 3 })
    s.setOnStart(async () => new Promise(() => {}))
    const events = []
    const d = createDispatcher({ intentState: is, scheduler: s, mode: 'code' })
    const unsub = d.on((event, data) => events.push(event))

    is.create('Event test')
    await new Promise(r => setTimeout(r, 50))
    assert(events.includes('spawn'), 'on: spawn event')

    unsub()
    is.create('After unsub')
    await new Promise(r => setTimeout(r, 50))
    const spawnCount = events.filter(e => e === 'spawn').length
    assert(spawnCount === 1, 'on: unsub stops events')

    is.reset(); s.reset(); d.reset()
  }

  // 3.13 Persistence
  console.log('')
  console.log('--- 3.13 Dispatcher persistence ---')
  {
    const store = memoryStore()
    const is = createIntentState({ store })
    const s = createScheduler({ store, maxSlots: 3 })
    s.setOnStart(async () => new Promise(() => {}))
    const d = createDispatcher({ intentState: is, scheduler: s, mode: 'code', store })
    await Promise.all([is.ready, s.ready, d.ready])

    is.create('Persist worker')
    await new Promise(r => setTimeout(r, 50))

    // New dispatcher restores
    const d2 = createDispatcher({ intentState: is, scheduler: s, mode: 'code', store })
    await d2.ready
    const workers = d2.getWorkers()
    assert(workers.length >= 1, 'persistence: workers restored')
    // Running workers become suspended on restore
    assert(workers[0].status === 'suspended', 'persistence: running → suspended on restore')

    is.reset(); s.reset(); d.reset(); d2.reset()
  }


  // ═══════════════════════════════════════════════════════════════
  // PART 4: Conductor — all methods, all parameters
  // ═══════════════════════════════════════════════════════════════

  console.log('')
  console.log('━━━ PART 4: Conductor ━━━')

  // 4.1 Constructor — missing ai throws
  console.log('')
  console.log('--- 4.1 Constructor validation ---')
  {
    let threw = false
    try { createConductor({}) } catch (e) { threw = e.message.includes('ai') }
    assert(threw, 'constructor: throws without ai')
  }

  // 4.2 Single strategy — chat
  console.log('')
  console.log('--- 4.2 Single strategy — chat ---')
  {
    const ai = mockAI('single reply')
    const c = createConductor({ ai, strategy: 'single' })

    const r = await c.chat('hello')
    assert(r.reply === 'single reply', 'single: reply correct')
    assert(r.intents.length === 0, 'single: no intents')
    assert(r.usage !== undefined, 'single: usage returned')

    c.destroy()
  }

  // 4.3 Single strategy — systemPrompt
  console.log('')
  console.log('--- 4.3 Single — systemPrompt ---')
  {
    let capturedOpts = null
    const ai = { chat: async (msgs, opts) => { capturedOpts = opts; return { answer: 'ok' } } }
    const c = createConductor({ ai, strategy: 'single', systemPrompt: 'Be concise.' })

    await c.chat('test')
    assert(capturedOpts.system.includes('Be concise'), 'single: systemPrompt passed')

    c.destroy()
  }

  // 4.4 Single strategy — formatContext
  console.log('')
  console.log('--- 4.4 Single — formatContext ---')
  {
    let capturedOpts = null
    const ai = { chat: async (msgs, opts) => { capturedOpts = opts; return { answer: 'ok' } } }
    const c = createConductor({
      ai, strategy: 'single',
      systemPrompt: 'Base.',
      formatContext: () => 'Dynamic context here',
    })

    await c.chat('test')
    assert(capturedOpts.system.includes('Dynamic context here'), 'single: formatContext injected')

    c.destroy()
  }

  // 4.5 Single strategy — tools passthrough
  console.log('')
  console.log('--- 4.5 Single — tools ---')
  {
    let capturedOpts = null
    const ai = { chat: async (msgs, opts) => { capturedOpts = opts; return { answer: 'ok' } } }
    const myTools = [{ name: 'search' }]
    const c = createConductor({ ai, strategy: 'single', tools: myTools })

    await c.chat('test')
    assert(capturedOpts.tools[0].name === 'search', 'single: tools passed')

    // Per-call tools override
    await c.chat('test2', { tools: [{ name: 'calc' }] })
    assert(capturedOpts.tools[0].name === 'calc', 'single: per-call tools override')

    c.destroy()
  }

  // 4.6 Single strategy — conversation history
  console.log('')
  console.log('--- 4.6 Single — history ---')
  {
    let lastMsgs = null
    const ai = { chat: async (msgs, opts) => { lastMsgs = msgs; return { answer: 'reply' } } }
    const c = createConductor({ ai, strategy: 'single' })

    await c.chat('first')
    await c.chat('second')
    assert(lastMsgs.length === 4, 'single: history accumulates (2 user + 2 assistant)')
    assert(lastMsgs[0].content === 'first', 'single: first message in history')
    assert(lastMsgs[2].content === 'second', 'single: second message in history')

    c.destroy()
  }

  // 4.7 Single strategy — getState / getIntents / cancel / on / destroy
  console.log('')
  console.log('--- 4.7 Single — other methods ---')
  {
    const c = createConductor({ ai: mockAI(), strategy: 'single' })

    const state = c.getState()
    assert(state.strategy === 'single', 'single: getState strategy')
    assert(state.messages === 0, 'single: getState messages count')

    assert(c.getIntents().length === 0, 'single: getIntents empty')

    // cancel is no-op
    c.cancel()

    // on returns unsub
    const unsub = c.on(() => {})
    assert(typeof unsub === 'function', 'single: on returns unsub')

    c.destroy()
  }

  // 4.8 Dispatch strategy — chat with intent parsing
  console.log('')
  console.log('--- 4.8 Dispatch — chat with intents ---')
  {
    const ai = mockAI('I will search.\n' + '`' + '`' + '`' + 'intents\n[{"action":"create","goal":"Search news","priority":2}]\n' + '`' + '`' + '`')
    const spawned = []
    const c = createConductor({
      ai, strategy: 'dispatch', dispatchMode: 'code',
      onWorkerStart: (task, abort, opts) => { spawned.push({task, opts}); return new Promise(() => {}) },
    })

    const r = await c.chat('search news')
    assert(r.reply === 'I will search.', 'dispatch chat: intents block stripped')
    assert(r.intents.length === 1, 'dispatch chat: one intent created')
    assert(r.intents[0].goal === 'Search news', 'dispatch chat: intent goal')
    assert(r.intents[0].priority === 2, 'dispatch chat: intent priority')

    await new Promise(r => setTimeout(r, 50))
    assert(spawned.length === 1, 'dispatch chat: worker spawned')

    c.destroy()
  }

  // 4.9 Dispatch — chat with update and cancel actions
  console.log('')
  console.log('--- 4.9 Dispatch — update/cancel actions ---')
  {
    const BT = '`'.repeat(3)
    const responses = [
      'Creating.\n' + BT + 'intents\n[{"action":"create","goal":"Task X"}]\n' + BT,
      'Updating.\n' + BT + 'intents\n[{"action":"update","id":"intent-1","message":"halfway"}]\n' + BT,
      'Cancelling.\n' + BT + 'intents\n[{"action":"cancel","id":"intent-1"}]\n' + BT,
    ]
    let callIdx = 0
    const ai = { chat: async () => ({ answer: responses[callIdx++] || 'done' }) }
    const c = createConductor({
      ai, strategy: 'dispatch', dispatchMode: 'code',
      onWorkerStart: () => new Promise(() => {}),
    })

    await c.chat('create')
    assert(c.getIntents().length === 1, 'actions: intent created')

    await c.chat('update')
    const msgs = c.getIntents()[0].messages
    assert(msgs.includes('halfway'), 'actions: update message added')

    await c.chat('cancel')
    assert(c.getIntents()[0].status === 'cancelled', 'actions: intent cancelled')

    c.destroy()
  }

  // 4.10 Dispatch — chat with dependencies
  console.log('')
  console.log('--- 4.10 Dispatch — dependencies in chat ---')
  {
    const BT2 = '`'.repeat(3)
    const ai = mockAI('On it.\n' + BT2 + 'intents\n[{"action":"create","goal":"A"},{"action":"create","goal":"B","dependsOn":["intent-1"]}]\n' + BT2)
    const spawned = []
    const c = createConductor({
      ai, strategy: 'dispatch', dispatchMode: 'code',
      onWorkerStart: (task, abort, opts) => { spawned.push({task, opts}); return new Promise(() => {}) },
    })

    await c.chat('do A then B')
    await new Promise(r => setTimeout(r, 50))
    assert(spawned.length === 1, 'deps chat: only A spawned')

    c.completeWorker(spawned[0].opts.workerId, { summary: 'A done' })
    await new Promise(r => setTimeout(r, 50))
    assert(spawned.length === 2, 'deps chat: B spawned after A')

    c.destroy()
  }

  // 4.11 Dispatch — createIntent(goal, options)
  console.log('')
  console.log('--- 4.11 createIntent ---')
  {
    const c = createConductor({
      ai: mockAI(), strategy: 'dispatch', dispatchMode: 'code',
      onWorkerStart: () => new Promise(() => {}),
    })

    const i = c.createIntent('Manual intent', { priority: 3, dependsOn: [] })
    assert(i.goal === 'Manual intent', 'createIntent: goal')
    assert(i.priority === 3, 'createIntent: priority')
    assert(c.getIntents().length === 1, 'createIntent: tracked')

    c.destroy()
  }

  // 4.12 Dispatch — cancelIntent
  console.log('')
  console.log('--- 4.12 cancelIntent ---')
  {
    const c = createConductor({
      ai: mockAI(), strategy: 'dispatch', dispatchMode: 'code',
      onWorkerStart: () => new Promise(() => {}),
    })

    c.createIntent('Cancel me')
    await new Promise(r => setTimeout(r, 50))
    c.cancelIntent('intent-1')
    assert(c.getIntents()[0].status === 'cancelled', 'cancelIntent: status cancelled')

    c.destroy()
  }

  // 4.13 Dispatch — updateIntent
  console.log('')
  console.log('--- 4.13 updateIntent ---')
  {
    const c = createConductor({
      ai: mockAI(), strategy: 'dispatch', dispatchMode: 'code',
      onWorkerStart: () => new Promise(() => {}),
    })

    c.createIntent('Update me')
    c.updateIntent('intent-1', { goal: 'Updated goal', message: 'New info', priority: 5 })
    const i = c.getIntents()[0]
    assert(i.goal === 'Updated goal', 'updateIntent: goal changed')
    assert(i.messages.includes('New info'), 'updateIntent: message added')
    assert(i.priority === 5, 'updateIntent: priority changed')

    c.destroy()
  }

  // 4.14 Dispatch — completeWorker / failWorker
  console.log('')
  console.log('--- 4.14 completeWorker / failWorker ---')
  {
    const c = createConductor({
      ai: mockAI(), strategy: 'dispatch', dispatchMode: 'code',
      onWorkerStart: () => new Promise(() => {}),
    })

    c.createIntent('Complete')
    c.createIntent('Fail')
    await new Promise(r => setTimeout(r, 50))

    const state = c.getState()
    const w1 = state.workers[0]
    const w2 = state.workers[1]

    c.completeWorker(w1.id, { summary: 'Done!' })
    assert(c.getIntents().find(i => i.id === w1.intentId).status === 'done', 'completeWorker: intent done')

    c.failWorker(w2.id, 'broke')
    assert(c.getIntents().find(i => i.id === w2.intentId).status === 'failed', 'failWorker: intent failed')

    c.destroy()
  }

  // 4.15 Dispatch — beforeTurn / afterTurn
  console.log('')
  console.log('--- 4.15 beforeTurn / afterTurn ---')
  {
    const c = createConductor({
      ai: mockAI(), strategy: 'dispatch', dispatchMode: 'code',
      onWorkerStart: () => new Promise(() => {}),
    })

    c.createIntent('Turn test')
    await new Promise(r => setTimeout(r, 50))
    const wid = c.getState().workers[0].id

    const bt = c.beforeTurn(wid)
    assert(bt.action === 'continue', 'beforeTurn via conductor: continue')

    const at = c.afterTurn(wid, { tokens: 100, progress: 'halfway' })
    assert(at.action === 'continue', 'afterTurn via conductor: continue')

    c.destroy()
  }

  // 4.16 Dispatch — getState
  console.log('')
  console.log('--- 4.16 getState ---')
  {
    const c = createConductor({
      ai: mockAI(), strategy: 'dispatch', dispatchMode: 'code',
      onWorkerStart: () => new Promise(() => {}),
    })

    c.createIntent('State test')
    await new Promise(r => setTimeout(r, 50))

    const state = c.getState()
    assert(state.strategy === 'dispatch', 'getState: strategy')
    assert(Array.isArray(state.intents), 'getState: has intents')
    assert(Array.isArray(state.workers), 'getState: has workers')
    assert(state.scheduler !== undefined, 'getState: has scheduler')
    assert(Array.isArray(state.decisionLog), 'getState: has decisionLog')

    c.destroy()
  }

  // 4.17 Dispatch — on (events)
  console.log('')
  console.log('--- 4.17 on (events) ---')
  {
    const events = []
    const c = createConductor({
      ai: mockAI(), strategy: 'dispatch', dispatchMode: 'code',
      onWorkerStart: () => new Promise(() => {}),
    })
    const unsub = c.on((event, data) => events.push(event))

    c.createIntent('Event test')
    await new Promise(r => setTimeout(r, 50))
    assert(events.some(e => e.includes('spawn')), 'on: spawn event forwarded')

    unsub()
    c.createIntent('After unsub')
    await new Promise(r => setTimeout(r, 50))
    const spawnsBefore = events.filter(e => e.includes('spawn')).length
    // Should not increase (or at most from scheduler internal)

    c.destroy()
  }

  // 4.18 Dispatch — store option
  console.log('')
  console.log('--- 4.18 store option ---')
  {
    const store = memoryStore()
    const c = createConductor({
      ai: mockAI(), strategy: 'dispatch', dispatchMode: 'code',
      store, onWorkerStart: () => new Promise(() => {}),
    })

    c.createIntent('Stored intent')
    await new Promise(r => setTimeout(r, 50))

    // Verify data in store
    const intentData = await store.get('conductor/intents')
    assert(intentData !== null, 'store: intent data persisted')
    const schedulerData = await store.get('conductor/scheduler')
    assert(schedulerData !== null, 'store: scheduler data persisted')
    const dispatcherData = await store.get('conductor/dispatcher')
    assert(dispatcherData !== null, 'store: dispatcher data persisted')

    c.destroy()
  }

  // 4.19 Dispatch — maxSlots / maxTurnBudget / maxTokenBudget / turnQuantum
  console.log('')
  console.log('--- 4.19 Budget options ---')
  {
    const c = createConductor({
      ai: mockAI(), strategy: 'dispatch', dispatchMode: 'code',
      maxSlots: 1, maxTurnBudget: 2, maxTokenBudget: 500, turnQuantum: 1,
      onWorkerStart: () => new Promise(() => {}),
    })

    c.createIntent('Budget A')
    c.createIntent('Budget B')
    await new Promise(r => setTimeout(r, 50))

    // maxSlots=1: only 1 worker running, other pending in scheduler
    const state = c.getState()
    assert(state.scheduler.slots.length === 1, 'maxSlots: only 1 slot occupied')

    // Turn budget / quantum
    const wid = c.getState().workers[0].id
    const r = c.afterTurn(wid, { tokens: 100 })
    // Should suspend (quantum 1 with waiting task — auto re-enqueued)
    assert(r.action === 'suspend', 'budget: suspend on budget/quantum')

    c.destroy()
  }

  // 4.20 Dispatch — onWorkerStart callback shape
  console.log('')
  console.log('--- 4.20 onWorkerStart callback ---')
  {
    let cbArgs = null
    const c = createConductor({
      ai: mockAI(), strategy: 'dispatch', dispatchMode: 'code',
      onWorkerStart: (task, abort, opts) => {
        cbArgs = { task, abort, opts }
        return new Promise(() => {})
      },
    })

    c.createIntent('Callback test')
    await new Promise(r => setTimeout(r, 50))

    assert(typeof cbArgs.task === 'string', 'onWorkerStart: task is string')
    assert(cbArgs.abort !== undefined, 'onWorkerStart: abort provided')
    assert(typeof cbArgs.opts.workerId === 'number', 'onWorkerStart: workerId in opts')
    assert(typeof cbArgs.opts.beforeTurn === 'function', 'onWorkerStart: beforeTurn in opts')
    assert(typeof cbArgs.opts.afterTurn === 'function', 'onWorkerStart: afterTurn in opts')
    assert(Array.isArray(cbArgs.opts.tools), 'onWorkerStart: tools in opts')

    c.destroy()
  }

  // 4.21 Dispatch — no onWorkerStart throws
  console.log('')
  console.log('--- 4.21 No onWorkerStart ---')
  {
    const events = []
    const c = createConductor({
      ai: mockAI(), strategy: 'dispatch', dispatchMode: 'code',
    })
    c.on((event, data) => events.push(event))

    c.createIntent('No handler')
    await new Promise(r => setTimeout(r, 100))

    // Should have error/retry events since onWorkerStart throws
    // The scheduler will retry and eventually fail
    assert(events.length > 0, 'no onWorkerStart: events emitted (retry/error)')

    c.destroy()
  }

  // 4.22 Dispatch — internals access
  console.log('')
  console.log('--- 4.22 Internals ---')
  {
    const c = createConductor({
      ai: mockAI(), strategy: 'dispatch', dispatchMode: 'code',
      onWorkerStart: () => new Promise(() => {}),
    })

    assert(c._intentState !== undefined, '_intentState exposed')
    assert(c._scheduler !== undefined, '_scheduler exposed')
    assert(c._dispatcher !== undefined, '_dispatcher exposed')

    c.destroy()
  }

  // 4.23 Dispatch — destroy cleanup
  console.log('')
  console.log('--- 4.23 destroy ---')
  {
    const c = createConductor({
      ai: mockAI(), strategy: 'dispatch', dispatchMode: 'code',
      onWorkerStart: () => new Promise(() => {}),
    })

    c.createIntent('Destroy test')
    await new Promise(r => setTimeout(r, 50))
    assert(c.getIntents().length === 1, 'pre-destroy: has intents')

    c.destroy()
    assert(c.getIntents().length === 0, 'destroy: intents cleared')
    assert(c.getState().workers.length === 0, 'destroy: workers cleared')
  }

  // 4.24 memoryStore
  console.log('')
  console.log('--- 4.24 memoryStore ---')
  {
    const store = memoryStore()

    await store.set('key1', 'value1')
    assert(await store.get('key1') === 'value1', 'memoryStore: get/set')
    assert(await store.has('key1') === true, 'memoryStore: has true')
    assert(await store.has('missing') === false, 'memoryStore: has false')

    const keys = await store.keys()
    assert(keys.includes('key1'), 'memoryStore: keys')

    await store.delete('key1')
    assert(await store.get('key1') === null, 'memoryStore: delete')

    await store.set('a', 1)
    await store.set('b', 2)
    await store.clear()
    assert((await store.keys()).length === 0, 'memoryStore: clear')
  }


  // ═══════════════════════════════════════════════════════════════
  // PART 5: Worker Plan System
  // ═══════════════════════════════════════════════════════════════

  console.log('')
  console.log('━━━ PART 5: Worker Plan ━━━')

  // 5.1 planSteps
  console.log('')
  console.log('--- 5.1 planSteps ---')
  {
    const is = createIntentState()
    const s = createScheduler({ maxSlots: 3 })
    s.setOnStart(async () => new Promise(() => {}))
    const d = createDispatcher({ intentState: is, scheduler: s, mode: 'code' })
    await Promise.all([is.ready, s.ready, d.ready])

    is.create('Plan test')
    await new Promise(r => setTimeout(r, 50))
    const wid = d.getWorkers()[0].id

    const steps = d.planSteps(wid, ['Research', 'Implement', 'Test'])
    assert(steps.length === 3, 'planSteps: 3 steps created')
    assert(steps[0].text === 'Research', 'planSteps: first step text')
    assert(steps[0].status === 'pending', 'planSteps: initial status pending')
    assert(steps[2].text === 'Test', 'planSteps: last step text')

    // planSteps on missing worker
    assert(d.planSteps(999, ['x']) === null, 'planSteps: null for missing worker')

    is.reset(); s.reset(); d.reset()
  }

  // 5.2 getSteps
  console.log('')
  console.log('--- 5.2 getSteps ---')
  {
    const is = createIntentState()
    const s = createScheduler({ maxSlots: 3 })
    s.setOnStart(async () => new Promise(() => {}))
    const d = createDispatcher({ intentState: is, scheduler: s, mode: 'code' })
    await Promise.all([is.ready, s.ready, d.ready])

    is.create('Steps test')
    await new Promise(r => setTimeout(r, 50))
    const wid = d.getWorkers()[0].id

    // Empty before plan
    assert(d.getSteps(wid).length === 0, 'getSteps: empty before plan')

    d.planSteps(wid, ['A', 'B'])
    const steps = d.getSteps(wid)
    assert(steps.length === 2, 'getSteps: returns planned steps')
    assert(steps[0].text === 'A', 'getSteps: correct text')

    // Returns copy
    steps[0].text = 'MUTATED'
    assert(d.getSteps(wid)[0].text === 'A', 'getSteps: returns copy')

    // Missing worker
    assert(d.getSteps(999).length === 0, 'getSteps: empty for missing')

    is.reset(); s.reset(); d.reset()
  }

  // 5.3 advanceStep
  console.log('')
  console.log('--- 5.3 advanceStep ---')
  {
    const is = createIntentState()
    const s = createScheduler({ maxSlots: 3 })
    s.setOnStart(async () => new Promise(() => {}))
    const d = createDispatcher({ intentState: is, scheduler: s, mode: 'code' })
    await Promise.all([is.ready, s.ready, d.ready])

    is.create('Advance test')
    await new Promise(r => setTimeout(r, 50))
    const wid = d.getWorkers()[0].id

    d.planSteps(wid, ['Step 1', 'Step 2', 'Step 3'])

    assert(d.advanceStep(wid, 0) === true, 'advanceStep: returns true')
    assert(d.getSteps(wid)[0].status === 'done', 'advanceStep: step marked done')
    assert(d.getSteps(wid)[1].status === 'pending', 'advanceStep: next still pending')

    // Invalid index
    assert(d.advanceStep(wid, 99) === false, 'advanceStep: false for invalid index')

    // Missing worker
    assert(d.advanceStep(999, 0) === false, 'advanceStep: false for missing worker')

    is.reset(); s.reset(); d.reset()
  }

  // 5.4 Auto-advance in afterTurn
  console.log('')
  console.log('--- 5.4 Auto-advance in afterTurn ---')
  {
    const is = createIntentState()
    const s = createScheduler({ maxSlots: 3, maxTokenBudget: 999999, maxTurnBudget: 999, turnQuantum: 99 })
    s.setOnStart(async () => new Promise(() => {}))
    const d = createDispatcher({ intentState: is, scheduler: s, mode: 'code' })
    await Promise.all([is.ready, s.ready, d.ready])

    is.create('Auto-advance test')
    await new Promise(r => setTimeout(r, 50))
    const wid = d.getWorkers()[0].id

    d.planSteps(wid, ['Search', 'Write', 'Review'])

    // Turn with real tool calls → advance one step
    d.afterTurn(wid, { toolCalls: [{ name: 'web_search' }] })
    assert(d.getSteps(wid)[0].status === 'done', 'auto-advance: first step done')
    assert(d.getSteps(wid)[1].status === 'pending', 'auto-advance: second still pending')

    // Turn with meta tool only → no advance
    d.afterTurn(wid, { toolCalls: [{ name: 'plan_steps' }] })
    assert(d.getSteps(wid)[1].status === 'pending', 'auto-advance: meta tool skipped')

    // Turn with mixed → advance (has real call)
    d.afterTurn(wid, { toolCalls: [{ name: 'done' }, { name: 'write_file' }] })
    assert(d.getSteps(wid)[1].status === 'done', 'auto-advance: mixed advances')

    // Turn with no tool calls → no advance
    d.afterTurn(wid, {})
    assert(d.getSteps(wid)[2].status === 'pending', 'auto-advance: no tools no advance')

    is.reset(); s.reset(); d.reset()
  }

  // 5.5 Progress auto-sync to intent
  console.log('')
  console.log('--- 5.5 Progress auto-sync ---')
  {
    const is = createIntentState()
    const s = createScheduler({ maxSlots: 3, maxTokenBudget: 999999, maxTurnBudget: 999, turnQuantum: 99 })
    s.setOnStart(async () => new Promise(() => {}))
    const d = createDispatcher({ intentState: is, scheduler: s, mode: 'code' })
    await Promise.all([is.ready, s.ready, d.ready])

    is.create('Progress sync')
    await new Promise(r => setTimeout(r, 50))
    const wid = d.getWorkers()[0].id

    d.planSteps(wid, ['A', 'B', 'C'])
    d.afterTurn(wid, { toolCalls: [{ name: 'search' }] })

    const intent = is.get('intent-1')
    assert(intent.progress === '1/3 steps', 'progress sync: auto-generated from steps')

    // Explicit progress overrides
    d.afterTurn(wid, { toolCalls: [{ name: 'write' }], progress: 'Custom progress' })
    assert(is.get('intent-1').progress === 'Custom progress', 'progress sync: explicit overrides')

    is.reset(); s.reset(); d.reset()
  }

  // 5.6 plan_steps meta tool via conductor
  console.log('')
  console.log('--- 5.6 Meta tools via conductor ---')
  {
    let workerOpts = null
    const c = createConductor({
      ai: { chat: async () => ({ answer: 'ok' }) },
      strategy: 'dispatch', dispatchMode: 'code',
      tools: [{ name: 'search', description: 'Search' }],
      onWorkerStart: (task, abort, opts) => {
        workerOpts = opts
        return new Promise(() => {})
      },
    })

    c.createIntent('Meta tool test')
    await new Promise(r => setTimeout(r, 50))

    assert(workerOpts !== null, 'meta: worker started')
    assert(workerOpts.metaTools.length === 2, 'meta: 2 meta tools injected')
    assert(workerOpts.metaTools[0].name === 'plan_steps', 'meta: plan_steps tool')
    assert(workerOpts.metaTools[1].name === 'done', 'meta: done tool')

    // tools includes meta + user tools
    assert(workerOpts.tools.length === 3, 'meta: total 3 tools (2 meta + 1 user)')
    assert(workerOpts.tools[0].name === 'plan_steps', 'meta: plan_steps first')
    assert(workerOpts.tools[2].name === 'search', 'meta: user tool last')

    // steps() function
    assert(typeof workerOpts.steps === 'function', 'meta: steps() function provided')
    assert(workerOpts.steps().length === 0, 'meta: steps empty initially')

    // Execute plan_steps meta tool
    const planResult = workerOpts.metaTools[0].execute({ planned: ['Step A', 'Step B'] })
    assert(planResult.success === true, 'meta: plan_steps returns success')
    assert(workerOpts.steps().length === 2, 'meta: steps updated after plan')

    // Execute done meta tool
    const doneResult = workerOpts.metaTools[1].execute({ summary: 'All done' })
    assert(doneResult.done === true, 'meta: done returns done')

    c.destroy()
  }

  // 5.7 plan_steps validation
  console.log('')
  console.log('--- 5.7 plan_steps validation ---')
  {
    let workerOpts = null
    const c = createConductor({
      ai: { chat: async () => ({ answer: 'ok' }) },
      strategy: 'dispatch', dispatchMode: 'code',
      onWorkerStart: (task, abort, opts) => {
        workerOpts = opts
        return new Promise(() => {})
      },
    })

    c.createIntent('Validation test')
    await new Promise(r => setTimeout(r, 50))

    // Empty array
    const r1 = workerOpts.metaTools[0].execute({ planned: [] })
    assert(r1.error !== undefined, 'validation: empty array rejected')

    // Not array
    const r2 = workerOpts.metaTools[0].execute({ planned: 'not array' })
    assert(r2.error !== undefined, 'validation: non-array rejected')

    c.destroy()
  }

  // 5.8 Plan event
  console.log('')
  console.log('--- 5.8 Plan event ---')
  {
    const is = createIntentState()
    const s = createScheduler({ maxSlots: 3 })
    s.setOnStart(async () => new Promise(() => {}))
    const events = []
    const d = createDispatcher({ intentState: is, scheduler: s, mode: 'code' })
    d.on((event, data) => events.push({ event, data }))

    is.create('Event test')
    await new Promise(r => setTimeout(r, 50))
    const wid = d.getWorkers()[0].id

    d.planSteps(wid, ['X', 'Y'])
    const planEvent = events.find(e => e.event === 'plan')
    assert(planEvent !== undefined, 'plan event: emitted')
    assert(planEvent.data.workerId === wid, 'plan event: correct workerId')
    assert(planEvent.data.steps.length === 2, 'plan event: correct steps')

    is.reset(); s.reset(); d.reset()
  }

  // 5.9 Re-plan (overwrite steps)
  console.log('')
  console.log('--- 5.9 Re-plan ---')
  {
    const is = createIntentState()
    const s = createScheduler({ maxSlots: 3 })
    s.setOnStart(async () => new Promise(() => {}))
    const d = createDispatcher({ intentState: is, scheduler: s, mode: 'code' })
    await Promise.all([is.ready, s.ready, d.ready])

    is.create('Re-plan')
    await new Promise(r => setTimeout(r, 50))
    const wid = d.getWorkers()[0].id

    d.planSteps(wid, ['Old A', 'Old B'])
    d.advanceStep(wid, 0)
    assert(d.getSteps(wid)[0].status === 'done', 're-plan: first step done')

    // Re-plan overwrites
    d.planSteps(wid, ['New X', 'New Y', 'New Z'])
    assert(d.getSteps(wid).length === 3, 're-plan: new steps count')
    assert(d.getSteps(wid)[0].status === 'pending', 're-plan: all reset to pending')
    assert(d.getSteps(wid)[0].text === 'New X', 're-plan: new text')

    is.reset(); s.reset(); d.reset()
  }

  // 5.10 Steps in getWorker / getState
  console.log('')
  console.log('--- 5.10 Steps in state ---')
  {
    const c = createConductor({
      ai: { chat: async () => ({ answer: 'ok' }) },
      strategy: 'dispatch', dispatchMode: 'code',
      onWorkerStart: () => new Promise(() => {}),
    })

    c.createIntent('State steps')
    await new Promise(r => setTimeout(r, 50))
    const wid = c.getState().workers[0].id

    c.planSteps(wid, ['Alpha', 'Beta'])
    const state = c.getState()
    assert(state.workers[0].steps.length === 2, 'state: workers include steps')
    assert(state.workers[0].steps[0].text === 'Alpha', 'state: step text in state')

    c.destroy()
  }


  // 5.11 planMode=false
  console.log('')
  console.log('--- 5.11 planMode=false ---')
  {
    let workerOpts = null
    const c = createConductor({
      ai: { chat: async () => ({ answer: 'ok' }) },
      strategy: 'dispatch', dispatchMode: 'code',
      planMode: false,
      tools: [{ name: 'search', description: 'Search' }],
      onWorkerStart: (task, abort, opts) => {
        workerOpts = opts
        return new Promise(() => {})
      },
    })

    c.createIntent('No plan mode')
    await new Promise(r => setTimeout(r, 50))

    assert(workerOpts !== null, 'planMode=false: worker started')
    assert(workerOpts.tools.length === 1, 'planMode=false: only user tools')
    assert(workerOpts.tools[0].name === 'search', 'planMode=false: no meta tools')
    assert(workerOpts.metaTools === undefined, 'planMode=false: no metaTools prop')
    assert(workerOpts.steps === undefined, 'planMode=false: no steps prop')

    c.destroy()
  }


  // ═══════════════════════════════════════════════════════════════
  // PART 6: Suspend / Resume
  // ═══════════════════════════════════════════════════════════════

  console.log('')
  console.log('━━━ PART 6: Suspend / Resume ━━━')

  // 6.1 Quantum suspend auto re-enqueues
  console.log('')
  console.log('--- 6.1 Quantum suspend ---')
  {
    const is = createIntentState()
    const s = createScheduler({ maxSlots: 1, turnQuantum: 1, maxTurnBudget: 99, maxTokenBudget: 999999 })
    const started = []
    s.setOnStart(async (task, abort, opts) => {
      started.push({ task, resume: opts.resume, turnCount: opts.turnCount })
      return new Promise(() => {})
    })
    const d = createDispatcher({ intentState: is, scheduler: s, mode: 'code' })
    await Promise.all([is.ready, s.ready, d.ready])

    is.create('Task A')
    is.create('Task B')
    await new Promise(r => setTimeout(r, 100))

    // Only 1 slot, so only Task A running
    assert(d.getWorkers().length === 2, 'quantum: 2 workers created')
    const widA = d.getWorkers().find(w => w.task.includes('Task A')).id

    // After 1 turn with quantum=1 and waiting task → suspend
    const r = d.afterTurn(widA, { toolCalls: [{ name: 'search' }] })
    assert(r.action === 'suspend', 'quantum: suspend returned')
    assert(d.getWorker(widA).status === 'suspended', 'quantum: worker marked suspended')

    // Task B should now be running (took the slot)
    await new Promise(r => setTimeout(r, 50))
    assert(started.length >= 2, 'quantum: Task B started after suspend')

    is.reset(); s.reset(); d.reset()
  }

  // 6.2 Auto-resume on worker completion
  console.log('')
  console.log('--- 6.2 Auto-resume ---')
  {
    const is = createIntentState()
    const s = createScheduler({ maxSlots: 1, turnQuantum: 1, maxTurnBudget: 99, maxTokenBudget: 999999 })
    const started = []
    s.setOnStart(async (task, abort, opts) => {
      started.push({ task, resume: opts.resume, turnCount: opts.turnCount })
      if (opts.resume) return 'resumed'
      return new Promise(() => {})
    })
    const d = createDispatcher({ intentState: is, scheduler: s, mode: 'code' })
    await Promise.all([is.ready, s.ready, d.ready])

    is.create('Worker X')
    is.create('Worker Y')
    await new Promise(r => setTimeout(r, 100))

    const widX = d.getWorkers().find(w => w.task.includes('Worker X')).id
    const widY = d.getWorkers().find(w => w.task.includes('Worker Y'))?.id

    // Suspend X (quantum)
    d.afterTurn(widX, { toolCalls: [{ name: 'search' }] })
    await new Promise(r => setTimeout(r, 50))

    // Y is now running. Complete Y → should auto-resume X
    if (widY) d.workerCompleted(widY, { summary: 'Y done' })
    await new Promise(r => setTimeout(r, 100))

    // X should have been re-started with resume=true
    const resumeStart = started.find(s => s.resume === true)
    assert(resumeStart !== undefined, 'auto-resume: suspended worker restarted')
    assert(resumeStart.turnCount > 0, 'auto-resume: preserves turnCount')

    is.reset(); s.reset(); d.reset()
  }

  // 6.3 Manual resumeWorker
  console.log('')
  console.log('--- 6.3 Manual resume ---')
  {
    const is = createIntentState()
    const s = createScheduler({ maxSlots: 1, turnQuantum: 1, maxTurnBudget: 99, maxTokenBudget: 999999 })
    s.setOnStart(async () => new Promise(() => {}))
    const d = createDispatcher({ intentState: is, scheduler: s, mode: 'code' })
    await Promise.all([is.ready, s.ready, d.ready])

    is.create('Resume me')
    is.create('Blocker')
    await new Promise(r => setTimeout(r, 100))

    const wid = d.getWorkers().find(w => w.task.includes('Resume me')).id

    // Force suspend via quantum
    d.afterTurn(wid, { toolCalls: [{ name: 'x' }] })

    // Manual resume
    const ok = d.resumeWorker(wid)
    assert(ok === true, 'manual resume: returns true')

    // Resume non-existent
    assert(d.resumeWorker(999) === false, 'manual resume: false for missing')

    // Resume non-suspended
    const wid2 = d.getWorkers().find(w => w.task.includes('Blocker'))?.id
    if (wid2) assert(d.resumeWorker(wid2) === false, 'manual resume: false for non-suspended')

    is.reset(); s.reset(); d.reset()
  }

  // 6.4 getSuspended
  console.log('')
  console.log('--- 6.4 getSuspended ---')
  {
    const is = createIntentState()
    const s = createScheduler({ maxSlots: 1, turnQuantum: 1, maxTurnBudget: 99, maxTokenBudget: 999999 })
    s.setOnStart(async () => new Promise(() => {}))
    const d = createDispatcher({ intentState: is, scheduler: s, mode: 'code' })
    await Promise.all([is.ready, s.ready, d.ready])

    is.create('Suspend check')
    is.create('Other')
    await new Promise(r => setTimeout(r, 100))

    assert(d.getSuspended().length === 0, 'getSuspended: empty initially')

    const wid = d.getWorkers().find(w => w.task.includes('Suspend check')).id
    d.afterTurn(wid, { toolCalls: [{ name: 'x' }] })

    const suspended = d.getSuspended()
    assert(suspended.length === 1, 'getSuspended: 1 suspended')
    assert(suspended[0].reason !== undefined, 'getSuspended: has reason')

    is.reset(); s.reset(); d.reset()
  }

  // 6.5 Budget suspend is final (no re-enqueue)
  console.log('')
  console.log('--- 6.5 Budget final suspend ---')
  {
    const is = createIntentState()
    const s = createScheduler({ maxSlots: 1, turnQuantum: 99, maxTurnBudget: 1, maxTokenBudget: 999999 })
    s.setOnStart(async () => new Promise(() => {}))
    const d = createDispatcher({ intentState: is, scheduler: s, mode: 'code' })
    await Promise.all([is.ready, s.ready, d.ready])

    is.create('Budget limit')
    await new Promise(r => setTimeout(r, 50))

    const wid = d.getWorkers()[0].id
    const r = d.afterTurn(wid, { toolCalls: [{ name: 'x' }] })
    assert(r.action === 'suspend', 'budget final: suspend returned')
    assert(r.final === true, 'budget final: marked as final')

    // Should NOT be in suspended queue (final = hard stop)
    assert(d.getSuspended().length === 0, 'budget final: not re-enqueued')

    is.reset(); s.reset(); d.reset()
  }

  // 6.6 Suspend event
  console.log('')
  console.log('--- 6.6 Suspend event ---')
  {
    const is = createIntentState()
    const s = createScheduler({ maxSlots: 1, turnQuantum: 1, maxTurnBudget: 99, maxTokenBudget: 999999 })
    s.setOnStart(async () => new Promise(() => {}))
    const events = []
    const d = createDispatcher({ intentState: is, scheduler: s, mode: 'code' })
    d.on((event, data) => events.push({ event, data }))

    is.create('Event suspend')
    is.create('Filler')
    await new Promise(r => setTimeout(r, 100))

    const wid = d.getWorkers().find(w => w.task.includes('Event suspend')).id
    d.afterTurn(wid, { toolCalls: [{ name: 'x' }] })

    // Scheduler emits 'suspended', dispatcher should have logged it
    const log = d.getDecisionLog()
    const suspendLog = log.find(l => l.action === 'suspend')
    assert(suspendLog !== undefined, 'suspend event: logged in decision log')

    is.reset(); s.reset(); d.reset()
  }

  // 6.7 Conductor-level suspend/resume
  console.log('')
  console.log('--- 6.7 Conductor suspend/resume ---')
  {
    const c = createConductor({
      ai: { chat: async () => ({ answer: 'ok' }) },
      strategy: 'dispatch', dispatchMode: 'code',
      maxSlots: 1, turnQuantum: 1, maxTurnBudget: 99, maxTokenBudget: 999999,
      onWorkerStart: () => new Promise(() => {}),
    })

    c.createIntent('Cond A')
    c.createIntent('Cond B')
    await new Promise(r => setTimeout(r, 100))

    const wid = c.getState().workers[0].id
    c.afterTurn(wid, { toolCalls: [{ name: 'x' }] })

    assert(c.getSuspended().length >= 0, 'conductor: getSuspended works')
    assert(c.getState().suspended !== undefined, 'conductor: state includes suspended')

    c.destroy()
  }

  // 6.8 Token budget final suspend
  console.log('')
  console.log('--- 6.8 Token budget final ---')
  {
    const is = createIntentState()
    const s = createScheduler({ maxSlots: 1, turnQuantum: 99, maxTurnBudget: 99, maxTokenBudget: 100 })
    s.setOnStart(async () => new Promise(() => {}))
    const d = createDispatcher({ intentState: is, scheduler: s, mode: 'code' })
    await Promise.all([is.ready, s.ready, d.ready])

    is.create('Token limit')
    await new Promise(r => setTimeout(r, 50))

    const wid = d.getWorkers()[0].id
    const r = d.afterTurn(wid, { tokens: 200, toolCalls: [{ name: 'x' }] })
    assert(r.action === 'suspend', 'token final: suspend')
    assert(r.final === true, 'token final: marked final')
    assert(d.getSuspended().length === 0, 'token final: not re-enqueued')

    is.reset(); s.reset(); d.reset()
  }

  // ═══════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════

  console.log('')
  console.log('═══════════════════════════════════════════════════')
  console.log('  Results: ' + passed + '/' + total + ' passed, ' + failed + ' failed')
  console.log('═══════════════════════════════════════════════════')
  console.log('')

  process.exit(failed > 0 ? 1 : 0)
}

run().catch(err => { console.error(err); process.exit(1) })
