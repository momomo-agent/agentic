import { test } from 'vitest';
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
// Tests for config hot-reload — DBB-005
import { watchProfiles } from '../../src/detector/profiles.js'

test('hot-reload', async () => {
let passed = 0, failed = 0
const results = []

function test(name, fn) {
  try {
    fn()
    console.log(`  PASS: ${name}`)
    results.push({ name, pass: true })
    passed++
  } catch (e) {
    console.log(`  FAIL: ${name} — ${e.message}`)
    results.push({ name, pass: false, error: e.message })
    failed++
  }
}

async function testAsync(name, fn) {
  try {
    await fn()
    console.log(`  PASS: ${name}`)
    results.push({ name, pass: true })
    passed++
  } catch (e) {
    console.log(`  FAIL: ${name} — ${e.message}`)
    results.push({ name, pass: false, error: e.message })
    failed++
  }
}

function assert(cond, msg) { if (!cond) throw new Error(msg) }

console.log('=== config hot-reload tests (DBB-005) ===\n')

// DBB-005: watchProfiles is exported
test('watchProfiles is a function', () => {
  assert(typeof watchProfiles === 'function', 'watchProfiles not exported')
})

// DBB-005: returns a stop function
test('watchProfiles returns a stop function', () => {
  const mockFetch = async () => ({ status: 304 })
  const orig = globalThis.fetch
  globalThis.fetch = mockFetch
  const stop = watchProfiles({}, () => {}, 100000)
  assert(typeof stop === 'function', 'Should return stop function')
  stop()
  globalThis.fetch = orig
})

// DBB-005: calls onReload when new profile arrives
await testAsync('calls onReload on new profile', async () => {
  const newProfile = { llm: { model: 'new-model' }, stt: {}, tts: {}, fallback: {} }
  const profiles = { profiles: [{ match: {}, config: newProfile }] }

  let reloaded = null
  globalThis.fetch = async () => ({
    status: 200,
    ok: true,
    headers: { get: () => 'etag-1' },
    json: async () => profiles,
  })

  const stop = watchProfiles({}, (p) => { reloaded = p }, 50)
  await new Promise(r => setTimeout(r, 120))
  stop()
  globalThis.fetch = undefined
  assert(reloaded !== null, 'onReload should have been called')
})

// DBB-005: 304 does not trigger onReload
await testAsync('304 response does not trigger onReload', async () => {
  let callCount = 0
  globalThis.fetch = async () => ({ status: 304 })

  const stop = watchProfiles({}, () => { callCount++ }, 50)
  await new Promise(r => setTimeout(r, 120))
  stop()
  globalThis.fetch = undefined
  assert(callCount === 0, `onReload called ${callCount} times on 304`)
})

// DBB-005: network error does not crash
await testAsync('network error does not crash', async () => {
  globalThis.fetch = async () => { throw new Error('network down') }
  let threw = false
  const stop = watchProfiles({}, () => {}, 50)
  await new Promise(r => setTimeout(r, 120))
  stop()
  globalThis.fetch = undefined
  // if we reach here, no crash
})

// DBB-005: stop() cancels polling
await testAsync('stop() cancels further polling', async () => {
  let callCount = 0
  globalThis.fetch = async () => {
    callCount++
    return { status: 304 }
  }
  const stop = watchProfiles({}, () => {}, 50)
  await new Promise(r => setTimeout(r, 80))
  const countAtStop = callCount
  stop()
  await new Promise(r => setTimeout(r, 120))
  globalThis.fetch = undefined
  assert(callCount === countAtStop, `Polling continued after stop(): ${callCount} vs ${countAtStop}`)
})

console.log(`\nResults: ${passed} passed, ${failed} failed\n`)

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

const resultMd = `# Test Result: config 热更新 — 远程 profiles 变更触发重载

## Summary
- Passed: ${passed}
- Failed: ${failed}
- Total: ${passed + failed}

## DBB-005 Verification

${results.map(r => `- [${r.pass ? 'PASS' : 'FAIL'}] ${r.name}${r.error ? ': ' + r.error : ''}`).join('\n')}

## Edge Cases Identified
- No test for ≤60s reload timing in real network conditions
- No test for in-flight request safety during reload
`

const taskDir = path.join(ROOT, '.team/tasks/task-1775500180946')
fs.mkdirSync(taskDir, { recursive: true })
fs.writeFileSync(path.join(taskDir, 'test-result.md'), resultMd)

const coverage = {
  totalTests: passed + failed,
  passed,
  failed,
  edgeCases: [
    '≤60s reload timing in real network conditions',
    'In-flight request safety during config reload',
  ],
  coverage: `${Math.round((passed / (passed + failed)) * 100)}%`,
}
fs.writeFileSync(path.join(ROOT, '.team/gaps/test-coverage.json'), JSON.stringify(coverage, null, 2))

if (failed > 0) process.exit(1)
});
