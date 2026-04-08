import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SQLiteBackend } from '../dist/index.js'

// Mock SQLite database for testing
class MockSQLiteDb {
  constructor() {
    this.data = new Map()
    this.executed = []
  }

  exec(sql) {
    this.executed.push(sql)
    // Handle CREATE TABLE, BEGIN, COMMIT, ROLLBACK
  }

  prepare(sql) {
    const db = this
    return {
      run(...args) {
        if (sql.includes('INSERT OR REPLACE')) {
          const [path, content, size, mtime] = args
          db.data.set(path, { content, size, mtime })
        } else if (sql.includes('DELETE')) {
          const [path] = args
          db.data.delete(path)
        }
      },
      get(...args) {
        if (sql.includes('SELECT content FROM files')) {
          const [path] = args
          const row = db.data.get(path)
          return row ? { content: row.content } : undefined
        } else if (sql.includes('SELECT size, mtime FROM files')) {
          const [path] = args
          const row = db.data.get(path)
          return row ? { size: row.size, mtime: row.mtime } : undefined
        }
      },
      all(...args) {
        if (sql.includes('WHERE path LIKE')) {
          const [pattern] = args
          // Strip the % wildcard from the pattern
          const prefix = pattern.replace(/%$/, '')
          return Array.from(db.data.entries())
            .filter(([path]) => path.startsWith(prefix))
            .map(([path]) => ({ path }))
        } else if (sql.includes('SELECT path FROM files')) {
          return Array.from(db.data.keys()).map(path => ({ path }))
        } else if (sql.includes('SELECT path, content FROM files')) {
          return Array.from(db.data.entries()).map(([path, data]) => ({
            path,
            content: data.content
          }))
        }
        return []
      }
    }
  }
}

// DBB-010: SQLite backend core contract
test('SQLiteBackend: set/get round-trip', async () => {
  const db = new MockSQLiteDb()
  const backend = new SQLiteBackend(db)
  await backend.set('/foo', 'bar')
  assert.equal(await backend.get('/foo'), 'bar')
})

test('SQLiteBackend: get missing returns null', async () => {
  const db = new MockSQLiteDb()
  const backend = new SQLiteBackend(db)
  assert.equal(await backend.get('/missing'), null)
})

test('SQLiteBackend: delete removes key', async () => {
  const db = new MockSQLiteDb()
  const backend = new SQLiteBackend(db)
  await backend.set('/x', 'v')
  await backend.delete('/x')
  assert.equal(await backend.get('/x'), null)
})

test('SQLiteBackend: delete missing is no-op', async () => {
  const db = new MockSQLiteDb()
  const backend = new SQLiteBackend(db)
  await assert.doesNotReject(() => backend.delete('/nope'))
})

// DBB-010: Path normalization
test('SQLiteBackend: paths stored with / prefix', async () => {
  const db = new MockSQLiteDb()
  const backend = new SQLiteBackend(db)
  await backend.set('foo', 'bar')
  assert.equal(await backend.get('/foo'), 'bar')
  assert.equal(await backend.get('foo'), 'bar')
})

test('SQLiteBackend: list returns paths with / prefix', async () => {
  const db = new MockSQLiteDb()
  const backend = new SQLiteBackend(db)
  await backend.set('/a', '1')
  await backend.set('/b', '2')
  const paths = await backend.list()
  assert.ok(paths.every(p => p.startsWith('/')))
  assert.ok(paths.includes('/a'))
  assert.ok(paths.includes('/b'))
})

test('SQLiteBackend: list with prefix filters correctly', async () => {
  const db = new MockSQLiteDb()
  const backend = new SQLiteBackend(db)
  await backend.set('/docs/a', '1')
  await backend.set('/src/b', '2')
  const paths = await backend.list('/docs')
  assert.equal(paths.length, 1)
  assert.equal(paths[0], '/docs/a')
})

// DBB-010: scan and scanStream
test('SQLiteBackend: scan returns correct {path, line, content}', async () => {
  const db = new MockSQLiteDb()
  const backend = new SQLiteBackend(db)
  await backend.set('/file', 'hello world\nfoo bar')
  const results = await backend.scan('hello')
  assert.equal(results.length, 1)
  assert.equal(results[0].path, '/file')
  assert.equal(results[0].line, 1)
  assert.equal(results[0].content, 'hello world')
})

test('SQLiteBackend: scan no match returns empty', async () => {
  const db = new MockSQLiteDb()
  const backend = new SQLiteBackend(db)
  await backend.set('/file', 'hello')
  assert.deepEqual(await backend.scan('xyz'), [])
})

test('SQLiteBackend: scan matches multiple lines', async () => {
  const db = new MockSQLiteDb()
  const backend = new SQLiteBackend(db)
  await backend.set('/file', 'test line 1\ntest line 2\nother')
  const results = await backend.scan('test')
  assert.equal(results.length, 2)
  assert.equal(results[0].line, 1)
  assert.equal(results[1].line, 2)
})

test('SQLiteBackend: scanStream yields same results as scan', async () => {
  const db = new MockSQLiteDb()
  const backend = new SQLiteBackend(db)
  await backend.set('/file', 'hello world\nfoo bar\nhello again')

  const scanResults = await backend.scan('hello')
  const streamResults = []
  for await (const result of backend.scanStream('hello')) {
    streamResults.push(result)
  }

  assert.equal(streamResults.length, scanResults.length)
  assert.deepEqual(streamResults, scanResults)
})

// DBB-010: batch operations
test('SQLiteBackend: batchGet retrieves multiple paths', async () => {
  const db = new MockSQLiteDb()
  const backend = new SQLiteBackend(db)
  await backend.set('/a', 'content-a')
  await backend.set('/b', 'content-b')

  const results = await backend.batchGet(['/a', '/b', '/missing'])
  assert.equal(results['/a'], 'content-a')
  assert.equal(results['/b'], 'content-b')
  assert.equal(results['/missing'], null)
})

test('SQLiteBackend: batchSet writes multiple entries', async () => {
  const db = new MockSQLiteDb()
  const backend = new SQLiteBackend(db)

  await backend.batchSet({
    '/x': 'content-x',
    '/y': 'content-y',
    '/z': 'content-z'
  })

  assert.equal(await backend.get('/x'), 'content-x')
  assert.equal(await backend.get('/y'), 'content-y')
  assert.equal(await backend.get('/z'), 'content-z')
})

test('SQLiteBackend: batchSet uses transaction', async () => {
  const db = new MockSQLiteDb()
  const backend = new SQLiteBackend(db)

  await backend.batchSet({ '/a': '1', '/b': '2' })

  // Check that BEGIN and COMMIT were called
  assert.ok(db.executed.some(sql => sql.includes('BEGIN')))
  assert.ok(db.executed.some(sql => sql.includes('COMMIT')))
})

// DBB-010: stat method
test('SQLiteBackend: stat returns size and mtime', async () => {
  const db = new MockSQLiteDb()
  const backend = new SQLiteBackend(db)
  await backend.set('/file', 'hello world')

  const stat = await backend.stat('/file')
  assert.ok(stat)
  assert.equal(stat.size, 11) // 'hello world'.length
  assert.ok(typeof stat.mtime === 'number')
  assert.ok(stat.mtime > 0)
})

test('SQLiteBackend: stat missing file throws NotFoundError', async () => {
  const db = new MockSQLiteDb()
  const backend = new SQLiteBackend(db)
  await assert.rejects(
    () => backend.stat('/missing'),
    (err) => err.name === 'NotFoundError'
  )
})

// DBB-010: exported from index.ts
test('SQLiteBackend: exported from package', async () => {
  assert.ok(SQLiteBackend)
})

// Edge cases
test('SQLiteBackend: handles empty content', async () => {
  const db = new MockSQLiteDb()
  const backend = new SQLiteBackend(db)
  await backend.set('/empty', '')
  assert.equal(await backend.get('/empty'), '')
})

test('SQLiteBackend: handles multiline content', async () => {
  const db = new MockSQLiteDb()
  const backend = new SQLiteBackend(db)
  const content = 'line1\nline2\nline3\n'
  await backend.set('/multi', content)
  assert.equal(await backend.get('/multi'), content)
})

test('SQLiteBackend: handles special characters in content', async () => {
  const db = new MockSQLiteDb()
  const backend = new SQLiteBackend(db)
  const content = 'special: "quotes" \'apostrophes\' <tags> & symbols'
  await backend.set('/special', content)
  assert.equal(await backend.get('/special'), content)
})

test('SQLiteBackend: handles special characters in paths', async () => {
  const db = new MockSQLiteDb()
  const backend = new SQLiteBackend(db)
  await backend.set('/path-with-dashes', 'content')
  await backend.set('/path_with_underscores', 'content')
  await backend.set('/path.with.dots', 'content')

  assert.equal(await backend.get('/path-with-dashes'), 'content')
  assert.equal(await backend.get('/path_with_underscores'), 'content')
  assert.equal(await backend.get('/path.with.dots'), 'content')
})

test('SQLiteBackend: overwrite existing file', async () => {
  const db = new MockSQLiteDb()
  const backend = new SQLiteBackend(db)
  await backend.set('/file', 'original')
  await backend.set('/file', 'updated')
  assert.equal(await backend.get('/file'), 'updated')
})

test('SQLiteBackend: list empty database returns empty array', async () => {
  const db = new MockSQLiteDb()
  const backend = new SQLiteBackend(db)
  const paths = await backend.list()
  assert.deepEqual(paths, [])
})

test('SQLiteBackend: scan empty database returns empty array', async () => {
  const db = new MockSQLiteDb()
  const backend = new SQLiteBackend(db)
  const results = await backend.scan('anything')
  assert.deepEqual(results, [])
})
