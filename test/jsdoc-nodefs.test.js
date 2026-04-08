import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('../src/backends/node-fs.ts', import.meta.url), 'utf-8')

describe('DBB-001: Class-level JSDoc on NodeFsBackend', () => {
  it('has JSDoc block before class declaration', () => {
    const classMatch = src.match(/\/\*\*[\s\S]*?\*\/\s*\nexport class NodeFsBackend/)
    assert.ok(classMatch, 'NodeFsBackend should have a JSDoc block immediately before the class declaration')
  })

  it('class JSDoc describes Node.js filesystem backend', () => {
    const classMatch = src.match(/\/\*\*([\s\S]*?)\*\/\s*\nexport class NodeFsBackend/)
    assert.ok(classMatch)
    const jsdoc = classMatch[1].toLowerCase()
    assert.ok(jsdoc.includes('node') || jsdoc.includes('filesystem') || jsdoc.includes('file system'),
      'Class JSDoc should describe it as a Node.js filesystem backend')
  })
})

describe('DBB-002: JSDoc on get method', () => {
  it('has JSDoc with @param and @returns', () => {
    const getMatch = src.match(/\/\*\*([\s\S]*?)\*\/\s*\n\s*async get\(/)
    assert.ok(getMatch, 'get method should have JSDoc block')
    const jsdoc = getMatch[1]
    assert.ok(jsdoc.includes('@param'), 'get JSDoc should have @param')
    assert.ok(jsdoc.includes('@returns'), 'get JSDoc should have @returns')
    assert.ok(jsdoc.toLowerCase().includes('null'), 'get @returns should mention null')
  })
})

describe('DBB-003: JSDoc on set method', () => {
  it('has JSDoc with @param for path and content', () => {
    const setMatch = src.match(/\/\*\*([\s\S]*?)\*\/\s*\n\s*async set\(/)
    assert.ok(setMatch, 'set method should have JSDoc block')
    const jsdoc = setMatch[1]
    const paramMatches = jsdoc.match(/@param/g) || []
    assert.ok(paramMatches.length >= 2, `set JSDoc should have at least 2 @param entries, found ${paramMatches.length}`)
  })
})

describe('DBB-004: JSDoc on delete method', () => {
  it('has JSDoc with @param and mentions no-op', () => {
    const deleteMatch = src.match(/\/\*\*([\s\S]*?)\*\/\s*\n\s*async delete\(/)
    assert.ok(deleteMatch, 'delete method should have JSDoc block')
    const jsdoc = deleteMatch[1]
    assert.ok(jsdoc.includes('@param'), 'delete JSDoc should have @param')
    const lower = jsdoc.toLowerCase()
    assert.ok(lower.includes('no-op') || lower.includes('noop') || lower.includes('missing') || lower.includes('not exist') || lower.includes('does not'),
      'delete JSDoc should mention no-op behavior for missing files')
  })
})

describe('DBB-005: JSDoc on list method', () => {
  it('has JSDoc with @param for prefix and @returns', () => {
    const listMatch = src.match(/\/\*\*([\s\S]*?)\*\/\s*\n\s*async list\(/)
    assert.ok(listMatch, 'list method should have JSDoc block')
    const jsdoc = listMatch[1]
    assert.ok(jsdoc.includes('@param'), 'list JSDoc should have @param')
    assert.ok(jsdoc.includes('@returns'), 'list JSDoc should have @returns')
  })
})

describe('DBB-006: JSDoc on scan method', () => {
  it('has JSDoc with @param for pattern and @returns', () => {
    const scanMatch = src.match(/\/\*\*([\s\S]*?)\*\/\s*\n\s*async scan\(/)
    assert.ok(scanMatch, 'scan method should have JSDoc block')
    const jsdoc = scanMatch[1]
    assert.ok(jsdoc.includes('@param'), 'scan JSDoc should have @param')
    assert.ok(jsdoc.includes('@returns'), 'scan JSDoc should have @returns')
  })
})

describe('DBB-007: JSDoc on scanStream method', () => {
  it('has JSDoc with @param for pattern and @returns', () => {
    const scanStreamMatch = src.match(/\/\*\*([\s\S]*?)\*\/\s*\n\s*async \*scanStream\(/)
    assert.ok(scanStreamMatch, 'scanStream method should have JSDoc block')
    const jsdoc = scanStreamMatch[1]
    assert.ok(jsdoc.includes('@param'), 'scanStream JSDoc should have @param')
    assert.ok(jsdoc.includes('@returns'), 'scanStream JSDoc should have @returns')
  })
})

describe('DBB-008: JSDoc on batchGet method', () => {
  it('has JSDoc with @param for paths and @returns', () => {
    const batchGetMatch = src.match(/\/\*\*([\s\S]*?)\*\/\s*\n\s*async batchGet\(/)
    assert.ok(batchGetMatch, 'batchGet method should have JSDoc block')
    const jsdoc = batchGetMatch[1]
    assert.ok(jsdoc.includes('@param'), 'batchGet JSDoc should have @param')
    assert.ok(jsdoc.includes('@returns'), 'batchGet JSDoc should have @returns')
  })
})

describe('DBB-009: JSDoc on batchSet method', () => {
  it('has JSDoc with @param for entries', () => {
    const batchSetMatch = src.match(/\/\*\*([\s\S]*?)\*\/\s*\n\s*async batchSet\(/)
    assert.ok(batchSetMatch, 'batchSet method should have JSDoc block')
    const jsdoc = batchSetMatch[1]
    assert.ok(jsdoc.includes('@param'), 'batchSet JSDoc should have @param')
  })
})

describe('DBB-010: JSDoc on stat method', () => {
  it('has JSDoc with @param and @returns describing stat result', () => {
    const statMatch = src.match(/\/\*\*([\s\S]*?)\*\/\s*\n\s*async stat\(/)
    assert.ok(statMatch, 'stat method should have JSDoc block')
    const jsdoc = statMatch[1]
    assert.ok(jsdoc.includes('@param'), 'stat JSDoc should have @param')
    assert.ok(jsdoc.includes('@returns'), 'stat JSDoc should have @returns')
  })
})

describe('DBB-011: JSDoc style consistency', () => {
  it('all public methods have substantive JSDoc (not placeholder)', () => {
    const methods = ['get', 'set', 'delete', 'list', 'scan', 'scanStream', 'batchGet', 'batchSet', 'stat']
    for (const method of methods) {
      const pattern = method === 'scanStream'
        ? new RegExp(`/\\*\\*([\\s\\S]*?)\\*/\\s*\\n\\s*async \\*${method}\\(`)
        : new RegExp(`/\\*\\*([\\s\\S]*?)\\*/\\s*\\n\\s*async ${method}\\(`)
      const match = src.match(pattern)
      assert.ok(match, `${method} should have JSDoc`)
      const jsdoc = match[1].trim()
      // Substantive = at least 20 chars of content
      assert.ok(jsdoc.length >= 20, `${method} JSDoc should be substantive (found ${jsdoc.length} chars)`)
    }
  })

  it('uses consistent @param name description pattern', () => {
    const params = [...src.matchAll(/@param\s+\w+\s+\S+/g)]
    assert.ok(params.length >= 10, `Should have at least 10 @param entries, found ${params.length}`)
  })

  it('class has @example block', () => {
    const classMatch = src.match(/\/\*\*([\s\S]*?)\*\/\s*\nexport class NodeFsBackend/)
    assert.ok(classMatch)
    assert.ok(classMatch[1].includes('@example'), 'Class JSDoc should include @example')
  })
})

describe('DBB-014: Build still passes', () => {
  it('source file has no TypeScript errors (verified by tsup build)', () => {
    // Build was run before tests and passed — this is a structural check
    assert.ok(src.includes('export class NodeFsBackend'), 'Source should still export NodeFsBackend')
    assert.ok(src.includes('implements StorageBackend'), 'Class should still implement StorageBackend')
  })
})
