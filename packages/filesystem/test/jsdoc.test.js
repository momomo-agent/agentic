// Tests for task-1775532383398: JSDoc on public APIs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const fsSource = readFileSync(new URL('../src/filesystem.ts', import.meta.url), 'utf-8')
const typesSource = readFileSync(new URL('../src/types.ts', import.meta.url), 'utf-8')

for (const method of ['read', 'write', 'delete', 'ls', 'grep', 'executeTool', 'getToolDefinitions']) {
  test(`AgenticFileSystem.${method} has JSDoc`, () => {
    const idx = fsSource.indexOf(`async ${method}(`) !== -1
      ? fsSource.indexOf(`async ${method}(`)
      : fsSource.indexOf(`${method}(`)
    assert.ok(idx !== -1, `method ${method} not found in source`)
    const before = fsSource.slice(Math.max(0, idx - 200), idx)
    assert.ok(before.includes('/**'), `${method} must have /** JSDoc comment`)
  })
}

for (const method of ['get', 'set', 'delete', 'list', 'scan']) {
  test(`StorageBackend.${method} has JSDoc`, () => {
    const idx = typesSource.indexOf(`${method}(`)
    assert.ok(idx !== -1, `method ${method} not found in types`)
    const before = typesSource.slice(Math.max(0, idx - 200), idx)
    assert.ok(before.includes('/**'), `StorageBackend.${method} must have /** JSDoc`)
  })
}

// Backend class-level and method-level JSDoc tests
const backendFiles = [
  { name: 'AgenticStoreBackend', file: '../src/backends/agentic-store.ts' },
  { name: 'OPFSBackend', file: '../src/backends/opfs.ts' },
  { name: 'NodeFsBackend', file: '../src/backends/node-fs.ts' },
  { name: 'MemoryStorage', file: '../src/backends/memory.ts' },
  { name: 'LocalStorageBackend', file: '../src/backends/local-storage.ts' },
  { name: 'SQLiteBackend', file: '../src/backends/sqlite.ts' },
]

for (const { name, file } of backendFiles) {
  test(`${name} has class-level JSDoc`, () => {
    const source = readFileSync(new URL(file, import.meta.url), 'utf-8')
    const classIdx = source.indexOf(`class ${name}`)
    assert.ok(classIdx !== -1, `class ${name} not found in ${file}`)
    const before = source.slice(Math.max(0, classIdx - 300), classIdx)
    assert.ok(before.includes('/**'), `${name} must have class-level JSDoc`)
  })
}

const methods = ['get', 'set', 'delete', 'list', 'scan', 'scanStream', 'batchGet', 'batchSet', 'stat']
for (const { name, file } of backendFiles) {
  const source = readFileSync(new URL(file, import.meta.url), 'utf-8')
  for (const method of methods) {
    // stat is optional; skip if method signature not found
    const hasMethod = source.includes(`${method}(`) || source.includes(`async ${method}(`) || source.includes(`async *${method}(`)
    if (!hasMethod && method === 'stat') continue
    test(`${name}.${method} has JSDoc`, () => {
      const idx = source.indexOf(`async *${method}(`) !== -1
        ? source.indexOf(`async *${method}(`)
        : source.indexOf(`async ${method}(`) !== -1
          ? source.indexOf(`async ${method}(`)
          : source.indexOf(`${method}(`)
      assert.ok(idx !== -1, `${name}.${method} not found in source`)
      const before = source.slice(Math.max(0, idx - 400), idx)
      assert.ok(before.includes('/**'), `${name}.${method} must have /** JSDoc comment`)
    })
  }
}
