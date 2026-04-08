# Task Design: Explicit pagination and streaming unit tests

## Files to Modify
- `src/index.test.ts` — add pagination and streaming test suites

## Pagination Tests

Target: `ls --page N --page-size M` in `ls()` at lines 151-177.

```typescript
describe('pagination', () => {
  it('returns first page', async () => {
    // mock: 10 files (file1..file10)
    // exec: ls / --page 1 --page-size 5
    // verify: 5 entries returned, first 5 files
  })

  it('returns second page', async () => {
    // exec: ls / --page 2 --page-size 5
    // verify: next 5 entries
  })

  it('returns empty for out-of-bounds page', async () => {
    // exec: ls / --page 999 --page-size 5
    // verify: output === ''
  })

  it('returns all entries when no page flag', async () => {
    // exec: ls /
    // verify: all 10 entries returned
  })
})
```

## Streaming Tests

Target: `grepStream()` at lines 242-271. Uses `fs.readStream()` when available.

```typescript
describe('streaming grep', () => {
  it('matches lines via readStream', async () => {
    // mock fs with readStream returning async iterable of lines
    // exec: grep pattern /file.txt
    // verify: matched lines returned with path:line: content format
  })

  it('returns empty for no matches via stream', async () => {
    // mock readStream with lines that don't match
    // exec: grep nomatch /file.txt
    // verify: output === ''
  })

  it('falls back to read() when readStream unavailable', async () => {
    // mock without readStream
    // exec: grep pattern /file.txt
    // verify: output includes warning + matches
  })
})
```

## Mock Helper for readStream

```typescript
function makeStreamableFS(lines: string[]): AgenticFileSystem & { readStream: ... } {
  return {
    ...baseMock,
    readStream: async function*(path: string) {
      for (const line of lines) yield line
    }
  }
}
```

## Dependencies
- Existing `MockFileSystem` class in test file
- Tests must use describe names containing "pagination" and "streaming" to satisfy DBB-m8-016/017
