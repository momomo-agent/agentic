import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const CACHE_DIR = path.join(os.homedir(), '.agentic-service');
const CACHE_FILE = path.join(CACHE_DIR, 'profiles.json');
const DAY = 24 * 60 * 60 * 1000;

async function writeCache(data, timestamp) {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(CACHE_FILE, JSON.stringify({ data, timestamp }));
}

async function removeCache() {
  try { await fs.unlink(CACHE_FILE); } catch {}
}

describe('M28 DBB-005: CDN profiles cache expired → fetch and refresh', () => {
  beforeEach(async () => {
    vi.resetModules();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: 'remote', profiles: [] })
    });
    await writeCache({ version: 'old', profiles: [] }, Date.now() - 8 * DAY);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await removeCache();
  });

  it('calls fetch when cache is older than 7 days', async () => {
    const { getProfile } = await import('../src/detector/profiles.js');
    await getProfile({ platform: 'darwin', arch: 'arm64', gpu: { type: 'apple' }, memory: 8 }).catch(() => {});
    expect(global.fetch).toHaveBeenCalled();
  });

  it('updates cache timestamp after successful fetch', async () => {
    const before = Date.now();
    const { getProfile } = await import('../src/detector/profiles.js');
    await getProfile({ platform: 'darwin', arch: 'arm64', gpu: { type: 'apple' }, memory: 8 }).catch(() => {});
    const content = JSON.parse(await fs.readFile(CACHE_FILE, 'utf-8'));
    expect(content.timestamp).toBeGreaterThanOrEqual(before);
    expect(content.data.version).toBe('remote');
  });
});

describe('M28 DBB-006: CDN profiles cache fresh → no fetch', () => {
  beforeEach(async () => {
    vi.resetModules();
    global.fetch = vi.fn();
    await writeCache({ version: 'cached', profiles: [] }, Date.now() - 1 * DAY);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await removeCache();
  });

  it('does not call fetch when cache is within 7 days', async () => {
    const { getProfile } = await import('../src/detector/profiles.js');
    await getProfile({ platform: 'darwin', arch: 'arm64', gpu: { type: 'apple' }, memory: 8 }).catch(() => {});
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('M28 DBB-005 edge: fetch fails + no cache → builtin', () => {
  beforeEach(async () => {
    vi.resetModules();
    global.fetch = vi.fn().mockRejectedValue(new Error('network error'));
    await removeCache();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
  });

  it('falls back to builtin profiles when fetch fails and no cache exists', async () => {
    const { getProfile } = await import('../src/detector/profiles.js');
    // Should not throw — falls back to builtin
    await expect(getProfile({ platform: 'darwin', arch: 'arm64', gpu: { type: 'apple' }, memory: 8 })).resolves.toBeDefined();
  });
});

describe('M28 DBB-005 edge: fetch fails + expired cache → use expired cache', () => {
  beforeEach(async () => {
    vi.resetModules();
    global.fetch = vi.fn().mockRejectedValue(new Error('network error'));
    // Write expired cache with valid profile data so matchProfile can succeed
    await writeCache({ version: 'expired', profiles: [{ match: {}, config: { llm: {}, stt: {}, tts: {}, fallback: {} } }] }, Date.now() - 8 * DAY);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await removeCache();
  });

  it('uses expired cache as fallback when fetch fails', async () => {
    const { getProfile } = await import('../src/detector/profiles.js');
    // Should not throw — expired cache is used as fallback
    await expect(getProfile({ platform: 'darwin', arch: 'arm64', gpu: { type: 'apple' }, memory: 8 })).resolves.toBeDefined();
  });
});
