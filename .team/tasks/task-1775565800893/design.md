# Design — ls fs.ls() error field handling

## Files to modify
- `src/index.ts` — `ls()` method (lines 155–190)
- `src/index.test.ts` — new test cases

## Bug location
`src/index.ts:167`:
```typescript
let entries = await this.fs.ls(this.resolve(path))
```
No check for an `error` field on the returned value. Some adapters return `{ error: string }` instead of throwing.

## Fix
Add error guard immediately after the `fs.ls()` call:

```typescript
const lsResult = await this.fs.ls(this.resolve(path)) as any
if (lsResult && lsResult.error) return this.fsError('ls', path, lsResult.error)
let entries = lsResult as Array<{ name: string; type: 'file' | 'dir' }>
```

## Function signature (unchanged)
```typescript
private async ls(args: string[]): Promise<string>
```

## Edge cases
- `fs.ls()` returns `{ error: 'No such file or directory' }` → `ls: /path: No such file or directory`
- `fs.ls()` throws → already handled by caller (propagates up)
- `fs.ls()` returns empty array → return `''`

## Test cases
```typescript
it('ls returns error when fs.ls returns error field', async () => {
  fs.ls = async () => ({ error: 'No such file or directory' } as any)
  await expect(shell.exec('ls /missing')).resolves.toMatch(/ls: \/missing: No such file or directory/)
})
```
