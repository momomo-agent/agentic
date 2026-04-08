import { describe, it, expect, vi } from 'vitest';

describe('SIGINT graceful shutdown', () => {
  it('calls server.close and exits 0 on SIGINT', () => {
    const closeMock = vi.fn((cb) => cb());
    const exitMock = vi.spyOn(process, 'exit').mockImplementation(() => {});
    const server = { close: closeMock };

    function shutdown() { server.close(() => process.exit(0)); }
    process.once('SIGINT', shutdown);
    process.emit('SIGINT');

    expect(closeMock).toHaveBeenCalled();
    expect(exitMock).toHaveBeenCalledWith(0);
    exitMock.mockRestore();
  });
});
