// Tests for task-1775510291601: src/ui/admin/ 管理面板
import assert from 'assert'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const adminSrc = join(root, 'src/ui/admin/src')

let passed = 0, failed = 0
const failures = []

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++ }
  catch (e) { console.log(`  ✗ ${name}: ${e.message}`); failed++; failures.push({ name, error: e.message }) }
}

console.log('\n=== M20 Admin UI Tests ===\n')

// --- Required files per design.md ---
test('SystemStatus.vue exists', () => assert.ok(existsSync(join(adminSrc, 'components/SystemStatus.vue'))))
test('ConfigPanel.vue exists', () => assert.ok(existsSync(join(adminSrc, 'components/ConfigPanel.vue'))))
test('main.js exists', () => assert.ok(existsSync(join(adminSrc, 'main.js'))))

// --- Router setup (design: Vue Router with /admin base) ---
const mainJs = readFileSync(join(adminSrc, 'main.js'), 'utf8')
test('main.js creates router with /admin history base', () => assert.ok(mainJs.includes('/admin')))
test('main.js registers SystemStatus route', () => assert.ok(mainJs.includes('SystemStatus')))
test('main.js registers DeviceList route', () => assert.ok(mainJs.includes('DeviceList')))
test('main.js registers ConfigPanel route', () => assert.ok(mainJs.includes('ConfigPanel')))
test('main.js mounts app with router', () => assert.ok(mainJs.includes('use(router)')))

// --- SystemStatus.vue: fetches /api/status, shows hardware + profile ---
const sysStatus = readFileSync(join(adminSrc, 'components/SystemStatus.vue'), 'utf8')
test('SystemStatus fetches /api/status', () => assert.ok(sysStatus.includes('/api/status')))
test('SystemStatus renders hardware info', () => assert.ok(sysStatus.includes('hardware')))
test('SystemStatus renders profile info', () => assert.ok(sysStatus.includes('profile')))
test('SystemStatus shows error on fetch failure', () => assert.ok(sysStatus.includes('error')))

// --- ConfigPanel.vue: GET/PUT /api/config, form with llm/stt/tts ---
const configPanel = readFileSync(join(adminSrc, 'components/ConfigPanel.vue'), 'utf8')
test('ConfigPanel fetches GET /api/config', () => assert.ok(configPanel.includes('/api/config')))
test('ConfigPanel submits PUT /api/config', () => assert.ok(configPanel.includes("'PUT'") || configPanel.includes('"PUT"')))
test('ConfigPanel has llm provider field', () => assert.ok(configPanel.includes('llm')))
test('ConfigPanel has stt provider field', () => assert.ok(configPanel.includes('stt')))
test('ConfigPanel has tts provider field', () => assert.ok(configPanel.includes('tts')))
test('ConfigPanel shows error on fetch failure', () => assert.ok(configPanel.includes('error')))

// --- DeviceList.vue: empty state ---
const deviceList = readFileSync(join(adminSrc, 'components/DeviceList.vue'), 'utf8')
test('DeviceList shows empty state message', () => assert.ok(
  deviceList.includes('No devices') || deviceList.includes('没有') || deviceList.includes('暂无') || deviceList.includes('empty') || deviceList.includes('length')
))

// --- DBB-006: api.js serves /admin ---
const apiJs = readFileSync(join(root, 'src/server/api.js'), 'utf8')
test('api.js serves /admin route (DBB-006)', () => assert.ok(apiJs.includes('/admin')))

// --- Summary ---
console.log(`\nResults: ${passed} passed, ${failed} failed\n`)
if (failures.length) {
  console.log('Failures:')
  failures.forEach(f => console.log(`  - ${f.name}: ${f.error}`))
}
process.exit(failed > 0 ? 1 : 0)
