# Design — m19: Architecture Compliance & Quality Gates

## 1. Pipe error propagation
File: `src/index.ts`, pipe loop in `exec()` (~line 88)

Change: Remove early return when left segment errors. Pass output (even if error) as empty string stdin to next segment.

```
// Before (lines 95-98):
if (this.isErrorOutput(output)) {
  exitCode = this.exitCodeFor(output)
  return { output, exitCode }  // <-- remove this early return
}

// After:
if (this.isErrorOutput(output)) {
  exitCode = this.exitCodeFor(output)
  output = ''  // pass empty stdin to next segment
}
```

Edge cases:
- Multi-segment pipes: error in middle segment → subsequent segments get empty stdin
- exitCode from first error is preserved

## 2. grep -l stdin identifier
File: `src/index.ts`, `execWithStdin()` (~line 163)

Change: When `-l` flag set and lines match, return `'(stdin)'`.

```
// Before:
if (flags.includes('-l')) return ''

// After:
if (flags.includes('-l')) return lines.length ? '(stdin)' : ''
```

Edge cases:
- No match → return `''` (unchanged)
- `-l` with match → return `'(stdin)'`

## 3. rm -r iterative traversal
File: `src/index.ts`, `rmRecursive()` (~line 478)

Replace recursive method with iterative post-order traversal:

```typescript
private async rmRecursive(path: string): Promise<void> {
  const stack: string[] = [path]
  const toDelete: string[] = []
  const visited = new Set<string>()
  while (stack.length) {
    const cur = stack.pop()!
    if (visited.has(cur)) continue
    visited.add(cur)
    toDelete.push(cur)
    const entries = await this.fs.ls(cur)
    for (const e of entries) {
      const child = cur.replace(/\/$/, '') + '/' + e.name
      if (e.type === 'dir') stack.push(child)
      else toDelete.push(child)
    }
  }
  // delete in reverse order (leaves first)
  for (let i = toDelete.length - 1; i >= 0; i--) {
    await this.fs.delete(toDelete[i])
  }
}
```

Edge cases:
- Cycle detection via `visited` set
- Files pushed directly to `toDelete`, not `stack`
- Deletes deepest paths first via reverse iteration

## 4. Coverage gate
File: `vitest.config.ts`

Add thresholds to coverage config:

```typescript
coverage: {
  provider: 'v8',
  thresholds: {
    statements: 80,
    branches: 75,
  }
}
```

Verify: `npx vitest --coverage` exits non-zero if thresholds not met.
