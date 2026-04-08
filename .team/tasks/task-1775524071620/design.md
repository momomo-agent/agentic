# Docker Build + docker-compose End-to-End Verification

## Files to modify/verify
- `install/Dockerfile`
- `install/docker-compose.yml`

## Algorithm
1. Run `docker build -f install/Dockerfile -t agentic-service .` — must succeed
2. Run `docker-compose -f install/docker-compose.yml up -d`
3. `curl http://localhost:3000/api/status` → must return 200 with JSON
4. `docker-compose down`

## Fix criteria
- If build fails: fix `Dockerfile` (missing COPY, wrong base image, etc.)
- If `api/status` fails: check port mapping and service startup in `docker-compose.yml`

## Edge cases
- Ollama not available in container → service must start with cloud fallback
- Port 3000 already in use → document in README

## Test cases
- `docker build` exits 0
- `GET /api/status` returns `{ hardware, profile, devices }`
