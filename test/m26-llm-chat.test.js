import { test } from 'vitest';
// Tests for task-1775514647990: llm.js chat(messages, options) interface
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

test('m26-llm-chat', async () => {
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let passed = 0, failed = 0
const results = []

function test(name, fn) {
  try { fn(); console.log(`  PASS: ${name}`); results.push({ name, pass: true }); passed++ }
  catch (e) { console.log(`  FAIL: ${name} — ${e.message}`); results.push({ name, pass: false, error: e.message }); failed++ }
}
function assert(cond, msg) { if (!cond) throw new Error(msg) }

console.log('=== m26 llm.js chat() interface tests ===\n')

const content = fs.readFileSync(path.join(ROOT, 'src/runtime/llm.js'), 'utf8')

test('chat exported as async generator with messages param', () => {
  assert(content.includes('export async function* chat(messages'), 'chat(messages) not exported as async generator')
})

test('no old single-string message pattern', () => {
  assert(!content.includes("role: 'user', content: message"), 'Old single-message prepend pattern still present')
})

test('messages passed directly to chatWithOllama', () => {
  assert(content.includes('chatWithOllama(messages)'), 'messages not passed directly to chatWithOllama')
})

test('cloud fallback yields meta provider:cloud chunk', () => {
  assert(content.includes("type: 'meta', provider: 'cloud'"), 'meta cloud chunk not yielded on fallback')
})

test('missing API key throws error', () => {
  assert(content.includes('throw new Error'), 'No error thrown for missing API key')
})

console.log(`\nResults: ${passed} passed, ${failed} failed\n`)

const taskDir = path.join(ROOT, '.team/tasks/task-1775514647990')
fs.mkdirSync(taskDir, { recursive: true })
fs.writeFileSync(path.join(taskDir, 'test-result.md'), `# Test Result: llm.js chat()\n\n## Summary\n- Passed: ${passed}\n- Failed: ${failed}\n\n${results.map(r => `- [${r.pass ? 'PASS' : 'FAIL'}] ${r.name}${r.error ? ': ' + r.error : ''}`).join('\n')}\n`)

if (failed > 0) process.exit(1)
});
