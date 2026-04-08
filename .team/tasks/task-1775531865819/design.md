# Design: Fix OPFS walkDir error handling

## File to Modify
- `src/backends/opfs.ts`

## Current Problem
`walkDir` has no error handling — exceptions from `getDirectoryHandle` or iteration are silently swallowed.

## Changes

### walkDir signature (unchanged), body updated:
```ts
private async walkDir(dir: FileSystemDirectoryHandle, base: string, out: string[]): Promise<void> {
  try {
    for await (const [name, handle] of (dir as unknown as AsyncIterable<[string, FileSystemHandle]>)) {
      const path = base ? `${base}/${name}` : name
      if (handle.kind === 'file') out.push('/' + path)
      else await this.walkDir(handle as FileSystemDirectoryHandle, path, out)
    }
  } catch (err) {
    console.error(`[OPFSBackend] walkDir error at "${base}":`, err)
    throw err
  }
}
```

Also fix `delete()` which has an empty catch:
```ts
async delete(path: string): Promise<void> {
  const parts = path.replace(/^\//, '').split('/')
  let dir = await this.getRoot()
  for (const part of parts.slice(0, -1)) {
    dir = await dir.getDirectoryHandle(part)
  }
  await dir.removeEntry(parts[parts.length - 1])
}
```
Let `delete()` throw naturally — callers can catch if needed.

## Edge Cases
- Inaccessible subdirectory: logged + re-thrown so `list()` caller sees the error
- `delete()` on non-existent path: throws `DOMException` (NotFoundError) — consistent with typed error strategy

## Test Cases
- Mock `walkDir` to throw → verify `console.error` called and error propagates from `list()`
- Normal walk: no errors logged
