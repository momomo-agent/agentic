# Design — Fix wc output format and empty file count

## File
`src/index.ts`

## Change
In `wc()` (line 608), fix line count for empty files:

```typescript
const content = r.content ?? ''
const lines = content === '' ? 0 : content.split('\n').length
const words = content.split(/\s+/).filter(Boolean).length
const chars = content.length
```

The default output format (line 621) already uses tabs — no change needed there.

## Logic
- Empty string `''`: `split('\n')` gives `['']` (length 1) — wrong. Guard with `content === '' ? 0`.
- Non-empty content: existing split logic is correct.

## Test cases
- `wc /empty` (empty file) → `'0\t0\t0\t/empty'`
- `wc /file` with `"hello\nworld"` → `'2\t2\t11\t/file'`
- `wc -l /file` → `'2'`
- `wc -w /file` → `'2'`
- `wc -c /file` → `'11'`
