# Task Design: Update VISION.md near-term roadmap

## Summary

Remove 4 "Near-Term Roadmap" items from VISION.md that are already implemented, and update the line count reference from ~950 to ~978 lines.

## File to Modify

`VISION.md` — two edits required.

## Change 1: Update line count (line 41)

**Current**:
```
- **Single-file simplicity** — all shell logic in `src/index.ts` (~950 lines)
```

**Target**:
```
- **Single-file simplicity** — all shell logic in `src/index.ts` (~978 lines)
```

**Rationale**: `wc -l src/index.ts` reports 978 lines. The `~` prefix handles minor fluctuations.

## Change 2: Replace Near-Term Roadmap section (lines 46-51)

**Current**:
```markdown
## Near-Term Roadmap

- Recursive glob patterns (`**/*.ts`)
- Cross-environment consistency test suite
- Performance benchmarks for large file/directory operations
- Test coverage quality gate enforcement (≥80% statement / ≥75% branch)
```

**Target**: Either remove the section entirely or replace with genuinely unimplemented features.

**Verification that items are implemented**:

| Roadmap Item | Evidence |
|---|---|
| Recursive glob patterns (`**/*.ts`) | `src/index.ts:434` — `expandGlob()` handles `**` at line 438 |
| Cross-environment consistency test suite | `test/node-fs-integration.test.ts` exists with 21 passing tests |
| Performance benchmarks | Benchmark tests exist in `src/index.test.ts` |
| Test coverage quality gate | `vitest.config.ts` — thresholds `{statements: 80, branches: 75}` |

**Recommended replacement** — remove the section entirely since all items are done. If the PM wants to keep a roadmap section, populate it with genuinely unimplemented features from ARCHITECTURE.md "Future Enhancements" (e.g., background job control polish, syntax highlighting).

## Exact Edit Operations

### Edit 1: Line 41

- File: `VISION.md`
- Old: `~950 lines`
- New: `~978 lines`

### Edit 2: Lines 46-51

- File: `VISION.md`
- Old string (lines 46-51):
```
## Near-Term Roadmap

- Recursive glob patterns (`**/*.ts`)
- Cross-environment consistency test suite
- Performance benchmarks for large file/directory operations
- Test coverage quality gate enforcement (≥80% statement / ≥75% branch)
```
- New string: (empty — remove section entirely)

## Edge Cases

- None. This is a documentation-only change.

## Dependencies

- Blocked by `task-1775623204028` (ARCHITECTURE.md update) — must not contradict ARCHITECTURE.md changes.
- No other task depends on this change.

## Verification

1. `grep "~950" VISION.md` returns no match (old line count removed)
2. `grep "~978" VISION.md` returns a match (new line count present)
3. `grep "Near-Term Roadmap" VISION.md` returns no match (section removed)
4. `grep "Recursive glob\|Cross-environment\|Performance benchmarks\|coverage quality gate" VISION.md` returns no match (roadmap items removed)
5. VISION.md still parses as valid markdown
