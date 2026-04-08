# Design: Admin UI + Docker + setup.sh 端到端验收

## Files to Verify/Fix

- `src/server/api.js` — /admin route (already serves dist/admin)
- `install/Dockerfile` — build and run
- `install/setup.sh` — one-click install
- `src/ui/admin/` — admin SPA source

## Verification Steps

### 1. Admin UI Route (DBB-009)
`api.js` already has:
```js
r.use('/admin', express.static(adminDist));
r.get('/admin', (req, res) => res.sendFile(path.join(adminDist, 'index.html')));
```
- Verify `dist/admin/index.html` exists after `npm run build`
- If missing: run `npm run build` and confirm output in `dist/admin/`

### 2. Docker (DBB-010, DBB-011)
Current `install/Dockerfile`:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
CMD ["node", "bin/agentic-service.js"]
```
Issue: `dist/` may not exist at build time if not pre-built.
Fix if needed: add `RUN npm run build` before `npm ci --omit=dev` step, or ensure `dist/` is committed.

Verify:
```bash
docker build -f install/Dockerfile -t agentic-service-test .
docker run -p 3000:3000 agentic-service-test &
curl http://localhost:3000/health
```

### 3. setup.sh (DBB-012)
Current script checks Node >= 18, runs `npm install`, starts service.
Verify exits 0 in clean environment. Fix if `npm install` fails offline.

## Edge Cases
- `dist/admin` missing → build step must run before serving
- Docker COPY order: `COPY . .` copies dist if pre-built; add build step if not

## Test Cases
- GET /admin → HTTP 200, body contains HTML
- `docker build` exits 0
- `docker run` → GET /health returns 200
- `bash setup.sh` exits 0
