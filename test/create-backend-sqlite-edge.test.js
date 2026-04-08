// Edge case tests for SQLiteBackend in createBackend() auto-selection (task-1775589123427)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createBackend, createAutoBackend, createDefaultBackend, SQLiteBackend, NodeFsBackend } from '../dist/index.js'

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

// sqlitePath option is accepted without error (falls through when better-sqlite3 not installed)
test('createBackend accepts sqlitePath option', async () => {
  const backend = await createBackend({ sqlitePath: '/tmp/test-edge.db' })
  // In environment without better-sqlite3, falls through to NodeFsBackend
  assert.ok(backend instanceof NodeFsBackend)
})

// sqlitePath combined with sqliteDb: sqliteDb takes priority
test('sqliteDb takes priority over sqlitePath', async () => {
  const mockDb = makeMockDb()
  const backend = await createBackend({ sqliteDb: mockDb, sqlitePath: '/tmp/ignored.db' })
  assert.ok(backend instanceof SQLiteBackend, 'sqliteDb should take priority')
})

// createAutoBackend with sqliteDb mock returns SQLiteBackend
test('createAutoBackend works with sqliteDb option', async () => {
  const mockDb = makeMockDb()
  const backend = await createAutoBackend({ sqliteDb: mockDb })
  assert.ok(backend instanceof SQLiteBackend, 'createAutoBackend should return SQLiteBackend with sqliteDb')
})

// createDefaultBackend with sqliteDb mock returns SQLiteBackend
test('createDefaultBackend works with sqliteDb option', async () => {
  const mockDb = makeMockDb()
  const backend = await createDefaultBackend({ sqliteDb: mockDb })
  assert.ok(backend instanceof SQLiteBackend, 'createDefaultBackend should return SQLiteBackend with sqliteDb')
})

// sqliteDb: null should fall through to auto-selection (not treated as truthy)
test('createBackend with sqliteDb: null falls through to NodeFs', async () => {
  const backend = await createBackend({ sqliteDb: null })
  assert.ok(backend instanceof NodeFsBackend, 'null sqliteDb should fall through')
})

// sqliteDb with a mock that supports full CRUD via createBackend
test('sqliteDb backend supports set/get/delete/list', async () => {
  const mockDb = makeMockDb()
  const backend = await createBackend({ sqliteDb: mockDb })

  await backend.set('/edge.txt', 'edge content')
  assert.equal(await backend.get('/edge.txt'), 'edge content')

  const list = await backend.list()
  assert.ok(list.includes('/edge.txt'), 'list should include /edge.txt')

  await backend.delete('/edge.txt')
  assert.equal(await backend.get('/edge.txt'), null)
})

// rootDir option still works when sqliteDb not provided
test('rootDir option returns NodeFsBackend with correct root', async () => {
  const dir = '/tmp/afs-edge-' + Date.now()
  const backend = await createBackend({ rootDir: dir })
  assert.ok(backend instanceof NodeFsBackend)
  await backend.set('/probe.txt', 'works')
  assert.equal(await backend.get('/probe.txt'), 'works')
  await backend.delete('/probe.txt')
})

// All three exports (createBackend, createDefaultBackend, createAutoBackend) are the same function
test('createDefaultBackend and createAutoBackend are aliases of createBackend', async () => {
  assert.equal(createDefaultBackend, createBackend, 'createDefaultBackend should be createBackend')
  assert.equal(createAutoBackend, createBackend, 'createAutoBackend should be createBackend')
})
