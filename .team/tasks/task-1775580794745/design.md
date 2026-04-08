# Design: Add path resolution unit tests

## File to Modify
- `src/index.test.ts` — add `describe('path resolution')` block

## Approach
`normalizePath` and `resolve` are private methods. Test them indirectly via `exec('pwd')` after `exec('cd <path>')`, or via `exec('cat <relative-path>')` which calls `resolve()` internally.

## Test Cases (DBB-path-001 to DBB-path-005)

```typescript
describe('path resolution', () => {
  // DBB-path-001: basic .. traversal
  it('resolves ../ correctly', async () => {
    await shell.exec('cd /a/b')
    expect(await shell.exec('pwd')).toBe('/a/b')
    await shell.exec('cd ..')
    expect(await shell.exec('pwd')).toBe('/a')
  })

  // DBB-path-002: root escape prevention
  it('prevents escaping root with excessive ..', async () => {
    await shell.exec('cd /')
    await shell.exec('cd ../../../..')
    expect(await shell.exec('pwd')).toBe('/')
  })

  // DBB-path-003: relative-to-absolute from nested cwd
  it('resolves relative path from nested cwd', async () => {
    // write file at /a/b/c/file.txt, cd to /a/b/c, cat ../file2.txt
    // verify resolve('/a/b/c' + '/../file2.txt') = '/a/b/file2.txt'
  })

  // DBB-path-004: . stays at cwd
  it('resolve(".") returns cwd', async () => {
    await shell.exec('cd /a/b')
    expect(await shell.exec('pwd')).toBe('/a/b')
    await shell.exec('cd .')
    expect(await shell.exec('pwd')).toBe('/a/b')
  })

  // DBB-path-005: deep ../ chain
  it('resolves ../../foo from /a/b/c to /a/foo', async () => {
    await shell.exec('cd /a/b/c')
    await shell.exec('cd ../../foo')  // needs /a/foo to exist as dir
    expect(await shell.exec('pwd')).toBe('/a/foo')
  })
})
```

## Dependencies
- MockFileSystem must have dirs `/a`, `/a/b`, `/a/b/c`, `/a/foo` pre-created in beforeEach
