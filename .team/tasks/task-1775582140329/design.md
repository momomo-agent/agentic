# Design: Fix OPFSBackend.walkDir() error handling

## File
`src/backends/opfs.ts`

## Change
Move try/catch inside the loop so errors on individual entries are caught and skipped. Remove the outer throw.

## Logic
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

## Edge Cases
- One bad entry → logged and skipped, rest of entries still collected
- Entire directory unreadable → caught at caller level in `list()`

## Test Cases
- `list()` returns all valid files even when one entry throws during walk
