# Task Design: Verify AgenticStore stat() mtime accuracy and OPFS stat() directory support

## Objective
Verify two Vision gaps: (1) AgenticStoreBackend.stat() mtime accuracy, (2) OPFSBackend.stat() directory detection. Update vision.json based on findings.

## Files to Modify
- `.team/gaps/vision.json` — update gap statuses and match score
- `.team/tasks/task-1775612569013/progress.md` — document findings

## Verification Steps

### Step 1: Check AgenticStoreBackend.stat() mtime
Read `src/backends/agentic-store.ts`, find the `stat()` method:
- Does mtime use `Date.now()` (current time) or a stored timestamp?
- Check if set() stores an mtime value (look for `\x00mtime` key pattern)
- If mtime is stored at write time and returned accurately → gap resolved
- If mtime is always `Date.now()` → gap remains "partial"

### Step 2: Check OPFSBackend.stat() directory detection
Read `src/backends/opfs.ts`, find the `stat()` method:
- Does it check if the path is a directory using OPFS API?
- Look for `getFileHandle()` vs `getDirectoryHandle()` logic
- If `isDirectory` is computed correctly → gap resolved
- If `isDirectory` always returns `false` → gap remains "partial"

### Step 3: Cross-reference with m22 fixes
Check if task-1775607509331 (OPFS stat() directory detection) from m22 already fixed this:
- Read m22 task progress files
- Check if OPFS stat() was modified

### Step 4: Update vision.json
Based on findings:
- If AgenticStore mtime is now accurate → update from "partial" to "implemented"
- If OPFS isDirectory is now correct → update from "partial" to "implemented"
- Recalculate match score

## Expected Outcome
- m22 task-1775607509331 should have fixed OPFS stat() directory detection → expect "implemented"
- AgenticStore mtime may still be approximate (Date.now()) → may remain "partial" unless m19 addressed it

## Edge Cases
- AgenticStore mtime being approximate (Date.now()) is acceptable for in-memory stores — "partial" is the correct status unless actual timestamps were added
- OPFS directories may have edge cases (root directory, nested) — check more than just the basic case
- vision.json match score uses different base than prd.json — recalculate independently
