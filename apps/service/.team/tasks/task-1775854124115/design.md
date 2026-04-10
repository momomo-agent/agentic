# Task Design: Document profiler.js, latency-log.js, sox.js, download-state.js in ARCHITECTURE.md

**Task:** task-1775854124115
**Modules:** Runtime §3 (ARCHITECTURE.md), CLI §7 (ARCHITECTURE.md), 性能监控 section
**Type:** Documentation only — no code changes

## Current State

ARCHITECTURE.md already documents all 4 modules:

### profiler.js — §3 Runtime (lines 284-288) + 性能監控 (lines 569-587)

Verified against source (src/runtime/profiler.js, 29 lines):
```javascript
const marks = new Map()                           // line 1 — active timers
const metrics = new Map()                         // line 2 — aggregated stats
export function startMark(label)                  // line 4 — marks.set(label, Date.now())
export function endMark(label)                    // line 8 — returns elapsed ms or null, updates metrics
export function getMetrics()                      // line 18 — { [stage]: { last, avg, count } }
export function measurePipeline(stages)           // line 26 — { stages, total, pass: total < 2000 }
```

| Aspect | ARCHITECTURE.md | Actual Source | Gap |
|--------|----------------|---------------|-----|
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

### §3 Runtime profiler signatures (lines 287-288) — NEEDS FIX

Lines 287-288 have inaccurate signatures that contradict both the actual source AND the later 性能監控 section (lines 577-578):

| Line | Current (wrong) | Correct |
|------|-----------------|---------|
| 287 | `getMetrics() → Map<label, { count, total, avg, min, max }>` | `getMetrics() → { [stage]: { last, avg, count } }` |
| 288 | `measurePipeline(stages) → Promise<{ results, total }>` | `measurePipeline(stages) → { stages, total, pass }` |

Also `endMark(label)` at line 286 returns `number | null`, not `void`.

Replace lines 284-288 with:
```
// runtime/profiler.js — 性能计时
startMark(label) → void                    // 记录开始时间戳
endMark(label) → number | null             // 返回耗时 ms，未找到 label 返回 null
getMetrics() → { [stage]: { last, avg, count } }  // 各阶段最近/平均/次数
measurePipeline(stages) → { stages, total, pass }  // pass = total < 2000ms
```

### §7 CLI + 性能監控 — No changes needed
sox.js, download-state.js (§7 lines 398-410) and 性能監控 section (lines 569-587) are already correct.

## Verification

Architect should:
1. Fix §3 lines 284-288 to match actual source signatures
2. Confirm §3 now matches 性能監控 section (lines 574-578)
3. Confirm §7 sox.js and download-state.js unchanged

## Assessment

3 of 4 modules are fully documented. profiler.js has a signature inconsistency in §3 that needs correction (the later 性能監控 section already has the right signatures).
