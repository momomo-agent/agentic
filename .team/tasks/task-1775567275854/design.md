# Design: cp -r recursive directory copy

## Status
`cp -r` and `copyRecursive` are already implemented in `src/index.ts:447-484`.

## Gap to Fix
`cp` without `-r` on a directory currently calls `fs.read()` on a dir path, which may return empty content instead of an error. Must return a clear error.

## Change: src/index.ts

File: `src/index.ts`
Method: `cp()` at line ~447

After the `checkWritable` call and before `fs.read()`, add directory detection:

```typescript
private async cp(args: string[]): Promise<string> {
  const flags = args.filter(a => a.startsWith('-'))
  const recursive = flags.includes('-r') || flags.includes('-R')
  const [src, dst] = args.filter(a => !a.startsWith('-'))
  if (!src || !dst) return 'cp: missing operand'
  const werr = this.checkWritable('cp', this.resolve(dst))
  if (werr) return werr
  if (recursive) return this.copyRecursive(this.resolve(src), this.resolve(dst))
  // NEW: detect directory without -r
  try {
    await this.fs.ls(this.resolve(src))
    return `cp: ${src}: omitting directory (use -r)`
  } catch { /* not a dir */ }
  const r = await this.fs.read(this.resolve(src))
  if (r.error) return this.fsError('cp', src, r.error)
  await this.fs.write(this.resolve(dst), r.content ?? '')
  return ''
}
```

## copyRecursive error handling
`src/index.ts:461-484` — already handles non-existent src via try/catch on `fs.ls()`, returning `fsError('cp', src, ...)`.

## Tests: src/index.test.ts

```
describe('cp -r', () => {
  it('copies directory tree recursively')         // DBB-m11-001
  it('merges into existing destination dir')      // DBB-m11-002
  it('errors on non-existent source')             // DBB-m11-003
  it('errors on directory without -r flag')       // DBB-m11-004
})
```

## Edge Cases
- Empty source directory: creates dst dir with no files
- Nested subdirectories: recursive call handles depth
- `copyRecursive` error on `fs.ls` returns `cp: <src>: <err>`
