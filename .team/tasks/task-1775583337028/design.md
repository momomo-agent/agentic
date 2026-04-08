# Design: Fix OPFSBackend.stat() isDirectory detection

## File to modify
- `src/backends/opfs.ts`

## Change

Replace `stat()` to try `getFileHandle()` first; on `TypeMismatchError`, try `getDirectoryHandle()`:

```ts
async stat(path: string): Promise<{ size: number; mtime: number; isDirectory: boolean } | null> {
  try {
    const fh = await this.getFileHandle(path)
    const file = await fh.getFile()
    return { size: file.size, mtime: file.lastModified, isDirectory: false }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'TypeMismatchError') {
      // path is a directory
      try {
        await this.getDirHandle(path)
        return { size: 0, mtime: 0, isDirectory: true }
      } catch { return null }
    }
    return null
  }
}
```

Add helper `getDirHandle(path)` (mirrors `getFileHandle` but calls `getDirectoryHandle`):
```ts
private async getDirHandle(path: string): Promise<FileSystemDirectoryHandle> {
  const parts = path.replace(/^\//, '').split('/')
  let dir = await this.getRoot()
  for (const part of parts) {
    dir = await dir.getDirectoryHandle(part)
  }
  return dir
}
```

## Edge cases
- File path → `isDirectory: false` (existing behavior preserved)
- Directory path → `isDirectory: true`
- Non-existent path → `null`
- `TypeMismatchError` is the DOMException thrown when `getFileHandle()` is called on a directory

## Test cases
- stat('/dir') on a directory handle → `{ isDirectory: true }`
- stat('/file.txt') on a file → `{ isDirectory: false }`
- stat('/missing') → `null`
