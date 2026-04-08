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

describe('task-1775574415352: cp without -r on directory', () => {
  it('cp dir dest without -r returns UNIX-standard error', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([{ name: 'file.txt', type: 'file' }])
    })
    const sh = new AgenticShell(fs)
    const result = await sh.exec('cp /mydir /dest')
    expect(result.output).toBe("cp: /mydir: -r not specified; omitting directory")
    expect(result.exitCode).toBe(1)
  })

  it('error message contains -r hint and omitting directory', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([{ name: 'a', type: 'file' }])
    })
    const sh = new AgenticShell(fs)
    const result = await sh.exec('cp /somedir /dst')
    expect(result.output).toContain('-r not specified')
    expect(result.output).toContain('omitting directory')
  })

  it('cp -r dir dest still works', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([{ name: 'file.txt', type: 'file' }]),
      read: vi.fn().mockResolvedValue({ content: 'hello', error: null }),
      write: vi.fn().mockResolvedValue(undefined),
      mkdir: vi.fn().mockResolvedValue(undefined),
    })
    const sh = new AgenticShell(fs)
    const result = await sh.exec('cp -r /src /dst')
    expect(result.exitCode).toBe(0)
    expect(result.output).toBe('')
  })

  it('cp file (non-dir) still works without -r', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockRejectedValue(new Error('not a directory')),
      read: vi.fn().mockResolvedValue({ content: 'data', error: null }),
      write: vi.fn().mockResolvedValue(undefined),
    })
    const sh = new AgenticShell(fs)
    const result = await sh.exec('cp /file.txt /copy.txt')
    expect(result.exitCode).toBe(0)
    expect(result.output).toBe('')
  })
})
