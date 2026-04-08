# Task Design — ls 分页支持

## Files to Modify
- `src/index.ts` — `ls()` method

## Function Signature
```ts
private async ls(args: string[]): Promise<string>
```

## Logic
1. Parse flags:
   ```ts
   const pageIdx = args.indexOf('--page')
   const page = pageIdx !== -1 ? parseInt(args[pageIdx + 1]) : null
   const sizeIdx = args.indexOf('--page-size')
   const pageSize = sizeIdx !== -1 ? parseInt(args[sizeIdx + 1]) : 20
   ```
2. Fetch entries: `const entries = await this.fs.ls(this.resolve(path))`
3. Apply hidden filter (existing `-a` logic)
4. If `page !== null`: `entries = entries.slice((page - 1) * pageSize, page * pageSize)`
5. Format and return as before

## Edge Cases
- `--page 0` or negative → treat as page 1
- `--page` beyond last page → return empty string
- No `--page` flag → return all entries (backward compat)
- `--page-size` must be positive integer; if invalid, default to 20

## Dependencies
- `this.fs.ls()` — existing interface, no changes needed

## Test Cases
- `ls --page 1 --page-size 3 /dir` with 7 entries → 3 entries
- `ls --page 3 --page-size 3 /dir` with 7 entries → 1 entry
- `ls --page 99 --page-size 3 /dir` → empty string
- `ls /dir` (no flags) → all entries (backward compat)
