import { describe, it, expect, vi, beforeEach } from 'vitest'
import { spawn, execSync } from 'child_process'

vi.mock('child_process', () => ({
  spawn: vi.fn(),
  execSync: vi.fn(() => '/usr/bin/ollama'),
}))

vi.mock('ora', () => ({
  default: vi.fn(() => ({ start: vi.fn().mockReturnThis(), succeed: vi.fn().mockReturnThis(), fail: vi.fn().mockReturnThis() })),
}))

vi.mock('chalk', () => ({
  default: { bold: s => s, gray: s => s, green: s => s, yellow: s => s },
}))

vi.mock('../../src/detector/hardware.js', () => ({
  detect: vi.fn(async () => ({ platform: 'linux', arch: 'x64', gpu: { type: 'cpu', vram: 0 }, memory: 8, cpu: { model: 'test', cores: 4 } })),
}))

vi.mock('../../src/detector/profiles.js', () => ({
  getProfile: vi.fn(async () => ({
    llm: { provider: 'ollama', model: 'llama3.2:1b' },
    stt: { provider: 'default', model: 'whisper' },
    tts: { provider: 'default', voice: 'alloy' },
  })),
}))

vi.mock('fs', () => ({
  promises: { mkdir: vi.fn(async () => {}), writeFile: vi.fn(async () => {}) },
}))

function makeSpawn(exitCode) {
  return vi.fn(() => {
    const emitter = { on: vi.fn() }
    emitter.on.mockImplementation((event, cb) => {
      if (event === 'close') setTimeout(() => cb(exitCode), 0)
      return emitter
    })
    return emitter
  })
}

describe('setup.js Ollama auto-install (task-1775500429396)', () => {
  beforeEach(() => { vi.resetModules(); vi.mocked(spawn).mockClear(); vi.mocked(execSync).mockClear() })

  it('DBB-001: needsInstall=true calls installOllama and pullModel', async () => {
    const { execSync: mockExec } = await import('child_process')
    // First call (isOllamaInstalled): throw = not installed
    vi.mocked(mockExec).mockImplementationOnce(() => { throw new Error('not found') })
    vi.mocked(spawn).mockImplementation(makeSpawn(0))

    const { runSetup } = await import('../../src/cli/setup.js')
    await runSetup()

    // spawn called 3 times: install, list (check model), pull
    expect(spawn).toHaveBeenCalledTimes(3)
    expect(spawn).toHaveBeenNthCalledWith(1, 'sh', ['-c', expect.stringContaining('ollama')], { stdio: 'inherit' })
    expect(spawn).toHaveBeenNthCalledWith(2, 'ollama', ['list'], { stdio: ['ignore', 'pipe', 'ignore'] })
    expect(spawn).toHaveBeenNthCalledWith(3, 'ollama', ['pull', 'llama3.2:1b'], { stdio: 'inherit' })
  })

  it('DBB-001: installOllama non-zero exit rejects', async () => {
    const { execSync: mockExec } = await import('child_process')
    vi.mocked(mockExec).mockImplementationOnce(() => { throw new Error('not found') })
    vi.mocked(spawn).mockImplementation(makeSpawn(1))

    const { runSetup } = await import('../../src/cli/setup.js')
    await expect(runSetup()).rejects.toThrow('install failed: 1')
  })

  it('DBB-001: needsInstall=false skips install when model present', async () => {
    vi.mocked(spawn).mockImplementation(makeSpawn(0))
    // Make ollama list return the model name so isModelPulled returns true
    vi.mocked(spawn).mockImplementation(() => {
      const emitter = { on: vi.fn(), stdout: { on: vi.fn() } }
      emitter.stdout.on.mockImplementation((event, cb) => {
        if (event === 'data') cb('llama3.2:1b    abc123  4.0 GB\n')
      })
      emitter.on.mockImplementation((event, cb) => {
        if (event === 'close') setTimeout(() => cb(0), 0)
        return emitter
      })
      return emitter
    })

    const { runSetup } = await import('../../src/cli/setup.js')
    await runSetup()
    // Only ollama list called, no install or pull
    expect(spawn).toHaveBeenCalledTimes(1)
    expect(spawn).toHaveBeenCalledWith('ollama', ['list'], { stdio: ['ignore', 'pipe', 'ignore'] })
  })
})
