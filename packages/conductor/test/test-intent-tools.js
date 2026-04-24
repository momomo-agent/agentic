/**
 * Test intent tool calling mode (intentMode: 'tools')
 */
import { createConductor } from '../src/conductor.js'

let passed = 0, failed = 0
function assert(cond, msg) {
  if (cond) { console.log(`  ✅ ${msg}`); passed++ }
  else { console.log(`  ❌ ${msg}`); console.trace(); failed++ }
}

console.log('═══════════════════════════════════════════════════')
console.log('  Test: Intent Tool Calling Mode')
console.log('═══════════════════════════════════════════════════')

// --- Test 1: Tools mode — simple reply (no tool calls) ---
console.log('\n--- Test 1: Simple reply (no tool calls) ---')
{
  let capturedOpts = null
  const ai = {
    chat: async (msgs, opts) => {
      capturedOpts = opts
      return { answer: 'Hello! How can I help?', tool_calls: [], usage: {} }
    }
  }
  const c = createConductor({ ai, intentMode: 'tools', dispatchMode: 'code' })
  const r = await c.chat('hi')
  assert(r.reply === 'Hello! How can I help?', 'reply preserved')
  assert(r.intents.length === 0, 'no intents created')
  // Verify intent tools were injected
  assert(capturedOpts.tools.some(t => t.name === 'create_intent'), 'create_intent tool injected')
  assert(capturedOpts.tools.some(t => t.name === 'update_intent'), 'update_intent tool injected')
  assert(capturedOpts.tools.some(t => t.name === 'cancel_intent'), 'cancel_intent tool injected')
  c.destroy()
}

// --- Test 2: Tools mode — create intent via tool call ---
console.log('\n--- Test 2: Create intent via tool call ---')
{
  const spawned = []
  const ai = {
    chat: async (msgs, opts) => {
      return {
        answer: "I'll search for AI news for you.",
        tool_calls: [
          { id: 'tc_1', name: 'create_intent', input: { goal: 'Search AI news' } },
        ],
        usage: {},
      }
    }
  }
  const c = createConductor({
    ai, intentMode: 'tools', dispatchMode: 'code',
    onWorkerStart: (task, abort, opts) => { spawned.push({ task, opts }); return new Promise(() => {}) },
  })
  const r = await c.chat('search AI news')
  assert(r.reply === "I'll search for AI news for you.", 'reply preserved')
  assert(r.intents.length === 1, 'one intent created')
  assert(r.intents[0].goal === 'Search AI news', 'intent goal correct')
  await new Promise(r => setTimeout(r, 50))
  assert(spawned.length === 1, 'worker spawned')
  assert(spawned[0].task === 'Search AI news', 'worker task matches')
  c.destroy()
}

// --- Test 3: Tools mode — multiple intents with dependencies ---
console.log('\n--- Test 3: Multiple intents with dependencies ---')
{
  const spawned = []
  let firstIntentId = null
  const ai = {
    chat: async (msgs, opts) => {
      return {
        answer: "I'll search and then write a report.",
        tool_calls: [
          { id: 'tc_1', name: 'create_intent', input: { goal: 'Search AI news' } },
          { id: 'tc_2', name: 'create_intent', input: { goal: 'Write report', dependsOn: ['1'], priority: 2 } },
        ],
        usage: {},
      }
    }
  }
  const c = createConductor({
    ai, intentMode: 'tools', dispatchMode: 'code',
    onWorkerStart: (task, abort, opts) => { spawned.push({ task, opts }); return new Promise(() => {}) },
  })
  const r = await c.chat('search and report')
  assert(r.intents.length === 2, 'two intents created')
  assert(r.intents[0].goal === 'Search AI news', 'first intent goal')
  assert(r.intents[1].goal === 'Write report', 'second intent goal')
  assert(r.intents[1].dependsOn.includes('1'), 'dependency set')
  await new Promise(r => setTimeout(r, 50))
  assert(spawned.length === 1, 'only first worker spawned (second waiting)')
  c.destroy()
}

// --- Test 4: Tools mode — update intent ---
console.log('\n--- Test 4: Update intent ---')
{
  let callCount = 0
  const ai = {
    chat: async (msgs, opts) => {
      callCount++
      if (callCount === 1) {
        return {
          answer: "Creating task.",
          tool_calls: [{ id: 'tc_1', name: 'create_intent', input: { goal: 'Search news' } }],
          usage: {},
        }
      }
      return {
        answer: "Updated the task.",
        tool_calls: [{ id: 'tc_2', name: 'update_intent', input: { id: '1', message: 'Focus on AI agents' } }],
        usage: {},
      }
    }
  }
  const c = createConductor({
    ai, intentMode: 'tools', dispatchMode: 'code',
    onWorkerStart: () => new Promise(() => {}),
  })
  await c.chat('search news')
  await new Promise(r => setTimeout(r, 50))
  await c.chat('focus on AI agents')
  const intents = c.getIntents()
  assert(intents[0].messages?.length > 0 || intents[0].goal === 'Search news', 'intent updated')
  c.destroy()
}

// --- Test 5: Cancel intent via tool call ---
console.log('\n--- Test 5: Cancel intent ---')
{
  let capturedIntentId = null
  const ai = {
    chat: async (msgs, opts) => {
      // Return cancel tool call using the actual intent id from tool result in history
      const toolResult = msgs.find(m => m.role === 'tool')
      if (toolResult) {
        const data = JSON.parse(toolResult.content)
        capturedIntentId = data.intentId
        return { answer: 'Cancelled.', tool_calls: [{ id: 'tc_2', name: 'cancel_intent', input: { id: capturedIntentId } }], usage: {} }
      }
      return { answer: 'Creating.', tool_calls: [{ id: 'tc_1', name: 'create_intent', input: { goal: 'Search news' } }], usage: {} }
    }
  }
  const c = createConductor({ ai, intentMode: 'tools', dispatchMode: 'llm' })
  await c.chat('search news')  // creates intent, tool result has intentId
  await c.chat('cancel that')  // cancels using id from history
  const intents = c.getIntents()
  const status = intents[0]?.status
  assert(status === 'cancelled', `intent cancelled (got ${status})`)
  c.destroy()
}

// --- Test 6: Tools mode — tool results in conversation history ---
console.log('\n--- Test 6: Tool results in history ---')
{
  let capturedMsgs = null
  let callCount = 0
  const ai = {
    chat: async (msgs, opts) => {
      callCount++
      capturedMsgs = msgs
      if (callCount === 1) {
        return {
          answer: "Creating task.",
          tool_calls: [{ id: 'tc_1', name: 'create_intent', input: { goal: 'Do stuff' } }],
          usage: {},
        }
      }
      return { answer: "Sure, what about it?", tool_calls: [], usage: {} }
    }
  }
  const c = createConductor({
    ai, intentMode: 'tools', dispatchMode: 'code',
    onWorkerStart: () => new Promise(() => {}),
  })
  await c.chat('do stuff')
  await new Promise(r => setTimeout(r, 50))
  await c.chat('how is it going?')
  // Second call should have tool results in history
  assert(capturedMsgs.length >= 4, 'history has user + assistant + tool_result + user')
  const toolMsg = capturedMsgs.find(m => m.role === 'tool')
  assert(toolMsg !== undefined, 'tool result message in history')
  assert(toolMsg.content.includes('created'), 'tool result has created confirmation')
  c.destroy()
}

// --- Test 7: Tools mode — system prompt uses TALKER_SYSTEM_TOOLS ---
console.log('\n--- Test 7: System prompt for tools mode ---')
{
  let capturedSystem = ''
  const ai = {
    chat: async (msgs, opts) => {
      capturedSystem = opts.system || ''
      return { answer: 'ok', tool_calls: [], usage: {} }
    }
  }
  const c = createConductor({ ai, intentMode: 'tools' })
  await c.chat('hi')
  assert(capturedSystem.includes('intent tools'), 'tools mode system prompt mentions intent tools')
  assert(!capturedSystem.includes('JSON block'), 'tools mode does NOT mention JSON block')
  c.destroy()
}

// --- Test 8: Parse mode still works (backward compat) ---
console.log('\n--- Test 8: Parse mode backward compat ---')
{
  let capturedSystem = ''
  const ai = {
    chat: async (msgs, opts) => {
      capturedSystem = opts.system || ''
      return { answer: 'ok', usage: {} }
    }
  }
  const c = createConductor({ ai, intentMode: 'parse' })
  await c.chat('hi')
  assert(capturedSystem.includes('JSON block'), 'parse mode system prompt mentions JSON block')
  assert(!capturedSystem.includes('intent tools'), 'parse mode does NOT mention intent tools')
  c.destroy()
}

// --- Test 9: Default intentMode is 'parse' ---
console.log('\n--- Test 9: Default intentMode ---')
{
  let capturedSystem = ''
  const ai = {
    chat: async (msgs, opts) => {
      capturedSystem = opts.system || ''
      return { answer: 'ok', usage: {} }
    }
  }
  const c = createConductor({ ai })
  await c.chat('hi')
  assert(capturedSystem.includes('JSON block'), 'default mode is parse')
  c.destroy()
}

// --- Test 10: Tools mode — no reply text, only tool calls ---
console.log('\n--- Test 10: Tool calls without reply text ---')
{
  const spawned = []
  const ai = {
    chat: async () => ({
      answer: '',
      tool_calls: [{ id: 'tc_1', name: 'create_intent', input: { goal: 'Background task' } }],
      usage: {},
    })
  }
  const c = createConductor({
    ai, intentMode: 'tools', dispatchMode: 'code',
    onWorkerStart: (task, abort, opts) => { spawned.push(task); return new Promise(() => {}) },
  })
  const r = await c.chat('do this in background')
  assert(r.intents.length === 1, 'intent created even without reply text')
  assert(r.reply === '', 'empty reply preserved')
  await new Promise(r => setTimeout(r, 50))
  assert(spawned.length === 1, 'worker spawned')
  c.destroy()
}

console.log('\n═══════════════════════════════════════════════════')
console.log(`  Results: ${passed}/${passed + failed} passed, ${failed} failed`)
console.log('═══════════════════════════════════════════════════')
process.exit(failed > 0 ? 1 : 0)
