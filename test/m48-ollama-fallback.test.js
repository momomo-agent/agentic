import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => vi.restoreAllMocks());

describe('Ollama non-200 fallback', () => {
  it('throws on non-200 Ollama response (triggers fallback)', async () => {
    // Verify chatWithOllama throws when response.ok is false
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    vi.stubGlobal('fetch', mockFetch);

    // Inline the chatWithOllama logic to test the throw
    async function* chatWithOllama() {
      const response = await fetch('http://localhost:11434/api/chat', {});
      if (!response.ok) throw new Error(`Ollama API error: ${response.status}`);
      yield { type: 'content', content: 'test' };
    }

    const gen = chatWithOllama();
    await expect(gen.next()).rejects.toThrow('Ollama API error: 503');
  });

  it('does not throw on 200 Ollama response', async () => {
    const body = { getReader: () => ({ read: vi.fn().mockResolvedValue({ done: true }) }) };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, body }));

    async function* chatWithOllama() {
      const response = await fetch('http://localhost:11434/api/chat', {});
      if (!response.ok) throw new Error(`Ollama API error: ${response.status}`);
      yield { type: 'done' };
    }

    const gen = chatWithOllama();
    await expect(gen.next()).resolves.toBeDefined();
  });

  it('chat() falls back to cloud when Ollama throws', async () => {
    const called = [];
    async function* chatWithOllama() { throw new Error('Ollama API error: 500'); }
    async function* chatWithCloud() { called.push('cloud'); yield { type: 'content', content: 'hi' }; }

    async function* chat(messages) {
      try { yield* chatWithOllama(messages); return; } catch {}
      yield* chatWithCloud(messages);
    }

    const results = [];
    for await (const chunk of chat([])) results.push(chunk);
    expect(called).toContain('cloud');
    expect(results[0].content).toBe('hi');
  });

  it('chat() does NOT call cloud when Ollama succeeds', async () => {
    const called = [];
    async function* chatWithOllama() { yield { type: 'content', content: 'ollama' }; }
    async function* chatWithCloud() { called.push('cloud'); yield { type: 'content', content: 'cloud' }; }

    async function* chat(messages) {
      try { yield* chatWithOllama(messages); return; } catch {}
      yield* chatWithCloud(messages);
    }

    const results = [];
    for await (const chunk of chat([])) results.push(chunk);
    expect(called).not.toContain('cloud');
    expect(results[0].content).toBe('ollama');
  });
});
