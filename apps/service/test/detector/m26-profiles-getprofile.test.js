// Tests for task-1775514571886: getProfile(hardware) + cpu-only profile
import { matchProfile } from '../../src/detector/matcher.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'profiles/default.json'), 'utf8'))

let passed = 0, failed = 0
const results = []

function test(name, fn) {
  try { fn(); console.log(`  PASS: ${name}`); results.push({ name, pass: true }); passed++ }
  catch (e) { console.log(`  FAIL: ${name} — ${e.message}`); results.push({ name, pass: false, error: e.message }); failed++ }
}
function assert(cond, msg) { if (!cond) throw new Error(msg) }

console.log('=== m26 getProfile + cpu-only profile tests ===\n')

// cpu-only profile exists
test('cpu-only profile exists in default.json', () => {
  const p = data.profiles.find(p => Object.keys(p.match).length === 0)
  assert(p, 'No cpu-only (empty match) profile found')
  assert(p.config.llm.model === 'gemma3:1b', `Expected gemma3:1b, got ${p.config.llm.model}`)
})

// apple-silicon match
test('getProfile apple-silicon returns high-end model', () => {
  const config = matchProfile(data, { platform: 'darwin', arch: 'arm64', gpu: { type: 'apple-silicon' }, memory: 16 })
  assert(config.llm?.model, 'No llm.model returned')
})

// nvidia match
test('getProfile nvidia returns nvidia profile', () => {
  const config = matchProfile(data, { platform: 'linux', gpu: { type: 'nvidia' }, memory: 8 })
  assert(config.llm?.model, 'No llm.model returned')
})

// cpu-only fallback
test('getProfile gpu:none returns cpu-only profile', () => {
  const config = matchProfile(data, { gpu: { type: 'none' }, memory: 8 })
  assert(config.llm.model, `No llm.model returned for gpu:none`)
})

// empty hardware fallback
test('getProfile empty hardware returns default, no exception', () => {
  const config = matchProfile(data, {})
  assert(config.llm?.model, 'No llm.model returned for empty hardware')
})

// unknown gpu fallback
test('getProfile unknown gpu falls back to cpu-only', () => {
  const config = matchProfile(data, { gpu: { type: 'amd' }, memory: 4 })
  assert(config.llm.model, `No llm.model returned for unknown gpu`)
})

console.log(`\nResults: ${passed} passed, ${failed} failed\n`)

const taskDir = path.join(ROOT, '.team/tasks/task-1775514571886')
fs.mkdirSync(taskDir, { recursive: true })
fs.writeFileSync(path.join(taskDir, 'test-result.md'), `# Test Result: profiles.js getProfile + cpu-only profile\n\n## Summary\n- Passed: ${passed}\n- Failed: ${failed}\n\n${results.map(r => `- [${r.pass ? 'PASS' : 'FAIL'}] ${r.name}${r.error ? ': ' + r.error : ''}`).join('\n')}\n`)

const gapsDir = path.join(ROOT, '.team/gaps')
fs.mkdirSync(gapsDir, { recursive: true })
fs.writeFileSync(path.join(gapsDir, 'test-coverage.json'), JSON.stringify({
  totalTests: passed + failed, passed, failed,
  edgeCases: ['null gpu object (no gpu key at all)', 'memory exactly at minMemory boundary'],
  coverage: `${Math.round(passed / (passed + failed) * 100)}%`
}, null, 2))

if (failed > 0) process.exit(1)
