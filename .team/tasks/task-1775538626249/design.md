# Design: grep -i case-insensitive search

## File to modify
`src/index.ts`

## Changes

### `grep()` (line 138)
```ts
const caseInsensitive = flags.includes('-i')
const regex = new RegExp(pattern, caseInsensitive ? 'i' : '')
```
Pass `regex` into `grepStream()` instead of `pattern` string, or pass the flag.

### `grepStream()` (line 169)
Change signature:
```ts
private async grepStream(pattern: string, path: string, flags: string[]): Promise<string[]>
```
Build regex with `'i'` flag when `-i` present:
```ts
const caseInsensitive = flags.includes('-i')
const regex = new RegExp(pattern, caseInsensitive ? 'i' : '')
```
Replace existing `new RegExp(pattern)` with this.

### `execWithStdin()` (line 48)
```ts
const caseInsensitive = flags.includes('-i')
const regex = new RegExp(pattern, caseInsensitive ? 'i' : '')
```
Replace existing `new RegExp(pattern)` with this.

## Edge cases
- `-i` combined with `-l`, `-c`, `-r` — all work independently, no interaction
- Invalid regex pattern — existing behavior (throws, caught by caller)

## Test cases
- `grep -i "hello" file` matches "Hello", "HELLO", "hElLo"
- `grep "hello" file` does NOT match "Hello" (case-sensitive unchanged)
- `echo "Hello" | grep -i "hello"` matches
- `grep -i -c "hello" file` returns correct count
- `grep -i -l "hello" file` returns filename
