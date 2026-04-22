/* test-store.js — Test store-based persistence */

const { createConductor, memoryStore } = require('./conductor')

let passed = 0, failed = 0, total = 0
function assert(cond, msg) {
  total++
  if (cond) { passed++; console.log(`  ✅ ${msg}`) }
  else { failed++; console.error(`  ❌ ${msg}`) }
}

function createMockAI() {
  return {
    chat(messages) {
      const last = messages[messages.length - 1]?.content || ''
      if (last.includes('create task')) {
        return Promise.resolve({ answer: `OK.\n\`\`\`intents\n[{"action":"create","goal":"Persistent task"}]\n\`\`\`` })
      }
      return Promise.resolve({ answer: 'OK' })
    },
  }
}

async function runTests() {
  console.log('\n═══════════════════════════════════════════════════')
  console.log('  Test Suite: Store Persistence')
  console.log('═══════════════════════════════════════════════════\n')

  // ═══════════════════════════════════════════════════════════════
  // Test 1: memoryStore basic ops
  // ═══════════════════════════════════════════════════════════════

  console.log('--- Test 1: memoryStore basic ops ---')
  {
    const store = memoryStore()
    await store.set('key1', 'value1')
    const v = await store.get('key1')
    assert(v === 'value1', 'get returns set value')

    assert(await store.has('key1') === true, 'has returns true for existing key')
    assert(await store.has('nope') === false, 'has returns false for missing key')

    const keys = await store.keys()
    assert(keys.includes('key1'), 'keys includes set key')

    await store.delete('key1')
    assert(await store.get('key1') === null, 'get returns null after delete')
  }

  // ═══════════════════════════════════════════════════════════════
  // Test 2: Shared store across conductor instances
  // ═══════════════════════════════════════════════════════════════

  console.log('\n--- Test 2: Shared store persists state ---')
  {
    const store = memoryStore()
    const ai = createMockAI()

    // First conductor: create an intent
    const c1 = createConductor({
      ai, store, strategy: 'dispatch', dispatchMode: 'code',
      onWorkerStart: () => new Promise(() => {}),
    })

    await c1.chat('create task')
    await new Promise(r => setTimeout(r, 50))

    // Verify store has data
    const intentData = await store.get('conductor/intents')
    assert(intentData !== null, 'Intent data persisted to store')

    const schedulerData = await store.get('conductor/scheduler')
    assert(schedulerData !== null, 'Scheduler data persisted to store')

    const dispatcherData = await store.get('conductor/dispatcher')
    assert(dispatcherData !== null, 'Dispatcher data persisted to store')

    c1.destroy()
  }

  // ═══════════════════════════════════════════════════════════════
  // Test 3: Default store (no store passed)
  // ═══════════════════════════════════════════════════════════════

  console.log('\n--- Test 3: Default memory store ---')
  {
    const ai = createMockAI()
    const c = createConductor({
      ai, strategy: 'dispatch', dispatchMode: 'code',
      onWorkerStart: () => new Promise(() => {}),
    })

    await c.chat('create task')
    await new Promise(r => setTimeout(r, 50))

    const state = c.getState()
    assert(state.intents.length === 1, 'Works without explicit store')

    c.destroy()
  }

  // ═══════════════════════════════════════════════════════════════
  // Test 4: Custom store adapter
  // ═══════════════════════════════════════════════════════════════

  console.log('\n--- Test 4: Custom store adapter ---')
  {
    const log = []
    const customStore = {
      _data: new Map(),
      get(k) { log.push(`get:${k}`); return Promise.resolve(this._data.get(k) ?? null) },
      set(k, v) { log.push(`set:${k}`); this._data.set(k, v); return Promise.resolve() },
      delete(k) { this._data.delete(k); return Promise.resolve() },
      keys() { return Promise.resolve([...this._data.keys()]) },
      has(k) { return Promise.resolve(this._data.has(k)) },
    }

    const ai = createMockAI()
    const c = createConductor({
      ai, store: customStore, strategy: 'dispatch', dispatchMode: 'code',
      onWorkerStart: () => new Promise(() => {}),
    })

    await c.chat('create task')
    await new Promise(r => setTimeout(r, 50))

    assert(log.some(l => l.startsWith('set:conductor/')), 'Custom store set called')
    assert(customStore._data.size > 0, 'Custom store has data')

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
