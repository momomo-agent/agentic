# Design: Fix wc tab-separated output

## File to modify
- `src/index.ts`

## Change
In `wc()` (line ~660), replace space separators with `\t`:

```typescript
// Before
if (flags.includes('-l')) return `${lines} ${path}`
if (flags.includes('-w')) return `${words} ${path}`
if (flags.includes('-c')) return `${chars} ${path}`
return `${lines} ${words} ${chars} ${path}`

// After
if (flags.includes('-l')) return `${lines}\t${path}`
if (flags.includes('-w')) return `${words}\t${path}`
if (flags.includes('-c')) return `${chars}\t${path}`
return `${lines}\t${words}\t${chars}\t${path}`
```

## Edge cases
- No flags: all 4 fields tab-separated
- Single flag: count + tab + path
- Missing operand: unchanged (`wc: missing operand`)
- File not found: unchanged error format

## Test cases
```typescript
it('wc default uses tabs', async () => {
  fs.write('/f', 'hello world\nfoo')
  expect((await shell.exec('wc /f')).output).toBe('2\t3\t15\t/f')
})
it('wc -l uses tab', async () => {
  expect((await shell.exec('wc -l /f')).output).toBe('2\t/f')
})
```
