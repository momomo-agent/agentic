# Task Design: ls -a surface real dotfiles from filesystem

## Status
Already implemented in `ls()` at lines 148-183 of `src/index.ts`. This task requires test coverage with a mock that returns real dotfiles.

## Files to Modify
- `src/index.test.ts` — add ls -a dotfile test cases

## Current Implementation (src/index.ts)

`ls()` at line 148:
- Without `-a`: `entries.filter(e => !e.name.startsWith('.'))` — hides dotfiles
- With `-a`: adds synthetic `.` and `..` if not already present, keeps all entries including real dotfiles from `fs.ls()`

The logic correctly surfaces real dotfiles when `-a` is set because the filter is only applied in the `else` branch.

## Test Cases to Add

```typescript
describe('ls -a dotfiles', () => {
  it('shows real dotfiles with -a', async () => {
    // mock fs.ls returns ['.hidden', '.config', 'visible.txt']
    // exec: ls -a /dir
    // verify: output includes '.hidden', '.config', 'visible.txt', '.', '..'
  })

  it('hides dotfiles without -a', async () => {
    // mock fs.ls returns ['.hidden', 'visible.txt']
    // exec: ls /dir
    // verify: output includes 'visible.txt', NOT '.hidden'
  })

  it('includes . and .. with -a', async () => {
    // exec: ls -a /dir
    // verify: output includes '.' and '..'
  })
})
```

## Edge Cases
- `fs.ls()` returns entries with `.` or `..` already: synthetic entries not duplicated (checked via `hasDot`/`hasDotDot`). Correct.
- Directory with only dotfiles, no `-a`: filter removes all → returns `''`. Correct.

## Dependencies
- `MockFileSystem.ls()` must be able to return entries with names starting with `.`
