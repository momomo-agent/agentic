// Additional edge case tests for streaming scan (task-1775583337266)
// Verifies DBB-004: scanStream yields without loading all content at once
import { AgenticStoreBackend, MemoryStorage, NodeFsBackend } from '../dist/index.js'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

let passed = 0
let failed = 0

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed')
}

// --- AgenticStoreBackend meta key filtering ---

async function testAgenticStoreFiltersMetaKeys() {
  const store = new Map()
  const backend = new AgenticStoreBackend({
    get: async k => store.get(k) ?? undefined,
    set: async (k, v) => { store.set(k, v) },
    delete: async k => store.delete(k),
    keys: async () => [...store.keys()],
    has: async k => store.has(k),
  })

  await backend.set('/file.txt', 'hello test\nworld')
  // Verify meta keys exist in store
  const allKeys = [...store.keys()]
  const metaKeys = allKeys.filter(k => k.includes('\x00'))
  assert(metaKeys.length > 0, 'Meta keys should exist after set()')

  // scanStream should not yield from meta keys
  const results = []
  for await (const r of backend.scanStream('test')) {
    results.push(r)
  }
  assert(results.length === 1, `Expected 1 result, got ${results.length}`)
  assert(results[0].path === '/file.txt', `Path should be /file.txt, got ${results[0].path}`)
  assert(results[0].content === 'hello test', `Content mismatch: ${results[0].content}`)
  console.log('  ✓ testAgenticStoreFiltersMetaKeys')
}

// --- No trailing newline ---

async function testScanStreamNoTrailingNewline() {
  const storage = new MemoryStorage()
  await storage.set('/file.txt', 'line1\nline2 match\nline3')

  const results = []
  for await (const r of storage.scanStream('match')) {
    results.push(r)
  }
  assert(results.length === 1, `Expected 1 match, got ${results.length}`)
  assert(results[0].line === 2, `Expected line 2, got ${results[0].line}`)
  console.log('  ✓ testScanStreamNoTrailingNewline')
}

async function testAgenticStoreNoTrailingNewline() {
  const store = new Map()
  const backend = new AgenticStoreBackend({
    get: async k => store.get(k) ?? undefined,
    set: async (k, v) => { store.set(k, v) },
    delete: async k => store.delete(k),
    keys: async () => [...store.keys()],
    has: async k => store.has(k),
  })
  await backend.set('/file.txt', 'match at end')

  const results = []
  for await (const r of backend.scanStream('end')) {
    results.push(r)
  }
  assert(results.length === 1, `Expected 1 result, got ${results.length}`)
  assert(results[0].content === 'match at end')
  console.log('  ✓ testAgenticStoreNoTrailingNewline')
}

// --- Empty file content ---

async function testScanStreamEmptyFile() {
  const storage = new MemoryStorage()
  await storage.set('/empty.txt', '')

  const results = []
  for await (const r of storage.scanStream('anything')) {
    results.push(r)
  }
  assert(results.length === 0, `Expected 0 results for empty file, got ${results.length}`)
  console.log('  ✓ testScanStreamEmptyFile')
}

async function testAgenticStoreEmptyFile() {
  const store = new Map()
  const backend = new AgenticStoreBackend({
    get: async k => store.get(k) ?? undefined,
    set: async (k, v) => { store.set(k, v) },
    delete: async k => store.delete(k),
    keys: async () => [...store.keys()],
    has: async k => store.has(k),
  })
  await backend.set('/empty.txt', '')

  const results = []
  for await (const r of backend.scanStream('test')) {
    results.push(r)
  }
  assert(results.length === 0, `Expected 0 results, got ${results.length}`)
  console.log('  ✓ testAgenticStoreEmptyFile')
}

// --- Single line no newline ---

async function testScanStreamSingleLineNoNewline() {
  const storage = new MemoryStorage()
  await storage.set('/single.txt', 'just one line with pattern')

  const results = []
  for await (const r of storage.scanStream('pattern')) {
    results.push(r)
  }
  assert(results.length === 1, `Expected 1 result, got ${results.length}`)
  assert(results[0].line === 1, `Expected line 1, got ${results[0].line}`)
  assert(results[0].content === 'just one line with pattern')
  console.log('  ✓ testScanStreamSingleLineNoNewline')
}

// --- scan() delegates to scanStream() for AgenticStoreBackend ---

async function testAgenticStoreScanDelegatesToStream() {
  const store = new Map()
  const backend = new AgenticStoreBackend({
    get: async k => store.get(k) ?? undefined,
    set: async (k, v) => { store.set(k, v) },
    delete: async k => store.delete(k),
    keys: async () => [...store.keys()],
    has: async k => store.has(k),
  })
  await backend.set('/a.txt', 'test one\ntest two')
  await backend.set('/b.txt', 'no match\nother')

  const scanResults = await backend.scan('test')
  const streamResults = []
  for await (const r of backend.scanStream('test')) {
    streamResults.push(r)
  }

  assert(scanResults.length === streamResults.length,
    `scan() returned ${scanResults.length}, scanStream() returned ${streamResults.length}`)
  for (let i = 0; i < scanResults.length; i++) {
    assert(scanResults[i].path === streamResults[i].path, 'path mismatch')
    assert(scanResults[i].line === streamResults[i].line, 'line mismatch')
    assert(scanResults[i].content === streamResults[i].content, 'content mismatch')
  }
  console.log('  ✓ testAgenticStoreScanDelegatesToStream')
}

// --- NodeFsBackend scanStream last-line match (no trailing newline) ---

async function testNodeFsScanStreamLastLineMatch() {
  const testDir = '/tmp/agentic-fs-test-lastline-' + Date.now()
  mkdirSync(testDir, { recursive: true })
  try {
    // No trailing newline
    writeFileSync(join(testDir, 'test.txt'), 'line1\nline2\nlast match')
    const backend = new NodeFsBackend(testDir)

    const results = []
    for await (const r of backend.scanStream('match')) {
      results.push(r)
    }
    assert(results.length === 1, `Expected 1 result, got ${results.length}`)
    assert(results[0].line === 3, `Expected line 3, got ${results[0].line}`)
    assert(results[0].content === 'last match', `Content: ${results[0].content}`)
    console.log('  ✓ testNodeFsScanStreamLastLineMatch')
  } finally {
    rmSync(testDir, { recursive: true, force: true })
  }
}

// --- scanStream early break (incremental/lazy) ---

async function testAgenticStoreEarlyBreak() {
  const store = new Map()
  const backend = new AgenticStoreBackend({
    get: async k => store.get(k) ?? undefined,
    set: async (k, v) => { store.set(k, v) },
    delete: async k => store.delete(k),
    keys: async () => [...store.keys()],
    has: async k => store.has(k),
  })
  await backend.set('/a.txt', 'match 1')
  await backend.set('/b.txt', 'match 2')
  await backend.set('/c.txt', 'match 3')

  let count = 0
  for await (const r of backend.scanStream('match')) {
    count++
    if (count === 2) break // Early exit
  }
  assert(count === 2, `Should break after 2, got ${count}`)
  console.log('  ✓ testAgenticStoreEarlyBreak')
}

// --- Multiple matches on same line ---

async function testMultipleMatchesOnSameLine() {
  const storage = new MemoryStorage()
  await storage.set('/dup.txt', 'test test test')

  const results = []
  for await (const r of storage.scanStream('test')) {
    results.push(r)
  }
  // Each line should appear once (full line match), not per-occurrence
  assert(results.length === 1, `Expected 1 result (one line), got ${results.length}`)
  console.log('  ✓ testMultipleMatchesOnSameLine')
}

// --- Run all tests ---

async function runTests() {
  console.log('Running streaming scan edge case tests...\n')
  const tests = [
    testAgenticStoreFiltersMetaKeys,
    testScanStreamNoTrailingNewline,
    testAgenticStoreNoTrailingNewline,
    testScanStreamEmptyFile,
    testAgenticStoreEmptyFile,
    testScanStreamSingleLineNoNewline,
    testAgenticStoreScanDelegatesToStream,
    testNodeFsScanStreamLastLineMatch,
    testAgenticStoreEarlyBreak,
    testMultipleMatchesOnSameLine,
  ]

  for (const test of tests) {
    try {
      await test()
      passed++
    } catch (err) {
      console.error(`  ✗ ${test.name} failed: ${err.message}`)
      failed++
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

runTests()
