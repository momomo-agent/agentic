# Task Design — mkdir 原生实现 + -p 支持

## Files to Modify
- `src/index.ts` — `mkdir()` method (line 113)

## Current Code (workaround)
```ts
await this.fs.write(this.resolve(p) + '/.keep', '')
```

## New Logic
```ts
private async mkdir(args: string[]): Promise<string>
```

1. `const recursive = args.includes('-p')`
2. `const paths = args.filter(a => !a.startsWith('-'))`
3. For each path `p`:
   - `const resolved = this.resolve(p)`
   - If `recursive`:
     - Split resolved into segments, build each prefix path
     - For each prefix: call `this.fs.mkdir(prefix)` if available, else `this.fs.write(prefix + '/.keep', '')`; ignore "already exists" errors
   - If not `recursive`:
     - Check parent exists: `await this.fs.ls(parentOf(resolved))`
     - If parent missing → return `mkdir: ${p}: No such file or directory`
     - Call `this.fs.mkdir(resolved)` if available, else `this.fs.write(resolved + '/.keep', '')`

## Helper
```ts
private parentOf(path: string): string {
  const parts = path.replace(/\/$/, '').split('/')
  parts.pop()
  return parts.join('/') || '/'
}
```

## fs.mkdir availability
Check `typeof (this.fs as any).mkdir === 'function'`. If yes, use it. Otherwise fall back to `.keep` write (for compatibility with backends that don't support mkdir natively).

## Edge Cases
- `mkdir /a/b/c` without `-p` and `/a/b` missing → error
- `mkdir -p /a/b/c` → creates `/a`, `/a/b`, `/a/b/c` in order
- `mkdir /existing` → backend error propagates (already exists)

## Test Cases
- `mkdir /newdir` → directory accessible via `ls /newdir`
- `mkdir /a/b/c` (no -p, parent missing) → error
- `mkdir -p /a/b/c` → all levels created
