# Design: Docker build and docker-compose end-to-end verification

## Files to check/modify
- `install/Dockerfile`
- `install/docker-compose.yml`

## Current Dockerfile issue
`COPY src/ui/admin/package*.json src/ui/admin/` runs before `COPY . .` — the admin build needs source files present. Fix order:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev
EXPOSE 3000
CMD ["node", "bin/agentic-service.js"]
```

## docker-compose.yml
Build context is `..` (project root) — correct. No changes needed.

## Test cases
- `docker build -f install/Dockerfile .` from project root exits 0
- `docker-compose -f install/docker-compose.yml up -d` starts container
- `curl http://localhost:3000/api/status` returns HTTP 200
