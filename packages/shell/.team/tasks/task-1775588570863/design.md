# Task Design: Implement glob bracket expressions [abc]

**Task ID**: task-1775588570863
**Priority**: P1
**Milestone**: m27

## Current State

`matchGlob()` at `src/index.ts:354-368` already handles bracket expressions by passing `[...]` through to regex:
```typescript
if (ch === '[') {
  const close = pattern.indexOf(']', i + 1)
  if (close !== -1) { re += pattern.slice(i, close + 1); i = close + 1; continue }
}
```

This means `[abc]` and `[a-z]` already work correctly because they are valid regex character classes.

**What's missing**:
1. **Negated brackets `[!abc]`** — in UNIX glob, `!` negates. In regex, `^` negates. Current code passes `[!abc]` through as-is, which means regex matches literal `!`, `a`, `b`, or `c` — incorrect behavior.
2. **Edge case: `[!]`** — two-char bracket (just `[!]`) should be treated as literal, not negation.

## Files to Modify

- `src/index.ts` — `matchGlob()` method (lines 354-368)

## Change

### Fix bracket negation in `matchGlob()`

**Location**: `src/index.ts:359-361`

Current code:
```typescript
if (ch === '[') {
  const close = pattern.indexOf(']', i + 1)
  if (close !== -1) { re += pattern.slice(i, close + 1); i = close + 1; continue }
}
```

New code:
```typescript
if (ch === '[') {
  const close = pattern.indexOf(']', i + 1)
  if (close !== -1) {
    let bracket = pattern.slice(i, close + 1)
    // Convert [!abc] -> [^abc] (UNIX glob negation -> regex negation)
    if (bracket.length > 2 && bracket[1] === '!') {
      bracket = '[^' + bracket.slice(2)
    }
    re += bracket
    i = close + 1
    continue
  }
}
```

### Logic

- If bracket content starts with `!` and has at least 3 chars (e.g., `[!abc]`), replace `!` with `^`
- `[!]` (exactly 2 chars) passes through unchanged — regex `[!]` matches literal `!`
- `[abc]` passes through unchanged — already correct regex
- `[a-z]` passes through unchanged — already correct regex

## Edge Cases

| Pattern | Matches | Doesn't Match |
|---------|---------|---------------|
| `[!abc]*` | `def.txt`, `xyz.txt` | `abc.txt` |
| `[!a-z]*` | `1foo`, `0bar` | `alpha.txt` |
| `[abc]*` | `alpha.txt`, `beta.txt` | `delta.txt` |
| `[a-z]*` | `alpha.txt` | `1file.txt` |
| `[0-9]*` | `1file.txt` | `alpha.txt` |

## Dependencies

- None

## Verification

Run `npm test` and verify:
- `cat [!abc].txt` matches only non-a/b/c files
- `ls [a-z]*` still works (no regression)
- `ls [0-9]*` matches digit-prefixed files
- Existing `*` and `?` glob tests pass
