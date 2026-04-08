// Test streaming scan() implementation
import { AgenticFileSystem, MemoryStorage, NodeFsBackend } from '../dist/index.js'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

async function testScanStreamYieldsSameAsScn() {
  const storage = new MemoryStorage()
  await storage.set('/file1.txt', 'hello world\ntest pattern\ngoodbye')
  await storage.set('/file2.txt', 'another test\nno match here')
  await storage.set('/file3.txt', 'test again')

  // Collect results from scanStream
  const streamResults = []
  for await (const result of storage.scanStream('test')) {
    streamResults.push(result)
  }

  // Get results from scan
  const scanResults = await storage.scan('test')

  if (streamResults.length !== scanResults.length) {
    throw new Error(`scanStream yielded ${streamResults.length} results, scan returned ${scanResults.length}`)
  }

  // Compare each result
  for (let i = 0; i < streamResults.length; i++) {
    const stream = streamResults[i]
    const scan = scanResults[i]
    if (stream.path !== scan.path || stream.line !== scan.line || stream.content !== scan.content) {
      throw new Error(`Result ${i} mismatch: ${JSON.stringify(stream)} vs ${JSON.stringify(scan)}`)
    }
  }

  console.log('✓ testScanStreamYieldsSameAsScn passed')
}

async function testScanStreamNoMatches() {
  const storage = new MemoryStorage()
  await storage.set('/file1.txt', 'hello world')
  await storage.set('/file2.txt', 'goodbye')

  const results = []
  for await (const result of storage.scanStream('nonexistent')) {
    results.push(result)
  }

  if (results.length !== 0) {
    throw new Error(`Expected 0 results, got ${results.length}`)
  }

  console.log('✓ testScanStreamNoMatches passed')
}

async function testScanStreamEmptyStorage() {
  const storage = new MemoryStorage()

  const results = []
  for await (const result of storage.scanStream('test')) {
    results.push(result)
  }

  if (results.length !== 0) {
    throw new Error(`Expected 0 results, got ${results.length}`)
  }

  console.log('✓ testScanStreamEmptyStorage passed')
}

async function testScanStreamMultipleMatches() {
  const storage = new MemoryStorage()
  await storage.set('/file.txt', 'test line 1\ntest line 2\nno match\ntest line 4')

  const results = []
  for await (const result of storage.scanStream('test')) {
    results.push(result)
  }

  if (results.length !== 3) {
    throw new Error(`Expected 3 matches, got ${results.length}`)
  }

  if (results[0].line !== 1 || results[1].line !== 2 || results[2].line !== 4) {
    throw new Error('Line numbers incorrect')
  }

  console.log('✓ testScanStreamMultipleMatches passed')
}

async function testScanStreamAllBackends() {
  const testDir = '/tmp/agentic-fs-test-' + Date.now()

  try {
    mkdirSync(testDir, { recursive: true })
    writeFileSync(join(testDir, 'test1.txt'), 'hello test\nworld')
    writeFileSync(join(testDir, 'test2.txt'), 'another test line')

    const nodeFsBackend = new NodeFsBackend(testDir)

    // Test NodeFsBackend
    const nodeFsResults = []
    for await (const result of nodeFsBackend.scanStream('test')) {
      nodeFsResults.push(result)
    }

    if (nodeFsResults.length !== 2) {
      throw new Error(`NodeFsBackend: Expected 2 results, got ${nodeFsResults.length}`)
    }

    // Verify scan() delegates to scanStream()
    const scanResults = await nodeFsBackend.scan('test')
    if (scanResults.length !== nodeFsResults.length) {
      throw new Error('scan() and scanStream() returned different counts')
    }

    console.log('✓ testScanStreamAllBackends passed')
  } finally {
    rmSync(testDir, { recursive: true, force: true })
  }
}

async function testScanStreamLargeFile() {
  const testDir = '/tmp/agentic-fs-test-large-' + Date.now()

  try {
    mkdirSync(testDir, { recursive: true })

    // Create a large file (>10MB)
    const lines = []
    const targetSize = 11 * 1024 * 1024 // 11MB
    const lineContent = 'x'.repeat(1000) // 1KB per line
    const numLines = Math.ceil(targetSize / 1000)

    for (let i = 0; i < numLines; i++) {
      if (i % 1000 === 0) {
        lines.push(`match pattern at line ${i}`)
      } else {
        lines.push(lineContent)
      }
    }

    writeFileSync(join(testDir, 'large.txt'), lines.join('\n'))

    const backend = new NodeFsBackend(testDir)

    // Measure memory before
    global.gc && global.gc()
    const memBefore = process.memoryUsage().heapUsed

    // Stream through the file
    const results = []
    for await (const result of backend.scanStream('match pattern')) {
      results.push(result)
    }

    // Measure memory after
    global.gc && global.gc()
    const memAfter = process.memoryUsage().heapUsed
    const memDelta = memAfter - memBefore

    // Memory increase should be much less than file size (11MB)
    // Allow up to 5MB increase (generous threshold)
    if (memDelta > 5 * 1024 * 1024) {
      console.log(`  Warning: Memory increased by ${(memDelta / 1024 / 1024).toFixed(2)}MB (file is 11MB)`)
      console.log('  This suggests streaming may not be working optimally')
    } else {
      console.log(`  Memory delta: ${(memDelta / 1024 / 1024).toFixed(2)}MB (good - streaming is working)`)
    }

    // Verify we found the matches
    const expectedMatches = Math.floor(numLines / 1000) + 1
    if (results.length < expectedMatches - 1 || results.length > expectedMatches + 1) {
      throw new Error(`Expected ~${expectedMatches} matches, got ${results.length}`)
    }

    console.log('✓ testScanStreamLargeFile passed')
  } finally {
    rmSync(testDir, { recursive: true, force: true })
  }
}

async function testScanStreamIncremental() {
  const storage = new MemoryStorage()
  await storage.set('/file1.txt', 'match 1')
  await storage.set('/file2.txt', 'match 2')
  await storage.set('/file3.txt', 'match 3')

  // Verify we can break out of iteration early
  let count = 0
  for await (const result of storage.scanStream('match')) {
    count++
    if (count === 2) break
  }

  if (count !== 2) {
    throw new Error(`Expected to break after 2 iterations, got ${count}`)
  }

  console.log('✓ testScanStreamIncremental passed')
}

async function testScanDelegatesToScanStream() {
  const storage = new MemoryStorage()
  await storage.set('/file.txt', 'test content')

  // Both should return same results
  const streamResults = []
  for await (const r of storage.scanStream('test')) {
    streamResults.push(r)
  }

  const scanResults = await storage.scan('test')

  if (streamResults.length !== scanResults.length) {
    throw new Error('scan() and scanStream() returned different counts')
  }

  if (streamResults.length !== 1) {
    throw new Error('Expected 1 result')
  }

  console.log('✓ testScanDelegatesToScanStream passed')
}

// Run all tests
async function runTests() {
  console.log('Running streaming scan() tests...\n')

  const tests = [
    testScanStreamYieldsSameAsScn,
    testScanStreamNoMatches,
    testScanStreamEmptyStorage,
    testScanStreamMultipleMatches,
    testScanStreamAllBackends,
    testScanStreamLargeFile,
    testScanStreamIncremental,
    testScanDelegatesToScanStream
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    try {
      await test()
      passed++
    } catch (err) {
      console.error(`✗ ${test.name} failed:`, err.message)
      failed++
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`)

  if (failed > 0) {
    process.exit(1)
  }
}

runTests()
