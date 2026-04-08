# Design: Fix rm -r deep nesting stack overflow

## File
`src/index.ts` — `rmRecursive()` (~line 478)

## Problem
Current implementation is recursive — deep trees (10+ levels) risk stack overflow.

## Change
Replace with iterative post-order traversal using an explicit stack:

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
  for (let i = toDelete.length - 1; i >= 0; i--) {
    await this.fs.delete(toDelete[i])
  }
}
```

## Edge Cases
- Cycle detection via `visited` set
- Files added directly to `toDelete` (not pushed to stack)
- Reverse iteration ensures children deleted before parents

## Test Cases
- `rm -r /a` with 15-level nesting → completes, all nodes deleted
- `rm -r /single-file-dir` → deletes file and dir
