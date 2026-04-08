# Task Design — 权限/readOnly 检查

## Files to Modify
- `src/index.ts` — add `checkWritable()` helper; call in write commands

## New Helper
```ts
private checkWritable(cmd: string, path: string): string | null {
  if ((this.fs as any).readOnly === true) {
    return `${cmd}: ${path}: Permission denied`
  }
  return null
}
```

## Commands to Guard
Add at the top of each method body:
- `touch(path)` → `checkWritable('touch', this.resolve(path))`
- `mkdir(args)` → check before any write, use first path for error message
- `rm(args)` → check before deletion
- `mv(args)` → check before write/delete
- `cp(args)` → check before write

Pattern:
```ts
const err = this.checkWritable('touch', this.resolve(path))
if (err) return err
```

## Edge Cases
- `readOnly` property absent or `false` → no error, normal operation
- Read commands (`cat`, `ls`, `grep`, `find`, `head`, `tail`, `wc`) → NOT guarded
- `cd`, `echo`, `pwd` → NOT guarded (no writes)

## Dependencies
- `AgenticFileSystem` type — `readOnly` is accessed via `(this.fs as any).readOnly` to avoid type errors if not in interface

## Test Cases
- readOnly=true + `touch /f` → `Permission denied`
- readOnly=true + `mkdir /d` → `Permission denied`
- readOnly=true + `rm /f` → `Permission denied`
- readOnly=true + `mv /a /b` → `Permission denied`
- readOnly=true + `cp /a /b` → `Permission denied`
- readOnly=true + `cat /f` → normal output (no error)
- readOnly=false + `touch /f` → normal operation
