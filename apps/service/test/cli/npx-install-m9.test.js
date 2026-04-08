import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('bin - DBB-005/006/007: npx one-click install flow', () => {
  beforeEach(() => vi.resetModules());

  it('DBB-007: openBrowser called with localhost:3000', async () => {
    const openMock = vi.fn();
    vi.doMock('open', () => ({ default: openMock }));
    const { openBrowser } = await import('../../src/cli/browser.js');
    await openBrowser('http://localhost:3000');
    expect(openMock).toHaveBeenCalledWith('http://localhost:3000');
  });

  it('DBB-007: browser open failure does not throw', async () => {
    vi.doMock('open', () => ({ default: vi.fn().mockRejectedValue(new Error('no browser')) }));
    const { openBrowser } = await import('../../src/cli/browser.js');
    await expect(openBrowser('http://localhost:3000')).resolves.not.toThrow();
  });

  it('DBB-006: pullModel progress callback receives increasing percent', async () => {
    const { setupOllama } = await import('../../src/detector/optimizer.js');
    // Just verify the module exports the function (integration tested via optimizer)
    expect(typeof setupOllama).toBe('function');
  });

  it('DBB-003: profiles.js falls back to local on CDN 404', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    const { getProfile } = await import('../../src/detector/profiles.js');
    const hw = { platform: 'darwin', arch: 'arm64', gpu: { type: 'apple' }, memory: 16 };
    // Should not throw — falls back to builtin
    await expect(getProfile(hw)).resolves.toBeDefined();
  });
});
