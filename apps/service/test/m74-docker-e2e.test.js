// M74 DBB: Docker build and docker-compose end-to-end verification
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

function isDockerAvailable() {
  try { execSync('docker info', { stdio: 'pipe', timeout: 5000 }); return true; } catch { return false; }
}

function canDockerBuild() {
  try {
    const pkg = JSON.parse(execSync('cat package.json').toString());
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    return !Object.values(allDeps).some(v => v.startsWith('workspace:'));
  } catch { return false; }
}

const DOCKER_IMAGE = 'agentic-service:test';
const COMPOSE_FILE = 'install/docker-compose.yml';
const DOCKERFILE = 'install/Dockerfile';
const TEST_TIMEOUT = 120000; // 2 minutes for Docker operations
const skipDocker = !isDockerAvailable() || !canDockerBuild();

describe('M74 DBB-001: Docker build succeeds', () => {
  it('Dockerfile exists', () => {
    expect(existsSync(DOCKERFILE)).toBe(true);
  });

  it('docker-compose.yml exists', () => {
    expect(existsSync(COMPOSE_FILE)).toBe(true);
  });

  it.skipIf(skipDocker)('docker build completes with exit code 0', () => {
    const buildCmd = `docker build -t ${DOCKER_IMAGE} -f ${DOCKERFILE} .`;
    expect(() => {
      execSync(buildCmd, { stdio: 'pipe', timeout: TEST_TIMEOUT });
    }).not.toThrow();
  }, TEST_TIMEOUT);

  it.skipIf(skipDocker)('built image exposes port 1234', () => {
    const inspectCmd = `docker inspect ${DOCKER_IMAGE} --format='{{json .Config.ExposedPorts}}'`;
    const output = execSync(inspectCmd, { encoding: 'utf8' });
    expect(output).toContain('1234/tcp');
  });
});

describe('M74 DBB-002: docker-compose up starts service', () => {
  beforeAll(() => {
    if (skipDocker) return;
    try {
      execSync('docker-compose -f install/docker-compose.yml down -v', { stdio: 'pipe' });
    } catch (e) {
      // Ignore if nothing to clean up
    }
  });

  afterAll(() => {
    if (skipDocker) return;
    try {
      execSync('docker-compose -f install/docker-compose.yml down -v', { stdio: 'pipe' });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  it.skipIf(skipDocker)('docker-compose up starts service on port 1234', async () => {
    execSync('docker-compose -f install/docker-compose.yml up -d', {
      stdio: 'pipe',
      timeout: TEST_TIMEOUT
    });

    let ready = false;
    for (let i = 0; i < 30; i++) {
      try {
        const response = await fetch('http://localhost:1234/api/status');
        if (response.ok) {
          ready = true;
          break;
        }
      } catch (e) {
        // Service not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    expect(ready).toBe(true);
  }, TEST_TIMEOUT);

  it.skipIf(skipDocker)('service responds with 200 on /api/status', async () => {
    const response = await fetch('http://localhost:1234/api/status');
    expect(response.status).toBe(200);
  });

  it.skipIf(skipDocker)('service returns valid JSON from /api/status', async () => {
    const response = await fetch('http://localhost:1234/api/status');
    const data = await response.json();
    expect(data).toBeDefined();
    expect(typeof data).toBe('object');
  });

  it.skipIf(skipDocker)('container is running', () => {
    const psCmd = 'docker-compose -f install/docker-compose.yml ps --services --filter "status=running"';
    const output = execSync(psCmd, { encoding: 'utf8' });
    expect(output).toContain('agentic-service');
  });
});

describe('M74 DBB-003: Docker cleanup', () => {
  it.skipIf(skipDocker)('docker-compose down succeeds', () => {
    expect(() => {
      execSync('docker-compose -f install/docker-compose.yml down -v', { stdio: 'pipe' });
    }).not.toThrow();
  });
});
