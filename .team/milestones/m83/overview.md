# M83: Test Suite Repair — Fix 119 Failing Tests

## Goal
Repair the failing test suite to reach >=98% coverage threshold required by DBB compliance.

## Current State (2026-04-07T10:26)
- 3 tasks done, 1 todo unblocked (task-1775538907092), 1 todo blocked, 1 blocked
- task-1775538907092 assigned to tech_lead-1 (P0, unblocked — critical path)
- task-1775535887205 blocked by task-1775538907092 (TTS import paths must land first)

## Tasks

| Task | Title | Priority | Assignee | Status |
|------|-------|----------|----------|--------|
| task-1775538907092 | Fix TTS import paths to use package.json imports map | P0 | tech_lead-1 | todo |
| task-1775535887205 | Fix TTS runtime test setup — add missing init() call | P0 | tester-1 | todo (blocked by task-1775538907092) |
| task-1775535895960 | Fix mocked module initialization across failing test files | P0 | tester-1 | blocked (blocked by task-1775538907092) |
| task-1775535895843 | Fix WebSocket disconnect — remove device from registry | P0 | done | done |
| task-1775535895884 | Fix org name mismatch in DBB tests (momo-ai vs momomo) | P0 | done | done |
| task-1775535895922 | Fix VAD callback signature mismatch (onStart is not a function) | P0 | done | done |

## Blockers
- task-1775535887205 blocked by task-1775538907092
- task-1775535895960 blocked by task-1775538907092

## Next Action
tech_lead-1: pick up task-1775538907092 immediately (unblocked P0) — fixes TTS import paths, unblocks 2 downstream tasks

## Acceptance Criteria
- All 5 root-cause categories fixed
- Test pass rate >=98%
- Coverage threshold enforced in vitest config
