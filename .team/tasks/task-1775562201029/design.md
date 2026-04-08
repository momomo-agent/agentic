# Design: fs adapter contract validation at shell init

## File to Modify
- `src/index.ts`

## Change
Update the constructor (~line 8):

```typescript
constructor(private fs: AgenticFileSystem) {
  const required = ['read', 'write', 'ls', 'delete', 'grep']
  const missing = required.filter(m => typeof (fs as any)[m] !== 'function')
  if (missing.length) throw new Error(`AgenticShell: fs missing required methods: ${missing.join(', ')}`)
}
```

## Edge Cases
- Optional methods (`mkdir`, `readStream`) are NOT validated — only the 5 required ones
- Throws synchronously in constructor (fail-fast)
- `readOnly` property absence is not an error

## Test Cases
1. Passing fs missing `grep` → throws `Error` containing `"grep"`
2. Passing fs missing multiple methods → error lists all missing
3. Valid full fs → constructs without error
4. Valid fs without optional methods → constructs without error
