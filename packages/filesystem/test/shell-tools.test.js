import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shellFsTools } from '../dist/index.js'

test('shellFsTools is array of 6', () => {
  assert.equal(shellFsTools.length, 6)
})

test('each tool has name, description, input_schema', () => {
  for (const t of shellFsTools) {
    assert.ok(typeof t.name === 'string')
    assert.ok(typeof t.description === 'string')
    assert.ok(t.input_schema && t.input_schema.type === 'object')
  }
})

test('shell_cat has path in required', () => {
  const t = shellFsTools.find(t => t.name === 'shell_cat')
  assert.ok(t.input_schema.required.includes('path'))
})

test('shell_head has lines in properties but not required', () => {
  const t = shellFsTools.find(t => t.name === 'shell_head')
  assert.ok('lines' in t.input_schema.properties)
  assert.ok(!t.input_schema.required.includes('lines'))
})

test('shell_tail has lines in properties but not required', () => {
  const t = shellFsTools.find(t => t.name === 'shell_tail')
  assert.ok('lines' in t.input_schema.properties)
  assert.ok(!t.input_schema.required.includes('lines'))
})

test('shell_find has no required params', () => {
  const t = shellFsTools.find(t => t.name === 'shell_find')
  assert.deepEqual(t.input_schema.required, [])
})

test('shellFsTools exported from package', async () => {
  const mod = await import('../dist/index.js')
  assert.ok(Array.isArray(mod.shellFsTools))
})
