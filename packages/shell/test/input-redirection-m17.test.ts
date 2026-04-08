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

describe('DBB-m17: input redirection verification', () => {
  it('grep pattern < file filters lines', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({ content: 'hello\nworld', error: null }),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep hello < /f.txt')
    expect(r.output).toContain('hello')
    expect(r.exitCode).toBe(0)
  })

  it('grep no-match < file returns exitCode 1', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({ content: 'hello', error: null }),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep xyz < /f.txt')
    expect(r.exitCode).toBe(1)
  })

  it('nonexistent redirect file returns exitCode 1', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({ content: null, error: 'No such file or directory' }),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep foo < /missing.txt')
    expect(r.exitCode).toBe(1)
    expect(r.output).toContain('No such file or directory')
  })

  it('cmd < infile > outfile writes result', async () => {
    const written: Record<string, string> = {}
    const fs = makeMockFs({
      read: vi.fn().mockImplementation(async (path: string) => {
        if (path === '/in.txt') return { content: 'hello\nworld', error: null }
        return { content: written[path] ?? null, error: written[path] ? null : 'not found' }
      }),
      write: vi.fn().mockImplementation(async (path: string, content: string) => { written[path] = content }),
    })
    const sh = new AgenticShell(fs)
    await sh.exec('grep hello < /in.txt > /out.txt')
    expect(written['/out.txt']).toContain('hello')
  })
})
