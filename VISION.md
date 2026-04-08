# Vision — Agentic Shell

## Product Vision

Agentic Shell is a UNIX-like shell interface designed for AI agent tool use. It runs on top of the `AgenticFileSystem` abstraction, enabling deterministic command execution in sandboxed environments — browser, Electron, and Node.js — without native OS dependencies.

## Target Users

- **AI agents** executing structured filesystem operations through a familiar shell syntax
- **Developers** embedding a sandboxed shell into browser-based or cross-platform tools
- **Platform builders** who need a portable command execution layer that works identically across environments

## Core Value Proposition

1. **Deterministic output** — same command produces same output regardless of runtime environment
2. **UNIX compatibility** — standard error formats, exit codes, and command semantics
3. **Cross-environment parity** — identical behavior in browser, Electron, and Node.js
4. **Agent-friendly interface** — clean output suitable for programmatic consumption

## Implemented Capabilities

### Commands (17)
`ls`, `cd`, `pwd`, `cat`, `grep`, `find`, `echo`, `mkdir`, `rm`, `mv`, `cp`, `touch`, `head`, `tail`, `wc`, `export`, `jobs`/`fg`/`bg`

### Shell Features
- **Piping** (`|`) — chain commands with stdin/stdout flow
- **Redirection** (`>`, `>>`, `<`) — output and input file redirection
- **Glob patterns** (`*`, `?`, `[...]`) — filename expansion in command arguments
- **Environment variables** (`$VAR`, `${VAR}`) — variable substitution in arguments
- **Command substitution** (`$(cmd)`, `` `cmd` ``) — nested command execution
- **Background execution** (`&`) — async command execution with job control
- **Argument quoting** — single and double quote support
- **Exit codes** — 0 (success), 1 (path error), 2 (usage/command error)
- **Path resolution** — relative and absolute path handling with `.`/`..` normalization
- **Read-only filesystem guard** — permission checking for write operations
- **Pagination** — `ls --page` and `--page-size` for large directories
- **Streaming** — `grep` streaming mode for large files via `readStream`

## Design Principles

- **Single-file simplicity** — all shell logic in `src/index.ts` (~970 lines, refactor trigger at 1000)
- **Interface-based filesystem** — all environment differences abstracted by `AgenticFileSystem`
- **Error strings, not exceptions** — commands return error messages as strings
- **UNIX convention compliance** — `<cmd>: <context>: <reason>` error format

## Near-Term Roadmap

- Real browser/Electron/Node.js filesystem integration tests (currently mock-based)
- Performance benchmarks on real filesystems (mock FS benchmarks passing)
- Test coverage quality gate CI enforcement (thresholds configured in vitest.config.ts)
