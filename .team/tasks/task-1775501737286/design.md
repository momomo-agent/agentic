# Design: Docker部署 — Dockerfile + docker-compose.yml

## Files to Create

- `install/Dockerfile`
- `install/docker-compose.yml`

## Dockerfile

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
CMD ["node", "bin/agentic-service.js"]
```

## docker-compose.yml

```yaml
services:
  agentic-service:
    build: ..
    ports:
      - "3000:3000"
    volumes:
      - config:/root/.agentic-service
    restart: unless-stopped

volumes:
  config:
```

## Edge Cases

- Volume mounts `~/.agentic-service` (CACHE_DIR in profiles.js) for config persistence across restarts
- `build: ..` points to repo root where package.json lives
- `--omit=dev` keeps image lean

## Test Cases (DBB)

- DBB-006: `docker-compose up` → `curl http://localhost:3000/health` returns 200
- DBB-007: restart container → config volume preserved, `/health` still 200
