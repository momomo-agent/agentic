# Milestone 20: Documentation, Edge Case Tests & Streaming Verification

## Goal
Close remaining PRD gaps to push PRD match from ~72% toward ≥90%. Focus on documentation (PRD §5), edge case test coverage (PRD §4), and verification of streaming scan() implementations (PRD §1).

## Scope

### 1. README per-backend configuration docs completion (PRD §5)
- README.md already exists with usage examples, performance comparison table, and browser support matrix
- Remaining: add per-backend configuration documentation for LocalStorageBackend, SQLiteBackend, and MemoryBackend (currently only AgenticStoreBackend, OPFSBackend, NodeFsBackend have config snippets)
- No source code changes — documentation only

### 2. Edge case tests (PRD §4)
- Empty path handling across all backends (should throw IOError/NotFoundError)
- Special characters in filenames (spaces, unicode, dots)
- Concurrent write safety (two simultaneous sets to same path)
- Create test/edge-cases.test.js

### 3. Streaming scan() verification (PRD §1)
- Verify AgenticStoreBackend scan()/scanStream() streams instead of loading full content
- Verify OPFSBackend scan()/scanStream() streams instead of loading full content
- Compare memory usage with large files (>1MB)
- Document findings

## Dependencies
- Blocked by m19 completion (which adds scan streaming implementation and error standardization)
- Tasks within m20 are independent and can run in parallel

## Acceptance Criteria
- [ ] README has per-backend configuration docs for all 6 backends (currently 3 of 6 done)
- [ ] Performance comparison table included in README
- [ ] Edge case test file passes on all backends
- [ ] Scan streaming verified with documented memory usage comparison
- [ ] PRD match ≥ 90%

## Target Gaps
- PRD §1: scan() streaming verification
- PRD §4: Edge case tests (empty path, special chars, concurrent writes)
- PRD §5: README with usage examples
- PRD §5: Per-backend configuration docs and performance comparison table
