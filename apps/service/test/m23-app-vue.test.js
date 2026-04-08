// Test: App.vue component imports and status polling
// Verifies design spec and DBB m23 criteria

import { readFileSync } from 'fs'
import { resolve } from 'path'

const appVuePath = resolve('src/ui/admin/src/App.vue')
const src = readFileSync(appVuePath, 'utf8')

let passed = 0
let failed = 0
const results = []

function test(name, fn) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
    results.push({ name, pass: true })
    passed++
  } catch (e) {
    console.log(`  ✗ ${name}: ${e.message}`)
    results.push({ name, pass: false, error: e.message })
    failed++
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

console.log('App.vue component imports and status polling')

test('imports DeviceList', () => assert(src.includes("import DeviceList from './components/DeviceList.vue'"), 'DeviceList not imported'))
test('imports LogViewer', () => assert(src.includes("import LogViewer from './components/LogViewer.vue'"), 'LogViewer not imported'))
test('imports HardwarePanel', () => assert(src.includes("import HardwarePanel from './components/HardwarePanel.vue'"), 'HardwarePanel not imported'))
test('setInterval 5000ms polling', () => assert(src.includes('setInterval(fetchStatus, 5000)'), 'setInterval not found'))
test('polls /api/status', () => assert(src.includes("fetch('/api/status')"), '/api/status not fetched'))
test(':devices prop binding', () => assert(src.includes(':devices="devices"'), ':devices binding missing'))
test(':hardware prop binding', () => assert(src.includes(':hardware="hardware"'), ':hardware binding missing'))
test('clearInterval on unmount', () => assert(src.includes('clearInterval(timer)'), 'clearInterval not called'))
test('onUnmounted lifecycle', () => assert(src.includes('onUnmounted'), 'onUnmounted not used'))
test('silent catch on fetch error', () => assert(src.includes('catch'), 'no error handling'))

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
