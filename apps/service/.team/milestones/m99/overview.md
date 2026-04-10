# M99: Architecture Documentation Gap Closure — 85% → 90%+

## Goal
Close the remaining ARCHITECTURE.md documentation gaps to bring architecture match from 85% to ≥90%. Also fix VISION.md directory tree accuracy.

## Scope
- Document `src/store/index.js` as formal module section (missing, major)
- Document `src/runtime/embed.js` and `src/runtime/adapters/` as formal module sections (partial, major)
- Document utility modules: profiler.js, latency-log.js, sox.js, download-state.js (missing, minor)
- Update VISION.md directory tree to match actual file names (carried from m98)

## Acceptance Criteria
- Architecture match ≥ 90%
- All "missing" gaps in architecture.json resolved
- All "partial" major gaps in architecture.json resolved
- VISION.md directory tree matches actual codebase structure

## Tasks
1. task-1775854101228 — Document store/index.js (P0, architect)
2. task-1775854114383 — Document embed.js + adapters (P0, architect)
3. task-1775854124115 — Document profiler, latency-log, sox, download-state (P1, architect)
4. task-1775847821786 — Update VISION.md directory tree (P0, architect)
