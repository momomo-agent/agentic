import { test } from 'vitest';
// Tests for profiles/default.json — DBB-005 (m11)
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

test('profiles-default', async () => {
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'profiles/default.json'), 'utf8'))

let passed = 0, failed = 0
const results = []

function test(name, fn) {
  try { fn(); console.log(`  PASS: ${name}`); results.push({ name, pass: true }); passed++ }
  catch (e) { console.log(`  FAIL: ${name} — ${e.message}`); results.push({ name, pass: false, error: e.message }); failed++ }
}
function assert(cond, msg) { if (!cond) throw new Error(msg) }

console.log('=== profiles/default.json tests (DBB-005 m11) ===\n')

test('has profiles array', () => assert(Array.isArray(data.profiles), 'profiles must be array'))

test('has apple-silicon profile', () => {
  const p = data.profiles.find(p => p.match?.gpu === 'apple-silicon' || p.match?.arch === 'arm64')
  assert(p, 'No apple-silicon profile found')
})

test('has nvidia profile', () => {
  const p = data.profiles.find(p => p.match?.gpu === 'nvidia' || JSON.stringify(p).includes('nvidia'))
  assert(p, 'No nvidia profile found')
})

test('has cpu-only/fallback profile', () => {
  // cpu-only is the catch-all with empty match or openai provider
  const p = data.profiles.find(p => Object.keys(p.match || {}).length === 0 || p.config?.llm?.model?.includes('2b'))
  assert(p, 'No cpu-only/fallback profile found')
})

const requiredFields = ['llm', 'stt', 'tts', 'fallback']
data.profiles.forEach((p, i) => {
  test(`profile[${i}] has llm/stt/tts/fallback fields`, () => {
    for (const f of ['llm', 'stt', 'tts']) {
      assert(p.config?.[f], `profile[${i}] missing config.${f}`)
    }
    assert('fallback' in p.config, `profile[${i}] missing config.fallback`)
  })
})

test('llm configs have provider and model', () => {
  for (const p of data.profiles) {
    assert(p.config.llm.provider, 'llm missing provider')
    assert(p.config.llm.model, 'llm missing model')
  }
})

console.log(`\nResults: ${passed} passed, ${failed} failed\n`)

const taskDir = path.join(ROOT, '.team/tasks/task-1775500299074')
fs.mkdirSync(taskDir, { recursive: true })
fs.writeFileSync(path.join(taskDir, 'test-result.md'), `# Test Result: profiles/default.json\n\n## Summary\n- Passed: ${passed}\n- Failed: ${failed}\n\n${results.map(r => `- [${r.pass ? 'PASS' : 'FAIL'}] ${r.name}${r.error ? ': ' + r.error : ''}`).join('\n')}\n`)

const gapsDir = path.join(ROOT, '.team/gaps')
fs.mkdirSync(gapsDir, { recursive: true })
fs.writeFileSync(path.join(gapsDir, 'test-coverage.json'), JSON.stringify({
  totalTests: passed + failed, passed, failed,
  edgeCases: ['No test for matchProfile() logic against this file'],
  coverage: `${Math.round(passed / (passed + failed) * 100)}%`
}, null, 2))

if (failed > 0) process.exit(1)
});
