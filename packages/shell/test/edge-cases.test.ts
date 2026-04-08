import { describe, it, expect, vi } from 'vitest'
import { AgenticShell } from '../src/index'
import type { AgenticFileSystem } from 'agentic-filesystem'

function makeMockFs(overrides = {}): AgenticFileSystem {
  return {
    ls: vi.fn().mockRejectedValue(new Error('Not a directory')),
    read: vi.fn().mockResolvedValue({ content: 'data', error: null }),
    write: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    grep: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as AgenticFileSystem
}

// DBB-003: rm multi-path
describe('DBB-003: rm multi-path', () => {
  it('deletes multiple files in one command', async () => {
    const mockFs = makeMockFs()
    const sh = new AgenticShell(mockFs)
    const out = (await sh.exec('rm /file1.txt /file2.txt /file3.txt')).output
    expect(out).toBe('')
    expect(mockFs.delete).toHaveBeenCalledWith('/file1.txt')
    expect(mockFs.delete).toHaveBeenCalledWith('/file2.txt')
    expect(mockFs.delete).toHaveBeenCalledWith('/file3.txt')
  })
})

// DBB-004: rm -r deep nesting
describe('DBB-004: rm -r deep nesting', () => {
  it('recursively deletes 10-level deep directory tree', async () => {
    const levels = ['/a', '/a/b', '/a/b/c', '/a/b/c/d', '/a/b/c/d/e',
      '/a/b/c/d/e/f', '/a/b/c/d/e/f/g', '/a/b/c/d/e/f/g/h',
      '/a/b/c/d/e/f/g/h/i', '/a/b/c/d/e/f/g/h/i/j']
    const mockFs = makeMockFs({
      ls: vi.fn().mockImplementation((path: string) => {
        const idx = levels.indexOf(path)
        if (idx >= 0 && idx < levels.length - 1) {
          const child = levels[idx + 1].split('/').pop()!
          return Promise.resolve([{ name: child, type: 'dir' }])
        }
        if (path === levels[levels.length - 1]) {
          return Promise.resolve([{ name: 'deep.txt', type: 'file' }])
        }
        return Promise.reject(new Error('Not a directory'))
      }),
    })
    const sh = new AgenticShell(mockFs)
    const out = (await sh.exec('rm -r /a')).output
    expect(out).toBe('')
    expect(mockFs.delete).toHaveBeenCalledWith('/a/b/c/d/e/f/g/h/i/j/deep.txt')
    expect(mockFs.delete).toHaveBeenCalledWith('/a')
  })
})

// DBB-005: grep -i invalid regex
describe('DBB-005: grep -i invalid regex', () => {
  it('returns error for invalid regex pattern', async () => {
    const mockFs = makeMockFs()
    const sh = new AgenticShell(mockFs)
    const out = (await sh.exec('grep -i "[invalid" /test.txt')).output
    expect(out).toContain('grep')
    expect(out).toContain('[invalid')
    expect(out.length).toBeGreaterThan(0)
  })
})

// DBB-006: 3+ stage pipe
describe('DBB-006: 3+ stage pipe', () => {
  it('handles 3-stage pipe cat | grep | grep', async () => {
    const mockFs = makeMockFs({
      read: vi.fn().mockResolvedValue({ content: 'hello world\nhello test\nfoo bar', error: null }),
    })
    const sh = new AgenticShell(mockFs)
    const out = (await sh.exec('cat /multi.txt | grep hello | grep test')).output
    expect(out).toBe('hello test')
  })

  it('handles pipe where intermediate stage returns empty', async () => {
    const mockFs = makeMockFs({
      read: vi.fn().mockResolvedValue({ content: 'hello world', error: null }),
    })
    const sh = new AgenticShell(mockFs)
    const out = (await sh.exec('cat /test.txt | grep hello | grep nomatch')).output
    expect(out).toBe('')
  })
})
