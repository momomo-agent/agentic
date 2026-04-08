// Test: HTTPS/LAN安全访问接入
import { readFileSync } from 'fs'
import { resolve } from 'path'

let passed = 0, failed = 0
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++ }
  catch (e) { console.log(`  ✗ ${name}: ${e.message}`); failed++ }
}
function assert(cond, msg) { if (!cond) throw new Error(msg) }

const src = readFileSync(resolve('src/server/api.js'), 'utf8')

console.log('HTTPS/LAN安全访问接入')
test('startServer accepts https option', () => assert(src.includes('useHttps') || src.includes('https:'), 'https option missing'))
test('imports httpsServer.js', () => assert(src.includes('httpsServer'), 'httpsServer import missing'))
test('https port = port + 443', () => assert(src.includes('port + 443'), 'https port formula missing'))
test('returns {http, https} when https enabled', () => assert(src.includes('{ http: httpServer, https: httpsServer }') || src.includes('{http:httpServer,https:httpsServer}'), 'dual return missing'))

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
