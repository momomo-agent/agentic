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

describe('DBB-m17: glob expansion in cat, rm, cp', () => {
  it('cat *.txt concatenates matching files', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([
        { name: 'a.txt', type: 'file' },
        { name: 'b.txt', type: 'file' },
        { name: 'c.js', type: 'file' },
      ]),
      read: vi.fn().mockImplementation(async (path: string) => {
        if (path.endsWith('a.txt')) return { content: 'hello', error: null }
        if (path.endsWith('b.txt')) return { content: 'world', error: null }
        return { content: '', error: null }
      }),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('cat *.txt')
    expect(r.output).toContain('hello')
    expect(r.output).toContain('world')
    expect(r.exitCode).toBe(0)
  })

  it('cat *.xyz with no matches returns error', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([{ name: 'a.ts', type: 'file' }]),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('cat *.xyz')
    expect(r.output).toContain('No such file or directory')
    expect(r.exitCode).toBe(1)
  })

  it('rm *.log removes all matching files', async () => {
    const deleteFn = vi.fn().mockResolvedValue(undefined)
    const fs = makeMockFs({
      ls: vi.fn().mockImplementation(async (path: string) => {
        if (path === '/') return [
          { name: 'a.log', type: 'file' },
          { name: 'b.log', type: 'file' },
          { name: 'c.ts', type: 'file' },
        ]
        throw new Error('not a directory')
      }),
      read: vi.fn().mockResolvedValue({ content: 'data', error: null }),
      delete: deleteFn,
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('rm *.log')
    expect(deleteFn).toHaveBeenCalledTimes(2)
    expect(r.exitCode).toBe(0)
  })

  it('cp *.md /dest/ copies each match', async () => {
    const writeFn = vi.fn().mockResolvedValue(undefined)
    const fs = makeMockFs({
      ls: vi.fn().mockImplementation(async (path: string) => {
        if (path === '/') return [
          { name: 'a.md', type: 'file' },
          { name: 'b.md', type: 'file' },
        ]
        throw new Error('not a directory')
      }),
      read: vi.fn().mockResolvedValue({ content: '# doc', error: null }),
      write: writeFn,
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('cp *.md /dest/')
    expect(writeFn).toHaveBeenCalledTimes(2)
    expect(r.exitCode).toBe(0)
  })

  it('cp *.xyz /dest/ with no matches returns error', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockResolvedValue([{ name: 'a.ts', type: 'file' }]),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('cp *.xyz /dest/')
    expect(r.output).toContain('No such file or directory')
    expect(r.exitCode).toBe(1)
  })

  it('non-glob args in cat are unaffected', async () => {
    const fs = makeMockFs({
      read: vi.fn().mockResolvedValue({ content: 'content', error: null }),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('cat file.txt')
    expect(r.output).toBe('content')
    expect(r.exitCode).toBe(0)
  })
})
