# Design: file tool — agentic-filesystem

## File
`src/tools/file.ts`

## Analysis
Already implemented using `AgenticFileSystem`. No Node `fs` imports present.

## Verification
- Confirm no `import fs` or `require('fs')` in file.ts
- Confirm `executeFileRead` returns `Error: file not found` (or similar) when `fs.read()` returns an error

## Function Signatures (unchanged)
```ts
executeFileRead(input: Record<string, unknown>, fs?: AgenticFileSystem): Promise<FileResult>
executeFileWrite(input: Record<string, unknown>, fs?: AgenticFileSystem): Promise<FileResult>
```

## Edge Cases
- `fs` not provided → returns `'Error: no filesystem configured'`
- `fs.read()` returns `{ error: '...' }` → returns `'Error: ...'` in content

## Test Cases (DBB-007, DBB-008)
- `file_write` then `file_read` same path → content matches
- `file_read` on non-existent path → result contains error string, no throw
