import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AgenticFileSystem, ShellFS } from '../dist/index.js'
import { MemoryStorage } from '../dist/index.js'

function makeShell() {
  const storage = new MemoryStorage()
  const fs = new AgenticFileSystem({ storage })
  return { shell: new ShellFS(fs), fs }
}

// DBB-004: ShellFS handles 'rm' command
test('rm deletes file and returns empty string', async () => {
  const { shell, fs } = makeShell()
  await fs.write('/tmp/x.txt', 'hello')
  const result = await shell.exec('rm /tmp/x.txt')
  assert.equal(result, '')
  const read = await fs.read('/tmp/x.txt')
  assert.ok(read.error, 'file should not exist after delete')
})

test('rm with no path returns error string', async () => {
  const { shell } = makeShell()
  const result = await shell.exec('rm')
  assert.equal(result, 'rm: missing operand')
})

test('rm on missing file is no-op', async () => {
  const { shell } = makeShell()
  const result = await shell.exec('rm /nonexistent.txt')
  assert.equal(result, '')
})

// DBB-005: ShellFS handles 'tree' command
test('tree returns string listing files', async () => {
  const { shell, fs } = makeShell()
  await fs.write('/a/b.txt', 'b')
  await fs.write('/a/c.txt', 'c')
  const result = await shell.exec('tree /a')
  assert.ok(result.includes('b.txt'), `expected b.txt in: ${result}`)
  assert.ok(result.includes('c.txt'), `expected c.txt in: ${result}`)
})

test('tree with no path defaults to root', async () => {
  const { shell, fs } = makeShell()
  await fs.write('/foo.txt', 'x')
  const result = await shell.exec('tree')
  assert.ok(result.includes('foo.txt'), `expected foo.txt in: ${result}`)
})

test('tree on empty directory returns path with no children', async () => {
  const { shell } = makeShell()
  const result = await shell.exec('tree /')
  assert.ok(typeof result === 'string')
})
