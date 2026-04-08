import { describe, it, expect, vi } from 'vitest'
import { AgenticShell } from '../src/index'
import type { AgenticFileSystem } from 'agentic-filesystem'

function makeFs(overrides = {}): AgenticFileSystem {
  const store: Record<string, string> = {}
  return {
    ls: vi.fn().mockResolvedValue([]),
    read: vi.fn().mockImplementation(async (p: string) => {
      if (p in store) return { content: store[p], error: null }
      return { content: null, error: 'No such file or directory' }
    }),
    write: vi.fn().mockImplementation(async (p: string, c: string) => { store[p] = c }),
    delete: vi.fn().mockResolvedValue(undefined),
    grep: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as AgenticFileSystem
}

describe('DBB-m15-003: output redirection with error source', () => {
  it('does not create file when source fails with >', async () => {
    const fs = makeFs()
    const shell = new AgenticShell(fs)
    const r = await shell.exec('cat /missing > /out.txt')
    expect(r.exitCode).toBe(1)
    expect(fs.write).not.toHaveBeenCalled()
  })

  it('does not create file when source fails with >>', async () => {
    const fs = makeFs()
    const shell = new AgenticShell(fs)
    const r = await shell.exec('cat /missing >> /out.txt')
    expect(r.exitCode).toBe(1)
    expect(fs.write).not.toHaveBeenCalled()
  })

  it('creates file when source succeeds with >', async () => {
    const store: Record<string, string> = { '/src.txt': 'hi\n' }
    const writeMock = vi.fn()
    const fs = {
      ls: vi.fn().mockResolvedValue([]),
      read: vi.fn().mockImplementation(async (p: string) =>
        p in store ? { content: store[p], error: null } : { content: null, error: 'No such file or directory' }
      ),
      write: writeMock,
      delete: vi.fn().mockResolvedValue(undefined),
      grep: vi.fn().mockResolvedValue([]),
    } as unknown as AgenticFileSystem
    const r = await new AgenticShell(fs).exec('cat /src.txt > /out.txt')
    expect(r.exitCode).toBe(0)
    expect(writeMock).toHaveBeenCalled()
  })
})
