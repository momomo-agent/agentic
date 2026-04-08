# Design — Fix cp without -r on directory

## File
`src/index.ts`

## Change
In `cp()` (line 539), after resolving src/dst and before calling `fs.read()`, check if src is a directory:

```typescript
private async cp(args: string[]): Promise<string> {
  const flags = args.filter(a => a.startsWith('-'))
  const recursive = flags.includes('-r') || flags.includes('-R')
  const [src, dst] = args.filter(a => !a.startsWith('-'))
  if (!src || !dst) return 'cp: missing operand'
  const werr = this.checkWritable('cp', this.resolve(dst))
  if (werr) return werr
  if (recursive) return this.copyRecursive(this.resolve(src), this.resolve(dst))
  // NEW: detect directory
  try {
    await this.fs.ls(this.resolve(src))
    return `cp: ${src}: is a directory (use -r)`
  } catch { /* not a directory, proceed */ }
  const r = await this.fs.read(this.resolve(src))
  if (r.error) return this.fsError('cp', src, r.error)
  await this.fs.write(this.resolve(dst), r.content ?? '')
  return ''
}
```

## Logic
- `fs.ls()` succeeds → src is a directory → return error
- `fs.ls()` throws → src is a file → proceed with read/write

## Test cases
- `cp /dir /dest` (no -r) → `'cp: /dir: is a directory (use -r)'`
- `cp -r /dir /dest` → performs recursive copy (existing behavior)
- `cp /file /dest` → copies file (existing behavior unchanged)
