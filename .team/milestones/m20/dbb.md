# M20 DBB - Browser Compatibility & Zero-Config Filesystem

## DBB-001: shell_exec excluded in browser environments
- Requirement: shell_exec browser incompatibility fix
- Given: agentic-lite is loaded in a browser environment (no Node.js child_process available)
- Expect: `shell_exec` tool is not registered / not callable; no import of `child_process` occurs
- Verify: calling `ask()` with a shell command in browser context does not throw a Node.js module error; `child_process` is never referenced at runtime

## DBB-002: shell_exec works normally in Node.js
- Requirement: shell_exec browser incompatibility fix
- Given: agentic-lite is loaded in Node.js
- Expect: `shell_exec` tool is available and executes shell commands successfully
- Verify: `ask("run: echo hello")` returns a result with `shellResults` containing stdout `hello`

## DBB-003: ask() works without filesystem config
- Requirement: Zero-config AgenticFileSystem default
- Given: `ask(prompt, { provider, apiKey, model })` called with no `filesystem` field
- Expect: call succeeds (no error about missing filesystem); file_read/file_write tools operate against an in-memory store
- Verify: agent can write a file and read it back within the same session without any filesystem config passed by the caller

## DBB-004: Explicit filesystem config still works
- Requirement: Zero-config AgenticFileSystem default
- Given: `ask(prompt, { ..., filesystem: customFs })` with a user-supplied AgenticFileSystem
- Expect: the custom filesystem is used (not the default in-memory one)
- Verify: file written via agent is readable through the same `customFs` instance

## DBB-005: README documents Pyodide CDN requirement
- Requirement: Document Pyodide CDN dependency limitation
- Given: README.md is read
- Expect: README contains a section explaining that `code_exec` Python support requires Pyodide loaded from CDN
- Verify: README mentions Pyodide CDN URL or equivalent guidance for offline/CSP-restricted environments

## DBB-006: README provides offline/CSP workaround guidance
- Requirement: Document Pyodide CDN dependency limitation
- Given: README.md is read
- Expect: README includes guidance or workaround for environments where CDN access is blocked (e.g., self-hosting Pyodide, disabling Python execution)
- Verify: at least one actionable workaround is described
