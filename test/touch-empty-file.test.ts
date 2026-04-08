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

describe('touch on empty file (task-1775570192399)', () => {
  it('does not write when file exists with empty content', async () => {
    const writeMock = vi.fn()
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({ content: '', error: null }),
      write: writeMock,
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('touch /empty.txt')
    expect(r.exitCode).toBe(0)
    expect(writeMock).not.toHaveBeenCalled()
  })

  it('creates file when it does not exist', async () => {
    const writeMock = vi.fn().mockResolvedValue(undefined)
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({ content: undefined, error: 'not found' }),
      write: writeMock,
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('touch /new.txt')
    expect(r.exitCode).toBe(0)
    expect(writeMock).toHaveBeenCalledWith('/new.txt', '')
  })

  it('does not write when file has content', async () => {
    const writeMock = vi.fn()
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({ content: 'hello', error: null }),
      write: writeMock,
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('touch /data.txt')
    expect(r.exitCode).toBe(0)
    expect(writeMock).not.toHaveBeenCalled()
  })
})
