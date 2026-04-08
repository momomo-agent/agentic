import { test } from 'vitest';
// Tests for VAD (Voice Activity Detection) - task-1775517321148
// Tests useVAD composable logic by simulating AudioContext behavior

import assert from 'assert';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

test('m30-vad', async () => {
const __dir = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dir, '../src/ui/client/src/composables/useVAD.js'), 'utf8');

// Extract the function body and evaluate in a controlled environment
// We'll test the logic by creating a mock environment

function createMockEnv() {
  const events = {};
  const mockDoc = {
    hidden: false,
    addEventListener: (e, fn) => { events[e] = fn; },
    removeEventListener: (e) => { delete events[e]; },
    _trigger: (e) => events[e] && events[e](),
  };

  let processorCallback = null;
  const mockProcessor = {
    onaudioprocess: null,
    connect: () => {},
    disconnect: () => {},
    set onaudioprocess(fn) { processorCallback = fn; },
    get onaudioprocess() { return processorCallback; },
    _process: (samples) => processorCallback && processorCallback({
      inputBuffer: { getChannelData: () => samples }
    }),
  };

  const mockCtx = {
    createMediaStreamSource: () => ({ connect: () => {} }),
    createScriptProcessor: () => mockProcessor,
    close: () => {},
    destination: null,
  };

  const mockStream = { getTracks: () => [{ stop: () => {} }] };

  return { mockDoc, mockProcessor, mockCtx, mockStream, events };
}

// Build useVAD with injected globals
function buildUseVAD(env) {
  const { mockDoc, mockCtx, mockStream } = env;
  const code = src
    .replace('export function', 'function')
    + '\nexport { useVAD };';

  // Use Function constructor to inject globals
  const fn = new Function(
    'navigator', 'AudioContext', 'document',
    src.replace('export function useVAD', 'return function useVAD')
  );

  const navigator = {
    mediaDevices: { getUserMedia: async () => mockStream }
  };
  const AudioContext = function() { return mockCtx; };

  return fn(navigator, AudioContext, mockDoc);
}

// --- Tests ---

let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name}: ${e.message}`);
    failed++;
    failures.push({ name, error: e.message });
  }
}

console.log('VAD useVAD composable tests\n');

// Test 1: RMS above threshold triggers onStart once
await test('RMS above threshold calls onStart once', async () => {
  const env = createMockEnv();
  const useVAD = buildUseVAD(env);
  let startCount = 0;
  const vad = useVAD({ onStart: () => startCount++, onStop: () => {} });
  await vad.start();

  // Simulate loud audio (RMS > 0.01)
  const loud = new Float32Array(4096).fill(0.1);
  env.mockProcessor._process(loud);
  env.mockProcessor._process(loud); // second call should not re-trigger
  assert.strictEqual(startCount, 1, `Expected onStart called once, got ${startCount}`);
  vad.stop();
});

// Test 2: Silence after speech triggers onStop after silenceMs
await test('Silence after speech calls onStop after silenceMs', async () => {
  const env = createMockEnv();
  const useVAD = buildUseVAD(env);
  let stopped = false;
  const vad = useVAD({ onStart: () => {}, onStop: () => { stopped = true; }, silenceMs: 50 });
  await vad.start();

  // Start recording
  const loud = new Float32Array(4096).fill(0.1);
  env.mockProcessor._process(loud);
  // Wait for MIN_DURATION (300ms) to pass before going silent
  await new Promise(r => setTimeout(r, 350));
  const quiet = new Float32Array(4096).fill(0.001);
  env.mockProcessor._process(quiet);
  // Wait for silenceMs (50ms) timer to fire
  await new Promise(r => setTimeout(r, 100));
  assert.strictEqual(stopped, true, 'Expected onStop to be called after silence');
  vad.stop();
});

// Test 3: Background noise below threshold does not trigger onStart
await test('Background noise below threshold does not trigger onStart', async () => {
  const env = createMockEnv();
  const useVAD = buildUseVAD(env);
  let startCount = 0;
  const vad = useVAD({ onStart: () => startCount++, onStop: () => {} });
  await vad.start();

  // Simulate quiet background (RMS < 0.01)
  const quiet = new Float32Array(4096).fill(0.005);
  env.mockProcessor._process(quiet);
  env.mockProcessor._process(quiet);
  assert.strictEqual(startCount, 0, 'Expected no onStart for background noise');
  vad.stop();
});

// Test 4: Page hidden stops recording
await test('Page hidden triggers onStop when recording', async () => {
  const env = createMockEnv();
  const useVAD = buildUseVAD(env);
  let stopped = false;
  const vad = useVAD({ onStart: () => {}, onStop: () => { stopped = true; } });
  await vad.start();

  // Start recording
  const loud = new Float32Array(4096).fill(0.1);
  env.mockProcessor._process(loud);
  assert.strictEqual(vad.isActive, true, 'Should be recording');

  // Simulate page hidden
  env.mockDoc.hidden = true;
  env.mockDoc._trigger('visibilitychange');
  assert.strictEqual(stopped, true, 'Expected onStop on page hidden');
  assert.strictEqual(vad.isActive, false, 'Should not be recording after page hidden');
  vad.stop();
});

// Test 5: stop() tears down and isActive returns false
await test('stop() tears down AudioContext and isActive is false', async () => {
  const env = createMockEnv();
  const useVAD = buildUseVAD(env);
  const vad = useVAD({ onStart: () => {}, onStop: () => {} });
  await vad.start();

  const loud = new Float32Array(4096).fill(0.1);
  env.mockProcessor._process(loud);
  assert.strictEqual(vad.isActive, true);

  vad.stop();
  assert.strictEqual(vad.isActive, false, 'isActive should be false after stop()');
});

// Test 6: Mic permission denied - getUserMedia throws
await test('Mic denied - start() throws, no crash', async () => {
  const env = createMockEnv();
  env.mockStream = null;
  const navigator = { mediaDevices: { getUserMedia: async () => { throw new Error('Permission denied'); } } };
  const AudioContext = function() { return env.mockCtx; };
  const fn = new Function('navigator', 'AudioContext', 'document',
    src.replace('export function useVAD', 'return function useVAD')
  );
  const useVAD = fn(navigator, AudioContext, env.mockDoc);
  const vad = useVAD({ onStart: () => {}, onStop: () => {} });
  await assert.rejects(() => vad.start(), /Permission denied/);
});

// Summary
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failures.length) {
  console.log('\nFailures:');
  failures.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
  process.exit(1);
}
});
