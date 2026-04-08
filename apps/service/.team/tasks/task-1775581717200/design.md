# Design: Add Dockerfile and docker-compose.yml to project root

## Files to create
- `Dockerfile` (project root)
- `docker-compose.yml` (project root)

## Dockerfile (project root)
Copy from `install/Dockerfile` — it already has the correct content:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY vendor/ ./vendor/
COPY src/ui/admin/package*.json src/ui/admin/
RUN npm ci && npm run build && npm prune --omit=dev
COPY . .
EXPOSE 3000
CMD ["node", "bin/agentic-service.js"]
```

## docker-compose.yml (project root)
`install/docker-compose.yml` uses `build: ..` (parent dir). Root version uses `build: .`:
```yaml
services:
  agentic-service:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - config:/root/.agentic-service
    restart: unless-stopped

volumes:
  config:
```

## Edge cases
- Do not delete `install/` files — keep both
- Root `docker-compose.yml` must use `build: .` not `build: ..`

## Test cases to verify
- `ls Dockerfile docker-compose.yml` — both exist
- `docker build -t agentic-service-test .` — exits 0
