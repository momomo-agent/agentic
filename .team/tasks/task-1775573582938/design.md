# Task Design — Resolve pending CRs and sync PRD.md

## Files to Modify

- `.team/change-requests/cr-1775560282316.json`
- `.team/change-requests/cr-1775571299895.json`
- `PRD.md`

## Changes

### 1. Approve cr-1775560282316
Set `status: "approved"`, `reviewedAt: "<now>"`, `reviewedBy: "tech_lead"`.

### 2. Approve cr-1775571299895
Set `status: "approved"`, `reviewedAt: "<now>"`, `reviewedBy: "tech_lead"`.

### 3. Update PRD.md Tools section

Add entry:
```
- shell_exec — executes shell commands via agentic-shell (browser/Node compatible)
```

Update code_exec entry to:
```
- code_exec — executes JS/Python code via quickjs-emscripten sandbox (browser-compatible)
  with auto-language detection. Python uses Pyodide (browser) or python3 subprocess (Node).
  Injects filesystem API (fs object for JS, open() for Python) backed by AgenticFileSystem.
```

### 4. Update PRD.md AgenticResult schema

Add field:
```
shellResults?: ShellResult[]   // results from shell_exec tool calls
```

## Edge Cases

- Do not modify source code — documentation only
- Preserve existing PRD.md formatting/structure

## Verification

- Both CR JSONs have `status: "approved"`
- PRD.md contains `shell_exec`, updated `code_exec`, and `shellResults`
