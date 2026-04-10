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

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('brain.js M13 DBB-003: tool_use yields text field', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
  });

  it('Ollama path: tool_use chunk contains text field (string)', async () => {
    const line = JSON.stringify({
      message: { tool_calls: [{ function: { name: 'myTool', arguments: '{"x":1}' } }] },
      done: false
    });
    const encoder = new TextEncoder();
    let called = false;
    const reader = {
      read: vi.fn().mockImplementation(() => {
        if (!called) { called = true; return Promise.resolve({ done: false, value: encoder.encode(line + '\n') }); }
        return Promise.resolve({ done: true });
      })
    };
    mockFetch.mockResolvedValueOnce({ ok: true, body: { getReader: () => reader } });

    const { chat } = await import('../../src/server/brain.js');
    const chunks = [];
    for await (const c of chat([{ role: 'user', content: 'hi' }], { tools: [{ name: 'myTool' }] })) {
      chunks.push(c);
    }

    const toolChunks = chunks.filter(c => c.type === 'tool_use');
    expect(toolChunks.length).toBeGreaterThan(0);
    for (const c of toolChunks) {
      expect(typeof c.text).toBe('string');
    }
  });
});
