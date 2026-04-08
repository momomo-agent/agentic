# Design: Fix unknown command exit code

## File to modify
- `src/index.ts`

## Change
In `exitCodeFor()` (line 115), change the `command not found` branch to return `2` instead of `127`.

### Current (line 117)
```typescript
if (/\bcommand not found\b/.test(first)) return 127
```

### New
```typescript
if (/\bcommand not found\b/.test(first)) return 2
```

## Test cases
- `exec('foobar')` → `{ output: 'foobar: command not found', exitCode: 2 }`
- `exec('ls')` → `{ exitCode: 0 }`
- `exec('cat /nonexistent')` → `{ exitCode: 1 }`
- `exec('grep')` → `{ exitCode: 2 }` (missing pattern)

## Dependencies
- Update `exit-codes.test.ts` expectation for unknown command from 127 → 2
