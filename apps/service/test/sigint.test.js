import { describe, it, expect, vi } from 'vitest';

describe('SIGINT calls server.close', () => {
  it('calls close on SIGINT', () => {
    const close = vi.fn();
    const exitMock = vi.spyOn(process, 'exit').mockImplementation(() => {});
    process.once('SIGINT', () => close());
    process.emit('SIGINT');
    expect(close).toHaveBeenCalled();
    exitMock.mockRestore();
  });
});
