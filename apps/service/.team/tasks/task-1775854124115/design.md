# Task Design: Document profiler.js, latency-log.js, sox.js, download-state.js in ARCHITECTURE.md

**Task:** task-1775854124115
**Modules:** Runtime §3 (ARCHITECTURE.md), CLI §7 (ARCHITECTURE.md), 性能监控 section
**Type:** Documentation only — no code changes

## Current State

ARCHITECTURE.md already documents all 4 modules:

### profiler.js — §3 Runtime (lines 284-288) + 性能監控 (lines 569-587)

| Aspect | ARCHITECTURE.md | Actual Source (30 lines) | Gap |
|--------|----------------|--------------------------|-----|
| `startMark(label)` | ✅ Documented | `marks.set(label, Date.now())` (line 5) | None |
| `endMark(label)` | ✅ Returns `number\|null` | Returns elapsed ms or null (line 8) | None |
| `getMetrics()` | ✅ `{ [stage]: { last, avg, count } }` | Same shape (line 18) | None |
| `measurePipeline(stages)` | ✅ `{ stages, total, pass }` | `pass: total < 2000` (line 28) | None |
| Internal storage | Not specified | Module-level `marks` Map + `metrics` Map | Minor |

### latency-log.js — §3 Runtime (lines 290-293) + 性能監控 (lines 580-583)

| Aspect | ARCHITECTURE.md | Actual Source (17 lines) | Gap |
|--------|----------------|--------------------------|-----|
| `record(stage, ms)` | ✅ Documented | Appends to `samples[stage]` + `console.log` (line 3) | None |
| `p95(stage)` | ✅ Returns number | Sorted array, 95th percentile (line 9) | None |
| `reset()` | ✅ Documented | Clears all keys from `samples` (line 15) | None |

### sox.js — §7 CLI (lines 405-410)

| Aspect | ARCHITECTURE.md | Actual Source (28 lines) | Gap |
|--------|----------------|--------------------------|-----|
| `ensureSox()` | ✅ Documented | Checks `which sox`, installs if missing (line 25) | None |
| darwin | `brew install sox` | Same (line 13) | None |
| linux | `apt-get/yum install sox` | Same (line 17) | None |
| win32 | Manual install note | `throw new Error(...)` (line 21) | None |

### download-state.js — §7 CLI (lines 398-403)

| Aspect | ARCHITECTURE.md | Actual Source (50 lines) | Gap |
|--------|----------------|--------------------------|-----|
| `getDownloadState()` | ✅ Returns shape documented | `{ inProgress, model, status, progress, total }` (line 32) | None |
| `setDownloadState(updates)` | ✅ `Object.assign + 写入文件` | Same (line 36) | None |
| `clearDownloadState()` | ✅ Documented | Resets fields + deletes file (line 41) | None |
| State file path | `~/.agentic-service/download-state.json` | Same (line 5) | None |
| Startup load | "启动时自动加载上次状态" | `try { if (fs.existsSync(STATE_FILE)) ... }` (line 17) | None |

## Recommended Changes

All 4 modules are already documented in ARCHITECTURE.md with accurate content. No changes needed.

## Verification

Architect should verify:
1. §3 Runtime section includes profiler.js and latency-log.js exports (lines 284-293)
2. 性能監控 section (lines 569-587) provides detailed flow description
3. §7 CLI section includes sox.js and download-state.js (lines 398-410)
4. All function signatures match actual source code

## Assessment

This gap is already closed. All 4 utility modules have formal documentation in ARCHITECTURE.md matching their actual source code. Architect should verify and mark task done.
