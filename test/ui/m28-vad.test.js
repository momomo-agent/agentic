import { test } from 'vitest';
// M28 VAD tests — verifies DBB-001 and DBB-002
import assert from 'node:assert';
import { describe, it, beforeEach } from 'node:test';

test('m28-vad', async () => {
let rafCallbacks = [];
global.requestAnimationFrame = (cb) => { rafCallbacks.push(cb); return rafCallbacks.length; };
global.cancelAnimationFrame = () => { rafCallbacks = []; };

let mockRMS = 0;
const mockAnalyser = {
  fftSize: 512,
  getFloatTimeDomainData(buf) { buf.fill(Math.sqrt(mockRMS)); }
};
const mockStream = { getTracks: () => [{ stop() {} }] };
const mockCtx = {
  state: 'running',
  createAnalyser: () => mockAnalyser,
  createMediaStreamSource: () => ({ connect() {} }),
  close() {}
};
global.AudioContext = class { constructor() { return mockCtx; } };
Object.defineProperty(global, 'navigator', {
  value: { mediaDevices: { getUserMedia: async () => mockStream } },
  writable: true, configurable: true
});

const { useVAD } = await import('../../src/ui/client/src/composables/useVAD.js');

function tick(n = 1) {
  for (let i = 0; i < n; i++) {
    const cbs = [...rafCallbacks];
    rafCallbacks = [];
    cbs.forEach(cb => cb());
  }
}

describe('useVAD (M28 DBB-001/002)', () => {
  beforeEach(() => { rafCallbacks = []; mockRMS = 0; });

  it('DBB-001: onStart fires after 3 consecutive frames above SPEECH_THRESHOLD', async () => {
    const events = [];
    const vad = useVAD({ onStart: () => events.push('start'), onStop: () => events.push('stop') });
    await vad.start();
    mockRMS = 0.0002; // RMS = sqrt(0.0002) ≈ 0.0141 > 0.01
    tick(3);
    assert.ok(events.includes('start'), 'onStart should fire after 3 frames above threshold');
    vad.stop();
  });

  it('DBB-001: onStart does NOT fire with only 2 consecutive frames above threshold', async () => {
    const events = [];
    const vad = useVAD({ onStart: () => events.push('start'), onStop: () => events.push('stop') });
    await vad.start();
    mockRMS = 0.0002;
    tick(2);
    assert.deepStrictEqual(events, [], 'onStart should not fire before 3 frames');
    vad.stop();
  });

  it('DBB-002: onStop fires after 500ms silence following speech', async () => {
    const events = [];
    const vad = useVAD({ onStart: () => events.push('start'), onStop: () => events.push('stop') });
    await vad.start();
    // Trigger speech start
    mockRMS = 0.0002;
    tick(3);
    assert.ok(events.includes('start'), 'precondition: speech started');
    // Go silent (RMS below SILENCE_THRESHOLD 0.005 → RMS^2 < 0.000025)
    mockRMS = 0.000001;
    tick(1); // sets silenceStart
    await new Promise(r => setTimeout(r, 510));
    tick(1); // should trigger onStop
    assert.ok(events.includes('stop'), 'onStop should fire after 500ms silence');
    vad.stop();
  });

  it('DBB-002: onStop does NOT fire before 500ms silence', async () => {
    const events = [];
    const vad = useVAD({ onStart: () => events.push('start'), onStop: () => events.push('stop') });
    await vad.start();
    mockRMS = 0.0002;
    tick(3);
    mockRMS = 0.000001;
    tick(1);
    await new Promise(r => setTimeout(r, 100));
    tick(1);
    assert.ok(!events.includes('stop'), 'onStop should not fire before 500ms');
    vad.stop();
  });

  it('consecutive frames reset when speech drops below threshold mid-count', async () => {
    const events = [];
    const vad = useVAD({ onStart: () => events.push('start'), onStop: () => events.push('stop') });
    await vad.start();
    mockRMS = 0.0002;
    tick(2); // 2 frames above
    mockRMS = 0; // drop below
    tick(1); // resets consecutiveFrames
    mockRMS = 0.0002;
    tick(2); // only 2 more — total not enough
    assert.deepStrictEqual(events, [], 'onStart should not fire if frames were interrupted');
    vad.stop();
  });

  it('getUserMedia denied → start() rejects with NotAllowedError', async () => {
    const origGetUserMedia = global.navigator.mediaDevices.getUserMedia;
    global.navigator.mediaDevices.getUserMedia = async () => {
      throw Object.assign(new Error('denied'), { name: 'NotAllowedError' });
    };
    const vad = useVAD({ onStart() {}, onStop() {} });
    await assert.rejects(() => vad.start(), err => err.name === 'NotAllowedError');
    global.navigator.mediaDevices.getUserMedia = origGetUserMedia;
  });

  it('stop() cancels animation frame and closes audio context', async () => {
    let closed = false;
    let trackStopped = false;
    const stream = { getTracks: () => [{ stop() { trackStopped = true; } }] };
    const ctx = {
      state: 'running',
      createAnalyser: () => mockAnalyser,
      createMediaStreamSource: () => ({ connect() {} }),
      close() { closed = true; }
    };
    global.AudioContext = class { constructor() { return ctx; } };
    global.navigator.mediaDevices.getUserMedia = async () => stream;
    const vad = useVAD({ onStart() {}, onStop() {} });
    await vad.start();
    vad.stop();
    assert.ok(closed, 'AudioContext.close() should be called');
    assert.ok(trackStopped, 'track.stop() should be called');
    // Restore
    global.AudioContext = class { constructor() { return mockCtx; } };
    global.navigator.mediaDevices.getUserMedia = async () => mockStream;
  });
});
});
