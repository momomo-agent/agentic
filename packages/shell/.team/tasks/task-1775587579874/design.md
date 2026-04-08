# Technical Design — task-1775587579874: Fix cp without -r on directory error message

## Goal
Change the cp directory-without-r error message from the generic "is a directory" to the UNIX-standard format that includes the -r flag hint.

## Problem
Current code at src/index.ts:722:
```typescript
try { await this.fs.ls(this.resolve(src)); return `cp: ${src}: is a directory` } catch { /* not a directory */ }
```

This returns: `cp: /mydir: is a directory`

UNIX cp returns: `cp: -r not specified; omitting directory '/mydir'`

DBB-m25-cp-001 requires: `cp: -r not specified; omitting directory /mydir` or equivalent UNIX format.

## Files to Modify
1. `src/index.ts` — line 722 (error message in cp() method)
2. `test/cp-error.test.ts` — new test file (or add to existing test file)

## Source Code Change

### File: src/index.ts — line 722

**Before**:
```typescript
try { await this.fs.ls(this.resolve(src)); return `cp: ${src}: is a directory` } catch { /* not a directory */ }
```

**After**:
```typescript
try { await this.fs.ls(this.resolve(src)); return `cp: -r not specified; omitting directory '${src}'` } catch { /* not a directory */ }
```

Rationale:
- Matches GNU coreutils cp behavior
- Explains WHY the copy failed (missing -r flag)
- Includes the directory path for debugging
- UNIX-standard format: `cp: <reason>; <action> '<path>'`

## Edge Cases
- cp with multiple sources where one is a directory: current code processes sequentially, so first directory hit returns error immediately. This is acceptable behavior.
- cp /dir /dest where /dest exists as a file: handled before the directory check (write to file path).
- Relative vs absolute paths: src variable preserves original user input, so error shows exactly what user typed.

## Test Cases

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AgenticShell } from '../src/index'

function makeMockFs(overrides = {}) {
  return {
    ls: vi.fn().mockResolvedValue([]),
    read: vi.fn().mockResolvedValue({ content: '', error: null }),
    write: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    grep: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as any
}

describe('cp error messages', () => {
  it('cp dir without -r returns -r not specified error', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([{ name: 'file.txt', type: 'file' }]),
    })
    const sh = new AgenticShell(fs)
    const { output } = await sh.exec('cp /mydir /dest')
    expect(output).toContain('-r not specified')
    expect(output).toContain('omitting directory')
    expect(output).not.toContain('is a directory')
  })

  it('cp -r on directory still works', async () => {
    const fs = makeMockFs({
      ls: vi.fn()
        .mockResolvedValueOnce([{ name: 'file.txt', type: 'file' }]) // src dir
        .mockResolvedValueOnce([]), // dst dir
      read: vi.fn().mockResolvedValue({ content: 'hello', error: null }),
      mkdir: vi.fn().mockResolvedValue(undefined),
    })
    const sh = new AgenticShell(fs)
    const { output, exitCode } = await sh.exec('cp -r /mydir /dest')
    expect(exitCode).toBe(0)
    expect(output).toBe('')
  })

  it('cp file still works (no regression)', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockRejectedValue(new Error('not a dir')),
      read: vi.fn().mockResolvedValue({ content: 'hello', error: null }),
    })
    const sh = new AgenticShell(fs)
    const { exitCode } = await sh.exec('cp /file.txt /copy.txt')
    expect(exitCode).toBe(0)
  })
})
```

## Dependencies
- None — standalone one-line fix
- Can be done first in m25 (independent, low risk)

## Verification
- Run `npx vitest run test/cp-error.test.ts` — all 3 tests pass
- Run `npm test` — no regressions
- DBB criteria: DBB-m25-cp-001, DBB-m25-cp-002, DBB-m25-cp-003 verified
