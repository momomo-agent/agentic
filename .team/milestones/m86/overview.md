# M86: Docker Fix — npm Package Resolution for agentic-* deps

## Goal
Fix Docker build failure caused by agentic-embed, agentic-sense, agentic-store, agentic-voice not existing in the npm registry.

## Problem
`docker build` fails at `npm install` because these packages are listed as real npm dependencies but are private/local packages not published to the registry.

## Acceptance Criteria
- `docker build` completes successfully
- `docker-compose up` starts the service on port 3000
- task-1775529630008 unblocked and verified passing

## Approach Options (for developer)
1. Replace npm deps with local path references or workspace links
2. Use `npm pack` + COPY in Dockerfile to bundle local packages
3. Mock/stub the packages in Docker context if they are dev-only
