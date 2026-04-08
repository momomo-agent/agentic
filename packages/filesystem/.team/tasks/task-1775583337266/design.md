# Design: Implement streaming scan() for OPFSBackend and AgenticStoreBackend

## Files to modify
- `src/backends/opfs.ts`
- `src/backends/agentic-store.ts`

## OPFSBackend

Use `File.stream()` + `TextDecoderStream` to process file content chunk-by-chunk, splitting on `\n`:

```ts
async *scanStream(pattern: string): AsyncIterable<{ path: string; line: number; content: string }> {
  for (const path of await this.list()) {
    try {
      const fh = await this.getFileHandle(path)
      const file = await fh.getFile()
      const reader = file.stream().pipeThrough(new TextDecoderStream()).getReader()
      let lineNum = 0
      let remainder = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          if (remainder && remainder.includes(pattern)) yield { path, line: ++lineNum, content: remainder }
          break
        }
        const chunk = remainder + value
        const lines = chunk.split('\n')
        remainder = lines.pop()!
        for (const line of lines) {
          lineNum++
          if (line.includes(pattern)) yield { path, line: lineNum, content: line }
        }
      }
    } catch { /* skip unreadable files */ }
  }
}
```

## AgenticStoreBackend

Current implementation already processes one file at a time sequentially in `scanStream()`. No structural change needed — it does not batch-fetch all values. The existing code is already streaming in the sense that it processes files one-by-one. Verify no `Promise.all` is used; if not, this task is a no-op for AgenticStoreBackend.

If the underlying store's `keys()` returns all keys including `\x00mtime` meta keys (after task-1775583337186), filter them out:
```ts
const keys = (await this.store.keys()).filter(k => !k.includes('\x00'))
```

## Edge cases
- File with no newline at end: `remainder` holds last line, yielded after loop ends
- Empty file: no yields
- Binary/non-UTF8 content: TextDecoderStream handles gracefully (replacement chars)

## Test cases
- Large file (>1MB): scanStream() yields matches without OOM
- File with match on last line (no trailing newline): match is yielded
- Empty file: no results
- AgenticStoreBackend: meta keys (`\x00mtime`) not scanned
