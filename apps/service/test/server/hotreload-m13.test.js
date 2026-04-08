import { describe, it, expect, vi } from 'vitest';
import { watchProfiles } from '../../src/detector/profiles.js';

const HARDWARE = { platform: 'linux', arch: 'x64', gpu: { type: 'none' }, memory: 8 };
const GOOD_DATA = { profiles: [{ match: { platform: 'linux' }, config: { llm: { model: 'new-model' } } }] };

describe('profiles.js watchProfiles M13 DBB-008/009', () => {
  it('DBB-008: remote profiles change → onReload fires', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: true, status: 200,
      headers: { get: () => 'etag-1' },
      json: async () => GOOD_DATA
    });
    const onReload = vi.fn();
    const stop = watchProfiles(HARDWARE, onReload, 50);
    await new Promise(r => setTimeout(r, 200));
    stop();
    globalThis.fetch = orig;
    expect(onReload).toHaveBeenCalled();
  });

  it('DBB-008: 304 Not Modified → onReload not called', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = async () => ({ ok: true, status: 304, headers: { get: () => null } });
    const onReload = vi.fn();
    const stop = watchProfiles({}, onReload, 50);
    await new Promise(r => setTimeout(r, 200));
    stop();
    globalThis.fetch = orig;
    expect(onReload).not.toHaveBeenCalled();
  });

  it('DBB-009: malformed JSON → error swallowed, onReload not called', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: true, status: 200,
      headers: { get: () => 'etag-2' },
      json: async () => { throw new SyntaxError('bad json'); }
    });
    const onReload = vi.fn();
    const stop = watchProfiles({}, onReload, 50);
    await new Promise(r => setTimeout(r, 200));
    stop();
    globalThis.fetch = orig;
    expect(onReload).not.toHaveBeenCalled();
  });

  it('DBB-009: network error → error swallowed, onReload not called', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = async () => { throw new Error('network failure'); };
    const onReload = vi.fn();
    const stop = watchProfiles({}, onReload, 50);
    await new Promise(r => setTimeout(r, 200));
    stop();
    globalThis.fetch = orig;
    expect(onReload).not.toHaveBeenCalled();
  });
});
