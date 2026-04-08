import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExec = vi.fn();
const mockSpawn = vi.fn();
const mockQuestion = vi.fn();

vi.mock('node:child_process', () => ({
  exec: (...args) => mockExec(...args),
  spawn: (...args) => mockSpawn(...args)
}));

vi.mock('node:readline', () => ({
  createInterface: () => ({
    question: (q, cb) => mockQuestion(q, cb),
    close: vi.fn()
  })
}));

vi.mock('ora', () => ({
  default: () => ({ start: vi.fn().mockReturnThis(), succeed: vi.fn().mockReturnThis(), fail: vi.fn().mockReturnThis(), info: vi.fn().mockReturnThis(), text: '' })
}));

vi.mock('chalk', () => ({
  default: { red: s => s, yellow: s => s, cyan: s => s, white: s => s, gray: s => s }
}));

const mockProfile = { llm: { provider: 'ollama', model: 'gemma3:4b' } };

function makeExec(responses) {
  return (cmd, cb) => {
    const res = responses[cmd];
    if (res instanceof Error) cb(res);
    else cb(null, { stdout: res || '' });
  };
}

beforeEach(() => { vi.clearAllMocks(); vi.resetModules(); });

describe('DBB-001: executeInstall runs install command on confirm', () => {
  it('user confirms y → spawn called with install command', async () => {
    // Ollama not installed initially, then installed after spawn
    let callCount = 0;
    mockExec.mockImplementation((cmd, cb) => {
      if (cmd === 'ollama --version') {
        callCount++;
        if (callCount === 1) cb(new Error('not found'));
        else cb(null, { stdout: 'ollama version is 0.3.0' });
      } else if (cmd === 'ollama list') {
        cb(null, { stdout: 'gemma3:4b   abc   4GB   1 day ago' });
      } else {
        cb(new Error('unknown'));
      }
    });

    const mockProc = { on: vi.fn(), stdout: { on: vi.fn() }, stderr: { on: vi.fn() } };
    mockProc.on.mockImplementation((event, cb) => { if (event === 'close') cb(0); return mockProc; });
    mockSpawn.mockReturnValue(mockProc);

    mockQuestion.mockImplementation((q, cb) => cb('y'));

    const { setupOllama } = await import('../../src/detector/optimizer.js');
    const result = await setupOllama(mockProfile);

    expect(mockSpawn).toHaveBeenCalled();
    expect(result.installed).toBe(true);
  });
});

describe('DBB-003: user declines install → process.exit(1)', () => {
  it('user answers n → process exits with 1', async () => {
    mockExec.mockImplementation((cmd, cb) => cb(new Error('not found')));
    mockQuestion.mockImplementation((q, cb) => cb('n'));

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});

    const { setupOllama } = await import('../../src/detector/optimizer.js');
    await setupOllama(mockProfile);
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });
});

describe('DBB-002: Ollama already installed → no install prompt', () => {
  it('skips executeInstall when ollama present', async () => {
    mockExec.mockImplementation(makeExec({
      'ollama --version': 'ollama version is 0.1.26',
      'ollama list': 'gemma3:4b   abc   4GB   1 day ago'
    }));

    const { setupOllama } = await import('../../src/detector/optimizer.js');
    const result = await setupOllama(mockProfile);

    expect(mockQuestion).not.toHaveBeenCalled();
    expect(result.installed).toBe(true);
    expect(result.modelReady).toBe(true);
  });
});
