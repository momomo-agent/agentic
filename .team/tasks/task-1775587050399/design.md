# Technical Design — task-1775587050399: Fix mkdir error format to UNIX standard

## Goal
Fix `mkdir` error message from non-standard format to UNIX standard. This is the only code change in m24.

## Problem
Current code at `src/index.ts:603`:
```typescript
return `mkdir: cannot create directory '${p}': ${e.message ?? e}`
```

Expected UNIX format per DBB-mkdir-003:
```
mkdir: /a/b/c: No such file or directory
```

## Files to Modify
1. `src/index.ts` — line 603 (error message format)
2. `test/mkdir-find-cd.test.ts` — update assertions at lines 106-114 (DBB-012)

## Source Code Change

### File: `src/index.ts` — line 603

**Before:**
```typescript
try { await this.mkdirOne(resolved) } catch (e: any) {
  return `mkdir: cannot create directory '${p}': ${e.message ?? e}`
}
```

**After:**
```typescript
try { await this.mkdirOne(resolved) } catch (e: any) {
  return `mkdir: ${p}: No such file or directory`
}
```

Rationale:
- Always return `No such file or directory` regardless of underlying error
- Match UNIX format `<cmd>: <path>: <reason>`
- The original error message `e.message` varies by fs backend — standardize it

### Edge Case: mkdir on existing directory
If `mkdirOne` throws because directory already exists, the fix would return `mkdir: X: No such file or directory` which is semantically wrong. However:
- `mkdir -p` already catches this (line 596: `catch { /* already exists, ok */ }`)
- Non-recursive `mkdir` on existing directory uses `mkdirOne` which may throw
- If the "File exists" case matters, use this alternative:
```typescript
try { await this.mkdirOne(resolved) } catch (e: any) {
  const msg = e.message ?? String(e)
  if (msg.toLowerCase().includes('exist'))
    return `mkdir: ${p}: File exists`
  return `mkdir: ${p}: No such file or directory`
}
```

## Test Changes

### File: `test/mkdir-find-cd.test.ts` — lines 106-114

**Before:**
```typescript
it('returns error when parent does not exist', async () => {
  const fs = makeMockFs({ ls: vi.fn().mockRejectedValue(new Error('No such file or directory')) })
  const sh = new AgenticShell(fs)
  const out = (await sh.exec('mkdir /a/b/c')).output
  expect(out).toMatch(/mkdir/)
  expect(out).toContain('No such file or directory')
})
```

**After:**
```typescript
it('returns UNIX format error when parent does not exist', async () => {
  const fs = makeMockFs({ ls: vi.fn().mockRejectedValue(new Error('No such file or directory')) })
  const sh = new AgenticShell(fs)
  const out = (await sh.exec('mkdir /a/b/c')).output
  expect(out).toBe('mkdir: /a/b/c: No such file or directory')
})

it('error format does not contain "cannot create directory"', async () => {
  const fs = makeMockFs({ ls: vi.fn().mockRejectedValue(new Error('No such file or directory')) })
  const sh = new AgenticShell(fs)
  const out = (await sh.exec('mkdir /a/b/c')).output
  expect(out).not.toContain('cannot create directory')
})
```

## Dependencies
- None — this is a standalone fix
- Should be done BEFORE other m24 tasks to ensure test baseline is correct

## Verification
- Run `npx vitest run test/mkdir-find-cd.test.ts` — all tests pass
- Run full `npm test` — no regressions
- DBB criteria: DBB-m24-mkdir-001, DBB-m24-mkdir-002 verified
