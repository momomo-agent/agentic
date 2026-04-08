# M25 DBB — Gap Analysis Re-run & Score Correction

## Context
Gap analysis files (.team/gaps/prd.json, vision.json, architecture.json) were last generated on April 7 2026, before milestones m15-m24 completed. Many items marked "missing" or "partial" have since been implemented. This DBB defines verification criteria for the corrected gap analysis output.

---

## DBB-001: PRD §4 per-backend tests no longer "missing"
- Requirement: Task-1775613064143
- Given: gap analysis is re-run on the current codebase
- Expect: prd.json does not have any item with status "missing" referencing per-backend test suites
- Verify: The gap item "Complete per-backend test suites" is either "implemented" or removed

## DBB-002: PRD §4 cross-backend tests no longer "missing"
- Requirement: Task-1775613064143
- Given: gap analysis is re-run on the current codebase
- Expect: prd.json does not have any item with status "missing" referencing cross-backend consistency tests
- Verify: The gap item "Cross-backend consistency tests" is either "implemented" or removed

## DBB-003: PRD §4 edge case tests no longer "missing"
- Requirement: Task-1775613064143
- Given: gap analysis is re-run on the current codebase
- Expect: prd.json does not have any item with status "missing" referencing edge case tests (empty path, special chars, concurrent writes)
- Verify: The gap item "Edge case tests" is either "implemented" or removed

## DBB-004: PRD §5 README no longer "missing"
- Requirement: Task-1775613064143
- Given: gap analysis is re-run on the current codebase
- Expect: prd.json does not have any item with status "missing" referencing README with usage examples
- Verify: The gap item "README with usage examples" is either "implemented" or removed

## DBB-005: PRD §5 docs no longer "missing"
- Requirement: Task-1775613064143
- Given: gap analysis is re-run on the current codebase
- Expect: prd.json does not have any item with status "missing" referencing per-backend configuration docs or performance comparison table
- Verify: The gap item "Per-backend configuration docs" is either "implemented", "partial", or removed

## DBB-006: PRD match score ≥90%
- Requirement: Task-1775613064143
- Given: gap analysis is re-run on the current codebase
- Expect: prd.json `match` field is ≥ 90
- Verify: Read `.team/gaps/prd.json` and check `match` value

## DBB-007: Vision — SQLiteBackend in createBackend() no longer "missing"
- Requirement: Task-1775613064181
- Given: gap analysis is re-run on the current codebase
- Expect: vision.json does not have any item with status "missing" referencing SQLiteBackend in createBackend()
- Verify: The gap item about SQLiteBackend auto-selection is either "implemented" or removed

## DBB-008: Vision — batchGet/batchSet/scanStream no longer "partial"
- Requirement: Task-1775613064181
- Given: gap analysis is re-run on the current codebase
- Expect: vision.json does not have any item with status "partial" referencing batchGet/batchSet/scanStream not being exposed
- Verify: The gap item about batchGet/batchSet/scanStream exposure is either "implemented" or removed

## DBB-009: Vision match score ≥90%
- Requirement: Task-1775613064181
- Given: gap analysis is re-run on the current codebase
- Expect: vision.json `match` field is ≥ 90
- Verify: Read `.team/gaps/vision.json` and check `match` value

## DBB-010: Architecture — ARCHITECTURE.md no longer "missing"
- Requirement: Task-1775613064216
- Given: gap analysis is re-run on the current codebase
- Expect: architecture.json does not have any item with status "missing" stating ARCHITECTURE.md does not exist
- Verify: The gap item about ARCHITECTURE.md absence is either "implemented" or removed

## DBB-011: Architecture — OPFS empty-path validation no longer "missing"
- Requirement: Task-1775613064216
- Given: gap analysis is re-run on the current codebase
- Expect: architecture.json does not have any item with status "missing" referencing OPFSBackend missing empty-path validation
- Verify: The gap item about OPFS empty-path is either "implemented" or removed

## DBB-012: Architecture — cross-backend tests no longer "missing"
- Requirement: Task-1775613064216
- Given: gap analysis is re-run on the current codebase
- Expect: architecture.json does not have any item with status "missing" referencing no cross-backend consistency tests
- Verify: The gap item about cross-backend tests is either "implemented" or removed

## DBB-013: Architecture match score ≥90%
- Requirement: Task-1775613064216
- Given: gap analysis is re-run on the current codebase
- Expect: architecture.json `match` field is ≥ 90
- Verify: Read `.team/gaps/architecture.json` and check `match` value

## DBB-014: Gap analysis timestamps updated
- Requirement: Task-1775613064143
- Given: gap analysis is re-run
- Expect: prd.json, vision.json, and architecture.json all have `timestamp` values newer than 2026-04-07T17:14:12Z
- Verify: Read each file and compare `timestamp` to the old timestamp

## DBB-015: No stale "missing" items remain for completed work
- Requirement: Task-1775613064143
- Given: gap analysis is re-run on the current codebase
- Expect: no gap item across prd.json, vision.json, or architecture.json has status "missing" for work that demonstrably exists in the codebase (test files exist, README exists, ARCHITECTURE.md exists, SQLiteBackend in createBackend.ts)
- Verify: Cross-reference each "missing" item against actual file existence

## DBB-016: Overall score gate — Vision ≥90% AND PRD ≥90%
- Requirement: Overview goal
- Given: all three gap files are updated
- Expect: the minimum of vision.json `match` and prd.json `match` is ≥ 90
- Verify: Both `vision.json.match >= 90` AND `prd.json.match >= 90`

## DBB-017: Gap JSON structure validity
- Requirement: Task-1775613064143
- Given: gap analysis outputs are written
- Expect: prd.json, vision.json, and architecture.json are valid JSON with required fields: `match` (number), `timestamp` (ISO string), `gaps` (array of objects with `description` and `status`)
- Verify: Parse each file and validate schema
