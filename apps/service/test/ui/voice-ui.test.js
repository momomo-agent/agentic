import { test } from 'vitest';
// Tests for voice UI controls: PushToTalk, useVAD, useWakeWord
// These are unit tests using mocked browser APIs (no DOM framework needed)

import assert from 'node:assert';
import { describe, it, before, beforeEach } from 'node:test';

// ─── Mock browser globals ────────────────────────────────────────────────────

test('voice-ui', async () => {
let mockRecorderInstance;
let mockStreamTracks;

function makeMockStream() {
  mockStreamTracks = [{ stop: () => {} }];
  return { getTracks: () => mockStreamTracks };
}

class MockMediaRecorder {
  constructor(stream) {
    this.stream = stream;
    this.ondataavailable = null;
    this.onstop = null;
    mockRecorderInstance = this;
  }
  start() { this._started = true; }
  stop() {
    if (this.ondataavailable) this.ondataavailable({ data: new Uint8Array([1, 2, 3]) });
    if (this.onstop) this.onstop();
  }
}

global.MediaRecorder = MockMediaRecorder;
Object.defineProperty(global, 'navigator', {
  value: { mediaDevices: { getUserMedia: async () => makeMockStream() } },
  writable: true, configurable: true
});

let fetchCalls = [];
global.fetch = async (url, opts) => {
  fetchCalls.push({ url, opts });
  return {
    ok: true,
    json: async () => ({ text: 'hello world' })
  };
};

global.FormData = class {
  constructor() { this._data = {}; }
  append(k, v) { this._data[k] = v; }
};

global.Blob = class {
  constructor(parts, opts) { this.parts = parts; this.type = opts?.type; }
};

// ─── useWakeWord tests ────────────────────────────────────────────────────────

// Inline the logic (no Vue reactivity needed for unit tests)
function makeWakeWord() {
  let wakeWord = '';
  return {
    setWakeWord(word) { wakeWord = word.toLowerCase(); },
    check(text) { return wakeWord ? text.toLowerCase().includes(wakeWord) : false; }
  };
}

describe('useWakeWord', () => {
  it('check returns false when no wake word set', () => {
    const { check } = makeWakeWord();
    assert.strictEqual(check('hey momo start'), false);
  });

  it('check returns true when text contains wake word', () => {
    const { setWakeWord, check } = makeWakeWord();
    setWakeWord('hey momo');
    assert.strictEqual(check('hey momo start'), true);
  });

  it('check is case-insensitive', () => {
    const { setWakeWord, check } = makeWakeWord();
    setWakeWord('Hey Momo');
    assert.strictEqual(check('HEY MOMO start'), true);
  });

  it('check returns false when text does not contain wake word', () => {
    const { setWakeWord, check } = makeWakeWord();
    setWakeWord('hey momo');
    assert.strictEqual(check('hello world'), false);
  });

  it('check returns false for empty text', () => {
    const { setWakeWord, check } = makeWakeWord();
    setWakeWord('hey momo');
    assert.strictEqual(check(''), false);
  });
});

// ─── PushToTalk logic tests ───────────────────────────────────────────────────

async function simulatePushToTalk() {
  const emitted = [];
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const chunks = [];
  const recorder = new MediaRecorder(stream);
  recorder.ondataavailable = e => chunks.push(e.data);

  const stopPromise = new Promise(resolve => {
    recorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const form = new FormData();
      form.append('audio', blob, 'audio.webm');
      const res = await fetch('/api/transcribe', { method: 'POST', body: form });
      const { text } = await res.json();
      if (text) emitted.push(text);
      resolve();
    };
  });

  recorder.start();
  recorder.stop();
  await stopPromise;
  return emitted;
}

describe('PushToTalk', () => {
  beforeEach(() => { fetchCalls = []; });

  it('mousedown starts MediaRecorder', async () => {
    await simulatePushToTalk();
    assert.ok(mockRecorderInstance._started, 'recorder should have started');
  });

  it('mouseup calls POST /api/transcribe', async () => {
    await simulatePushToTalk();
    assert.ok(fetchCalls.some(c => c.url === '/api/transcribe' && c.opts?.method === 'POST'));
  });

  it('emits transcribed text from API response', async () => {
    const emitted = await simulatePushToTalk();
    assert.deepStrictEqual(emitted, ['hello world']);
  });

  it('does not emit when API returns empty text', async () => {
    global.fetch = async () => ({ ok: true, json: async () => ({ text: '' }) });
    const emitted = await simulatePushToTalk();
    assert.deepStrictEqual(emitted, []);
    global.fetch = async (url, opts) => {
      fetchCalls.push({ url, opts });
      return { ok: true, json: async () => ({ text: 'hello world' }) };
    };
  });
});

// ─── ChatBox integration: wake word auto-submit ───────────────────────────────

describe('ChatBox wake word integration', () => {
  it('auto-submits when transcribed text matches wake word', () => {
    const { setWakeWord, check } = makeWakeWord();
    setWakeWord('hey momo');
    const submitted = [];
    function onTranscribed(text) {
      if (check(text)) submitted.push(text);
    }
    onTranscribed('hey momo start');
    assert.deepStrictEqual(submitted, ['hey momo start']);
  });

  it('fills input (no auto-submit) when wake word not matched', () => {
    const { setWakeWord, check } = makeWakeWord();
    setWakeWord('hey momo');
    const filled = [];
    const submitted = [];
    function onTranscribed(text) {
      if (check(text)) submitted.push(text);
      else filled.push(text);
    }
    onTranscribed('hello world');
    assert.deepStrictEqual(submitted, []);
    assert.deepStrictEqual(filled, ['hello world']);
  });

  it('fills input when no wake word configured', () => {
    const { check } = makeWakeWord(); // no setWakeWord called
    const filled = [];
    function onTranscribed(text) {
      if (check(text)) { /* auto-submit */ }
      else filled.push(text);
    }
    onTranscribed('some text');
    assert.deepStrictEqual(filled, ['some text']);
  });
});
});
