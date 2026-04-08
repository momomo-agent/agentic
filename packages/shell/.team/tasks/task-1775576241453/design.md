# Design: Fix wc tab-separated output

## File to modify
- `src/index.ts`

## Change
In `wc()` (line 647), replace space separators with `\t` in all return statements.

### Current (line 657-660)
```typescript
if (flags.includes('-l')) return `${lines} ${path}`
if (flags.includes('-w')) return `${words} ${path}`
if (flags.includes('-c')) return `${chars} ${path}`
return `${lines} ${words} ${chars} ${path}`
```

### New
```typescript
if (flags.includes('-l')) return `${lines}\t${path}`
if (flags.includes('-w')) return `${words}\t${path}`
if (flags.includes('-c')) return `${chars}\t${path}`
return `${lines}\t${words}\t${chars}\t${path}`
```

## Test cases
- `wc file` → `"2\t3\t10\t/file"`
- `wc -l file` → `"2\t/file"`
- `wc -w file` → `"3\t/file"`
- `wc -c file` → `"10\t/file"`
- `wc nonexistent` → `"wc: nonexistent: No such file or directory"`

## Edge cases
- Empty file: lines=0, words=0, chars=0 → `"0\t0\t0\t/file"`
- No flags: all three counts tab-separated
