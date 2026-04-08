# Task Design: Fix touch on empty file

## File to Modify
- `src/index.ts` — touch method (~line 579)
- `src/index.test.ts` — new test

## Problem
`if (!r.content)` is falsy for empty string `""`, causing touch to overwrite existing empty files with a new empty write (unnecessary) and potentially losing content in edge cases.

## Fix
Change condition from `!r.content` to `r.content === undefined`:

```typescript
// Before
if (!r.content) await this.fs.write(this.resolve(path), '')
// After
if (r.content === undefined) await this.fs.write(this.resolve(path), '')
```

## Function Signatures
No new functions. Modify existing `private async touch(args: string[]): Promise<string>`.

## Edge Cases
- File exists with empty content → no write, return `''`
- File exists with non-empty content → no write, return `''`
- File does not exist (`r.content === undefined`) → create with `''`

## Test Cases (per DBB)
1. `touch /empty.txt` where file exists with `""` → file unchanged, exit 0
2. `touch /new.txt` where file doesn't exist → file created with `""`, exit 0
3. `touch /data.txt` where file has "hello" → content still "hello", exit 0
