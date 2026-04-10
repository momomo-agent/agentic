/**
 * Integration tests — 真实 agentic-service 接口测试
 * 
 * 前提：agentic-service 在 localhost:1234 运行
 * 运行：node test/integration.js
 */

import { AgenticClient } from '../src/client.js'

const BASE = process.env.BASE_URL || 'http://localhost:1234'
const ai = new AgenticClient(BASE, { timeout: 60000 })

let passed = 0
let failed = 0
const errors = []

async function test(name, fn) {
  try {
    await fn()
    passed++
    console.log(`  ✓ ${name}`)
  } catch (e) {
    failed++
    errors.push({ name, error: e.message })
    console.log(`  ✗ ${name}: ${e.message}`)
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed')
}

// ============================================================
console.log('\n=== admin ===\n')

await test('admin.status() returns hardware info', async () => {
  const status = await ai.admin.status()
  assert(status.hardware, 'missing hardware')
  assert(status.hardware.platform, 'missing platform')
  assert(status.hardware.memory > 0, 'memory should be > 0')
})

await test('admin.config() returns config', async () => {
  const config = await ai.admin.config()
  assert(config !== null && typeof config === 'object', 'config should be object')
})

await test('admin.devices() returns array', async () => {
  const devices = await ai.admin.devices()
  assert(Array.isArray(devices), 'devices should be array')
})

await test('admin.perf() returns metrics', async () => {
  const perf = await ai.admin.perf()
  assert(perf !== null && typeof perf === 'object', 'perf should be object')
})

// ============================================================
console.log('\n=== capabilities ===\n')

await test('capabilities() returns capability flags', async () => {
  const caps = await ai.capabilities()
  assert(typeof caps.think === 'boolean', 'think should be boolean')
  assert(typeof caps.listen === 'boolean', 'listen should be boolean')
  assert(typeof caps.speak === 'boolean', 'speak should be boolean')
  assert(typeof caps.see === 'boolean', 'see should be boolean')
  assert(typeof caps.converse === 'boolean', 'converse should be boolean')
  console.log(`    capabilities: ${JSON.stringify(caps)}`)
})

// ============================================================
console.log('\n=== think ===\n')

await test('think() non-streaming returns answer', async () => {
  const result = await ai.think('回答"是"，只说一个字')
  assert(result.answer, 'should have answer')
  assert(result.answer.length > 0, 'answer should not be empty')
  console.log(`    answer: "${result.answer.slice(0, 80)}"`)
})

await test('think() streaming returns chunks', async () => {
  const gen = await ai.think('回答"好的"，只说两个字', { stream: true })
  const chunks = []
  for await (const chunk of gen) {
    chunks.push(chunk)
  }
  assert(chunks.length > 0, 'should have chunks')
  const lastChunk = chunks[chunks.length - 1]
  assert(lastChunk.type === 'done', 'last chunk should be done')
  const text = chunks.filter(c => c.type === 'content').map(c => c.text).join('')
  console.log(`    streamed: "${text.slice(0, 80)}" (${chunks.length} chunks)`)
})

await test('think() with messages array (multi-turn)', async () => {
  const result = await ai.think([
    { role: 'user', content: '我叫小明' },
    { role: 'assistant', content: '你好小明！' },
    { role: 'user', content: '我叫什么？只回答名字' }
  ])
  assert(result.answer, 'should have answer')
  console.log(`    answer: "${result.answer.slice(0, 80)}"`)
})

await test('think() with tools', async () => {
  const result = await ai.think('北京现在几点？', {
    tools: [{
      name: 'get_time',
      description: '获取当前时间',
      parameters: { type: 'object', properties: { timezone: { type: 'string' } } }
    }]
  })
  // Model may or may not call the tool
  assert(result.answer !== undefined || result.toolCalls, 'should have answer or toolCalls')
  console.log(`    answer: "${(result.answer || '').slice(0, 80)}", toolCalls: ${result.toolCalls?.length || 0}`)
})

await test('think() with schema (structured output)', async () => {
  const result = await ai.think('返回JSON: {"name":"test","value":42}。只返回JSON，不要其他文字。', {
    schema: { type: 'object', properties: { name: { type: 'string' }, value: { type: 'number' } } }
  })
  assert(result.answer, 'should have answer')
  // data parsing is best-effort
  console.log(`    answer: "${result.answer.slice(0, 80)}", data: ${JSON.stringify(result.data || null)}`)
})

// ============================================================
console.log('\n=== speak ===\n')

await test('speak() returns audio buffer', async () => {
  const audio = await ai.speak('你好')
  assert(audio, 'should return audio')
  const size = audio.byteLength || audio.length || 0
  assert(size > 0, 'audio should not be empty')
  console.log(`    audio size: ${size} bytes`)
})

// ============================================================
console.log('\n=== see ===\n')

await test('see() with base64 image returns description', async () => {
  // 1x1 red PNG
  const redPixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
  const desc = await ai.see(redPixel, '这张图片是什么颜色？用一个词回答')
  assert(typeof desc === 'string', 'should return string')
  assert(desc.length > 0, 'description should not be empty')
  console.log(`    description: "${desc.slice(0, 80)}"`)
})

await test('see() streaming returns chunks', async () => {
  const redPixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
  const gen = await ai.see(redPixel, '描述', { stream: true })
  const chunks = []
  for await (const chunk of gen) {
    chunks.push(chunk)
  }
  assert(chunks.length > 0, 'should have chunks')
  console.log(`    streamed ${chunks.length} chunks`)
})

// ============================================================
// listen + converse 需要真实音频文件，跳过
console.log('\n=== listen / converse (skipped — need real audio) ===\n')
console.log('  ⊘ listen() — requires audio file')
console.log('  ⊘ converse() — requires audio file')

// ============================================================
console.log('\n=== errors ===\n')

await test('think() with empty input throws', async () => {
  try {
    await ai.think('')
    throw new Error('should have thrown')
  } catch (e) {
    if (e.message === 'should have thrown') throw e
    // Expected error
  }
})

await test('speak() with empty text throws', async () => {
  try {
    await ai.speak('')
    throw new Error('should have thrown')
  } catch (e) {
    if (e.message === 'should have thrown') throw e
  }
})

// ============================================================
console.log(`\n${'='.repeat(40)}`)
console.log(`Results: ${passed} passed, ${failed} failed`)
if (errors.length) {
  console.log('\nFailed tests:')
  errors.forEach(e => console.log(`  ✗ ${e.name}: ${e.error}`))
}
console.log()
process.exit(failed > 0 ? 1 : 0)
