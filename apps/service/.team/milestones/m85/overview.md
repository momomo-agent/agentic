# M85: Final Compliance — agentic-sense, Test Pass Rate, Architecture Docs

## Goals
- Wire agentic-sense as external package in package.json dependencies
- Push test pass rate from 81.7% to ≥90% (fix remaining ~120 failing tests)
- Document missing modules in ARCHITECTURE.md: tunnel, CLI, VAD, HTTPS/middleware

## Current State (2026-04-07T12:30)
- task-1775561920576: agentic-sense wiring — DONE
- task-1775561930545: Architecture docs — in REVIEW (waiting for tester)
- task-1775561925076: Test pass rate ≥90% — blocked by task-1775535895960 (M83)

## Status
1/3 tasks done, 1 in review, 1 blocked by M83

## Acceptance Criteria
- agentic-sense in package.json dependencies and import map ✓
- Test pass rate ≥90% (≥591/657) — pending M83 completion
- ARCHITECTURE.md covers: tunnel, CLI module, VAD, HTTPS/middleware layers — in review

## Blocked By
- task-1775561925076 blocked by task-1775535895960 (M83 mocked module fix must be approved first)
