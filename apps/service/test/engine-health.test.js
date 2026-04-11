/**
 * Engine health check tests for task-1775896028427 (M103)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock registry before importing health
vi.mock('../src/engine/registry.js', () => ({
  getEngines: vi.fn(() => []),
}));

import {
  startHealthCheck, stopHealthCheck,
  getEngineHealth, getAllHealth, isHealthy,
  onHealthChange, offHealthChange,
} from '../src/engine/health.js';
import { getEngines } from '../src/engine/registry.js';

describe('engine/health.js', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stopHealthCheck();
  });

  afterEach(() => {
    stopHealthCheck();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('getEngineHealth returns default for unknown engine', () => {
    const h = getEngineHealth('nonexistent');
    expect(h).toEqual({ status: 'healthy', lastCheck: 0, error: null, latency: null });
  });

  it('isHealthy returns true by default (no entry)', () => {
    expect(isHealthy('unknown-engine')).toBe(true);
  });

  it('startHealthCheck runs initial check and populates state', async () => {
    getEngines.mockReturnValue([
      { id: 'test-engine', status: () => Promise.resolve({ available: true }) },
    ]);

    startHealthCheck(60_000);
    await vi.advanceTimersByTimeAsync(0); // flush microtasks

    const health = getEngineHealth('test-engine');
    expect(health.status).toBe('healthy');
    expect(health.lastCheck).toBeGreaterThan(0);
    expect(health.error).toBeNull();
  });

  it('isHealthy returns false when engine status().available = false', async () => {
    getEngines.mockReturnValue([
      { id: 'down-engine', status: () => Promise.resolve({ available: false, error: 'offline' }) },
    ]);

    startHealthCheck(60_000);
    await vi.advanceTimersByTimeAsync(0);

    expect(isHealthy('down-engine')).toBe(false);
    expect(getEngineHealth('down-engine').status).toBe('down');
    expect(getEngineHealth('down-engine').error).toBe('offline');
  });

  it('emits change event on status transition', async () => {
    let callCount = 0;
    getEngines.mockReturnValue([
      { id: 'flaky', status: () => Promise.resolve({ available: true }) },
    ]);

    startHealthCheck(1000);
    await vi.advanceTimersByTimeAsync(0);

    // Now make it go down
    const changeFn = vi.fn();
    onHealthChange(changeFn);

    getEngines.mockReturnValue([
      { id: 'flaky', status: () => Promise.resolve({ available: false }) },
    ]);

    await vi.advanceTimersByTimeAsync(1000);

    expect(changeFn).toHaveBeenCalledWith({
      engineId: 'flaky',
      prev: 'healthy',
      next: 'down',
    });

    offHealthChange(changeFn);
  });

  it('stopHealthCheck clears timer', async () => {
    getEngines.mockReturnValue([
      { id: 'eng', status: () => Promise.resolve({ available: true }) },
    ]);

    startHealthCheck(1000);
    await vi.advanceTimersByTimeAsync(0);
    stopHealthCheck();

    // Change engine to down — should NOT update since timer is stopped
    getEngines.mockReturnValue([
      { id: 'eng', status: () => Promise.resolve({ available: false }) },
    ]);

    await vi.advanceTimersByTimeAsync(5000);
    // Still healthy because no more checks ran
    expect(getEngineHealth('eng').status).toBe('healthy');
  });

  it('getAllHealth returns all engine states', async () => {
    getEngines.mockReturnValue([
      { id: 'a', status: () => Promise.resolve({ available: true }) },
      { id: 'b', status: () => Promise.resolve({ available: false }) },
    ]);

    startHealthCheck(60_000);
    await vi.advanceTimersByTimeAsync(0);

    const all = getAllHealth();
    expect(all).toHaveProperty('a');
    expect(all).toHaveProperty('b');
    expect(all.a.status).toBe('healthy');
    expect(all.b.status).toBe('down');
  });

  it('handles engine.status() throwing an error', async () => {
    getEngines.mockReturnValue([
      { id: 'broken', status: () => Promise.reject(new Error('connection refused')) },
    ]);

    startHealthCheck(60_000);
    await vi.advanceTimersByTimeAsync(0);

    expect(isHealthy('broken')).toBe(false);
    expect(getEngineHealth('broken').error).toBe('connection refused');
  });
});
