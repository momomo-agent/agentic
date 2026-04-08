# Technical Design — Fix rm -r Deep Nesting Stack Overflow

## Problem Statement
Task claims "rmRecursive uses recursion with no depth guard — may stack overflow on 10+ level trees."

## Finding: Already Iterative

After code review, `rmRecursive` at `src/index.ts:610-629` is **already iterative**:

```typescript
private async rmRecursive(path: string): Promise<void> {
  const stack: string[] = [path]           // iterative stack
  const toDelete: string[] = []
  const visited = new Set<string>()        // cycle detection
  while (stack.length) {                   // loop, not recursion
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

This approach:
- Uses a `while` loop with explicit stack — no call stack growth
- Has a `visited` Set — prevents infinite loops from cycles
- Collects all paths first, then deletes in reverse order (children before parents)

## Action: Test-Only Change

No code fix is needed. This task becomes a **test verification** to confirm the iterative implementation handles deep trees correctly.

## Files to Modify
- `src/index.test.ts` — add deep nesting tests

## Test Cases to Add

```typescript
describe('rm -r deep nesting', () => {
  it('rm -r handles 20+ level deep directory tree', async () => {
    // Build mock: /l1/l2/.../l20/deep.txt
    // Verify all fs.delete() calls made, no errors
  })

  it('rm -r handles wide directory (100+ entries)', async () => {
    // Build mock: /wide/ with 100 files + 50 dirs
    // Verify all entries deleted
  })

  it('rm -r handles mixed deep and wide tree', async () => {
    // Build mock: /root with branches of varying depth
    // Verify complete traversal
  })
})
```

## Test Implementation Details
- Use `vi.fn().mockResolvedValueOnce()` chains for `fs.ls` to simulate deep nesting
- Verify `fs.delete` called for every file in the tree
- Verify no exceptions thrown (stack overflow would manifest as RangeError)

## Dependencies
- None
