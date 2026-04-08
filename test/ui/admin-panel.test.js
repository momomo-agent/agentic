import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const adminRoot = path.join(__dirname, '../../src/ui/admin')
const srcDir = path.join(adminRoot, 'src')
const componentsDir = path.join(srcDir, 'components')

let passed = 0, failed = 0
const failures = []

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++ }
  catch (e) { console.log(`  ✗ ${name}: ${e.message}`); failed++; failures.push(name + ': ' + e.message) }
}
function assert(cond, msg) { if (!cond) throw new Error(msg) }

const read = f => fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : ''
const appVue = read(path.join(srcDir, 'App.vue'))
const deviceList = read(path.join(componentsDir, 'DeviceList.vue'))
const hwPanel = read(path.join(componentsDir, 'HardwarePanel.vue'))
const logViewer = read(path.join(componentsDir, 'LogViewer.vue'))

console.log('\n=== Admin Panel Tests ===\n')

console.log('File structure:')
test('index.html exists', () => assert(fs.existsSync(path.join(adminRoot, 'index.html')), 'missing'))
test('App.vue exists', () => assert(appVue.length > 0, 'missing'))
test('DeviceList.vue exists', () => assert(deviceList.length > 0, 'missing'))
test('LogViewer.vue exists', () => assert(logViewer.length > 0, 'missing'))
test('HardwarePanel.vue exists', () => assert(hwPanel.length > 0, 'missing'))

console.log('\nApp.vue:')
test('polls /api/status every 2s', () => assert(appVue.includes('setInterval') && appVue.includes('2000'), 'no setInterval(2000)'))
test('uses DeviceList', () => assert(appVue.includes('DeviceList'), 'missing'))
test('uses HardwarePanel', () => assert(appVue.includes('HardwarePanel'), 'missing'))
test('uses LogViewer', () => assert(appVue.includes('LogViewer'), 'missing'))
test('passes devices prop', () => assert(appVue.includes('devices'), 'missing'))
test('passes hardware prop', () => assert(appVue.includes('hardware'), 'missing'))

console.log('\nDeviceList.vue:')
test('accepts devices prop', () => assert(deviceList.includes('devices'), 'missing'))
test('renders id and name', () => assert(deviceList.includes('d.id') && deviceList.includes('d.name'), 'missing'))

console.log('\nHardwarePanel.vue:')
test('shows platform', () => assert(hwPanel.includes('platform'), 'missing'))
test('shows gpu', () => assert(hwPanel.includes('gpu'), 'missing'))

console.log('\nLogViewer.vue:')
test('handles logs', () => assert(logViewer.includes('logs') || logViewer.includes('scroll'), 'missing'))

console.log(`\nResults: ${passed} passed, ${failed} failed`)
if (failures.length) failures.forEach(f => console.log('  ✗', f))
process.exit(failed > 0 ? 1 : 0)
