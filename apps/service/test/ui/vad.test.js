import { test } from 'vitest';
// Tests for useVAD composable
import assert from 'node:assert';
import { describe, it, beforeEach } from 'node:test';

// ─── Mock browser globals ─────────────────────────────────────────────────────

test('vad', async () => {
let rafCallbacks = [];
global.requestAnimationFrame = (cb) => { rafCallbacks.push(cb); return rafCallbacks.length; };
global.cancelAnimationFrame = () => { rafCallbacks = []; };

let mockRMS = 0;
const mockAnalyser = {
  fftSize: 2048,
  getFloatTimeDomainData(buf) {
    // Fill buffer to produce desired RMS
    const val = Math.sqrt(mockRMS);
    buf.fill(val);
  }
};

const mockStream = { getTracks: () => [{ stop() {} }] };
const mockCtx = {
  createAnalyser: () => mockAnalyser,
  createMediaStreamSource: () => ({ connect() {} }),
  close() {}
};

global.AudioContext = class { constructor() { return mockCtx; } };
Object.defineProperty(global, 'navigator', {
  value: { mediaDevices: { getUserMedia: async () => mockStream } },
  writable: true, configurable: true
});

// ─── Import useVAD ────────────────────────────────────────────────────────────

const { useVAD } = await import('../../src/ui/client/src/composables/useVAD.js');

function tick() {
  const cbs = [...rafCallbacks];
  rafCallbacks = [];
  cbs.forEach(cb => cb());
}

describe('useVAD', () => {
  beforeEach(() => { rafCallbacks = []; mockRMS = 0; });

  it('calls onStart when RMS exceeds threshold', async () => {
    const events = [];
    const vad = useVAD({ onStart: () => events.push('start'), onStop: () => events.push('stop') });
    await vad.start();
    mockRMS = 0.0002; // above default threshold 0.01^2 = 0.0001
    tick();
    assert.ok(events.includes('start'), 'onStart should be called');
    vad.stop();
  });

  it('does not call onStart when RMS below threshold', async () => {
    const events = [];
    const vad = useVAD({ onStart: () => events.push('start'), onStop: () => events.push('stop') });
    await vad.start();
    mockRMS = 0; // silence
    tick();
    assert.deepStrictEqual(events, []);
    vad.stop();
  });

  it('calls onStop after silenceMs when speech ends', async () => {
    const events = [];
    const vad = useVAD({ onStart: () => events.push('start'), onStop: () => events.push('stop'), silenceMs: 10 });
    await vad.start();
    // Trigger speech
    mockRMS = 0.0002;
    tick();
    assert.ok(events.includes('start'));
    // Go silent
    mockRMS = 0;
    tick();
    await new Promise(r => setTimeout(r, 50));
    assert.ok(events.includes('stop'), 'onStop should be called after silence');
    vad.stop();
  });

  it('stop() cleans up stream tracks and closes context', async () => {
    let trackStopped = false;
    let ctxClosed = false;
    const stream = { getTracks: () => [{ stop() { trackStopped = true; } }] };
    const ctx = { createAnalyser: () => mockAnalyser, createMediaStreamSource: () => ({ connect() {} }), close() { ctxClosed = true; } };
    global.AudioContext = class { constructor() { return ctx; } };
    global.navigator.mediaDevices.getUserMedia = async () => stream;

    const vad = useVAD({ onStart() {}, onStop() {} });
    await vad.start();
    vad.stop();
    assert.ok(trackStopped, 'track.stop() should be called');
    assert.ok(ctxClosed, 'ctx.close() should be called');
  });

  it('handles getUserMedia failure gracefully (NotAllowedError)', async () => {
    global.navigator.mediaDevices.getUserMedia = async () => { throw Object.assign(new Error('denied'), { name: 'NotAllowedError' }); };
    const vad = useVAD({ onStart() {}, onStop() {} });
    await assert.rejects(() => vad.start(), err => err.name === 'NotAllowedError');
    // Restore
    global.navigator.mediaDevices.getUserMedia = async () => mockStream;
  });
});
});
