# Design — exitCode 2 vs 127 distinction

## File to modify
- `src/index.ts`

## Change: `exitCodeFor` method (line ~106)

Current regex matches `command not found` and returns 2. Fix: return 127 for unknown commands, 2 only for missing operands.

```typescript
private exitCodeFor(output: string): number {
  const first = output.trimStart().split('\n')[0]
  if (/\bcommand not found\b/.test(first)) return 127
  if (/\b(missing operand|missing pattern|Invalid regular expression)\b/.test(first)) return 2
  if (/^\w[\w-]*: .+: .+/.test(first)) return 1
  return 0
}
```

## Edge cases
- `foobar` → output `foobar: command not found` → exitCode 127
- `cat` (no args) → output `cat: missing operand` → exitCode 2
- `grep` (no args) → output `grep: missing pattern` → exitCode 2
- Normal error (e.g. `cat: /x: No such file or directory`) → exitCode 1

## Test cases
```typescript
it('returns 127 for unknown command', async () => {
  const r = await shell.exec('foobar')
  expect(r.exitCode).toBe(127)
})
it('returns 2 for missing operand', async () => {
  const r = await shell.exec('cat')
  expect(r.exitCode).toBe(2)
})
it('returns 2 for missing grep pattern', async () => {
  const r = await shell.exec('grep')
  expect(r.exitCode).toBe(2)
})
```
