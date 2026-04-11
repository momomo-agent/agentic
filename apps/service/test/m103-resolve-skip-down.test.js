/**
 * DBB-014: resolveModel skips down engines
 * Task: task-1775896028427
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to test the real registry + health interaction
// Mock only the external dependencies

vi.mock('../src/engine/registry.js', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
  };
});

import { register, unregister, resolveModel, getEngines } from '../src/engine/registry.js';
import { startHealthCheck, stopHealthCheck, isHealthy, getEngineHealth } from '../src/engine/health.js';

describe('DBB-014: resolveModel skips down engines', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stopHealthCheck();
  });

  afterEach(() => {
    stopHealthCheck();
    unregister('ollama');
    unregister('cloud:openai');
    vi.useRealTimers();
  });

  it('skips down engine and resolves to healthy engine', async () => {
    // Register two engines with the same model
    const ollamaEngine = {
      name: 'ollama',
      status: () => Promise.resolve({ available: false }),
      models: () => Promise.resolve([{ name: 'test-model', capabilities: ['chat'] }]),
    };
    const cloudEngine = {
      name: 'cloud:openai',
      status: () => Promise.resolve({ available: true }),
      models: () => Promise.resolve([{ name: 'test-model', capabilities: ['chat'] }]),
    };

    register('ollama', ollamaEngine);
    register('cloud:openai', cloudEngine);

    // Run health check to mark ollama as down
    startHealthCheck(60_000);
    await vi.advanceTimersByTimeAsync(0);

    expect(isHealthy('ollama')).toBe(false);
    expect(isHealthy('cloud:openai')).toBe(true);

    // resolveModel should skip ollama and find cloud:openai
    vi.useRealTimers(); // resolveModel is async, needs real timers
    const resolved = await resolveModel('test-model');
    expect(resolved).not.toBeNull();
    expect(resolved.engineId).toBe('cloud:openai');
  });
});
