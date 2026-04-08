import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('agentic-sense', () => ({
  createPipeline: vi.fn(() => ({ detect: vi.fn(() => ({ faces: [], gestures: [], objects: [] })) }))
}));

describe('startWakeWordPipeline', () => {
  beforeEach(() => { vi.resetModules(); });

  it('resolves without throwing when node-record-lpcm16 is unavailable', async () => {
    vi.doMock('node-record-lpcm16', () => { throw new Error('not found'); });
    const { startWakeWordPipeline } = await import('../../src/runtime/sense.js');
    await expect(startWakeWordPipeline(vi.fn())).resolves.not.toThrow();
  });

  it('calls onWakeWord when audio RMS exceeds threshold', async () => {
    const mockStream = { on: vi.fn().mockReturnThis(), pipe: vi.fn() };
    const mockRecorder = { record: vi.fn(() => ({ stream: () => mockStream, process: null })) };
    vi.doMock('node-record-lpcm16', () => ({ default: mockRecorder }));

    const { startWakeWordPipeline } = await import('../../src/runtime/sense.js');
    const onWakeWord = vi.fn();
    await startWakeWordPipeline(onWakeWord);

    const dataHandler = mockStream.on.mock.calls.find(([e]) => e === 'data')?.[1];
    expect(dataHandler).toBeDefined();

    // Buffer with high RMS (int16 values of 30000 → RMS > 0.01)
    const buf = Buffer.alloc(32);
    for (let i = 0; i < 32; i += 2) buf.writeInt16LE(30000, i);
    dataHandler(buf);

    expect(onWakeWord).toHaveBeenCalled();
  });
});
