import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../src/server/core-bridge.js', () => ({ chat: vi.fn() }));
vi.mock('../src/detector/hardware.js', () => ({
  detect: vi.fn().mockResolvedValue({ platform: 'darwin', arch: 'arm64', gpu: {}, memory: 16, cpu: {} })
}));
vi.mock('../src/runtime/stt.js', () => ({ init: vi.fn(), transcribe: vi.fn() }));
vi.mock('../src/runtime/tts.js', () => ({ init: vi.fn(), synthesize: vi.fn() }));
vi.mock('../src/runtime/embed.js', () => ({ embed: vi.fn() }));
vi.mock('../src/engine/registry.js', async (importOriginal) => {
  const orig = await importOriginal();
  return {
    ...orig,
    modelsForCapability: vi.fn().mockResolvedValue([]),
  };
});

import { createApp } from '../src/server/api.js';
import { chat } from '../src/server/core-bridge.js';
import { modelsForCapability } from '../src/engine/registry.js';

describe('GET /v1/models', () => {
  let server, baseUrl;

  beforeEach(async () => {
    vi.resetAllMocks();
    chat.mockImplementation(async function* () {});
    modelsForCapability.mockResolvedValue([]);
    await new Promise((resolve, reject) => {
      server = createApp().listen(0);
      server.once('listening', () => { baseUrl = `http://localhost:${server.address().port}`; resolve(); });
      server.once('error', reject);
    });
  });

  afterEach(() => new Promise(r => server.close(r)));

  it('returns base model when no engines registered', async () => {
    const res = await fetch(`${baseUrl}/v1/models`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.object).toBe('list');
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data[0].id).toBe('agentic-service');
    expect(body.data[0].object).toBe('model');
  });

  it('includes embed, stt, and tts models from registry', async () => {
    modelsForCapability.mockImplementation(async (cap) => {
      if (cap === 'embed') return [{ id: 'bge-m3', engineId: 'ollama' }];
      if (cap === 'stt') return [{ id: 'whisper:small', engineId: 'whisper' }];
      if (cap === 'tts') return [{ id: 'kokoro:default', engineId: 'tts' }];
      return [];
    });
    const res = await fetch(`${baseUrl}/v1/models`);
    const body = await res.json();
    expect(body.data.length).toBe(4); // base + embed + stt + tts
    const ids = body.data.map(m => m.id);
    expect(ids).toContain('bge-m3');
    expect(ids).toContain('whisper:small');
    expect(ids).toContain('kokoro:default');
  });

  it('still returns base model if registry throws', async () => {
    modelsForCapability.mockRejectedValue(new Error('registry down'));
    const res = await fetch(`${baseUrl}/v1/models`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data[0].id).toBe('agentic-service');
  });
});
