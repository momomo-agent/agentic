# Task Design — rm -r 递归删除

## Files to Modify
- `src/index.ts` — `rm()` method (line 122)

## Function Signature
```ts
private async rm(args: string[]): Promise<string>
```

## Logic
1. Extract flags: `const recursive = args.includes('-r') || args.includes('-rf')`
2. Extract paths: `args.filter(a => !a.startsWith('-'))`
3. For each path:
   - Resolve: `const resolved = this.resolve(p)`
   - Safety check: `if (resolved === '/') return 'rm: refusing to remove \'/\''`
   - If `recursive`:
     - Call `this.fs.ls(resolved)` to check if it's a directory
     - If ls succeeds: collect all entries, delete recursively (depth-first)
     - Helper: `private async rmRecursive(path: string): Promise<void>` — ls, recurse into subdirs, then delete files, then delete self
   - If not `recursive`:
     - Try `this.fs.ls(resolved)` — if it returns entries, return `rm: ${p}: is a directory`
     - Else call `this.fs.delete(resolved)`

## Helper
```ts
private async rmRecursive(path: string): Promise<void>
// ls(path) → for each entry: if dir, recurse; else delete
// after children: delete(path)
```

## Edge Cases
- `rm -r /` → blocked by safety check
- `rm /nonexistent` → `this.fs.delete` error propagates as `rm: <path>: No such file or directory`
- `rm /dir` (no -r) → `rm: /dir: is a directory`

## Dependencies
- `this.fs.ls()`, `this.fs.delete()`
- M1 test suite must exist before this task is coded

## Test Cases
- `rm -r /dir` with nested files → all deleted
- `rm -r /` → error, nothing deleted
- `rm /dir` → error "is a directory"
- `rm /nonexistent` → error "No such file or directory"
