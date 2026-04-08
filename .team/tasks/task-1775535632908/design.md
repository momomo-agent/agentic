# Task Design — 跨环境一致性测试

## Files to Create/Modify
- `src/index.test.ts` — add cross-backend consistency test suite (new `describe` block)

## Approach

Create a shared test factory that runs the same command assertions against two mock `AgenticFileSystem` implementations: a minimal in-memory mock (simulating Node/Electron) and a second mock with slightly different error message casing (simulating browser backend). Both must produce identical `AgenticShell` output.

## Test Factory Signature

```ts
function runConsistencyTests(label: string, fs: AgenticFileSystem): void
// Registers a describe(label, ...) block with the standard command assertions
```

Call twice:
```ts
runConsistencyTests('node-backend', makeNodeMock())
runConsistencyTests('browser-backend', makeBrowserMock())
```

## Mock Backends

```ts
function makeNodeMock(): AgenticFileSystem
// Returns mock where errors use "not found" phrasing

function makeBrowserMock(): AgenticFileSystem
// Returns mock where errors use "No such file" phrasing
// Same data, different raw error strings — shell must normalize both
```

## Assertions (per backend)

| Command | Expected output |
|---|---|
| `ls /` | same file list |
| `cat /file.txt` | same content |
| `cat /missing` | `cat: /missing: No such file or directory` |
| `grep pattern /file.txt` | same matches |
| `pwd` | `/` |
| `cd /dir && pwd` | `/dir` |
| `rm /missing` | `rm: cannot remove '/missing': No such file or directory` |

## Edge Cases
- Path resolution: `cat ./sub/../file.txt` must resolve identically on both backends
- Error normalization: `fsError()` in `src/index.ts` already normalizes — test confirms it handles both "not found" and "No such" raw errors

## Dependencies
- `src/index.ts` — `AgenticShell` class
- `src/index.test.ts` — existing test infrastructure and mocks
- Blocked by `task-1775531782004` (rm -r must be done first so rm tests are stable)

## Test Cases
- Both backends return identical output for all 7 commands above
- Error messages match UNIX format regardless of backend raw error string
- Path `./sub/../file.txt` resolves to `/file.txt` on both backends
