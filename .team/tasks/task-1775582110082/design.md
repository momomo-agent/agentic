# Design: Fix OPFSBackend.delete() error handling

## File
`src/backends/opfs.ts`

## Change
In `delete(path)`, wrap `dir.removeEntry(...)` in try/catch. Catch `DOMException` where `name === 'NotFoundError'` and return silently. Re-throw all other errors.

## Signature (unchanged)
```ts
async delete(path: string): Promise<void>
```

## Logic
```ts
async delete(path: string): Promise<void> {
  const parts = path.replace(/^\//, '').split('/')
  let dir = await this.getRoot()
  try {
    for (const part of parts.slice(0, -1)) {
      dir = await dir.getDirectoryHandle(part)
    }
    await dir.removeEntry(parts[parts.length - 1])
  } catch (e) {
    if (e instanceof DOMException && e.name === 'NotFoundError') return
    throw e
  }
}
```

## Edge Cases
- Path with missing intermediate directory → DOMException NotFoundError → silently ignored
- Path exists → removed normally
- Other DOMException (e.g. SecurityError) → re-thrown

## Test Cases
- `delete('/missing')` resolves without throwing
- `delete('/existing')` removes the file; subsequent `get` returns null
