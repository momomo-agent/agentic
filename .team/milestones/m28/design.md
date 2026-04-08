# Technical Design — m28: Final Gap Closure & Verification

## Overview
This milestone closes remaining documentation and analysis gaps to push Vision and PRD match scores to ≥90%. No source code changes are required — the work is documentation creation and gap re-analysis.

## Scope

### 1. VISION.md Creation (task-1775614258365)
- **Action**: Create VISION.md at project root
- **Dependencies**: None (PRD.md and ARCHITECTURE.md exist as references)
- **Output**: VISION.md file with product vision, target users, differentiators, roadmap

### 2. Vision Gap Re-analysis (task-1775614258408)
- **Action**: Agent scans codebase against VISION.md and PRD.md, updates .team/gaps/vision.json
- **Dependencies**: task-1775614258365 (VISION.md must exist first)
- **Input**: VISION.md, PRD.md, src/index.ts, src/index.test.ts
- **Output**: Updated .team/gaps/vision.json with match ≥90%

### 3. PRD Gap Re-analysis (task-1775614258455)
- **Action**: Agent scans codebase against PRD.md, updates .team/gaps/prd.json
- **Dependencies**: None (PRD.md already updated)
- **Input**: PRD.md, src/index.ts, src/index.test.ts
- **Output**: Updated .team/gaps/prd.json with match ≥90%

### 4. Architecture Alignment (task-1775614258494)
- **Action**: Compare ARCHITECTURE.md with actual implementation, identify discrepancies, update architecture.json
- **Dependencies**: None (read-only verification)
- **Input**: ARCHITECTURE.md, src/index.ts
- **Output**: Updated .team/gaps/architecture.json, optional CR if ARCHITECTURE.md needs edits

## Known Discrepancies to Address

### Architecture Document vs Implementation
1. **Exit codes**: ARCHITECTURE.md says "not currently implemented" but exec() returns `{ output, exitCode }`
2. **Glob support**: Listed under "Future Enhancements" but matchGlob/expandGlob/expandPathArgs are implemented
3. **Redirection**: Listed under "Future Enhancements" but `>` / `>>` / `<` are handled in exec()
4. **Pipe error propagation**: Doc says "empty stdin on left failure" but implementation short-circuits

### Vision Gaps (last scan 2026-04-07)
1. Env vars ($VAR) — now implemented
2. Command substitution ($()) — now implemented
3. Glob bracket expressions ([abc]) — now implemented
4. cp -r error — fixed
5. VISION.md — being created in this milestone
6. Background jobs (&, fg, bg, jobs) — still not implemented (may remain as gap)

## Execution Order
1. Create VISION.md (task-1775614258365) — unblocks vision gap analysis
2. Re-run vision gap analysis (task-1775614258408)
3. Re-run PRD gap analysis (task-1775614258455) — can run in parallel with #2
4. Verify architecture alignment (task-1775614258494) — can run in parallel with #2/#3

## Risk Assessment
- **Risk**: Vision score may not reach 90% if remaining gaps (background jobs, recursive glob) are too significant
- **Mitigation**: Background jobs may already be partially implemented — check code before assuming it's a gap
- **Risk**: PRD score may still fall short if many "partial" test coverage gaps remain
- **Mitigation**: Re-analysis may reclassify previously-implemented-but-untested features as fully implemented if tests were added in m21-m27
