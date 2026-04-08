# M8 Verification Criteria (DBB)

## Code Execution Multi-Language Support

### Python Execution
- [ ] `code_exec` auto-detects Python code (checks for `import`, `def`, `print` keywords)
- [ ] Browser environment: Pyodide WASM loads and executes Python code
- [ ] Node/Electron environment: `child_process.spawn('python3')` executes Python code
- [ ] Python execution returns stdout/stderr correctly
- [ ] Python execution errors are captured and returned in `error` field

### JavaScript Execution
- [ ] `code_exec` continues to support JavaScript (existing quickjs-emscripten)
- [ ] Language detection defaults to JavaScript when Python keywords not found

## Filesystem API Injection

### JavaScript Sandbox
- [ ] `fs.readFileSync(path)` reads from `config.filesystem`
- [ ] `fs.writeFileSync(path, data)` writes to `config.filesystem`
- [ ] `fs.existsSync(path)` checks file existence via `config.filesystem`
- [ ] Injected `fs` object available in code execution scope

### Python Sandbox
- [ ] `open(path, 'r')` reads from `config.filesystem`
- [ ] `open(path, 'w')` writes to `config.filesystem`
- [ ] File operations in Python code transparently use virtual filesystem

## Shell Tool

### Tool Definition
- [ ] `shell_exec` tool registered with correct schema
- [ ] Tool accepts `command: string` parameter
- [ ] Tool description clearly explains shell command execution

### Execution
- [ ] `agentic-shell` package integrated
- [ ] Shell commands execute against `config.filesystem`
- [ ] Commands return stdout as tool output
- [ ] Common commands work: `ls`, `cat`, `grep`, `find`, `pwd`
- [ ] Command errors captured and returned

## Integration

### Type System
- [ ] `ToolName` type includes 'shell' option
- [ ] `AgenticConfig.tools` array accepts 'shell'
- [ ] Tool registration in `ask.ts` includes shell_exec

### Test Coverage
- [ ] Python execution test (basic script)
- [ ] JavaScript with fs injection test
- [ ] Python with open() injection test
- [ ] shell_exec basic commands test
- [ ] Language auto-detection test
- [ ] Error handling tests for all new features

## Acceptance

All checkboxes above must pass. AI should be able to:
1. Write and execute Python code
2. Read/write files from within code (JS or Python) without explicit tool calls
3. Use shell commands to explore and manipulate the filesystem
