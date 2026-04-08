# Task Design: Fix grep -i case-insensitive in all paths

## File to Modify
- `src/index.ts` — grep method
- `src/index.test.ts` — new tests

## Problem
`fs.grep(pattern)` is called without case-insensitive handling. The `-i` flag only works in the pipe/streaming path, not the `fs.grep()` path.

## Fix
In the `grep` method, after calling `this.fs.grep(pattern)`, post-filter results when `-i` is set:

```typescript
const allResults = await this.fs.grep(pattern)
const re = new RegExp(pattern, caseInsensitive ? 'i' : '')
const results = caseInsensitive
  ? allResults.filter(r => re.test(r.content))
  : allResults
```

## Function Signatures
No new functions. Modify existing `private async grep(args: string[]): Promise<string>`.

## Edge Cases
- `-i` with no matches → empty output
- `-i` + `-l` → deduplicated file list, case-insensitive filtered
- `-i` + `-c` → count of case-insensitive matches

## Test Cases (per DBB)
1. `grep -i hello /a.txt` where content is "Hello" → matches
2. `grep -il hello /a.txt` → output is `/a.txt`
3. `grep -ic hello /a.txt` where content is "Hello\nhello\nworld" → output is `2`
4. `grep -i hello /a.txt` where content is "world" → empty output
