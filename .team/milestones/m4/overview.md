# M4: Command Completeness — Round 2

## Goals
- **[P0] Create ARCHITECTURE.md** — formalize single-file architecture, command patterns, extension points
- Close remaining vision gaps: grep -i, find recursion
- Fix rm fs.delete bug
- Fix path normalization in resolve()

## Acceptance Criteria
- ARCHITECTURE.md documents design decisions, AgenticFileSystem interface contract, and extension points
- grep -i returns case-insensitive matches
- find traverses directory trees recursively
- rm correctly calls fs.delete (not a stub)
- resolve() normalizes ../ segments correctly

## Scope
5 tasks (1 P0, 4 P1). ARCHITECTURE.md is critical gap from architecture.json.
