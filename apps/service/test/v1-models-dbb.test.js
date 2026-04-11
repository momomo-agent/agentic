import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../src/server/brain.js', () => ({ chat: vi.fn() }));
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
import { chat } from '../src/server/brain.js';
import { modelsForCapability } from '../src/engine/registry.js';

describe('GET /v1/models — DBB edge cases', () => {
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

  // DBB-024: every model item has id, object=model, created (number), owned_by (string)
  it('DBB-024: every model has id, object=model, created, owned_by', async () => {
    modelsForCapability.mockImplementation(async (cap) => {
      if (cap === 'embed') return [{ id: 'bge-m3', engineId: 'ollama' }];
      if (cap === 'stt') return [{ id: 'whisper:small', engineId: 'whisper' }];
      if (cap === 'tts') return [{ id: 'kokoro:default', engineId: 'tts' }];
      return [];
    });
    const res = await fetch(`${baseUrl}/v1/models`);
    const body = await res.json();
    for (const model of body.data) {
      expect(typeof model.id).toBe('string');
      expect(model.object).toBe('model');
      expect(typeof model.created).toBe('number');
      expect(typeof model.owned_by).toBe('string');
    }
  });

  // DBB-022: embed models appear in list
  it('DBB-022: embed models appear in list', async () => {
    modelsForCapability.mockImplementation(async (cap) => {
      if (cap === 'embed') return [{ id: 'bge-m3', engineId: 'ollama' }];
      return [];
    });
    const res = await fetch(`${baseUrl}/v1/models`);
    const body = await res.json();
    const ids = body.data.map(m => m.id);
    expect(ids).toContain('bge-m3');
  });

  // DBB-023: stt and tts models appear in list
  it('DBB-023: stt and tts models appear in list', async () => {
    modelsForCapability.mockImplementation(async (cap) => {
      if (cap === 'stt') return [{ id: 'whisper:small', engineId: 'whisper' }];
      if (cap === 'tts') return [{ id: 'kokoro:default', engineId: 'tts' }];
      return [];
    });
    const res = await fetch(`${baseUrl}/v1/models`);
    const body = await res.json();
    const ids = body.data.map(m => m.id);
    expect(ids).toContain('whisper:small');
    expect(ids).toContain('kokoro:default');
  });
});
