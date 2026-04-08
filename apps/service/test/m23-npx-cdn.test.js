// Test: npx entry + CDN URL fix
import { readFileSync } from 'fs'
import { resolve } from 'path'

let passed = 0, failed = 0

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++ }
  catch (e) { console.log(`  ✗ ${name}: ${e.message}`); failed++ }
}
function assert(cond, msg) { if (!cond) throw new Error(msg) }

const bin = readFileSync(resolve('bin/agentic-service.js'), 'utf8')
const profiles = readFileSync(resolve('src/detector/profiles.js'), 'utf8')

console.log('npx entry + CDN URL')
test('bin has shebang', () => assert(bin.startsWith('#!/usr/bin/env node'), 'missing shebang'))
test('no cdn.example.com in profiles.js', () => assert(!profiles.includes('cdn.example.com'), 'cdn.example.com found'))
test('uses raw.githubusercontent.com', () => assert(profiles.includes('raw.githubusercontent.com'), 'github raw URL missing'))
test('PROFILES_URL env override', () => assert(profiles.includes('process.env.PROFILES_URL'), 'env override missing'))

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
