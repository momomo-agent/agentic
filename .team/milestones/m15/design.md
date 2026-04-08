# M15 Technical Design — ARCHITECTURE.md & Type Correctness

## Tasks

### 1. Create ARCHITECTURE.md (task-1775571287973)
- Write `ARCHITECTURE.md` at repo root documenting module structure, interfaces, data flow, provider resolution, and tool system based on current source

### 2. Fix types.ts (task-1775571299863)
- `src/types.ts`: remove `?` from `usage` field, remove `| undefined` from `images` field in `AgenticResult`

### 3. Add shellResults to PRD (task-1775571299895)
- `PRD.md`: add `shellResults?: ShellResult[]` to the `AgenticResult` schema section
