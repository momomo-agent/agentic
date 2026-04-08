# Task Design: Docker端到端验收 + setup.sh幂等性

## Files
- `install/Dockerfile` — verify build succeeds
- `install/docker-compose.yml` — verify compose up works
- `install/setup.sh` — add idempotency checks

## Docker Verification Steps
1. `docker build -t agentic-service .` → exit 0
2. `docker run -d -p 3000:3000 agentic-service`
3. `curl http://localhost:3000/api/health` → { status: 'ok' }

## setup.sh Idempotency Pattern
```bash
# Node.js check
if command -v node &>/dev/null; then
  echo "Node.js already installed: $(node -v)"
else
  # install node
fi

# Ollama check
if command -v ollama &>/dev/null; then
  echo "Ollama already installed"
else
  # install ollama
fi

# npm package check
if npm list -g agentic-service &>/dev/null; then
  echo "agentic-service already installed"
else
  npm install -g agentic-service
fi
```

## Edge Cases
- Docker port 3000 already in use → use -p 3001:3000 for test
- setup.sh run as non-root → use sudo only when needed
- Dockerfile COPY fails if src/ missing → ensure .dockerignore correct

## Test Cases
1. docker build → exit 0
2. docker run → /api/health returns 200
3. setup.sh run twice → second run exits 0, no duplicate installs
