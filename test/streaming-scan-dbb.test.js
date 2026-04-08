// Tests for DBB-004: Streaming scan() for OPFSBackend and AgenticStoreBackend
import { AgenticFileSystem, MemoryStorage, NodeFsBackend, AgenticStoreBackend } from '../dist/index.js'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

// ── helpers ──────────────────────────────────────────────────────────────

function makeStore() {
  const data = new Map()
  return {
    async get(k) { return data.get(k) ?? null },
    async set(k, v) { data.set(k, v) },
    async delete(k) { data.delete(k) },
    async keys() { return [...data.keys()] },
    async has(k) { return data.has(k) },
  }
}

// ── DBB-004.1: scanStream yields results without loading all content at once ──

async function testScanStreamIsLazy() {
  // Track when values are accessed to verify laziness
  const data = new Map()
  let getCallCount = 0
  const store = {
    async get(k) { getCallCount++; return data.get(k) ?? null },
    async set(k, v) { data.set(k, v) },
    async delete(k) { data.delete(k) },
    async keys() { return [...data.keys()] },
    async has(k) { return data.has(k) },
  }
  const backend = new AgenticStoreBackend(store)
  await backend.set('/file1.txt', 'match here')
  await backend.set('/file2.txt', 'match here too')
  await backend.set('/file3.txt', 'match here three')

  getCallCount = 0
  let count = 0
  for await (const r of backend.scanStream('match')) {
    count++
    if (count === 1) break // Stop after first match
  }

  // Should have fetched at most 1 file value (the first one)
  if (getCallCount > 1) {
    throw new Error(`Expected at most 1 get() call (lazy), got ${getCallCount}`)
  }
  console.log('✓ testScanStreamIsLazy passed')
}

// ── DBB-004.2: File with match on last line (no trailing newline) ──

async function testScanStreamNoTrailingNewline_MemoryStorage() {
  const storage = new MemoryStorage()
  await storage.set('/nonewline.txt', 'first line\nsecond line\nmatch on last')

  const results = []
  for await (const r of storage.scanStream('match')) {
    results.push(r)
  }

  if (results.length !== 1) throw new Error(`Expected 1 match, got ${results.length}`)
  if (results[0].line !== 3) throw new Error(`Expected line 3, got ${results[0].line}`)
  if (results[0].content !== 'match on last') throw new Error(`Wrong content: ${results[0].content}`)
  console.log('✓ testScanStreamNoTrailingNewline_MemoryStorage passed')
}

async function testScanStreamNoTrailingNewline_AgenticStore() {
  const backend = new AgenticStoreBackend(makeStore())
  await backend.set('/nonewline.txt', 'first line\nsecond line\nmatch on last')

  const results = []
  for await (const r of backend.scanStream('match')) {
    results.push(r)
  }

  if (results.length !== 1) throw new Error(`Expected 1 match, got ${results.length}`)
  if (results[0].line !== 3) throw new Error(`Expected line 3, got ${results[0].line}`)
  console.log('✓ testScanStreamNoTrailingNewline_AgenticStore passed')
}

async function testScanStreamNoTrailingNewline_NodeFs() {
  const testDir = '/tmp/agentic-fs-test-nonewline-' + Date.now()
  try {
    mkdirSync(testDir, { recursive: true })
    writeFileSync(join(testDir, 'nonewline.txt'), 'first line\nsecond line\nmatch on last')

    const backend = new NodeFsBackend(testDir)
    const results = []
    for await (const r of backend.scanStream('match')) {
      results.push(r)
    }

    if (results.length !== 1) throw new Error(`Expected 1 match, got ${results.length}`)
    if (results[0].line !== 3) throw new Error(`Expected line 3, got ${results[0].line}`)
    console.log('✓ testScanStreamNoTrailingNewline_NodeFs passed')
  } finally {
    rmSync(testDir, { recursive: true, force: true })
  }
}

// ── DBB-004.3: Empty file produces no results ──

async function testScanStreamEmptyFile_MemoryStorage() {
  const storage = new MemoryStorage()
  await storage.set('/empty.txt', '')

  const results = []
  for await (const r of storage.scanStream('anything')) {
    results.push(r)
  }

  if (results.length !== 0) throw new Error(`Expected 0 results for empty file, got ${results.length}`)
  console.log('✓ testScanStreamEmptyFile_MemoryStorage passed')
}

async function testScanStreamEmptyFile_AgenticStore() {
  const backend = new AgenticStoreBackend(makeStore())
  await backend.set('/empty.txt', '')

  const results = []
  for await (const r of backend.scanStream('anything')) {
    results.push(r)
  }

  if (results.length !== 0) throw new Error(`Expected 0 results for empty file, got ${results.length}`)
  console.log('✓ testScanStreamEmptyFile_AgenticStore passed')
}

async function testScanStreamEmptyFile_NodeFs() {
  const testDir = '/tmp/agentic-fs-test-emptyfile-' + Date.now()
  try {
    mkdirSync(testDir, { recursive: true })
    writeFileSync(join(testDir, 'empty.txt'), '')

    const backend = new NodeFsBackend(testDir)
    const results = []
    for await (const r of backend.scanStream('anything')) {
      results.push(r)
    }

    if (results.length !== 0) throw new Error(`Expected 0 results for empty file, got ${results.length}`)
    console.log('✓ testScanStreamEmptyFile_NodeFs passed')
  } finally {
    rmSync(testDir, { recursive: true, force: true })
  }
}

// ── DBB-004.4: AgenticStoreBackend meta keys (\x00mtime) not scanned ──

async function testAgenticStoreMetaKeysFiltered() {
  const backend = new AgenticStoreBackend(makeStore())
  await backend.set('/file.txt', 'test content here')

  // Scan for something that would match meta key content
  // The mtime key is like '/file.txt\x00mtime' with a numeric value
  const results = []
  for await (const r of backend.scanStream('mtime')) {
    results.push(r)
  }

  // Should NOT match the meta key '/file.txt\x00mtime'
  for (const r of results) {
    if (r.path.includes('\x00')) {
      throw new Error(`Meta key leaked into scan results: ${r.path}`)
    }
  }
  console.log('✓ testAgenticStoreMetaKeysFiltered passed')
}

async function testAgenticStoreMetaKeysFilteredInList() {
  const backend = new AgenticStoreBackend(makeStore())
  await backend.set('/a.txt', 'hello')
  await backend.set('/b.txt', 'world')

  const list = await backend.list()
  for (const p of list) {
    if (p.includes('\x00')) {
      throw new Error(`Meta key leaked into list(): ${p}`)
    }
  }
  if (list.length !== 2) throw new Error(`Expected 2 files in list, got ${list.length}`)
  console.log('✓ testAgenticStoreMetaKeysFilteredInList passed')
}

// ── DBB-004.5: scan() delegates to scanStream() ──

async function testScanDelegatesToScanStream_AgenticStore() {
  const backend = new AgenticStoreBackend(makeStore())
  await backend.set('/a.txt', 'find me here\nno match\nfind me again')
  await backend.set('/b.txt', 'nothing here\nfind me at line 2')

  const streamResults = []
  for await (const r of backend.scanStream('find me')) {
    streamResults.push(r)
  }

  const scanResults = await backend.scan('find me')

  if (streamResults.length !== scanResults.length) {
    throw new Error(`scanStream yielded ${streamResults.length}, scan returned ${scanResults.length}`)
  }

  for (let i = 0; i < streamResults.length; i++) {
    if (streamResults[i].path !== scanResults[i].path ||
        streamResults[i].line !== scanResults[i].line ||
        streamResults[i].content !== scanResults[i].content) {
      throw new Error(`Mismatch at index ${i}: stream=${JSON.stringify(streamResults[i])} scan=${JSON.stringify(scanResults[i])}`)
    }
  }
  console.log('✓ testScanDelegatesToScanStream_AgenticStore passed')
}

async function testScanDelegatesToScanStream_NodeFs() {
  const testDir = '/tmp/agentic-fs-test-delegate-' + Date.now()
  try {
    mkdirSync(testDir, { recursive: true })
    writeFileSync(join(testDir, 'a.txt'), 'find me here\nno match\nfind me again')

    const backend = new NodeFsBackend(testDir)

    const streamResults = []
    for await (const r of backend.scanStream('find me')) {
      streamResults.push(r)
    }

    const scanResults = await backend.scan('find me')

    if (streamResults.length !== scanResults.length) {
      throw new Error(`scanStream yielded ${streamResults.length}, scan returned ${scanResults.length}`)
    }

    for (let i = 0; i < streamResults.length; i++) {
      if (streamResults[i].path !== scanResults[i].path ||
          streamResults[i].line !== scanResults[i].line ||
          streamResults[i].content !== scanResults[i].content) {
        throw new Error(`Mismatch at index ${i}`)
      }
    }
    console.log('✓ testScanDelegatesToScanStream_NodeFs passed')
  } finally {
    rmSync(testDir, { recursive: true, force: true })
  }
}

// ── DBB-004.6: Cross-backend consistency ──

async function testCrossBackendConsistency() {
  const testDir = '/tmp/agentic-fs-test-xconsistency-' + Date.now()
  try {
    mkdirSync(testDir, { recursive: true })

    const content1 = 'alpha beta\ngamma delta\nalpha again'
    const content2 = 'only beta here\nno match'
    writeFileSync(join(testDir, 'f1.txt'), content1)
    writeFileSync(join(testDir, 'f2.txt'), content2)

    const memory = new MemoryStorage()
    await memory.set('/f1.txt', content1)
    await memory.set('/f2.txt', content2)

    const store = new AgenticStoreBackend(makeStore())
    await store.set('/f1.txt', content1)
    await store.set('/f2.txt', content2)

    const nodeFs = new NodeFsBackend(testDir)

    // All three should find the same matches for 'alpha'
    const memResults = []
    for await (const r of memory.scanStream('alpha')) memResults.push(r)

    const storeResults = []
    for await (const r of store.scanStream('alpha')) storeResults.push(r)

    const nodeResults = []
    for await (const r of nodeFs.scanStream('alpha')) nodeResults.push(r)

    if (memResults.length !== 2) throw new Error(`MemoryStorage: expected 2, got ${memResults.length}`)
    if (storeResults.length !== 2) throw new Error(`AgenticStore: expected 2, got ${storeResults.length}`)
    if (nodeResults.length !== 2) throw new Error(`NodeFsBackend: expected 2, got ${nodeResults.length}`)

    // Verify line numbers match
    for (let i = 0; i < 2; i++) {
      const line = i === 0 ? 1 : 3
      if (memResults[i].line !== line) throw new Error(`MemoryStorage line mismatch at ${i}`)
      if (storeResults[i].line !== line) throw new Error(`AgenticStore line mismatch at ${i}`)
      if (nodeResults[i].line !== line) throw new Error(`NodeFs line mismatch at ${i}`)
    }

    console.log('✓ testCrossBackendConsistency passed')
  } finally {
    rmSync(testDir, { recursive: true, force: true })
  }
}

// ── DBB-004.7: Binary/non-UTF8 content handled gracefully ──

async function testBinaryContent_NodeFs() {
  const testDir = '/tmp/agentic-fs-test-binary-' + Date.now()
  try {
    mkdirSync(testDir, { recursive: true })
    // Write binary-like content with invalid UTF-8 sequences
    const buf = Buffer.from([0x80, 0x81, 0xFF, 0xFE, 0x00, 0x01])
    writeFileSync(join(testDir, 'binary.bin'), buf)

    const backend = new NodeFsBackend(testDir)
    // Should not throw — just yield no matches
    const results = []
    for await (const r of backend.scanStream('test')) {
      results.push(r)
    }

    if (results.length !== 0) throw new Error(`Expected 0 results for binary file, got ${results.length}`)
    console.log('✓ testBinaryContent_NodeFs passed')
  } finally {
    rmSync(testDir, { recursive: true, force: true })
  }
}

// ── DBB-004.8: scanStream result shape matches interface ──

async function testScanStreamResultShape() {
  const backend = new AgenticStoreBackend(makeStore())
  await backend.set('/test.txt', 'match line one\nno match\nmatch line three')

  const results = []
  for await (const r of backend.scanStream('match')) {
    results.push(r)
  }

  for (const r of results) {
    if (typeof r.path !== 'string') throw new Error('path must be string')
    if (typeof r.line !== 'number') throw new Error('line must be number')
    if (typeof r.content !== 'string') throw new Error('content must be string')
    if (!r.path.startsWith('/')) throw new Error('path must start with /')
    if (r.line < 1) throw new Error('line must be >= 1')
    if (!Number.isInteger(r.line)) throw new Error('line must be integer')
  }
  console.log('✓ testScanStreamResultShape passed')
}

// ── DBB-004.9: Scan across multiple files yields correct results ──

async function testScanStreamMultipleFiles_AgenticStore() {
  const backend = new AgenticStoreBackend(makeStore())
  await backend.set('/dir/a.txt', 'needle in a\nhaystack')
  await backend.set('/dir/b.txt', 'no match\nneedle in b')
  await backend.set('/c.txt', 'needle in c')

  const results = []
  for await (const r of backend.scanStream('needle')) {
    results.push(r)
  }

  if (results.length !== 3) throw new Error(`Expected 3 matches, got ${results.length}`)

  const paths = results.map(r => r.path).sort()
  const expected = ['/c.txt', '/dir/a.txt', '/dir/b.txt'].sort()
  if (JSON.stringify(paths) !== JSON.stringify(expected)) {
    throw new Error(`Paths mismatch: ${JSON.stringify(paths)}`)
  }
  console.log('✓ testScanStreamMultipleFiles_AgenticStore passed')
}

// ── run ──────────────────────────────────────────────────────────────────

async function runTests() {
  console.log('Running DBB-004 streaming scan() tests...\n')

  const tests = [
    testScanStreamIsLazy,
    testScanStreamNoTrailingNewline_MemoryStorage,
    testScanStreamNoTrailingNewline_AgenticStore,
    testScanStreamNoTrailingNewline_NodeFs,
    testScanStreamEmptyFile_MemoryStorage,
    testScanStreamEmptyFile_AgenticStore,
    testScanStreamEmptyFile_NodeFs,
    testAgenticStoreMetaKeysFiltered,
    testAgenticStoreMetaKeysFilteredInList,
    testScanDelegatesToScanStream_AgenticStore,
    testScanDelegatesToScanStream_NodeFs,
    testCrossBackendConsistency,
    testBinaryContent_NodeFs,
    testScanStreamResultShape,
    testScanStreamMultipleFiles_AgenticStore,
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    try {
      await test()
      passed++
    } catch (err) {
      console.error(`✗ ${test.name} failed: ${err.message}`)
      failed++
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`)
  return { passed, failed, total: tests.length }
}

const result = await runTests()
if (result.failed > 0) process.exit(1)
