import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory KV store mock
let kvStore = {};

vi.mock('../src/store/index.js', () => ({
  get: vi.fn(async (key) => {
    const val = kvStore[key];
    return val === undefined ? null : val;
  }),
  set: vi.fn(async (key, value) => {
    kvStore[key] = value;
  }),
  del: vi.fn(async (key) => {
    delete kvStore[key];
  }),
}));

// Deterministic embed mock: simple hash-based vector
vi.mock('../src/runtime/embed.js', () => ({
  embed: vi.fn(async (text) => {
    if (typeof text !== 'string') throw new TypeError('text must be a string');
    if (text === '') return [];
    // Produce a simple 3-dimensional vector from the text
    const hash = [...text].reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return [Math.sin(hash), Math.cos(hash), Math.sin(hash * 2)];
  }),
}));

let memory;

beforeEach(async () => {
  kvStore = {};
  vi.clearAllMocks();
  // Re-import to get fresh module state
  memory = await import('../src/runtime/memory.js');
});

describe('memory.js — semantic memory API', () => {
  describe('add()', () => {
    it('returns a string id', async () => {
      const id = await memory.add('hello world');
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('stores entry in KV store', async () => {
      const id = await memory.add('hello world');
      const entry = kvStore[`memory:${id}`];
      expect(entry).toBeDefined();
      expect(entry.text).toBe('hello world');
      expect(Array.isArray(entry.vector)).toBe(true);
      expect(entry.createdAt).toBeTypeOf('number');
    });

    it('updates the index', async () => {
      const id = await memory.add('hello world');
      const index = kvStore['memory:__index'];
      expect(Array.isArray(index)).toBe(true);
      expect(index).toContain(id);
    });

    it('accepts optional metadata', async () => {
      const id = await memory.add('hello', { source: 'test' });
      const entry = kvStore[`memory:${id}`];
      expect(entry.metadata).toEqual({ source: 'test' });
    });

    it('defaults metadata to empty object', async () => {
      const id = await memory.add('hello');
      const entry = kvStore[`memory:${id}`];
      expect(entry.metadata).toEqual({});
    });

    it('throws TypeError for non-string input', async () => {
      await expect(memory.add(123)).rejects.toThrow(TypeError);
    });

    it('handles empty string (stores entry with empty vector)', async () => {
      const id = await memory.add('');
      const entry = kvStore[`memory:${id}`];
      expect(entry.vector).toEqual([]);
    });

    it('adds multiple entries to the index', async () => {
      const id1 = await memory.add('first');
      const id2 = await memory.add('second');
      const index = kvStore['memory:__index'];
      expect(index).toContain(id1);
      expect(index).toContain(id2);
      expect(index.length).toBe(2);
    });
  });

  describe('search()', () => {
    it('returns empty array on empty store', async () => {
      const results = await memory.search('anything');
      expect(results).toEqual([]);
    });

    it('returns matching entries with scores', async () => {
      await memory.add('hello world');
      const results = await memory.search('hello world');
      expect(results.length).toBe(1);
      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('text', 'hello world');
      expect(results[0]).toHaveProperty('score');
      expect(typeof results[0].score).toBe('number');
    });

    it('respects topK parameter', async () => {
      await memory.add('one');
      await memory.add('two');
      await memory.add('three');
      const results = await memory.search('test', 1);
      expect(results.length).toBe(1);
    });

    it('defaults topK to 5', async () => {
      for (let i = 0; i < 7; i++) {
        await memory.add(`entry ${i}`);
      }
      const results = await memory.search('test');
      expect(results.length).toBe(5);
    });

    it('returns results sorted by score descending', async () => {
      await memory.add('alpha');
      await memory.add('beta');
      await memory.add('gamma');
      const results = await memory.search('query');
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it('includes metadata in results', async () => {
      await memory.add('tagged', { tag: 'important' });
      const results = await memory.search('tagged');
      expect(results[0].metadata).toEqual({ tag: 'important' });
    });

    it('does not include vector in results', async () => {
      await memory.add('hello');
      const results = await memory.search('hello');
      expect(results[0]).not.toHaveProperty('vector');
    });

    it('skips entries that were deleted from store but still in index', async () => {
      const id = await memory.add('hello');
      // Manually delete the entry but leave index intact
      delete kvStore[`memory:${id}`];
      const results = await memory.search('hello');
      expect(results.length).toBe(0);
    });
  });

  describe('remove()', () => {
    it('removes entry from store', async () => {
      const id = await memory.add('hello');
      await memory.remove(id);
      expect(kvStore[`memory:${id}`]).toBeUndefined();
    });

    it('removes id from index', async () => {
      const id = await memory.add('hello');
      await memory.remove(id);
      const index = kvStore['memory:__index'];
      expect(index).not.toContain(id);
    });

    it('is safe to remove nonexistent id', async () => {
      await expect(memory.remove('nonexistent')).resolves.not.toThrow();
    });

    it('does not affect other entries', async () => {
      const id1 = await memory.add('first');
      const id2 = await memory.add('second');
      await memory.remove(id1);
      expect(kvStore[`memory:${id2}`]).toBeDefined();
      const index = kvStore['memory:__index'];
      expect(index).toContain(id2);
      expect(index).not.toContain(id1);
    });
  });

  describe('clear()', () => {
    it('removes all entries and index', async () => {
      await memory.add('one');
      await memory.add('two');
      await memory.clear();
      expect(kvStore['memory:__index']).toBeUndefined();
      // All memory:* keys should be gone
      const memKeys = Object.keys(kvStore).filter(k => k.startsWith('memory:'));
      expect(memKeys.length).toBe(0);
    });

    it('is safe to clear empty store', async () => {
      await expect(memory.clear()).resolves.not.toThrow();
    });
  });

  describe('cosineSimilarity edge cases (via search)', () => {
    it('handles identical queries (score should be 1 or close)', async () => {
      await memory.add('exact match');
      const results = await memory.search('exact match');
      // Same text → same vector → cosine similarity = 1
      expect(results[0].score).toBeCloseTo(1, 5);
    });

    it('search with empty-vector entry returns score 0 (denom guard)', async () => {
      await memory.add('');  // empty vector
      const results = await memory.search('something');
      expect(results.length).toBe(1);
      expect(results[0].score).toBe(0);
    });
  });

  describe('lifecycle', () => {
    it('add → search → remove → search returns empty', async () => {
      const id = await memory.add('lifecycle test');
      let results = await memory.search('lifecycle');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe(id);

      await memory.remove(id);
      results = await memory.search('lifecycle');
      expect(results).toEqual([]);
    });

    it('multiple adds with same text create separate entries', async () => {
      const id1 = await memory.add('duplicate');
      const id2 = await memory.add('duplicate');
      expect(id1).not.toBe(id2);
      const index = kvStore['memory:__index'];
      expect(index.length).toBe(2);
    });
  });
});
