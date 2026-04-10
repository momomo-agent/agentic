import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config.js', () => ({
  getConfig: vi.fn(async () => ({
    llm: { provider: 'ollama', model: 'test-model' },
    ollamaHost: 'http://localhost:11434',
    assignments: { chat: null, chatFallback: null },
    modelPool: [],
  })),
  getModelPool: vi.fn(async () => []),
  getAssignments: vi.fn(async () => ({ chat: null, chatFallback: null })),
  onConfigChange: vi.fn(),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('brain.js - DBB-001: tool_use response format (text field)', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
  });

  it('yields chunks with text field (not content) for Ollama path', async () => {
    const lines = [
      JSON.stringify({ message: { content: 'hello' }, done: false }),
      JSON.stringify({ message: { content: ' world' }, done: true }),
    ];
    const encoder = new TextEncoder();
    let i = 0;
    const reader = {
      read: vi.fn().mockImplementation(() => {
        if (i < lines.length) return Promise.resolve({ done: false, value: encoder.encode(lines[i++] + '\n') });
        return Promise.resolve({ done: true, value: undefined });
      }),
    };
    mockFetch.mockResolvedValueOnce({ ok: true, body: { getReader: () => reader } });

    const { chat } = await import('../../src/server/brain.js');
    const chunks = [];
    for await (const chunk of chat([{ role: 'user', content: 'hi' }])) {
      chunks.push(chunk);
    }

    const contentChunks = chunks.filter(c => c.type === 'content');
    expect(contentChunks.length).toBeGreaterThan(0);
    for (const c of contentChunks) {
      expect(c).toHaveProperty('text');
      expect(c).not.toHaveProperty('content');
    }
  });
});
