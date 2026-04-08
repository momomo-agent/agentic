# Task: Verify Docker end-to-end build and run

## Objective
Run `docker-compose up` from `install/` directory and confirm `/api/status` returns 200. Document any build failures and fix Dockerfile or docker-compose.yml as needed.

## Files to Verify/Modify

### 1. `install/Dockerfile`

**Expected structure:**

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/status || exit 1

# Start service
CMD ["node", "bin/agentic-service.js"]
```

### 2. `install/docker-compose.yml`

**Expected structure:**

```yaml
version: '3.8'

services:
  agentic-service:
    build:
      context: ..
      dockerfile: install/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - OLLAMA_HOST=${OLLAMA_HOST:-http://host.docker.internal:11434}
    volumes:
      - agentic-data:/app/data
      - agentic-cache:/app/.cache
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/status"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  agentic-data:
  agentic-cache:
```

### 3. `src/server/api.js`

**Ensure /api/status endpoint exists:**

```javascript
// GET /api/status
app.get('/api/status', async (req, res) => {
  try {
    const status = {
      status: 'ok',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      hardware: await getHardwareStatus(),
      services: {
        llm: await checkLLMStatus(),
        stt: await checkSTTStatus(),
        tts: await checkTTSStatus()
      }
    };

    res.json(status);
  } catch (error) {
    console.error('[API] Status check failed:', error);
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

async function getHardwareStatus() {
  const hardware = await detect();
  return {
    platform: hardware.platform,
    arch: hardware.arch,
    gpu: hardware.gpu.type,
    memory: hardware.memory
  };
}

async function checkLLMStatus() {
  try {
    // Ping Ollama or configured LLM provider
    const response = await fetch('http://localhost:11434/api/tags');
    return { available: response.ok };
  } catch {
    return { available: false };
  }
}

async function checkSTTStatus() {
  return { available: true }; // Placeholder
}

async function checkTTSStatus() {
  return { available: true }; // Placeholder
}
```

### 4. `test/docker/docker.test.js`

**Create Docker verification test:**

```javascript
import { describe, it, expect } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('Docker Build and Run', () => {
  it('should build Docker image successfully', async () => {
    const { stdout, stderr } = await execAsync(
      'docker build -f install/Dockerfile -t agentic-service:test .',
      { cwd: process.cwd() }
    );

    expect(stderr).not.toContain('ERROR');
    expect(stdout).toContain('Successfully built');
  }, 120000); // 2 minute timeout

  it('should start container and respond to /api/status', async () => {
    // Start container
    await execAsync(
      'docker run -d --name agentic-test -p 3001:3000 agentic-service:test'
    );

    // Wait for startup
    await new Promise(resolve => setTimeout(resolve, 10000));

    try {
      // Check status endpoint
      const response = await fetch('http://localhost:3001/api/status');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
    } finally {
      // Cleanup
      await execAsync('docker stop agentic-test');
      await execAsync('docker rm agentic-test');
    }
  }, 60000);
});
```

## Verification Steps

### Manual Verification

1. **Build image:**
```bash
cd /Users/kenefe/LOCAL/momo-agent/projects/agentic-service
docker build -f install/Dockerfile -t agentic-service:local .
```

2. **Run with docker-compose:**
```bash
cd install
docker-compose up -d
```

3. **Check logs:**
```bash
docker-compose logs -f
```

4. **Test status endpoint:**
```bash
curl http://localhost:3000/api/status
# Expected: {"status":"ok",...}
```

5. **Verify health check:**
```bash
docker ps
# Check HEALTH column shows "healthy"
```

6. **Cleanup:**
```bash
docker-compose down -v
```

### Automated Verification

```bash
# Run Docker tests
npm test -- test/docker/docker.test.js

# Or use script
npm run test:docker
```

## Common Issues and Fixes

### Issue 1: Build fails with "Cannot find module"
**Fix:** Ensure all dependencies in package.json, check COPY commands

### Issue 2: Container exits immediately
**Fix:** Check CMD in Dockerfile, verify bin/agentic-service.js has shebang

### Issue 3: /api/status returns 404
**Fix:** Verify api.js has status endpoint, check server startup logs

### Issue 4: Health check fails
**Fix:** Increase start_period in healthcheck, verify curl is installed

### Issue 5: Cannot connect to Ollama
**Fix:** Set OLLAMA_HOST to host.docker.internal:11434 on Mac/Windows

### Issue 6: Permission denied errors
**Fix:** Run as non-root user in Dockerfile:
```dockerfile
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs
```

## Edge Cases

- **No Ollama installed:** Status should still return 200, services.llm.available=false
- **Low memory:** Container may be OOM killed, add memory limits
- **Port conflict:** Use different port mapping in docker-compose.yml
- **Volume permissions:** Ensure volumes are writable

## Error Handling

- Log all build errors to stderr
- Capture container logs for debugging
- Provide clear error messages in status endpoint
- Health check should fail gracefully

## Dependencies

- Docker 20.10+
- Docker Compose 2.0+
- curl (for health checks)

## Test Cases

1. **Build test:** Docker image builds without errors
2. **Run test:** Container starts and stays running
3. **Status test:** /api/status returns 200
4. **Health test:** Health check passes after startup
5. **Cleanup test:** docker-compose down removes all resources

## Documentation

Add to README.md:

```markdown
## Docker Deployment

### Quick Start

```bash
docker-compose -f install/docker-compose.yml up -d
```

### Build from Source

```bash
docker build -f install/Dockerfile -t agentic-service .
docker run -p 3000:3000 agentic-service
```

### Environment Variables

- `PORT`: Server port (default: 3000)
- `OLLAMA_HOST`: Ollama API endpoint
- `NODE_ENV`: Environment (production/development)

### Volumes

- `agentic-data`: Persistent data storage
- `agentic-cache`: Model and profile cache
```

## Verification Checklist

- [ ] Dockerfile builds without errors
- [ ] docker-compose up starts service
- [ ] Container stays running (not exiting)
- [ ] /api/status returns 200
- [ ] Health check shows "healthy"
- [ ] Logs show no critical errors
- [ ] Can access UI at http://localhost:3000
- [ ] docker-compose down cleans up properly
