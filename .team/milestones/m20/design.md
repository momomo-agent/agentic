# Milestone 20 Technical Design

## Overview

Milestone 20 closes remaining PRD gaps: documentation (PRD §5), edge case test coverage (PRD §4), and streaming scan() verification (PRD §1). This milestone is documentation and test-only — no source code changes to production files.

## 1. README Documentation (task-1775587252443)

**Goal:** PRD §5 — README with usage examples, per-backend configuration docs, and performance comparison table.

**Current state:** `README.md` already exists at project root with extensive content (263 lines). It includes:
- Quick start with MemoryStorage
- All 6 backend examples with constructor/import
- Performance comparison table
- Browser support matrix
- Storage limits table
- Agent tool integration example
- Semantic search example
- Custom backend example
- Streaming scan example
- Directory tree example
- Permissions example
- Symlink behavior docs
- Architecture diagram

**Approach:**
- Audit existing README against PRD §5 requirements
- Verify `createBackend()` auto-selection is documented (currently not in README — only in ARCHITECTURE.md)
- Verify all 6 backends have constructor examples with configuration options
- Verify performance table is complete
- Verify StorageBackend interface documentation includes `scanStream`, `batchGet`, `batchSet`, `stat`
- Add missing sections if any, no source code changes

**Files:** `README.md` (modify)

## 2. Edge Case Tests (task-1775587252529)

**Goal:** PRD §4 — Edge case tests for empty path, special chars, concurrent writes.

**Current state:** `test/edge-cases.test.js` already exists (147 lines) with:
- Special character filenames (spaces, unicode)
- Newline in content
- Overwrite
- Concurrent writes same key
- Concurrent independent writes
- Scan multiline
- List after delete
- Empty path `set` rejection
- Empty path `get` returns null
- Concurrent writes 10+ files

**Approach:**
- Audit existing tests against PRD §4 requirements
- Add missing empty path tests: `delete('')`, `list('')`, `scan('')`
- Add missing special chars: dots (`/.hidden`, `/file.with.dots`)
- Strengthen concurrent write test: verify exactly one value wins (currently `val === '1' || val === '2'`)
- All tests use existing `makeBackends()` factory
- All 5 Node.js-testable backends in each test

**Files:** `test/edge-cases.test.js` (modify)

## 3. AgenticStoreBackend Scan Streaming Verification (task-1775587252582)

**Goal:** PRD §1 — Verify AgenticStoreBackend.scan()/scanStream() streams properly.

**Current state:** `src/backends/agentic-store.ts` lines 100-121:
- `scanStream()` iterates per-key via `store.keys()`, fetches one value at a time with `store.get(key)`, splits lines, yields matches
- `scan()` delegates to `scanStream()` collecting results
- This is already per-key lazy iteration — acceptable for key-value stores without cursor API

**Verification approach:**
- Create `test/scan-streaming-verify.test.js`
- Lazy test: instrument store.get(), break after first result, confirm only 1-2 get calls
- Memory test: create >1MB file content, run scanStream, compare heap before/after
- Regression: confirm scan() == scanStream() results
- Meta key filtering: confirm \x00mtime keys excluded
- Document findings in test output

**Files:** `test/scan-streaming-verify.test.js` (create)

## 4. OPFSBackend Scan Streaming Verification (task-1775587252636)

**Goal:** PRD §1 — Verify OPFSBackend.scan()/scanStream() uses true streaming.

**Current state:** `src/backends/opfs.ts` lines 135-170:
- `scanStream()` uses `fh.getFile().stream().pipeThrough(new TextDecoderStream()).getReader()`
- Reads chunks, splits by `\n`, handles remainder for chunk boundary patterns
- This IS true streaming — does not load entire file into memory

**Verification approach:**
- Create `test/opfs-scan-streaming-verify.test.js`
- OPFS requires browser — Node.js tests use mock/stub approach
- Chunk boundary test: verify pattern split across chunk boundary is detected
- Line counting test: verify line numbers are correct across chunk boundaries
- Create browser verification test stub
- Document findings confirming true streaming via File.stream() API

**Files:** `test/opfs-scan-streaming-verify.test.js` (create)

## Dependencies

- task-1775587252582 (AgenticStore scan verify) and task-1775587252636 (OPFS scan verify) are independent
- task-1775587252529 (edge cases) is independent
- task-1775587252443 (README) is independent
- All 4 tasks can run in parallel
- Blocked by m19 completion (which adds scan streaming and error standardization)
