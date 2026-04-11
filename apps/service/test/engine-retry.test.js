/**
 * Retry mechanism tests for task-1775896028509 (M103)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Inline withRetry for unit testing (same implementation as in ollama.js/cloud.js)
async function* withRetry(fn, { maxRetries, shouldRetry, getDelay, engineName }) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      yield* fn();
      return;
    } catch (err) {
      lastError = err;
      if (attempt > maxRetries || !shouldRetry(err)) throw err;
      const delay = getDelay(err, attempt);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
}

describe('withRetry (ollama-style: 1 retry, connection errors)', () => {
  const ollamaOpts = {
    maxRetries: 1,
    shouldRetry: (err) => err.name === 'AbortError' || err.name === 'TypeError' || err.message?.includes('ECONNREFUSED'),
    getDelay: () => 10, // fast for tests
    engineName: 'ollama',
  };

  it('succeeds on first attempt without retry', async () => {
    const chunks = [];
    async function* gen() { yield { type: 'content', text: 'hello' }; }
    for await (const c of withRetry(gen, ollamaOpts)) chunks.push(c);
    expect(chunks).toEqual([{ type: 'content', text: 'hello' }]);
  });

  it('retries once on AbortError and succeeds', async () => {
    let attempt = 0;
    async function* gen() {
      attempt++;
      if (attempt === 1) {
        const err = new Error('timeout');
        err.name = 'AbortError';
        throw err;
      }
      yield { type: 'content', text: 'recovered' };
    }
    const chunks = [];
    for await (const c of withRetry(gen, ollamaOpts)) chunks.push(c);
    expect(attempt).toBe(2);
    expect(chunks[0].text).toBe('recovered');
  });

  it('does NOT retry on non-retryable error (e.g. HTTP 400)', async () => {
    let attempt = 0;
    async function* gen() {
      attempt++;
      throw new Error('Ollama error: 400');
    }
    await expect(async () => {
      for await (const _ of withRetry(gen, ollamaOpts)) {}
    }).rejects.toThrow('Ollama error: 400');
    expect(attempt).toBe(1);
  });

  it('retries on ECONNREFUSED', async () => {
    let attempt = 0;
    async function* gen() {
      attempt++;
      if (attempt === 1) throw new Error('fetch failed: ECONNREFUSED');
      yield { type: 'done' };
    }
    const chunks = [];
    for await (const c of withRetry(gen, ollamaOpts)) chunks.push(c);
    expect(attempt).toBe(2);
  });
});

describe('withRetry (cloud-style: 3 retries, 429/5xx, exponential backoff)', () => {
  const cloudOpts = {
    maxRetries: 3,
    shouldRetry: (err) => {
      const status = err.httpStatus;
      return status === 429 || (status >= 500 && status < 600);
    },
    getDelay: (err, attempt) => {
      if (err.httpStatus === 429 && err.retryAfter) return err.retryAfter * 10; // scaled down for tests
      return 10 * Math.pow(2, attempt - 1);
    },
    engineName: 'cloud:openai',
  };

  it('retries on 429 and succeeds', async () => {
    let attempt = 0;
    async function* gen() {
      attempt++;
      if (attempt <= 2) {
        const err = new Error('rate limited');
        err.httpStatus = 429;
        err.retryAfter = 1;
        throw err;
      }
      yield { type: 'content', text: 'ok' };
    }
    const chunks = [];
    for await (const c of withRetry(gen, cloudOpts)) chunks.push(c);
    expect(attempt).toBe(3);
    expect(chunks[0].text).toBe('ok');
  });

  it('retries on 500 with exponential backoff', async () => {
    let attempt = 0;
    async function* gen() {
      attempt++;
      if (attempt === 1) {
        const err = new Error('server error');
        err.httpStatus = 500;
        throw err;
      }
      yield { type: 'content', text: 'recovered' };
    }
    const chunks = [];
    for await (const c of withRetry(gen, cloudOpts)) chunks.push(c);
    expect(attempt).toBe(2);
  });

  it('gives up after maxRetries and throws last error', async () => {
    let attempt = 0;
    async function* gen() {
      attempt++;
      const err = new Error('server error');
      err.httpStatus = 500;
      throw err;
    }
    await expect(async () => {
      for await (const _ of withRetry(gen, cloudOpts)) {}
    }).rejects.toThrow('server error');
    expect(attempt).toBe(4); // 1 initial + 3 retries
  });

  it('does NOT retry on 400 (client error)', async () => {
    let attempt = 0;
    async function* gen() {
      attempt++;
      const err = new Error('bad request');
      err.httpStatus = 400;
      throw err;
    }
    await expect(async () => {
      for await (const _ of withRetry(gen, cloudOpts)) {}
    }).rejects.toThrow('bad request');
    expect(attempt).toBe(1);
  });
});
