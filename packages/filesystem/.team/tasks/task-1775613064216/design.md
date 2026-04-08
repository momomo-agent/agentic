# Task Design: Update stale architecture.json gap file

## File to modify
- `.team/gaps/architecture.json`

## Logic

### Step 1: Read current architecture.json

### Step 2: Update each gap item

| Gap Item | Old Status | New Status | Verification |
|----------|-----------|------------|-------------|
| ARCHITECTURE.md does not exist | missing | implemented | ARCHITECTURE.md exists (75+ lines) |
| OPFSBackend stat() isDirectory | partial | implemented | src/backends/opfs.ts:187 — returns isDirectory for directories |
| OPFSBackend.delete() error handling | partial | implemented | src/backends/opfs.ts:79-90 — typed IOError throws |
| OPFSBackend.walkDir() error handling | partial | implemented | src/backends/opfs.ts:112 — graceful console.error + continue |
| AgenticStoreBackend.stat() mtime | partial | implemented | src/backends/agentic-store.ts:140 — real mtime via \x00mtime |
| OPFSBackend empty-path validation | missing | implemented | src/backends/opfs.ts:16 — throws IOError on empty path |
| No cross-backend tests | missing | implemented | 4 cross-backend test files exist |

### Step 3: Recalculate match score

After updates: all 10 items "implemented" → match = 100

### Step 4: Update timestamp to current ISO 8601

### Step 5: Write updated architecture.json

## Verification
- architecture.json.match >= 90 (expect 100)
- No "missing" items
- No "partial" items
- timestamp > 2026-04-07T17:08:59Z
- Valid JSON structure
