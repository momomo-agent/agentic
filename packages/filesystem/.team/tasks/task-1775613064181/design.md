# Task Design: Update stale vision.json gap file

## File to modify
- `.team/gaps/vision.json`

## Logic

### Step 1: Read current vision.json

### Step 2: Update each gap item

| Gap Item | Old Status | New Status | Verification |
|----------|-----------|------------|-------------|
| AgenticStoreBackend stat() mtime | partial | implemented | src/backends/agentic-store.ts:140 — stores real mtime via \x00mtime key suffix |
| OPFSBackend stat() isDirectory | partial | implemented | src/backends/opfs.ts:187 — returns isDirectory: true for directories |
| SQLiteBackend in createBackend() | missing | implemented | src/index.ts:30-52 — createBackend() includes sqliteDb option |
| batchGet/batchSet/scanStream exposure | partial | implemented | src/filesystem.ts:210-229 — public methods + executeTool() dispatch |

### Step 3: Recalculate match score

After updates: all 9 items "implemented" → match = 100

### Step 4: Update timestamp to current ISO 8601

### Step 5: Write updated vision.json

## Verification
- vision.json.match >= 90 (expect 100)
- No "missing" items
- No "partial" items
- timestamp > 2026-04-07T17:13:27Z
- Valid JSON structure
