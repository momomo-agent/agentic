/* test-conductor.js — End-to-end tests for agentic-conductor */

import { createConductor } from '../src/conductor.js'

let passed = 0, failed = 0, total = 0
function assert(cond, msg) {
  total++
  if (cond) { passed++; console.log(`  ✅ ${msg}`) }
  else { failed++; console.error(`  ❌ ${msg}`) }
}

// Helper: collect generator into { reply, intents, usage }
async function chatAll(conductor, input, opts) {
  let reply = '', intents = [], usage
  for await (const chunk of conductor.chat(input, opts || {})) {
    if (chunk.type === 'done') { reply = chunk.reply; intents = chunk.intents || []; usage = chunk.usage }
  }
  return { reply, intents, usage }
}

// Mock AI that parses intent blocks
function createMockAI(responses = {}) {
  let callCount = 0
  return {
    calls: [],
    chat(messages, opts) {
      callCount++
      const lastMsg = messages[messages.length - 1]?.content || ''
      const key = Object.keys(responses).find(k => lastMsg.includes(k))
      const answer = key ? responses[key] : 'OK, I understand.'
      this.calls.push({ messages, opts, answer })
      // Return async generator (unified chat interface)
      const self = this
      return (async function* () {
        yield { type: 'text_delta', text: answer }
        yield { type: 'done', answer, usage: { input_tokens: 100, output_tokens: 50 } }
      })()
    },
    get callCount() { return callCount },
  }
}

async function runTests() {
  console.log('\n═══════════════════════════════════════════════════')
  console.log('  Test Suite: agentic-conductor')
  console.log('═══════════════════════════════════════════════════\n')

  // ═══════════════════════════════════════════════════════════════
  // Test 1: Single strategy — direct LLM
  // ═══════════════════════════════════════════════════════════════

  console.log('--- Test 1: Single strategy ---')
  {
    const ai = createMockAI({ 'hello': 'Hi there!' })
    const c = createConductor({ ai, strategy: 'single' })

    const r = await chatAll(c, 'hello')
    assert(r.reply === 'Hi there!', 'Single mode returns direct reply')
    assert(r.intents.length === 0, 'Single mode has no intents')
    assert(c.getState().strategy === 'single', 'State shows single strategy')
    c.destroy()
  }

  // ═══════════════════════════════════════════════════════════════
  // Test 2: Dispatch strategy — intent creation
  // ═══════════════════════════════════════════════════════════════

  console.log('\n--- Test 2: Dispatch — intent creation ---')
  {
    const ai = createMockAI({
      'search AI': `Sure, I'll search for AI news.\n\`\`\`intents\n[{"action":"create","goal":"Search AI news","priority":1}]\n\`\`\``,
    })
    const spawned = []
    const c = createConductor({
      ai,
      strategy: 'dispatch',
      dispatchMode: 'code',
      onWorkerStart: (task, abort, opts) => {
        spawned.push({ task, opts })
        return new Promise(() => {}) // never resolves
      },
    })

    const r = await chatAll(c, 'search AI news')
    assert(r.reply.includes("I'll search"), 'Reply text preserved')
    assert(!r.reply.includes('intents'), 'Intents block stripped from reply')
    assert(r.intents.length === 1, 'One intent created')
    assert(r.intents[0].goal === 'Search AI news', 'Intent goal correct')

    // Worker should have been spawned
    await new Promise(r => setTimeout(r, 50))
    assert(spawned.length === 1, 'Worker spawned')
    assert(spawned[0].task.includes('Search AI news'), 'Worker task matches intent')

    c.destroy()
  }

  // ═══════════════════════════════════════════════════════════════
  // Test 3: Dispatch — dependencies
  // ═══════════════════════════════════════════════════════════════

  console.log('\n--- Test 3: Dispatch — dependencies ---')
  {
    const spawned = []
    const ai = createMockAI({
      'search and report': `I'll search first, then write a report.\n\`\`\`intents\n[{"action":"create","goal":"Search news","priority":1},{"action":"create","goal":"Write report","dependsOn":["intent-1"],"priority":2}]\n\`\`\``,
    })
    const c = createConductor({
      ai,
      strategy: 'dispatch',
      dispatchMode: 'code',
      onWorkerStart: (task, abort, opts) => {
        spawned.push({ task, opts })
        return new Promise(() => {})
      },
    })

    const r = await chatAll(c, 'search and report')
    assert(r.intents.length === 2, 'Two intents created')

    await new Promise(r => setTimeout(r, 50))
    assert(spawned.length === 1, 'Only first worker spawned (second waiting on dep)')
    assert(spawned[0].task.includes('Search news'), 'First worker is search')

    // Complete the first worker
    const workerId = spawned[0].opts.workerId
    c.completeWorker(workerId, { summary: 'Found 5 articles' })

    await new Promise(r => setTimeout(r, 50))
    assert(spawned.length === 2, 'Second worker spawned after dep completed')
    assert(spawned[1].task.includes('Write report'), 'Second worker is report')
    assert(spawned[1].task.includes('Found 5 articles'), 'Dep context injected')

    c.destroy()
  }

  // ═══════════════════════════════════════════════════════════════
  // Test 4: Dispatch — cancel
  // ═══════════════════════════════════════════════════════════════

  console.log('\n--- Test 4: Dispatch — cancel ---')
  {
    const ai = createMockAI({
      'start task': `Starting.\n\`\`\`intents\n[{"action":"create","goal":"Background task"}]\n\`\`\``,
      'cancel': `Cancelled.\n\`\`\`intents\n[{"action":"cancel","id":"intent-1"}]\n\`\`\``,
    })
    const c = createConductor({
      ai,
      strategy: 'dispatch',
      dispatchMode: 'code',
      onWorkerStart: () => new Promise(() => {}),
    })

    await chatAll(c, 'start task')
    assert(c.getIntents().length === 1, 'Intent exists')

    await chatAll(c, 'cancel that')
    const intents = c.getIntents()
    const cancelled = intents.find(i => i.id === 'intent-1')
    assert(cancelled?.status === 'cancelled', 'Intent cancelled')

    c.destroy()
  }

  // ═══════════════════════════════════════════════════════════════
  // Test 5: Turn management — beforeTurn / afterTurn
  // ═══════════════════════════════════════════════════════════════

  console.log('\n--- Test 5: Turn management ---')
  {
    let workerOpts = null
    const ai = createMockAI({
      'do work': `On it.\n\`\`\`intents\n[{"action":"create","goal":"Do work"}]\n\`\`\``,
    })
    const c = createConductor({
      ai,
      strategy: 'dispatch',
      dispatchMode: 'code',
      onWorkerStart: (task, abort, opts) => {
        workerOpts = opts
        return new Promise(() => {})
      },
    })

    await chatAll(c, 'do work')
    await new Promise(r => setTimeout(r, 50))
    assert(workerOpts !== null, 'Worker started with opts')

    const wid = workerOpts.workerId
    const pre = c.beforeTurn(wid)
    assert(pre.action === 'continue', 'beforeTurn returns continue')

    const post = c.afterTurn(wid, { tokens: 1000, progress: 'Working...' })
    assert(post.action === 'continue', 'afterTurn returns continue')

    c.destroy()
  }

  // ═══════════════════════════════════════════════════════════════
  // Test 6: State inspection
  // ═══════════════════════════════════════════════════════════════

  console.log('\n--- Test 6: State inspection ---')
  {
    const ai = createMockAI({
      'task': `OK.\n\`\`\`intents\n[{"action":"create","goal":"Test task"}]\n\`\`\``,
    })
    const c = createConductor({
      ai,
      strategy: 'dispatch',
      dispatchMode: 'code',
      onWorkerStart: () => new Promise(() => {}),
    })

    await chatAll(c, 'task')
    await new Promise(r => setTimeout(r, 50))

    const state = c.getState()
    assert(state.strategy === 'dispatch', 'Strategy is dispatch')
    assert(state.intents.length === 1, 'One intent in state')
    assert(state.workers.length === 1, 'One worker in state')
    assert(state.scheduler.slots.length === 1, 'One slot occupied')

    c.destroy()
  }

  // ═══════════════════════════════════════════════════════════════
  // Test 7: Direct intent API (no Talker)
  // ═══════════════════════════════════════════════════════════════

  console.log('\n--- Test 7: Direct intent API ---')
  {
    const spawned = []
    const ai = createMockAI({})
    const c = createConductor({
      ai,
      strategy: 'dispatch',
      dispatchMode: 'code',
      onWorkerStart: (task) => { spawned.push(task); return new Promise(() => {}) },
    })

    const i1 = c.createIntent('Direct task A')
    assert(i1.id === 'intent-1', 'Direct intent created')

    await new Promise(r => setTimeout(r, 50))
    assert(spawned.length === 1, 'Worker spawned from direct intent')

    c.destroy()
  }

  // ═══════════════════════════════════════════════════════════════
  // Test 8: Events
  // ═══════════════════════════════════════════════════════════════

  console.log('\n--- Test 8: Events ---')
  {
    const events = []
    const ai = createMockAI({
      'event test': `OK.\n\`\`\`intents\n[{"action":"create","goal":"Event task"}]\n\`\`\``,
    })
    const c = createConductor({
      ai,
      strategy: 'dispatch',
      dispatchMode: 'code',
      onWorkerStart: () => new Promise(() => {}),
    })

    c.on((event, data) => events.push(event))
    await chatAll(c, 'event test')
    await new Promise(r => setTimeout(r, 50))

    assert(events.includes('chat'), 'Chat event emitted')
    assert(events.some(e => e.startsWith('dispatcher.')), 'Dispatcher events forwarded')
    assert(events.some(e => e.startsWith('scheduler.')), 'Scheduler events forwarded')

    c.destroy()
  }

  // ═══════════════════════════════════════════════════════════════
  // Test 9: Cascade failure
  // ═══════════════════════════════════════════════════════════════

  console.log('\n--- Test 9: Cascade failure ---')
  {
    const ai = createMockAI({
      'cascade': `OK.\n\`\`\`intents\n[{"action":"create","goal":"Task A"},{"action":"create","goal":"Task B","dependsOn":["intent-1"]}]\n\`\`\``,
    })
    const c = createConductor({
      ai,
      strategy: 'dispatch',
      dispatchMode: 'code',
      onWorkerStart: (task, abort, opts) => new Promise(() => {}),
    })

    await chatAll(c, 'cascade test')
    await new Promise(r => setTimeout(r, 50))

    // Fail worker A
    const workers = c.getState().workers
    const wA = workers.find(w => w.task.includes('Task A'))
    c.failWorker(wA.id, 'test error')

    await new Promise(r => setTimeout(r, 50))
    const intents = c.getIntents()
    const iA = intents.find(i => i.goal === 'Task A')
    const iB = intents.find(i => i.goal === 'Task B')
    assert(iA.status === 'failed', 'Task A failed')
    assert(iB.status === 'failed', 'Task B cascade failed')

    c.destroy()
  }

  // ═══════════════════════════════════════════════════════════════
  // Test 10: No intents in simple reply
  // ═══════════════════════════════════════════════════════════════

  console.log('\n--- Test 10: Simple reply (no intents) ---')
  {
    const ai = createMockAI({ 'what is': 'The capital of France is Paris.' })
    const c = createConductor({
      ai,
      strategy: 'dispatch',
      dispatchMode: 'code',
      onWorkerStart: () => new Promise(() => {}),
    })

    const r = await chatAll(c, 'what is the capital of France')
    assert(r.reply === 'The capital of France is Paris.', 'Direct answer returned')
    assert(r.intents.length === 0, 'No intents for simple question')

    c.destroy()
  }

  // ═══════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════

  console.log('\n═══════════════════════════════════════════════════')
  console.log(`  Results: ${passed}/${total} passed, ${failed} failed`)
  console.log('═══════════════════════════════════════════════════\n')

  process.exit(failed > 0 ? 1 : 0)
}

runTests().catch(err => { console.error(err); process.exit(1) })
