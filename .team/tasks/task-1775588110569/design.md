# Technical Design — Add Performance Benchmarks

## Problem
PRD requires performance gates but no automated perf tests exist.

## Approach
Add timing-based tests in `src/index.test.ts` using `performance.now()`. Use generous thresholds (2x PRD requirement) to avoid flaky tests.

## Files to Modify
- `src/index.test.ts` — add `describe('performance benchmarks', ...)`

## Benchmark Tests

### 1. grep Performance (PRD: <500ms on 1MB file)
**Implementation**: Create mock `fs.read()` that returns ~1MB of content (~20K lines). Time `grep` command.

```typescript
it('grep completes within 500ms on 1MB file', async () => {
  const lines = Array.from({ length: 20000 }, (_, i) =>
    i % 100 === 0 ? 'match line' : `line ${i} with some content here`
  )
  const content = lines.join('\n')
  const fs = makeMockFs({
    read: vi.fn().mockResolvedValue({ content, error: null }),
  })
  const sh = new AgenticShell(fs)

  const start = performance.now()
  const r = await sh.exec('grep match /bigfile')
  const elapsed = performance.now() - start

  expect(r.exitCode).toBe(0)
  expect(elapsed).toBeLessThan(500)
})
```

### 2. find Performance (PRD: <1s on 1000 files)
**Implementation**: Create mock `fs.ls()` that returns 1000 entries for root, and empty for subdirectories.

```typescript
it('find completes within 1s on 1000 files', async () => {
  const entries = Array.from({ length: 1000 }, (_, i) => ({
    name: `file${i}.txt`,
    type: 'file' as const,
  }))
  const fs = makeMockFs({
    ls: vi.fn().mockResolvedValue(entries),
  })
  const sh = new AgenticShell(fs)

  const start = performance.now()
  const r = await sh.exec('find /bigdir')
  const elapsed = performance.now() - start

  expect(r.exitCode).toBe(0)
  expect(elapsed).toBeLessThan(1000)
})
```

### 3. ls Pagination Performance (PRD: <100ms)
**Implementation**: Create mock `fs.ls()` that returns 500 entries. Time `ls --page 1 --page-size 20`.

```typescript
it('ls pagination completes within 100ms', async () => {
  const entries = Array.from({ length: 500 }, (_, i) => ({
    name: `file${i}.txt`,
    type: 'file' as const,
  }))
  const fs = makeMockFs({
    ls: vi.fn().mockResolvedValue(entries),
  })
  const sh = new AgenticShell(fs)

  const start = performance.now()
  const r = await sh.exec('ls --page 1 --page-size 20 /bigdir')
  const elapsed = performance.now() - start

  expect(r.exitCode).toBe(0)
  expect(elapsed).toBeLessThan(100)
})
```

## Notes
- Thresholds are generous (500ms, 1s, 100ms) — these are regression gates, not precise measurements
- Tests use in-memory mocks (no real I/O) — measures shell logic overhead only
- If CI environment is slower, thresholds can be relaxed via environment variable

## Dependencies
- None — all changes in `src/index.test.ts`
