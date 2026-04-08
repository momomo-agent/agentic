# Test Result: Docker build and docker-compose end-to-end verification (tester re-run, 2026-04-07T14:40Z)

## Status: BLOCKED ❌

## Test Summary
- Total Tests: 4
- Passed: 1
- Failed: 3

## Test Results

### ✅ Passed
1. vendor/*.tgz files exist (agentic-embed, agentic-sense, agentic-store, agentic-voice) — npm 404 issue resolved

### ❌ Failed

#### 1. Docker build fails — Dockerfile COPY order bug
**Command**: `docker build -f install/Dockerfile .`
**Error**:
```
Could not resolve entry module "index.html".
ERROR: process "/bin/sh -c npm ci && npm run build && npm prune --omit=dev" exit code: 1
```
**Root Cause**: `install/Dockerfile` runs `npm run build` (vite build in `src/ui/admin/`) BEFORE `COPY . .`. The `index.html` entry point is not present at build time.

**Fix Required** in `install/Dockerfile`: move `COPY . .` before the `RUN` step:
```dockerfile
COPY package*.json ./
COPY vendor/ ./vendor/
COPY . .
RUN npm ci && npm run build && npm prune --omit=dev
```

#### 2. docker-compose.yml missing Dockerfile path
**Current**: `build: ..` (looks for `Dockerfile` in parent dir, not found)
**Fix Required**:
```yaml
build:
  context: ..
  dockerfile: install/Dockerfile
```

#### 3. Service health check — BLOCKED (cascading)
Cannot test `/api/status` because image build fails.

## DBB Criteria (m86)
- ❌ `docker build -f install/Dockerfile .` exits 0 — FAILED (COPY order bug)
- ❌ `docker-compose up` starts service on port 3000 — BLOCKED
- ❌ `curl http://localhost:3000/api/status` returns 200 — BLOCKED
- ✅ No npm 404 errors for agentic-* packages — PASSED

## Bugs for Developer
1. `install/Dockerfile`: move `COPY . .` before `RUN npm ci && npm run build`
2. `install/docker-compose.yml`: add `dockerfile: install/Dockerfile` to build spec
