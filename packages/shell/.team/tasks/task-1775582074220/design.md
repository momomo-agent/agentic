# Design — $VAR / ${VAR} Environment Variable Substitution

## File to Modify
- `src/index.ts`

## New State on AgenticShell
```typescript
private env: Map<string, string> = new Map()
setEnv(key: string, value: string): void { this.env.set(key, value) }
```

## New Private Method
```typescript
private substituteEnv(cmd: string): string
```

### Logic
1. Replace `${VAR}` first: `/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g` → `this.env.get(name) ?? ''`
2. Replace `$VAR`: `/\$([A-Za-z_][A-Za-z0-9_]*)/g` → `this.env.get(name) ?? ''`
3. Return result

### Integration in exec()
After `const trimmed = command.trim()`, before any other logic:
```typescript
const substituted = this.substituteEnv(trimmed)
// use `substituted` in place of `trimmed` for all subsequent logic
```

## Edge Cases
- Unset var → empty string, no error
- `${}` — not matched (requires ≥1 word char), left as-is
- `$VAR_suffix` — `VAR_suffix` is the full var name; use `${VAR}` to disambiguate

## Test Cases
1. `setEnv('HOME', '/home/user'); exec('echo $HOME')` → `{ output: '/home/user', exitCode: 0 }`
2. `setEnv('F', '/a.txt'); exec('cat $F')` → reads `/a.txt`
3. `exec('echo $UNDEFINED')` → `{ output: '', exitCode: 0 }`
4. `setEnv('X', 'hello'); exec('echo ${X}')` → `{ output: 'hello', exitCode: 0 }`
5. `setEnv('DIR', '/tmp'); exec('ls ${DIR}')` → lists `/tmp`
