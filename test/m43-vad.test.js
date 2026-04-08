import { test } from 'vitest';
// Tests for useVAD — DBB-001: VAD auto-detects speech
// Uses Node.js module mocking via a minimal Web Audio API stub

import { strict as assert } from 'assert';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

test('m43-vad', async () => {
const __dir = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dir, '../src/ui/client/src/composables/useVAD.js'), 'utf8');

// Inject stub globals and eval the module
function makeVAD(overrides = {}) {
  const globals = {
    navigator: {
      mediaDevices: {
        getUserMedia: overrides.getUserMedia ?? (async () => ({
          getTracks: () => [{ stop: () => {} }]
        }))
      }
    },
    AudioContext: overrides.AudioContext ?? class {
      constructor() { this.state = 'running'; this.destination = {}; }
      createMediaStreamSource() { return { connect: () => {} }; }
      createScriptProcessor(bufSize, inCh, outCh) {
        const node = { connect: () => {}, disconnect: () => {}, onaudioprocess: null };
        this._node = node;
        return node;
      }
      resume() { return Promise.resolve(); }
      close() {}
    },
    document: overrides.document ?? {
      hidden: false,
      addEventListener: () => {},
      removeEventListener: () => {}
    },
    setTimeout: overrides.setTimeout ?? globalThis.setTimeout,
    clearTimeout: overrides.clearTimeout ?? globalThis.clearTimeout,
  };

  const stripped = src.replace(/^export\s+/m, '');
  const fn = new Function(...Object.keys(globals), `${stripped}; return useVAD;`);
  return fn(...Object.values(globals));
}

let passed = 0, failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name}: ${e.message}`);
    failed++;
  }
}

console.log('VAD useVAD tests');

// Test 1: onStart fires when RMS exceeds threshold
await test('onStart fires when RMS > threshold', async () => {
  let started = false;
  let audioCtxInstance;
  const AC = class {
    constructor() { this.state = 'running'; this.destination = {}; audioCtxInstance = this; }
    createMediaStreamSource() { return { connect: () => {} }; }
    createScriptProcessor() {
      const node = { connect: () => {}, disconnect: () => {}, onaudioprocess: null };
      this._node = node;
      return node;
    }
    resume() { return Promise.resolve(); }
    close() {}
  };

  const useVAD = makeVAD({ AudioContext: AC });
  const vad = useVAD({ onStart: () => { started = true; }, onStop: () => {} });
  await vad.start();

  // Simulate loud audio frame (RMS > 0.01)
  const samples = new Float32Array(2048).fill(0.1);
  audioCtxInstance._node.onaudioprocess({
    inputBuffer: { getChannelData: () => samples }
  });

  assert.equal(started, true, 'onStart should have fired');
});

// Test 2: onStop fires after silenceMs of silence
await test('onStop fires after silenceMs silence', async () => {
  let stopped = false;
  let audioCtxInstance;
  const timers = [];
  const fakeSetTimeout = (fn, ms) => { timers.push({ fn, ms }); return timers.length - 1; };
  const fakeClearTimeout = (id) => { if (timers[id]) timers[id] = null; };

  const AC = class {
    constructor() { this.state = 'running'; this.destination = {}; audioCtxInstance = this; }
    createMediaStreamSource() { return { connect: () => {} }; }
    createScriptProcessor() {
      const node = { connect: () => {}, disconnect: () => {}, onaudioprocess: null };
      this._node = node;
      return node;
    }
    resume() { return Promise.resolve(); }
    close() {}
  };

  const useVAD = makeVAD({ AudioContext: AC, setTimeout: fakeSetTimeout, clearTimeout: fakeClearTimeout });
  const vad = useVAD({ onStart: () => {}, onStop: () => { stopped = true; }, silenceMs: 1200 });
  await vad.start();

  const loud = new Float32Array(2048).fill(0.1);
  const quiet = new Float32Array(2048).fill(0);

  // Start speaking
  audioCtxInstance._node.onaudioprocess({ inputBuffer: { getChannelData: () => loud } });
  // Go silent — should schedule timer
  audioCtxInstance._node.onaudioprocess({ inputBuffer: { getChannelData: () => quiet } });

  assert.equal(timers.length, 1, 'silence timer should be scheduled');
  assert.equal(timers[0].ms, 1200, 'timer should use silenceMs');

  // Fire the timer
  timers[0].fn();
  assert.equal(stopped, true, 'onStop should have fired after silence timer');
});

// Test 3: Multiple start() calls are guarded
await test('multiple start() calls are no-ops', async () => {
  let callCount = 0;
  const AC = class {
    constructor() { this.state = 'running'; this.destination = {}; callCount++; }
    createMediaStreamSource() { return { connect: () => {} }; }
    createScriptProcessor() { return { connect: () => {}, disconnect: () => {}, onaudioprocess: null }; }
    resume() { return Promise.resolve(); }
    close() {}
  };

  const useVAD = makeVAD({ AudioContext: AC });
  const vad = useVAD({ onStart: () => {}, onStop: () => {} });
  await vad.start();
  await vad.start();
  await vad.start();

  assert.equal(callCount, 1, 'AudioContext should only be created once');
});

// Test 4: stop() cleans up
await test('stop() disconnects and closes AudioContext', async () => {
  let closed = false, disconnected = false;
  let audioCtxInstance;
  const AC = class {
    constructor() { this.state = 'running'; this.destination = {}; audioCtxInstance = this; }
    createMediaStreamSource() { return { connect: () => {} }; }
    createScriptProcessor() {
      const node = { connect: () => {}, disconnect: () => { disconnected = true; }, onaudioprocess: null };
      this._node = node;
      return node;
    }
    resume() { return Promise.resolve(); }
    close() { closed = true; }
  };

  const useVAD = makeVAD({ AudioContext: AC });
  const vad = useVAD({ onStart: () => {}, onStop: () => {} });
  await vad.start();
  vad.stop();

  assert.equal(disconnected, true, 'processor should be disconnected');
  assert.equal(closed, true, 'AudioContext should be closed');
});

// Test 5: NotAllowedError propagates
await test('NotAllowedError from getUserMedia propagates', async () => {
  const useVAD = makeVAD({
    getUserMedia: async () => { throw new DOMException('Permission denied', 'NotAllowedError'); }
  });
  const vad = useVAD({ onStart: () => {}, onStop: () => {} });
  await assert.rejects(() => vad.start(), /Permission denied/);
});

// Test 6: suspended AudioContext is resumed
await test('suspended AudioContext calls resume()', async () => {
  let resumed = false;
  let audioCtxInstance;
  const AC = class {
    constructor() { this.state = 'suspended'; this.destination = {}; audioCtxInstance = this; }
    createMediaStreamSource() { return { connect: () => {} }; }
    createScriptProcessor() { return { connect: () => {}, disconnect: () => {}, onaudioprocess: null }; }
    resume() { resumed = true; return Promise.resolve(); }
    close() {}
  };

  const useVAD = makeVAD({ AudioContext: AC });
  const vad = useVAD({ onStart: () => {}, onStop: () => {} });
  await vad.start();

  assert.equal(resumed, true, 'resume() should be called for suspended context');
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
});
