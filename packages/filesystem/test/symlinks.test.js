import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile, symlink, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { NodeFsBackend } from '../dist/index.js'

// Helper to create a temp directory for testing
async function createTestDir() {
  return await mkdtemp(join(tmpdir(), 'symlink-test-'))
}

// DBB: File symlink support
test('NodeFsBackend: list() includes file symlink', async () => {
  const root = await createTestDir()
  try {
    const backend = new NodeFsBackend(root)

    // Create a real file and a symlink to it
    await writeFile(join(root, 'target.txt'), 'target content')
    await symlink(join(root, 'target.txt'), join(root, 'link.txt'))

    const paths = await backend.list()
    assert.ok(paths.includes('/target.txt'), 'Should include target file')
    assert.ok(paths.includes('/link.txt'), 'Should include symlink')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('NodeFsBackend: get() follows file symlink', async () => {
  const root = await createTestDir()
  try {
    const backend = new NodeFsBackend(root)

    // Create a real file and a symlink to it
    await writeFile(join(root, 'target.txt'), 'target content')
    await symlink(join(root, 'target.txt'), join(root, 'link.txt'))

    const content = await backend.get('/link.txt')
    assert.equal(content, 'target content', 'Should read through symlink')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

// DBB: Directory symlink support
test('NodeFsBackend: list() includes files from directory symlink', async () => {
  const root = await createTestDir()
  try {
    const backend = new NodeFsBackend(root)

    // Create a directory with files and a symlink to it
    await mkdir(join(root, 'realdir'))
    await writeFile(join(root, 'realdir', 'file1.txt'), 'content1')
    await writeFile(join(root, 'realdir', 'file2.txt'), 'content2')
    await symlink(join(root, 'realdir'), join(root, 'linkdir'))

    const paths = await backend.list()
    assert.ok(paths.includes('/realdir/file1.txt'), 'Should include real dir files')
    assert.ok(paths.includes('/realdir/file2.txt'), 'Should include real dir files')
    // Note: Directory symlinks are resolved to their target, so files appear under the target path
    // This prevents duplicate entries and is consistent with how symlinks work
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('NodeFsBackend: get() reads through directory symlink', async () => {
  const root = await createTestDir()
  try {
    const backend = new NodeFsBackend(root)

    // Create a directory with a file and a symlink to the directory
    await mkdir(join(root, 'realdir'))
    await writeFile(join(root, 'realdir', 'file.txt'), 'dir content')
    await symlink(join(root, 'realdir'), join(root, 'linkdir'))

    // get() follows symlinks, so this should work
    const content = await backend.get('/linkdir/file.txt')
    assert.equal(content, 'dir content', 'Should read through directory symlink')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

// DBB: Broken symlink handling
test('NodeFsBackend: list() excludes broken symlink', async () => {
  const root = await createTestDir()
  try {
    const backend = new NodeFsBackend(root)

    // Create a symlink to a non-existent target
    await symlink(join(root, 'nonexistent.txt'), join(root, 'broken.txt'))

    const paths = await backend.list()
    assert.ok(!paths.includes('/broken.txt'), 'Should not include broken symlink')
    assert.ok(!paths.includes('/nonexistent.txt'), 'Should not include target')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('NodeFsBackend: get() returns null for broken symlink', async () => {
  const root = await createTestDir()
  try {
    const backend = new NodeFsBackend(root)

    // Create a symlink to a non-existent target
    await symlink(join(root, 'nonexistent.txt'), join(root, 'broken.txt'))

    const content = await backend.get('/broken.txt')
    assert.equal(content, null, 'Should return null for broken symlink')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

// DBB: Circular symlink detection
test('NodeFsBackend: list() handles circular symlinks without infinite loop', async () => {
  const root = await createTestDir()
  try {
    const backend = new NodeFsBackend(root)

    // Create circular symlinks: a -> b -> a
    await mkdir(join(root, 'a'))
    await mkdir(join(root, 'b'))
    await symlink(join(root, 'b'), join(root, 'a', 'link-to-b'))
    await symlink(join(root, 'a'), join(root, 'b', 'link-to-a'))

    // This should complete without hanging
    const paths = await backend.list()
    assert.ok(Array.isArray(paths), 'Should return an array')
    // The exact paths depend on traversal order, but it should not hang
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('NodeFsBackend: list() handles self-referencing symlink', async () => {
  const root = await createTestDir()
  try {
    const backend = new NodeFsBackend(root)

    // Create a symlink that points to itself
    await symlink(join(root, 'self'), join(root, 'self'))

    // This should complete without hanging
    const paths = await backend.list()
    assert.ok(Array.isArray(paths), 'Should return an array')
    assert.ok(!paths.includes('/self'), 'Should not include self-referencing symlink')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

// DBB: Symlink chains
test('NodeFsBackend: get() follows symlink chains', async () => {
  const root = await createTestDir()
  try {
    const backend = new NodeFsBackend(root)

    // Create a chain: link1 -> link2 -> target
    await writeFile(join(root, 'target.txt'), 'final content')
    await symlink(join(root, 'target.txt'), join(root, 'link2.txt'))
    await symlink(join(root, 'link2.txt'), join(root, 'link1.txt'))

    const content = await backend.get('/link1.txt')
    assert.equal(content, 'final content', 'Should follow symlink chain')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

// DBB: scan() with symlinks
test('NodeFsBackend: scan() matches content through symlinks', async () => {
  const root = await createTestDir()
  try {
    const backend = new NodeFsBackend(root)

    // Create a file and a symlink to it
    await writeFile(join(root, 'target.txt'), 'hello world\nfoo bar')
    await symlink(join(root, 'target.txt'), join(root, 'link.txt'))

    const results = await backend.scan('hello')

    // Should find matches in both the target and the symlink
    const targetMatch = results.find(r => r.path === '/target.txt')
    const linkMatch = results.find(r => r.path === '/link.txt')

    assert.ok(targetMatch, 'Should find match in target file')
    assert.ok(linkMatch, 'Should find match in symlink')
    assert.equal(targetMatch.content, 'hello world')
    assert.equal(linkMatch.content, 'hello world')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('NodeFsBackend: scanStream() matches content through symlinks', async () => {
  const root = await createTestDir()
  try {
    const backend = new NodeFsBackend(root)

    // Create a file and a symlink to it
    await writeFile(join(root, 'target.txt'), 'test line 1\ntest line 2')
    await symlink(join(root, 'target.txt'), join(root, 'link.txt'))

    const results = []
    for await (const result of backend.scanStream('test')) {
      results.push(result)
    }

    // Should find matches in both the target and the symlink
    const targetMatches = results.filter(r => r.path === '/target.txt')
    const linkMatches = results.filter(r => r.path === '/link.txt')

    assert.equal(targetMatches.length, 2, 'Should find 2 matches in target')
    assert.equal(linkMatches.length, 2, 'Should find 2 matches in symlink')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

// Edge case: Symlink to parent directory
test('NodeFsBackend: handles symlink to parent directory', async () => {
  const root = await createTestDir()
  try {
    const backend = new NodeFsBackend(root)

    // Create nested structure with symlink to parent
    await mkdir(join(root, 'parent'))
    await mkdir(join(root, 'parent', 'child'))
    await writeFile(join(root, 'parent', 'file.txt'), 'content')
    await symlink(join(root, 'parent'), join(root, 'parent', 'child', 'link-to-parent'))

    // This should complete without infinite loop
    const paths = await backend.list()
    assert.ok(Array.isArray(paths), 'Should return an array')
    assert.ok(paths.includes('/parent/file.txt'), 'Should include parent file')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

// Edge case: Relative symlinks
test('NodeFsBackend: handles relative symlinks', async () => {
  const root = await createTestDir()
  try {
    const backend = new NodeFsBackend(root)

    // Create a relative symlink
    await mkdir(join(root, 'dir'))
    await writeFile(join(root, 'dir', 'target.txt'), 'relative content')
    // Create symlink at root that points to dir/target.txt using relative path
    await symlink('dir/target.txt', join(root, 'link.txt'))

    const content = await backend.get('/link.txt')
    assert.equal(content, 'relative content', 'Should follow relative symlink')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

// Edge case: Symlink with special characters
test('NodeFsBackend: handles symlinks with special characters in names', async () => {
  const root = await createTestDir()
  try {
    const backend = new NodeFsBackend(root)

    // Create files and symlinks with special characters
    await writeFile(join(root, 'target-file.txt'), 'special content')
    await symlink(join(root, 'target-file.txt'), join(root, 'link_with-special.txt'))

    const paths = await backend.list()
    assert.ok(paths.includes('/link_with-special.txt'), 'Should handle special chars in symlink name')

    const content = await backend.get('/link_with-special.txt')
    assert.equal(content, 'special content', 'Should read through symlink with special chars')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
