/**
 * M103 DBB verification tests for engine health check + auto-degradation
 * Task: task-1775896028427
 * Covers: DBB-013, DBB-014, DBB-015, DBB-029, DBB-030
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// --- Unit tests for health.js ---

vi.mock('../src/engine/registry.js', () => ({
  getEngines: vi.fn(() => []),
  register: vi.fn(),
  unregister: vi.fn(),
  resolveModel: vi.fn(),
  discoverModels: vi.fn(),
  getEngine: vi.fn(),
  modelsForCapability: vi.fn(),
}));

import {
  startHealthCheck, stopHealthCheck,
  getEngineHealth, getAllHealth, isHealthy,
  onHealthChange, offHealthChange,
} from '../src/engine/health.js';
import { getEngines } from '../src/engine/registry.js';

describe('DBB-013: Engine health check detects down engine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stopHealthCheck();
  });
  afterEach(() => {
    stopHealthCheck();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('transitions from healthy to down and emits change event', async () => {
    const changeFn = vi.fn();
    onHealthChange(changeFn);

    // Start healthy
    getEngines.mockReturnValue([
      { id: 'ollama', status: () => Promise.resolve({ available: true }) },
    ]);
    startHealthCheck(1000);
    await vi.advanceTimersByTimeAsync(0);
    expect(getEngineHealth('ollama').status).toBe('healthy');

    // Engine goes down
    getEngines.mockReturnValue([
      { id: 'ollama', status: () => Promise.resolve({ available: false, error: 'connection refused' }) },
    ]);
    await vi.advanceTimersByTimeAsync(1000);

    expect(getEngineHealth('ollama').status).toBe('down');
    expect(getEngineHealth('ollama').error).toBe('connection refused');
    expect(changeFn).toHaveBeenCalledWith({
      engineId: 'ollama',
      prev: 'healthy',
      next: 'down',
    });

    offHealthChange(changeFn);
  });

  it('handles timeout (>5s) as down', async () => {
    getEngines.mockReturnValue([
      {
        id: 'slow-engine',
        status: () => new Promise(() => {}), // never resolves
      },
    ]);

    startHealthCheck(60_000);
    // Advance past the 5s timeout in checkAll
    await vi.advanceTimersByTimeAsync(6000);

    expect(isHealthy('slow-engine')).toBe(false);
    expect(getEngineHealth('slow-engine').error).toBe('health check timeout');
  });

  it('recovers from down to healthy', async () => {
    const changeFn = vi.fn();
    onHealthChange(changeFn);

    // Start down
    getEngines.mockReturnValue([
      { id: 'ollama', status: () => Promise.resolve({ available: false }) },
    ]);
    startHealthCheck(1000);
    await vi.advanceTimersByTimeAsync(0);
    expect(getEngineHealth('ollama').status).toBe('down');

    // Recover
    getEngines.mockReturnValue([
      { id: 'ollama', status: () => Promise.resolve({ available: true }) },
    ]);
    await vi.advanceTimersByTimeAsync(1000);

    expect(getEngineHealth('ollama').status).toBe('healthy');
    expect(changeFn).toHaveBeenCalledWith({
      engineId: 'ollama',
      prev: 'down',
      next: 'healthy',
    });

    offHealthChange(changeFn);
  });

  it('records latency for successful checks', async () => {
    getEngines.mockReturnValue([
      { id: 'eng', status: () => Promise.resolve({ available: true }) },
    ]);
    startHealthCheck(60_000);
    await vi.advanceTimersByTimeAsync(0);

    const h = getEngineHealth('eng');
    expect(h.latency).toBeTypeOf('number');
    expect(h.latency).toBeGreaterThanOrEqual(0);
  });

  it('sets latency to null on error', async () => {
    getEngines.mockReturnValue([
      { id: 'eng', status: () => Promise.reject(new Error('fail')) },
    ]);
    startHealthCheck(60_000);
    await vi.advanceTimersByTimeAsync(0);

    expect(getEngineHealth('eng').latency).toBeNull();
  });
});

describe('DBB-029: stopHealthCheck clears timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stopHealthCheck();
  });
  afterEach(() => {
    stopHealthCheck();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('no more check cycles run after stop', async () => {
    let checkCount = 0;
    getEngines.mockReturnValue([
      {
        id: 'counter',
        status: () => {
          checkCount++;
          return Promise.resolve({ available: true });
        },
      },
    ]);

    startHealthCheck(1000);
    await vi.advanceTimersByTimeAsync(0); // initial check
    const countAfterStart = checkCount;

    stopHealthCheck();
    await vi.advanceTimersByTimeAsync(5000); // 5 more intervals

    expect(checkCount).toBe(countAfterStart); // no additional checks
  });
});

// --- Integration test: /api/engines/health endpoint (DBB-015) ---

describe('DBB-015: GET /api/engines/health endpoint', () => {
  let server, baseUrl;

  // Need fresh mocks for the server tests
  vi.mock('../src/server/brain.js', () => ({ chat: vi.fn() }));
  vi.mock('../src/detector/hardware.js', () => ({
    detect: vi.fn().mockResolvedValue({ platform: 'darwin', arch: 'arm64', gpu: {}, memory: 16, cpu: {} }),
  }));
  vi.mock('../src/runtime/stt.js', () => ({ init: vi.fn(), transcribe: vi.fn() }));
  vi.mock('../src/runtime/tts.js', () => ({ init: vi.fn(), synthesize: vi.fn() }));

  beforeEach(async () => {
    vi.useRealTimers();
    vi.resetAllMocks();
    const { chat } = await import('../src/server/brain.js');
    chat.mockImplementation(async function* () {});
    const { createApp } = await import('../src/server/api.js');
    await new Promise((resolve, reject) => {
      server = createApp().listen(0);
      server.once('listening', () => { baseUrl = `http://localhost:${server.address().port}`; resolve(); });
      server.once('error', reject);
    });
  });

  afterEach(() => new Promise(r => server.close(r)));

  it('returns JSON object from /api/engines/health', async () => {
    const res = await fetch(`${baseUrl}/api/engines/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body).toBe('object');
    // Body is an object keyed by engineId (may be empty in test env)
    expect(body).not.toBeNull();
  });

  it('DBB-030: /api/health returns nested components structure', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    // Must have components key, not flat
    expect(body).toHaveProperty('components');
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('uptime');
    expect(body).toHaveProperty('responseTime');
    // Components must be nested
    expect(body.components).toHaveProperty('ollama');
    expect(body.components).toHaveProperty('stt');
    expect(body.components).toHaveProperty('tts');
    // Must NOT have flat ollama/stt/tts at top level
    expect(body).not.toHaveProperty('ollama');
    expect(body).not.toHaveProperty('stt');
    expect(body).not.toHaveProperty('tts');
  });
});
