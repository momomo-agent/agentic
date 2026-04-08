# M7 Technical Design — Quality Polish & Interface Hardening

## Files Modified
- `src/index.ts` — all three changes land here

## Task Designs Summary

### 1. grep streaming fallback indication
In `grepStream()` (line ~239), after the `readStream` check falls through to the `read()` fallback, prepend a note line to the returned matches array:
```
# note: streaming unavailable, using read()
```
Only prepend when matches array would be returned (not on error throw path).

### 2. AgenticFileSystem streaming interface type safety
Declare a local interface extending `AgenticFileSystem`:
```typescript
interface StreamableFS extends AgenticFileSystem {
  readStream(path: string): AsyncIterable<string>
}
function isStreamable(fs: AgenticFileSystem): fs is StreamableFS {
  return typeof (fs as any).readStream === 'function'
}
```
Replace the duck-type check and `(this.fs as any)` cast in `grepStream` with `isStreamable(this.fs)`.

### 3. fs adapter contract validation at shell init
In the constructor, validate required methods:
```typescript
constructor(private fs: AgenticFileSystem) {
  const required = ['read', 'write', 'ls', 'delete', 'grep']
  const missing = required.filter(m => typeof (fs as any)[m] !== 'function')
  if (missing.length) throw new Error(`AgenticShell: fs missing required methods: ${missing.join(', ')}`)
}
```

## Dependencies
- No new packages required
- All changes are self-contained in `src/index.ts`
