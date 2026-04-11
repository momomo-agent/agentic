/**
 * Additional retry edge-case tests for task-1775896028509 (M103)
 * Covers: log format, ECONNREFUSED retry, TypeError retry, cloud 401 no-retry
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('ollama retry edge cases', () => {
  let ollamaEngine;
  let originalFetch;

  beforeEach(async () => {
    originalFetch = globalThis.fetch;
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

  it('retries on ECONNREFUSED', async () => {
    let callCount = 0;
    globalThis.fetch = async () => {
      callCount++;
      if (callCount === 1) {
        throw new Error('fetch failed: ECONNREFUSED');
      }
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

  it('retries on TypeError (connection failure)', async () => {
    let callCount = 0;
    globalThis.fetch = async () => {
      callCount++;
      if (callCount === 1) {
        const err = new TypeError('Failed to fetch');
        throw err;
      }
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
  });

  it('logs retry with correct format: [retry] engine=ollama attempt=N reason=...', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    let callCount = 0;
    globalThis.fetch = async () => {
      callCount++;
      if (callCount === 1) {
        const err = new Error('timeout');
        err.name = 'AbortError';
        throw err;
      }
      return {
        ok: true,
        json: async () => ({ embeddings: [[1]] }),
      };
    };

    for await (const _ of ollamaEngine.run('test-model', { text: 'hello' })) {}

    const retryLog = logSpy.mock.calls.find(c => c[0]?.includes('[retry]'));
    expect(retryLog).toBeDefined();
    expect(retryLog[0]).toMatch(/\[retry\] engine=ollama attempt=2 reason=timeout/);
    logSpy.mockRestore();
  });

  it('maxRetries=1 means at most 2 total attempts', async () => {
    let callCount = 0;
    globalThis.fetch = async () => {
      callCount++;
      const err = new Error('timeout');
      err.name = 'AbortError';
      throw err;
    };

    try {
      for await (const _ of ollamaEngine.run('test-model', { text: 'hello' })) {}
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(callCount).toBe(2); // 1 original + 1 retry
      expect(err.name).toBe('AbortError');
    }
  });
});

describe('cloud retry edge cases', () => {
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

  it('does NOT retry on 401 (authentication error)', async () => {
    let callCount = 0;
    globalThis.fetch = async () => {
      callCount++;
      return { ok: false, status: 401, headers: new Headers() };
    };

    const engine = createCloudEngine('openai', { apiKey: 'bad-key' });
    try {
      for await (const _ of engine.run('text-embedding-3-small', { text: 'hello' })) {}
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(callCount).toBe(1);
      expect(err.httpStatus).toBe(401);
    }
  });

  it('does NOT retry on 403 (forbidden)', async () => {
    let callCount = 0;
    globalThis.fetch = async () => {
      callCount++;
      return { ok: false, status: 403, headers: new Headers() };
    };

    const engine = createCloudEngine('openai', { apiKey: 'test-key' });
    try {
      for await (const _ of engine.run('text-embedding-3-small', { text: 'hello' })) {}
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(callCount).toBe(1);
      expect(err.httpStatus).toBe(403);
    }
  });

  it('retries on 503 (service unavailable)', async () => {
    let callCount = 0;
    globalThis.fetch = async () => {
      callCount++;
      if (callCount <= 1) {
        return { ok: false, status: 503, headers: new Headers() };
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

  it('error includes httpStatus and retryAfter from response', async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 429,
      headers: new Headers({ 'Retry-After': '1' }),
    });

    const engine = createCloudEngine('openai', { apiKey: 'test-key' });
    try {
      for await (const _ of engine.run('text-embedding-3-small', { text: 'hello' })) {}
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err.httpStatus).toBe(429);
      expect(err.retryAfter).toBe(1);
    }
  }, 30000);

  it('logs retry with correct format: [retry] engine=cloud:<provider>', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    let callCount = 0;
    globalThis.fetch = async () => {
      callCount++;
      if (callCount <= 1) {
        return { ok: false, status: 500, headers: new Headers() };
      }
      return {
        ok: true,
        json: async () => ({ data: [{ embedding: [1] }] }),
      };
    };

    const engine = createCloudEngine('openai', { apiKey: 'test-key' });
    for await (const _ of engine.run('text-embedding-3-small', { text: 'hello' })) {}

    const retryLog = logSpy.mock.calls.find(c => c[0]?.includes('[retry]'));
    expect(retryLog).toBeDefined();
    expect(retryLog[0]).toMatch(/\[retry\] engine=cloud:openai attempt=2/);
    logSpy.mockRestore();
  });
});
