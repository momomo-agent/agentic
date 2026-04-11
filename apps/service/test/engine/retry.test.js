/**
 * Retry mechanism tests for task-1775896028509 (M103)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('engine/ollama.js retry', () => {
  let ollamaEngine;
  let originalFetch;

  beforeEach(async () => {
    originalFetch = globalThis.fetch;
    // Mock getConfig
    vi.doMock('../../src/config.js', () => ({
      getConfig: async () => ({ ollamaHost: 'http://localhost:11434' }),
    }));
    const mod = await import('../../src/engine/ollama.js');
    ollamaEngine = mod.default;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('retries once on AbortError, succeeds on second attempt', async () => {
    let callCount = 0;
    globalThis.fetch = async () => {
      callCount++;
      if (callCount === 1) {
        const err = new Error('timeout');
        err.name = 'AbortError';
        throw err;
      }
      // Return a successful embedding response
      return {
        ok: true,
        json: async () => ({ embeddings: [[1, 2, 3]] }),
      };
    };

    const results = [];
    for await (const chunk of ollamaEngine.run('test-model', { text: 'hello' })) {
      results.push(chunk);
    }
    expect(callCount).toBe(2);
    expect(results[0].type).toBe('embedding');
  });

  it('does NOT retry on HTTP 400 (non-retryable)', async () => {
    globalThis.fetch = async () => ({ ok: false, status: 400 });

    try {
      for await (const _ of ollamaEngine.run('test-model', { text: 'hello' })) {}
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err.message).toContain('400');
    }
  });
});

describe('engine/cloud.js retry', () => {
  let createCloudEngine;
  let originalFetch;

  beforeEach(async () => {
    originalFetch = globalThis.fetch;
    const mod = await import('../../src/engine/cloud.js');
    createCloudEngine = mod.createCloudEngine;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('retries on 429 with Retry-After header', async () => {
    let callCount = 0;
    globalThis.fetch = async () => {
      callCount++;
      if (callCount <= 1) {
        return {
          ok: false,
          status: 429,
          headers: new Headers({ 'Retry-After': '1' }),
        };
      }
      return {
        ok: true,
        json: async () => ({ data: [{ embedding: [1, 2, 3] }] }),
      };
    };

    const engine = createCloudEngine('openai', { apiKey: 'test-key' });
    const results = [];
    for await (const chunk of engine.run('text-embedding-3-small', { text: 'hello' })) {
      results.push(chunk);
    }
    expect(callCount).toBe(2);
    expect(results[0].type).toBe('embedding');
  });

  it('retries on 500 with exponential backoff', async () => {
    let callCount = 0;
    globalThis.fetch = async () => {
      callCount++;
      if (callCount <= 2) {
        return {
          ok: false,
          status: 500,
          headers: new Headers(),
        };
      }
      return {
        ok: true,
        json: async () => ({ data: [{ embedding: [4, 5, 6] }] }),
      };
    };

    const engine = createCloudEngine('openai', { apiKey: 'test-key' });
    const results = [];
    for await (const chunk of engine.run('text-embedding-3-small', { text: 'hello' })) {
      results.push(chunk);
    }
    expect(callCount).toBe(3);
    expect(results[0].type).toBe('embedding');
  });

  it('gives up after maxRetries (3) and throws last error', { timeout: 15000 }, async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 500,
      headers: new Headers(),
    });

    const engine = createCloudEngine('openai', { apiKey: 'test-key' });
    try {
      for await (const _ of engine.run('text-embedding-3-small', { text: 'hello' })) {}
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err.httpStatus).toBe(500);
    }
  });

  it('does NOT retry on 400 (non-retryable)', async () => {
    let callCount = 0;
    globalThis.fetch = async () => {
      callCount++;
      return {
        ok: false,
        status: 400,
        headers: new Headers(),
      };
    };

    const engine = createCloudEngine('openai', { apiKey: 'test-key' });
    try {
      for await (const _ of engine.run('text-embedding-3-small', { text: 'hello' })) {}
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err.httpStatus).toBe(400);
      expect(callCount).toBe(1);
    }
  });
});
