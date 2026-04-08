# Design: resolve() path normalization for ../

## File to modify
`src/index.ts`

## Current implementation (line 77)
```ts
private resolve(path: string): string {
  if (!path || path === '.') return this.cwd
  if (path.startsWith('/')) return path
  return (this.cwd === '/' ? '' : this.cwd) + '/' + path
}
```
Does not handle `..` segments — returns raw path like `/a/b/../c`.

## Fix
Add normalization step after building the raw path:

```ts
private resolve(path: string): string {
  if (!path || path === '.') return this.cwd
  const raw = path.startsWith('/') ? path : (this.cwd === '/' ? '' : this.cwd) + '/' + path
  return this.normalizePath(raw)
}

private normalizePath(path: string): string {
  const parts = path.split('/').filter(Boolean)
  const stack: string[] = []
  for (const part of parts) {
    if (part === '..') { if (stack.length) stack.pop() }
    else if (part !== '.') stack.push(part)
  }
  return '/' + stack.join('/')
}
```

## Edge cases
- `resolve('../..')` from `/a` → `/`
- `resolve('../../..')` from `/a/b` → `/` (clamped at root)
- `resolve('a/../b')` → `/cwd/b`
- `resolve('/abs/../foo')` → `/foo`
- `resolve('.')` → `this.cwd` (unchanged)

## Test cases
- cwd=`/a/b`, `resolve('../c')` → `/a/c`
- cwd=`/a/b`, `resolve('../../c')` → `/c`
- cwd=`/a`, `resolve('../../..')` → `/`
- cwd=`/a/b`, `resolve('x/../y')` → `/a/b/y`
- `resolve('/abs/path/../foo')` → `/abs/foo`
