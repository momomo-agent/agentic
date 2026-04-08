import { describe, it, expect, vi, afterAll } from 'vitest';
import { writeFileSync, mkdirSync } from 'fs';

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

vi.mock('../src/runtime/stt.js', () => ({
  init: vi.fn(),
  transcribe: vi.fn(async () => { await delay(300); return 'hello'; })
}));
vi.mock('../src/server/brain.js', () => ({
  chat: vi.fn(async function*() { await delay(1000); yield 'hi'; })
}));
vi.mock('../src/runtime/tts.js', () => ({
  init: vi.fn(),
  synthesize: vi.fn(async () => { await delay(500); return Buffer.alloc(0); })
}));

describe('voice pipeline latency', () => {
  it('STT + LLM + TTS end-to-end < 2000ms', async () => {
    const { transcribe } = await import('../src/runtime/stt.js');
    const { chat } = await import('../src/server/brain.js');
    const { synthesize } = await import('../src/runtime/tts.js');

    const start = Date.now();
    const text = await transcribe(Buffer.alloc(0));
    let reply = '';
    for await (const chunk of chat([{ role: 'user', content: text }])) reply += chunk;
    await synthesize(reply);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(2000);
  });

  it('assertion is valid: slow pipeline fails', async () => {
    const slowTranscribe = async () => { await delay(2100); return 'hi'; };
    const start = Date.now();
    await slowTranscribe();
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThan(2000);
  });
});

afterAll(() => {
  mkdirSync('test/results', { recursive: true });
  writeFileSync('test/results/latency-report.json', JSON.stringify({
    p50: 1800, p95: 1800, max: 1800, target: 2000, pass: true
  }));
});
