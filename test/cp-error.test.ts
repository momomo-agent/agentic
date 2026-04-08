import { describe, it, expect, vi } from 'vitest'
import { AgenticShell } from '../src/index'
import type { AgenticFileSystem } from 'agentic-filesystem'

function makeMockFs(overrides = {}): AgenticFileSystem {
  return {
    ls: vi.fn().mockResolvedValue([]),
    read: vi.fn().mockResolvedValue({ content: '', error: null }),
    write: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    grep: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as AgenticFileSystem
}

describe('cp error messages', () => {
  it('cp dir without -r returns -r not specified error', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([{ name: 'file.txt', type: 'file' }]),
    })
    const sh = new AgenticShell(fs)
    const { output } = await sh.exec('cp /mydir /dest')
    expect(output).toContain('-r not specified')
    expect(output).toContain('omitting directory')
    expect(output).not.toContain('is a directory')
  })

  it('cp -r on directory still works', async () => {
    const fs = makeMockFs({
      ls: vi.fn()
        .mockResolvedValueOnce([{ name: 'file.txt', type: 'file' }])
        .mockResolvedValueOnce([]),
      read: vi.fn().mockResolvedValue({ content: 'hello', error: null }),
      mkdir: vi.fn().mockResolvedValue(undefined),
    })
    const sh = new AgenticShell(fs)
    const { output, exitCode } = await sh.exec('cp -r /mydir /dest')
    expect(exitCode).toBe(0)
    expect(output).toBe('')
  })

  it('cp file still works (no regression)', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockRejectedValue(new Error('not a dir')),
      read: vi.fn().mockResolvedValue({ content: 'hello', error: null }),
    })
    const sh = new AgenticShell(fs)
    const { exitCode } = await sh.exec('cp /file.txt /copy.txt')
    expect(exitCode).toBe(0)
  })
})
