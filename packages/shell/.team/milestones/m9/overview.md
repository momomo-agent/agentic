# M9: Command Completeness — Round 4

## Goals
Address remaining missing and partial gaps from vision.json to push vision match toward 100%.

## Scope
1. `cp -r` recursive directory copy
2. `echo` output redirection (`>` and `>>`)
3. `ARCHITECTURE.md` — formalize design decisions
4. `mv` directory support (partial → complete)
5. `ls -a` surface real dotfiles from filesystem

## Acceptance Criteria
- `cp -r /src /dst` copies directory trees recursively
- `echo foo > file.txt` and `echo foo >> file.txt` write/append to files
- `ARCHITECTURE.md` exists at repo root documenting design decisions, command patterns, extension points
- `mv /dir /dst` moves directories (not just files)
- `ls -a /path` returns actual dotfiles from the underlying fs alongside `.` and `..`
- All new behavior covered by tests
