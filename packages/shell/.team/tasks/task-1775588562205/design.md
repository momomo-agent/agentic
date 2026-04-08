# Task Design: Implement command substitution $(cmd)

**Task ID**: task-1775588562205
**Priority**: P0
**Milestone**: m27

## Current State

`substituteCommands()` already exists at `src/index.ts:26-42`. It iteratively finds `$(...)` pairs using parenthesis depth tracking, executes the inner command via `this.exec()`, and replaces the substitution with trimmed output. Failed commands (exitCode !== 0) expand to empty string.

**What's missing**:
1. **No depth limit** — recursive `$(echo $(echo ...))` chains recurse indefinitely via the `this.exec()` → `substituteCommands()` → `this.exec()` loop
2. **No backtick syntax** — only `$(cmd)` supported, not `` `cmd` ``
3. **No explicit depth parameter** on `exec()` or `substituteCommands()`

## Files to Modify

- `src/index.ts` — 3 methods affected
- `src/index.test.ts` — new tests (covered by task-1775588571054)

## Changes

### Change 1: Add depth parameter to `exec()`

**Location**: `src/index.ts:61`

Current signature:
```typescript
async exec(command: string): Promise<{ output: string; exitCode: number }>
```

New signature:
```typescript
async exec(command: string, depth = 0): Promise<{ output: string; exitCode: number }>
```

- Pass `depth` to `this.substituteCommands(afterEnv, depth)` on line 63
- No other logic changes in `exec()`

### Change 2: Add depth parameter to `substituteCommands()`

**Location**: `src/index.ts:26`

Current signature:
```typescript
private async substituteCommands(cmd: string): Promise<string>
```

New signature:
```typescript
private async substituteCommands(cmd: string, depth = 0, maxDepth = 3): Promise<string>
```

Implementation changes:
1. **Early return on max depth** — add at method start:
   ```typescript
   if (depth >= maxDepth) return cmd
   ```
2. **Pass depth to recursive exec** — change line 38:
   ```typescript
   // Current:
   const r = await this.exec(inner)
   // New:
   const r = await this.exec(inner, depth + 1)
   ```

### Change 3: Add backtick substitution

**Location**: `src/index.ts:41` (after the existing `$(...)` while loop, before `return result`)

Add a second pass for backtick syntax:
```typescript
// Backtick substitution: `cmd`
while (true) {
  const start = result.indexOf('`')
  if (start === -1) break
  const end = result.indexOf('`', start + 1)
  if (end === -1) break  // unclosed backtick — treat as literal
  const inner = result.slice(start + 1, end)
  const r = await this.exec(inner, depth + 1)
  result = result.slice(0, start) + (r.exitCode === 0 ? r.output.trim() : '') + result.slice(end + 1)
}
```

## Algorithm

```
exec(cmd, depth=0):
  cmd = substituteEnv(cmd)
  cmd = substituteCommands(cmd, depth)    // depth passed through
  ... rest unchanged

substituteCommands(cmd, depth=0, maxDepth=3):
  if depth >= maxDepth: return cmd        // stop recursion

  // Pass 1: $(cmd)
  while '$(' in result:
    find matching ')'
    inner = extract content
    output = exec(inner, depth + 1)       // increment depth
    replace $(...) with output

  // Pass 2: `cmd`
  while '`' in result:
    find closing '`'
    inner = extract content
    output = exec(inner, depth + 1)
    replace `...` with output

  return result
```

## Edge Cases

| Case | Behavior |
|------|----------|
| `$(echo $(echo hi))` depth 2 | Works (depth 0->1->2, all < maxDepth 3) |
| `$(echo $(echo $(echo hi)))` depth 3 | Works (depth 0->1->2->3, last call returns cmd unchanged) |
| `$(echo $(echo $(echo $(echo hi))))` depth 4 | Innermost `$(echo hi)` returned as literal text |
| Empty `$()` | `inner` is empty string, `exec('')` returns `{output:'', exitCode:0}` -> empty |
| Unclosed `$(` | No matching `)` found, loop breaks, treated as literal |
| Unclosed backtick | No closing backtick, treated as literal |
| Nested `$(cmd \`sub\`)` | `$(...)` pass runs first, backtick pass runs on result of first pass |

## Dependencies

- None on other tasks
- Uses existing `this.exec()`, `this.substituteEnv()`

## Verification

Run `npm test` and verify:
- All existing command substitution tests pass
- `echo $(pwd)` returns cwd
- `echo $(echo $(echo hi))` returns `hi`
- `echo \`pwd\`` returns cwd
- Depth-limited commands don't cause stack overflow
