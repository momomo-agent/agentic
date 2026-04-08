import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/runtime/llm.js', () => ({
  chat: async function* () {
    yield { type: 'content', text: 'hello', done: true };
  }
}));

describe('M20 DBB-003: brain.js chat', () => {
  it('chat yields at least one chunk', async () => {
    const { chat } = await import('../src/server/brain.js');
    const chunks = [];
    for await (const chunk of chat([{ role: 'user', content: 'hi' }], {})) {
      chunks.push(chunk);
    }
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('registerTool does not throw', async () => {
    const { registerTool } = await import('../src/server/brain.js');
    expect(() => registerTool('my-tool', () => 'ok')).not.toThrow();
  });
});
