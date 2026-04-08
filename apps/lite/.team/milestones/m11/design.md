# M11 Technical Design — README Expansion & Type Completeness

## Tasks
1. `task-1775564683082` — Expand README.md with full API docs
2. `task-1775564688602` — Fix AgenticResult.shellResults type completeness

## Approach

### Task 1: README.md
Edit `README.md` (project root). Add sections:
- Installation
- Quick Start
- `ask()` API reference (signature + all config fields)
- Tools reference (one subsection per tool)
- Provider config table

No new files needed.

### Task 2: types.ts
`src/types.ts` already has `shellResults?: ShellResult[]` in `AgenticResult` and a `ShellResult` interface.
`src/tools/shell.ts` also exports a `ShellResult` interface — these are duplicates.

Fix: remove the duplicate from `shell.ts`, import from `types.ts` instead.

## Files Modified
- `README.md` — documentation only
- `src/types.ts` — verify ShellResult is canonical here
- `src/tools/shell.ts` — remove duplicate ShellResult, import from types.ts
