# Design: Docker build and docker-compose end-to-end verification

## Goal
Verify `docker build` succeeds and `docker-compose up` starts the service on port 3000.

## Acceptance Criteria
- `docker build -t agentic-service .` exits 0
- `docker-compose up` starts and service responds on `http://localhost:3000/health`
- No missing COPY targets or broken entrypoints in Dockerfile

## Approach
1. Run `docker build` and assert exit code 0
2. Run `docker-compose up -d`, wait for health check, assert HTTP 200 on `/health`
3. Run `docker-compose down` to clean up

## Files
- `Dockerfile`
- `docker-compose.yml`
