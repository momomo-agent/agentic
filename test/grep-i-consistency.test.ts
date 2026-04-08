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

// Mock ls that throws for file paths (non-directories)
function fileAwareLs(files: Record<string, string>, dirs: Record<string, Array<{name: string; type: 'file' | 'dir'}>>) {
  return vi.fn().mockImplementation(async (p: string) => {
    if (p in dirs) return dirs[p]
    if (p in files) throw new Error('Not a directory')
    throw new Error('Not a directory')
  })
}

function fileAwareRead(files: Record<string, string>) {
  return vi.fn().mockImplementation(async (p: string) =>
    p in files ? { content: files[p] } : { error: 'No such file or directory' }
  )
}

describe('grep -i consistency fix', () => {
  it('grep -i multi-file matches case-insensitively', async () => {
    const files: Record<string, string> = { '/a.txt': 'HELLO world', '/b.txt': 'goodbye' }
    const fs = makeMockFs({
      ls: fileAwareLs(files, {}),
      read: fileAwareRead(files),
      grep: vi.fn().mockResolvedValue([]),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep -i hello /a.txt /b.txt')
    expect(r.output).toContain('HELLO world')
    expect(r.output).not.toContain('goodbye')
  })

  it('grep -il multi-file returns correct files', async () => {
    const files: Record<string, string> = { '/a.txt': 'HELLO world', '/b.txt': 'goodbye' }
    const fs = makeMockFs({
      ls: fileAwareLs(files, {}),
      read: fileAwareRead(files),
      grep: vi.fn().mockResolvedValue([]),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep -il hello /a.txt /b.txt')
    expect(r.output).toBe('/a.txt')
  })

  it('grep -ic multi-file returns correct count', async () => {
    const files: Record<string, string> = { '/a.txt': 'HELLO world\nhello again\nbye', '/b.txt': 'nothing' }
    const fs = makeMockFs({
      ls: fileAwareLs(files, {}),
      read: fileAwareRead(files),
      grep: vi.fn().mockResolvedValue([]),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep -ic hello /a.txt /b.txt')
    expect(r.output).toBe('2')
  })

  it('grep -ir recursive matches case-insensitively', async () => {
    const files: Record<string, string> = {
      '/dir/file1.txt': 'HELLO world',
      '/dir/sub/file2.txt': 'hello there',
    }
    const dirs: Record<string, Array<{name: string; type: 'file' | 'dir'}>> = {
      '/dir': [{ name: 'file1.txt', type: 'file' }, { name: 'sub', type: 'dir' }],
      '/dir/sub': [{ name: 'file2.txt', type: 'file' }],
    }
    const fs = makeMockFs({
      ls: fileAwareLs(files, dirs),
      read: fileAwareRead(files),
      grep: vi.fn().mockResolvedValue([]),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep -ir hello /dir')
    expect(r.output).toContain('HELLO world')
    expect(r.output).toContain('hello there')
  })

  it('grep -ilr recursive returns correct files', async () => {
    const files: Record<string, string> = {
      '/dir/file1.txt': 'HELLO world',
      '/dir/sub/file2.txt': 'nope',
    }
    const dirs: Record<string, Array<{name: string; type: 'file' | 'dir'}>> = {
      '/dir': [{ name: 'file1.txt', type: 'file' }, { name: 'sub', type: 'dir' }],
      '/dir/sub': [{ name: 'file2.txt', type: 'file' }],
    }
    const fs = makeMockFs({
      ls: fileAwareLs(files, dirs),
      read: fileAwareRead(files),
      grep: vi.fn().mockResolvedValue([]),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep -ilr hello /dir')
    expect(r.output).toBe('/dir/file1.txt')
  })

  it('grep -icr recursive returns correct count', async () => {
    const files: Record<string, string> = {
      '/dir/file1.txt': 'HELLO world\nhello again',
      '/dir/sub/file2.txt': 'HELLO there',
    }
    const dirs: Record<string, Array<{name: string; type: 'file' | 'dir'}>> = {
      '/dir': [{ name: 'file1.txt', type: 'file' }, { name: 'sub', type: 'dir' }],
      '/dir/sub': [{ name: 'file2.txt', type: 'file' }],
    }
    const fs = makeMockFs({
      ls: fileAwareLs(files, dirs),
      read: fileAwareRead(files),
      grep: vi.fn().mockResolvedValue([]),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep -icr hello /dir')
    expect(r.output).toBe('3')
  })

  it('grep -i with no match returns empty', async () => {
    const files: Record<string, string> = { '/dir/a.txt': 'goodbye' }
    const dirs: Record<string, Array<{name: string; type: 'file' | 'dir'}>> = {
      '/dir': [{ name: 'a.txt', type: 'file' }],
    }
    const fs = makeMockFs({
      ls: vi.fn().mockImplementation(async (p: string) => {
        if (p in dirs) return dirs[p]
        throw new Error('Not a directory')
      }),
      read: fileAwareRead(files),
      grep: vi.fn().mockResolvedValue([]),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep -ir hello /dir')
    expect(r.output).toBe('')
  })

  it('grep -i on non-existent file returns error', async () => {
    const fs = makeMockFs({
      ls: vi.fn().mockRejectedValue(new Error('Not a directory')),
      read: vi.fn().mockResolvedValue({ error: 'No such file or directory' }),
      grep: vi.fn().mockResolvedValue([]),
    })
    const sh = new AgenticShell(fs)
    const r = await sh.exec('grep -i hello /nope.txt')
    expect(r.output).toContain('grep:')
    expect(r.output).toContain('No such file or directory')
  })
})
