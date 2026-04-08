# Task Design — grep 流式处理大文件

## Files to Modify
- `src/index.ts` — `grep()` method, new `grepStream()` helper

## Function Signatures
```ts
private async grep(args: string[]): Promise<string>
private async grepStream(pattern: string, path: string, flags: string[]): Promise<string[]>
```

## Logic

### `grepStream(pattern, path, flags)`
1. `const resolved = this.resolve(path)`
2. If `this.fs.readStream` exists (async iterable interface):
   ```ts
   const regex = new RegExp(pattern)
   const matches: string[] = []
   for await (const line of this.fs.readStream(resolved)) {
     if (regex.test(line)) matches.push(line)
   }
   return matches
   ```
3. Else fallback:
   ```ts
   const r = await this.fs.read(resolved)
   if (r.error) throw new Error(r.error)
   return (r.content ?? '').split('\n').filter(l => new RegExp(pattern).test(l))
   ```

### `grep()` changes
- When a single non-recursive file path is provided, delegate to `grepStream()` instead of `this.fs.grep()`
- Recursive (`-r`) and stdin paths remain unchanged

## Edge Cases
- `fs.readStream` absent → silent fallback to `fs.read()`, no behavior change
- File not found → return `grep: <path>: No such file or directory`
- No matches → return empty string

## Dependencies
- `this.fs.readStream()` — optional interface on `AgenticFileSystem`; if absent, falls back gracefully
- `this.fs.read()` — existing fallback

## Test Cases
- Mock `fs.readStream` as async generator yielding lines → verify only matching lines returned
- Mock without `fs.readStream` → verify fallback to `fs.read()` works
- Pattern with no matches → empty output
- Non-existent file → error message
