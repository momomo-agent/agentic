# Task Design: Fix wc -l/-w/-c flag support

## File to Modify
- `src/index.ts` — wc method
- `src/index.test.ts` — new tests

## Problem
`wc` always returns full `lines\twords\tchars\tpath` output regardless of flags.

## Fix
Check flags and return only the requested count:

```typescript
if (flags.includes('-l')) return String(lines)
if (flags.includes('-w')) return String(words)
if (flags.includes('-c')) return String(chars)
return `${lines}\t${words}\t${chars}\t${path}`
```

## Function Signatures
No new functions. Modify existing `private async wc(args: string[]): Promise<string>`.

## Edge Cases
- Multiple flags (e.g. `-lw`) → first matching flag wins
- Missing file → `wc: <path>: No such file or directory`
- Empty file → lines=1, words=0, chars=0

## Test Cases (per DBB)
1. `wc -l /file.txt` with 3 lines → output `3`
2. `wc -w /file.txt` with "hello world foo" → output `3`
3. `wc -c /file.txt` with "abc" → output `3`
4. `wc /file.txt` with 2 lines, 3 words, 10 chars → output `2\t3\t10\t/file.txt`
