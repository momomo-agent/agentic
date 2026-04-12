/**
 * Request Queue — 并发控制 + 排队
 */

/**
 * @typedef {{ maxConcurrency: number, maxQueueSize: number }} QueueOptions
 * @typedef {{ pending: number, active: number, maxConcurrency: number, maxQueueSize: number }} QueueStats
 */

export function createQueue(name, options = {}) {
  const queue = {
    name,
    maxConcurrency: options.maxConcurrency ?? 1,
    maxQueueSize: options.maxQueueSize ?? 100,
    active: 0,
    pending: [],
  };
  return queue;
}

function processNext(queue) {
  if (queue.active >= queue.maxConcurrency || queue.pending.length === 0) return;
  queue.active++;
  const { fn, resolve, reject } = queue.pending.shift();
  fn().then(resolve, reject).finally(() => {
    queue.active--;
    processNext(queue);
  });
}

export function enqueue(queue, fn) {
  return new Promise((resolve, reject) => {
    if (queue.pending.length >= queue.maxQueueSize) {
      const err = new Error('Queue full');
      err.status = 429;
      err.retryAfter = 5;
      reject(err);
      return;
    }
    queue.pending.push({ fn, resolve, reject });
    processNext(queue);
  });
}

export function resetQueue(queue) {
  queue.active = 0;
  queue.pending.length = 0;
}

export function getQueueStats(queue) {
  return {
    pending: queue.pending.length,
    active: queue.active,
    maxConcurrency: queue.maxConcurrency,
    maxQueueSize: queue.maxQueueSize,
  };
}
