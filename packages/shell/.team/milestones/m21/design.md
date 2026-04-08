# Technical Design — m21: Shell Scripting Foundations

## Overview
Three features added to `src/index.ts`: env var substitution, command substitution, and bracket glob support.

## 1. Environment Variable Substitution

Add `private env: Map<string, string> = new Map()` to `AgenticShell`.

Add public method:
```typescript
setEnv(key: string, value: string): void
```

In `exec()`, before any other processing, apply substitution:
```typescript
private substituteEnv(cmd: string): string
// Replace $VAR and ${VAR} with env values; undefined vars → ''
```

Call `substituteEnv()` at the top of `exec()` on `trimmed`.

## 2. Command Substitution

In `exec()`, after env substitution, apply command substitution:
```typescript
private async substituteCommands(cmd: string): Promise<string>
// Find $(…) patterns, recursively call exec(), splice output (trimmed) in place
```

Handle multiple non-nested `$(...)` occurrences left-to-right.

## 3. Bracket Glob Support

Extend `matchGlob()` to handle `[...]` before escaping:
```typescript
private matchGlob(name: string, pattern: string): boolean
// Convert [abc] → [abc] (pass through as regex char class)
// Convert [a-z] → [a-z] (pass through as regex range)
// Escape other regex metacharacters except *, ?, [, ]
```

Extend `expandGlob()` and `expandPathArgs()` to detect `[` in addition to `*`/`?`.

## Execution Order in exec()
1. `substituteEnv(trimmed)`
2. `await substituteCommands(result)`
3. Existing redirection / pipe / execSingle logic
