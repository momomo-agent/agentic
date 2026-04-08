// Tests for admin panel: task-1775494979786
// Verifies design.md acceptance criteria and DBB-009

import assert from 'assert'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

let passed = 0
let failed = 0
const failures = []

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++ }
  catch (e) { console.log(`  ✗ ${name}: ${e.message}`); failed++; failures.push({ name, error: e.message }) }
}

console.log('\n=== Admin Panel Tests ===\n')

// --- File existence ---
test('index.html exists', () => {
  assert.ok(existsSync(join(root, 'src/ui/admin/index.html')))
})

test('App.vue exists', () => {
  assert.ok(existsSync(join(root, 'src/ui/admin/src/App.vue')))
})

test('DeviceList.vue exists', () => {
  assert.ok(existsSync(join(root, 'src/ui/admin/src/components/DeviceList.vue')))
})

test('LogViewer.vue exists', () => {
  assert.ok(existsSync(join(root, 'src/ui/admin/src/components/LogViewer.vue')))
})

test('HardwarePanel.vue exists', () => {
  assert.ok(existsSync(join(root, 'src/ui/admin/src/components/HardwarePanel.vue')))
})

// --- App.vue structure ---
const appVue = readFileSync(join(root, 'src/ui/admin/src/App.vue'), 'utf8')

test('App.vue imports DeviceList', () => {
  assert.ok(appVue.includes('DeviceList'))
})

test('App.vue imports LogViewer', () => {
  assert.ok(appVue.includes('LogViewer'))
})

test('App.vue imports HardwarePanel', () => {
  assert.ok(appVue.includes('HardwarePanel'))
})

test('App.vue polls /api/status with setInterval', () => {
  assert.ok(appVue.includes('setInterval') && appVue.includes('/api/status'))
})

test('App.vue passes devices to DeviceList', () => {
  assert.ok(appVue.includes(':devices'))
})

test('App.vue passes hardware to HardwarePanel', () => {
  assert.ok(appVue.includes(':hardware'))
})

// --- DeviceList.vue ---
const deviceList = readFileSync(join(root, 'src/ui/admin/src/components/DeviceList.vue'), 'utf8')

test('DeviceList accepts devices prop', () => {
  assert.ok(deviceList.includes('devices'))
})

test('DeviceList renders table', () => {
  assert.ok(deviceList.includes('<table') || deviceList.includes('v-for'))
})

// --- HardwarePanel.vue ---
const hwPanel = readFileSync(join(root, 'src/ui/admin/src/components/HardwarePanel.vue'), 'utf8')

test('HardwarePanel accepts hardware prop', () => {
  assert.ok(hwPanel.includes('hardware'))
})

test('HardwarePanel renders key-value pairs', () => {
  assert.ok(hwPanel.includes('v-for') || hwPanel.includes('platform') || hwPanel.includes('gpu'))
})

// --- LogViewer.vue ---
const logViewer = readFileSync(join(root, 'src/ui/admin/src/components/LogViewer.vue'), 'utf8')

test('LogViewer accepts logs prop', () => {
  assert.ok(logViewer.includes('logs'))
})

test('LogViewer auto-scrolls on new entries', () => {
  assert.ok(logViewer.includes('scrollTop') && logViewer.includes('scrollHeight'))
})

// --- vite.config.js ---
const viteConfig = readFileSync(join(root, 'src/ui/admin/vite.config.js'), 'utf8')

test('vite config proxies /api to localhost:3000', () => {
  assert.ok(viteConfig.includes('/api') && viteConfig.includes('localhost:3000'))
})

test('vite build outputs to dist/admin', () => {
  assert.ok(viteConfig.includes('dist/admin'))
})

// --- api.js serves /admin ---
const apiJs = readFileSync(join(root, 'src/server/api.js'), 'utf8')

test('api.js serves /admin static files', () => {
  assert.ok(apiJs.includes('/admin'))
})

test('api.js has /api/logs endpoint', () => {
  assert.ok(apiJs.includes('/api/logs'))
})

// --- Summary ---
console.log(`\nResults: ${passed} passed, ${failed} failed\n`)
if (failures.length) {
  console.log('Failures:')
  failures.forEach(f => console.log(`  - ${f.name}: ${f.error}`))
}

process.exit(failed > 0 ? 1 : 0)
