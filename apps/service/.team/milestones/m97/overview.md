# M97: Architecture Doc Polish + Remaining Gap Closure

## Goal
Close remaining gaps to reach Vision >=90% and PRD >=90%.

## Context
- M95 (architecture docs + CPU profiling + gap evaluation) — 3/4 tasks done, gap eval ready to run
- Gap files are stale (last updated Apr 7). Many items marked "partial" or "missing" may already be implemented
- ARCHITECTURE.md has known issues:
  - Directory structure (lines 121-155) is incomplete — missing embed.js, vad.js, profiler.js, latency-log.js, store/, tunnel.js, cli/, cert.js, httpsServer.js, middleware.js, adapters/
  - Stale CR content appended at end (lines 191+) needs removal
  - No section 9 for agentic-embed (embed.js + adapters/)
  - No section for profiler/latency-log modules
- Vision score (94%) and PRD score (95%) — both meet ≥90% goal ✅
- Architecture docs still incomplete (12%) — remaining M97 tasks address this

## Tasks (3-4)

### Task 1: Complete ARCHITECTURE.md directory structure
- Add all missing files to the directory tree: runtime/embed.js, runtime/vad.js, runtime/profiler.js, runtime/latency-log.js, runtime/adapters/, store/, tunnel.js, cli/setup.js, cli/browser.js, server/cert.js, server/httpsServer.js, server/middleware.js

### Task 2: Clean stale CR content + add missing sections
- Remove stale CR text from ARCHITECTURE.md (lines 191+)
- Add section 9: agentic-embed (embed.js + adapters/)
- Add section for profiler/latency-log modules

### Task 3: Verify and update PRD/Vision gap statuses
- Check each "partial" item in vision.json and prd.json against actual implementation
- Mark items as "implemented" where code confirms completion
- Identify any true remaining gaps

### Task 4: Final gap re-evaluation
- Run fresh gap analysis after all fixes
- Confirm Vision >=90% and PRD >=90%

## Acceptance Criteria
- ARCHITECTURE.md has complete directory structure matching actual codebase
- No stale CR content in ARCHITECTURE.md
- All implemented modules documented with proper sections
- Fresh gap evaluation shows Vision >=90%, PRD >=90%

## Priority
P0 — final push to project goal
