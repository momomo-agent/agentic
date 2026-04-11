/**
 * Queue tests for task-1775896028470 (M103)
 */
import { describe, it, expect } from 'vitest';
import { createQueue, enqueue, getQueueStats } from '../../src/server/queue.js';

describe('server/queue.js', () => {
  it('createQueue returns object with correct defaults', () => {
    const q = createQueue('test');
    expect(q.name).toBe('test');
    expect(q.maxConcurrency).toBe(1);
    expect(q.maxQueueSize).toBe(100);
    expect(q.active).toBe(0);
    expect(q.pending).toEqual([]);
  });

  it('createQueue accepts custom options', () => {
    const q = createQueue('custom', { maxConcurrency: 3, maxQueueSize: 10 });
    expect(q.maxConcurrency).toBe(3);
    expect(q.maxQueueSize).toBe(10);
  });

  it('enqueue executes fn and returns result', async () => {
    const q = createQueue('test');
    const result = await enqueue(q, async () => 42);
    expect(result).toBe(42);
  });

  it('concurrency=1 serializes execution', async () => {
    const q = createQueue('serial', { maxConcurrency: 1 });
    const order = [];

    const p1 = enqueue(q, async () => {
      order.push('start-1');
      await new Promise(r => setTimeout(r, 50));
      order.push('end-1');
    });

    const p2 = enqueue(q, async () => {
      order.push('start-2');
      await new Promise(r => setTimeout(r, 10));
      order.push('end-2');
    });

    await Promise.all([p1, p2]);
    expect(order).toEqual(['start-1', 'end-1', 'start-2', 'end-2']);
  });

  it('queue full throws { status: 429, retryAfter }', async () => {
    const q = createQueue('tiny', { maxConcurrency: 1, maxQueueSize: 1 });

    // Fill the active slot
    const blocker = enqueue(q, () => new Promise(r => setTimeout(r, 200)));
    // Fill the queue
    const queued = enqueue(q, async () => 'ok');

    // This should be rejected — queue is full
    try {
      await enqueue(q, async () => 'overflow');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err.status).toBe(429);
      expect(err.retryAfter).toBe(5);
    }

    await Promise.all([blocker, queued]);
  });

  it('getQueueStats returns correct counts during execution', async () => {
    const q = createQueue('stats', { maxConcurrency: 1, maxQueueSize: 10 });

    let resolveBlocker;
    const blocker = enqueue(q, () => new Promise(r => { resolveBlocker = r; }));
    enqueue(q, async () => 'pending');

    // Wait a tick for the first fn to start
    await new Promise(r => setTimeout(r, 0));

    const stats = getQueueStats(q);
    expect(stats.active).toBe(1);
    expect(stats.pending).toBe(1);
    expect(stats.maxConcurrency).toBe(1);
    expect(stats.maxQueueSize).toBe(10);

    resolveBlocker();
    await blocker;
    // Let the pending one finish
    await new Promise(r => setTimeout(r, 10));

    const after = getQueueStats(q);
    expect(after.active).toBe(0);
    expect(after.pending).toBe(0);
  });

  it('concurrent enqueues respect maxConcurrency limit', async () => {
    const q = createQueue('concurrent', { maxConcurrency: 2 });
    let maxActive = 0;
    let currentActive = 0;

    const tasks = Array.from({ length: 5 }, (_, i) =>
      enqueue(q, async () => {
        currentActive++;
        maxActive = Math.max(maxActive, currentActive);
        await new Promise(r => setTimeout(r, 20));
        currentActive--;
      })
    );

    await Promise.all(tasks);
    expect(maxActive).toBe(2);
  });
});
