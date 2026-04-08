# M13 Design — Type Correctness & README API Docs

## Scope

Three code/doc fixes + one doc addition:

1. `src/types.ts` — make `usage` required on `AgenticResult`
2. `src/ask.ts` — verify `systemPrompt` is passed via `config` (already correct; confirm no positional param mismatch)
3. `PRD.md` — add `shellResults` to `AgenticResult` block (CR submitted)
4. `README.md` — already has API reference; verify completeness

## Changes

### Task 1: types.ts
- Change `usage?: { input: number; output: number }` → `usage: { input: number; output: number }`
- `ask.ts` always sets `usage: totalUsage` so this is safe

### Task 2: ask() signature
- Current: `ask(prompt: string, config: AgenticConfig)` — `systemPrompt` is in `config`
- ARCHITECTURE.md says same. No code change needed; task is to verify and document alignment.

### Task 3: PRD shellResults
- PRD.md `AgenticResult` block missing `shellResults?: ShellResult[]`
- Submit CR to add it (cannot edit PRD directly)

### Task 4: README API docs
- README already has API reference section
- Verify `AgenticResult` in README matches types.ts after usage fix
- Update `usage?` → `usage` in README to match required field
