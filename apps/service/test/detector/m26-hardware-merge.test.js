import { test } from 'vitest';
// Tests for task-1775514586151: gpu-detector.js merged into hardware.js
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

test('m26-hardware-merge', async () => {
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

let passed = 0, failed = 0
const results = []

function test(name, fn) {
  try { fn(); console.log(`  PASS: ${name}`); results.push({ name, pass: true }); passed++ }
  catch (e) { console.log(`  FAIL: ${name} — ${e.message}`); results.push({ name, pass: false, error: e.message }); failed++ }
}
function assert(cond, msg) { if (!cond) throw new Error(msg) }

console.log('=== m26 gpu-detector merge tests ===\n')

test('gpu-detector.js does not exist', () => {
  const exists = fs.existsSync(path.join(ROOT, 'src/detector/gpu-detector.js'))
  assert(!exists, 'gpu-detector.js still exists — not merged')
})

test('hardware.js does not import gpu-detector', () => {
  const content = fs.readFileSync(path.join(ROOT, 'src/detector/hardware.js'), 'utf8')
  assert(!content.includes('gpu-detector'), 'hardware.js still imports gpu-detector')
})

test('hardware.js contains detectGPU function', () => {
  const content = fs.readFileSync(path.join(ROOT, 'src/detector/hardware.js'), 'utf8')
  assert(content.includes('function detectGPU'), 'detectGPU not found in hardware.js')
})

test('no other file imports gpu-detector.js', () => {
  const srcDir = path.join(ROOT, 'src')
  function scan(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) scan(full)
      else if (entry.name.endsWith('.js')) {
        const content = fs.readFileSync(full, 'utf8')
        assert(!content.includes('gpu-detector'), `${full} still imports gpu-detector`)
      }
    }
  }
  scan(srcDir)
})

console.log(`\nResults: ${passed} passed, ${failed} failed\n`)

const taskDir = path.join(ROOT, '.team/tasks/task-1775514586151')
fs.mkdirSync(taskDir, { recursive: true })
fs.writeFileSync(path.join(taskDir, 'test-result.md'), `# Test Result: gpu-detector.js merge\n\n## Summary\n- Passed: ${passed}\n- Failed: ${failed}\n\n${results.map(r => `- [${r.pass ? 'PASS' : 'FAIL'}] ${r.name}${r.error ? ': ' + r.error : ''}`).join('\n')}\n`)

if (failed > 0) process.exit(1)
});
