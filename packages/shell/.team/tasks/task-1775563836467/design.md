# Task Design: echo output redirection (> and >>)

## Status
Already implemented in `exec()` at lines 24-46 of `src/index.ts`. This task requires adding test coverage.

## Files to Modify
- `src/index.test.ts` — add redirection test cases

## Current Implementation (src/index.ts)

`exec()` handles redirection before pipe processing:
1. Matches `>>` first (line 25): reads existing content, appends output + `\n`, writes
2. Matches `>` second (line 37): writes output + `\n` (overwrites)
3. Both check `checkWritable()` before writing
4. Both return `''` on success

## Test Cases to Add

```typescript
describe('echo redirection', () => {
  it('> overwrites existing file', async () => {
    // setup: write /file.txt = 'old'
    // exec: echo new > /file.txt
    // verify: cat /file.txt === 'new\n'
  })

  it('> creates new file', async () => {
    // exec: echo hello > /newfile.txt
    // verify: cat /newfile.txt === 'hello\n'
  })

  it('>> appends to existing file', async () => {
    // setup: write /file.txt = 'line1'
    // exec: echo line2 >> /file.txt
    // verify: cat /file.txt === 'line1line2\n'
  })

  it('>> creates file if missing', async () => {
    // exec: echo hello >> /newfile.txt
    // verify: cat /newfile.txt === 'hello\n'
  })

  it('> returns Permission denied in readOnly mode', async () => {
    // fs.readOnly = true
    // exec: echo test > /file.txt
    // expect: 'echo: /file.txt: Permission denied'
  })
})
```

## Edge Cases
- `>>` on non-existent file: `fs.read()` returns `{ error }` → `current = ''` → creates file. Correct.
- Filename with path: resolved via `this.resolve(filePath)`. Correct.
- Command on left side of `>` can be any command (not just echo) — the regex matches any LHS.

## Dependencies
- `MockFileSystem.read()` must return `{ error }` for non-existent files (not throw)
