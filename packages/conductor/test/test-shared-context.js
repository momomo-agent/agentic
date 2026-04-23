/**
 * Test shared personality + worker context features
 */
import { createConductor, memoryStore } from '../src/conductor.js'

let passed = 0, failed = 0
function assert(cond, msg) {
  if (cond) { console.log(`  ✅ ${msg}`); passed++ }
  else { console.log(`  ❌ ${msg}`); console.trace(); failed++ }
}

const mockAi = (reply) => ({
  chat: async (msgs, opts) => ({ answer: reply, content: reply, text: reply, usage: {} }),
})

console.log('═══════════════════════════════════════════════════')
console.log('  Test: Shared Personality + Worker Context')
console.log('═══════════════════════════════════════════════════')

// --- Test 1: personality in Talker prompt ---
console.log('\n--- Test 1: Personality parameter ---')
{
  let capturedSystem = ''
  const ai = {
    chat: async (msgs, opts) => {
      capturedSystem = opts.system || ''
      return { answer: 'Hello!', usage: {} }
    }
  }
  const c = createConductor({
    ai, personality: 'You are Space, warm and anticipatory.',
    tools: [{ name: 'web_search', description: 'Search the web' }],
  })
  await c.chat('hi')
  assert(capturedSystem.includes('You are Space, warm and anticipatory'), 'personality injected into Talker system')
  assert(capturedSystem.includes('web_search: Search the web'), 'capability list injected')
  c.destroy()
}

// --- Test 2: buildWorkerSystem includes personality ---
console.log('\n--- Test 2: buildWorkerSystem ---')
{
  const c = createConductor({
    ai: mockAi('ok'),
    personality: 'You are Momo, curious and warm.',
    workerDirectives: 'Execute tasks using tools. Be thorough.',
  })
  const ws = c.buildWorkerSystem()
  assert(ws.includes('You are Momo, curious and warm'), 'worker system has personality')
  assert(ws.includes('Execute tasks using tools'), 'worker system has directives')
  c.destroy()
}

// --- Test 3: Worker messages stored via afterTurn ---
console.log('\n--- Test 3: Worker messages via afterTurn ---')
{
  let workerStarted = null
  const c = createConductor({
    ai: mockAi('```intents\n[{"action":"create","goal":"search news"}]\n```'),
    tools: [],
    dispatchMode: 'code',
    onWorkerStart: (task, abort, opts) => {
      workerStarted = opts
      return new Promise(() => {}) // never resolves, we test manually
    },
  })
  await c.chat('search news')
  // Wait for scheduler to process
  await new Promise(r => setTimeout(r, 50))
  // Worker should have been spawned
  assert(workerStarted !== null, 'worker started')
  const wid = workerStarted.workerId

  // Simulate afterTurn with messages
  const fakeMessages = [
    { role: 'user', content: 'search news' },
    { role: 'assistant', content: 'Let me search for that.' },
    { role: 'tool', content: '{"results": [{"title": "AI breakthrough", "url": "https://example.com"}]}' },
  ]
  c.afterTurn(wid, { toolCalls: [{ name: 'web_search' }], messages: fakeMessages })

  // getWorkerContext should return formatted context
  const ctx = c.getWorkerContext()
  assert(typeof ctx === 'string', 'getWorkerContext returns string')
  assert(ctx.includes('AI breakthrough'), 'worker context includes tool result')
  assert(ctx.includes('Let me search'), 'worker context includes assistant message')

  // getWorkerContext with specific wid returns raw messages
  const rawMsgs = c.getWorkerContext(wid)
  assert(Array.isArray(rawMsgs), 'getWorkerContext(wid) returns array')
  assert(rawMsgs.length === 3, 'all 3 messages stored')
  c.destroy()
}

// --- Test 4: Worker context injected into Talker during chat ---
console.log('\n--- Test 4: Worker context in Talker chat ---')
{
  let capturedSystem = ''
  let callCount = 0
  const ai = {
    chat: async (msgs, opts) => {
      callCount++
      capturedSystem = opts.system || ''
      if (callCount === 1) return { answer: '```intents\n[{"action":"create","goal":"fetch weather"}]\n```', usage: {} }
      return { answer: 'The weather is 23°C', usage: {} }
    }
  }
  let workerOpts = null
  const c = createConductor({
    ai,
    tools: [{ name: 'get_weather', description: 'Get weather data' }],
    dispatchMode: 'code',
    onWorkerStart: (task, abort, opts) => {
      workerOpts = opts
      return new Promise(() => {})
    },
  })

  // First chat creates intent
  await c.chat('what is the weather?')
  await new Promise(r => setTimeout(r, 50))
  const wid = workerOpts.workerId

  // Simulate worker doing work
  c.afterTurn(wid, {
    toolCalls: [{ name: 'get_weather' }],
    messages: [
      { role: 'assistant', content: 'Checking weather...' },
      { role: 'tool', content: '{"temp":"23°C","city":"Beijing"}' },
    ],
  })

  // Second chat should see worker context
  await c.chat('how is it going?')
  assert(capturedSystem.includes('Worker Activity'), 'worker activity section in Talker prompt')
  assert(capturedSystem.includes('23°C') || capturedSystem.includes('Beijing'), 'worker tool results visible to Talker')
  c.destroy()
}

// --- Test 5: talkerDirectives override default ---
console.log('\n--- Test 5: talkerDirectives override ---')
{
  let capturedSystem = ''
  const ai = {
    chat: async (msgs, opts) => {
      capturedSystem = opts.system || ''
      return { answer: 'ok', usage: {} }
    }
  }
  const c = createConductor({
    ai,
    talkerDirectives: 'You are a custom Talker. Output intents as JSON.',
  })
  await c.chat('hi')
  assert(capturedSystem.includes('You are a custom Talker'), 'custom talkerDirectives used')
  assert(!capturedSystem.includes('task-aware AI assistant'), 'default TALKER_SYSTEM not used')
  c.destroy()
}

// --- Test 6: workerCompleted event includes messages ---
console.log('\n--- Test 6: workerCompleted event has messages ---')
{
  let doneEvent = null
  const c = createConductor({
    ai: mockAi('```intents\n[{"action":"create","goal":"do stuff"}]\n```'),
    tools: [],
    dispatchMode: 'code',
    onWorkerStart: (task, abort, opts) => {
      return new Promise(() => {})
    },
  })
  c.on((event, data) => {
    if (event === 'dispatcher.done') doneEvent = data
  })
  await c.chat('do stuff')
  await new Promise(r => setTimeout(r, 50))
  const workers = c.getState().workers
  assert(workers.length > 0, 'worker exists')
  const wid = workers[0].id

  // Feed messages then complete
  c.afterTurn(wid, {
    toolCalls: [],
    messages: [{ role: 'assistant', content: 'Done with the task' }],
  })
  c.completeWorker(wid, { summary: 'Task completed' })

  assert(doneEvent !== null, 'done event emitted')
  assert(Array.isArray(doneEvent.messages), 'done event has messages array')
  assert(doneEvent.messages.length === 1, 'done event has 1 message')
  assert(doneEvent.messages[0].content === 'Done with the task', 'message content preserved')
  c.destroy()
}

// --- Test 7: Messages capped at 20 ---
console.log('\n--- Test 7: Messages capped at 20 ---')
{
  const c = createConductor({
    ai: mockAi('```intents\n[{"action":"create","goal":"big task"}]\n```'),
    tools: [],
    dispatchMode: 'code',
    onWorkerStart: (task, abort, opts) => new Promise(() => {}),
  })
  await c.chat('big task')
  await new Promise(r => setTimeout(r, 50))
  const wid = c.getState().workers[0].id

  // Feed 30 messages
  const msgs = Array.from({ length: 30 }, (_, i) => ({ role: 'assistant', content: `msg ${i}` }))
  c.afterTurn(wid, { toolCalls: [], messages: msgs })

  const stored = c.getWorkerContext(wid)
  assert(stored.length === 20, 'messages capped at 20')
  assert(stored[0].content === 'msg 10', 'oldest messages trimmed')
  c.destroy()
}

console.log('\n═══════════════════════════════════════════════════')
console.log(`  Results: ${passed}/${passed + failed} passed, ${failed} failed`)
console.log('═══════════════════════════════════════════════════')
process.exit(failed > 0 ? 1 : 0)
