# M74: DBB Compliance — Docker, SIGINT, Coverage, Setup

## Goal
Close remaining partial DBB gaps: Docker end-to-end, SIGINT graceful drain, test coverage threshold, setup.sh idempotency.

## Current State (2026-04-07T05:33)
- task-1775529630008: Docker verification — in-progress
- task-1775529637561: SIGINT graceful drain — done
- task-1775529637595: Test coverage threshold — done
- task-1775529637624: setup.sh idempotency — done
- task-1775539931917: Fix optimizer.js hardware-adaptive config — todo (P1)

## Status: Waiting on Docker task and optimizer fix to complete

## Acceptance Criteria
- docker build succeeds and docker-compose up starts service on port 3000
- SIGINT during active request completes the request before exit
- vitest --coverage fails when coverage < 98%
- setup.sh re-run on existing install produces no errors or duplicate side effects
