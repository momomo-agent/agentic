# Task Design: Add command substitution tests

**Task ID**: task-1775588571054
**Priority**: P1
**Milestone**: m27
**Blocked By**: task-1775588562205

## Scope

Comprehensive test suite for the command substitution feature implemented in task-1775588562205. Target: 10+ test cases covering basic substitution, nested substitution, error propagation, and edge cases.

## File to Modify

- `src/index.test.ts` — add new `describe('command substitution')` block

## Test Cases

### Basic substitution (3 tests)

```typescript
it('should substitute $(pwd) with current directory', async () => {
  const r = await shell.exec('echo $(pwd)')
  expect(r.output).toBeTruthy()
  expect(r.exitCode).toBe(0)
})

it('should substitute $(echo ...) with command output', async () => {
  const r = await shell.exec('echo $(echo hello)')
  expect(r.output).toBe('hello')
  expect(r.exitCode).toBe(0)
})

it('should preserve text around substitution', async () => {
  const r = await shell.exec('echo prefix$(echo middle)suffix')
  expect(r.output).toBe('prefixmiddlesuffix')
})
```

### Nested substitution (3 tests)

```typescript
it('should handle nested substitution depth 2', async () => {
  const r = await shell.exec('echo $(echo $(echo nested))')
  expect(r.output).toBe('nested')
})

it('should handle nested substitution depth 3', async () => {
  const r = await shell.exec('echo $(echo $(echo $(echo deep)))')
  expect(r.output).toBe('deep')
})

it('should stop recursion at max depth without crashing', async () => {
  const r = await shell.exec('echo $(echo $(echo $(echo $(echo too-deep))))')
  expect(r.exitCode).toBe(0)
  // Should not throw or hang
})
```

### Error propagation (2 tests)

```typescript
it('should expand failed command to empty string', async () => {
  const r = await shell.exec('echo before$(nonexistent_cmd)after')
  expect(r.output).toBe('beforeafter')
})

it('should handle empty command substitution', async () => {
  const r = await shell.exec('echo $(echo "")')
  expect(r.output).toBe('')
})
```

### Multiple substitutions (1 test)

```typescript
it('should handle multiple substitutions in one command', async () => {
  const r = await shell.exec('echo $(echo a) $(echo b) $(echo c)')
  expect(r.output).toBe('a b c')
})
```

### Backtick syntax (2 tests)

```typescript
it('should support backtick command substitution', async () => {
  const r = await shell.exec('echo `echo hello`')
  expect(r.output).toBe('hello')
})

it('should handle unclosed backtick without crashing', async () => {
  const r = await shell.exec('echo `unclosed')
  expect(r.exitCode).toBe(0)
})
```

### Environment variable interaction (1 test)

```typescript
it('should substitute env vars inside command substitution', async () => {
  shell.setEnv('GREET', 'hello')
  const r = await shell.exec('echo $(echo $GREET)')
  expect(r.output).toBe('hello')
})
```

### Pipe inside substitution (1 test)

```typescript
it('should handle pipe inside command substitution', async () => {
  const r = await shell.exec('echo $(echo "hello world" | grep hello)')
  expect(r.output).toBe('hello world')
})
```

## Test Helper

Use existing `MockFileSystem` from test file. No new mock infrastructure needed.

## Dependencies

- Blocked by task-1775588562205 (command substitution implementation)
- Tests reference `exec()` method and `setEnv()` method

## Verification

Run `npm test` — all 12+ new tests pass, no regressions in existing tests.
