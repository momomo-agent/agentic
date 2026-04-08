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

describe('grep -i non-streaming path (task-1775573395861)', () => {
  it('grep -i -r matches case-insensitively via fs.read', async () => {
    const readMock = vi.fn()
      .mockResolvedValueOnce({ content: 'Hello', error: null })
      .mockResolvedValueOnce({ content: 'HELLO', error: null })
      .mockResolvedValueOnce({ content: 'world', error: null })
    const lsMock = vi.fn().mockImplementation((path: string) => {
      if (path === '/src') return Promise.resolve([
        { name: 'a.txt', type: 'file' },
        { name: 'b.txt', type: 'file' },
        { name: 'c.txt', type: 'file' },
      ])
      return Promise.reject(new Error('not a dir'))
    })
    const fs = makeMockFs({ read: readMock, ls: lsMock })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep -i -r hello /src')
    expect(r.output).toContain('/src/a.txt')
    expect(r.output).toContain('/src/b.txt')
    expect(r.output).not.toContain('/src/c.txt')
  })

  it('grep -i -r -c counts case-insensitive matches', async () => {
    const readMock = vi.fn()
      .mockResolvedValueOnce({ content: 'Hello', error: null })
      .mockResolvedValueOnce({ content: 'HELLO', error: null })
      .mockResolvedValueOnce({ content: 'world', error: null })
    const lsMock = vi.fn().mockImplementation((path: string) => {
      if (path === '/src') return Promise.resolve([
        { name: 'a.txt', type: 'file' },
        { name: 'b.txt', type: 'file' },
        { name: 'c.txt', type: 'file' },
      ])
      return Promise.reject(new Error('not a dir'))
    })
    const fs = makeMockFs({ read: readMock, ls: lsMock })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep -i -r -c hello /src')
    expect(r.output).toBe('2')
  })

  it('grep -i -r no match returns empty', async () => {
    const readMock = vi.fn()
      .mockResolvedValueOnce({ content: 'world', error: null })
    const lsMock = vi.fn().mockImplementation((path: string) => {
      if (path === '/src') return Promise.resolve([
        { name: 'a.txt', type: 'file' },
      ])
      return Promise.reject(new Error('not a dir'))
    })
    const fs = makeMockFs({ read: readMock, ls: lsMock })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep -i -r hello /src')
    expect(r.output).toBe('')
  })
})
