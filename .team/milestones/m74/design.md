# M74 Technical Design — Docker, SIGINT, Coverage, Setup

## 1. Docker Build & docker-compose (task-1775529630008)

**Files:** `install/Dockerfile`, `install/docker-compose.yml`

Dockerfile must:
- Use `node:20-alpine` base
- `COPY` source and run `npm ci --omit=dev`
- `EXPOSE 3000`
- `CMD ["node", "bin/agentic-service.js"]`

docker-compose.yml must map `ports: ["3000:3000"]`.

Verification: `docker build` exits 0; `docker-compose up -d` + `curl /api/status` returns 200.

---

## 2. SIGINT Graceful Drain (task-1775529637561)

**File:** `src/server/api.js`

```js
const server = app.listen(3000)
let draining = false

process.on('SIGINT', () => {
  draining = true
  server.close(() => process.exit(0))
})
```

`server.close()` stops accepting new connections but waits for in-flight requests to finish before calling the callback.

---

## 3. Coverage ≥98% (task-1775529637595)

**File:** `vitest.config.js`

```js
coverage: {
  provider: 'v8',
  thresholds: { lines: 98, branches: 98, functions: 98, statements: 98 }
}
```

Add `"test": "vitest run --coverage"` to `package.json` scripts so CI picks it up.

---

## 4. setup.sh Idempotency (task-1775529637624)

**File:** `install/setup.sh`

```bash
if command -v node &>/dev/null && node -e "process.exit(parseInt(process.versions.node)>=18?0:1)"; then
  echo "Node.js already installed, skipping"
else
  # install node
fi
```

All install steps guarded by existence checks so re-runs are safe.
