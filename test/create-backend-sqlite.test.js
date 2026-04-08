// Additional tests for createBackend with sqliteDb (task-1775585021613)
// Verifies DBB-005: SQLiteBackend in createBackend() auto-selection
import { createBackend, createDefaultBackend, SQLiteBackend, NodeFsBackend } from '../dist/index.js'

let passed = 0
let failed = 0

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed')
}

function makeMockDb() {
  const data = new Map()
  return {
    exec(sql) {},
    prepare(sql) {
      return {
        run(...args) {
          if (sql.includes('INSERT OR REPLACE')) {
            const [path, content, size, mtime] = args
            data.set(path, { content, size, mtime })
          } else if (sql.includes('DELETE')) {
            data.delete(args[0])
          }
        },
        get(...args) {
          if (sql.includes('SELECT content FROM files')) {
            const row = data.get(args[0])
            return row ? { content: row.content } : undefined
          } else if (sql.includes('SELECT size, mtime FROM files')) {
            const row = data.get(args[0])
            return row ? { size: row.size, mtime: row.mtime } : undefined
          }
        },
        all(...args) {
          if (sql.includes('WHERE path LIKE')) {
            const prefix = args[0].replace(/%$/, '')
            return [...data.keys()].filter(p => p.startsWith(prefix)).map(path => ({ path }))
          } else if (sql.includes('SELECT path, content FROM files')) {
            return [...data.entries()].map(([path, d]) => ({ path, content: d.content }))
          } else if (sql.includes('SELECT path FROM files')) {
            return [...data.keys()].map(path => ({ path }))
          }
          return []
        }
      }
    }
  }
}

// --- sqliteDb option returns SQLiteBackend ---

async function testSqliteDbReturnsSQLiteBackend() {
  const mockDb = makeMockDb()
  const backend = await createBackend({ sqliteDb: mockDb })
  assert(backend instanceof SQLiteBackend, 'Expected SQLiteBackend instance')
  console.log('  ✓ testSqliteDbReturnsSQLiteBackend')
}

// --- sqliteDb option takes priority over Node.js auto-selection ---

async function testSqliteDbTakesPriorityOverNode() {
  const mockDb = makeMockDb()
  const backend = await createBackend({ sqliteDb: mockDb })
  assert(backend instanceof SQLiteBackend, 'sqliteDb should take priority')
  // In Node.js without sqliteDb, should get NodeFsBackend
  const autoBackend = await createBackend()
  assert(autoBackend instanceof NodeFsBackend, 'Default in Node.js should be NodeFsBackend')
  console.log('  ✓ testSqliteDbTakesPriorityOverNode')
}

// --- Full CRUD operations with sqliteDb backend ---

async function testSqliteDbFullCRUD() {
  const mockDb = makeMockDb()
  const backend = await createBackend({ sqliteDb: mockDb })

  // Set and get
  await backend.set('/test.txt', 'hello world')
  assert(await backend.get('/test.txt') === 'hello world', 'get() should return set content')

  // List
  const list = await backend.list()
  assert(list.includes('/test.txt'), 'list() should include /test.txt')

  // Scan
  const scanResults = await backend.scan('hello')
  assert(scanResults.length === 1, `scan() should find 1 result, got ${scanResults.length}`)
  assert(scanResults[0].path === '/test.txt', 'scan path should be /test.txt')
  assert(scanResults[0].line === 1, 'scan line should be 1')

  // Scan stream
  const streamResults = []
  for await (const r of backend.scanStream('hello')) {
    streamResults.push(r)
  }
  assert(streamResults.length === 1, 'scanStream() should find 1 result')

  // Stat
  const stat = await backend.stat('/test.txt')
  assert(stat !== null, 'stat() should return non-null')
  assert(stat.size > 0, 'stat() size should be > 0')
  assert(stat.isDirectory === false, 'isDirectory should be false')

  // Delete
  await backend.delete('/test.txt')
  assert(await backend.get('/test.txt') === null, 'get() should return null after delete')

  console.log('  ✓ testSqliteDbFullCRUD')
}

// --- createBackend() default returns NodeFsBackend in Node.js ---

async function testDefaultReturnsNodeFs() {
  const backend = await createBackend()
  assert(backend instanceof NodeFsBackend, 'Default should be NodeFsBackend in Node.js')
  console.log('  ✓ testDefaultReturnsNodeFs')
}

// --- createBackend({ rootDir }) still works ---

async function testRootDirStillWorks() {
  const backend = await createBackend({ rootDir: '/tmp/afs-test-' + Date.now() })
  assert(backend instanceof NodeFsBackend, 'rootDir should still give NodeFsBackend')
  await backend.set('/probe.txt', 'works')
  assert(await backend.get('/probe.txt') === 'works', 'Should be able to set/get')
  await backend.delete('/probe.txt')
  console.log('  ✓ testRootDirStillWorks')
}

// --- createDefaultBackend is an alias for createBackend ---

async function testCreateDefaultBackendIsAlias() {
  const mockDb = makeMockDb()
  const backend = await createDefaultBackend({ sqliteDb: mockDb })
  assert(backend instanceof SQLiteBackend, 'createDefaultBackend should work with sqliteDb')
  console.log('  ✓ testCreateDefaultBackendIsAlias')
}

// --- sqliteDb with null/undefined falls back to auto-selection ---

async function testSqliteDbUndefinedFallsBack() {
  const backend = await createBackend({ sqliteDb: undefined })
  assert(backend instanceof NodeFsBackend, 'undefined sqliteDb should fall back to NodeFsBackend')
  console.log('  ✓ testSqliteDbUndefinedFallsBack')
}

// --- scanStream works with SQLite backend ---

async function testSqliteDbScanStream() {
  const mockDb = makeMockDb()
  const backend = await createBackend({ sqliteDb: mockDb })

  await backend.set('/a.txt', 'alpha\nbeta\ngamma')
  await backend.set('/b.txt', 'delta\nalpha again')

  const results = []
  for await (const r of backend.scanStream('alpha')) {
    results.push(r)
  }
  assert(results.length === 2, `Expected 2 alpha matches, got ${results.length}`)
  console.log('  ✓ testSqliteDbScanStream')
}

// --- Run all tests ---

async function runTests() {
  console.log('Running createBackend SQLite tests...\n')
  const tests = [
    testSqliteDbReturnsSQLiteBackend,
    testSqliteDbTakesPriorityOverNode,
    testSqliteDbFullCRUD,
    testDefaultReturnsNodeFs,
    testRootDirStillWorks,
    testCreateDefaultBackendIsAlias,
    testSqliteDbUndefinedFallsBack,
    testSqliteDbScanStream,
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
