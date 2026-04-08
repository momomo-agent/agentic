# Design: Fix grep -l stdin identifier

## File
`src/index.ts` — `execWithStdin()` (~line 163)

## Problem
`grep -l` in stdin mode returns `''` even when lines match. UNIX convention: return `'(stdin)'`.

## Change
```typescript
// Before:
if (flags.includes('-l')) return ''

// After:
if (flags.includes('-l')) return lines.length ? '(stdin)' : ''
```

## Edge Cases
- Match found: return `'(stdin)'`
- No match: return `''` (exitCode 1 via caller)
- File mode grep -l: unaffected (handled in `grep()` method, not `execWithStdin`)

## Test Cases
- `echo "hello" | grep -l hello` → `'(stdin)'`
- `echo "hello" | grep -l world` → `''`
