# Add Dockerfile and docker-compose.yml to project root

## Progress

Both files already existed at project root. No changes needed.
- Dockerfile: node:20-slim, copies src/bin/profiles
- docker-compose.yml: build: ., port 3000, healthcheck
