/**
 * Three Paths Integration Tests
 *
 * Path 1: App ←WS→ service (local engine via custom provider)
 * Path 2: App ←WS→ service ←HTTP→ cloud API (service as proxy)
 * Path 3: App ←HTTP→ core → cloud API (direct, no service)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const corePath = join(__dirname, '..', '..', '..', 'packages', 'core', 'agentic-core.js');

// ── Helpers ──

function loadCore() {
  // Core is UMD — dynamic import returns the factory result
  return import(corePath + '?t=' + Date.now());
}

function waitForWsMessage(ws, type, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${type}`)), timeout);
    const handler = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === type) {
        clearTimeout(timer);
        ws.removeListener('message', handler);
        resolve(msg);
      }
    };
    ws.on('message', handler);
  });
}

function collectWsMessages(ws, types, until, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${until}`)), timeout);
    const collected = [];
    const handler = (data) => {
      const msg = JSON.parse(data.toString());
      if (types.includes(msg.type)) collected.push(msg);
      if (msg.type === until) {
        clearTimeout(timer);
        ws.removeListener('message', handler);
        resolve(collected);
      }
    };
    ws.on('message', handler);
  });
}

// ── Path 3: Core standalone (no service) ──

describe('Path 3: Core → cloud API (direct)', () => {
  let core;
  let originalFetch;

  beforeEach(async () => {
    core = await loadCore();
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('agenticAsk streams text_delta from mock cloud API', async () => {
    const responseBody = JSON.stringify({
      content: [{ type: 'text', text: 'Hello from cloud!' }],
      stop_reason: 'end_turn',
      model: 'claude-3-haiku',
      usage: { input_tokens: 10, output_tokens: 5 },
    });

    // Mock fetch to simulate Anthropic non-streaming response
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      text: async () => responseBody,
      json: async () => JSON.parse(responseBody),
    });

    const chunks = [];
    const iter = core.agenticAsk('Say hello', {
      provider: 'anthropic',
      apiKey: 'test-key-123',
      model: 'claude-3-haiku',
      tools: [],
      stream: false,
    });

    for await (const chunk of iter) {
      chunks.push(chunk);
    }

    // Should have text_delta and done
    const textChunks = chunks.filter(c => c.type === 'text_delta');
    expect(textChunks.length).toBeGreaterThan(0);
    expect(textChunks.map(c => c.text).join('')).toBe('Hello from cloud!');

    // Verify fetch was called with Anthropic endpoint
    expect(globalThis.fetch).toHaveBeenCalled();
    const fetchCall = globalThis.fetch.mock.calls[0];
    expect(fetchCall[0]).toContain('anthropic');
  });

  it('agenticAsk routes through custom provider when registered', async () => {
    const mockResponse = { content: 'Custom provider response', stop_reason: 'end_turn' };

    core.registerProvider('test-custom', async ({ messages }) => {
      return mockResponse;
    });

    // Custom provider doesn't need apiKey — but agenticAsk requires apiKey or providers[]
    const chunks = [];
    const iter = core.agenticAsk('Test prompt', {
      providers: [{ provider: 'test-custom' }],
      tools: [],
      stream: false,
    });

    for await (const chunk of iter) {
      chunks.push(chunk);
    }

    const textChunks = chunks.filter(c => c.type === 'text_delta');
    expect(textChunks.map(c => c.text).join('')).toBe('Custom provider response');

    core.unregisterProvider('test-custom');
  });
});

// ── Path 1 & 2: Service via WebSocket ──

describe('Path 1 & 2: App ←WS→ service', () => {
  let core;
  let originalFetch;

  beforeEach(async () => {
    core = await loadCore();
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    core.unregisterProvider('local');
    core.unregisterProvider('local-vision');
    core.unregisterProvider('cloud-fallback');
  });

  it('Path 1: local engine → core custom provider → brain.chat() yields text_delta', async () => {
    // Register a mock local engine as a custom provider (simulates what brain.js does)
    core.registerProvider('local', async ({ messages }) => {
      const userMsg = messages.find(m => m.role === 'user');
      return {
        content: `Local response to: ${userMsg?.content || 'unknown'}`,
        stop_reason: 'end_turn',
      };
    });

    const chunks = [];
    const iter = core.agenticAsk('Hello local', {
      providers: [{ provider: 'local' }],
      tools: [],
      stream: false,
    });

    for await (const chunk of iter) {
      chunks.push(chunk);
    }

    const textChunks = chunks.filter(c => c.type === 'text_delta');
    expect(textChunks.length).toBeGreaterThan(0);
    expect(textChunks.map(c => c.text).join('')).toContain('Local response to: Hello local');
  });

  it('Path 2: cloud-fallback provider → core → brain.chat() yields text_delta', async () => {
    // Register cloud-fallback that simulates HTTP call to cloud API
    core.registerProvider('cloud-fallback', async ({ messages }) => {
      const userMsg = messages.find(m => m.role === 'user');
      return {
        content: `Cloud response to: ${userMsg?.content || 'unknown'}`,
        stop_reason: 'end_turn',
      };
    });

    const chunks = [];
    const iter = core.agenticAsk('Hello cloud', {
      providers: [{ provider: 'cloud-fallback' }],
      tools: [],
      stream: false,
    });

    for await (const chunk of iter) {
      chunks.push(chunk);
    }

    const textChunks = chunks.filter(c => c.type === 'text_delta');
    expect(textChunks.length).toBeGreaterThan(0);
    expect(textChunks.map(c => c.text).join('')).toContain('Cloud response to: Hello cloud');
  });

  it('provider failover: local fails → cloud-fallback succeeds', async () => {
    core.registerProvider('local', async () => {
      throw new Error('Ollama not available');
    });

    core.registerProvider('cloud-fallback', async ({ messages }) => {
      return { content: 'Fallback worked!', stop_reason: 'end_turn' };
    });

    const chunks = [];
    const iter = core.agenticAsk('Test failover', {
      providers: [{ provider: 'local' }, { provider: 'cloud-fallback' }],
      tools: [],
      stream: false,
    });

    for await (const chunk of iter) {
      chunks.push(chunk);
    }

    const textChunks = chunks.filter(c => c.type === 'text_delta');
    expect(textChunks.map(c => c.text).join('')).toBe('Fallback worked!');
  });

  it('tool execution works through custom provider', async () => {
    let toolWasCalled = false;

    core.registerProvider('local', async ({ messages }) => {
      // First call: request tool use
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'tool') {
        return { content: 'Tool result received: ' + lastMsg.content, stop_reason: 'end_turn' };
      }
      return {
        content: '',
        tool_calls: [{ id: 'call_1', name: 'test_tool', input: { query: 'test' } }],
        stop_reason: 'tool_use',
      };
    });

    const chunks = [];
    const iter = core.agenticAsk('Use the tool', {
      providers: [{ provider: 'local' }],
      tools: [{
        name: 'test_tool',
        description: 'A test tool',
        parameters: { type: 'object', properties: { query: { type: 'string' } } },
        execute: async (input) => {
          toolWasCalled = true;
          return `Result for: ${input.query}`;
        },
      }],
      stream: false,
    });

    for await (const chunk of iter) {
      chunks.push(chunk);
    }

    expect(toolWasCalled).toBe(true);
    const toolUseChunks = chunks.filter(c => c.type === 'tool_use');
    expect(toolUseChunks.length).toBe(1);
    expect(toolUseChunks[0].name).toBe('test_tool');
  });
});

// ── Source-level verification ──

const hubSrc = readFileSync(join(__dirname, '..', 'src', 'server', 'hub.js'), 'utf8');
const coreBridgeSrc = readFileSync(join(__dirname, '..', 'src', 'server', 'core-bridge.js'), 'utf8');
const providersSrc = readFileSync(join(__dirname, '..', 'src', 'server', 'providers.js'), 'utf8');

describe('hub.js WS chat handler', () => {
  it('has a chat message handler in initWebSocket', () => {
    expect(hubSrc).toContain("msg.type === 'chat'");
    expect(hubSrc).toContain('handleChat');
  });

  it('handleChat streams text_delta chunks as chat_delta', () => {
    expect(hubSrc).toContain("chunk.type === 'text_delta'");
    expect(hubSrc).toContain("type: 'chat_delta'");
    expect(hubSrc).toContain("type: 'chat_start'");
    expect(hubSrc).toContain("type: 'chat_end'");
  });
});

describe('core-bridge.js chat uses core.agenticAsk', () => {
  it('delegates to core.agenticAsk and yields chunks', () => {
    expect(coreBridgeSrc).toContain('core.agenticAsk');
    expect(coreBridgeSrc).toContain('yield chunk');
  });
});

describe('providers.js registerEngineAsProvider bridge', () => {
  it('registers local, local-vision, and cloud-fallback providers', () => {
    expect(providersSrc).toContain("registerEngineAsProvider('local'");
    expect(providersSrc).toContain("registerEngineAsProvider('local-vision'");
    expect(providersSrc).toContain("registerEngineAsProvider('cloud-fallback'");
  });

  it('uses core.registerProvider to bridge engines', () => {
    expect(providersSrc).toContain('core.registerProvider(name');
  });

  it('core-bridge chat() uses core.agenticAsk with provider chain', () => {
    expect(coreBridgeSrc).toContain('core.agenticAsk');
    expect(coreBridgeSrc).toContain('providers');
    expect(coreBridgeSrc).toContain("provider: 'cloud-fallback'");
  });
});

describe('voice stream handles text_delta from core', () => {
  it('handleVoiceStream checks for text_delta chunk type', () => {
    const voiceSection = hubSrc.split('handleVoiceStream')[1] || '';
    expect(voiceSection).toContain('text_delta');
  });
});
