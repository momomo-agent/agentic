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

describe('grep -i consistency fix', () => {
  it('grep -i multi-file matches case-insensitively', async () => {
    const readMock = vi.fn()
      .mockResolvedValueOnce({ content: 'HELLO world', error: null })
    const lsMock = vi.fn().mockRejectedValue(new Error('not a dir'))
    const fs = makeMockFs({ read: readMock, ls: lsMock })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep -i hello /a.txt')
    expect(r.output).toContain('HELLO world')
  })

  it('grep -il multi-file returns correct files', async () => {
    const readMock = vi.fn()
      .mockResolvedValueOnce({ content: 'HELLO', error: null })
      .mockResolvedValueOnce({ content: 'nope', error: null })
    const lsMock = vi.fn().mockRejectedValue(new Error('not a dir'))
    const fs = makeMockFs({ read: readMock, ls: lsMock })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep -il hello /a.txt /b.txt')
    expect(r.output).toContain('/a.txt')
    expect(r.output).not.toContain('/b.txt')
  })

  it('grep -ic multi-file returns correct count', async () => {
    const readMock = vi.fn()
      .mockResolvedValueOnce({ content: 'HELLO\nworld', error: null })
      .mockResolvedValueOnce({ content: 'hello\nHELLO', error: null })
    const lsMock = vi.fn().mockRejectedValue(new Error('not a dir'))
    const fs = makeMockFs({ read: readMock, ls: lsMock })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep -ic hello /a.txt /b.txt')
    expect(r.output).toBe('3')
  })

  it('grep -ir recursive matches case-insensitively', async () => {
    const readMock = vi.fn()
      .mockResolvedValueOnce({ content: 'HELLO world', error: null })
    const lsMock = vi.fn().mockImplementation((path: string) => {
      if (path === '/src') return Promise.resolve([
        { name: 'a.ts', type: 'file' },
      ])
      return Promise.reject(new Error('not a dir'))
    })
    const fs = makeMockFs({ read: readMock, ls: lsMock })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep -ir hello /src')
    expect(r.output).toContain('HELLO world')
  })

  it('grep -ilr recursive returns correct files', async () => {
    const readMock = vi.fn()
      .mockResolvedValueOnce({ content: 'HELLO', error: null })
      .mockResolvedValueOnce({ content: 'nope', error: null })
    const lsMock = vi.fn().mockImplementation((path: string) => {
      if (path === '/src') return Promise.resolve([
        { name: 'a.ts', type: 'file' },
        { name: 'b.ts', type: 'file' },
      ])
      return Promise.reject(new Error('not a dir'))
    })
    const fs = makeMockFs({ read: readMock, ls: lsMock })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep -ilr hello /src')
    expect(r.output).toContain('/src/a.ts')
    expect(r.output).not.toContain('/src/b.ts')
  })

  it('grep -icr recursive returns correct count', async () => {
    const readMock = vi.fn()
      .mockResolvedValueOnce({ content: 'HELLO', error: null })
      .mockResolvedValueOnce({ content: 'hello', error: null })
    const lsMock = vi.fn().mockImplementation((path: string) => {
      if (path === '/src') return Promise.resolve([
        { name: 'a.ts', type: 'file' },
        { name: 'b.ts', type: 'file' },
      ])
      return Promise.reject(new Error('not a dir'))
    })
    const fs = makeMockFs({ read: readMock, ls: lsMock })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep -icr hello /src')
    expect(r.output).toBe('2')
  })

  it('grep -i with no match returns warning only (no readStream)', async () => {
    const readMock = vi.fn()
      .mockResolvedValueOnce({ content: 'world', error: null })
    const lsMock = vi.fn().mockRejectedValue(new Error('not a dir'))
    const fs = makeMockFs({ read: readMock, ls: lsMock })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep -i hello /a.txt')
    expect(r.output).toMatch(/grep: warning: streaming unavailable/)
    expect(r.output).not.toContain('world')
  })

  it('grep -i on non-existent file returns error', async () => {
    const readMock = vi.fn()
      .mockResolvedValueOnce({ error: 'No such file or directory' })
    const lsMock = vi.fn().mockRejectedValue(new Error('not a dir'))
    const fs = makeMockFs({ read: readMock, ls: lsMock })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep -i hello /nonexistent')
    expect(r.output).toContain('No such file or directory')
  })
})
