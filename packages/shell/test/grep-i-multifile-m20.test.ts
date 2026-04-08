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

describe('grep -i multi-file mode (task-1775580789278)', () => {
  it('grep -i multi-file matches case-insensitively via fs.read', async () => {
    const readMock = vi.fn()
      .mockResolvedValueOnce({ content: 'Hello world', error: null })
      .mockResolvedValueOnce({ content: 'HELLO there', error: null })
    const lsMock = vi.fn().mockRejectedValue(new Error('not a dir'))
    const fs = makeMockFs({ read: readMock, ls: lsMock })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep -i hello /f1.txt /f2.txt')
    expect(r.output).toContain('/f1.txt')
    expect(r.output).toContain('/f2.txt')
  })

  it('grep -i -l returns filenames with case-insensitive matches', async () => {
    const readMock = vi.fn()
      .mockResolvedValueOnce({ content: 'Hello', error: null })
      .mockResolvedValueOnce({ content: 'HELLO', error: null })
      .mockResolvedValueOnce({ content: 'world', error: null })
    const lsMock = vi.fn().mockRejectedValue(new Error('not a dir'))
    const fs = makeMockFs({ read: readMock, ls: lsMock })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep -i -l hello /f1.txt /f2.txt /f3.txt')
    expect(r.output).toContain('/f1.txt')
    expect(r.output).toContain('/f2.txt')
    expect(r.output).not.toContain('/f3.txt')
  })

  it('grep -i -c returns correct count across multiple files', async () => {
    const readMock = vi.fn()
      .mockResolvedValueOnce({ content: 'Hello', error: null })
      .mockResolvedValueOnce({ content: 'HELLO', error: null })
      .mockResolvedValueOnce({ content: 'world', error: null })
    const lsMock = vi.fn().mockRejectedValue(new Error('not a dir'))
    const fs = makeMockFs({ read: readMock, ls: lsMock })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep -i -c hello /f1.txt /f2.txt /f3.txt')
    expect(r.output).toBe('2')
  })

  it('grep -i -r searches recursively case-insensitively', async () => {
    const readMock = vi.fn()
      .mockResolvedValueOnce({ content: 'Hello', error: null })
      .mockResolvedValueOnce({ content: 'HELLO', error: null })
      .mockResolvedValueOnce({ content: 'other', error: null })
    const lsMock = vi.fn().mockImplementation((path: string) => {
      if (path === '/src') return Promise.resolve([
        { name: 'a.ts', type: 'file' },
        { name: 'b.ts', type: 'file' },
        { name: 'c.ts', type: 'file' },
      ])
      return Promise.reject(new Error('not a dir'))
    })
    const fs = makeMockFs({ read: readMock, ls: lsMock })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep -i -r hello /src')
    expect(r.output).toContain('/src/a.ts')
    expect(r.output).toContain('/src/b.ts')
    expect(r.output).not.toContain('/src/c.ts')
  })
})
