# M25: Vision Gap Closure — Final 18%

## Goals
Close the remaining 3 vision gaps to reach 100% vision match.

## Scope

### Gap 1: Default Browser Filesystem (missing → implemented)
Auto-instantiate AgenticFileSystem when no `fs` option is provided, so file_read/file_write work zero-config in browser environments.

### Gap 2: Shell Exec Browser Safety (partial → implemented)
When `shell_exec` is called in a browser environment (no child_process), emit a clear error/warning rather than crashing. Document the Node.js-only constraint explicitly.

### Gap 3: Search Zero-Config Fallback (partial → implemented)
When no Tavily/Serper API key is provided, search tool should return a graceful error message instead of throwing, enabling browser use without external keys.

## Acceptance Criteria
- `ask()` with file tools works without passing `fs` option
- `shell_exec` in browser returns descriptive error, not crash
- `search` without API key returns graceful degradation message
- All existing tests pass
