# Design: Update PRD.md — add shell_exec and Python code_exec

## File to Modify
- `PRD.md`

## Change
Update the Tools section to add `shell_exec` and note Python support in `code_exec`.

## Target Tools Table
```markdown
## Tools
- `search` — web search, returns sources
- `code_exec` — executes JS or Python via AsyncFunction/Pyodide (browser-compatible)
- `shell_exec` — executes shell commands via subprocess (Node.js only)
- `file_read` / `file_write` — file I/O via AgenticFileSystem (browser-compatible)
```

## Verification
- `grep 'shell_exec' PRD.md` → matches
- `grep -i 'python' PRD.md` → matches
