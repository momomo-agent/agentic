# M48 Technical Design: Docker + Test Coverage + SIGINT + setup.sh + Ollama Fallback

## Task 1: Docker verification (task-1775524071620)

**Files:** `install/Dockerfile`, `install/docker-compose.yml`

- Dockerfile must: COPY src/ and package.json, run `npm ci`, expose port 3000, CMD `node bin/agentic-service.js`
- docker-compose.yml must: define service with `build: .`, port `3000:3000`, healthcheck on `/api/status`
- Fix any missing COPY or CMD issues found during verification

## Task 2: Test coverage threshold (task-1775524078711)

**File:** `package.json` (vitest/jest config)

- Add `coverageThreshold: { global: { lines: 98, branches: 98 } }` to test config
- Run coverage, identify uncovered paths, add minimal tests to reach threshold

## Task 3: SIGINT graceful drain (task-1775524084592)

**File:** `bin/agentic-service.js`

```js
process.on('SIGINT', async () => {
  server.close()          // stop accepting new connections
  await drainRequests()   // wait for in-flight to finish (max 10s timeout)
  process.exit(0)
})
```

- Track in-flight count in `src/server/api.js` via middleware increment/decrement
- `drainRequests()` polls count === 0 with 100ms interval, 10s max

## Task 4: setup.sh idempotency (task-1775524084623)

**File:** `install/setup.sh`

- Check Node.js version with `node --version` before installing
- Guard each install step with existence checks (`command -v`, `[ -f ]`)
- Exit 0 if all deps already present

## Task 5: Ollama non-200 fallback (task-1775524084653)

**File:** `src/runtime/llm.js`

- In Ollama fetch block: if `response.status !== 200`, throw immediately
- Catch block routes to cloud fallback — do not fall through silently
- Edge case: network timeout also triggers fallback
