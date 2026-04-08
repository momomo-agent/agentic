# Design: Docker end-to-end build verification

## Files to verify/fix
- `install/Dockerfile`
- `install/docker-compose.yml`

## Verification steps
1. `docker build -f install/Dockerfile -t agentic-service-test .` → must exit 0
2. `docker run -d -p 3000:3000 --name ags-test agentic-service-test`
3. `curl -s http://localhost:3000/api/status` → must return HTTP 200
4. `docker stop ags-test && docker rm ags-test`

## Required Dockerfile fixes (if broken)
- Ensure `COPY` paths match actual directory structure
- Ensure `npm ci --omit=dev` runs successfully
- Add `HEALTHCHECK CMD curl -f http://localhost:3000/api/status || exit 1`
- Expose correct port: `EXPOSE 3000`

## Required docker-compose.yml fixes (if broken)
- `build: context: ..` with `dockerfile: install/Dockerfile`
- `ports: ["3000:3000"]`
- `environment: NODE_ENV=production`

## Edge cases
- Port 3000 already in use on host → use alternate port in test
- Ollama not available in container → service should start with cloud fallback

## Test cases
- `docker build` exits 0
- Container `/api/status` returns 200 within 10s of start
