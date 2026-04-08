# Design: Docker End-to-End Build Verification

## Files
- `install/Dockerfile`
- `install/docker-compose.yml`

## Verification Steps
1. `docker-compose -f install/docker-compose.yml up --build`
2. Wait for healthy state
3. `curl http://localhost:3000/api/status` → 200

## Fix Patterns
- Missing COPY: add `COPY src/ src/`
- Missing deps: ensure `RUN npm ci --omit=dev`
- Health check: `HEALTHCHECK CMD curl -f http://localhost:3000/api/status || exit 1`
