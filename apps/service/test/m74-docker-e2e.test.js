// M74 DBB: Docker build and docker-compose end-to-end verification
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

const DOCKER_IMAGE = 'agentic-service:test';
const COMPOSE_FILE = 'install/docker-compose.yml';
const DOCKERFILE = 'install/Dockerfile';
const TEST_TIMEOUT = 120000; // 2 minutes for Docker operations

describe('M74 DBB-001: Docker build succeeds', () => {
  it('Dockerfile exists', () => {
    expect(existsSync(DOCKERFILE)).toBe(true);
  });

  it('docker-compose.yml exists', () => {
    expect(existsSync(COMPOSE_FILE)).toBe(true);
  });

  it('docker build completes with exit code 0', () => {
    const buildCmd = `docker build -t ${DOCKER_IMAGE} -f ${DOCKERFILE} .`;
    expect(() => {
      execSync(buildCmd, { stdio: 'pipe', timeout: TEST_TIMEOUT });
    }).not.toThrow();
  }, TEST_TIMEOUT);

  it('built image exposes port 3000', () => {
    const inspectCmd = `docker inspect ${DOCKER_IMAGE} --format='{{json .Config.ExposedPorts}}'`;
    const output = execSync(inspectCmd, { encoding: 'utf8' });
    expect(output).toContain('3000/tcp');
  });
});

describe('M74 DBB-002: docker-compose up starts service', () => {
  beforeAll(() => {
    // Clean up any existing containers
    try {
      execSync('docker-compose -f install/docker-compose.yml down -v', { stdio: 'pipe' });
    } catch (e) {
      // Ignore if nothing to clean up
    }
  });

  afterAll(() => {
    // Clean up after tests
    try {
      execSync('docker-compose -f install/docker-compose.yml down -v', { stdio: 'pipe' });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  it('docker-compose up starts service on port 3000', async () => {
    // Start service in detached mode
    execSync('docker-compose -f install/docker-compose.yml up -d', {
      stdio: 'pipe',
      timeout: TEST_TIMEOUT
    });

    // Wait for service to be ready (max 30 seconds)
    let ready = false;
    for (let i = 0; i < 30; i++) {
      try {
        const response = await fetch('http://localhost:3000/api/status');
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

  it('service responds with 200 on /api/status', async () => {
    const response = await fetch('http://localhost:3000/api/status');
    expect(response.status).toBe(200);
  });

  it('service returns valid JSON from /api/status', async () => {
    const response = await fetch('http://localhost:3000/api/status');
    const data = await response.json();
    expect(data).toBeDefined();
    expect(typeof data).toBe('object');
  });

  it('container is running', () => {
    const psCmd = 'docker-compose -f install/docker-compose.yml ps --services --filter "status=running"';
    const output = execSync(psCmd, { encoding: 'utf8' });
    expect(output).toContain('agentic-service');
  });
});

describe('M74 DBB-003: Docker cleanup', () => {
  it('docker-compose down succeeds', () => {
    expect(() => {
      execSync('docker-compose -f install/docker-compose.yml down -v', { stdio: 'pipe' });
    }).not.toThrow();
  });
});
