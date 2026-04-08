# Technical Design — task-1775587579782: Implement recursive glob and bracket expressions

## Goal
Extend glob expansion to support recursive **/*.ts patterns and bracket expressions [abc]. Current expandGlob() only matches within a single directory. This task adds recursive directory traversal for ** and ensures bracket expressions work correctly in all contexts.

## Problem
Current code (src/index.ts:336-370):
- matchGlob() correctly converts [abc] to regex character class — no change needed
- expandGlob() only lists a single directory (line 355-359)
- expandPathArgs() calls expandGlob() with cwd — no recursive traversal
- ** (double-star) is not recognized as a special pattern

## Files to Modify
1. `src/index.ts` — expandGlob(), new expandRecursiveGlob(), expandPathArgs()
2. `test/glob-recursive.test.ts` — new test file

## Source Code Changes

### 1. New Method: expandRecursiveGlob()

Add after expandGlob() (~line 360):

```typescript
private async expandRecursiveGlob(baseDir: string, pattern: string): Promise<string[]> {
  // pattern is the part after **/ e.g., "*.ts" or "[abc]*.ts"
  const results: string[] = []
  const visited = new Set<string>()
  const stack = [baseDir]

  while (stack.length) {
    const dir = stack.pop()!
    if (visited.has(dir)) continue
    visited.add(dir)

    let entries: Array<{ name: string; type: 'file' | 'dir' }>
    try {
      entries = await this.fs.ls(dir)
    } catch {
      continue
    }

    for (const e of entries) {
      const fullPath = dir === '/' ? '/' + e.name : dir + '/' + e.name
      if (e.type === 'dir') {
        stack.push(fullPath)
      }
      if (this.matchGlob(e.name, pattern)) {
        results.push(fullPath)
      }
    }
  }

  return results
}
```

**Algorithm**:
1. Use a stack-based DFS to traverse all directories from baseDir
2. For each directory, list entries
3. Match each entry name against the pattern (after **/)
4. Collect matching file paths
5. Use visited set to prevent infinite loops (symlinks)

### 2. Update expandGlob() to Handle **

**Location**: src/index.ts, expandGlob() (~line 353-359)

**Before**:
```typescript
private async expandGlob(pattern: string, dir: string): Promise<string[]> {
  if (!/[*?[]/.test(pattern)) return [pattern]
  const entries = await this.fs.ls(dir)
  return (entries as Array<{ name: string; type: 'file' | 'dir' }>)
    .filter(e => e.type === 'file' && this.matchGlob(e.name, pattern))
    .map(e => dir === '/' ? '/' + e.name : dir + '/' + e.name)
}
```

**After**:
```typescript
private async expandGlob(pattern: string, dir: string): Promise<string[]> {
  if (!/[*?[]/.test(pattern)) return [pattern]

  // Handle recursive ** patterns
  const doubleStarIdx = pattern.indexOf('**')
  if (doubleStarIdx !== -1) {
    // Split: prefix/**/suffix
    const before = pattern.slice(0, doubleStarIdx).replace(/\/$/, '')
    const after = pattern.slice(doubleStarIdx + 2).replace(/^\//, '')

    // Resolve base directory from prefix
    const baseDir = before ? this.resolve(before) : dir

    // If after is empty or just /*, match all files
    const matchPattern = after || '*'
    return this.expandRecursiveGlob(baseDir, matchPattern)
  }

  // Original single-directory expansion
  const entries = await this.fs.ls(dir)
  return (entries as Array<{ name: string; type: 'file' | 'dir' }>)
    .filter(e => e.type === 'file' && this.matchGlob(e.name, pattern))
    .map(e => dir === '/' ? '/' + e.name : dir + '/' + e.name)
}
```

**Key logic**:
- Detect `**` in pattern
- Split into prefix (before `**`) and suffix (after `**/`)
- Resolve prefix to get base directory
- Call expandRecursiveGlob() with base dir and suffix pattern
- Fall through to original logic for non-recursive patterns

### 3. Update expandPathArgs() for ** Patterns

**Location**: src/index.ts, expandPathArgs() (~line 361-370)

Current filter on line 364: `if (a.startsWith('-') || !/[*?[]/.test(a))`

This already detects `*` and `[` but doesn't distinguish `**`. No change needed — `**` contains `*` so it passes the filter. The expandGlob() update handles the rest.

However, for cat/ls with ** patterns that span directories, we should also consider directory entries in expandGlob (not just files). Update the filter in the original branch:

```typescript
.filter(e => (e.type === 'file' || pattern.includes('**')) && this.matchGlob(e.name, pattern))
```

Wait — for ** patterns, the recursive traversal already includes dirs. The original single-dir filter should stay as-is. No change needed.

## Edge Cases
- `**` with no suffix: `ls **` should match all files recursively
- `**` at start of path: `**/*.ts` — baseDir is cwd
- `**` with prefix: `src/**/*.ts` — baseDir is src/
- Multiple `**`: not supported (use first occurrence only)
- Empty glob result: original behavior (return pattern as-is for cat, error for ls)
- `**` matching directories: should include dir entries in results for ls, but not for cat

## Test Cases (test/glob-recursive.test.ts)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AgenticShell } from '../src/index'

function makeMockFs(entries: Record<string, Array<{name: string; type: 'file' | 'dir'}>>) {
  const readMap: Record<string, string> = {}
  return {
    ls: vi.fn().mockImplementation((path: string) => {
      if (entries[path]) return Promise.resolve(entries[path])
      return Promise.reject(new Error('No such file or directory'))
    }),
    read: vi.fn().mockImplementation((path: string) => {
      if (path in readMap) return Promise.resolve({ content: readMap[path], error: null })
      return Promise.resolve({ error: 'No such file or directory' })
    }),
    write: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    grep: vi.fn().mockResolvedValue([]),
  } as any
}

describe('recursive glob', () => {
  it('**/*.ts matches files across subdirectories', async () => {
    const fs = makeMockFs({
      '/': [{ name: 'src', type: 'dir' }],
      '/src': [{ name: 'a.ts', type: 'file' }, { name: 'lib', type: 'dir' }],
      '/src/lib': [{ name: 'b.ts', type: 'file' }],
    })
    const sh = new AgenticShell(fs)
    const { output } = await sh.exec('ls **/*.ts')
    expect(output).toContain('a.ts')
    expect(output).toContain('b.ts')
  })

  it('[abc] bracket matches character sets', async () => {
    const fs = makeMockFs({
      '/': [
        { name: 'a.txt', type: 'file' },
        { name: 'b.txt', type: 'file' },
        { name: 'c.txt', type: 'file' },
        { name: 'd.txt', type: 'file' },
      ],
    })
    const sh = new AgenticShell(fs)
    const { output } = await sh.exec('ls [abc].txt')
    expect(output).toContain('a.txt')
    expect(output).toContain('b.txt')
    expect(output).toContain('c.txt')
    expect(output).not.toContain('d.txt')
  })

  it('empty recursive glob returns error for cat', async () => {
    const fs = makeMockFs({ '/': [] })
    const sh = new AgenticShell(fs)
    const { output } = await sh.exec('cat **/*.xyz')
    expect(output).toContain('No such file or directory')
  })
})
```

## Dependencies
- None — independent from env vars and cp tasks
- Existing matchGlob() supports [abc] — verify no regression

## Verification
- Run `npx vitest run test/glob-recursive.test.ts` — all tests pass
- Run `npm test` — no regressions in existing glob/cat/ls/grep tests
- DBB criteria: DBB-m25-glob-001 through DBB-m25-glob-006 verified
