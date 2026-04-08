# Design: Add performance benchmark suite

## File to Create
- `src/perf.test.ts` — standalone perf test file

## Approach
Use `performance.now()` before/after `shell.exec()` calls. Build large fixtures inline in `beforeAll`.

## Function Signatures
```typescript
// Helper to build large MockFileSystem
function buildLargeFs(fileCount: number, fileSize: number): MockFileSystem

describe('performance', () => {
  it('grep on 1MB file completes < 500ms', async () => { ... })
  it('find on 1000 files completes < 1000ms', async () => { ... })
  it('ls pagination on 1000-entry dir completes < 100ms', async () => { ... })
})
```

## Fixture Construction
- 1MB file: write a string of `'a'.repeat(1024 * 1024)` to `/large.txt`
- 1000 files: loop writing `/files/file-{i}.txt` with small content
- 1000-entry dir: same files all in one directory for ls test

## Assertions
```typescript
const t0 = performance.now()
await shell.exec('grep pattern /large.txt')
expect(performance.now() - t0).toBeLessThan(500)
```

## Dependencies
- MockFileSystem from existing test helpers
- `performance` from Node.js globals (available in vitest)
