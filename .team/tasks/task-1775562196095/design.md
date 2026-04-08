# Design: AgenticFileSystem streaming interface type safety

## File to Modify
- `src/index.ts`

## Change
Add a local type guard above `grepStream()`:

```typescript
interface StreamableFS extends AgenticFileSystem {
  readStream(path: string): AsyncIterable<string>
}
function isStreamable(fs: AgenticFileSystem): fs is StreamableFS {
  return typeof (fs as any).readStream === 'function'
}
```

Replace the duck-type check in `grepStream()` (~line 239):

```typescript
// Before:
if ('readStream' in this.fs && typeof (this.fs as any).readStream === 'function') {
  for await (const line of (this.fs as any).readStream(resolved)) {

// After:
if (isStreamable(this.fs)) {
  for await (const line of this.fs.readStream(resolved)) {
```

## Edge Cases
- `isStreamable` only checks method existence, not return type — sufficient for runtime
- No changes to behavior, only type safety

## Test Cases
1. `tsc --noEmit` passes with no errors
2. All existing grep streaming tests pass
