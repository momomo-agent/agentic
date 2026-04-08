import { describe, it, expect, vi } from 'vitest';

function makeDrain() {
  let inflight = 0, draining = false;
  return {
    get inflight() { return inflight; },
    get draining() { return draining; },
    inc() { inflight++; },
    dec() { inflight--; },
    startDrain() { draining = true; },
    waitDrain(timeout = 10_000) {
      if (inflight === 0) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('drain timeout')), timeout);
        const check = setInterval(() => {
          if (inflight === 0) { clearInterval(check); clearTimeout(timer); resolve(); }
        }, 50);
      });
    }
  };
}

describe('SIGINT graceful drain', () => {
  it('resolves immediately with no in-flight requests', async () => {
    const s = makeDrain();
    await expect(s.waitDrain(500)).resolves.toBeUndefined();
  });

  it('resolves after in-flight request finishes', async () => {
    const s = makeDrain();
    s.inc();
    setTimeout(() => s.dec(), 80);
    await expect(s.waitDrain(500)).resolves.toBeUndefined();
  });

  it('rejects on timeout if request never completes', async () => {
    const s = makeDrain();
    s.inc();
    await expect(s.waitDrain(100)).rejects.toThrow('drain timeout');
  });

  it('startDrain sets draining flag', () => {
    const s = makeDrain();
    s.startDrain();
    expect(s.draining).toBe(true);
  });

  it('shutdown waits for in-flight then closes', async () => {
    const s = makeDrain();
    const order = [];
    const close = vi.fn(cb => { order.push('close'); cb(); });
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => {});

    s.inc();
    setTimeout(() => { order.push('finish'); s.dec(); }, 80);

    s.startDrain();
    await s.waitDrain(500);
    close(() => process.exit(0));

    expect(order).toEqual(['finish', 'close']);
    expect(exit).toHaveBeenCalledWith(0);
    exit.mockRestore();
  });
});
