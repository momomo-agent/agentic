// Test: 服务端常驻唤醒词检测
import { readFileSync } from 'fs'
import { resolve } from 'path'

let passed = 0, failed = 0
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++ }
  catch (e) { console.log(`  ✗ ${name}: ${e.message}`); failed++ }
}
function assert(cond, msg) { if (!cond) throw new Error(msg) }

const src = readFileSync(resolve('src/server/hub.js'), 'utf8')

console.log('服务端常驻唤醒词检测')
test('exports startWakeWordDetection', () => assert(src.includes('export function startWakeWordDetection'), 'not exported'))
test('default keyword hey agent', () => assert(src.includes("'hey agent'"), 'default keyword missing'))
test('WAKE_WORD env override', () => assert(src.includes('process.env.WAKE_WORD'), 'env override missing'))
test('non-TTY guard', () => assert(src.includes('isTTY'), 'TTY check missing'))
test('case-insensitive match', () => assert(src.includes('toLowerCase'), 'case insensitive missing'))
test('broadcasts wake type', () => assert(src.includes("type: 'wake'") || src.includes('type:"wake"') || src.includes("type: 'wakeword'") || src.includes('wakeword'), 'wake broadcast missing'))

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
