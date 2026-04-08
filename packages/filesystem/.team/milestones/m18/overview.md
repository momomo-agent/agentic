# Milestone 18: Test Fix, JSDoc Completeness & Public API Exposure

## Goal
Close remaining PRD and vision gaps to push match scores toward ≥90%.

## Scope
- Fix the 1 failing test (agentic-store-stat.test.ts import path issue)
- Add JSDoc to all backend class methods (PRD §5 gap: "backend class methods lack JSDoc")
- Expose batchGet/batchSet/scanStream as AgenticFileSystem public methods (vision gap: "implemented on backends but not exposed as AgenticFileSystem public methods")

## Acceptance Criteria
- [ ] All 483+ tests pass (0 failures)
- [ ] All backend classes have JSDoc on public methods (get, set, delete, list, scan, scanStream, batchGet, batchSet, stat)
- [ ] AgenticFileSystem exposes batchGet(), batchSet(), and scanStream() as public methods
- [ ] PRD match ≥ 90%
- [ ] Vision match ≥ 90%

## Dependencies
- None blocked by m17 (m17 has 2 tasks in review for testers)
