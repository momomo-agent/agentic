# M22 DBB - Browser Shell & Pyodide Resilience

## DBB-001: shell_exec browser stub — no crash
- Requirement: shell_exec browser-safe
- Given: `shell_exec` is called in a browser environment (no Node.js process/child_process)
- Expect: returns a result object with a clear error message (e.g. "shell_exec is not supported in browser environments"), does NOT throw an unhandled exception
- Verify: calling `shell_exec` in a browser context resolves (not rejects) with an error-indicating result

## DBB-002: shell_exec browser stub — result shape
- Requirement: shell_exec browser-safe
- Given: `shell_exec` called in browser environment
- Expect: returned value conforms to `ShellResult` shape (has `stdout`, `stderr`, or `error` field); `AgenticResult.shellResults` is populated
- Verify: result is inspectable without runtime error

## DBB-003: shell_exec Node.js — unaffected
- Requirement: shell_exec browser-safe (no regression)
- Given: `shell_exec` called in Node.js environment with a valid shell command (e.g. `echo hello`)
- Expect: command executes normally, output returned in result
- Verify: `shellResults[0]` contains expected stdout

## DBB-004: Pyodide load failure — graceful error
- Requirement: Pyodide resilience
- Given: Pyodide CDN is unavailable (network blocked or URL unreachable) and `code_exec` is called with Python code
- Expect: `code_exec` returns a user-friendly error message (e.g. "Pyodide unavailable: ..."), does NOT produce an unhandled promise rejection
- Verify: the promise resolves with an error result; no uncaught rejection in console

## DBB-005: Pyodide load failure — result shape
- Requirement: Pyodide resilience
- Given: Pyodide fails to load
- Expect: `codeResults` entry has an `error` field with a human-readable message; `answer` is still returned by the agent loop
- Verify: `AgenticResult.codeResults[0].error` is a non-empty string

## DBB-006: Pyodide success path — unaffected
- Requirement: Pyodide resilience (no regression)
- Given: Pyodide CDN is reachable and `code_exec` is called with Python code
- Expect: Python executes normally, output returned
- Verify: `codeResults[0].output` contains expected result

## DBB-007: Existing test suite passes
- Requirement: All existing tests pass
- Given: full test suite run after m22 changes
- Expect: zero test failures
- Verify: test runner exits with code 0
