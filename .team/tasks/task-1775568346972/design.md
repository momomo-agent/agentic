# Design — Exit codes for all commands

## File to modify
- `src/index.ts`
- `src/index.test.ts`

## Return type change

```typescript
// Before
async exec(command: string): Promise<string>

// After
async exec(command: string): Promise<{ output: string; exitCode: number }>
```

All private methods (`execSingle`, `execWithStdin`, command methods) keep `Promise<string>`.

## Exit code determination

Add helper in `exec()` after getting the string result:

```typescript
private exitCodeFor(output: string): number {
  const first = output.trimStart().split('\n')[0]
  if (/\b(missing operand|missing pattern|command not found|Invalid regular expression)\b/.test(first)) return 2
  if (/^\w[\w-]*: .+: .+/.test(first)) return 1
  return 0
}
```

## Pipe handling

Track exit code across pipe stages:

```typescript
let exitCode = 0
for (let i = 0; i < segments.length; i++) {
  // ... execute segment, get output string
  const code = this.exitCodeFor(output)
  if (code !== 0) exitCode = code
}
return { output, exitCode }
```

## Output/append redirection

Wrap existing redirect branches to return `{ output: '', exitCode }`.

## Edge cases
- Empty command string → `{ output: '', exitCode: 0 }`
- `command not found` → exitCode 2
- Permission denied → exitCode 1

## Test cases (DBB-m12-001 to 005)
- `ls /` → exitCode 0
- `cat /nonexistent` → exitCode 1
- `grep` (no pattern) → exitCode 2
- `cat /nonexistent | grep x` → exitCode non-zero
- Every result has `.output` string and `.exitCode` number
