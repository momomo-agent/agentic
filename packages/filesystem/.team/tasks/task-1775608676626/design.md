# Task Design: Fix OPFSBackend walkDir() graceful error handling

## Status: Already Implemented — Verification Only

Analysis of the codebase confirms this feature is fully implemented and tested.

## Files Involved

### `src/backends/opfs.ts` (no changes needed)
Lines 100-110 — `walkDir()` implementation:
```ts
private async walkDir(dir: FileSystemDirectoryHandle, base: string, out: string[]): Promise<void> {
  for await (const [name, handle] of (dir as unknown as AsyncIterable<[string, FileSystemHandle]>)) {
    try {
      const path = base ? `${base}/${name}` : name
      if (handle.kind === 'file') out.push('/' + path)
      else await this.walkDir(handle as FileSystemDirectoryHandle, path, out)
    } catch (err) {
      console.error(`[OPFSBackend] walkDir skipping entry "${name}":`, err)
    }
  }
}
```

Key implementation details:
- **Per-entry try/catch**: The try/catch wraps the per-entry logic inside the for-await loop, NOT the entire loop
- **Graceful skip**: Catch block logs the error via `console.error` and does NOT rethrow
- **Continues iteration**: After catching, the loop proceeds to the next entry
- **Named context**: Error message includes the entry name for debugging

### `test/opfs-walkdir-error.test.js` (no changes needed)
Source-inspection test that verifies:
1. `walkDir` method exists in opfs.ts
2. try/catch is inside the for-await loop (not outside)
3. Catch block calls `console.error`
4. Catch block does NOT contain `throw` (no rethrow)

## Why Source Inspection (not runtime test)
OPFS (`navigator.storage.getDirectory()`) is browser-only. Node.js test runner cannot invoke OPFS APIs. The source-inspection approach is the correct pattern for verifying browser-only code in Node.js CI.

## Verification Steps
1. `npx tsup` — build succeeds
2. `node --test test/opfs-walkdir-error.test.js` — passes

## Error Scenarios Handled
- Permission denied on a directory entry during iteration → logged, skipped
- File removed between listing and access → logged, skipped
- Corrupt/unreadable entry → logged, skipped
- All of the above: the walk continues to the next entry
