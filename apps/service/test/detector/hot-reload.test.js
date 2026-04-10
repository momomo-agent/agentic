import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Tests for config hot-reload — DBB-005

const origFetch = globalThis.fetch;

describe('config hot-reload (DBB-005)', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => {
    globalThis.fetch = origFetch;
  });

  it('watchProfiles is a function', async () => {
    const { watchProfiles } = await import('../../src/detector/profiles.js');
    expect(typeof watchProfiles).toBe('function');
  });

  it('watchProfiles returns a stop function', async () => {
    globalThis.fetch = async () => ({ status: 304 });
    const { watchProfiles } = await import('../../src/detector/profiles.js');
    const stop = watchProfiles({}, () => {}, 100000);
    expect(typeof stop).toBe('function');
    stop();
  });

  it('calls onReload on new profile', async () => {
    const newProfile = { llm: { model: 'new-model' }, stt: {}, tts: {}, fallback: {} };
    const profiles = { profiles: [{ match: {}, config: newProfile }] };

    let reloaded = null;
    globalThis.fetch = async () => ({
      status: 200,
      ok: true,
      headers: { get: () => 'etag-1' },
      json: async () => profiles,
    });

    const { watchProfiles } = await import('../../src/detector/profiles.js');
    const stop = watchProfiles({}, (p) => { reloaded = p; }, 50);
    await new Promise(r => setTimeout(r, 120));
    stop();
    expect(reloaded).not.toBeNull();
  });

  it('304 response does not trigger onReload', async () => {
    let callCount = 0;
    globalThis.fetch = async () => ({ status: 304 });

    const { watchProfiles } = await import('../../src/detector/profiles.js');
    const stop = watchProfiles({}, () => { callCount++; }, 50);
    await new Promise(r => setTimeout(r, 120));
    stop();
    expect(callCount).toBe(0);
  });

  it('network error does not crash', async () => {
    globalThis.fetch = async () => { throw new Error('network down'); };
    const { watchProfiles } = await import('../../src/detector/profiles.js');
    const stop = watchProfiles({}, () => {}, 50);
    await new Promise(r => setTimeout(r, 120));
    stop();
    // if we reach here, no crash
  });

  it('stop() cancels further polling', async () => {
    let callCount = 0;
    globalThis.fetch = async () => {
      callCount++;
      return { status: 304 };
    };
    const { watchProfiles } = await import('../../src/detector/profiles.js');
    const stop = watchProfiles({}, () => {}, 50);
    await new Promise(r => setTimeout(r, 80));
    const countAtStop = callCount;
    stop();
    await new Promise(r => setTimeout(r, 120));
    expect(callCount).toBe(countAtStop);
  });
});
