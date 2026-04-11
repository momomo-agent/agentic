import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const brainPath = join(__dirname, '..', 'src', 'server', 'brain.js');
const brainSource = fs.readFileSync(brainPath, 'utf8');
const importLines = brainSource.split('\n').filter(l => /^\s*import\s/.test(l));

// Static import checks

describe('brain.js does NOT import getModelPool from config.js', () => {
  it('does not destructure getModelPool', () => {
    const configImport = importLines.find(l => l.includes('config.js'));
    expect(configImport).toBeTruthy();
    expect(configImport.includes('getModelPool')).toBe(false);
  });

  it('does not reference getModelPool anywhere', () => {
    expect(brainSource.includes('getModelPool')).toBe(false);
  });
});

describe('brain.js DOES import resolveModel from engine/registry.js', () => {
  it('imports resolveModel as registryResolve', () => {
    const registryImport = importLines.find(l => l.includes('engine/registry'));
    expect(registryImport).toBeTruthy();
    expect(registryImport.includes('resolveModel')).toBe(true);
  });
});

describe('brain.js DOES import modelsForCapability from engine/registry.js', () => {
  it('imports modelsForCapability', () => {
    const registryImport = importLines.find(l => l.includes('engine/registry'));
    expect(registryImport).toBeTruthy();
    expect(registryImport.includes('modelsForCapability')).toBe(true);
  });
});

describe('brain.js does NOT import from detector/', () => {
  it('does not import from detector/hardware.js', () => {
    expect(brainSource.includes('detector/hardware')).toBe(false);
  });

  it('does not import from detector/profiles.js', () => {
    expect(brainSource.includes('detector/profiles')).toBe(false);
  });

  it('has no import referencing detector/ at all', () => {
    const detectorImports = importLines.filter(l => l.includes('detector/'));
    expect(detectorImports.length).toBe(0);
  });
});

// Ollama engine run() tests

describe('Ollama engine run() yields content chunks for chat', () => {
  it('streams content and done', async () => {
    const originalFetch = globalThis.fetch;
    const ndjson = [
      JSON.stringify({ message: { content: 'Hello' }, done: false }),
      JSON.stringify({ message: { content: ' world' }, done: false }),
      JSON.stringify({ done: true }),
    ].join('\n') + '\n';

    globalThis.fetch = async (url) => {
      if (url.includes('/api/chat')) {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(ndjson));
            controller.close();
          },
        });
        return { ok: true, body: stream };
      }
      if (url.includes('/api/tags')) {
        return { ok: true, json: async () => ({ models: [] }) };
      }
      return originalFetch(url);
    };

    try {
      const ollamaMod = await import('../src/engine/ollama.js');
      const engine = ollamaMod.default;
      const collected = [];
      for await (const chunk of engine.run('llama3', { messages: [{ role: 'user', content: 'hi' }] })) {
        collected.push(chunk);
      }
      expect(collected.length).toBeGreaterThanOrEqual(2);
      const contentChunks = collected.filter(c => c.type === 'content');
      expect(contentChunks.length).toBe(2);
      expect(contentChunks[0].text).toBe('Hello');
      expect(contentChunks[1].text).toBe(' world');
      const doneChunks = collected.filter(c => c.type === 'done');
      expect(doneChunks.length).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('Ollama engine run() yields embeddings', () => {
  it('returns embedding array', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      if (url.includes('/api/embed')) {
        return { ok: true, json: async () => ({ embeddings: [[0.1, 0.2, 0.3]] }) };
      }
      if (url.includes('/api/tags')) {
        return { ok: true, json: async () => ({ models: [] }) };
      }
      return originalFetch(url);
    };

    try {
      const ollamaMod = await import('../src/engine/ollama.js');
      const engine = ollamaMod.default;
      const collected = [];
      for await (const chunk of engine.run('nomic-embed-text', { text: 'hello world' })) {
        collected.push(chunk);
      }
      expect(collected.length).toBe(1);
      expect(collected[0].type).toBe('embedding');
      expect(Array.isArray(collected[0].data)).toBe(true);
      expect(collected[0].data).toEqual([0.1, 0.2, 0.3]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('Ollama engine status()', () => {
  it('returns available when /api/tags succeeds', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      if (url.includes('/api/tags')) {
        return { ok: true, json: async () => ({ models: [{ name: 'llama3' }] }) };
      }
      return originalFetch(url);
    };

    try {
      const ollamaMod = await import('../src/engine/ollama.js');
      const engine = ollamaMod.default;
      const status = await engine.status();
      expect(status.available).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('returns not available when /api/tags fails', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => { throw new Error('connection refused'); };

    try {
      const ollamaMod = await import('../src/engine/ollama.js');
      const engine = ollamaMod.default;
      const status = await engine.status();
      expect(status.available).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('Ollama engine models()', () => {
  it('returns model list from /api/tags', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      if (url.includes('/api/tags')) {
        return { ok: true, json: async () => ({ models: [{ name: 'llama3' }, { name: 'mistral' }] }) };
      }
      return originalFetch(url);
    };

    try {
      const ollamaMod = await import('../src/engine/ollama.js');
      const engine = ollamaMod.default;
      const models = await engine.models();
      expect(models.length).toBe(2);
      expect(models[0].id).toBe('llama3');
      expect(models[1].id).toBe('mistral');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

// Cloud engine tests

describe('Cloud engine run() yields transcription for STT', () => {
  it('returns transcription text', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      if (url.includes('/v1/audio/transcriptions')) {
        return { ok: true, json: async () => ({ text: 'Hello from whisper' }) };
      }
      return originalFetch(url);
    };

    try {
      const { createCloudEngine } = await import('../src/engine/cloud.js');
      const engine = createCloudEngine('openai', { apiKey: 'test-key' });
      const collected = [];
      for await (const chunk of engine.run('whisper-1', { audioBuffer: Buffer.from([1, 2, 3]) })) {
        collected.push(chunk);
      }
      expect(collected.length).toBe(1);
      expect(collected[0].type).toBe('transcription');
      expect(collected[0].text).toBe('Hello from whisper');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('Cloud engine run() yields audio for TTS', () => {
  it('returns audio buffer', async () => {
    const fakeAudio = new Uint8Array([10, 20, 30, 40]);
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      if (url.includes('/v1/audio/speech')) {
        return { ok: true, arrayBuffer: async () => fakeAudio.buffer };
      }
      return originalFetch(url);
    };

    try {
      const { createCloudEngine } = await import('../src/engine/cloud.js');
      const engine = createCloudEngine('openai', { apiKey: 'test-key' });
      const collected = [];
      for await (const chunk of engine.run('tts-1', { ttsText: 'Say hello' })) {
        collected.push(chunk);
      }
      expect(collected.length).toBe(1);
      expect(collected[0].type).toBe('audio');
      expect(Buffer.isBuffer(collected[0].data)).toBe(true);
      expect(collected[0].data.length).toBe(4);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
