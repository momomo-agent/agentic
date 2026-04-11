import { test } from 'vitest';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const brainPath = join(__dirname, '..', 'src', 'server', 'brain.js');
const brainSource = fs.readFileSync(brainPath, 'utf8');
const importLines = brainSource.split('\n').filter(l => /^\s*import\s/.test(l));

// ── Static import checks (sync — safe inside node:test describe/it) ────

test('engine-registry-brain: static imports', { timeout: 30_000 }, async () => {

  // 1. brain.js does NOT import getModelPool
  describe('brain.js does NOT import getModelPool from config.js', () => {
    it('does not destructure getModelPool', () => {
      const configImport = importLines.find(l => l.includes('config.js'));
      assert.ok(configImport, 'brain.js must import from config.js');
      assert.ok(
        !configImport.includes('getModelPool'),
        `brain.js must NOT import getModelPool from config.js, found: ${configImport.trim()}`
      );
    });

    it('does not reference getModelPool anywhere', () => {
      assert.ok(
        !brainSource.includes('getModelPool'),
        'brain.js must not reference getModelPool at all'
      );
    });
  });

  // 2. brain.js DOES import resolveModel from engine/registry.js
  describe('brain.js DOES import resolveModel from engine/registry.js', () => {
    it('imports resolveModel as registryResolve', () => {
      const registryImport = importLines.find(l => l.includes('engine/registry'));
      assert.ok(registryImport, 'brain.js must import from engine/registry.js');
      assert.ok(
        registryImport.includes('resolveModel'),
        `brain.js must import resolveModel from engine/registry.js, found: ${registryImport.trim()}`
      );
    });
  });

  // 3. brain.js DOES import modelsForCapability from engine/registry.js
  describe('brain.js DOES import modelsForCapability from engine/registry.js', () => {
    it('imports modelsForCapability', () => {
      const registryImport = importLines.find(l => l.includes('engine/registry'));
      assert.ok(registryImport, 'brain.js must import from engine/registry.js');
      assert.ok(
        registryImport.includes('modelsForCapability'),
        `brain.js must import modelsForCapability from engine/registry.js, found: ${registryImport.trim()}`
      );
    });
  });

  // 4. brain.js does NOT import from detector/
  describe('brain.js does NOT import from detector/', () => {
    it('does not import from detector/hardware.js', () => {
      assert.ok(
        !brainSource.includes('detector/hardware'),
        'brain.js must not import from detector/hardware.js'
      );
    });

    it('does not import from detector/profiles.js', () => {
      assert.ok(
        !brainSource.includes('detector/profiles'),
        'brain.js must not import from detector/profiles.js'
      );
    });

    it('has no import referencing detector/ at all', () => {
      const detectorImports = importLines.filter(l => l.includes('detector/'));
      assert.equal(
        detectorImports.length,
        0,
        `unexpected detector imports: ${detectorImports.join(', ')}`
      );
    });
  });
});

// ── Engine run() tests (async — run directly in vitest test blocks) ─────

test('engine-registry-brain: ollama yields content chunks for chat', { timeout: 30_000 }, async () => {
  const chunks = [
    JSON.stringify({ message: { content: 'Hello' }, done: false }) + '\n',
    JSON.stringify({ message: { content: ' world' }, done: false }) + '\n',
    JSON.stringify({ message: { content: '' }, done: true }) + '\n',
  ];

  const readable = new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(new TextEncoder().encode(c));
      controller.close();
    },
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url.includes('/api/tags')) {
      return { ok: true, json: async () => ({ models: [{ name: 'gemma3:4b', size: 3e9 }] }) };
    }
    if (url.includes('/api/chat')) {
      return { ok: true, body: readable };
    }
    return originalFetch(url);
  };

  try {
    const { default: ollamaEngine } = await import('../src/engine/ollama.js');
    const collected = [];
    for await (const chunk of ollamaEngine.run('gemma3:4b', {
      messages: [{ role: 'user', content: 'hi' }],
    })) {
      collected.push(chunk);
    }

    const contentChunks = collected.filter(c => c.type === 'content');
    assert.ok(contentChunks.length >= 1, 'Expected at least one content chunk');
    assert.equal(contentChunks[0].text, 'Hello');
    assert.equal(contentChunks[1].text, ' world');

    const doneChunks = collected.filter(c => c.type === 'done');
    assert.equal(doneChunks.length, 1, 'Expected exactly one done chunk');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('engine-registry-brain: ollama yields embedding for embed mode', { timeout: 30_000 }, async () => {
  const mockEmbedding = [0.1, 0.2, 0.3, 0.4];

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url.includes('/api/tags')) {
      return { ok: true, json: async () => ({ models: [] }) };
    }
    if (url.includes('/api/embed')) {
      return {
        ok: true,
        json: async () => ({ embeddings: [mockEmbedding] }),
      };
    }
    return originalFetch(url);
  };

  try {
    const { default: ollamaEngine } = await import('../src/engine/ollama.js');
    const collected = [];
    for await (const chunk of ollamaEngine.run('nomic-embed-text', {
      text: 'hello world',
    })) {
      collected.push(chunk);
    }

    assert.equal(collected.length, 1, 'Expected exactly one embedding chunk');
    assert.equal(collected[0].type, 'embedding');
    assert.deepEqual(collected[0].data, mockEmbedding);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('engine-registry-brain: ollama yields tool_use chunks', { timeout: 30_000 }, async () => {
  const chunks = [
    JSON.stringify({
      message: {
        content: '',
        tool_calls: [{
          function: {
            name: 'get_weather',
            arguments: JSON.stringify({ city: 'Tokyo' }),
          },
        }],
      },
      done: false,
    }) + '\n',
    JSON.stringify({ message: { content: '' }, done: true }) + '\n',
  ];

  const readable = new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(new TextEncoder().encode(c));
      controller.close();
    },
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url.includes('/api/tags')) {
      return { ok: true, json: async () => ({ models: [] }) };
    }
    if (url.includes('/api/chat')) {
      return { ok: true, body: readable };
    }
    return originalFetch(url);
  };

  try {
    const { default: ollamaEngine } = await import('../src/engine/ollama.js');
    const collected = [];
    for await (const chunk of ollamaEngine.run('gemma3:4b', {
      messages: [{ role: 'user', content: 'weather in Tokyo' }],
      tools: [{ name: 'get_weather', description: 'Get weather', parameters: {} }],
    })) {
      collected.push(chunk);
    }

    const toolChunks = collected.filter(c => c.type === 'tool_use');
    assert.equal(toolChunks.length, 1, 'Expected one tool_use chunk');
    assert.equal(toolChunks[0].name, 'get_weather');
    assert.deepEqual(toolChunks[0].input, { city: 'Tokyo' });
    assert.equal(toolChunks[0].text, JSON.stringify({ city: 'Tokyo' }));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('engine-registry-brain: cloud yields content chunks for chat', { timeout: 30_000 }, async () => {
  const sseLines = [
    'data: ' + JSON.stringify({ choices: [{ delta: { content: 'Hi' } }] }) + '\n\n',
    'data: ' + JSON.stringify({ choices: [{ delta: { content: ' there' } }] }) + '\n\n',
    'data: [DONE]\n\n',
  ];

  const readable = new ReadableStream({
    start(controller) {
      for (const line of sseLines) controller.enqueue(new TextEncoder().encode(line));
      controller.close();
    },
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, body: readable });

  try {
    const { createCloudEngine } = await import('../src/engine/cloud.js');
    const engine = createCloudEngine('openai', { apiKey: 'test-key' });
    const collected = [];
    for await (const chunk of engine.run('gpt-4o', {
      messages: [{ role: 'user', content: 'hello' }],
    })) {
      collected.push(chunk);
    }

    const contentChunks = collected.filter(c => c.type === 'content');
    assert.equal(contentChunks.length, 2, 'Expected two content chunks');
    assert.equal(contentChunks[0].text, 'Hi');
    assert.equal(contentChunks[1].text, ' there');

    const doneChunks = collected.filter(c => c.type === 'done');
    assert.equal(doneChunks.length, 1, 'Expected one done chunk');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('engine-registry-brain: cloud yields transcription for STT', { timeout: 30_000 }, async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url.includes('/v1/audio/transcriptions')) {
      return {
        ok: true,
        json: async () => ({ text: 'Hello from whisper' }),
      };
    }
    return originalFetch(url);
  };

  try {
    const { createCloudEngine } = await import('../src/engine/cloud.js');
    const engine = createCloudEngine('openai', { apiKey: 'test-key' });
    const collected = [];
    for await (const chunk of engine.run('whisper-1', {
      audioBuffer: new Uint8Array([0, 1, 2, 3]),
    })) {
      collected.push(chunk);
    }

    assert.equal(collected.length, 1, 'Expected exactly one transcription chunk');
    assert.equal(collected[0].type, 'transcription');
    assert.equal(collected[0].text, 'Hello from whisper');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('engine-registry-brain: cloud yields audio for TTS', { timeout: 30_000 }, async () => {
  const fakeAudio = new Uint8Array([10, 20, 30, 40]);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url.includes('/v1/audio/speech')) {
      return {
        ok: true,
        arrayBuffer: async () => fakeAudio.buffer,
      };
    }
    return originalFetch(url);
  };

  try {
    const { createCloudEngine } = await import('../src/engine/cloud.js');
    const engine = createCloudEngine('openai', { apiKey: 'test-key' });
    const collected = [];
    for await (const chunk of engine.run('tts-1', {
      ttsText: 'Say hello',
    })) {
      collected.push(chunk);
    }

    assert.equal(collected.length, 1, 'Expected exactly one audio chunk');
    assert.equal(collected[0].type, 'audio');
    assert.ok(Buffer.isBuffer(collected[0].data), 'audio data should be a Buffer');
    assert.equal(collected[0].data.length, 4);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
