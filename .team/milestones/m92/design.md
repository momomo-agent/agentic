# M92 Technical Design — Test Fix + PRD Closure

## Task 1: Fix stale agentic-sense mocks (task-1775581712916)
Fix test mocks so `AgenticSense` includes `init()`. Fix m87 async `createPipeline()`. Fix m77 inverted assertion.

## Task 2: Add Dockerfile + docker-compose.yml to root (task-1775581717200)
Copy/symlink from `install/` or create new files at project root referencing correct build context.

## Task 3: Add README.md to root (task-1775581724582)
Create `README.md` with npx quickstart, docker run command, and API endpoints table.

## Task 4: Verify test pass rate >=90% (task-1775581731172)
Run `npm test`, confirm >= 599/665 passing. Report exact counts.
