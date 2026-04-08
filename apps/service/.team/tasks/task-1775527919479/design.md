# Design: Docker build and docker-compose end-to-end verification

## Files
- `install/Dockerfile` — read and verify build steps
- `install/docker-compose.yml` — read and verify service config

## Verification Steps
1. Run `docker build -f install/Dockerfile -t agentic-service-test .`
2. Run `docker-compose -f install/docker-compose.yml up -d`
3. Run `curl http://localhost:3000/api/status` — expect 200

## Known Issue to Check
Dockerfile runs `npm run build` before `COPY . .` — UI source files not yet present.
Fix: move `COPY . .` before `RUN npm ci && npm run build && npm prune --omit=dev`.

## Corrected Dockerfile Order
```
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY src/ui/admin/package*.json src/ui/admin/
COPY . .
RUN npm ci && npm run build && npm prune --omit=dev
EXPOSE 3000
CMD ["node", "bin/agentic-service.js"]
```

## Edge Cases
- If `npm run build` is not defined in package.json, skip or add it
- docker-compose context path `..` must resolve to repo root

## Test Cases
- Docker build exits 0
- Container starts and `/api/status` returns `{"hardware":...}`
