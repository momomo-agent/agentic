# M84: Architecture Package Compliance — External Package Verification

## Goals
Wire external package dependencies as specified in ARCHITECTURE.md and verify entrypoints.

## Current State (2026-04-07T05:36)
- task-1775536622791 in review (tester-2) — awaiting tester approval
- task-1775538907396 unblocked P0 — developer to pick up immediately
- task-1775536619023 blocked by task-1775538907396
- task-1775536627468, task-1775536700459, task-1775536706050 todo

## Tasks

| Task | Title | Priority | Assignee | Status |
|------|-------|----------|----------|--------|
| task-1775538907396 | Add agentic-store to package.json dependencies | P0 | developer | todo |
| task-1775536619023 | Wire agentic-store as external package | P0 | developer | todo (blocked by task-1775538907396) |
| task-1775536622791 | Wire agentic-voice as external package | P0 | tester-2 | review |
| task-1775536627468 | Wire agentic-sense as external package | P0 | tech_lead | todo |
| task-1775536700459 | Verify and fix npx bin entrypoint | P1 | tech_lead-2 | todo |
| task-1775536706050 | Verify CDN profiles.json fallback to default.json | P1 | tech_lead-2 | todo |

## Priority Order
1. task-1775538907396 (developer) — unblocked P0, start now
2. task-1775536622791 (tester-2) — needs review completion
3. task-1775536627468 (tech_lead) — parallel P0
4. task-1775536619023 (developer) — after task-1775538907396
5. task-1775536700459, task-1775536706050 (tech_lead-2) — P1 after above

## Acceptance Criteria
- agentic-store, agentic-voice, agentic-sense installed and wired
- Local stubs replaced with package imports
- Tests pass with external package integration
- Architecture gap match increases from 78% to >=90%
