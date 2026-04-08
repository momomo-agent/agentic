# M92: Test Fix + PRD Closure — Stale Mocks, Docker, README

## Goals
1. Fix 86 failing tests caused by stale agentic-sense mocks and test bugs
2. Add Docker/docker-compose to project root (PRD missing gap)
3. Add README.md to project root (PRD missing gap)

## Scope
- Fix stale AgenticSense mocks across sense-pipeline, sense-m8, sense-detect-m10, sense-dbb001, sense.test.js
- Fix m87 async createPipeline() test bug
- Fix m77 inverted assertion on #agentic-sense import map
- Fix m84 mock missing init() method
- Create Dockerfile + docker-compose.yml in project root
- Create README.md with npx/Docker/API docs

## Acceptance Criteria
- Test pass rate >=90% (>=599/665)
- `docker build` succeeds from project root
- README.md present with install + usage instructions

## Priority
P0 — blocks PRD match from 78% → 90%+
