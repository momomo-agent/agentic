# Design: echo output redirection

## Status
`>` and `>>` redirection is already implemented in `exec()` at `src/index.ts:21-46`.

The regex matches apply to any command output, not just echo. All DBB scenarios are covered:
- `echo hello > file.txt` → DBB-m11-008
- `echo line2 >> file.txt` → DBB-m11-009
- `echo hello >> newfile.txt` → DBB-m11-010
- readOnly mode → DBB-m11-011 (checkWritable called at line 29/41)

## No Code Changes Required

## Tests to Add: src/index.test.ts

```
describe('echo redirection', () => {
  it('> creates file with content')           // DBB-m11-008
  it('> overwrites existing file')            // DBB-m11-008
  it('>> appends to existing file')           // DBB-m11-009
  it('>> creates file if not exists')         // DBB-m11-010
  it('> fails in readOnly mode')              // DBB-m11-011
})
```

## Edge Cases
- `>>` on non-existent file: `fs.read()` returns `{ error }` → `current = ''` → writes output only
- Regex `^(.+?)>>\s*(\S+)$` checked before `>` regex to avoid misparse
- readOnly: `checkWritable` returns error string before any write
