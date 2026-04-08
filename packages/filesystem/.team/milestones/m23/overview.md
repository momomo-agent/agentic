# Milestone m23: PRD Gap Closure — stat() Permissions, OPFS walkDir & Architecture Doc

## Goal
Close the final PRD and architecture gaps to push PRD match from ~87% (after m20-m22) toward ≥90% and architecture match from ~85% toward ≥90%.

## Scope
This milestone targets 3 remaining gaps that are not covered by active milestones m20-m22:

### 1. Expose permissions field in stat() result (PRD §2)
- **Gap**: "permissions field not exposed in stat result" — partial
- **Task**: task-1775608676284
- Add `permissions` to StatResult type and return from all 6 backends

### 2. Fix OPFSBackend walkDir() graceful error handling (PRD §1)
- **Gap**: "OPFS walkDir error handling — throws on error instead of gracefully skipping bad entries" — partial
- **Task**: task-1775608676626
- walkDir() should catch per-entry errors and continue iteration

### 3. Create ARCHITECTURE.md (Architecture)
- **Gap**: "ARCHITECTURE.md does not exist" — missing
- **Task**: task-1775608676787
- Formal architecture document covering StorageBackend contract, backend selection flow, error hierarchy, etc.

## Dependencies
- m22 should complete first (OPFS fixes and cross-backend tests may affect walkDir implementation)
- m20 streaming verification may influence walkDir approach

## Acceptance Criteria
- [ ] stat() returns permissions field on all 6 backends
- [ ] OPFS walkDir() gracefully skips inaccessible entries
- [ ] ARCHITECTURE.md exists at project root with complete system design documentation
- [ ] All tests pass after changes
