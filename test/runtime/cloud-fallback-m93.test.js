import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockProfile = {
  llm: { provider: 'ollama', model: 'test-model' },
  fallback: { provider: 'openai', model: 'gpt-4o-mini' }
};

function mockSSEStream(chunks) {
  const encoder = new TextEncoder();
  const data = chunks.map(c => `data: ${c}\n`).join('');
  let offset = 0;
  return {
    getReader: () => ({
      read: vi.fn().mockImplementation(() => {
        if (offset >= data.length) return Promise.resolve({ done: true });
        const slice = data.slice(offset, offset + 256);
        offset += 256;
        return Promise.resolve({ done: false, value: encoder.encode(slice) });
      })
    })
  };
}

function mockOllamaStream(chunks) {
  const encoder = new TextEncoder();
  const data = chunks.map(c => JSON.stringify(c) + '\n').join('');
  let offset = 0;
  return {
    getReader: () => ({
      read: vi.fn().mockImplementation(() => {
        if (offset >= data.length) return Promise.resolve({ done: true });
        const slice = data.slice(offset, offset + 256);
        offset += 256;
        return Promise.resolve({ done: false, value: encoder.encode(slice) });
      })
    })
  };
}

function setupMocks() {
  vi.doMock('../../src/detector/hardware.js', () => ({
    detect: vi.fn().mockResolvedValue({ platform: 'linux', arch: 'x64', gpu: { type: 'none' }, memory: 8 })
  }));
  vi.doMock('../../src/detector/profiles.js', () => ({
    getProfile: vi.fn().mockResolvedValue(mockProfile),
    watchProfiles: vi.fn()
  }));
  vi.doMock('../../src/runtime/latency-log.js', () => ({ record: vi.fn() }));
  vi.doMock('../../src/runtime/profiler.js', () => ({ startMark: vi.fn(), endMark: vi.fn() }));
}

beforeEach(() => {
  vi.resetModules();
  setupMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.OPENAI_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
});

describe('cloud fallback (m93)', () => {
  it('falls back to OpenAI when Ollama connection fails', async () => {
    process.env.OPENAI_API_KEY = 'test-key';

    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('connection refused'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: mockSSEStream([
          '{"choices":[{"delta":{"content":"hello"}}]}',
          '[DONE]'
        ])
      });

    vi.stubGlobal('fetch', fetchMock);

    const { chat } = await import('../../src/runtime/llm.js');
    const chunks = [];
    for await (const chunk of chat('test message')) {
      chunks.push(chunk);
    }

    // Should have meta chunk indicating cloud
    const meta = chunks.find(c => c.type === 'meta');
    expect(meta).toBeDefined();
    expect(meta.provider).toBe('cloud');

    // Should have content chunk from OpenAI
    const content = chunks.find(c => c.type === 'content');
    expect(content).toBeDefined();
    expect(content.content).toBe('hello');
  });

  it('throws when Ollama fails and no OPENAI_API_KEY is set', async () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('connection refused'));

    vi.stubGlobal('fetch', fetchMock);

    const { chat } = await import('../../src/runtime/llm.js');
    const gen = chat('test message');

    await expect(async () => {
      for await (const chunk of gen) { /* consume */ }
    }).rejects.toThrow(/OPENAI_API_KEY not set/);
  });

  it('does NOT fall back when Ollama succeeds', async () => {
    process.env.OPENAI_API_KEY = 'test-key';

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: mockOllamaStream([
          { message: { content: 'ollama-response' }, done: true }
        ])
      });

    vi.stubGlobal('fetch', fetchMock);

    const { chat } = await import('../../src/runtime/llm.js');
    const chunks = [];
    for await (const chunk of chat('test message')) {
      chunks.push(chunk);
    }

    // Should NOT have meta cloud chunk
    const meta = chunks.find(c => c.type === 'meta');
    expect(meta).toBeUndefined();

    // Should have content from Ollama
    const content = chunks.find(c => c.type === 'content');
    expect(content).toBeDefined();
    expect(content.content).toBe('ollama-response');

    // Only one fetch call (Ollama, no OpenAI)
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('npx entrypoint --help (m93)', () => {
  it('node bin/agentic-service.js --help exits 0', async () => {
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execFileAsync = promisify(execFile);

    const result = await execFileAsync('node', ['bin/agentic-service.js', '--help'], { timeout: 10000 });
    expect(result.stdout).toContain('Usage: agentic-service');
    expect(result.stdout).toContain('--help');
  }, 15000);
});
