# Design — $(cmd) Command Substitution

## File to Modify
- `src/index.ts`

## New Private Method
```typescript
private async substituteCommands(cmd: string): Promise<string>
```

### Logic
1. Find leftmost `$(` in `cmd`
2. Scan forward from `$(` tracking paren depth to find matching `)`
3. Extract inner command; call `this.exec(innerCmd)`, use `.output.trim()` as replacement
4. If inner exec exitCode !== 0, substitute empty string
5. Replace the `$(...)` span; repeat from step 1 until no more `$(`
6. Return final string

### Integration in exec()
After `substituteEnv`, before redirection/pipe logic:
```typescript
const afterEnv = this.substituteEnv(trimmed)
const substituted = await this.substituteCommands(afterEnv)
// use `substituted` for all subsequent logic
```

## Edge Cases
- Inner command error → empty string substituted, no outer error
- `$(  )` whitespace only → `exec('')` returns `''`
- Multiple `$(...)` in one command → process left-to-right
- Nested `$($(cmd))` → depth tracking resolves inner first

## Dependencies
- Runs after `substituteEnv()` so env vars in inner commands are already resolved
- Requires `$VAR` task (task-1775582074220) to be implemented first

## Test Cases
1. `exec('echo $(pwd)')` → `{ output: cwd, exitCode: 0 }`
2. `exec('echo $(echo hello)')` → `{ output: 'hello', exitCode: 0 }`
3. `exec('cat $(echo /file.txt)')` → reads `/file.txt`
4. `exec('echo $(nonexistent_cmd)')` → `{ output: '', exitCode: 0 }`
5. `exec('echo $(echo a) and $(echo b)')` → `{ output: 'a and b', exitCode: 0 }`
