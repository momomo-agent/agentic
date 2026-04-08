# Task Design: Clean Stale CR Content + Add Missing Sections

## Objective

Remove stale CR text from ARCHITECTURE.md (lines 191+) and add missing module documentation sections. Target: architecture match score 88% → 90%+.

## Files to Modify
- `ARCHITECTURE.md` — remove stale lines 191-251, append new module sections

## Current State

Lines 191-251 contain ~60 lines of stale CR (change request) text — raw JSON blocks, repeated "Add sections to ARCHITECTURE.md" instructions, and duplicate proposals. This is not valid documentation.

Sections 5-8 already exist (lines 157-189) and must NOT be removed:
- Section 5: Tunnel (LAN/WAN Exposure)
- Section 6: CLI Module
- Section 7: HTTPS & Middleware
- Section 8: VAD (Voice Activity Detection)

## Step 1: Remove Stale Content

Delete everything from line 191 to EOF. The boundary line starts with `Add sections to ARCHITECTURE.md documenting:`.

## Step 2: Append New Sections

After existing Section 8 (line 189), append:

### Section 9: agentic-embed (Vector Embedding)

```markdown
## 9. agentic-embed (Vector Embedding)

```javascript
// src/runtime/embed.js — wraps agentic-embed package
embed(text: string) → Promise<number[]>  // bge-m3 vector embedding
// Throws TypeError if text is not a string
// Returns empty array for empty string
// Used by memory.js for semantic search / retrieval

// src/runtime/adapters/embed.js — adapter wrapping agentic-embed package
// Stub: throws 'agentic-embed: not implemented' until package wired
```
```

### Section 10: Profiler & Latency Logging

```markdown
## 10. Profiler & Latency Logging

```javascript
// src/runtime/profiler.js
startMark(label: string) → void
endMark(label: string) → number          // returns elapsed ms
getMetrics() → { [stage: string]: { avg: number, count: number } }
measurePipeline(stages: Array<{ durationMs: number }>) → { stages, total, pass: boolean }
// pass = true when total < 2000ms (latency budget enforcement)

// src/runtime/latency-log.js
record(stage: string, ms: number) → void
p95(stage: string) → number | null       // 95th percentile latency
reset() → void
```
```

### Section 13: Store (KV Storage)

```markdown
## 13. Store (KV Storage)

```javascript
// src/store/index.js — backed by agentic-store
get(key: string) → Promise<string | null>
set(key: string, value: string) → Promise<void>
del(key: string) → Promise<void>         // alias: delete()
// Data stored at ~/.agentic-service/store.db
// Values are JSON-serialized
```
```

Note: Sections 11-12 already exist as Section 6 (CLI) and Section 7 (HTTPS) in the document. Section numbers in the new additions skip to 9, 10, 13 because the existing tunnel (5), CLI (6), HTTPS (7), and VAD (8) are already documented.

**Correction on numbering:** Since existing sections 5-8 cover Tunnel, CLI, HTTPS/Middleware, and VAD, the new sections should be numbered sequentially:

- Section 9: agentic-embed
- Section 10: Profiler & Latency Logging
- Section 11: Store (KV Storage)

## Implementation Steps

1. Read ARCHITECTURE.md, identify line 191 (first stale CR line matching `Add sections to ARCHITECTURE.md`)
2. Delete from line 191 to EOF
3. Append sections 9, 10, 11 after line 189
4. Verify no duplicate sections exist
5. Verify file ends cleanly

## Edge Cases
- The stale content is highly repetitive (same CR content copy-pasted ~10 times) — delete ALL of it
- Do NOT touch sections 5-8 (lines 157-189) — these are valid documentation
- If sections 9-11 already exist earlier (unlikely but possible), do not duplicate — skip the task or note the conflict
- The `store/index.js` uses `del()` with `delete()` alias — document both

## Verification
```bash
# No stale CR content
grep -c "Add sections to" ARCHITECTURE.md          # must return 0
grep -c "proposedChange" ARCHITECTURE.md            # must return 0
grep -c "CR" ARCHITECTURE.md | head -5              # no CR references

# All sections present
grep "^## " ARCHITECTURE.md                          # should show sections 1-11

# File is shorter (stale content removed)
wc -l ARCHITECTURE.md                                # compare with pre-edit
```

## Dependencies
- Ideally after task-1775612739548 (directory tree update), since both edit ARCHITECTURE.md
- Non-overlapping line ranges allow parallel execution: task-1775612739548 edits lines 121-155, this task edits lines 191+
