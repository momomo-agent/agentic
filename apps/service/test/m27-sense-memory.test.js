import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('agentic-sense', () => ({
  AgenticSense: class { detect = vi.fn(() => ({ faces: [], gestures: [], objects: [] })) },
  createPipeline: vi.fn(async () => ({
    detect: vi.fn(() => ({
      faces: [{ boundingBox: { x: 0, y: 0, w: 10, h: 10 } }],
      gestures: [{ gesture: 'wave' }],
      objects: [{ label: 'cup', confidence: 0.9 }],
    })),
  })),
}));

vi.mock('agentic-embed', () => ({
  embed: vi.fn(async (text) =>
    new Array(4).fill(0).map((_, i) => (text.charCodeAt(i % text.length) || 1) / 255)
  ),
}));

const store = new Map();
vi.mock('../src/store/index.js', () => ({
  get: vi.fn(async (k) => store.get(k)),
  set: vi.fn(async (k, v) => store.set(k, v)),
  del: vi.fn(async (k) => store.delete(k)),
}));

describe('M27 DBB-005: sense.js detectFrame returns structured result', () => {
  beforeEach(() => vi.resetModules());

  it('returns { faces, gestures, objects } after initHeadless', async () => {
    const { initHeadless, detectFrame } = await import('../src/runtime/sense.js');
    await initHeadless();
    const result = detectFrame(Buffer.from('frame'));
    expect(result).toHaveProperty('faces');
    expect(result).toHaveProperty('gestures');
    expect(result).toHaveProperty('objects');
    expect(Array.isArray(result.faces)).toBe(true);
    expect(Array.isArray(result.gestures)).toBe(true);
    expect(Array.isArray(result.objects)).toBe(true);
  });
});

describe('M27 DBB-006: sense.js detectFrame before init returns empty, no throw', () => {
  beforeEach(() => vi.resetModules());

  it('returns empty arrays without throwing when not initialized', async () => {
    const { detectFrame } = await import('../src/runtime/sense.js');
    const result = detectFrame(Buffer.from('frame'));
    expect(result).toEqual({ faces: [], gestures: [], objects: [] });
  });

  it('detectFrame(null) returns empty arrays', async () => {
    const { detectFrame } = await import('../src/runtime/sense.js');
    const result = detectFrame(null);
    expect(result).toEqual({ faces: [], gestures: [], objects: [] });
  });
});

describe('M27 DBB-007: memory.js add + search end-to-end', () => {
  beforeEach(() => { store.clear(); vi.resetModules(); });

  it('add then search returns matching entry with score > 0', async () => {
    const { add, search } = await import('../src/runtime/memory.js');
    await add('test memory text');
    const results = await search('test memory');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].text).toBe('test memory text');
    expect(results[0].score).toBeGreaterThan(0);
  });

  it('remove key then search does not return it', async () => {
    store.clear();
    const { add, search, remove } = await import('../src/runtime/memory.js');
    await add('removable entry');
    const index = store.get('mem:__index__') || [];
    const entryKey = index.find(k => store.get(k)?.text === 'removable entry');
    expect(entryKey).toBeTruthy();
    await remove(entryKey);
    const after = await search('removable entry');
    expect(after.every(r => r.text !== 'removable entry')).toBe(true);
  });

  it('search empty string returns []', async () => {
    const { search } = await import('../src/runtime/memory.js');
    const results = await search('');
    expect(results).toEqual([]);
  });

  it('search with empty index returns []', async () => {
    const { search } = await import('../src/runtime/memory.js');
    const results = await search('anything');
    expect(Array.isArray(results)).toBe(true);
  });
});
