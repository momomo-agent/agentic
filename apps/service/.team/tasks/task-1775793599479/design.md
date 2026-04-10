# Task Design: Fix Docker port mismatch + OLLAMA_HOST + data volume

**Module:** Server（HTTP/WebSocket） — deployment config
**Task:** task-1775793599479

## Problem

- `bin/agentic-service.js` defaults to port 1234
- Root `docker-compose.yml` maps port 3000:3000 — container won't be reachable
- Root `docker-compose.yml` missing `OLLAMA_HOST` env var — containerized service can't reach host Ollama
- Root `docker-compose.yml` missing `./data` volume mount — no persistent storage
- `install/docker-compose.yml` also uses port 3000

## Files to Modify

1. `docker-compose.yml` (root) — VERIFIED exists, currently maps 3000:3000
2. `install/docker-compose.yml` — VERIFIED exists, currently maps 3000:3000

## Implementation Plan

### 1. Root docker-compose.yml

```yaml
services:
  agentic-service:
    build: .
    ports:
      - "1234:1234"
    environment:
      - NODE_ENV=production
      - OLLAMA_HOST=http://host.docker.internal:11434
    volumes:
      - ./data:/app/data
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:1234/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"]
      interval: 10s
      timeout: 5s
      retries: 3
```

### 2. install/docker-compose.yml

```yaml
services:
  agentic-service:
    build: ..
    ports:
      - "1234:1234"
    environment:
      - OLLAMA_HOST=http://host.docker.internal:11434
    volumes:
      - config:/root/.agentic-service
      - ./data:/app/data
    restart: unless-stopped

volumes:
  config:
```

## Test Cases

1. `grep '1234' docker-compose.yml` → matches port mapping
2. `grep 'OLLAMA_HOST' docker-compose.yml` → matches env var
3. `grep './data' docker-compose.yml` → matches volume mount
4. Same checks for `install/docker-compose.yml`
5. No remaining references to port 3000 in either file

## ⚠️ Unverified Assumptions

- `host.docker.internal` works on Linux Docker (it does on Docker Desktop for Mac/Windows; on Linux it requires `--add-host` or Docker 20.10+). Developer should add a comment noting this.
