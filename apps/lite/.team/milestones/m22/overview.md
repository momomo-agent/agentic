# m22: Vision Gap Closure — Browser Shell & Pyodide Resilience

## Goals
Close remaining vision gaps (85% → 100%):
1. Make `shell_exec` browser-safe (stub/warn instead of crashing)
2. Improve Pyodide resilience (graceful fallback when CDN unavailable)

## Acceptance Criteria
- `shell_exec` in browser environment returns a clear error/stub rather than throwing Node.js-specific errors
- Pyodide load failure produces a user-friendly error, not an unhandled rejection
- All existing tests pass

## Out of Scope
- Bundling Pyodide (separate infrastructure concern)
- Replacing shell_exec with a browser alternative
