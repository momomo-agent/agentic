import { describe, it, expect, vi } from 'vitest'
import { AgenticShell } from '../src/index'
import type { AgenticFileSystem } from 'agentic-filesystem'

function makeMockFs(overrides = {}): AgenticFileSystem {
  return {
    ls: vi.fn().mockResolvedValue([]),
    read: vi.fn().mockResolvedValue({ content: undefined, error: 'not a file' }),
    write: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    grep: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as AgenticFileSystem
}

// DBB-009: cd to valid directory
describe('DBB-009: cd to valid directory', () => {
  it('updates cwd', async () => {
    const sh = new AgenticShell(makeMockFs())
    await sh.exec('cd /subdir')
    expect((await sh.exec('pwd')).output).toBe('/subdir')
  })
})

// DBB-007: cd to non-existent directory
describe('DBB-007: cd to non-existent directory', () => {
  it('returns error and cwd unchanged', async () => {
    const mockFs = makeMockFs({
      ls: vi.fn().mockRejectedValue(new Error('No such file or directory')),
    })
    const sh = new AgenticShell(mockFs)
    const out = (await sh.exec('cd /no/such/dir')).output
    expect(out).toContain('/no/such/dir')
    expect(out).toMatch(/No such file or directory/i)
    expect((await sh.exec('pwd')).output).toBe('/')
  })
})

// DBB-008: cd to a file
describe('DBB-008: cd to a file', () => {
  it('returns Not a directory and cwd unchanged', async () => {
    const mockFs = makeMockFs({
      read: vi.fn().mockResolvedValue({ content: 'file content', error: null }),
    })
    const sh = new AgenticShell(mockFs)
    const out = (await sh.exec('cd /file.txt')).output
    expect(out).toContain('/file.txt')
    expect(out).toMatch(/Not a directory/i)
    expect((await sh.exec('pwd')).output).toBe('/')
  })
})

// cd with no arg resets to /
describe('cd with no arg', () => {
  it('resets cwd to /', async () => {
    const sh = new AgenticShell(makeMockFs())
    await sh.exec('cd /subdir')
    await sh.exec('cd')
    expect((await sh.exec('pwd')).output).toBe('/')
  })
})

// cd-to-file boundary tests
describe('cd-to-file boundary tests', () => {
  it('cd to file with relative path returns Not a directory', async () => {
    const mockFs = makeMockFs({
      ls: vi.fn().mockImplementation(async (path: string) => {
        if (path === '/a') return [{ name: 'b', type: 'dir' }, { name: 'file.txt', type: 'file' }]
        if (path === '/a/b') return [{ name: 'inner.txt', type: 'file' }]
        return []
      }),
      read: vi.fn().mockImplementation(async (path: string) => {
        if (path === '/a/file.txt' || path === '/a/b/inner.txt') return { content: 'data', error: null }
        return { content: undefined, error: 'not a file' }
      }),
    })
    const sh = new AgenticShell(mockFs)
    await sh.exec('cd /a')
    const out = (await sh.exec('cd file.txt')).output
    expect(out).toContain('Not a directory')
    expect((await sh.exec('pwd')).output).toBe('/a')
  })

  it('cd ../file.txt from subdir returns Not a directory', async () => {
    const mockFs = makeMockFs({
      ls: vi.fn().mockImplementation(async (path: string) => {
        if (path === '/a') return [{ name: 'b', type: 'dir' }, { name: 'file.txt', type: 'file' }]
        if (path === '/a/b') return [{ name: 'inner.txt', type: 'file' }]
        return []
      }),
      read: vi.fn().mockImplementation(async (path: string) => {
        if (path === '/a/file.txt') return { content: 'data', error: null }
        return { content: undefined, error: 'not a file' }
      }),
    })
    const sh = new AgenticShell(mockFs)
    await sh.exec('cd /a/b')
    const out = (await sh.exec('cd ../file.txt')).output
    expect(out).toContain('Not a directory')
    expect((await sh.exec('pwd')).output).toBe('/a/b')
  })

  it('cd to file after cd to valid dir then to file', async () => {
    const mockFs = makeMockFs({
      ls: vi.fn().mockImplementation(async (path: string) => {
        if (path === '/a') return [{ name: 'target', type: 'file' }]
        return []
      }),
      read: vi.fn().mockImplementation(async (path: string) => {
        if (path === '/a/target') return { content: 'data', error: null }
        return { content: undefined, error: 'not a file' }
      }),
    })
    const sh = new AgenticShell(mockFs)
    await sh.exec('cd /a')
    const out = (await sh.exec('cd target')).output
    expect(out).toContain('Not a directory')
    expect((await sh.exec('pwd')).output).toBe('/a')
  })
})
