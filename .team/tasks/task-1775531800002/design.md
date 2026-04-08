# Task Design — cd 路径验证

## Files to Modify
- `src/index.ts` — `cd()` method (line 106)

## Current Code
```ts
private cd(path: string): string {
  if (!path || path === '~') { this.cwd = '/'; return '' }
  const resolved = this.resolve(path)
  this.cwd = resolved  // ← no validation
  return ''
}
```

## New Signature
```ts
private async cd(path: string): Promise<string>
```
(Must update `exec()` switch case to `return this.cd(args[0])` — already `await`ed via `exec` being async.)

## Logic
1. Handle `!path || path === '~'` → set cwd to `/`, return `''`
2. `const resolved = this.resolve(path)`
3. Try `await this.fs.ls(resolved)`:
   - If error/throws → return `cd: ${path}: No such file or directory`
4. Try `await this.fs.read(resolved)`:
   - If read succeeds (it's a file, not a dir) → return `cd: ${path}: Not a directory`
5. Set `this.cwd = resolved`, return `''`

## Edge Cases
- `cd` with no arg → goes to `/` (unchanged behavior)
- `cd ~` → goes to `/` (unchanged behavior)
- `cd /existing/dir` → updates cwd
- `cd /existing/file.txt` → error "Not a directory"
- `cd /nonexistent` → error "No such file or directory", cwd unchanged

## Dependencies
- `this.fs.ls()`, `this.fs.read()`

## Test Cases
- `cd /validDir` → cwd becomes `/validDir`
- `cd /nonexistent` → error, cwd unchanged
- `cd /file.txt` → "Not a directory", cwd unchanged
- `cd` → cwd becomes `/`
