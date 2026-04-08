# Task Design: Fix cp without -r on Directory

## Scope
Fix error message when `cp` is called on a directory without `-r`.

## File to Modify
- `src/index.ts` (line ~560)
- `src/index.test.ts`

## Current Code (line 560)
```typescript
try { await this.fs.ls(this.resolve(src)); return `cp: ${src}: is a directory (use -r)` } catch { /* not a directory */ }
```

## Fix
```typescript
try { await this.fs.ls(this.resolve(src)); return `cp: ${src}: is a directory` } catch { /* not a directory */ }
```

Remove ` (use -r)` suffix to match UNIX standard (`cp: dir: is a directory`).

## Test Cases
```typescript
it('cp dir dest without -r returns "cp: dir: is a directory"', async () => {
  // setup: create a directory
  await shell.exec('mkdir /mydir')
  const r = await shell.exec('cp /mydir /dest')
  expect(r.output).toBe('cp: /mydir: is a directory')
  expect(r.exitCode).toBe(1)
})
it('cp -r dir dest still works')
```

## Error Format
Follows UNIX convention: `cp: <path>: is a directory`
exitCode: 1 (matches `exitCodeFor` regex `^\w[\w-]*: .+: .+`)
