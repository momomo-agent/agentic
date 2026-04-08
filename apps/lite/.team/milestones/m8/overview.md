# M8: Code Execution Expansion & Shell Tool

## Goals
Expand the code execution capabilities and add shell access tool.

## Scope
- Python execution support in code_exec (Pyodide for browser, child_process for Node)
- Filesystem API injection into code_exec sandbox (JS + Python)
- shell_exec tool exposing agentic-shell exec() to AI

## Acceptance Criteria
- code_exec auto-detects JS vs Python and routes to correct engine
- code_exec sandbox has access to filesystem via config.filesystem
- shell_exec tool returns stdout for shell commands
- All new tools covered by tests

## Tasks
- task-1775534038627: code_exec Python support
- task-1775534038662: code_exec filesystem injection
- task-1775534038696: shell_exec tool
